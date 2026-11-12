import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export async function cleanupLocalArtifacts({root,releaseDir,version,removeDependencies=true}){
 root=await fs.realpath(root);
 if(!/^\d+\.\d+\.\d+$/.test(version))throw new Error('Invalid cleanup version');
 const releaseParent=path.resolve(root,'..','xijing发行版本');
 const requested=path.resolve(releaseDir);
 const requestedParent=await fs.realpath(path.resolve(requested,'..','..')).catch(()=>null);
 if(!requestedParent||path.relative(path.dirname(root),requestedParent)!==''||path.basename(path.dirname(requested))!=='xijing发行版本'||path.basename(requested)!==version)throw new Error('Release cleanup path must be the configured version directory');
 releaseDir=path.join(releaseParent,version);
 const names=['dist','vendor-resources','.test-data','.verification',...(removeDependencies?['node_modules']:[])];
 const candidates=[...names.map(name=>path.join(root,name)),path.resolve(releaseDir)];
 const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 // Validate every target before deleting any. Preserve source, Git and other projects.
 for(const target of candidates){
  const relative=path.relative(root,target).split(path.sep).join('/');
  if(tracked.some(file=>file===relative||file.startsWith(relative+'/')))throw new Error('Cleanup would remove tracked source: '+relative);
  let current=target;
  while(current!==root&&current!==path.dirname(root)){
   const stat=await fs.lstat(current).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
   if(stat?.isSymbolicLink())throw new Error('Cleanup refuses redirected paths: '+current);
   current=path.dirname(current);
  }
 }
 const removed=[];
 for(const target of candidates){
  if(!await fs.lstat(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;}))continue;
  await fs.rm(target,{recursive:true,force:true,maxRetries:8,retryDelay:250});removed.push(target);
 }
 return removed;
}
