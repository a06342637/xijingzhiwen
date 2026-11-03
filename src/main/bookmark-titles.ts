import {decodeHTML} from 'entities';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {ProxyConfig} from '../shared/model';
import {proxyUrl} from '../shared/config';

export function websiteTitle(body:Uint8Array,contentType=''){
 const head=new TextDecoder().decode(body.subarray(0,4096));const charset=contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1]||head.match(/<meta\b[^>]*charset\s*=\s*["']?([^\s;"'/>]+)/i)?.[1]||'utf-8';
 let html:string;try{html=new TextDecoder(charset).decode(body);}catch{html=new TextDecoder().decode(body);}
 const title=html.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi,'').match(/<title\b[^>]*>([^]*?)<\/title\s*>/i)?.[1];
 if(!title)return '';
 const text=decodeHTML(title).replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);
 return /^(?:just a moment|access denied|attention required|403 forbidden|404 not found|502 bad gateway|error|robot or human|verify you are human|your request has been blocked|request rejected|checking your browser)/i.test(text)?'':text;
}
type Entry={name:string;url:string};
type TitleLookup=(url:string)=>Promise<string>;
export async function rememberBookmarkTitle(url:string,title:string,entries:Entry[],directory:string){
 let current:URL;try{current=new URL(url);}catch{return;}
 if(current.pathname!=='/'||current.search)return;
 const entry=entries.find(e=>{const host=new URL(e.url).hostname.replace(/^www\./,'');return current.hostname.replace(/^www\./,'')===host;});if(!entry)return;
 const clean=title.replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,180);if(!clean||!websiteTitle(Buffer.from('<title>'+clean.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</title>')))return;
 const file=path.join(directory,'qijing-bookmark-titles.json');let value:any={titles:{}};try{value=JSON.parse(await fs.readFile(file,'utf8'));}catch{}value.titles||={};value.titles[entry.url]={title:clean,at:Date.now()};const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify(value),{mode:0o600});await fs.rename(tmp,file);
}
export async function resolveBookmarkTitles(entries:Entry[],directory:string,proxy?:ProxyConfig,lookup?:TitleLookup){
 const file=path.join(directory,'qijing-bookmark-titles.json');let cached:Record<string,{title:string;at:number}>={};try{cached=JSON.parse(await fs.readFile(file,'utf8')).titles||{};}catch{}
 let context:Awaited<ReturnType<(typeof import('playwright-core'))['request']['newContext']>>|undefined;
 const now=Date.now();const pending=entries.filter(e=>!cached[e.url]||now-cached[e.url].at>(cached[e.url].title?7*86400000:86400000));
 if(pending.length&&!lookup){const {request}=await import('playwright-core');try{context=await request.newContext({timeout:6000,ignoreHTTPSErrors:false,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/155.0.0.0 Safari/537.36',...(proxy?{proxy:{server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined}}:{})});}catch{return entries.map(e=>({...e,name:cached[e.url]?.title||new URL(e.url).hostname}));}}
 const fetchTitle:TitleLookup=lookup||(async url=>{const response=await context!.get(url,{maxRedirects:5,timeout:6000});try{if(!response.ok()||!/text\/html|application\/xhtml/i.test(response.headers()['content-type']||'')||Number(response.headers()['content-length']||0)>1024*1024)return '';const body=await response.body();return body.length>1024*1024?'':websiteTitle(body,response.headers()['content-type']);}finally{await response.dispose();}});
 let cursor=0;
 try{await Promise.all(Array.from({length:Math.min(10,pending.length)},async()=>{for(;;){const item=pending[cursor++];if(!item)return;let title='';try{title=await fetchTitle(item.url);}catch{}cached[item.url]={title:title||cached[item.url]?.title||'',at:now};}}));}finally{await context?.dispose();}
 const current=Object.fromEntries(entries.map(e=>[e.url,cached[e.url]]));await fs.mkdir(directory,{recursive:true});const tmp=file+'.tmp';await fs.writeFile(tmp,JSON.stringify({titles:current}),{mode:0o600});await fs.rename(tmp,file);
 return entries.map(e=>({...e,name:current[e.url]?.title||new URL(e.url).hostname}));
}
