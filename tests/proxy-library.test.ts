import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/main/store';
import {newProfile} from '../src/shared/model';
const crypto={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()};
test('only explicit proxy library saves are listed, survive restart and environment deletion',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-library-'));let store=new Store(root,crypto);
 try{await store.init();const manual={id:randomUUID(),name:'manual',protocol:'http' as const,host:'proxy.test',port:1000,username:'',password:'',bypass:''},environment={...manual,id:randomUUID(),name:'environment'};await store.saveProxy(manual,true);await store.saveProxy(environment);assert.deepEqual(store.proxyLibrary().map(p=>p.id),[manual.id]);assert.equal(store.proxies().length,2);
  const p=newProfile(randomUUID(),'1');p.name='library owner';p.proxyId=manual.id;store.put('profile',p.id,p);await store.deleteProfilePermanently(p.id);assert.ok(store.isLibraryProxy(manual.id));assert.equal((await store.proxy(manual.id)).host,manual.host);store.close();store=new Store(root,crypto);await store.init();assert.deepEqual(store.proxyLibrary().map(p=>p.id),[manual.id]);await store.saveProxy({...manual,name:'renamed'});assert.equal(store.proxyLibrary()[0].name,'renamed');store.remove('proxy',manual.id);assert.equal(store.proxyLibrary().length,0);assert.equal(store.all('proxyLibrary').length,0);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
