import {app,BrowserWindow,ipcMain,safeStorage,dialog,shell,nativeTheme} from 'electron';
import {autoUpdater as updateLifecycle} from 'electron';
import {autoUpdater} from 'electron-updater';
import {SoftwareUpdates} from './software-update';
import {validateSettingsPatch} from './settings';
import {prepareProfileBatch} from './profile-batch';
import {randomFingerprint} from '../shared/random-fingerprint';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {fileURLToPath} from 'node:url';
import {Store,inside,newSeed} from './store';
import {Kernels} from './kernels';
import {Components} from './components';
import {Browsers} from './browsers';
import {importExtension} from './extensions';
import {validateProfile,proxyUrl} from '../shared/config';
import {CAPABILITIES,BASE_VERSION,idSchema,proxySchema,newProfile,type AppState,type Profile,type Kernel,type Extension,type DownloadProgress,type Report} from '../shared/model';

let window:BrowserWindow|undefined,store:Store,kernels:Kernels,components:Components,browsers:Browsers,closing=false,closePending=false,allowUpdateQuit=false;
let softwareUpdates:SoftwareUpdates;
const progress=new Map<string,DownloadProgress>();let notice='';
const devDir=path.resolve(__dirname,'..');
const resources=app.isPackaged?process.resourcesPath:path.join(devDir,'vendor-resources');
const dataOverride=process.env.QIJING_TEST_DATA;if(dataOverride&&!process.env.QIJING_SMOKE)throw new Error('数据目录覆盖仅用于自检');
if(dataOverride)app.setPath('userData',path.resolve(dataOverride));
if(!app.requestSingleInstanceLock())app.quit();else {
 app.on('second-instance',()=>{window?.restore();window?.focus();});
 void app.whenReady().then(initialize).catch(async error=>{await dialog.showMessageBox({type:'error',title:'栖境启动失败',message:String(error)});app.quit();});
}
async function state():Promise<AppState>{const pythonReady=await components.ready();return {profiles:store.profiles(),proxies:store.proxies(),extensions:store.extensions(),kernels:store.kernels(),reports:store.reports(),running:browsers.running(),downloads:[...progress.values()],dataDir:store.root,arch:process.arch,version:app.getVersion(),pythonReady,notice,settings:store.settings(),features:CAPABILITIES,update:softwareUpdates.state()};}
function changed(){if(!closing&&store&&components&&browsers)void state().then(s=>{if(window&&!window.isDestroyed())window.webContents.send('qijing:state',s);}).catch(()=>{});}
async function choose(properties:Array<'openFile'|'openDirectory'>,filters?:Electron.FileFilter[]){const r=await dialog.showOpenDialog(window!,{properties,filters});return r.canceled?'':r.filePaths[0];}
async function confirm(message:string,detail:string){const r=await dialog.showMessageBox(window!,{type:'warning',message,detail,buttons:['取消','确认'],defaultId:0,cancelId:0,noLink:true});return r.response===1;}
function assertIdle(id:string){if(browsers.isBusy(id))throw new Error('请先关闭环境并等待诊断或数据操作完成');}
const stringId=(raw:any)=>idSchema.parse(raw?.id);
const handlers:Record<string,(p:any)=>Promise<any>>={
 state:async()=>state(),
 'profile.new':async()=>newProfile(randomUUID(),newSeed(),store.kernels().find(k=>k.arch===process.arch)?.id||store.kernels()[0]?.id||'',store.settings().fingerprintDefaults),
 'profile.randomize':async p=>({seed:newSeed(),values:randomFingerprint(validateSettingsPatch({fingerprintDefaults:p.values},store.settings()).fingerprintDefaults)}),
 'profile.create':async raw=>{const profiles=prepareProfileBatch(raw);for(const p of profiles){if(p.kernelId)store.get('kernel',p.kernelId);if(p.proxyId)store.get('proxy',p.proxyId);p.extensionIds.forEach(id=>store.get('extension',id));}if(profiles.some(p=>p.values.canvasBridge||p.values.runtimeSuppression||p.values.synthetic)&&!await confirm('启用实验设置？','这些环境将使用你选择的实验配置，可能影响网页行为、诊断或沙箱保护。'))return {canceled:true};if(closing)throw new Error('软件正在关闭');return {profiles:store.createProfiles(profiles)};},
 'profile.save':async raw=>{const p=validateProfile(raw);assertIdle(p.id);if(p.kernelId)store.get<Kernel>('kernel',p.kernelId);if(p.proxyId)store.get('proxy',p.proxyId);p.extensionIds.forEach(id=>store.get('extension',id));let previous:Profile|undefined;try{previous=store.get('profile',p.id);}catch{}if(previous&&previous.kernelId&&previous.kernelId!==p.kernelId)throw new Error('已有环境请通过“升级验证副本”更换内核，避免原始登录数据被新版改写');if(previous&&previous.mode!==p.mode)throw new Error('普通与实测模式使用不同环境，请新建环境');if(p.values.userAgent&&!previous?.values.userAgent&&!await confirm('保存手动 User-Agent？','手动 UA 可能与原生 Client Hints 不一致。可以在诊断中心核对实际值。'))return {canceled:true};if((p.values.canvasBridge||p.values.runtimeSuppression||p.values.synthetic)&&!await confirm('启用实验设置？',p.values.canvasBridge?'Canvas Bridge 会关闭相关渲染器沙箱并向所填服务发送图形操作。其他实验项也可能影响稳定性。':'实验设置可能改变网页行为或破坏诊断。'))return {canceled:true};if(closing)throw new Error('软件正在关闭');assertIdle(p.id);p.updatedAt=new Date().toISOString();if(previous)p.createdAt=previous.createdAt;return store.put('profile',p.id,p);},
 'profile.clone':async p=>store.cloneProfile(stringId(p)),
 'profile.archive':async p=>{const id=stringId(p);assertIdle(id);const item=store.get<Profile>('profile',id);item.archived=z.boolean().parse(p.archived);return store.put('profile',id,item);},
 'profile.delete':async p=>{const id=stringId(p);assertIdle(id);if(!await confirm('删除此环境？','配置将删除，浏览器数据移至本机保留目录；下载文件保留。'))return {canceled:true};assertIdle(id);return {recycled:await store.deleteProfile(id)};},
 'profile.start':async p=>browsers.start(stringId(p)),
 'profile.stop':async p=>browsers.stop(stringId(p)),
 'profile.focus':async p=>browsers.focus(stringId(p)),
 'profile.batch':async p=>{const ids=z.array(idSchema).max(100).parse(p.ids);const action=z.enum(['start','stop']).parse(p.action);const results=[];for(const id of ids){try{await(action==='start'?browsers.start(id):browsers.stop(id));results.push({id,ok:true});}catch(e){results.push({id,ok:false,error:String(e)});}}return results;},
 'profile.upgrade':async p=>browsers.upgrade(stringId(p),z.string().max(120).parse(p.kernelId)),
 'profile.diagnose':async p=>browsers.diagnose(stringId(p)),
 'profile.downloads':async p=>{const id=stringId(p);const profile=store.get<Profile>('profile',id);const dir=profile.downloadDir||inside(store.root,'downloads',id);await fs.mkdir(dir,{recursive:true});return shell.openPath(dir);},
 'profile.cookies':async p=>{const id=stringId(p),action=z.enum(['exportCookies','importCookies']).parse(p.action),passphrase=z.string().max(1024).parse(p.passphrase);let file='';if(action==='exportCookies'){const r=await dialog.showSaveDialog(window!,{defaultPath:store.get<Profile>('profile',id).name+'.cookies.enc',filters:[{name:'加密 Cookie',extensions:['enc']}]});if(!r.canceled)file=r.filePath||'';}else file=await choose(['openFile'],[{name:'加密 Cookie',extensions:['enc']}]);if(!file)return {canceled:true};return browsers.cookie(id,action,file,passphrase);},
 'seed.new':async()=>newSeed(),
 'directory.choose':async()=>choose(['openDirectory']),
 'proxy.save':async p=>{const proxy=proxySchema.parse(p);let password=proxy.password;if(password===undefined&&store.proxies().some(x=>x.id===proxy.id))password=(await store.proxy(proxy.id)).password;proxyUrl({...proxy,password});if(closing)throw new Error('软件正在关闭');return store.saveProxy(proxy);},
 'proxy.delete':async p=>{const id=stringId(p);if(store.profiles().some(x=>x.proxyId===id))throw new Error('代理仍被环境使用');store.remove('proxy',id);return true;},
 'proxy.test':async p=>browsers.proxyTest(await store.proxy(stringId(p))),
 'extension.import':async()=>{const folder=await choose(['openDirectory']);if(!folder)return {canceled:true};return importExtension(store,folder);},
 'extension.delete':async p=>{const id=stringId(p);if(store.profiles().some(x=>x.extensionIds.includes(id)))throw new Error('扩展仍被环境使用');store.get('extension',id);const source=inside(store.root,'extensions',id),recycled=inside(store.root,'trash','extension-'+id+'-'+randomUUID());await fs.rename(source,recycled);try{store.remove('extension',id);}catch(error){await fs.rename(recycled,source);throw error;}return true;},
 'kernel.available':async()=>kernels.available(),
 'kernel.install':async p=>kernels.install(z.string().parse(p?.version||BASE_VERSION),z.enum(['arm64','x64']).parse(p?.arch||process.arch)),
 'kernel.import':async()=>{const file=await choose(['openFile'],[{name:'Chromix / Chromium executable',extensions:['exe']}]);if(!file)return {canceled:true};return kernels.importLocal(file);},
 'kernel.delete':async p=>{if(Object.keys(browsers.running()).length)throw new Error('请先关闭浏览器环境再删除内核');return kernels.remove(z.string().max(120).parse(p.id));},
 'kernel.graphics':async p=>kernels.inspect(z.string().max(120).parse(p.id),k=>components.graphics(k)),
 'kernel.collect':async p=>kernels.inspect(z.string().max(120).parse(p.id),async k=>({recordPath:await components.collect(k)})),
 'record.import':async()=>{const file=await choose(['openFile'],[{name:'实测设备记录',extensions:['json']}]);if(!file)return {canceled:true};return {recordPath:await components.importRecord(file)};},
 'components.install':async()=>({python:await components.ensure()}),
 'report.export':async p=>{const report=store.get<Report>('report',stringId(p));const r=await dialog.showSaveDialog(window!,{defaultPath:'Qijing-report-'+report.id+'.json',filters:[{name:'环境验证报告',extensions:['json']}]});if(!r.canceled&&r.filePath){await fs.writeFile(r.filePath,JSON.stringify(report,null,2));return true;}return false;},
 'report.open':async p=>{const report=store.get<Report>('report',stringId(p));return shell.openPath(report.outputDir||path.join(store.root,'reports'));},
 'settings.save':async p=>{const settings=validateSettingsPatch(p,store.settings());const saved=store.put('settings','app',settings);nativeTheme.themeSource=settings.theme;return saved;},
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
 softwareUpdates=new SoftwareUpdates(autoUpdater,app.isPackaged,changed,async()=>{if(kernels.preparing||components.preparing||browsers.operating)throw new Error('请先等待内核下载、诊断或数据操作完成');if(closePending)throw new Error('软件正在处理关闭请求');closing=true;try{await browsers.stopAll();}catch(e){closing=false;throw e;}});
 autoUpdater.on('error',()=>{closing=false;changed();});
 updateLifecycle.on('before-quit-for-update',()=>{allowUpdateQuit=true;store.close();});
 store=new Store(app.getPath('userData'),{isEncryptionAvailable:()=>safeStorage.isAsyncEncryptionAvailable(),encryptString:s=>safeStorage.encryptStringAsync(s),decryptString:async b=>(await safeStorage.decryptStringAsync(b)).result});await store.init();const emit=(p:DownloadProgress)=>{progress.set(p.id,p);changed();};kernels=new Kernels(store,emit);components=new Components(store,resources,emit,changed);browsers=new Browsers(store,kernels,path.join(__dirname,'browser-worker.cjs'),changed,()=>components.ensure(),s=>{notice=s;changed();});nativeTheme.themeSource=store.settings().theme;
 ipcMain.handle('qijing:request',async(event,action,payload)=>{try{if(!window||event.sender!==window.webContents||!event.senderFrame||event.senderFrame!==window.webContents.mainFrame)throw new Error('请求来源无效');if(closing)throw new Error('软件正在关闭');if(typeof action!=='string'||!Object.hasOwn(handlers,action))throw new Error('操作不受支持');const data=await handlers[action](payload);if(!closing)changed();return {ok:true,data};}catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)};}});
 window=new BrowserWindow({width:1280,height:880,minWidth:860,minHeight:650,title:'栖境',icon:path.join(resources,'config','icon.png'),backgroundColor:'#f6f7f9',show:!process.env.QIJING_SMOKE,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());window.webContents.on('will-attach-webview',event=>event.preventDefault());window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 await window.loadFile(path.join(__dirname,'index.html'));if(!process.env.QIJING_SMOKE)window.show();
 window.on('close',event=>{if(allowUpdateQuit)return;event.preventDefault();if(closing||closePending)return;closePending=true;void(async()=>{if(kernels.preparing||components.preparing||browsers.operating)throw new Error('内核或诊断组件正在下载、验证或采集，请完成后关闭');if(Object.keys(browsers.running()).length&&!await confirm('关闭栖境并关闭浏览器？','正在运行的环境会正常关闭，登录数据由浏览器保存。'))return;closing=true;await browsers.stopAll();store.close();window?.destroy();app.quit();})().catch(error=>{closing=false;notice=error instanceof Error?error.message:String(error);changed();}).finally(()=>{closePending=false;});});
 if(process.env.QIJING_SMOKE){try{const {runSmoke}=await import('./smoke-internal');await runSmoke({store,kernels,browsers,components,window,state});app.exit(0);}catch(error){const output=path.resolve(process.env.QIJING_SMOKE_OUTPUT||path.join(devDir,'.verification'));await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'smoke-error.txt'),String(error instanceof Error?error.stack:error));await browsers.stopAll();app.exit(1);}}
}
app.on('window-all-closed',()=>app.quit());
