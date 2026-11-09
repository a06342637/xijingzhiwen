import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {BrowserWindow} from 'electron';
import type {Store} from './store';
export async function proxyLibrarySmoke(window:BrowserWindow,store:Store,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const manual={id:randomUUID(),name:'手动代理库验收',protocol:'http',host:'manual.test',port:1000,username:'',password:'',bypass:''},environment={...manual,id:randomUUID(),name:'环境内代理隐藏验收',host:'environment.test'};
 const js=(s:string)=>window.webContents.executeJavaScript(s),until=(c:string)=>js("new Promise((r,j)=>{const start=Date.now();function check(){if("+c+")return r();if(Date.now()-start>15000)return j(new Error('proxy library UI timeout'));setTimeout(check,60);}check();})");
 try{await handlers['proxy.save'](manual);await handlers['proxy.saveEnvironment'](environment);await js("window.qijing.invoke('settings.save',{})");await js("Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('代理管理')).click()");await until("document.body.innerText.includes('手动代理库验收')");assert.equal(await js("document.body.innerText.includes('环境内代理隐藏验收')"),false);assert.ok(store.proxies().some(p=>p.id===environment.id));await js("new Promise(r=>setTimeout(r,200))");await fs.writeFile(path.join(output,'proxy-library-only.png'),(await window.webContents.capturePage()).toPNG());return [{name:'代理管理只显示手动代理库、环境代理仍可使用且不展示',passed:true}];}
 finally{store.remove('proxy',manual.id);store.remove('proxy',environment.id);}
}
