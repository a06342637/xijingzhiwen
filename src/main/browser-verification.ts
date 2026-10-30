import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {buildOptions} from '../shared/config';
import {newProfile,type Kernel} from '../shared/model';
import {Store,newSeed} from './store';
import {Browsers} from './browsers';
export async function verifyBrowserFlows(kernel:Kernel,store:Store,browsers:Browsers,output:string){
 const lib=await import('@xiaoxiaofeihh/chromix');const envBinary=process.env.CLOAKBROWSER_BINARY_PATH;process.env.CLOAKBROWSER_BINARY_PATH=kernel.path;
 const root=path.join(store.root,'flow-tests',randomUUID());await fs.mkdir(root,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url==='/download'){res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Disposition','attachment; filename="qijing-test.txt"');res.end('Qijing download verification');}else{res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html><title>本地验收</title><body><input aria-label="测试输入"><p id="extension">未加载</p></body></html>');}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+(server.address() as net.AddressInfo).port;
 const results:any[]=[];let context:any;
 try{
  const p=newProfile(randomUUID(),newSeed(),kernel.id);p.name='会话隔离测试';
  context=await lib.launchPersistentContext(buildOptions(p,kernel.path,path.join(root,'session-a'),[]));let page=await context.newPage();await page.goto(origin);await context.addCookies([{name:'qijing-test',value:'persistent-marker',url:origin,expires:Math.floor(Date.now()/1000)+3600}]);await page.evaluate(()=>localStorage.setItem('qijing-test','local-marker'));await context.close();
  context=await lib.launchPersistentContext(buildOptions(p,kernel.path,path.join(root,'session-a'),[]));page=await context.newPage();await page.goto(origin);assert.equal((await context.cookies()).find((x:any)=>x.name==='qijing-test')?.value,'persistent-marker');assert.equal(await page.evaluate(()=>localStorage.getItem('qijing-test')),'local-marker');
  const encrypted=path.join(root,'cookies.enc');await lib.exportCookies(context,encrypted,{passphrase:'verification-passphrase'});assert.equal((await fs.readFile(encrypted)).includes(Buffer.from('persistent-marker')),false);await context.close();
  context=await lib.launchPersistentContext(buildOptions(p,kernel.path,path.join(root,'session-b'),[]));assert.equal((await context.cookies()).length,0);await lib.importCookies(context,encrypted,{passphrase:'verification-passphrase'});assert.equal((await context.cookies()).find((x:any)=>x.name==='qijing-test')?.value,'persistent-marker');await assert.rejects(()=>lib.importCookies(context,encrypted,{passphrase:'verification-passphrase'}));await context.close();
  results.push({name:'Cookie / localStorage 重启保存，独立目录隔离，加密 Cookie 迁移，非空目标拒绝',passed:true});
  const downloadProfile={...p,id:randomUUID(),name:'下载保存验收',startUrls:[origin+'/download'],downloadDir:path.join(root,'downloads')};store.put('profile',downloadProfile.id,downloadProfile);await browsers.start(downloadProfile.id);
  let saved:string[]=[];for(let i=0;i<40;i++){saved=await fs.readdir(downloadProfile.downloadDir).catch(()=>[]);if(saved.length)break;await new Promise(r=>setTimeout(r,100));}assert.equal(saved.length,1);assert.equal(await fs.readFile(path.join(downloadProfile.downloadDir,saved[0]),'utf8'),'Qijing download verification');await browsers.stop(downloadProfile.id);await store.deleteProfile(downloadProfile.id);results.push({name:'下载文件自动保存至环境目录',passed:true});
  const extension=path.join(root,'extension');await fs.mkdir(extension);await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Qijing local verification',version:'1.0',content_scripts:[{matches:['http://127.0.0.1/*'],js:['content.js']}]}));await fs.writeFile(path.join(extension,'content.js'),"document.getElementById('extension').textContent='已加载';");
  context=await lib.launchPersistentContext(buildOptions(p,kernel.path,path.join(root,'extension-profile'),[extension]));page=await context.newPage();await page.goto(origin);await page.locator('#extension').filter({hasText:'已加载'}).waitFor({timeout:12000});await context.close();results.push({name:'Windows 本地 MV3 扩展加载',passed:true});
  let authenticated=0;const proxy=http.createServer((req,res)=>{if(req.headers['proxy-authorization']!=='Basic '+Buffer.from('qijing:verification-secret').toString('base64')){res.writeHead(407,{'Proxy-Authenticate':'Basic realm="local-test"'});res.end();return;}authenticated++;res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<html><title>代理认证成功</title></html>');});await new Promise<void>(r=>proxy.listen(0,'127.0.0.1',r));
  try{context=await lib.launchPersistentContext(buildOptions(p,kernel.path,path.join(root,'proxy-profile'),[],{id:randomUUID(),name:'本地代理',protocol:'http',host:'127.0.0.1',port:(proxy.address() as net.AddressInfo).port,username:'qijing',password:'verification-secret',bypass:''}));page=await context.newPage();await page.goto('http://qijing-verification.invalid/',{timeout:20000});assert.equal(await page.title(),'代理认证成功');assert.ok(authenticated>0);await context.close();results.push({name:'HTTP 代理认证实际请求',passed:true});}finally{await new Promise<void>(r=>proxy.close(()=>r()));}
  await fs.writeFile(path.join(output,'browser-flows.json'),JSON.stringify({arch:kernel.arch,version:kernel.version,checks:results},null,2));return results;
 }finally{await context?.close().catch(()=>{});await new Promise<void>(r=>server.close(()=>r()));if(envBinary===undefined)delete process.env.CLOAKBROWSER_BINARY_PATH;else process.env.CLOAKBROWSER_BINARY_PATH=envBinary;}
}
