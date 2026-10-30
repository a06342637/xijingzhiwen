import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import type {BrowserWindow} from 'electron';
import type {AppState,Profile} from '../shared/model';
import {defaultValues} from '../shared/model';

export async function featureSmoke(window:BrowserWindow,output:string){
 const js=async<T=any,>(code:string):Promise<T>=>{const result=await window.webContents.executeJavaScript(`(async()=>{try{return {value:await (${code})};}catch(e){return {error:e.stack||String(e)};}})()`);if(result.error)throw new Error(result.error);return result.value;};
 const wait=()=>js('new Promise(resolve=>setTimeout(resolve,250))');
 const click=async(text:string,selector='button')=>{await js(`(()=>{const b=Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(x=>${selector==='.nav-item'?`x.textContent.trim().startsWith(${JSON.stringify(text)})`:`x.textContent.trim()===${JSON.stringify(text)}`});if(!b)throw new Error('Missing button: '+${JSON.stringify(text)});b.click();})()`);await wait();};
 const fill=async(selector:string,value:string)=>{await js(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error('Missing input');Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await wait();};
 const screenshot=async(name:string)=>fs.writeFile(path.join(output,name),(await window.webContents.capturePage()).toPNG());
 const before=await js<AppState>("window.qijing.invoke('state')");
 await click('软件设置','.nav-item');
 await click('语言 / 时区','.advanced-nav button');
 await fill('#setting-locale','ja-JP');await fill('#setting-timezone','Asia/Tokyo');
 await click('实验设置','.defaults-panel .editor-tabs button');await js("(()=>{const input=document.querySelector('#setting-fakeShadowRoot');if(!input.checked)input.click();})()");await wait();await screenshot('settings-experimental.png');
 await click('保存默认指纹');
 let state=await js<AppState>("window.qijing.invoke('state')");assert.equal(state.settings.fingerprintDefaults.locale,'ja-JP');assert.equal(state.settings.fingerprintDefaults.fakeShadowRoot,true);
 await click('高级配置','.defaults-panel .editor-tabs button');await click('语言 / 时区','.advanced-nav button');await screenshot('settings-defaults.png');
 await click('浏览器环境','.nav-item');await click('新建环境','.page-header button');
 await click('高级配置','.modal .editor-tabs button');await click('语言 / 时区','.modal .advanced-nav button');assert.equal(await js("document.querySelector('#setting-locale').value"),'ja-JP');
 await click('实验设置','.modal .editor-tabs button');assert.equal(await js("document.querySelector('#setting-fakeShadowRoot').checked"),true);
 await click('基础设置','.modal .editor-tabs button');
 await fill('.modal input[placeholder="例如：美国店铺 A"]','批量随机验收');await fill('.batch-controls input[type=number]','3');await js("document.querySelector('.batch-random input').click()");
 await fill('[aria-label="代理来源"]','manual');
 await js(`(()=>{const el=document.querySelector('.proxy-paste textarea');const data=new DataTransfer();data.setData('text','gate.example.test:1000:sample-account:sample-secret-JP');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true}));})()`);await wait();
 assert.equal(await js("Array.from(document.querySelectorAll('.inline-proxy input')).find(x=>x.value==='gate.example.test')?.value"),'gate.example.test');
 assert.equal(await js("document.querySelector('.inline-proxy input[type=password]').value"),'sample-secret-JP');
 await click('随机指纹');await screenshot('batch-random-proxy.png');
 await click('创建 3 个环境');
 for(let i=0;i<20;i++){state=await js<AppState>("window.qijing.invoke('state')");if(state.profiles.filter(p=>p.name.startsWith('批量随机验收 ')).length===3)break;await wait();}
 const created=state.profiles.filter(p=>p.name.startsWith('批量随机验收 '));assert.equal(created.length,3);assert.equal(new Set(created.map(p=>p.seed)).size,3);assert.equal(new Set(created.map(p=>JSON.stringify(p.values))).size,3);assert.ok(created.every(p=>p.proxyId&&p.values.locale==='ja-JP'&&p.values.fakeShadowRoot===true));assert.equal(state.proxies.find(p=>p.id===created[0].proxyId)?.hasPassword,true);assert.equal(state.proxies.find(p=>p.id===created[0].proxyId)?.password,undefined);
 await screenshot('batch-created.png');
 // Keep smoke fixtures isolated and restore defaults for the existing browser checks.
 for(const p of created){const clean={...p,proxyId:'',values:defaultValues()};await js(`window.qijing.invoke('profile.save',${JSON.stringify(clean)})`);}
 await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:before.settings.fingerprintDefaults})})`);
 return [{name:'设置高级及实验预设保存 / 新建继承',passed:true},{name:'真实粘贴事件解析代理 / Windows 加密保存',passed:true},{name:'一键随机 / UI 批量创建三个独立环境',passed:true}];
}
