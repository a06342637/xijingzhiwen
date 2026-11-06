import {normalizePersona} from '../shared/browser-persona';
import {controlledDefaults} from '../shared/controlled-features';
import initSqlJs, {type Database} from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID,randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import type {Profile,ProxyConfig,Kernel,Extension,Report,AppState,RecycledEnvironment,ProxyObservation} from '../shared/model';
import {defaultValues,proxySchema} from '../shared/model';
import {proxyUrl} from '../shared/config';
import {parseProxyInput} from '../shared/proxy-input';
import {renameWithRetry} from './replace-directory';
const moduleRequire=createRequire(typeof __filename==='string'?__filename:path.join(process.cwd(),'package.json'));
export function inside(root:string,...parts:string[]){const target=path.resolve(root,...parts);const relative=path.relative(path.resolve(root),target);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('路径超出工作空间');return target;}
export function newSeed(){return (randomBytes(8).readBigUInt64BE()||1n).toString();}
export interface CryptoStore {encryptString(s:string):Buffer|Promise<Buffer>;decryptString(b:Buffer):string|Promise<string>;isEncryptionAvailable():boolean|Promise<boolean>}
export class Store {
 readonly deleting=new Set<string>();
 private proxyWrites=new Map<string,Promise<unknown>>();
 get saving(){return this.proxyWrites.size>0||this.recycleOperations.size>0;}
 private recycleOperations=new Set<string>();
 private db!:Database;private sql!:Awaited<ReturnType<typeof initSqlJs>>;private dbPath:string;private closed=false;
 constructor(public root:string,private crypto:CryptoStore){this.dbPath=path.join(root,'qijing.sqlite');}
 async init(){fs.mkdirSync(this.root,{recursive:true});for(const d of ['profiles','downloads','kernels','reports','devices','components','extensions','trash','upgrade-tests'])fs.mkdirSync(path.join(this.root,d),{recursive:true});this.sql=await initSqlJs({locateFile:()=>moduleRequire.resolve('sql.js/dist/sql-wasm.wasm')});this.db=fs.existsSync(this.dbPath)?new this.sql.Database(fs.readFileSync(this.dbPath)):new this.sql.Database();this.db.run('CREATE TABLE IF NOT EXISTS objects(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS secrets(id TEXT PRIMARY KEY,data TEXT NOT NULL); PRAGMA user_version=1; PRAGMA secure_delete=ON;');this.persist();}
 private persist(){const tmp=this.dbPath+'.tmp';try{fs.writeFileSync(tmp,this.db.export(),{mode:0o600});const handle=fs.openSync(tmp,'r+');try{fs.fsyncSync(handle);}finally{fs.closeSync(handle);}fs.renameSync(tmp,this.dbPath);}catch(error){try{fs.unlinkSync(tmp);}catch{}throw error;}}
 private mutate<T>(operation:()=>T):T {if(this.closed)throw new Error('数据库已关闭');const before=this.db.export();try{const result=operation();this.persist();return result;}catch(error){this.db.close();this.db=new this.sql.Database(before);this.db.run('PRAGMA secure_delete=ON;');throw error;}}
 all<T>(kind:string):T[]{const st=this.db.prepare('SELECT data FROM objects WHERE kind=? ORDER BY rowid DESC');st.bind([kind]);const result:T[]=[];while(st.step())result.push(JSON.parse(st.getAsObject().data as string));st.free();return result;}
 get<T>(kind:string,id:string):T {const st=this.db.prepare('SELECT data FROM objects WHERE kind=? AND id=?');st.bind([kind,id]);const found=st.step()?JSON.parse(st.getAsObject().data as string):null;st.free();if(!found)throw new Error('记录不存在或已删除');return found;}
 put<T>(kind:string,id:string,value:T){return this.mutate(()=>{this.db.run('INSERT INTO objects(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data',[kind,id,JSON.stringify(value)]);return value;});}
 remove(kind:string,id:string){if(kind==='proxy'&&this.proxyWrites.has(id))throw new Error('代理正在保存，请完成后删除');this.mutate(()=>{this.db.run('DELETE FROM objects WHERE kind=? AND id=?',[kind,id]);if(kind==='proxy'){this.db.run('DELETE FROM secrets WHERE id=?',[id]);this.db.run("DELETE FROM objects WHERE kind='proxyOriginal' AND id=?",[id]);}});}
 profiles():Profile[]{return this.all<Profile>('profile').map(p=>({...p,values:normalizePersona({...defaultValues(),randomStrategy:p.mode==='measured'||(p.values.deviceType&&p.values.deviceType!=='desktop')?'consistent':'catalog',...p.values})}));} kernels(){return this.all<Kernel>('kernel');} extensions(){return this.all<Extension>('extension');} reports(){return this.all<Report>('report').slice(0,100);}
 createProfiles(profiles:Profile[]){return this.mutate(()=>{for(const p of profiles)this.db.run('INSERT INTO objects(kind,id,data) VALUES(?,?,?)',['profile',p.id,JSON.stringify(p)]);return profiles;});}
 recordProfileStart(id:string,at=new Date().toISOString()){const profile=this.get<Profile>('profile',id);return this.put('profile',id,{...profile,lastStartedAt:at});}
 saveProxy(raw:ProxyConfig){
   const p=proxySchema.parse(raw),previous=this.proxyWrites.get(p.id);
  const task=(async()=>{if(previous)await previous.catch(()=>{});const {password,originalText,...clean}=p;let effective=password;
   if(effective===undefined&&this.proxies().some(x=>x.id===p.id))effective=(await this.proxy(p.id)).password;
   proxyUrl({...p,password:effective});let encrypted:string|undefined,encryptedOriginal:string|undefined;
   if(originalText!==undefined){const parsed=parseProxyInput(originalText);if(['protocol','host','port','username'].some(key=>(parsed as any)[key]!== (p as any)[key])||parsed.password!==(effective||''))throw new Error('代理原文与连接配置不一致');if(!await this.crypto.isEncryptionAvailable())throw new Error('Windows 加密不可用，无法保存代理原文');encryptedOriginal=(await this.crypto.encryptString(originalText)).toString('base64');}
   if(password){if(!await this.crypto.isEncryptionAvailable())throw new Error('Windows 加密不可用，无法保存代理密码');encrypted=(await this.crypto.encryptString(password)).toString('base64');}
   return this.mutate(()=>{let previous:any;try{previous=this.get<ProxyConfig>('proxy',p.id);}catch{}if(!previous||['host','port','protocol','username','bypass'].some(k=>(previous as any)[k]!== (p as any)[k])||password!==undefined)this.db.run("DELETE FROM objects WHERE kind='proxyObservation' AND id=?",[p.id]);if(password!==undefined){if(encrypted)this.db.run('INSERT OR REPLACE INTO secrets(id,data) VALUES(?,?)',[p.id,encrypted]);else this.db.run('DELETE FROM secrets WHERE id=?',[p.id]);}if(encryptedOriginal)this.db.run("INSERT OR REPLACE INTO objects(kind,id,data) VALUES('proxyOriginal',?,?)",[p.id,JSON.stringify({encrypted:encryptedOriginal})]);else if(password!==undefined||!previous||['host','port','protocol','username'].some(key=>(previous as any)[key]!== (p as any)[key]))this.db.run("DELETE FROM objects WHERE kind='proxyOriginal' AND id=?",[p.id]);const data={...clean,hasPassword:this.hasSecret(p.id)};this.db.run('INSERT OR REPLACE INTO objects(kind,id,data) VALUES(?,?,?)',['proxy',p.id,JSON.stringify(data)]);return data;});
  })();this.proxyWrites.set(p.id,task);const clear=()=>{if(this.proxyWrites.get(p.id)===task)this.proxyWrites.delete(p.id);};void task.then(clear,clear);return task;
 }
 private hasSecret(id:string){const st=this.db.prepare('SELECT id FROM secrets WHERE id=?');st.bind([id]);const found=st.step();st.free();return found;}
 private removeUnusedProxy(id:string){
  if(!id||this.profiles().some(p=>p.proxyId===id)||this.recycled().some(r=>r.profile.proxyId===id))return;
  if(this.proxyWrites.has(id))throw new Error('关联代理正在保存，请完成后删除');
  this.db.run("DELETE FROM objects WHERE kind IN ('proxy','proxyObservation','proxyOriginal') AND id=?",[id]);this.db.run('DELETE FROM secrets WHERE id=?',[id]);
 }
 proxies(){return this.all<ProxyConfig>('proxy');}
 async proxyForEdit(id:string){const p=await this.proxy(id);let record:{encrypted:string}|undefined;try{record=this.get('proxyOriginal',id);}catch{}if(record)p.originalText=await this.crypto.decryptString(Buffer.from(record.encrypted,'base64'));return p;}
 proxyObservations(){return this.all<ProxyObservation>('proxyObservation').filter(o=>this.proxies().some(p=>p.id===o.proxyId));}
 recycled(){return this.all<RecycledEnvironment>('recycle');}
 async purgeAllRecycled(){const results=[];for(const r of this.recycled()){try{await this.purgeEnvironment(r.id);results.push({id:r.id,ok:true});}catch(error){results.push({id:r.id,ok:false,error:error instanceof Error?error.message:String(error)});}}return results;}
 async saveApiKey(key:string){if(!await this.crypto.isEncryptionAvailable())throw new Error('Windows 加密不可用，无法保存 API Key');const encrypted=(await this.crypto.encryptString(key)).toString('base64');this.put('localApiSecret','key',{encrypted});}
 async apiKey(){let encrypted:string;try{encrypted=this.get<{encrypted:string}>('localApiSecret','key').encrypted;}catch{return '';}return this.crypto.decryptString(Buffer.from(encrypted,'base64'));}
 private recycleDir(id:string){if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('回收记录标识无效');return inside(this.root,'trash','environments',id);}
 async proxy(id:string){const p=this.get<ProxyConfig>('proxy',id);const st=this.db.prepare('SELECT data FROM secrets WHERE id=?');st.bind([id]);const encrypted=st.step()?st.getAsObject().data as string:undefined;st.free();if(encrypted)p.password=await this.crypto.decryptString(Buffer.from(encrypted,'base64'));return p;}
 settings():AppState['settings']{let saved:Partial<AppState['settings']>={};try{saved=this.get('settings','app');}catch{}return {view:'list',theme:'system',maxBrowsers:5,automaticUpdates:true,startupDashboard:true,diagnosticLinks:true,inheritEnabledExtensions:true,randomBookmarks:true,...saved,...(!saved.listDefaultV2?{view:'list' as const}:{}),listDefaultV2:true,proxyLocaleDefaultsV1:true,controlledFeatures:{...controlledDefaults(),...saved.controlledFeatures},fingerprintDefaults:{...defaultValues(),...saved.fingerprintDefaults,...(!saved.proxyLocaleDefaultsV1?{geoip:true}:{})}};}
 cloneProfile(id:string){const p=this.get<Profile>('profile',id);const now=new Date().toISOString();const copy=this.copyWithId(p,now);return this.put('profile',copy.id,copy);}
 private copyWithId(p:Profile,now:string){return {...p,id:randomUUID(),name:p.name.slice(0,75)+' · 副本',downloadDir:'',seed:newSeed(),archived:false,createdAt:now,updatedAt:now,lastStartedAt:undefined};}
 async deleteProfile(id:string,now=Date.now(),permanent=false){
  if(this.deleting.has(id))throw new Error('环境正在删除');const profile=this.get<Profile>('profile',id);if(profile.proxyId&&this.proxyWrites.has(profile.proxyId))throw new Error('关联代理正在保存，请完成后删除');this.deleting.add(id);
  const recordId=randomUUID(),dir=this.recycleDir(recordId),moved:Array<[string,string]>=[];
  try{await fs.promises.mkdir(dir,{recursive:true});for(const name of ['profiles','downloads']){const source=inside(this.root,name,id),destination=path.join(dir,name==='profiles'?'browser':'downloads');if(fs.existsSync(source)){await renameWithRetry(source,destination);moved.push([source,destination]);}}
   const record:RecycledEnvironment={id:recordId,profile,deletedAt:new Date(now).toISOString(),expiresAt:new Date(now+3*24*60*60*1000).toISOString(),state:permanent?'purging':'recoverable',hasBrowserData:moved.some(([,p])=>p.endsWith('browser')),hasDownloads:moved.some(([,p])=>p.endsWith('downloads'))};
   try{this.mutate(()=>{this.db.run("DELETE FROM objects WHERE kind='profile' AND id=?",[id]);this.db.run('INSERT INTO objects(kind,id,data) VALUES(?,?,?)',['recycle',recordId,JSON.stringify(record)]);});}catch(error){for(const [source,destination] of moved.reverse())await renameWithRetry(destination,source);throw error;}
   return path.join(dir,'browser');
  }catch(error){if(this.profiles().some(p=>p.id===id))for(const [source,destination] of moved.reverse())if(fs.existsSync(destination)&&!fs.existsSync(source))await renameWithRetry(destination,source);await fs.promises.rmdir(dir).catch(()=>{});throw error;}finally{this.deleting.delete(id);}
 }
 async restoreEnvironment(id:string,now=Date.now()){
  if(this.recycleOperations.has(id))throw new Error('回收记录正在处理');const record=this.get<RecycledEnvironment>('recycle',id);if(record.state!=='recoverable'||Date.parse(record.expiresAt)<=now)throw new Error('已到期或正在彻底删除，不能恢复');if(this.profiles().some(p=>p.id===record.profile.id)||this.deleting.has(record.profile.id))throw new Error('原环境标识已存在或正在操作');
  this.recycleOperations.add(id);this.deleting.add(record.profile.id);const dir=this.recycleDir(id),moved:Array<[string,string]>=[];
  try{for(const [from,to,expected] of [['browser','profiles',record.hasBrowserData],['downloads','downloads',record.hasDownloads]] as const){if(!expected)continue;const source=path.join(dir,from),target=inside(this.root,to,record.profile.id);if(fs.existsSync(target))throw new Error('恢复目标目录已存在，未覆盖任何数据');await renameWithRetry(source,target);moved.push([source,target]);}
   try{this.mutate(()=>{this.db.run('INSERT INTO objects(kind,id,data) VALUES(?,?,?)',['profile',record.profile.id,JSON.stringify(record.profile)]);this.db.run("DELETE FROM objects WHERE kind='recycle' AND id=?",[id]);});}catch(error){for(const [source,target] of moved.reverse())await renameWithRetry(target,source);throw error;}
   await fs.promises.rmdir(dir).catch(()=>{});return record.profile;
  }catch(error){for(const [source,target] of moved.reverse())if(fs.existsSync(target)&&!fs.existsSync(source))await renameWithRetry(target,source);throw error;}finally{this.recycleOperations.delete(id);this.deleting.delete(record.profile.id);}
 }
 async purgeEnvironment(id:string){
  if(this.recycleOperations.has(id))throw new Error('回收记录正在处理');this.recycleOperations.add(id);try{const record=this.get<RecycledEnvironment>('recycle',id);this.put('recycle',id,{...record,state:'purging'});await fs.promises.rm(this.recycleDir(id),{recursive:true,force:true,maxRetries:6,retryDelay:200});const reports=this.all<Report>('report').filter(r=>r.profileId===record.profile.id);for(const report of reports){if(report.outputDir){const relative=path.relative(inside(this.root,'reports'),path.resolve(report.outputDir));if(relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))await fs.promises.rm(inside(this.root,'reports',relative),{recursive:true,force:true,maxRetries:6,retryDelay:200});}}this.mutate(()=>{this.db.run("DELETE FROM objects WHERE kind='recycle' AND id=?",[id]);for(const report of reports)this.db.run("DELETE FROM objects WHERE kind='report' AND id=?",[report.id]);this.removeUnusedProxy(record.profile.proxyId);});}finally{this.recycleOperations.delete(id);}
 }
 async deleteProfilePermanently(id:string){
  await this.deleteProfile(id,Date.now(),true);
  const record=this.recycled().find(r=>r.profile.id===id)!;
  await this.purgeEnvironment(record.id);
  return true;
 }
 async purgeExpired(now=Date.now()){const results=[];for(const r of this.recycled())if(r.state==='purging'||Date.parse(r.expiresAt)<=now){try{await this.purgeEnvironment(r.id);results.push({id:r.id,ok:true});}catch(e){results.push({id:r.id,ok:false,error:String(e)});}}return results;}
 close(){if(this.closed)return;this.db.close();this.closed=true;}
}
