import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import type {Profile} from '../shared/model';
import sites from '../../resources/bookmark-sites.json';
import catalog from '../../resources/bookmark-titles.json';
export const BOOKMARK_COUNT=60;
export function generatedBookmarks(profile:Pick<Profile,'id'|'seed'>){
 let state=createHash('sha256').update(profile.id+':'+profile.seed+':bookmarks-v1').digest().readUInt32LE(0)||1;
 const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
 const pool=[...sites];for(let i=0;i<BOOKMARK_COUNT;i++){const j=i+Math.floor(random()*(pool.length-i));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,BOOKMARK_COUNT).map(domain=>({name:(catalog.sites as Record<string,string>)[domain]||domain,url:'https://'+domain+'/'}));
}
export const bookmarkFolder=(profile:Pick<Profile,'id'>)=>'栖境随机书签 · '+profile.id;
export const bookmarkGuids=(profile:Pick<Profile,'id'>)=>Array.from({length:BOOKMARK_COUNT},(_,i)=>createHash('sha256').update(profile.id+':flat-v2:'+i).digest('base64url').slice(0,12));
const signature=(p:Profile,enabled:boolean,entries:unknown)=>createHash('sha256').update('titles-v3:'+p.id+':'+p.seed+':'+enabled+':'+JSON.stringify(entries)).digest('hex');
// Places URL hashing follows Mozilla HashFunctions.h / Helpers.cpp (MPL-2.0).
// Source: https://github.com/mozilla/gecko-dev ; https://mozilla.org/MPL/2.0/
export function placesUrlHash(url:string){const hash=(s:string)=>{let h=0;for(const c of Buffer.from(s).subarray(0,1500))h=Math.imul(((h<<5)|(h>>>27))^c,0x9e3779b9)>>>0;return h;};return (hash(url.split(':')[0])&0xffff)*4294967296+hash(url);}
async function writeAtomic(file:string,value:string){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.qijing-tmp';await fs.writeFile(tmp,value,{mode:0o600});await fs.rename(tmp,file);}
export async function prepareBookmarks(profile:Profile,profileDir:string,enabled:boolean,binary?:string):Promise<Record<string,string|boolean>>{
 enabled=enabled&&profile.mode==='custom';const marker=path.join(profileDir,'qijing-bookmarks.json');let previous:any;try{previous=JSON.parse(await fs.readFile(marker,'utf8'));}catch{}
 const entries=enabled?generatedBookmarks(profile):[];
 const hash=signature(profile,enabled,entries);if(previous?.signature===hash&&profile.values.engine!=='firefox')return {};
 const folder=bookmarkFolder(profile);
 if(profile.values.engine==='firefox'){
  const dbFile=path.join(profileDir,'places.sqlite');
  if(!enabled&&previous?.bootstrap&&typeof previous.backupFile==='string'&&/^bookmarks-\d{4}-\d{2}-\d{2}\.json$/.test(previous.backupFile)&&!await fs.stat(dbFile).catch(()=>null)){
   const file=path.join(profileDir,'bookmarkbackups',previous.backupFile);let tree:any;try{tree=JSON.parse(await fs.readFile(file,'utf8'));}catch{}
   const children=tree?.children?.[0]?.children;
   if(Array.isArray(children)&&children.length===previous.guids?.length&&children.every((b:any,i:number)=>b.guid===previous.guids[i]))await fs.rm(file,{force:true});
   await writeAtomic(marker,JSON.stringify({signature:hash,folder,profileId:profile.id,enabled:false}));return {'browser.places.importBookmarksHTML':false};
  }
  if(enabled&&!await fs.stat(dbFile).catch(()=>null)){
   if(!binary)throw new Error('首次创建火狐书签需要可用内核');
   // Let Gecko initialize Places and restore a native JSON backup in its single
   // normal launch. Only seed a truly new profile; never replace user backups.
   const backupDir=path.join(profileDir,'bookmarkbackups'),existing=await fs.readdir(backupDir).catch((error:NodeJS.ErrnoException)=>{if(error.code!=='ENOENT')throw error;return [];});
   if(existing.length||await fs.stat(path.join(profileDir,'prefs.js')).catch(()=>null))return {'browser.places.importBookmarksHTML':false,'browser.toolbars.bookmarks.visibility':'always'};
   const guids=bookmarkGuids(profile),type='text/x-moz-place-container',date=new Date(),pad=(n:number)=>String(n).padStart(2,'0'),day=date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
   const backup={guid:'root________',root:'placesRoot',type,children:[{guid:'toolbar_____',root:'toolbarFolder',type,title:'Bookmarks Toolbar',children:entries.map((entry,i)=>({guid:guids[i],type:'text/x-moz-place',title:entry.name,uri:entry.url,dateAdded:Date.now()*1000,lastModified:Date.now()*1000}))}]};
   const backupFile='bookmarks-'+day+'.json';await writeAtomic(path.join(backupDir,backupFile),JSON.stringify(backup));
   await writeAtomic(marker,JSON.stringify({signature:hash,folder,profileId:profile.id,guids,enabled,bootstrap:true,backupFile}));
   return {'browser.places.importBookmarksHTML':false,'browser.toolbars.bookmarks.visibility':'always'};
  }
  try{await fs.access(dbFile);const {DatabaseSync}=await import('node:sqlite');const db=new DatabaseSync(dbFile);try{
   const toolbar=db.prepare("SELECT id FROM moz_bookmarks WHERE guid='toolbar_____'").get() as {id:number}|undefined;if(!toolbar)throw new Error('火狐书签根目录无效，未覆盖');
   const folders=db.prepare('SELECT id FROM moz_bookmarks WHERE type=2 AND title IN (?,?)').all(folder,previous?.folder||folder) as {id:number}[];
   const guids:string[]=[...new Set([...bookmarkGuids(profile),...(Array.isArray(previous?.guids)?previous.guids:[])])];
   const owned=guids.length?db.prepare('SELECT * FROM moz_bookmarks WHERE guid IN ('+guids.map(()=>'?').join(',')+')').all(...guids) as any[]:[];
   let nextGuids=bookmarkGuids(profile);
   if(previous?.signature!==hash||folders.length||enabled&&owned.length!==BOOKMARK_COUNT){
    db.exec('BEGIN IMMEDIATE');try{
     const remove=(b:any)=>{if(b.fk)db.prepare('UPDATE moz_places SET foreign_count=MAX(0,foreign_count-1) WHERE id=?').run(b.fk);if(b.syncStatus===0&&db.prepare("SELECT name FROM sqlite_master WHERE name='moz_bookmarks_deleted'").get())db.prepare('INSERT OR IGNORE INTO moz_bookmarks_deleted(guid,dateRemoved) VALUES (?,?)').run(b.guid,Date.now()*1000);db.prepare('DELETE FROM moz_bookmarks WHERE id=?').run(b.id);};
     const parents=new Set<number>([toolbar.id]);
     for(const b of owned){parents.add(b.parent);remove(b);}
     for(const item of folders){
      const children=db.prepare('SELECT * FROM moz_bookmarks WHERE parent=?').all(item.id) as any[];
      // Preserve additions inside the legacy software folder during migration.
      for(const b of children){const place=b.fk?db.prepare('SELECT url FROM moz_places WHERE id=?').get(b.fk) as {url:string}|undefined:undefined;let domain='';try{domain=new URL(place?.url||'').hostname;}catch{}
       if(b.type===1&&b.title===domain&&sites.includes(domain))remove(b);
       else db.prepare('UPDATE moz_bookmarks SET parent=?,position=100000+id,syncChangeCounter=syncChangeCounter+1 WHERE id=?').run(toolbar.id,b.id);
      }
      const legacy=db.prepare('SELECT * FROM moz_bookmarks WHERE id=?').get(item.id);if(legacy)remove(legacy);
     }
     const children=db.prepare('SELECT id FROM moz_bookmarks WHERE parent=? ORDER BY position,id').all(toolbar.id) as {id:number}[];
     nextGuids=[];
     if(enabled){const now=Date.now()*1000,guid=()=>randomBytes(9).toString('base64url');const insert=db.prepare('INSERT INTO moz_bookmarks(type,fk,parent,position,title,dateAdded,lastModified,guid,syncStatus,syncChangeCounter) VALUES (?,?,?,?,?,?,?,?,1,1)');
      entries.forEach((e,i)=>{let place=db.prepare('SELECT id FROM moz_places WHERE url_hash=? AND url=?').get(placesUrlHash(e.url),e.url) as {id:number}|undefined;if(!place){const id=Number(db.prepare('INSERT INTO moz_places(url,title,rev_host,guid,foreign_count,url_hash) VALUES (?,?,?,?,0,?)').run(e.url,e.name,new URL(e.url).hostname.split('').reverse().join('')+'.',guid(),placesUrlHash(e.url)).lastInsertRowid);place={id};}const id=bookmarkGuids(profile)[i];nextGuids.push(id);insert.run(1,place.id,toolbar.id,children.length+i,e.name,now,now,id);db.prepare('UPDATE moz_places SET foreign_count=foreign_count+1 WHERE id=?').run(place.id);});
     }
     for(const parent of parents){const ordered=db.prepare('SELECT id,position FROM moz_bookmarks WHERE parent=? ORDER BY position,id').all(parent) as {id:number;position:number}[];ordered.forEach((c,i)=>{if(c.position!==i)db.prepare('UPDATE moz_bookmarks SET position=?,syncChangeCounter=syncChangeCounter+1 WHERE id=?').run(i,c.id);});db.prepare('UPDATE moz_bookmarks SET syncChangeCounter=syncChangeCounter+1 WHERE id=?').run(parent);}
     db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
   }
   const htmlFile=path.join(profileDir,'bookmarks.html');const oldHtml=await fs.readFile(htmlFile,'utf8').catch(()=>'');if(oldHtml.includes('<!-- qijing-generated-bookmarks -->'))await fs.rm(htmlFile,{force:true});
   await writeAtomic(marker,JSON.stringify({signature:hash,folder,profileId:profile.id,guids:nextGuids,enabled}));return {'browser.places.importBookmarksHTML':false,...(enabled?{'browser.toolbars.bookmarks.visibility':'always'}:{})};
  }finally{db.close();}}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  return {'browser.places.importBookmarksHTML':false};
 }
 const file=path.join(profileDir,'Default','Bookmarks');let value:any;
 try{value=JSON.parse(await fs.readFile(file,'utf8'));if(!value.roots?.bookmark_bar?.children)throw new Error('书签文件结构无效，未覆盖');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;value={version:1,roots:{bookmark_bar:{type:'folder',id:'1',name:'Bookmarks bar',children:[]},other:{type:'folder',id:'2',name:'Other bookmarks',children:[]},synced:{type:'folder',id:'3',name:'Mobile bookmarks',children:[]}}};}
 const bar=value.roots.bookmark_bar;
 const clean=(n:any)=>{if(n.children)n.children=n.children.flatMap((c:any)=>{const owned=c.meta_info?.qijingProfile&&([profile.id,previous?.profileId].includes(c.meta_info.qijingProfile)||c.name===previous?.folder);if(!owned){clean(c);return [c];}if(c.type!=='folder')return [];return (c.children||[]).filter((b:any)=>{let domain='';try{domain=new URL(b.url).hostname;}catch{}return !(b.type==='url'&&b.name===domain&&sites.includes(domain));});});};Object.values(value.roots).forEach(clean);
 let max=3;const scan=(n:any)=>{max=Math.max(max,Number(n.id)||0);n.children?.forEach(scan);};Object.values(value.roots).forEach(scan);
 if(entries.length){const now=String(BigInt(Date.now())*1000n+11644473600000000n);bar.children.push(...entries.map(e=>({type:'url',id:String(++max),name:e.name,url:e.url,date_added:now,meta_info:{qijingProfile:profile.id}})));}
 delete value.checksum;await writeAtomic(file,JSON.stringify(value));await writeAtomic(marker,JSON.stringify({signature:hash,folder,profileId:profile.id,enabled}));return {};
}
