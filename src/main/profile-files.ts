import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export async function acquireProfileLock(directory:string){
 await fs.mkdir(directory,{recursive:true});
 const file=path.join(directory,'.qijing-profile-lock'),token=randomUUID();
 for(let attempt=0;attempt<2;attempt++){
  let handle,created=false;
  try{handle=await fs.open(file,'wx');created=true;await handle.writeFile(JSON.stringify({pid:process.pid,token}));await handle.sync();await handle.close();handle=undefined;
   return async()=>{try{const owner=JSON.parse(await fs.readFile(file,'utf8'));if(owner.token===token)await fs.unlink(file);}catch(error:any){if(error.code!=='ENOENT')throw error;}};
  }catch(error:any){await handle?.close().catch(()=>{});if(created){await fs.unlink(file).catch(()=>{});throw error;}if(error.code!=='EEXIST')throw error;
   let old:any;try{old=JSON.parse(await fs.readFile(file,'utf8'));}catch{throw new Error('环境锁损坏，无法确认是否仍被占用');}
   if(!Number.isSafeInteger(old.pid)||old.pid<=0)throw new Error('环境锁的进程信息无效');
   try{process.kill(old.pid,0);throw new Error('环境被另一管理进程使用');}catch(e:any){if(e.code!=='ESRCH')throw e;}
   // Remove only the stale lock observed above. Never delete a replacement owner.
   const current=JSON.parse(await fs.readFile(file,'utf8'));if(current.pid!==old.pid||current.token!==old.token)continue;
   await fs.unlink(file);
  }
 }
 throw new Error('环境锁正在变化，请稍后重试');
}

export async function copyProfile(source:string,target:string){
 const skipped=new Set(['.qijing-profile-lock','SingletonLock','SingletonSocket','SingletonCookie']);
 const stat=await fs.stat(source).catch((e:any)=>{if(e.code==='ENOENT')return null;throw e;});
 if(!stat){await fs.mkdir(target,{recursive:true});return;}
 if(!stat.isDirectory())throw new Error('浏览器数据目录无效');
 try{await fs.cp(source,target,{recursive:true,errorOnExist:true,force:false,filter:async(file)=>{if(skipped.has(path.basename(file)))return false;const s=await fs.lstat(file);if(s.isSymbolicLink())throw new Error('浏览器数据含链接，不能安全创建升级副本');return true;}});}catch(error){await fs.rm(target,{recursive:true,force:true});throw new Error('复制浏览器数据失败，未创建可启动的副本',{cause:error});}
}
