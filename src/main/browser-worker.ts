import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {buildOptions,proxyUrl} from '../shared/config';
import {PROBE} from './probe';
let context:any,profile:any,kernel:any,initial:any;
const send=(msg:unknown)=>process.send?.(msg);
let secretValues:string[]=[];
function safeError(error:unknown){let msg=error instanceof Error?error.message:String(error);for(const s of secretValues)if(s)msg=msg.split(s).join('[已隐藏]');return msg.slice(0,2500);}
async function sdk(){return import('@xiaoxiaofeihh/chromix');}
async function diagnostic(){
 if(!context)throw new Error('环境未运行');
 let headers:any={};const server=http.createServer((req,res)=>{headers=req.headers;res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><head><title>栖境 · 本地环境检查</title></head><body style="font:16px Segoe UI;padding:40px"><h2>正在检查当前环境</h2><p>检查结束后本页面会自动关闭。</p></body></html>');});
 let page:any,timer:NodeJS.Timeout|undefined;
 try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const address=server.address() as any;page=await context.newPage();await page.goto(`http://127.0.0.1:${address.port}`,{waitUntil:'load',timeout:20000});const observation=await Promise.race([page.evaluate(PROBE),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('诊断超时，部分 API 可能受实验设置影响')),35000);})]);return {observation,headers,version:context.browser()?.version?.(),headless:false};}finally{if(timer)clearTimeout(timer);await page?.close().catch(()=>{});server.closeAllConnections();if(server.listening)await new Promise<void>(r=>server.close(()=>r()));}
}
async function start(payload:any){
 profile=payload.profile;kernel=payload.kernel;initial=payload;secretValues=[payload.proxy?.password,payload.proxy?.username].filter(Boolean);
 process.env.CLOAKBROWSER_BINARY_PATH=kernel.path;process.env.CLOAKBROWSER_WIDEVINE=profile.values.widevine==='disabled'?'0':'1';if(profile.values.widevine==='custom')process.env.CLOAKBROWSER_WIDEVINE_CDM=profile.values.widevinePath;
 const lib=await sdk();
 if(profile.mode==='measured'){context=await lib.launchPersistentContext({userDataDir:payload.profileDir,headless:false,devicePool:{python:payload.python,host:profile.recordPath,records:[profile.recordPath],seed:profile.seed}} as any);}
 else context=await lib.launchPersistentContext(buildOptions(profile,kernel.path,payload.profileDir,payload.extensions,payload.proxy));
 context.on('close',()=>{send({event:'closed'});setTimeout(()=>process.exit(0),50);});
 const attach=(page:any)=>page.on('download',async(download:any)=>{try{const directory=profile.downloadDir||payload.downloadDir;await fs.mkdir(directory,{recursive:true});const suggested=path.basename(download.suggestedFilename()).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_');const {randomUUID}=await import('node:crypto');const target=path.join(directory,Date.now()+'-'+randomUUID().slice(0,8)+'-'+suggested);await download.saveAs(target);send({event:'download',filename:path.basename(target)});}catch(e){send({event:'notice',error:safeError(e)});}});
 context.pages().forEach(attach);context.on('page',attach);
 send({event:'started'});
 if(!payload.blank){const active=context,urls=[...profile.startUrls];void(async()=>{const pages=active.pages();for(const [i,url] of urls.entries()){if(active.pages().length===0)return;try{const page=i===0&&pages[0]?pages[0]:await active.newPage();await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});}catch(error){if(active.pages().length===0)return;send({event:'notice',error:safeError(error)});}}})().catch(error=>send({event:'notice',error:safeError(error)}));}
}
async function request(action:string,payload:any){
 if(action==='start'){await start(payload);return true;}
 if(action==='stop'){await context?.close();return true;}
 if(action==='focus'){const page=context?.pages()[0];if(page)await page.bringToFront();return true;}
 if(action==='diagnose')return diagnostic();
 if(action==='exportCookies'){const lib=await sdk();return lib.exportCookies(context,payload.path,{passphrase:payload.passphrase});}
 if(action==='importCookies'){const lib=await sdk();return lib.importCookies(context,payload.path,{passphrase:payload.passphrase});}
 if(action==='proxyTest'){secretValues=[payload.proxy.password,payload.proxy.username].filter(Boolean);const lib=await sdk();return lib.maybeResolveGeoip(true,{server:proxyUrl(payload.proxy),username:payload.proxy.username||undefined,password:payload.proxy.password||undefined},undefined,undefined,[]);}
 throw new Error('未知浏览器命令');
}
process.on('message',(message:any)=>{void request(message.action,message.payload).then(result=>send({id:message.id,ok:true,result})).catch(error=>send({id:message.id,ok:false,error:safeError(error)}));});
process.on('disconnect',()=>{if(context)void context.close().finally(()=>process.exit());else process.exit();setTimeout(()=>process.exit(),5000).unref();});
process.on('uncaughtException',error=>{send({event:'fatal',error:safeError(error)});void context?.close();setTimeout(()=>process.exit(1),1000);});
