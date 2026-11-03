import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {BrowserWindow} from 'electron';
import type {Profile,Values} from '../shared/model';
import {defaultValues} from '../shared/model';
import {selectHardware} from '../shared/hardware';
import {Store} from './store';

export async function fingerprintPresetsSmoke(window:BrowserWindow,store:Store,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const original=store.settings(),before=new Set(store.profiles().map(p=>p.id));
 const js=(s:string)=>window.webContents.executeJavaScript(`(async()=>{return await (${s});})()`);
 const until=(s:string)=>js(`new Promise((resolve,reject)=>{const start=Date.now();function check(){if(${s})return resolve();if(Date.now()-start>15000)return reject(new Error('Preset UI timeout: '+${JSON.stringify(s)}));setTimeout(check,50);}check();})`);
 try{
  await handlers['settings.save']({fingerprintDefaults:defaultValues(),fingerprintLocks:[]});
  await js(`Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('软件设置')).click()`);await until(`Boolean(document.querySelector('.defaults-panel #setting-userAgent'))`);
  await js(`Array.from(document.querySelectorAll('.defaults-panel .advanced-nav button')).find(b=>b.textContent.includes('语言 / 时区')).click()`);
  await js(`(()=>{const input=document.querySelector('.defaults-panel #setting-timezone');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Asia/Shanghai');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await until(`document.querySelector('[aria-label="时区随机时保留"]').checked`);await js(`document.querySelector('.defaults-panel .primary').click()`);await until(`document.querySelector('.defaults-panel').innerText.includes('默认指纹已保存')`);assert.equal(store.settings().fingerprintDefaults.timezone,'Asia/Shanghai');assert.ok(store.settings().fingerprintLocks?.includes('timezone'));
  await fs.writeFile(path.join(output,'preset-lock-settings.png'),(await window.webContents.capturePage()).toPNG());
  const values:Values={...selectHardware(defaultValues(),{gpu:'rtx-3070'}),timezone:'Asia/Shanghai'};
  await handlers['settings.save']({fingerprintDefaults:values,fingerprintLocks:['gpuModel','timezone']});
  await js(`Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()`);await until(`Boolean(document.querySelector('.page-header .primary'))`);await js(`document.querySelector('.page-header .primary').click()`);await until(`Boolean(document.querySelector('.random-toolbar button'))`);
  await js(`document.querySelector('.random-toolbar button').click()`);await until(`!document.querySelector('.editor-fields').disabled&&document.querySelector('.modal input[required][maxlength="80"]').value!==''`);
  await js(`document.querySelector('.modal form').requestSubmit()`);await until(`!document.querySelector('.modal')`);
  const single=store.profiles().find(p=>!before.has(p.id))!;assert.equal(single.values.gpuModel,'rtx-3070');assert.equal(single.values.gpuRenderer,values.gpuRenderer);assert.equal(single.values.timezone,'Asia/Shanghai');
  const draft=await handlers['profile.new']({}) as Profile;draft.name='固定预设批量验收';const result=await handlers['profile.create']({profile:draft,count:5,randomize:true});assert.equal(result.profiles.length,5);assert.ok(result.profiles.every((p:Profile)=>p.values.gpuModel==='rtx-3070'&&p.values.timezone==='Asia/Shanghai'));assert.equal(new Set(result.profiles.map((p:Profile)=>p.seed)).size,5);
  return [{name:'设置修改自动固定、实际随机按钮保留3070/东八区、IPC批量保留及独立种子',passed:true}];
 }finally{if(await js(`Boolean(document.querySelector('.modal'))`))await js(`document.querySelector('[aria-label="关闭对话框"]').click()`);for(const p of store.profiles().filter(p=>!before.has(p.id))){await store.deleteProfile(p.id);await store.purgeEnvironment(store.recycled().find(r=>r.profile.id===p.id)!.id);}store.put('settings','app',original);}
}
