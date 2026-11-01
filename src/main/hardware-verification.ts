import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {newProfile} from '../shared/model';
import {applyHardware,HARDWARE_PRESETS,CPUS,GPUS,compatibleHardware} from '../shared/hardware';
import {Store} from './store';
import {Browsers} from './browsers';
import type {BrowserWindow} from 'electron';
export async function verifyHardware(store:Store,browsers:Browsers,output:string){
 const results:any[]=[];
 for(const engine of ['chromium','firefox']){
  const kernel=store.kernels().find(k=>(k.engine||'chromium')===engine&&(engine==='firefox'||k.arch===process.arch))!;assert.ok(kernel,'Missing engine for hardware verification');
  for(const [platform,gpu] of [['windows','rtx-5070ti'],['windows','rx-9070xt'],['windows','arc-b580'],['macos','m4'],['linux','rtx-4060']]){
   const p=newProfile(randomUUID(),'12345',kernel.id);p.name=engine+' '+platform+' '+gpu;Object.assign(p.values,{engine,platform,brand:engine==='firefox'?'Firefox':'Chrome'});const preset=compatibleHardware(p.values).find(h=>h.gpu===gpu)!;assert.ok(preset);p.values=applyHardware(p.values,preset);store.put('profile',p.id,p);
   try{const report=await browsers.diagnose(p.id),o=(report.observations as any).observation;assert.equal(o.identity.cpu,p.values.cpu);if(engine==='chromium')assert.equal(o.identity.memory,8);const actual=o.webgl.webgl;
    const vendorMatch=actual?.vendor===p.values.gpuVendor,rendererMatch=actual?.renderer===p.values.gpuRenderer;
    results.push({name:p.name,passed:true,expected:{cpu:p.values.cpu,vendor:p.values.gpuVendor,renderer:p.values.gpuRenderer},observed:{cpu:o.identity.cpu,webgl:o.webgl,webgpu:o.webgpu},gpuStatus:vendorMatch&&rendererMatch?'verified':'limited',detail:vendorMatch&&rendererMatch?'WebGL 1 名称匹配；图形能力仍受真实硬件限制。':'真实上下文缺失或名称受内核限制；未宣称图形覆盖已验证。'});
    await fs.writeFile(path.join(output,'hardware-real.json'),JSON.stringify(results,null,2));
   }finally{await browsers.stop(p.id);store.remove('profile',p.id);}
  }
 }
 return results.map(r=>({name:r.name,passed:r.passed,gpuStatus:r.gpuStatus}));
}
export async function verifyHardwareUI(window:BrowserWindow,store:Store){
 const original=store.settings();const js=(s:string)=>window.webContents.executeJavaScript(s),wait=()=>js('new Promise(resolve=>setTimeout(resolve,250))');
 try{await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:newProfile(randomUUID(),'1').values})})`);await js(`document.querySelector('.page-header .button.primary').click()`);await wait();
  const preset=HARDWARE_PRESETS.find(p=>p.gpu==='rx-9070xt')!,cpu=CPUS.find(c=>c.id===preset.cpu)!,gpu=GPUS.find(g=>g.id===preset.gpu)!;
  await js(`(()=>{const s=document.querySelector('[aria-label="整机组合预设"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(preset.id)});s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait();
  assert.equal(await js(`document.querySelector('[aria-label="CPU 型号记录"]').value`),cpu.id);assert.equal(await js(`document.querySelector('[aria-label="显卡型号记录"]').value`),gpu.id);assert.ok((await js(`document.querySelector('.hardware-result').innerText`)).includes(String(cpu.threads)));await fs.writeFile(path.resolve(process.env.QIJING_SMOKE_OUTPUT||'.verification','hardware-picker.png'),(await window.webContents.capturePage()).toPNG());
  await js(`document.querySelector('[aria-label="关闭对话框"]').click()`);return [{name:'整机组合 UI 联动 CPU / GPU / 线程与原生能力说明',passed:true}];
 }finally{await js(`window.qijing.invoke('settings.save',${JSON.stringify({fingerprintDefaults:original.fingerprintDefaults})})`);}
}
