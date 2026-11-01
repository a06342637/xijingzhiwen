import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {newProfile} from '../shared/model';
import {applyDevice} from '../shared/devices';
import {Store} from './store';
import {Kernels} from './kernels';
import {Browsers} from './browsers';
export async function verifyDevices(store:Store,kernels:Kernels,browsers:Browsers,output:string){
 const results:any[]=[];const chromium=store.kernels().find(k=>!k.engine&&k.arch===process.arch)||store.kernels().find(k=>k.engine!=='firefox');if(!chromium)throw new Error('设备验证需要 Chromium 内核');
 for(const platform of ['windows','macos','linux']){
  const p=newProfile(randomUUID(),'1111',chromium.id);p.name='Chromium 身份验收 '+platform;p.values.platform=platform;store.put('profile',p.id,p);
  try{const report=await browsers.diagnose(p.id);const o=(report.observations as any).observation;assert.equal(o.identity.ch.platform,({windows:'Windows',macos:'macOS',linux:'Linux'} as any)[platform]);assert.ok(o.identity.ua.includes('Chrome/'));results.push({name:p.name,passed:true,observation:o});}finally{await browsers.stop(p.id);store.remove('profile',p.id);}
 }
 for(const id of ['iphone-15','ipad-air','pixel']){
  const p=newProfile(randomUUID(),'1111',chromium.id);p.name='布局验收 '+id;p.values=applyDevice(p.values,id);store.put('profile',p.id,p);
  try{const report=await browsers.diagnose(p.id);const o=(report.observations as any).observation;assert.equal(o.screen.width,p.values.screenWidth);assert.equal(o.screen.height,p.values.screenHeight);assert.equal(o.screen.dpr,Number(p.values.deviceScale));assert.equal(o.screen.touch,5);assert.equal(o.screen.innerWidth,p.values.viewportWidth);assert.equal(o.screen.innerHeight,p.values.viewportHeight);assert.equal(o.preferences['(pointer: coarse)'],true);assert.equal(o.preferences['(hover: hover)'],false);results.push({name:p.name,passed:true,observation:o});}finally{await browsers.stop(p.id);store.remove('profile',p.id);}
 }
 const firefox=store.kernels().find(k=>k.engine==='firefox')||await kernels.installFirefox();
 for(const platform of ['windows','macos','linux']){
  const p=newProfile(randomUUID(),'1111',firefox.id);p.name='火狐身份验收 '+platform;Object.assign(p.values,{engine:'firefox',brand:'Firefox',platform,locale:'zh-CN',timezone:'Asia/Shanghai'});store.put('profile',p.id,p);
  try{const report=await browsers.diagnose(p.id);const o=(report.observations as any).observation;assert.ok(o.identity.ua.includes('Firefox/'));assert.equal(o.screen.width,1920);assert.equal(o.identity.timezone,'Asia/Shanghai');const before=o.identity.ua;assert.equal(browsers.isRunning(p.id),false);const again=await browsers.diagnose(p.id);assert.equal((again.observations as any).observation.identity.ua,before);results.push({name:p.name,passed:true,observation:o});}finally{await browsers.stop(p.id);store.remove('profile',p.id);}
 }
 await fs.writeFile(path.join(output,'devices-real.json'),JSON.stringify(results,null,2));return results.map(x=>({name:x.name,passed:x.passed}));
}
