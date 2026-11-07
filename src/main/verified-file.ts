import fs from 'node:fs/promises';
import {hashFile} from './download';

// Reuse a successful digest only while the file identity and metadata match.
// Never persist trust across app sessions, and reject modifications during hashing.
export class VerifiedFiles {
 private verified=new Map<string,string>();
 private pending=new Map<string,Promise<void>>();
 constructor(private hash=hashFile){}
 private async stamp(file:string){const s=await fs.stat(file,{bigint:true});if(!s.isFile())throw new Error('内核路径不是文件');return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');}
 async verify(file:string,expected:string){
  const stamp=await this.stamp(file),key=file+'\0'+expected;
  if(this.verified.get(key)===stamp)return;
  let task=this.pending.get(key);if(!task){task=(async()=>{if(await this.hash(file)!==expected)throw new Error('内核文件已改变，请重新导入并验证');if(await this.stamp(file)!==stamp)throw new Error('内核在校验期间发生变化，请重试');this.verified.set(key,stamp);})().finally(()=>this.pending.delete(key));this.pending.set(key,task);}
  await task;if(await this.stamp(file)!==this.verified.get(key))throw new Error('内核在校验期间发生变化，请重试');
 }
}
