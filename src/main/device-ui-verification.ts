import assert from 'node:assert/strict';
import type {BrowserWindow} from 'electron';
import {applyDevice} from '../shared/devices';
import {Store} from './store';
export async function verifyDeviceUI(window:BrowserWindow,store:Store){
 const original=store.settings();
 const js=(code:string)=>window.webContents.executeJavaScript(code);
 const wait=()=>js('new Promise(resolve=>setTimeout(resolve,250))');
 const select=async(label:string,value:string)=>{await js(`(()=>{const el=document.querySelector('[aria-label="${label}"]')||Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent===${JSON.stringify(label)})?.querySelector('select');if(!el)throw new Error('Missing field');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait();};
 try{
  const values=applyDevice(original.fingerprintDefaults,'iphone-15',true);await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:values})})`);
  await js(`document.querySelector('.page-header .button.primary').click()`);await wait();
  assert.equal(await js(`Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent==='屏幕方向').querySelector('select').value`),'landscape');
  assert.equal(await js(`Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent==='移动设备尺寸预设').querySelector('select').value`),'iphone-15');
  await select('系统 / 设备环境','android');
  assert.equal(await js(`Array.from(document.querySelectorAll('.modal .field')).find(f=>f.querySelector('span')?.textContent==='屏幕方向').querySelector('select').value`),'landscape');
  await select('浏览器引擎','firefox');
  await js(`Array.from(document.querySelectorAll('.modal .editor-tabs button')).find(b=>b.textContent==='高级配置').click()`);await wait();
  await js(`Array.from(document.querySelectorAll('.modal .advanced-nav button')).find(b=>b.textContent.includes('字体')).click()`);await wait();
  assert.equal(await js(`document.querySelector('[aria-label="选择字体目录"]').disabled`),true);
  await js(`document.querySelector('[aria-label="关闭对话框"]').click()`);
  return [{name:'横屏预设新建显示 / 类型切换保留方向 / 火狐禁用目录按钮',passed:true}];
 }finally{await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:original.fingerprintDefaults})})`);}
}
