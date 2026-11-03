import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Kernels} from '../src/main/kernels';
import type {Store} from '../src/main/store';
test('download-all shares one queue, downloads sequentially, skips installed, and continues after failure',async()=>{
 const progress:any[]=[];const k=new Kernels({kernels:()=>[{id:'155.0.8059.79-arm64'}]} as Store,p=>progress.push(p));let active=0,max=0,calls:string[]=[];
 k.available=async(engine:any)=>engine==='chromium'?[{engine,version:'155.0.8059.79',archs:['arm64','x64'],date:'',url:''},{engine,version:'154.0.8000.1',archs:['x64'],date:'',url:''}]:[{engine,version:'158.0.1-beta.41',archs:['x64'],date:'',url:''}];
 const install=async(id:string)=>{active++;max=Math.max(max,active);calls.push(id);await new Promise(r=>setTimeout(r,20));active--;if(id.startsWith('155'))throw new Error('fixture download failure');return {} as any;};k.install=(v,a)=>install(v+'-'+a);k.installFirefox=v=>install('firefox-'+v);
 const first=k.installAll();assert.equal(k.installAll(),first);assert.equal(k.preparing,true);const results=await first;assert.equal(max,1);assert.equal(k.preparing,false);assert.equal(calls.length,3);assert.equal(results.filter((r:any)=>r.skipped).length,1);assert.equal(results.filter((r:any)=>!r.ok).length,1);assert.equal(progress.at(-1).phase,'队列完成，有失败项目');
});
test('download-all handles unavailable release sources and empty lists without hanging',async()=>{const k=new Kernels({kernels:()=>[]} as unknown as Store,()=>{});k.available=async(e)=>{if(e==='chromium')throw new Error('offline');return [];};const r=await k.installAll();assert.equal(r.length,1);assert.equal(r[0].ok,false);assert.equal(k.preparing,false);});
