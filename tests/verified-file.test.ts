import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {VerifiedFiles} from '../src/main/verified-file';
import {hashFile} from '../src/main/download';
test('kernel digest shares concurrent work, reuses unchanged files and detects changed contents or expected hash',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-digest-')),file=path.join(root,'kernel');let hashes=0;const verified=new VerifiedFiles(async file=>{hashes++;return hashFile(file);});
 try{await fs.writeFile(file,'original kernel');const expected=await hashFile(file);await Promise.all([verified.verify(file,expected),verified.verify(file,expected)]);assert.equal(hashes,1);await verified.verify(file,expected);assert.equal(hashes,1);await fs.writeFile(file,'changed kernel!');await assert.rejects(()=>verified.verify(file,expected),/已改变/);await assert.rejects(()=>verified.verify(file,'wrong'),/已改变/);await fs.rm(file);await assert.rejects(()=>verified.verify(file,expected));}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('kernel mutation during hashing is never trusted and a fresh app session hashes again',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-digest-race-')),file=path.join(root,'kernel');
 try{await fs.writeFile(file,'original');const expected=await hashFile(file);const verified=new VerifiedFiles(async file=>{const digest=await hashFile(file);await fs.writeFile(file,'modified');return digest;});await assert.rejects(()=>verified.verify(file,expected),/校验期间/);let hashes=0;const next=new VerifiedFiles(async file=>{hashes++;return hashFile(file);});await next.verify(file,await hashFile(file));assert.equal(hashes,1);}finally{await fs.rm(root,{recursive:true,force:true});}
});
