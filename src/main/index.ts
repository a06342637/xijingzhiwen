import {startAndTile} from './start-and-tile';
import {browserBatch} from './browser-batch';
import {closeWindowHelpers,warmWindowHelper} from './window-native';
import {proxyForIndex} from '../shared/proxy-input';
import {LocalApi} from './local-api';
import {app,BrowserWindow,ipcMain,safeStorage,dialog,shell,nativeTheme} from 'electron';
import {autoUpdater as updateLifecycle} from 'electron';
import {autoUpdater} from 'electron-updater';
import {fileLogger,guardOutputPipes} from './file-log';
import {SoftwareUpdates} from './software-update';
import {validateSettingsPatch,validateControlledChange} from './settings';
import {prepareProfileBatch} from './profile-batch';
import {randomProfileName} from './profile-names';
import {FIREFOX_VERSION} from '../shared/devices';
import {enabledExtensionIds} from '../shared/extension-defaults';
import {randomFullFingerprint} from '../shared/random-fingerprint';
import {fingerprintLocks,preservedFingerprint} from '../shared/fingerprint-presets';
import {applyControlledValues,applyControlledProfile} from '../shared/controlled-features';
import type {ProxyConfig,ProxyObservation} from '../shared/model';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {fileURLToPath} from 'node:url';
import {Store,inside,newSeed} from './store';
import {Kernels} from './kernels';
import {Components} from './components';
import {Browsers} from './browsers';
import {WindowLayouts} from './window-layout';
import {importExtension} from './extensions';
import {validateProfile,proxyUrl} from '../shared/config';
import {CAPABILITIES,BASE_VERSION,idSchema,proxySchema,newProfile,type AppState,type Profile,type Kernel,type Extension,type DownloadProgress,type Report} from '../shared/model';

let window:BrowserWindow|undefined,store:Store,kernels:Kernels,components:Components,browsers:Browsers,closing=false,closePending=false,allowUpdateQuit=false;
let softwareUpdates:SoftwareUpdates;
let windowLayouts:WindowLayouts;
let localApi:LocalApi;
const progress=new Map<string,DownloadProgress>();let notice='';
const devDir=path.resolve(__dirname,'..');
const resources=app.isPackaged?process.resourcesPath:path.join(devDir,'vendor-resources');
const dataOverride=process.env.QIJING_TEST_DATA;if(dataOverride&&!process.env.QIJING_SMOKE)throw new Error('数据目录覆盖仅用于自检');
if(dataOverride)app.setPath('userData',path.resolve(dataOverride));
const updateLogger=fileLogger(path.join(app.getPath('userData'),'logs','software-update.log'));
guardOutputPipes(updateLogger);autoUpdater.logger=updateLogger;
if(!app.requestSingleInstanceLock())app.quit();else {
 app.on('second-instance',()=>{window?.restore();window?.focus();});
 void app.whenReady().then(initialize).catch(async error=>{if(process.env.QIJING_SMOKE){const dir=path.resolve(process.env.QIJING_SMOKE_OUTPUT||'.verification');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,'smoke-error.txt'),String(error?.stack||error));app.exit(1);return;}await dialog.showMessageBox({type:'error',title:'栖境启动失败',message:String(error)});app.quit();});
}
async function state():Promise<AppState>{const pythonReady=await components.ready();return {profiles:store.profiles(),proxies:store.proxies(),proxyLibrary:store.proxyLibrary(),proxyObservations:store.proxyObservations(),recycle:store.recycled(),extensions:store.extensions(),kernels:store.kernels(),reports:store.reports(),running:browsers.running(),downloads:[...progress.values()],dataDir:store.root,arch:process.arch,version:app.getVersion(),pythonReady,notice,settings:store.settings(),features:CAPABILITIES,update:softwareUpdates.state(),localApi:localApi?.state()};}
function changed(){if(!closing&&store&&components&&browsers)void state().then(s=>{if(window&&!window.isDestroyed())window.webContents.send('qijing:state',s);}).catch(()=>{});}
async function choose(properties:Array<'openFile'|'openDirectory'>,filters?:Electron.FileFilter[]){const r=await dialog.showOpenDialog(window!,{properties,filters});return r.canceled?'':r.filePaths[0];}
async function confirm(message:string,detail:string){const r=await dialog.showMessageBox(window!,{type:'warning',message,detail,buttons:['取消','确认'],defaultId:0,cancelId:0,noLink:true});return r.response===1;}
function assertIdle(id:string){if(browsers.isBusy(id))throw new Error('请先关闭环境并等待诊断或数据操作完成');}
const stringId=(raw:any)=>idSchema.parse(raw?.id);
const draftChecks=new Map<string,{signature:string;observation:ProxyObservation}>();
const proxySignature=(p:ProxyConfig)=>JSON.stringify([p.protocol,p.host,p.port,p.username,p.password||'',p.bypass]);
async function testProxy(proxy:ProxyConfig,persist:boolean){const result=await browsers.proxyTest(proxy);const observation:ProxyObservation={proxyId:proxy.id,testedAt:new Date().toISOString(),exitIp:result.exitIp,country:result.country||undefined,region:result.region,city:result.city,isp:result.isp,timezone:result.timezone,locale:result.locale,routeStable:result.routeStable,message:result.message};draftChecks.set(proxy.id,{signature:proxySignature(proxy),observation});if(draftChecks.size>100)draftChecks.delete(draftChecks.keys().next().value!);if(persist||store.proxies().some(p=>p.id===proxy.id)){const current=await store.proxy(proxy.id);if(proxySignature(current)===proxySignature(proxy))store.put('proxyObservation',proxy.id,observation);}return observation;}
const handlers:Record<string,(p:any)=>Promise<any>>={
 state:async()=>state(),
 'profile.new':async()=>{const defaults=applyControlledValues(store.settings().fingerprintDefaults,store.settings().controlledFeatures);const compatible=store.kernels().filter(k=>(k.engine||'chromium')===defaults.engine);const profile=newProfile(randomUUID(),newSeed(),compatible.find(k=>k.arch===process.arch)?.id||compatible[0]?.id||'',defaults);profile.extensionIds=enabledExtensionIds(store.settings(),store.extensions(),profile.values);return profile;},
 'profile.randomize':async p=>{if(process.env.QIJING_SMOKE&&process.env.QIJING_SMOKE_DEEP_UI==='1')await new Promise(r=>setTimeout(r,500));return {name:randomProfileName([...store.profiles().map(x=>x.name),...(typeof p.name==='string'?[p.name]:[])]),seed:newSeed(),values:applyControlledValues(randomFullFingerprint(validateSettingsPatch({fingerprintDefaults:p.values},store.settings()).fingerprintDefaults,Math.random,preservedFingerprint(p.values,fingerprintLocks(store.settings()))),store.settings().controlledFeatures)};},
 'profile.create':async raw=>{const {proxyDrafts,...batch}=z.object({profile:z.unknown(),count:z.number().int().min(1).max(100),randomize:z.boolean(),proxyDrafts:z.array(proxySchema).max(1000).optional()}).strict().parse(raw);const drafts=(proxyDrafts||[]).slice(0,batch.count).map(proxy=>({...proxy,id:randomUUID()}));drafts.forEach(proxy=>proxyUrl(proxy));const profiles=prepareProfileBatch(batch,fingerprintLocks(store.settings())).map(p=>validateProfile(applyControlledProfile(p,store.settings().controlledFeatures)));for(const p of profiles){if(p.kernelId){const k=store.get<Kernel>('kernel',p.kernelId);if((k.engine||'chromium')!==p.values.engine)throw new Error('环境与内核引擎不匹配');}if(p.proxyId)store.get('proxy',p.proxyId);p.extensionIds.forEach(id=>store.get('extension',id));}if(profiles.some(p=>p.values.canvasBridge||p.values.runtimeSuppression||p.values.synthetic)&&!await confirm('启用实验设置？','这些环境将使用你选择的实验配置，可能影响网页行为、诊断或沙箱保护。'))return {canceled:true};if(closing)throw new Error('软件正在关闭');const saved:ProxyConfig[]=[];try{for(const proxy of drafts){await store.saveProxy(proxy);saved.push(proxy);}profiles.forEach((profile,index)=>{const proxy=proxyForIndex(drafts,index);if(proxy)profile.proxyId=proxy.id;});if(closing)throw new Error('软件正在关闭');return {profiles:store.createProfiles(profiles)};}catch(error){for(const proxy of saved)store.remove('proxy',proxy.id);throw error;}},
 'profile.save':async raw=>{const p=validateProfile(applyControlledProfile(raw,store.settings().controlledFeatures));assertIdle(p.id);if(p.kernelId){const k=store.get<Kernel>('kernel',p.kernelId);if((k.engine||'chromium')!==p.values.engine)throw new Error('环境与内核引擎不匹配');}if(p.proxyId)store.get('proxy',p.proxyId);p.extensionIds.forEach(id=>store.get('extension',id));let previous:Profile|undefined;try{previous=store.get('profile',p.id);}catch{}if(previous&&previous.kernelId&&previous.kernelId!==p.kernelId)throw new Error('已有环境请通过“升级验证副本”更换内核，避免原始登录数据被新版改写');if(previous&&(previous.values.engine||'chromium')!==p.values.engine)throw new Error('已有环境不能更换引擎，请新建环境');if(previous&&previous.mode!==p.mode)throw new Error('普通与实测模式使用不同环境，请新建环境');if(p.values.userAgent&&!previous?.values.userAgent&&!await confirm('保存手动 User-Agent？','手动 UA 可能与原生 Client Hints 不一致。可以在诊断中心核对实际值。'))return {canceled:true};if((p.values.canvasBridge||p.values.runtimeSuppression||p.values.synthetic)&&!await confirm('启用实验设置？',p.values.canvasBridge?'Canvas Bridge 会关闭相关渲染器沙箱并向所填服务发送图形操作。其他实验项也可能影响稳定性。':'实验设置可能改变网页行为或破坏诊断。'))return {canceled:true};if(closing)throw new Error('软件正在关闭');assertIdle(p.id);p.updatedAt=new Date().toISOString();p.createdAt=previous?.createdAt||p.updatedAt;p.lastStartedAt=previous?.lastStartedAt;return store.put('profile',p.id,p);},
 'profile.clone':async p=>store.cloneProfile(stringId(p)),
 'profile.archive':async p=>{const id=stringId(p);assertIdle(id);const item=store.get<Profile>('profile',id);item.archived=z.boolean().parse(p.archived);return store.put('profile',id,item);},
 'profile.recycle':async p=>{const id=stringId(p);return browsers.withIdleProfile(id,async()=>{await store.deleteProfile(id);return {recycled:true};});},
 'profile.recycleBatch':async p=>{const ids=[...new Set(z.array(idSchema).min(1).max(1000).parse(p.ids))];const results=[];for(const id of ids){try{await browsers.withIdleProfile(id,()=>store.deleteProfile(id));results.push({id,ok:true});}catch(error){results.push({id,ok:false,error:error instanceof Error?error.message:String(error)});}}return results;},
 'profile.delete':async p=>{const id=stringId(p);assertIdle(id);await store.deleteProfilePermanently(id);return {deleted:true};},
 'profile.deleteBatch':async p=>{const ids=[...new Set(z.array(idSchema).min(1).max(1000).parse(p.ids))];const results=[];for(const id of ids){try{assertIdle(id);await store.deleteProfilePermanently(id);results.push({id,ok:true});}catch(e){results.push({id,ok:false,error:e instanceof Error?e.message:String(e)});}}return results;},
 'localApi.manage':async p=>localApi.manage(p),
 'recycle.empty':async()=>{if(!store.recycled().length)return [];return store.purgeAllRecycled();},
 'recycle.restore':async p=>store.restoreEnvironment(stringId(p)),
 'recycle.purge':async p=>store.purgeEnvironment(stringId(p)),
 'profile.start':async p=>browsers.start(stringId(p)),
 'profile.stop':async p=>browsers.stop(stringId(p)),
 'profile.focus':async p=>browsers.focus(stringId(p)),
 'windows.inventory':async()=>windowLayouts.inventory(),
 'windows.arrange':async p=>windowLayouts.apply(p),
 'profile.batch':async p=>{const ids=z.array(idSchema).max(100).parse(p.ids);const action=z.enum(['start','stop']).parse(p.action);return browserBatch(ids,action,browsers,store.settings().maxBrowsers);},
 'profile.startAndTile':async p=>{const ids=z.array(idSchema).min(1).max(50).parse(p.ids);return startAndTile(ids,ids=>browserBatch(ids,'start',{start:id=>browsers.ensureStarted(id),stop:id=>browsers.stop(id)},store.settings().maxBrowsers),ids=>windowLayouts.auto(ids));},
 'profile.upgrade':async p=>browsers.upgrade(stringId(p),z.string().max(120).parse(p.kernelId)),
 'profile.diagnose':async p=>browsers.diagnose(stringId(p)),
 'profile.downloads':async p=>{const id=stringId(p);const profile=store.get<Profile>('profile',id);const dir=profile.downloadDir||inside(store.root,'downloads',id);await fs.mkdir(dir,{recursive:true});return shell.openPath(dir);},
 'profile.cookies':async p=>{const id=stringId(p),action=z.enum(['exportCookies','importCookies']).parse(p.action),passphrase=z.string().max(1024).parse(p.passphrase);let file='';if(action==='exportCookies'){const r=await dialog.showSaveDialog(window!,{defaultPath:store.get<Profile>('profile',id).name+'.cookies.enc',filters:[{name:'加密 Cookie',extensions:['enc']}]});if(!r.canceled)file=r.filePath||'';}else file=await choose(['openFile'],[{name:'加密 Cookie',extensions:['enc']}]);if(!file)return {canceled:true};return browsers.cookie(id,action,file,passphrase);},
 'seed.new':async()=>newSeed(),
 'directory.choose':async()=>choose(['openDirectory']),
 'proxy.save':async p=>{const proxy=proxySchema.parse(p);if(closing)throw new Error('软件正在关闭');const saved=await store.saveProxy(proxy,true),cached=draftChecks.get(proxy.id);if(cached&&cached.signature===proxySignature(await store.proxy(proxy.id)))store.put('proxyObservation',proxy.id,cached.observation);return saved;},
 'proxy.saveEnvironment':async p=>store.saveProxy(proxySchema.parse(p)),
 'proxy.edit':async p=>store.proxyForEdit(stringId(p)),
 'proxy.delete':async p=>{const id=stringId(p);if(store.profiles().some(x=>x.proxyId===id)||store.recycled().some(x=>x.profile.proxyId===id))throw new Error('代理仍被环境或回收站使用');store.remove('proxy',id);return true;},
 'proxy.test':async p=>{const id=stringId(p),proxy=await store.proxy(id);return testProxy(proxy,true);},
 'proxy.testDraft':async p=>{let draft=proxySchema.parse(p);if(draft.password===undefined&&store.proxies().some(x=>x.id===draft.id))draft={...draft,password:(await store.proxy(draft.id)).password};return testProxy(draft,false);},
 'profile.proxy':async p=>{const id=stringId(p);return browsers.changeProxy(id,async()=>{const profile=store.get<Profile>('profile',id);if(profile.mode==='measured')throw new Error('实测模式不能绑定代理');let proxy:ProxyConfig|undefined;if(p.proxy){const raw=proxySchema.parse(p.proxy);if(store.isLibraryProxy(raw.id)||store.profiles().some(x=>x.id!==id&&x.proxyId===raw.id)||store.recycled().some(x=>x.profile.proxyId===raw.id)){const oldId=raw.id;const old=await store.proxyForEdit(oldId);if(raw.password===undefined)raw.password=old.password;if(raw.originalText===undefined)raw.originalText=old.originalText;raw.id=randomUUID();const cached=draftChecks.get(oldId);if(cached?.signature===proxySignature(raw))draftChecks.set(raw.id,{...cached,observation:{...cached.observation,proxyId:raw.id}});}proxy=await store.saveProxy(raw);const cached=draftChecks.get(raw.id);if(cached&&cached.signature===proxySignature(await store.proxy(raw.id)))store.put('proxyObservation',raw.id,cached.observation);}profile.proxyId=proxy?.id||'';profile.updatedAt=new Date().toISOString();return store.put('profile',id,profile);});},
 'extension.import':async()=>{const folder=await choose(['openDirectory']);if(!folder)return {canceled:true};return importExtension(store,folder);},
 'extension.enabled':async p=>{const id=stringId(p),enabled=z.boolean().parse(p.enabled),extension=store.get<Extension>('extension',id);if(enabled&&store.extensions().filter(e=>e.enabled&&e.id!==id).length>=50)throw new Error('最多开启50个默认扩展');return store.put('extension',id,{...extension,enabled});},
 'extension.delete':async p=>{const id=stringId(p);if(store.profiles().some(x=>x.extensionIds.includes(id))||store.recycled().some(x=>x.profile.extensionIds.includes(id)))throw new Error('扩展仍被环境或回收站使用');store.get('extension',id);const source=inside(store.root,'extensions',id),recycled=inside(store.root,'trash','extension-'+id+'-'+randomUUID());await fs.rename(source,recycled);try{store.remove('extension',id);}catch(error){await fs.rename(recycled,source);throw error;}return true;},
 'kernel.available':async p=>kernels.available(z.enum(['chromium','firefox']).parse(p?.engine||'chromium')),
 'kernel.installAll':async()=>kernels.installAll(),
 'kernel.install':async p=>{const engine=z.enum(['chromium','firefox']).parse(p?.engine||'chromium');if(engine==='firefox'){if(p?.arch&&p.arch!=='x64')throw new Error('火狐 Windows 仅有 x64 内核');return kernels.installFirefox(z.string().parse(p?.version||FIREFOX_VERSION));}return kernels.install(z.string().parse(p?.version||BASE_VERSION),z.enum(['arm64','x64']).parse(p?.arch||process.arch));},
 'kernel.import':async()=>{const file=await choose(['openFile'],[{name:'Chromix / Camoufox executable',extensions:['exe']}]);if(!file)return {canceled:true};return kernels.importLocal(file);},
 'kernel.delete':async p=>{if(Object.keys(browsers.running()).length)throw new Error('请先关闭浏览器环境再删除内核');return kernels.remove(z.string().max(120).parse(p.id));},
 'kernel.graphics':async p=>kernels.inspect(z.string().max(120).parse(p.id),k=>{if(k.engine==='firefox')throw new Error('上游图形验证仅适用于 Chromix；火狐请使用环境诊断');return components.graphics(k);}),
 'kernel.collect':async p=>kernels.inspect(z.string().max(120).parse(p.id),async k=>{if(k.engine==='firefox')throw new Error('火狐不支持 Chromix 实测设备记录');return {recordPath:await components.collect(k)};}),
 'record.import':async()=>{const file=await choose(['openFile'],[{name:'实测设备记录',extensions:['json']}]);if(!file)return {canceled:true};return {recordPath:await components.importRecord(file)};},
 'components.install':async()=>({python:await components.ensure()}),
 'report.export':async p=>{const report=store.get<Report>('report',stringId(p));const r=await dialog.showSaveDialog(window!,{defaultPath:'Qijing-report-'+report.id+'.json',filters:[{name:'环境验证报告',extensions:['json']}]});if(!r.canceled&&r.filePath){await fs.writeFile(r.filePath,JSON.stringify(report,null,2));return true;}return false;},
 'report.open':async p=>{const report=store.get<Report>('report',stringId(p));return shell.openPath(report.outputDir||path.join(store.root,'reports'));},
 'settings.controlled':async raw=>{if(Object.keys(browsers.running()).length)throw new Error('请先关闭浏览器环境再更改功能开关');const change=validateControlledChange(raw,store.settings());if(change.enable&&!await confirm('开启'+change.label+'？',change.note+'\n这些选项只用于你明确选择的测试，不保证网站接受，也不代表真实设备。'))return {canceled:true};if(Object.keys(browsers.running()).length)throw new Error('有环境正在启动，请先关闭后更改');const fresh=validateControlledChange(raw,store.settings());store.put('settings','app',fresh.settings);return {canceled:false};},
 'settings.save':async p=>{if(process.env.QIJING_SMOKE&&process.env.QIJING_SMOKE_RELIABILITY_UI==='1')await new Promise(r=>setTimeout(r,500));const settings=validateSettingsPatch(p,store.settings());const saved=store.put('settings','app',settings);nativeTheme.themeSource=settings.theme;return saved;},
 'settings.data':async()=>shell.openPath(store.root),
 'settings.recycle':async()=>shell.openPath(path.join(store.root,'trash')),
 'settings.update':async()=>softwareUpdates.check(),
 'update.download':async()=>softwareUpdates.download(),
 'update.install':async()=>softwareUpdates.install()
};
async function initialize(){
 if(!app.isPackaged){await fs.mkdir(resources,{recursive:true});for(const [from,to] of [['vendor/chromix-python','chromix-python'],['vendor/chromix-tools','chromix-tools'],['resources','config']])await fs.cp(path.join(devDir,from),path.join(resources,to),{recursive:true});}
 autoUpdater.setFeedURL({provider:'github',owner:'a06342637',repo:'xijingzhiwen',channel:process.arch==='arm64'?'latest-arm64':'latest'});
 autoUpdater.disableDifferentialDownload=true;
 autoUpdater.disableWebInstaller=true;
 if(app.isPackaged)(autoUpdater as import('electron-updater').NsisUpdater).installDirectory=path.dirname(app.getPath('exe'));
 softwareUpdates=new SoftwareUpdates(autoUpdater,app.isPackaged,changed,async()=>{if(kernels.preparing||components.preparing||browsers.operating||store.saving||windowLayouts?.arranging||localApi?.operating)throw new Error('请先等待内核下载、诊断或数据操作完成');if(closePending)throw new Error('软件正在处理关闭请求');closing=true;try{await localApi?.stop();await browsers.stopAll();}catch(e){closing=false;throw e;}},()=>store.settings().automaticUpdates!==false,()=>{closing=false;changed();});
 updateLifecycle.on('before-quit-for-update',()=>{allowUpdateQuit=true;store.close();});
 store=new Store(app.getPath('userData'),{isEncryptionAvailable:()=>safeStorage.isAsyncEncryptionAvailable(),encryptString:s=>safeStorage.encryptStringAsync(s),decryptString:async b=>(await safeStorage.decryptStringAsync(b)).result});await store.init();const emit=(p:DownloadProgress)=>{progress.set(p.id,p);changed();};kernels=new Kernels(store,emit);components=new Components(store,resources,emit,changed);browsers=new Browsers(store,kernels,path.join(__dirname,'browser-worker.cjs'),changed,()=>components.ensure(),s=>{notice=s;changed();});windowLayouts=new WindowLayouts(store,browsers,path.join(resources,'config','window-layout.ps1'));nativeTheme.themeSource=store.settings().theme;localApi=new LocalApi(store,browsers,changed,()=>closing,app.getVersion());await localApi.init();
 await store.purgeExpired();const recycleTimer=setInterval(()=>{if(!closing)void store.purgeExpired().then(results=>{if(results.length)changed();}).catch(()=>{});},60000);recycleTimer.unref();app.once('before-quit',()=>clearInterval(recycleTimer));
 ipcMain.handle('qijing:request',async(event,action,payload)=>{try{if(!window||event.sender!==window.webContents||!event.senderFrame||event.senderFrame!==window.webContents.mainFrame)throw new Error('请求来源无效');if(closing)throw new Error('软件正在关闭');if(typeof action!=='string'||!Object.hasOwn(handlers,action))throw new Error('操作不受支持');const data=await handlers[action](payload);if(!closing)changed();return {ok:true,data};}catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)};}});
 window=new BrowserWindow({width:1280,height:880,minWidth:860,minHeight:650,title:'栖境',icon:path.join(resources,'config','icon.png'),backgroundColor:'#f6f7f9',show:!process.env.QIJING_SMOKE,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.on('will-attach-webview',event=>event.preventDefault());window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 await window.loadFile(path.join(__dirname,'index.html'));if(!process.env.QIJING_SMOKE){window.show();const warmTimer=setTimeout(()=>{if(!closing)warmWindowHelper(path.join(resources,'config','window-layout.ps1'));},1500);warmTimer.unref();window.once('closed',()=>clearTimeout(warmTimer));if(app.isPackaged&&store.settings().automaticUpdates!==false){const timer=setTimeout(()=>{if(!closing)void softwareUpdates.check().catch(error=>{notice='检查软件更新失败：'+String(error);changed();});},5000);timer.unref();window.once('closed',()=>clearTimeout(timer));}}
 window.on('close',event=>{if(allowUpdateQuit)return;event.preventDefault();if(closing||closePending)return;closePending=true;void(async()=>{if(kernels.preparing||components.preparing||browsers.operating||store.saving||windowLayouts?.arranging||localApi?.operating)throw new Error('内核或诊断组件正在下载、验证或采集，请完成后关闭');if(Object.keys(browsers.running()).length&&!await confirm('关闭栖境并关闭浏览器？','正在运行的环境会正常关闭，登录数据由浏览器保存。'))return;closing=true;await localApi.stop();await browsers.stopAll();store.close();window?.destroy();app.quit();})().catch(error=>{closing=false;notice=error instanceof Error?error.message:String(error);changed();}).finally(()=>{closePending=false;});});
 if(process.env.QIJING_SMOKE){try{const {runSmoke}=await import('./smoke-internal');await runSmoke({store,kernels,browsers,components,window,state,handlers});await localApi.stop();closeWindowHelpers();app.exit(0);}catch(error){const output=path.resolve(process.env.QIJING_SMOKE_OUTPUT||path.join(devDir,'.verification'));await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'smoke-error.txt'),String(error instanceof Error?error.stack:error));await browsers.stopAll();closeWindowHelpers();app.exit(1);}}
}
app.on('window-all-closed',()=>app.quit());

app.on('will-quit',closeWindowHelpers);
