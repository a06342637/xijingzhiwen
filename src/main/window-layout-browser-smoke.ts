import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {Store} from './store';
import type {Browsers} from './browsers';
import type {Profile} from '../shared/model';
import {defaultValues} from '../shared/model';
import {WindowLayouts} from './window-layout';
export async function windowLayoutBrowserSmoke(store:Store,browsers:Browsers,output:string,handlers:Record<string,(p:any)=>Promise<any>>){
 const settings=store.settings(),created:Profile[]=[];const layouts=new WindowLayouts(store,browsers,path.resolve('resources/window-layout.ps1'));try{for(const engine of ['chromium','firefox','chromium']){store.put('settings','app',{...settings,randomBookmarks:false,startupDashboard:false,fingerprintDefaults:{...defaultValues(),engine,brand:engine==='firefox'?'Firefox':'Chrome'}});const p=await handlers['profile.new']({}) as Profile;p.name='窗口平铺实测 '+engine;store.put('profile',p.id,p);created.push(p);await browsers.start(p.id,true);}
 const inventory=await layouts.inventory();assert.equal(inventory.windows.filter(w=>created.some(p=>p.id===w.profileId)).length,3);const untouched=inventory.windows.find(w=>w.profileId===created[2].id)!;const result=await layouts.apply({ids:created.slice(0,2).map(p=>p.id),monitorId:inventory.currentMonitor,mode:'columns',columns:0,gap:0});assert.equal(result.results.length,2);assert.ok(result.results.every((r:any)=>r.ok&&!r.warning));const after=await layouts.inventory();assert.deepEqual(after.windows.find(w=>w.profileId===untouched.profileId)?.bounds,untouched.bounds);await browsers.stop(created[0].id);const skipped=await layouts.apply({ids:created.slice(0,2).map(p=>p.id),monitorId:inventory.currentMonitor,mode:'auto',columns:0,gap:0});assert.deepEqual(skipped.skipped,[created[0].id]);await fs.writeFile(path.join(output,'native-window-layout.json'),JSON.stringify({inventory,result,after,skipped},null,2));return [{name:'真实Chromium/Firefox按选中环境左右平铺，未选窗口不动、已关闭窗口跳过',passed:true}];
 }finally{for(const p of created){await browsers.stop(p.id);await store.deleteProfile(p.id);await store.purgeEnvironment(store.recycled().find(r=>r.profile.id===p.id)!.id);}store.put('settings','app',settings);}
}
