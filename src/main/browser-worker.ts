import fs from 'node:fs/promises';
import {initializeChromiumSearch} from './search-defaults';
import path from 'node:path';
import {diagnosticPage} from './diagnostic-page';
import {buildOptions} from '../shared/config';
import {launchFirefox} from './firefox';
import {firefoxCookies} from './firefox-cookies';
import {mobileUA,mobileIdentity} from '../shared/devices';
import {resolveProxyLocale} from './proxy-locale';
import {checkProxyRoute} from './proxy-check';
import {launchDashboard} from './dashboard';
import {generatedBookmarks} from './bookmarks';
import {rememberBookmarkTitle} from './bookmark-titles';
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
 profile=payload.profile;kernel=payload.kernel;initial=payload;secretValues=[payload.proxy?.password,payload.proxy?.username].filter(Boolean);
 const matched=await resolveProxyLocale(profile,payload.proxy,payload.fingerprintLocks);profile=matched.profile;resolvedGeo=matched.geo;
 if(payload.proxy&&matched.geo&&profile.values.randomStrategy!=='catalog')send({event:'notice',error:'已通过绑定代理匹配当前出口；供应商 DNS、TCP 特征和后续出口轮换仍需实测，建议使用固定会话。'});
 process.env.CLOAKBROWSER_BINARY_PATH=kernel.path;process.env.CLOAKBROWSER_WIDEVINE=profile.values.widevine==='disabled'?'0':'1';if(profile.values.widevine==='custom')process.env.CLOAKBROWSER_WIDEVINE_CDM=profile.values.widevinePath;
 const lib=await sdk();
 if(profile.values.engine==='firefox')context=await launchFirefox(profile,kernel.path,payload.profileDir,kernel.version,payload.proxy,payload.bookmarkPrefs);
 else if(profile.mode==='measured'){context=await lib.launchPersistentContext({userDataDir:payload.profileDir,headless:false,devicePool:{python:payload.python,host:profile.recordPath,records:[profile.recordPath],seed:profile.seed}} as any);}
 else {const options=buildOptions(profile,kernel.path,payload.profileDir,payload.extensions,payload.proxy);if(profile.values.deviceType!=='desktop')options.userAgent=mobileUA(profile.values,kernel.version);context=await lib.launchPersistentContext(options);
  if(profile.values.deviceType!=='desktop'){
   const configure=async(page:any)=>{const session=await context.newCDPSession(page);try{await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:Number(profile.values.touch)});const identity=mobileIdentity(profile.values,kernel.version);await session.send('Emulation.setDeviceMetricsOverride',identity.metrics);const {metrics,...ua}=identity;await session.send('Emulation.setUserAgentOverride',ua);}catch(error){await session.detach();throw error;}page.once('close',()=>void session.detach().catch(()=>{}));};
   const ready=(page:any)=>{const task=configure(page);pageReady.set(page,task);task.catch(e=>send({event:'notice',error:safeError(e)}));return task;};for(const page of context.pages())await ready(page);context.on('page',ready);
  }
 }
 if(profile.values.engine==='chromium'&&profile.mode==='custom')try{await initializeChromiumSearch(context,payload.profileDir);}catch(error){send({event:'notice',error:'默认Google搜索设置未完成，可在浏览器设置中选择：'+safeError(error)});}
 context.on('close',()=>{send({event:'closed'});setTimeout(()=>process.exit(0),250);});
 let titleWrites=Promise.resolve();const bookmarkEntries=payload.randomBookmarks&&profile.mode==='custom'?generatedBookmarks(profile):[];
 const attach=(page:any)=>{if(bookmarkEntries.length)page.on('load',()=>{titleWrites=titleWrites.then(async()=>{if(!page.isClosed())await rememberBookmarkTitle(page.url(),await page.title(),bookmarkEntries,payload.profileDir);}).catch(()=>{});});page.on('download',async(download:any)=>{try{const directory=profile.downloadDir||payload.downloadDir;await fs.mkdir(directory,{recursive:true});const suggested=path.basename(download.suggestedFilename()).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');const {randomUUID}=await import('node:crypto');const target=path.join(directory,Date.now()+'-'+randomUUID().slice(0,8)+'-'+suggested);await download.saveAs(target);send({event:'download',filename:path.basename(target)});}catch(e){send({event:'notice',error:safeError(e)});}});};
 context.pages().forEach(attach);context.on('page',attach);
 send({event:'started'});
 if(!payload.blank){
  if(payload.startupDashboard!==false){try{const geo=resolvedGeo as any;dashboard=await launchDashboard(context,{profileName:profile.name,engine:profile.values.engine,kernelVersion:kernel.version,architecture:kernel.arch,proxy:Boolean(payload.proxy),diagnosticLinks:payload.diagnosticLinks!==false,startup:geo?{exitIp:geo.exitIp,timezone:geo.timezone,locale:geo.locale}:undefined},async page=>{await pageReady.get(page);},safeError);}catch(error){send({event:'notice',error:'启动检测总览失败：'+safeError(error)});}}
  const active=context,urls=profile.startUrls.filter((url:string)=>!dashboard||url!=='about:blank');
  void(async()=>{const pages=active.pages();for(const [i,url] of urls.entries()){if(active.pages().length===0)return;try{const page=!dashboard&&i===0&&pages[0]?pages[0]:await active.newPage();await pageReady.get(page);await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});}catch(error){if(active.pages().length===0)return;send({event:'notice',error:safeError(error)});}}if(dashboard&&!dashboard.page.isClosed())await dashboard.page.bringToFront();})().catch(error=>send({event:'notice',error:safeError(error)}));
 }
}
async function request(action:string,payload:any){
 if(action==='start'){await start(payload);return true;}
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
