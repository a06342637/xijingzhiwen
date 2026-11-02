import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Store} from './store';
import {newProfile} from '../shared/model';
import {launchFirefox} from './firefox';

// Maintainer-only smoke: author script reads CSS preferences in its native realm.
export async function verifyFirefoxAppearance(store:Store,output:string){
 const kernel=store.kernels().find(k=>k.engine==='firefox');if(!kernel)throw new Error('主题检查需要已安装 Firefox 内核');
 const server=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Firefox preference check</title><pre id="observed"></pre><script>document.querySelector("#observed").textContent=JSON.stringify({dark:matchMedia("(prefers-color-scheme: dark)").matches,light:matchMedia("(prefers-color-scheme: light)").matches,reduce:matchMedia("(prefers-reduced-motion: reduce)").matches});</script>');});
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,resolve);});
 const port=(server.address() as {port:number}).port;
 const profile=newProfile(randomUUID(),'123456',kernel.id);profile.name='Firefox appearance verification';Object.assign(profile.values,{engine:'firefox',brand:'Firefox',geoip:false,'reduced-motion':'true'});
 const directory=path.join(store.root,'profiles',profile.id),observations:any[]=[];let context:any;
 try{
  for(const scheme of ['dark','light','native']){
   profile.values.colorScheme=scheme;
   context=await launchFirefox(profile,kernel.path,directory+'-'+scheme,kernel.version);
   const pages=[context.pages()[0],await context.newPage()];
   let original:unknown;
   for(const [pageIndex,page] of pages.entries())for(const host of ['127.0.0.1','localhost','127.0.0.1']){
    await page.goto(`http://${host}:${port}/check`,{waitUntil:'load'});
    const observed=JSON.parse(await page.locator('#observed').innerText());
    assert.equal(observed.reduce,true);
    assert.equal(observed.dark!==observed.light,true);
    if(scheme!=='native')assert.equal(observed.dark,scheme==='dark');
    else if(original===undefined)original=observed.dark;else assert.equal(observed.dark,original);
    observations.push({scheme,pageIndex,host,observed});
   }
   await context.close();context=undefined;
  }
  await fs.writeFile(path.join(output,'firefox-appearance.json'),JSON.stringify(observations,null,2));
  return {name:'Firefox 深浅色 / 原生重置 / 跨站导航及新页面',passed:true};
 }finally{await context?.close().catch(()=>{});server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
