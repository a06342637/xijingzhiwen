import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {cleanupLocalArtifacts} from '../scripts/cleanup-local.mjs';

async function fixture(){
 const parent=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-release-clean-')),root=path.join(parent,'project'),releaseDir=path.join(parent,'xijing发行版本','1.2.3');
 await fs.mkdir(root);execFileSync('git',['init','-q'],{cwd:root});
 await fs.writeFile(path.join(root,'source.ts'),'keep');execFileSync('git',['add','source.ts'],{cwd:root});
 for(const name of ['dist','vendor-resources','.test-data','.verification','node_modules']){await fs.mkdir(path.join(root,name));await fs.writeFile(path.join(root,name,'generated'),'test');}
 await fs.mkdir(releaseDir,{recursive:true});await fs.writeFile(path.join(releaseDir,'installer.exe'),'test');
 return {parent,root,releaseDir,version:'1.2.3'};
}
test('published cleanup removes generated files but retains source, Git and unrelated projects',async()=>{
 const f=await fixture();try{await fs.mkdir(path.join(f.root,'another-project'));await fs.writeFile(path.join(f.root,'another-project','source'),'keep');
 const removed=await cleanupLocalArtifacts(f);assert.equal(removed.length,6);assert.equal(await fs.readFile(path.join(f.root,'source.ts'),'utf8'),'keep');assert.ok(await fs.stat(path.join(f.root,'.git')));assert.ok(await fs.stat(path.join(f.root,'another-project')));assert.equal((await cleanupLocalArtifacts(f)).length,0);
 }finally{await fs.rm(f.parent,{recursive:true,force:true});}
});
test('invalid release path and tracked generated directories fail before any deletion',async()=>{
 const f=await fixture();try{await assert.rejects(()=>cleanupLocalArtifacts({...f,releaseDir:f.parent}),/path/);assert.ok(await fs.stat(path.join(f.root,'dist')));
 execFileSync('git',['add','dist/generated'],{cwd:f.root});await assert.rejects(()=>cleanupLocalArtifacts(f),/tracked source/);assert.ok(await fs.stat(path.join(f.root,'node_modules')));assert.ok(await fs.stat(f.releaseDir));
 }finally{await fs.rm(f.parent,{recursive:true,force:true});}
});
test('cleanup refuses symbolic links instead of following an outside target',async()=>{
 const f=await fixture();try{await fs.rm(path.join(f.root,'dist'),{recursive:true});await fs.mkdir(path.join(f.parent,'outside'));await fs.symlink(path.join(f.parent,'outside'),path.join(f.root,'dist'),'junction');await assert.rejects(()=>cleanupLocalArtifacts(f),/redirected/);assert.ok(await fs.stat(path.join(f.parent,'outside')));assert.ok(await fs.stat(f.releaseDir));
 }finally{await fs.rm(f.parent,{recursive:true,force:true});}
});
