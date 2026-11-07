import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import type {Store} from './store';
import type {Browsers} from './browsers';
import type {Kernels} from './kernels';
import type {Profile} from '../shared/model';
import {WindowLayouts} from './window-layout';
export async function performanceSmoke(store:Store,browsers:Browsers,kernels:Kernels,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const settings=store.settings(),profiles:Profile[]=[],measurements:any[]=[];
 const measure=async(label:string,operation:()=>Promise<unknown>)=>{const start=performance.now();const result=await operation();const ms=Math.round(performance.now()-start);measurements.push({label,ms});await fs.writeFile(path.join(output,'performance.json'),JSON.stringify(measurements,null,2));return result;};
 try{
  store.put('settings','app',{...settings,startupDashboard:false,randomBookmarks:true});
  for(const engine of ['chromium','firefox']){
   const kernel=store.kernels().find(k=>(k.engine||'chromium')===engine&&k.arch===process.arch)||store.kernels().find(k=>(k.engine||'chromium')===engine);assert.ok(kernel,'Prepare isolated '+engine+' kernel');
   await measure(engine+' verify first',()=>kernels.verify(kernel.id));await measure(engine+' verify repeat',()=>kernels.verify(kernel.id));
   const p=await handlers['profile.new']({}) as Profile;p.name='性能隔离 '+engine;p.kernelId=kernel.id;p.values={...p.values,engine,brand:engine==='firefox'?'Firefox':'Chrome',geoip:false};p.extensionIds=[];store.put('profile',p.id,p);profiles.push(p);
   await measure(engine+' start first',()=>browsers.start(p.id,true));assert.equal(browsers.running()[p.id],'running');await browsers.stop(p.id);
   await measure(engine+' start repeat',()=>browsers.start(p.id,true));assert.equal(browsers.running()[p.id],'running');
  }
  const layouts=new WindowLayouts(store,browsers,path.resolve('resources/window-layout.ps1'));
  const inventory=await measure('inventory first',()=>layouts.inventory()) as Awaited<ReturnType<WindowLayouts['inventory']>>;
  assert.equal(inventory.windows.filter(w=>profiles.some(p=>p.id===w.profileId)).length,2);
  await measure('inventory repeat',()=>layouts.inventory());
  const args={ids:profiles.map(p=>p.id),monitorId:inventory.currentMonitor,mode:'columns',columns:0,gap:0};
  for(let i=0;i<2;i++){const arranged=await measure('arrange '+(i+1),()=>layouts.apply(args)) as any;assert.ok(arranged.results.every((r:any)=>r.ok));}
  return [{name:'Chromium/Firefox首次与重复启动、校验、窗口读取和平铺耗时实测',passed:true,measurements}];
 }finally{for(const p of profiles){await browsers.stop(p.id);await store.deleteProfilePermanently(p.id);}store.put('settings','app',settings);}
}
