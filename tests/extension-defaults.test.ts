import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../src/main/store';
import {importExtension} from '../src/main/extensions';
import {enabledExtensionIds} from '../src/shared/extension-defaults';
import {defaultValues,newProfile} from '../src/shared/model';
import {validateSettingsPatch} from '../src/main/settings';
import {prepareProfileBatch} from '../src/main/profile-batch';
const crypto={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()};
test('newly imported extensions inherit only when enabled, with persistent switches and unchanged old profiles',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-ext-defaults-'));let store=new Store(root,crypto);
 try{await store.init();const source=path.join(root,'source');await fs.mkdir(source);await fs.writeFile(path.join(source,'manifest.json'),JSON.stringify({manifest_version:3,name:'default fixture',version:'1.0'}));const imported=await importExtension(store,source);assert.equal(imported.enabled,true);const legacy={id:randomUUID(),name:'legacy',version:'1.0',path:source};store.put('extension',legacy.id,legacy);const existing=newProfile(randomUUID(),'7');existing.name='existing';existing.extensionIds=[imported.id];store.put('profile',existing.id,existing);
 const settings=store.settings();assert.equal(settings.inheritEnabledExtensions,true);const ids=enabledExtensionIds(settings,store.extensions(),defaultValues());assert.deepEqual(ids,[imported.id]);const fresh=newProfile(randomUUID(),'9');fresh.name='new';fresh.extensionIds=ids;const batch=prepareProfileBatch({profile:fresh,count:5,randomize:false});assert.ok(batch.every(p=>p.extensionIds.length===1&&p.extensionIds[0]===imported.id));
 store.put('extension',imported.id,{...imported,enabled:false});assert.deepEqual(enabledExtensionIds(settings,store.extensions(),defaultValues()),[]);assert.deepEqual(store.get<any>('profile',existing.id).extensionIds,[imported.id]);store.put('settings','app',validateSettingsPatch({inheritEnabledExtensions:false},settings));store.close();store=new Store(root,crypto);await store.init();assert.equal(store.settings().inheritEnabledExtensions,false);assert.equal(store.extensions().find(e=>e.id===imported.id)?.enabled,false);assert.equal(store.extensions().find(e=>e.id===legacy.id)?.enabled,undefined);
 }finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('disabled inheritance, Firefox, measured mode, and manual deselection respect compatibility',()=>{
 const enabled={id:randomUUID(),name:'fixture',path:'C:/extension',version:'1',enabled:true};const values=defaultValues();assert.deepEqual(enabledExtensionIds({inheritEnabledExtensions:false},[enabled],values),[]);assert.deepEqual(enabledExtensionIds({},[enabled],{...values,engine:'firefox'}),[]);assert.deepEqual(enabledExtensionIds({},[enabled],values,'measured'),[]);assert.deepEqual(enabledExtensionIds({},[enabled,enabled],values),[enabled.id]);assert.throws(()=>enabledExtensionIds({},Array.from({length:51},()=>({...enabled,id:randomUUID()})),values),/50/);
 const p=newProfile(randomUUID(),'123');p.name='manual';p.extensionIds=[];assert.ok(prepareProfileBatch({profile:p,count:3,randomize:true}).every(p=>p.extensionIds.length===0));
});
