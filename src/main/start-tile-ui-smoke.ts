import assert from 'node:assert/strict';
import type {BrowserWindow} from 'electron';
export async function startTileUiSmoke(window:BrowserWindow,handlers:Record<string,(p:any)=>Promise<any>>){
 const js=(s:string)=>window.webContents.executeJavaScript(s),until=(c:string)=>js("new Promise((r,j)=>{const start=Date.now();function check(){if("+c+")return r();if(Date.now()-start>15000)return j(new Error('start tile toolbar timeout'));setTimeout(check,60);}check();})");
 const original=handlers['profile.startAndTile'];const calls:any[]=[];let resolve!:(r:any)=>void;
 handlers['profile.startAndTile']=async p=>{calls.push(p);return new Promise(r=>{resolve=r;});};
 try{
  await js("Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()");await until("Boolean(document.querySelector('[aria-label=\"全选当前环境\"]'))");
  await js("if(!document.querySelector('[aria-label=\"全选当前环境\"]').checked)document.querySelector('[aria-label=\"全选当前环境\"]').click()");await until("Boolean(document.querySelector('[aria-label=\"平铺并启动\"]'))");
  await js("document.querySelector('[aria-label=\"平铺并启动\"]').click()");await until("document.querySelector('[aria-label=\"平铺并启动\"]').disabled");assert.equal(calls.length,1);assert.ok(calls[0].ids.length>0);await js("document.querySelector('[aria-label=\"平铺并启动\"]').click()");assert.equal(calls.length,1);
  resolve({results:calls[0].ids.map((id:string)=>({id,ok:true})),layout:{results:calls[0].ids.map((id:string)=>({id,ok:true}))}});await until("!document.querySelector('[aria-label=\"平铺并启动\"]').disabled");await js("document.querySelector('[aria-label=\"全选当前环境\"]').click()");
  return [{name:'批量栏平铺并启动入口、选中ID、执行中禁用及完成反馈',passed:true}];
 }finally{if(resolve)resolve({results:[],layout:null});handlers['profile.startAndTile']=original;}
}
