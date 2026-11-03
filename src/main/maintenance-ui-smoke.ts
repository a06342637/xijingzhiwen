import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {BrowserWindow} from 'electron';
import {Store} from './store';
export async function maintenanceUiSmoke(window:BrowserWindow,store:Store,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const js=(code:string)=>window.webContents.executeJavaScript(code),wait=()=>js('new Promise(r=>setTimeout(r,250))');
 await js(`Array.from(document.querySelectorAll('.nav-item')).find(e=>e.textContent.includes('内核管理')).click()`);await wait();
 // Stub only kernel.install in the renderer test. No downloads or product API
 // are altered; unresolved calls model simultaneous in-flight downloads.
 const original=handlers['kernel.install'],installs:any[]=[],finish:Array<(v:any)=>void>=[];handlers['kernel.install']=payload=>new Promise(resolve=>{installs.push(payload);finish.push(resolve);});
 try{
  await js(`document.querySelector('.download-form .primary').click()`);await wait();assert.equal(installs.length,1);assert.equal(await js("document.querySelector('.download-form .primary').disabled"),true);
  await js(`(()=>{const select=document.querySelectorAll('.download-form select')[2];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,select.value==='arm64'?'x64':'arm64');select.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait();assert.equal(await js("document.querySelector('.download-form .primary').disabled"),false);
  await js(`document.querySelector('.download-form .primary').click()`);await wait();assert.equal(installs.length,2);assert.notEqual(installs[0].arch,installs[1].arch);await fs.writeFile(path.join(output,'parallel-kernel-download.png'),(await window.webContents.capturePage()).toPNG());
 }finally{finish.forEach(resolve=>resolve({test:true}));handlers['kernel.install']=original;await wait();}
 await js(`Array.from(document.querySelectorAll('.nav-item')).find(e=>e.textContent.includes('软件设置')).click()`);await wait();
 for(const value of [false,true]){await js(`new Promise((resolve,reject)=>{const started=Date.now();async function check(){const input=document.querySelector('.diagnostic-links-preference input'),state=await window.qijing.invoke('state');if(!input.disabled&&input.checked===state.settings.diagnosticLinks)return resolve();if(Date.now()-started>15000)return reject(new Error('Setting still saving'));setTimeout(check,50);}check();})`);await js(`document.querySelector('.diagnostic-links-preference input').click()`);await js(`new Promise((resolve,reject)=>{const started=Date.now();async function check(){const input=document.querySelector('.diagnostic-links-preference input'),state=await window.qijing.invoke('state');if(!input.disabled&&input.checked===${value}&&state.settings.diagnosticLinks===${value})return resolve();if(Date.now()-started>15000)return reject(new Error('Diagnostic setting did not refresh'));setTimeout(check,50);}check();})`);assert.equal(store.settings().diagnosticLinks,value);}
 await js(`Array.from(document.querySelectorAll('.nav-item')).find(e=>e.textContent.includes('诊断中心')).click()`);await wait();assert.ok((await js('document.body.innerText')).includes('未验证：尚无当前条件下的完整通过记录'));assert.ok((await js('document.querySelector(".badge.limited").title')).includes('限制'));await fs.writeFile(path.join(output,'status-explanations.png'),(await window.webContents.capturePage()).toPNG());
 return [{name:'不同架构内核下载可同时提交，相同下载防重复',passed:true},{name:'手动检测图标开关持久化与状态解释',passed:true}];
}
