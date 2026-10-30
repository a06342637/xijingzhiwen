import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {inside,Store} from './store';
import type {Extension} from '../shared/model';
export async function importExtension(store:Store,folder:string){
 const source=await fs.realpath(folder),managed=await fs.realpath(inside(store.root,'extensions'));
 const relative=path.relative(source,managed);if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw new Error('不能把扩展存储目录或其父目录作为扩展导入');
 const file=path.join(source,'manifest.json');if((await fs.stat(file)).size>1024**2)throw new Error('扩展 manifest.json 过大');
 const manifest=JSON.parse(await fs.readFile(file,'utf8'));if(![2,3].includes(manifest.manifest_version)||typeof manifest.name!=='string'||!manifest.name.trim()||manifest.name.length>200||typeof manifest.version!=='string')throw new Error('扩展 manifest.json 的名称、版本或格式无效');
 const id=randomUUID(),destination=inside(store.root,'extensions',id),staging=destination+'.staging';let count=0,bytes=0;
 try{await fs.cp(source,staging,{recursive:true,dereference:false,filter:async file=>{if(['.git','node_modules'].includes(path.basename(file)))return false;const s=await fs.lstat(file);if(s.isSymbolicLink())throw new Error('扩展目录不允许符号链接');if(++count>10000||(bytes+=s.isFile()?s.size:0)>512*1024**2)throw new Error('扩展文件数或大小超过上限');return true;}});await fs.rename(staging,destination);const extension:Extension={id,name:manifest.name,version:manifest.version,path:destination};try{return store.put('extension',id,extension);}catch(error){await fs.rm(destination,{recursive:true,force:true});throw error;}}finally{await fs.rm(staging,{recursive:true,force:true});}
}
