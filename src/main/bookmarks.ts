import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import type {Profile} from '../shared/model';
import sites from '../../resources/bookmark-sites.json';
export const BOOKMARK_COUNT=60;
export function generatedBookmarks(profile:Pick<Profile,'id'|'seed'>){
 let state=createHash('sha256').update(profile.id+':'+profile.seed+':bookmarks-v1').digest().readUInt32LE(0)||1;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 const pool=[...sites];for(let i=0;i<BOOKMARK_COUNT;i++){const j=i+Math.floor(random()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,BOOKMARK_COUNT).map(domain=>({name:domain,url:'https://'+domain+'/'}));
}
export const bookmarkFolder=(profile:Pick<Profile,'id'>)=>'栖境随机书签 · '+profile.id;
const signature=(p:Profile,enabled:boolean)=>createHash('sha256').update(p.id+':'+p.seed+':'+enabled+':'+JSON.stringify(sites)).digest('hex');
// Places URL hashing follows Mozilla HashFunctions.h / Helpers.cpp (MPL-2.0).
// Source: https://github.com/mozilla/gecko-dev ; https://mozilla.org/MPL/2.0/
export function placesUrlHash(url:string){const hash=(s:string)=>{let h=0;for(const c of Buffer.from(s).subarray(0,1500))h=Math.imul(((h<<5)|(h>>>27))^c,0x9e3779b9)>>>0;return h;};return (hash(url.split(':')[0])&0xffff)*4294967296+hash(url);}
async function writeAtomic(file:string,value:string){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.qijing-tmp';await fs.writeFile(tmp,value,{mode:0o600});await fs.rename(tmp,file);}
export async function prepareBookmarks(profile:Profile,profileDir:string,enabled:boolean,binary?:string):Promise<Record<string,string|boolean>>{
 enabled=enabled&&profile.mode==='custom';const marker=path.join(profileDir,'qijing-bookmarks.json');let previous:any;try{previous=JSON.parse(await fs.readFile(marker,'utf8'));}catch{}
 const hash=signature(profile,enabled);if(previous?.signature===hash&&profile.values.engine!=='firefox')return {};
 const folder=bookmarkFolder(profile),entries=enabled?generatedBookmarks(profile):[];
 if(profile.values.engine==='firefox'){
  const dbFile=path.join(profileDir,'places.sqlite');
  if(enabled&&!await fs.stat(dbFile).catch(()=>null)){
   if(!binary)throw new Error('首次创建火狐书签需要可用内核');
   // Initialize the browser's own schema in an empty profile. No sites are visited.
   const {firefox}=await import('playwright-firefox-driver');const env={...process.env};for(const key of Object.keys(env))if(/^CAMOU_(CONFIG|PREFS)_/.test(key))delete env[key];
   const context=await firefox.launchPersistentContext(profileDir,{executablePath:binary,headless:true,timeout:60000,env,firefoxUserPrefs:{'browser.places.importBookmarksHTML':false,'browser.bookmarks.testing.skipDefaultBookmarksImport':true,'network.proxy.type':0,'network.dns.disablePrefetch':true,'network.predictor.enabled':false,'browser.newtabpage.enabled':false,'browser.startup.page':0,'browser.startup.homepage':'about:blank','network.offline':true}});await context.close();
  }
  try{await fs.access(dbFile);const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(dbFile);try{
   const folders=db.prepare('SELECT id FROM moz_bookmarks WHERE type=2 AND title IN (?,?)').all(folder,previous?.folder||folder) as {id:number}[];
   if((enabled||folders.length>0)&&(previous?.signature!==hash||(enabled&&folders.length!==1))){
    db.exec('BEGIN IMMEDIATE');try{
     for(const item of folders){const owned=db.prepare('WITH RECURSIVE owned(id) AS (SELECT ? UNION ALL SELECT b.id FROM moz_bookmarks b JOIN owned o ON b.parent=o.id) SELECT b.* FROM moz_bookmarks b JOIN owned o ON b.id=o.id').all(item.id) as any[];
      for(const b of owned){if(b.fk)db.prepare('UPDATE moz_places SET foreign_count=MAX(0,foreign_count-1) WHERE id=?').run(b.fk);if(b.syncStatus===0&&db.prepare("SELECT name FROM sqlite_master WHERE name='moz_bookmarks_deleted'").get())db.prepare('INSERT OR IGNORE INTO moz_bookmarks_deleted(guid,dateRemoved) VALUES (?,?)').run(b.guid,Date.now()*1000);db.prepare('DELETE FROM moz_bookmarks WHERE id=?').run(b.id);}
     }
     const toolbar=db.prepare("SELECT id FROM moz_bookmarks WHERE guid='toolbar_____'").get() as {id:number}|undefined;if(!toolbar)throw new Error('火狐书签根目录无效，未覆盖');
     const children=db.prepare('SELECT id FROM moz_bookmarks WHERE parent=? ORDER BY position,id').all(toolbar.id) as {id:number}[];children.forEach((c,i)=>db.prepare('UPDATE moz_bookmarks SET position=? WHERE id=?').run(i,c.id));
     if(enabled){const now=Date.now()*1000,guid=()=>randomBytes(9).toString('base64url');const insert=db.prepare('INSERT INTO moz_bookmarks(type,fk,parent,position,title,dateAdded,lastModified,guid,syncStatus,syncChangeCounter) VALUES (?,?,?,?,?,?,?,?,1,1)');const folderId=Number(insert.run(2,null,toolbar.id,children.length,folder,now,now,guid()).lastInsertRowid);
      entries.forEach((e,i)=>{let place=db.prepare('SELECT id FROM moz_places WHERE url_hash=? AND url=?').get(placesUrlHash(e.url),e.url) as {id:number}|undefined;if(!place){const id=Number(db.prepare('INSERT INTO moz_places(url,title,rev_host,guid,foreign_count,url_hash) VALUES (?,?,?,?,0,?)').run(e.url,e.name,e.name.split('').reverse().join('')+'.',guid(),placesUrlHash(e.url)).lastInsertRowid);place={id};}insert.run(1,place.id,folderId,i,e.name,now,now,guid());db.prepare('UPDATE moz_places SET foreign_count=foreign_count+1 WHERE id=?').run(place.id);});
     }
     db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
   }
   const htmlFile=path.join(profileDir,'bookmarks.html');const oldHtml=await fs.readFile(htmlFile,'utf8').catch(()=>'');if(oldHtml.includes('<!-- qijing-generated-bookmarks -->'))await fs.rm(htmlFile,{force:true});
   await writeAtomic(marker,JSON.stringify({signature:hash,folder,enabled}));return {'browser.places.importBookmarksHTML':false,...(enabled?{'browser.toolbars.bookmarks.visibility':'always'}:{})};
  }finally{db.close();}}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  return {'browser.places.importBookmarksHTML':false};
 }
 const file=path.join(profileDir,'Default','Bookmarks');let value:any;
 try{value=JSON.parse(await fs.readFile(file,'utf8'));if(!value.roots?.bookmark_bar?.children)throw new Error('书签文件结构无效，未覆盖');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;value={version:1,roots:{bookmark_bar:{type:'folder',id:'1',name:'Bookmarks bar',children:[]},other:{type:'folder',id:'2',name:'Other bookmarks',children:[]},synced:{type:'folder',id:'3',name:'Mobile bookmarks',children:[]}}};}
 const bar=value.roots.bookmark_bar;bar.children=bar.children.filter((n:any)=>n.meta_info?.qijingProfile!==profile.id&&!(n.meta_info?.qijingProfile&&n.name===previous?.folder));
 let max=3;const scan=(n:any)=>{max=Math.max(max,Number(n.id)||0);n.children?.forEach(scan);};Object.values(value.roots).forEach(scan);
 if(entries.length){const now=String(BigInt(Date.now())*1000n+11644473600000000n);bar.children.push({type:'folder',id:String(++max),name:folder,date_added:now,date_modified:now,meta_info:{qijingProfile:profile.id},children:entries.map(e=>({type:'url',id:String(++max),name:e.name,url:e.url,date_added:now}))});}
 delete value.checksum;await writeAtomic(file,JSON.stringify(value));await writeAtomic(marker,JSON.stringify({signature:hash,folder,enabled}));return {};
}
