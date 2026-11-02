import assert from 'node:assert/strict';
import type {BrowserWindow} from 'electron';
import {defaultValues} from '../shared/model';
import {Store} from './store';
export async function verifyDeepUI(window:BrowserWindow,store:Store){
 const original=store.settings(),js=(s:string)=>window.webContents.executeJavaScript(s),wait=()=>js('new Promise(resolve=>setTimeout(resolve,250))');
 const click=async(text:string,selector='button')=>{await js(`Array.from(document.querySelectorAll(${JSON.stringify(selector)})).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);await wait();};
 const select=async(label:string,value:string)=>{await js(`(()=>{const s=document.querySelector('[aria-label="${label}"]')||Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent===${JSON.stringify(label)})?.querySelector('select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(value)});s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait();};
 try{
  await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:defaultValues()})})`);await click('新建环境','.page-header button');await click('高级配置','.modal .editor-tabs button');await click('WebGL / Canvas','.modal .advanced-nav button');
  await js(`document.querySelector('#setting-noise').click()`);await wait();
  await js(`Array.from(document.querySelectorAll('.random-toolbar button')).find(b=>b.textContent.includes('随机指纹')).click()`);
  const disabled=await js(`document.querySelector('.editor-fields').disabled`);assert.equal(disabled,true);await js('new Promise(resolve=>setTimeout(resolve,700))');
  assert.equal(await js(`document.querySelector('#setting-noise').checked`),false);assert.equal(await js(`document.querySelector('#setting-pixelNoise').value`),'native');await js(`document.querySelector('[aria-label="关闭对话框"]').click()`);await wait();
  const firefox={...defaultValues(),engine:'firefox',brand:'Firefox'};await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:firefox})})`);await click('新建环境','.page-header button');await select('浏览器引擎','chromium');await select('配置模式','measured');await select('配置模式','custom');
  assert.equal(await js(`document.querySelector('[aria-label="浏览器引擎"]').value`),'firefox');
  const selectedKernel=await js(`Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent==='浏览器内核').querySelector('select').value`);
  const expected=store.kernels().find(k=>k.engine==='firefox')?.id||'';assert.equal(selectedKernel,expected);
  await js(`document.querySelector('[aria-label="关闭对话框"]').click()`);return [{name:'随机期间编辑锁定 / 关闭扰动保持 / 普通实测模式切换重绑引擎',passed:true}];
 }finally{await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:original.fingerprintDefaults})})`);}
}
