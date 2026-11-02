import assert from 'node:assert/strict';
import type {BrowserWindow} from 'electron';
export async function verifyReliabilityUI(window:BrowserWindow){
 const js=(s:string)=>window.webContents.executeJavaScript(s),wait=()=>js('new Promise(resolve=>setTimeout(resolve,200))');
 await js(`Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('软件设置')).click()`);await wait();
 await js(`Array.from(document.querySelectorAll('.defaults-panel button')).find(b=>b.textContent==='恢复初始值').click()`);await wait();
 await js(`Array.from(document.querySelectorAll('.defaults-panel button')).find(b=>b.textContent==='保存默认指纹').click()`);
 assert.equal(await js(`document.querySelector('.defaults-panel fieldset').disabled`),true);
 assert.equal(await js(`document.querySelector('#setting-platform').matches(':disabled')`),true);
 await js(`new Promise((resolve,reject)=>{const start=Date.now();function check(){if(!document.querySelector('.defaults-panel fieldset').disabled)return resolve();if(Date.now()-start>10000)return reject(new Error('Defaults save not completed'));setTimeout(check,50);}check();})`);
 assert.ok(await js(`document.querySelector('.defaults-panel').innerText.includes('默认指纹已保存')`));
 await js(`Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()`);await wait();
 return [{name:'默认预设保存期间全部编辑锁定 / 保存完成恢复并显示成功',passed:true}];
}
