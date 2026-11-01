import initSqlJs, {type Database} from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID,randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import type {Profile,ProxyConfig,Kernel,Extension,Report,AppState} from '../shared/model';
import {defaultValues} from '../shared/model';
const moduleRequire=createRequire(typeof __filename==='string'?__filename:path.join(process.cwd(),'package.json'));
export function inside(root:string,...parts:string[]){const target=path.resolve(root,...parts);const relative=path.relative(path.resolve(root),target);if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('路径超出工作空间');return target;}
export function newSeed(){return (randomBytes(8).readBigUInt64BE()||1n).toString();}
export interface CryptoStore {encryptString(s:string):Buffer|Promise<Buffer>;decryptString(b:Buffer):string|Promise<string>;isEncryptionAvailable():boolean|Promise<boolean>}
export class Store {
 readonly deleting=new Set<string>();
 private db!:Database;private sql!:Awaited<ReturnType<typeof initSqlJs>>;private dbPath:string;private closed=false;
 constructor(public root:string,private crypto:CryptoStore){this.dbPath=path.join(root,'qijing.sqlite');}
 async init(){fs.mkdirSync(this.root,{recursive:true});for(const d of ['profiles','downloads','kernels','reports','devices','components','extensions','trash','upgrade-tests'])fs.mkdirSync(path.join(this.root,d),{recursive:true});this.sql=await initSqlJs({locateFile:()=>moduleRequire.resolve('sql.js/dist/sql-wasm.wasm')});this.db=fs.existsSync(this.dbPath)?new this.sql.Database(fs.readFileSync(this.dbPath)):new this.sql.Database();this.db.run('CREATE TABLE IF NOT EXISTS objects(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS secrets(id TEXT PRIMARY KEY,data TEXT NOT NULL); PRAGMA user_version=1;');this.persist();}
 private persist(){const tmp=this.dbPath+'.tmp';try{fs.writeFileSync(tmp,this.db.export(),{mode:0o600});const handle=fs.openSync(tmp,'r+');try{fs.fsyncSync(handle);}finally{fs.closeSync(handle);}fs.renameSync(tmp,this.dbPath);}catch(error){try{fs.unlinkSync(tmp);}catch{}throw error;}}
 private mutate<T>(operation:()=>T):T {if(this.closed)throw new Error('数据库已关闭');const before=this.db.export();try{const result=operation();this.persist();return result;}catch(error){this.db.close();this.db=new this.sql.Database(before);throw error;}}
 all<T>(kind:string):T[]{const st=this.db.prepare('SELECT data FROM objects WHERE kind=? ORDER BY rowid DESC');st.bind([kind]);const result:T[]=[];while(st.step())result.push(JSON.parse(st.getAsObject().data as string));st.free();return result;}
 get<T>(kind:string,id:string):T {const st=this.db.prepare('SELECT data FROM objects WHERE kind=? AND id=?');st.bind([kind,id]);const found=st.step()?JSON.parse(st.getAsObject().data as string):null;st.free();if(!found)throw new Error('记录不存在或已删除');return found;}
 put<T>(kind:string,id:string,value:T){return this.mutate(()=>{this.db.run('INSERT INTO objects(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data',[kind,id,JSON.stringify(value)]);return value;});}
 remove(kind:string,id:string){this.mutate(()=>{this.db.run('DELETE FROM objects WHERE kind=? AND id=?',[kind,id]);if(kind==='proxy')this.db.run('DELETE FROM secrets WHERE id=?',[id]);});}
 profiles(){return this.all<Profile>('profile').map(p=>({...p,values:{...defaultValues(),...p.values}}));} kernels(){return this.all<Kernel>('kernel');} extensions(){return this.all<Extension>('extension');} reports(){return this.all<Report>('report').slice(0,100);}
 createProfiles(profiles:Profile[]){return this.mutate(()=>{for(const p of profiles)this.db.run('INSERT INTO objects(kind,id,data) VALUES(?,?,?)',['profile',p.id,JSON.stringify(p)]);return profiles;});}
 async saveProxy(p:ProxyConfig){const {password,...clean}=p;let encrypted:string|undefined;if(password){if(!await this.crypto.isEncryptionAvailable())throw new Error('Windows 加密不可用，无法保存代理密码');encrypted=(await this.crypto.encryptString(password)).toString('base64');}return this.mutate(()=>{if(password!==undefined){if(encrypted)this.db.run('INSERT OR REPLACE INTO secrets(id,data) VALUES(?,?)',[p.id,encrypted]);else this.db.run('DELETE FROM secrets WHERE id=?',[p.id]);}const data={...clean,hasPassword:this.hasSecret(p.id)};this.db.run('INSERT OR REPLACE INTO objects(kind,id,data) VALUES(?,?,?)',['proxy',p.id,JSON.stringify(data)]);return data;});}
 private hasSecret(id:string){const st=this.db.prepare('SELECT id FROM secrets WHERE id=?');st.bind([id]);const found=st.step();st.free();return found;}
 proxies(){return this.all<ProxyConfig>('proxy');}
 async proxy(id:string){const p=this.get<ProxyConfig>('proxy',id);const st=this.db.prepare('SELECT data FROM secrets WHERE id=?');st.bind([id]);const encrypted=st.step()?st.getAsObject().data as string:undefined;st.free();if(encrypted)p.password=await this.crypto.decryptString(Buffer.from(encrypted,'base64'));return p;}
 settings():AppState['settings']{let saved:Partial<AppState['settings']>={};try{saved=this.get('settings','app');}catch{}return {view:'cards',theme:'system',maxBrowsers:5,automaticUpdates:true,...saved,proxyLocaleDefaultsV1:true,fingerprintDefaults:{...defaultValues(),...saved.fingerprintDefaults,...(!saved.proxyLocaleDefaultsV1?{geoip:true}:{})}};}
 cloneProfile(id:string){const p=this.get<Profile>('profile',id);const now=new Date().toISOString();const copy=this.copyWithId(p,now);return this.put('profile',copy.id,copy);}
 private copyWithId(p:Profile,now:string){return {...p,id:randomUUID(),name:p.name.slice(0,75)+' · 副本',downloadDir:'',seed:newSeed(),archived:false,createdAt:now,updatedAt:now};}
 async deleteProfile(id:string){if(this.deleting.has(id))throw new Error('环境正在删除');this.get('profile',id);this.deleting.add(id);const dir=inside(this.root,'profiles',id);let recycled:string|undefined;try{if(fs.existsSync(dir)){recycled=inside(this.root,'trash',`${id}-${Date.now()}`);for(let attempt=0;;attempt++){try{await fs.promises.rename(dir,recycled);break;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes((error as NodeJS.ErrnoException).code||'')||attempt>=6)throw error;await new Promise(r=>setTimeout(r,100*(attempt+1)));}}}try{this.remove('profile',id);return recycled;}catch(error){if(recycled)await fs.promises.rename(recycled,dir);throw error;}}finally{this.deleting.delete(id);}}
 close(){if(this.closed)return;this.db.close();this.closed=true;}
}
