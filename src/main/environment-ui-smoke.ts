import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {BrowserWindow} from 'electron';
import {Store} from './store';
import {newProfile,type ProxyConfig} from '../shared/model';
export async function environmentUiSmoke(window:BrowserWindow,store:Store,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 window.showInactive();
 const js=async(s:string)=>{const result=await window.webContents.executeJavaScript(`(async()=>{try{return {value:await(${s})};}catch(e){return {error:e.stack||String(e)};}})()`);if(result.error)throw new Error(result.error);return result.value;},wait=()=>js('new Promise(r=>setTimeout(r,300))');
 const until=(condition:string)=>js(`new Promise((resolve,reject)=>{const start=Date.now();function check(){if(${condition})return resolve();if(Date.now()-start>10000)return reject(new Error('UI did not settle'));setTimeout(check,50);}check();})`);
 const click=async(text:string,selector='button')=>{await js(`(()=>{const b=Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw new Error('Missing '+${JSON.stringify(text)});b.click();})()`);await wait();};
 const fill=async(label:string,value:string)=>{await js(`(()=>{const el=Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent===${JSON.stringify(label)}).querySelector('input,textarea');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait();};
 const testName='UI 回收与代理验收 '+randomUUID().slice(0,8);
 await js(`Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()`);await wait();await click('新建环境','.page-header button');
 assert.equal(await js(`document.querySelector('[aria-label="代理来源"]').value`),'manual');assert.equal(await js(`document.querySelector('[placeholder="不添加额外启动页面"]').value`),'');
 const original=handlers['proxy.testDraft'];let tests=0;
 handlers['proxy.testDraft']=async p=>{tests++;return {proxyId:p.id,testedAt:new Date().toISOString(),exitIp:'192.0.2.9',country:'TH',city:'Bangkok',timezone:'Asia/Bangkok',routeStable:true,message:'fixture'};};
 try{
  await js(`(()=>{const e=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(e,'clipboardData',{value:{getData:()=> 'as.gateway.test:10000:smoke-user:smoke-pass'}});document.querySelector('.proxy-paste textarea').dispatchEvent(e);})()`);
  await js('new Promise(r=>setTimeout(r,1200))');assert.equal(tests,1);assert.ok((await js('document.querySelector(".proxy-test-strip").innerText')).includes('泰国'));await click('测试当前代理');assert.equal(tests,2);
  await fill('环境名称',testName);await js(`document.querySelector('.modal-footer .primary').click()`);await until('!document.querySelector(".modal")');
 }finally{handlers['proxy.testDraft']=original;}
 const created=store.profiles().find(p=>p.name===testName)!;assert.ok(created);assert.equal(created.startUrls.length,0);const proxy=await store.proxy(created.proxyId);assert.equal(proxy.host,'as.gateway.test');
 store.put('proxyObservation',proxy.id,{proxyId:proxy.id,testedAt:new Date().toISOString(),exitIp:'192.0.2.9',country:'TH',routeStable:true,message:'fixture'});
 await js(`window.qijing.invoke('settings.save',{view:'list'})`);await until(`Boolean(document.querySelector('thead')?.textContent.includes('平台 / 浏览器')&&document.querySelector('tbody')?.textContent.includes('泰国'))`);assert.ok((await js('document.querySelector("thead").innerText')).includes('平台 / 浏览器'));assert.ok((await js('document.querySelector("tbody").innerText')).includes('泰国'));
 await js(`document.querySelector('[aria-label="编辑代理 ${testName}"]').click()`);await until('Boolean(document.querySelector(".modal"))');assert.ok((await js('document.querySelector(".modal").innerText')).includes('只修改此环境'));assert.equal(await js('document.querySelectorAll(".modal .editor-tabs").length'),0);await js(`document.querySelector('[aria-label="关闭对话框"]').click()`);await until('!document.querySelector(".modal")');
 await js('new Promise(r=>setTimeout(r,500))');await fs.writeFile(path.join(output,'environment-table.png'),(await window.webContents.capturePage()).toPNG());
 // Select only our named test row via the visible filter.
 await js(`(()=>{const el=document.querySelector('[aria-label="搜索环境"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(testName)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);await wait();
 await js(`document.querySelector('[aria-label="全选表格环境"]').click()`);await until('Boolean(document.querySelector(".selection-bar"))');assert.ok((await js('document.querySelector(".selection-bar").innerText')).includes('删除勾选'));await click('删除勾选');await until(`!Array.from(document.querySelectorAll('tbody tr')).some(r=>r.textContent.includes(${JSON.stringify(testName)}))`);assert.equal(store.profiles().some(p=>p.id===created.id),false);assert.ok(store.recycled().some(r=>r.profile.id===created.id));
 await js('document.querySelector(".recycle-entry").click()');await until(`document.querySelector('h1')?.textContent==='回收站'&&Array.from(document.querySelectorAll('tbody tr')).some(r=>r.textContent.includes(${JSON.stringify(testName)}))`);assert.ok((await js('document.querySelector("tbody").innerText')).includes(testName));await js('new Promise(r=>setTimeout(r,500))');await fs.writeFile(path.join(output,'recycle-bin.png'),(await window.webContents.capturePage()).toPNG());
 const r=store.recycled().find(r=>r.profile.id===created.id)!;await js(`Array.from(document.querySelectorAll('tbody tr')).find(r=>r.textContent.includes(${JSON.stringify(testName)})).querySelector('button').click()`);await until(`!Array.from(document.querySelectorAll('tbody tr')).some(r=>r.textContent.includes(${JSON.stringify(testName)}))`);assert.equal(store.profiles().some(p=>p.id===created.id),true);assert.equal(store.recycled().some(x=>x.id===r.id),false);
 const peer={...created,id:randomUUID(),name:'共享代理同伴'};store.put('profile',peer.id,peer);const before=await store.proxy(created.proxyId);await handlers['profile.proxy']({id:created.id,proxy:{...before,host:'hk.gateway.test'}});const edited=store.get<any>('profile',created.id);assert.notEqual(edited.proxyId,peer.proxyId);assert.equal((await store.proxy(peer.proxyId)).host,'as.gateway.test');assert.equal((await store.proxy(edited.proxyId)).host,'hk.gateway.test');assert.equal(store.get<any>('profile',created.id).seed,created.seed);
 await handlers['profile.delete']({id:created.id});const removed=store.recycled().find(r=>r.profile.id===created.id)!;await handlers['recycle.purge']({id:removed.id});assert.equal(store.recycled().some(r=>r.id===removed.id),false);await handlers['profile.delete']({id:peer.id});await handlers['recycle.purge']({id:store.recycled().find(r=>r.profile.id===peer.id)!.id});
 return [{name:'新环境默认粘贴代理、自动/手动测试、空启动网址',passed:true},{name:'国家/IP和平台列、独立代理编辑、全选批量删除及回收恢复/彻底删除',passed:true},{name:'共用代理独立编辑另存，保留其他环境路由和固定种子',passed:true}];
}
