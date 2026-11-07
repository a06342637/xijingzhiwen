import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Store} from './store';
import type {Browsers} from './browsers';
import type {Profile} from '../shared/model';
export async function proxySwitchSmoke(store:Store,browsers:Browsers,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const settings=store.settings(),ids:string[]=[],proxyIds:string[]=[];let firstHits=0,secondHits=0;
 const first=http.createServer((_req,res)=>{firstHits++;res.setHeader('Content-Type','text/html');res.end('<!doctype html><script>localStorage.setItem("proxy-switch-preserve","retained");document.title="route-one";</script>');});
 const second=http.createServer((_req,res)=>{secondHits++;res.setHeader('Content-Type','text/html');res.end('<!doctype html><script>document.title="route-two:"+localStorage.getItem("proxy-switch-preserve");</script>');});
 await new Promise<void>(r=>first.listen(0,'127.0.0.1',r));await new Promise<void>(r=>second.listen(0,'127.0.0.1',r));const proxy=(port:number)=>({id:randomUUID(),name:'隔离代理切换',protocol:'http' as const,host:'127.0.0.1',port,username:'',password:'',bypass:''});
 const checks:any[]=[];
 try{store.put('settings','app',{...settings,startupDashboard:false,randomBookmarks:false,fingerprintDefaults:{...settings.fingerprintDefaults,geoip:false}});
 for(const engine of ['chromium','firefox']){
  if(!store.kernels().some(k=>(k.engine||'chromium')===engine)){if(engine==='chromium')await handlers['kernel.install']({arch:process.arch});else await handlers['kernel.install']({engine:'firefox'});}
  const p=await handlers['profile.new']({}) as Profile;p.name='运行中切换代理 '+engine;p.values={...p.values,engine,brand:engine==='firefox'?'Firefox':'Chrome',geoip:false};p.kernelId=store.kernels().find(k=>(k.engine||'chromium')===engine&&k.arch===process.arch)?.id||store.kernels().find(k=>(k.engine||'chromium')===engine)!.id;p.extensionIds=[];p.startUrls=['http://proxy-switch.test/'];const a=proxy((first.address() as any).port);await store.saveProxy(a);proxyIds.push(a.id);p.proxyId=a.id;store.put('profile',p.id,p);ids.push(p.id);
  const peer={...p,id:randomUUID(),name:'共享代理保留',startUrls:[]};store.put('profile',peer.id,peer);ids.push(peer.id);
  await browsers.start(p.id);const findTitle=async(title:string)=>{for(let i=0;i<200;i++){const tabs=await browsers.automation(p.id,{action:'list'});if(tabs.list.some((t:any)=>t.title===title))return;await new Promise(r=>setTimeout(r,100));}throw new Error('proxy route did not switch: '+title);};await findTitle('route-one');
  const updated={...a,port:(second.address() as any).port};await handlers['profile.proxy']({id:p.id,proxy:updated});assert.equal(browsers.running()[p.id],'running');await findTitle('route-two:retained');assert.ok(secondHits>0);assert.equal(store.get<Profile>('profile',peer.id).proxyId,a.id);assert.equal((await store.proxy(a.id)).port,(first.address() as any).port);assert.notEqual(store.get<Profile>('profile',p.id).proxyId,a.id);const switchedHits=firstHits;const tabs=await browsers.automation(p.id,{action:'list'});const tab=tabs.list.find((t:any)=>t.url.startsWith('http://proxy-switch.test/'));await browsers.automation(p.id,{action:'goto',tab:tab.tab,url:'http://proxy-switch.test/verify-new-route'});assert.equal(firstHits,switchedHits);
  await browsers.stop(p.id);await handlers['profile.delete']({id:p.id});await handlers['profile.delete']({id:peer.id});checks.push({name:engine+'运行中保存自动重启切换真实代理请求、保留localStorage、共用代理其他环境不变',passed:true});await fs.appendFile(path.join(output,'proxy-switch-progress.txt'),engine+' complete\n');
 }
 return checks;
 }finally{for(const id of ids)if(store.profiles().some(p=>p.id===id)){await browsers.stop(id);await handlers['profile.delete']({id});}for(const id of proxyIds)if(store.proxies().some(p=>p.id===id))store.remove('proxy',id);store.put('settings','app',settings);first.closeAllConnections();second.closeAllConnections();await Promise.all([new Promise<void>(r=>first.close(()=>r())),new Promise<void>(r=>second.close(()=>r()))]);}
}
