import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {BrowserWindow} from 'electron';
import {Store} from './store';
import {newProfile} from '../shared/model';
import {randomUUID} from 'node:crypto';
export async function profileTimesSmoke(window:BrowserWindow,store:Store,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 window.showInactive();const settings=store.settings();const js=(s:string)=>window.webContents.executeJavaScript(s);const until=(condition:string)=>js(`new Promise((r,j)=>{let n=0;function check(){if(${condition})return r();if(n++>200)return j(new Error('profile time UI timeout'));setTimeout(check,50);}check();})`);
 const p=newProfile(randomUUID(),'123');p.name='时间列验收';p.createdAt='2026-11-01T01:02:03.000Z';store.put('profile',p.id,p);
 try{
  await js(`Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()`);await handlers['settings.save']({view:'list'});await js(`window.qijing.invoke('settings.save',{view:'list'})`);await until(`Boolean(document.querySelector('.profile-table'))`);
  const row=`Array.from(document.querySelectorAll('.profile-table tbody tr')).find(r=>r.textContent.includes('时间列验收'))`;
  assert.deepEqual(await js(`Array.from(document.querySelectorAll('.profile-table th')).slice(4).map(e=>e.textContent)`),['状态','创建时间','启动时间','操作']);assert.equal(await js(`${row}.children[6].textContent`),'从未');assert.equal(await js(`${row}.children[5].querySelector('time').dateTime`),p.createdAt);
  const last='2026-11-03T04:05:06.000Z';store.recordProfileStart(p.id,last);await js(`window.qijing.invoke('settings.save',{view:'list'})`);await until(`${row}.children[6].querySelector('time')?.dateTime==='${last}'`);
  // A stale editor submission must not erase recorded timestamps.
  const saved=await handlers['profile.save']({...p,createdAt:'2000-01-01T00:00:00.000Z'});assert.equal(saved.createdAt,p.createdAt);assert.equal(saved.lastStartedAt,last);
  await js(`new Promise(r=>setTimeout(r,300))`);await fs.writeFile(path.join(output,'profile-times-wide.png'),(await window.webContents.capturePage()).toPNG());const size=window.getSize();window.setSize(860,size[1]);await js(`new Promise(r=>setTimeout(r,350))`);await fs.writeFile(path.join(output,'profile-times-small.png'),(await window.webContents.capturePage()).toPNG());window.setSize(size[0],size[1]);
  return [{name:'状态后创建/启动时间列、从未、精确时间及过期编辑保护',passed:true}];
 }finally{store.remove('profile',p.id);store.put('settings','app',settings);}
}
