import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {newProfile} from '../shared/model';
import {applyDevice,DEVICES,mobileMetrics} from '../shared/devices';
import {Store} from './store';
import {Kernels} from './kernels';
import {Browsers} from './browsers';
export async function verifyDevices(store:Store,kernels:Kernels,browsers:Browsers,output:string){
 const originalSettings=store.settings();store.put('settings','app',{...originalSettings,controlledFeatures:{...originalSettings.controlledFeatures,mobileLayout:true}});
 try{const results:any[]=[];const chromium=store.kernels().find(k=>!k.engine&&k.arch===process.arch)||store.kernels().find(k=>k.engine!=='firefox');if(!chromium)throw new Error('设备验证需要 Chromium 内核');
 for(const platform of ['windows','macos','linux']){
  const p=newProfile(randomUUID(),'1111',chromium.id);p.name='Chromium 身份验收 '+platform;p.values.platform=platform;store.put('profile',p.id,p);
  try{const report=await browsers.diagnose(p.id);const o=(report.observations as any).observation;assert.equal(o.identity.ch.platform,({windows:'Windows',macos:'macOS',linux:'Linux'} as any)[platform]);assert.ok(o.identity.ua.includes('Chrome/'));results.push({name:p.name,passed:true,observation:o});}finally{await browsers.stop(p.id);store.remove('profile',p.id);}
 }
 const matrix=process.env.QIJING_SMOKE_DEVICE_MATRIX==='1';
 for(const id of matrix?DEVICES.map(d=>d.id):['iphone-15','ipad-air','pixel'])for(const landscape of matrix?[false,true]:[false]){
  const p=newProfile(randomUUID(),'1111',chromium.id);p.name='布局验收 '+id+(landscape?' 横屏':' 竖屏');p.values=applyDevice(p.values,id,landscape);store.put('profile',p.id,p);
  try{const report=await browsers.diagnose(p.id);const o=(report.observations as any).observation,identity=mobileMetrics(p.values);assert.equal(o.screen.width,p.values.screenWidth);assert.equal(o.screen.height,p.values.screenHeight);assert.equal(o.screen.dpr,Number(p.values.deviceScale));assert.equal(o.screen.touch,5);assert.equal(o.screen.innerWidth,p.values.viewportWidth);assert.equal(o.screen.innerHeight,p.values.viewportHeight);assert.equal(o.screen.orientation.type,landscape?'landscape-primary':'portrait-primary');assert.equal(o.screen.orientation.angle,identity.screenOrientation.angle);assert.ok(o.identity.ua.includes('Chrome/'));assert.equal(o.identity.platform,'Win32');assert.equal(o.identity.ch.platform,'Windows');assert.equal(o.identity.ch.model,'');assert.equal(o.preferences['(pointer: coarse)'],true);assert.equal(o.preferences['(hover: hover)'],false);results.push({name:p.name,passed:true,observation:o});await fs.writeFile(path.join(output,'devices-real.json'),JSON.stringify(results,null,2));}finally{await browsers.stop(p.id);store.remove('profile',p.id);}
 }
 const firefox=store.kernels().find(k=>k.engine==='firefox')||await kernels.installFirefox();
 for(const platform of ['windows','macos','linux']){
  const p=newProfile(randomUUID(),'1111',firefox.id);p.name='火狐身份验收 '+platform;Object.assign(p.values,{engine:'firefox',brand:'Firefox',platform,locale:'zh-CN',timezone:'Asia/Shanghai'});store.put('profile',p.id,p);
  try{const report=await browsers.diagnose(p.id);const o=(report.observations as any).observation;assert.ok(o.identity.ua.includes('Firefox/'));assert.equal(o.screen.width,1920);assert.equal(o.identity.timezone,'Asia/Shanghai');const before=o.identity.ua;assert.equal(browsers.isRunning(p.id),false);const again=await browsers.diagnose(p.id);assert.equal((again.observations as any).observation.identity.ua,before);results.push({name:p.name,passed:true,observation:o});}finally{await browsers.stop(p.id);store.remove('profile',p.id);}
 }
 await fs.writeFile(path.join(output,'devices-real.json'),JSON.stringify(results,null,2));return results.map(x=>({name:x.name,passed:x.passed}));}finally{store.put('settings','app',originalSettings);}
}
