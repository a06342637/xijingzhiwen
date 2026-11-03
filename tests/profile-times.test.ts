import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/main/store';
import {newProfile} from '../src/shared/model';
import {validateProfile} from '../src/shared/config';
import {prepareProfileBatch} from '../src/main/profile-batch';
import {Browsers} from '../src/main/browsers';
import type {Kernels} from '../src/main/kernels';
const crypto={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()};
test('legacy launch dates, persistence, recycle and fresh copy/batch history',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-times-'));let store=new Store(root,crypto);try{await store.init();const p=newProfile(randomUUID(),'123');p.name='time fixture';assert.equal(validateProfile(p).lastStartedAt,undefined);store.put('profile',p.id,p);
 const first='2026-11-01T01:02:03.000Z',last='2026-11-03T04:05:06.000Z';store.recordProfileStart(p.id,first);store.recordProfileStart(p.id,last);assert.equal(store.get<any>('profile',p.id).createdAt,p.createdAt);assert.equal(store.get<any>('profile',p.id).updatedAt,p.updatedAt);store.close();store=new Store(root,crypto);await store.init();const saved=store.get<any>('profile',p.id);assert.equal(saved.lastStartedAt,last);assert.equal(store.cloneProfile(p.id).lastStartedAt,undefined);assert.ok(prepareProfileBatch({profile:saved,count:3,randomize:false}).every(p=>!p.lastStartedAt));await store.deleteProfile(p.id);const record=store.recycled().find(r=>r.profile.id===p.id)!;await store.restoreEnvironment(record.id);assert.equal(store.get<any>('profile',p.id).lastStartedAt,last);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('launch event records success once; focus and failed launch preserve time; next success updates it',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-times-runner-')),store=new Store(root,crypto);let browsers:Browsers|undefined;
 try{await store.init();store.put('settings','app',{...store.settings(),randomBookmarks:false});const worker=path.join(root,'worker.cjs');await fs.writeFile(worker,`process.on('message',m=>{if(m.action==='start'&&m.payload.profile.name==='fail'){process.send({id:m.id,ok:false,error:'fixture failed'});return;}if(m.action==='start'){process.send({event:'started'});process.send({event:'started'});}process.send({id:m.id,ok:true,result:true});if(m.action==='stop')setTimeout(()=>process.exit(0),25);});`);
 const kernel={id:'test',engine:'chromium' as const,path:worker,version:'155.0.8059.79',arch:'arm64' as const};browsers=new Browsers(store,{verify:async()=>kernel} as unknown as Kernels,worker,()=>{},async()=>'',()=>{});
 const p=newProfile(randomUUID(),'123','test');p.name='success';store.put('profile',p.id,p);await browsers.start(p.id,true);const first=store.get<any>('profile',p.id).lastStartedAt;assert.ok(first);await browsers.focus(p.id);assert.equal(store.get<any>('profile',p.id).lastStartedAt,first);await browsers.stop(p.id);
 await new Promise(r=>setTimeout(r,10));await browsers.start(p.id,true);await browsers.stop(p.id);assert.ok(Date.parse(store.get<any>('profile',p.id).lastStartedAt)>Date.parse(first));const fail={...p,id:randomUUID(),name:'fail'};store.put('profile',fail.id,fail);await assert.rejects(()=>browsers!.start(fail.id,true),/fixture failed/);assert.equal(store.get<any>('profile',fail.id).lastStartedAt,undefined);
 }finally{await browsers?.stopAll();store.close();await fs.rm(root,{recursive:true,force:true});}
});
