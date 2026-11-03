import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Components} from '../src/main/components';
import {hashFile} from '../src/main/download';
import {Store} from '../src/main/store';

test('component readiness shares UI verification, but explicit use revalidates changed native files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-ready-')),store=new Store(root,{encryptString:s=>Buffer.from(s),decryptString:b=>b.toString(),isEncryptionAvailable:()=>true});
 try{const resources=path.join(root,'resources'),dir=path.join(root,'components','python-x64');await fs.mkdir(path.join(resources,'config'),{recursive:true});await fs.mkdir(dir,{recursive:true});const manifest=path.join(resources,'config','components.json'),exe=path.join(dir,'python.exe'),dll=path.join(dir,'native.dll');await fs.writeFile(manifest,JSON.stringify({python:'test'}));await fs.writeFile(exe,'test executable');await fs.writeFile(dll,'verified native file');await fs.writeFile(path.join(dir,'ready.json'),JSON.stringify({python:'test',manifestHash:await hashFile(manifest),executableHash:await hashFile(exe),nativeFiles:{'native.dll':await hashFile(dll)}}));const components=new Components(store,resources,()=>{},()=>{},'x64');assert.ok((await Promise.all([components.ready(),components.ready(),components.ready()])).every(Boolean));await fs.writeFile(dll,'changed file');assert.equal(await components.ready(true),false);await fs.writeFile(dll,'verified native file');assert.equal(await components.ready(true),true);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
