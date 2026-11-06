import fs from 'node:fs/promises';
import {initializeChromiumSearch} from './search-defaults';
import path from 'node:path';
import {diagnosticPage} from './diagnostic-page';
import {buildOptions} from '../shared/config';
import {launchFirefox} from './firefox';
import {firefoxCookies} from './firefox-cookies';
import {resolveProxyLocale} from './proxy-locale';
import {checkProxyRoute} from './proxy-check';
import {launchDashboard} from './dashboard';
import {applyControlledProfile} from '../shared/controlled-features';
import {mobileMetrics} from '../shared/devices';
let resolvedGeo:unknown;
const pageReady=new WeakMap<object,Promise<void>>();
let context:any,profile:any,kernel:any,initial:any,dashboard:Awaited<ReturnType<typeof launchDashboard>>|undefined;
const send=(msg:unknown)=>{if(process.connected)process.send?.(msg,()=>{});};
let secretValues:string[]=[];
function safeError(error:unknown){let msg=error instanceof Error?error.message:String(error);for(const s of secretValues)if(s)msg=msg.split(s).join('[已隐藏]');return msg.slice(0,2500);}
async function sdk(){return import('@xiaoxiaofeihh/chromix');}
async function diagnostic(){
 if(!context)throw new Error('环境未运行');
 const local=await diagnosticPage();let page:any,reused=false,timer:NodeJS.Timeout|undefined;
 try{page=context.pages().find((p:any)=>p.url()==='about:blank');reused=Boolean(page);page??=await context.newPage();await pageReady.get(page);await page.goto(local.url,{waitUntil:'load',timeout:15000});const observation=await Promise.race([local.result,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('诊断超时，部分 API 可能受实验设置影响')),25000);})]);return {observation,headers:local.headers(),resolvedGeo,effectiveValues:profile.values,version:context.browser()?.version?.(),headless:false};}
 finally{if(timer)clearTimeout(timer);if(page?.url()===local.url){if(reused)await page.goto('about:blank',{timeout:5000}).catch(()=>{});else await page.close().catch(()=>{});}await local.close();}
}
async function start(payload:any){
 profile=applyControlledProfile(payload.profile,payload.controlledFeatures);kernel=payload.kernel;initial=payload;secretValues=[payload.proxy?.password,payload.proxy?.username].filter(Boolean);
 const matched=await resolveProxyLocale(profile,payload.proxy,payload.fingerprintLocks);profile=applyControlledProfile(matched.profile,payload.controlledFeatures);resolvedGeo=matched.geo;
 if(payload.proxy&&matched.geo&&profile.values.randomStrategy!=='catalog')send({event:'notice',error:'已通过绑定代理匹配当前出口；供应商 DNS、TCP 特征和后续出口轮换仍需实测，建议使用固定会话。'});
 process.env.CLOAKBROWSER_BINARY_PATH=kernel.path;process.env.CLOAKBROWSER_WIDEVINE=profile.values.widevine==='disabled'?'0':'1';if(profile.values.widevine==='custom')process.env.CLOAKBROWSER_WIDEVINE_CDM=profile.values.widevinePath;
 const lib=await sdk();
 if(profile.values.engine==='firefox')context=await launchFirefox(profile,kernel.path,payload.profileDir,kernel.version,payload.proxy,payload.bookmarkPrefs,payload.controlledFeatures);
 else if(profile.mode==='measured'){context=await lib.launchPersistentContext({userDataDir:payload.profileDir,headless:false,devicePool:{python:payload.python,host:profile.recordPath,records:[profile.recordPath],seed:profile.seed}} as any);}
  else {const options=buildOptions(profile,kernel.path,payload.profileDir,payload.extensions,payload.proxy,payload.controlledFeatures);if(payload.automation){await fs.rm(path.join(payload.profileDir,'DevToolsActivePort'),{force:true});options.args.push('--remote-debugging-port=0','--remote-debugging-address=127.0.0.1');}context=await lib.launchPersistentContext(options);
  if(payload.extensions.length&&profile.values.deviceType==='desktop'){
   const configure=async(page:any)=>{const session=await context.newCDPSession(page);const apply=async()=>{if(page.isClosed())return;if(page.url().startsWith('chrome-extension:')){await session.send('Emulation.clearDeviceMetricsOverride');const tool=await session.send('Browser.getWindowForTarget');const main=context.pages().find((p:any)=>!p.url().startsWith('chrome-extension:'));if(main){const other=await context.newCDPSession(main);try{const primary=await other.send('Browser.getWindowForTarget');if(tool.windowId!==primary.windowId)await session.send('Browser.setWindowBounds',{windowId:tool.windowId,bounds:{width:580,height:680}});}finally{await other.detach();}}}else if(profile.values.viewportMode==='fixed')await session.send('Emulation.setDeviceMetricsOverride',{width:Number(profile.values.viewportWidth),height:Number(profile.values.viewportHeight),deviceScaleFactor:Number(profile.values.deviceScale),screenWidth:Number(profile.values.screenWidth),screenHeight:Number(profile.values.screenHeight),mobile:false});};await apply();page.on('framenavigated',(frame:any)=>{if(frame===page.mainFrame())void apply().catch(()=>{});});page.once('close',()=>void session.detach().catch(()=>{}));};
   const ready=(page:any)=>{const task=configure(page);pageReady.set(page,task);task.catch(e=>send({event:'notice',error:safeError(e)}));return task;};for(const page of context.pages())await ready(page);context.on('page',ready);
  }
  if(profile.values.deviceType!=='desktop'){
   const configure=async(page:any)=>{const session=await context.newCDPSession(page);try{await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:Number(profile.values.touch)});await session.send('Emulation.setDeviceMetricsOverride',mobileMetrics(profile.values));}catch(error){await session.detach();throw error;}page.once('close',()=>void session.detach().catch(()=>{}));};
   const ready=(page:any)=>{const task=configure(page);pageReady.set(page,task);task.catch(e=>send({event:'notice',error:safeError(e)}));return task;};for(const page of context.pages())await ready(page);context.on('page',ready);
  }
 }
 if(profile.values.engine==='chromium'&&profile.mode==='custom')try{await initializeChromiumSearch(context,payload.profileDir);}catch(error){send({event:'notice',error:'默认Google搜索设置未完成，可在浏览器设置中选择：'+safeError(error)});}
 context.on('close',()=>{send({event:'closed'});setTimeout(()=>process.exit(0),250);});
 const attach=(page:any)=>{page.on('download',async(download:any)=>{try{const directory=profile.downloadDir||payload.downloadDir;await fs.mkdir(directory,{recursive:true});const suggested=path.basename(download.suggestedFilename()).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');const {randomUUID}=await import('node:crypto');const target=path.join(directory,Date.now()+'-'+randomUUID().slice(0,8)+'-'+suggested);await download.saveAs(target);send({event:'download',filename:path.basename(target)});}catch(e){send({event:'notice',error:safeError(e)});}});};
 context.pages().forEach(attach);context.on('page',attach);
 send({event:'started'});
 if(!payload.blank){
  if(payload.startupDashboard!==false){try{const geo=resolvedGeo as any;dashboard=await launchDashboard(context,{profileName:profile.name,engine:profile.values.engine,kernelVersion:kernel.version,architecture:kernel.arch,proxy:Boolean(payload.proxy),diagnosticLinks:payload.diagnosticLinks!==false,startup:geo?{exitIp:geo.exitIp,timezone:geo.timezone,locale:geo.locale}:undefined},async page=>{await pageReady.get(page);},safeError);}catch(error){send({event:'notice',error:'启动检测总览失败：'+safeError(error)});}}
  const active=context,urls=profile.startUrls.filter((url:string)=>!dashboard||url!=='about:blank');
  void(async()=>{const pages=active.pages();for(const [i,url] of urls.entries()){if(active.pages().length===0)return;try{const page=!dashboard&&i===0&&pages[0]?pages[0]:await active.newPage();await pageReady.get(page);await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});}catch(error){if(active.pages().length===0)return;send({event:'notice',error:safeError(error)});}}if(dashboard&&!dashboard.page.isClosed())await dashboard.page.bringToFront();})().catch(error=>send({event:'notice',error:safeError(error)}));
 }
}
async function request(action:string,payload:any){
 if(action==='extensionPopupSmoke'&&process.env.QIJING_SMOKE==='1'){
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');await worker.evaluate(async()=>{await (globalThis as any).qijingOpenPopupWindow();});const page=context.pages().find((p:any)=>p.url().startsWith('chrome-extension:'))||await context.waitForEvent('page');await page.waitForLoadState('load');await pageReady.get(page);await page.waitForTimeout(300);const session=await context.newCDPSession(page);await session.detach();await page.waitForTimeout(200);await page.screenshot({path:payload.screenshot});return page.evaluate(()=>({width:innerWidth,height:innerHeight,title:document.title,text:document.body.innerText.slice(0,500)}));
 }
 if(action==='start'){await start(payload);return true;}
 if(action==='automationInfo'){
  let endpoint='',port='';if(initial.automation&&profile.values.engine==='chromium'&&profile.mode==='custom'){
   const active=(await fs.readFile(path.join(initial.profileDir,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);port=active[0];if(!/^\d+$/.test(port)||!active[1]?.startsWith('/devtools/browser/'))throw new Error('自动化调试地址无效');endpoint=`ws://127.0.0.1:${port}${active[1]}`;
  }
  return {ws:{puppeteer:endpoint},debug_port:port,engine:profile.values.engine,automation:profile.values.engine==='firefox'?'tabs':'cdp-or-tabs'};
 }
 if(action==='automation'){
  if(!context)throw new Error('环境未运行');const pages=context.pages();
  if(payload.action==='list')return {list:await Promise.all(pages.map(async(page:any,tab:number)=>({tab,url:page.url(),title:await page.title(),dashboard:dashboard?.page===page})))};
  const page=payload.action==='open'?await context.newPage():pages[payload.tab??0];if(!page)throw new Error('标签页不存在');await pageReady.get(page);
  if(payload.action==='open'||payload.action==='goto')await page.goto(payload.url||'about:blank',{waitUntil:'domcontentloaded',timeout:30000});
  else if(payload.action==='close'){await page.close();return {closed:true};}
  else if(payload.action==='content')return {url:page.url(),title:await page.title(),html:await page.content()};
  else if(payload.action==='click'){if(!payload.selector)throw new Error('缺少 selector');await page.locator(payload.selector).click({timeout:15000});}
  else if(payload.action==='fill'){if(!payload.selector||typeof payload.text!=='string')throw new Error('缺少 selector 或 text');await page.locator(payload.selector).fill(payload.text,{timeout:15000});}
  return {url:page.url(),title:await page.title()};
 }
 if(action==='stop'){await context?.close();setTimeout(()=>process.exit(0),500).unref();return true;}
 if(action==='focus'){const page=context?.pages()[0];if(page)await page.bringToFront();return true;}
 if(action==='diagnose')return diagnostic();
 if(action==='exportCookies'||action==='importCookies'){if(profile.values.engine==='firefox')return firefoxCookies(context,action,payload.path,payload.passphrase);const lib=await sdk();return action==='exportCookies'?lib.exportCookies(context,payload.path,{passphrase:payload.passphrase}):lib.importCookies(context,payload.path,{passphrase:payload.passphrase});}
 if(action==='proxyTest'){secretValues=[payload.proxy.password,payload.proxy.username].filter(Boolean);return checkProxyRoute(payload.proxy);}
 throw new Error('未知浏览器命令');
}
process.on('message',(message:any)=>{void request(message.action,message.payload).then(result=>send({id:message.id,ok:true,result})).catch(error=>send({id:message.id,ok:false,error:safeError(error)}));});
process.on('disconnect',()=>{if(context)void context.close().finally(()=>process.exit());else process.exit();setTimeout(()=>process.exit(),5000).unref();});
process.on('uncaughtException',error=>{send({event:'fatal',error:safeError(error)});void context?.close();setTimeout(()=>process.exit(1),1000);});
