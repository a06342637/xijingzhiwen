import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {BrowserWindow} from 'electron';
import type {Browsers} from './browsers';
import type {Store} from './store';
import type {Profile} from '../shared/model';
export async function startTileSmoke(window:BrowserWindow,store:Store,browsers:Browsers,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const settings=store.settings(),profiles:Profile[]=[],events:string[]=[],js=(s:string)=>window.webContents.executeJavaScript(s);
 const until=(c:string)=>js("new Promise((r,j)=>{const start=Date.now();function check(){if("+c+")return r();if(Date.now()-start>20000)return j(new Error('start tile UI timeout'));setTimeout(check,60);}check();})");
 try{
  store.put('settings','app',{...settings,maxBrowsers:6,startupDashboard:false,randomBookmarks:false});
  for(const [i,engine] of ['firefox','firefox','firefox','firefox','chromium'].entries()){
   const p=await handlers['profile.new']({}) as Profile;p.name='先启动后平铺 '+(i+1);p.values={...p.values,engine,brand:engine==='firefox'?'Firefox':'Chrome',viewportMode:'fixed',viewportWidth:1440,viewportHeight:900,screenWidth:3024,screenHeight:1964,deviceScale:'2',geoip:false};p.extensionIds=[];p.kernelId=store.kernels().find(k=>(k.engine||'chromium')===engine&&k.arch===process.arch)?.id||store.kernels().find(k=>(k.engine||'chromium')===engine)!.id;store.put('profile',p.id,p);profiles.push(p);
  }
  const start=Date.now();const result=await handlers['profile.startAndTile']({ids:profiles.slice(0,4).map(p=>p.id)});const elapsed=Date.now()-start;await fs.writeFile(path.join(output,'start-tile-progress.json'),JSON.stringify({elapsed,result},null,2));assert.ok(result.results.every((r:any)=>r.ok),JSON.stringify(result));assert.ok(result.layout?.results.every((r:any)=>r.ok&&!r.warning),JSON.stringify(result));assert.deepEqual(result.layout.fixedViewport,[]);
  for(const p of profiles.slice(0,4)){const observation=await browsers.layoutSmoke(p.id,path.join(output,p.id+'.png'));assert.ok(observation.width<1440&&observation.height>400,JSON.stringify(observation));assert.equal(store.get<Profile>('profile',p.id).values.viewportMode,'fixed');events.push(p.name+': '+observation.width+'x'+observation.height);}
  await browsers.start(profiles[4].id,true);const inventory=await handlers['windows.inventory']({});const layout=await handlers['windows.arrange']({ids:profiles.filter((_,i)=>i===0||i===4).map(p=>p.id),monitorId:inventory.currentMonitor,mode:'rows',columns:0,gap:0});assert.ok(layout.results.every((r:any)=>r.ok),JSON.stringify(layout));
  for(const p of [profiles[0],profiles[4]]){const observation=await browsers.layoutSmoke(p.id,path.join(output,p.id+'-rows.png'));assert.ok(observation.height<900,JSON.stringify(observation));}
  // Clicking selection toolbar calls the combined workflow once.
  const original=handlers['profile.startAndTile'];const calls:any[]=[];handlers['profile.startAndTile']=async raw=>{calls.push(raw);return {results:raw.ids.map((id:string)=>({id,ok:true})),layout:{results:raw.ids.map((id:string)=>({id,ok:true}))}};};try{
   await js("window.qijing.invoke('settings.save',{})");await js("Array.from(document.querySelectorAll('.nav-item')).find(b=>b.textContent.includes('浏览器环境')).click()");await until("Boolean(document.querySelector('[aria-label=\"全选当前环境\"]'))");await js("document.querySelector('[aria-label=\"全选当前环境\"]').click()");await until("Boolean(document.querySelector('[aria-label=\"平铺并启动\"]'))");await js("document.querySelector('[aria-label=\"平铺并启动\"]').click()");await until("!document.querySelector('[aria-label=\"平铺并启动\"]').disabled");assert.equal(calls.length,1);await fs.writeFile(path.join(output,'start-tile-button.png'),(await window.webContents.capturePage()).toPNG());
  }finally{handlers['profile.startAndTile']=original;}
  await fs.writeFile(path.join(output,'start-tile.json'),JSON.stringify({elapsed,events,result,layout},null,2));return [{name:'四个Firefox批量启动后自动平铺、固定视口随窗口与两引擎上下再平铺、入口按钮',passed:true,elapsed}];
 }finally{for(const p of profiles){await browsers.stop(p.id);await store.deleteProfilePermanently(p.id);}store.put('settings','app',settings);}
}
