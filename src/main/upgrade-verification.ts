import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {newProfile} from '../shared/model';
import {Store} from './store';
import {Browsers} from './browsers';
export async function verifyUpgrade(store:Store,browsers:Browsers){
 const kernel=store.kernels().find(k=>(k.engine||'chromium')==='chromium'&&k.arch===process.arch)!;assert.ok(kernel);
 const p=newProfile(randomUUID(),'1111',kernel.id);p.name='升级副本隔离验证';store.put('profile',p.id,p);
 const alt={...kernel,id:'upgrade-test-'+randomUUID()},source=path.join(store.root,'profiles',p.id);store.put('kernel',alt.id,alt);await fs.mkdir(source,{recursive:true});await fs.writeFile(path.join(source,'qijing-upgrade-marker'),'original-data');
 let cloneId:string|undefined;
 try{const result=await browsers.upgrade(p.id,alt.id);cloneId=result.profileId;assert.equal(await fs.readFile(path.join(source,'qijing-upgrade-marker'),'utf8'),'original-data');assert.equal(await fs.readFile(path.join(store.root,'profiles',cloneId,'qijing-upgrade-marker'),'utf8'),'original-data');assert.equal(store.get<any>('profile',p.id).kernelId,kernel.id);assert.equal(store.get<any>('profile',cloneId).kernelId,alt.id);assert.equal(result.report.kind,'upgrade');return [{name:'真实升级检查副本复制 / 原目录与内核绑定保留',passed:true}];}
 finally{if(cloneId){await browsers.stop(cloneId);store.remove('profile',cloneId);}await browsers.stop(p.id);store.remove('profile',p.id);store.remove('kernel',alt.id);}
}
