import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/main/store';
import {newProfile} from '../src/shared/model';
const crypto={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()};
const days=3*24*60*60*1000;
test('recycle restores exact profile, seed, browser data and managed downloads across restart',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-recycle-'));let store=new Store(root,crypto);
 try{await store.init();const p=newProfile(randomUUID(),'19283745');p.name='可恢复';p.tags=['tag'];store.put('profile',p.id,p);for(const [dir,name,data] of [['profiles','Preferences','login'],['downloads','example.txt','download']]){await fs.mkdir(path.join(root,dir,p.id));await fs.writeFile(path.join(root,dir,p.id,name),data);}
 const time=Date.now();await store.deleteProfile(p.id,time);assert.equal(store.profiles().length,0);const record=store.recycled()[0];assert.equal(record.deletedAt,new Date(time).toISOString());assert.equal(Date.parse(record.expiresAt),time+days);assert.equal(record.hasDownloads,true);assert.equal(await fs.stat(path.join(root,'profiles',p.id)).catch(()=>null),null);store.close();store=new Store(root,crypto);await store.init();await store.restoreEnvironment(record.id,time+1000);assert.deepEqual(store.get('profile',p.id),p);assert.equal(await fs.readFile(path.join(root,'profiles',p.id,'Preferences'),'utf8'),'login');assert.equal(await fs.readFile(path.join(root,'downloads',p.id,'example.txt'),'utf8'),'download');assert.equal(store.recycled().length,0);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('three-day expiry prevents restore, purges owned data, preserves external downloads and other profiles',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-expire-')),external=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-external-'));const store=new Store(root,crypto);
 try{await store.init();const p=newProfile(randomUUID(),'11');p.name='expire';p.downloadDir=external;store.put('profile',p.id,p);const other=newProfile(randomUUID(),'22');other.name='keep';store.put('profile',other.id,other);await fs.writeFile(path.join(external,'keep.txt'),'keep');await fs.mkdir(path.join(root,'profiles',p.id));await fs.writeFile(path.join(root,'profiles',p.id,'Cookies'),'private');const now=Date.now();await store.deleteProfile(p.id,now);const r=store.recycled()[0];assert.equal((await store.purgeExpired(now+days-1)).length,0);await assert.rejects(()=>store.restoreEnvironment(r.id,now+days),/到期/);assert.equal((await store.purgeExpired(now+days))[0].ok,true);assert.equal(store.recycled().length,0);assert.equal(await fs.stat(path.join(root,'trash','environments',r.id)).catch(()=>null),null);assert.equal(await fs.readFile(path.join(external,'keep.txt'),'utf8'),'keep');assert.equal(store.profiles()[0].id,other.id);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});await fs.rm(external,{recursive:true,force:true});}
});
test('restore refusal never overwrites an existing target and failed database writes roll back moves',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-restore-fail-'));const store=new Store(root,crypto);
 try{await store.init();const p=newProfile(randomUUID(),'77');p.name='restore';store.put('profile',p.id,p);await fs.mkdir(path.join(root,'profiles',p.id));await fs.writeFile(path.join(root,'profiles',p.id,'Preferences'),'original');await store.deleteProfile(p.id);const r=store.recycled()[0];await fs.mkdir(path.join(root,'profiles',p.id));await fs.writeFile(path.join(root,'profiles',p.id,'Preferences'),'unrelated');await assert.rejects(()=>store.restoreEnvironment(r.id),/已存在/);assert.equal(await fs.readFile(path.join(root,'profiles',p.id,'Preferences'),'utf8'),'unrelated');await fs.rm(path.join(root,'profiles',p.id),{recursive:true});await fs.mkdir(path.join(root,'qijing.sqlite.tmp'));await assert.rejects(()=>store.restoreEnvironment(r.id));assert.equal(store.recycled().length,1);assert.equal(await fs.readFile(path.join(root,'trash','environments',r.id,'browser','Preferences'),'utf8'),'original');assert.equal(store.profiles().length,0);await fs.rm(path.join(root,'qijing.sqlite.tmp'),{recursive:true});await store.restoreEnvironment(r.id);assert.equal(store.profiles().length,1);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('proxy edits invalidate measured country and blank startup defaults add no extra page',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-proxy-result-'));const store=new Store(root,crypto);
 try{await store.init();const p={id:randomUUID(),name:'route',host:'us.gateway.test',port:10000,protocol:'http' as const,username:'user',password:'pw',bypass:''};await store.saveProxy(p);store.put('proxyObservation',p.id,{proxyId:p.id,testedAt:new Date().toISOString(),exitIp:'192.0.2.1',country:'TH',routeStable:true,message:'test'});const {password,...metadata}=p;await store.saveProxy({...metadata,name:'rename'});assert.equal(store.proxyObservations()[0].country,'TH');await store.saveProxy({...metadata,host:'as.gateway.test'});assert.equal(store.proxyObservations().length,0);assert.deepEqual(newProfile(randomUUID(),'1').startUrls,[]);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('permanent delete removes profile metadata from SQLite pages and only its owned report output',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-purge-files-'));const store=new Store(root,crypto);
 try{await store.init();const p=newProfile(randomUUID(),'987');p.name='uniquely-deleted-metadata-token';store.put('profile',p.id,p);const output=path.join(root,'reports','owned-report');await fs.mkdir(output);await fs.writeFile(path.join(output,'snapshot.json'),'private observation');const reportId=randomUUID();store.put('report',reportId,{id:reportId,profileId:p.id,outputDir:output});await store.deleteProfile(p.id);const r=store.recycled()[0];await store.purgeEnvironment(r.id);assert.equal(await fs.stat(output).catch(()=>null),null);assert.equal(store.all('report').length,0);assert.equal((await fs.readFile(path.join(root,'qijing.sqlite'))).includes(Buffer.from(p.name)),false);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
