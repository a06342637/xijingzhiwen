import { createHash,randomUUID } from 'node:crypto';
import { createWriteStream,createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform,Readable } from 'node:stream';
import yauzl from 'yauzl';
import { inside } from './store';
import type {DownloadProgress} from '../shared/model';
export async function hashFile(file:string){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);return h.digest('hex');}
export function checksumFromManifest(text:string,name:string){const matches=text.split(/\r?\n/).map(l=>/^([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/.exec(l)).filter(m=>m&&m[2]===name);if(matches.length!==1)throw new Error('校验清单没有唯一的目标文件：'+name);return matches[0]![1].toLowerCase();}
export async function getJson<T=any>(url:string):Promise<T>{const response=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Qijing/0.1.0','Accept':'application/json'}});if(!response.ok)throw new Error(`网络请求失败 HTTP ${response.status}`);return response.json() as Promise<T>;}
export async function getText(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Qijing/0.1.0'}});if(!r.ok)throw new Error('获取校验清单失败 HTTP '+r.status);const text=await r.text();if(text.length>1024*1024)throw new Error('校验清单过大');return text;}
export async function downloadVerified(url:string,target:string,sha:string,emit:(p:DownloadProgress)=>void,id:string= randomUUID(),label='下载组件'){
 if(!/^[0-9a-f]{64}$/i.test(sha)||new URL(url).protocol!=='https:')throw new Error('下载必须有 HTTPS 地址和 SHA-256');
 await fs.mkdir(path.dirname(target),{recursive:true});
 const partial=target+'.partial';
 let last=0;
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(15*60*1000),headers:{'User-Agent':'Qijing/0.1.0'}});if(!r.ok||!r.body)throw new Error('下载失败 HTTP '+r.status);const total=Number(r.headers.get('content-length')||0);let received=0;
   emit({id,label,received,total,phase:attempt?'重试下载':'下载中'});
   const meter=new Transform({transform(chunk,_,done){received+=chunk.length;if(received>2*1024**3)return done(new Error('组件超过大小上限'));if(Date.now()-last>150){last=Date.now();emit({id,label,received,total,phase:'下载中'});}done(null,chunk);}});
   await pipeline(Readable.fromWeb(r.body as any),meter,createWriteStream(partial,{flags:'w',mode:0o600}));
   emit({id,label,received,total,phase:'校验中'});if(await hashFile(partial)!==sha.toLowerCase())throw new Error('SHA-256 不匹配，未启用下载内容');
   await fs.rename(partial,target);emit({id,label,received,total,phase:'已校验'});return;
  }catch(error){await fs.rm(partial,{force:true});if(attempt===2){emit({id,label,received:0,total:0,phase:'失败',error:String(error)});throw error;}}
 }
}
export async function extractZip(archive:string,destination:string){
 await fs.mkdir(destination,{recursive:true});let bytes=0,count=0;
 await new Promise<void>((resolve,reject)=>yauzl.open(archive,{lazyEntries:true,validateEntrySizes:true},(error,zip)=>{if(error||!zip)return reject(error);zip.on('error',reject);zip.on('end',resolve);zip.on('entry',entry=>{void(async()=>{
  if(++count>100000||(bytes+=entry.uncompressedSize)>5*1024**3)throw new Error('压缩包解压大小超限');
  const name:string=entry.fileName;if(name.includes('\\')||name.includes(':')||name.startsWith('/')||name.split('/').some(x=>x==='..'))throw new Error('压缩包路径不安全');
  const mode=(entry.externalFileAttributes>>>16)&0xf000;if(mode===0xa000)throw new Error('不允许压缩包符号链接');
  const target=inside(destination,name);if(name.endsWith('/'))await fs.mkdir(target,{recursive:true});else{await fs.mkdir(path.dirname(target),{recursive:true});const stream=await new Promise<NodeJS.ReadableStream>((res,rej)=>zip.openReadStream(entry,(e,s)=>e||!s?rej(e):res(s)));await pipeline(stream,createWriteStream(target,{flags:'wx'}));}zip.readEntry();
 })().catch(e=>{zip.close();reject(e);});});zip.readEntry();}));
}
