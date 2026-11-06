import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import type {BrowserWindow} from 'electron';
import type {Store} from './store';
export async function proxyBatchSmoke(window:BrowserWindow,store:Store,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const js=(s:string)=>window.webContents.executeJavaScript(s),until=(c:string)=>js("new Promise((resolve,reject)=>{const start=Date.now();function check(){if("+c+")return resolve();if(Date.now()-start>15000)return reject(new Error('proxy batch UI timed out'));setTimeout(check,60);}check();})");
 const before=new Set(store.profiles().map(p=>p.id)),original=handlers['proxy.testDraft'];let tests=0;handlers['proxy.testDraft']=async p=>{tests++;return {proxyId:p.id,country:'JP',exitIp:'192.0.2.1',timezone:'Asia/Tokyo',testedAt:new Date().toISOString(),routeStable:true};};
 try{for(const [count,lines,expected] of [[3,['one.test:1000:u:p','two.test:2000:u:p'],['one.test','two.test','two.test']],[1,['one.test:1000:u:p','two.test:2000:u:p'],['one.test']],[3,['one.test:1000:u:p'],['one.test','one.test','one.test']]] as [number,string[],string[]][]){
  await js("Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()");await until("Boolean(document.querySelector('.page-header .primary'))");await js("document.querySelector('.page-header .primary').click()");await until("Boolean(document.querySelector('[aria-label=\"整条代理信息\"]'))");const start=new Set(store.profiles().map(p=>p.id));
  await js("(()=>{const input=document.querySelector('[aria-label=\"整条代理信息\"]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,"+JSON.stringify(lines.join('\n'))+");input.dispatchEvent(new Event('input',{bubbles:true}));const count=document.querySelector('.batch-controls input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(count,"+JSON.stringify(String(count))+");count.dispatchEvent(new Event('input',{bubbles:true}));})()");await js('new Promise(r=>setTimeout(r,900))');assert.equal(tests,0);assert.equal(await js("document.querySelector('[aria-label=\"整条代理信息\"]').rows"),3);
  await js("document.querySelector('.random-toolbar button').click()");await until("!document.querySelector('.editor-fields').disabled");await js('new Promise(r=>setTimeout(r,250))');await js("document.querySelector('.modal form').requestSubmit()");await until("!document.querySelector('.modal')");
  const batch=store.profiles().filter(p=>!start.has(p.id)).reverse();assert.equal(batch.length,count);assert.deepEqual(await Promise.all(batch.map(async p=>(await store.proxy(p.proxyId)).host)),expected);for(let i=0;i<batch.length;i++)assert.equal((await store.proxyForEdit(batch[i].proxyId)).originalText,lines[Math.min(i,lines.length-1)]);
  if(count===3&&lines.length===2){await js("document.querySelector('[aria-label=\"编辑代理 "+batch[0].name+"\"]').click()");await until("Boolean(document.querySelector('.modal'))");assert.equal(await js("document.querySelector('[aria-label=\"整条代理信息\"]').value"),lines[0]);await js('new Promise(r=>setTimeout(r,400))');await fs.writeFile(path.join(output,'proxy-original-editor.png'),(await window.webContents.capturePage()).toPNG());await js("document.querySelector('[aria-label=\"关闭对话框\"]').click()");}
 }
 return [{name:'多行代理按顺序绑定、代理不足复用最后一行、单环境只取第一行、三行高度、粘贴不检测与编辑原文',passed:true}];
 }finally{handlers['proxy.testDraft']=original;for(const p of store.profiles().filter(p=>!before.has(p.id)))await handlers['profile.delete']({id:p.id});}
}
