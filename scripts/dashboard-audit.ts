// Maintainer-only regression audit; fixed site responses never enter the product.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import initSqlJs from 'sql.js';
import {newProfile} from '../src/shared/model';
import {changeEngine} from '../src/renderer/device-editor';
import {PROBE} from '../src/main/probe';

const engine=process.argv[2]||'chromium',root=path.resolve('.verification/dashboard-audit-local/'+engine+'-'+Date.now());await fs.mkdir(root,{recursive:true});
const SQL=await initSqlJs(),db=new SQL.Database(await fs.readFile('.test-data/qijing.sqlite'));const kernels=(db.exec("SELECT data FROM objects WHERE kind='kernel'")[0]?.values||[]).map(r=>JSON.parse(String(r[0])));db.close();
const kernel=kernels.find(k=>(k.engine||'chromium')===engine&&(engine==='firefox'||k.arch===process.arch));assert.ok(kernel);
const profile=newProfile(randomUUID(),'88192031567812',kernel.id);profile.name='新功能本地复查';if(engine==='firefox')profile.values=changeEngine(profile.values,'firefox');
const extension=String.raw`
 if(action==='auditSetup'){
  context.on('page',p=>p.on('pageerror',error=>auditErrors.push(safeError(error))));
  await context.route('https://who.1ms.dog/**',route=>route.fulfill({contentType:'text/html',body:'<div id="mGrade" title="48 / 100">Grade D</div><div id="checks">'+Array.from({length:12},(_,i)=>'<div class="ckr st-ok"><span class="ck-l">Check '+i+'</span><span class="ck-v">observed</span></div>').join('')+'</div>'}));
  await context.route('https://browserleaks.com/**',route=>route.fulfill({contentType:'text/html',body:'<table class="wb"><tr><td>IP Address</td><td>192.0.2.22</td></tr><tr><td>Country</td><td>Test</td></tr></table><button id="dns-run" onclick="document.querySelector(\'#dns-test\').textContent=\'Found 1 Servers, 1 ISP, 1 Location\'">Run</button><div id="dns-test"></div><div id="dns-container"><table><tr><td>1.1.1.1</td><td>DNS</td><td>Test</td></tr></table></div><div id="rtc-leak">No Leak</div><div id="rtc-local">-</div><div id="rtc-public">-</div>'}));
  await context.route('https://bot.sannysoft.com/**',route=>route.fulfill({contentType:'text/html',body:'<table>'+Array.from({length:8},(_,i)=>'<tr><td>Test '+i+'</td><td class="result passed">passed</td></tr>').join('')+'</table>'}));
  await context.route('https://abrahamjuliot.github.io/**',route=>route.fulfill({contentType:'text/html',body:'<div class="like-headless-rating">0% like headless</div><div class="headless-rating">0% headless</div><div class="stealth-rating">0% stealth</div>'}));
  dashboard=await launchDashboard(context,{profileName:profile.name,engine:profile.values.engine,kernelVersion:kernel.version,architecture:kernel.arch,proxy:false},async p=>{await pageReady.get(p);},safeError);
  return true;
 }
 if(action==='auditState')return {state:dashboard.local.state(),pages:context.pages().map(p=>p.url()),errors:auditErrors};
 if(action==='auditReload'){await dashboard.page.reload({waitUntil:'load'});return true;}
 if(action==='auditRefresh'){await dashboard.page.bringToFront();await dashboard.page.locator('#refresh').click();return true;}
 if(action==='auditProbeHang'){
  await context.route(dashboard.local.url+'/probe.js',async route=>{const response=await route.fetch();const text=(await response.text()).replace(__PROBE_LITERAL__,'new Promise(()=>{})');await route.fulfill({response,body:text});});return true;
 }
 if(action==='auditProbeRestore'){await context.unroute(dashboard.local.url+'/probe.js');return true;}
 if(action==='auditSlow'){await context.route('https://who.1ms.dog/**',async route=>{await new Promise(r=>setTimeout(r,4000));await route.fulfill({contentType:'text/html',body:'slow test'}).catch(()=>{});});return true;}
 if(action==='auditSlowRestore'){await context.unroute('https://who.1ms.dog/**');await context.route('https://who.1ms.dog/**',route=>route.fulfill({contentType:'text/html',body:'<div id="mGrade" title="100 / 100">Grade A+</div><div id="checks">'+Array.from({length:12},(_,i)=>'<div class="ckr st-ok"><span class="ck-l">Check '+i+'</span><span class="ck-v">observed</span></div>').join('')+'</div>'}));return true;}
 if(action==='auditRtcLeak'){
  await context.route('https://browserleaks.com/webrtc',route=>route.fulfill({contentType:'text/html',body:'<table><tr><td>WebRTC Leak Test</td><td id="rtc-leak">No Local IP Leak</td></tr><tr class="rtc-leak-tr"><td>WebRTC IP doesn\'t match your Remote IP</td></tr></table><span id="rtc-public">203.0.113.7</span>'}));return true;
 }
 if(action==='auditReturn'){await dashboard.page.goto(dashboard.local.url,{waitUntil:'load'});return true;}
 if(action==='auditOpenFail'){
  await context.route('https://who.1ms.dog/**',route=>route.fulfill({status:503,body:'unavailable'}));
  await dashboard.page.bringToFront();await dashboard.page.locator('.source').first().getByRole('button',{name:'打开原检测站'}).click();await dashboard.page.waitForFunction(()=>Boolean(document.querySelector('#action-error')?.textContent),undefined,{timeout:15000});const message=await dashboard.page.locator('#action-error').innerText();for(const p of context.pages())if(p!==dashboard.page)await p.close();return message;
 }
 if(action==='auditExport'){await dashboard.page.locator('a[download]').click();return true;}
 if(action==='auditView'){
  if(payload.width)await dashboard.page.setViewportSize({width:payload.width,height:payload.height||720});
  await dashboard.page.waitForTimeout(1800);await dashboard.page.evaluate(()=>document.fonts.ready);
  if(payload.screenshot)await dashboard.page.screenshot({path:payload.screenshot,fullPage:true});
  return await dashboard.page.evaluate(()=>({body:document.body.innerText,width:innerWidth,contentWidth:document.documentElement.scrollWidth,font:document.fonts.check('14px QijingDashboard'),refreshDisabled:document.querySelector('#refresh').disabled}));
 }
 if(action==='auditConnection'){await dashboard.local.close();await dashboard.page.bringToFront();await dashboard.page.waitForFunction(()=>document.body.innerText.includes('本地检测服务已关闭'),undefined,{timeout:10000});return await dashboard.page.locator('body').innerText();}
 if(action==='auditNavigate'){await dashboard.page.goto('about:blank');await dashboard.page.waitForTimeout(800);return {state:dashboard.local.state(),pages:context.pages().map(p=>p.url()),url:dashboard.local.url};}
`.replace('__PROBE_LITERAL__',JSON.stringify(PROBE));
const source=(await fs.readFile('src/main/browser-worker.ts','utf8')).replace('let resolvedGeo:unknown;', 'let auditErrors=[];let resolvedGeo:unknown;').replace(" if(action==='start')",extension+" if(action==='start')");const worker=path.join(root,'worker.cjs');await build({stdin:{contents:source,resolveDir:path.resolve('src/main'),loader:'ts'},outfile:worker,bundle:true,platform:'node',format:'cjs',packages:'external'});
const child=fork(worker,[],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});child.stdout?.resume();child.stderr?.resume();const pending=new Map<string,any>();child.on('message',(m:any)=>{const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.ok?p.resolve(m.result):p.reject(new Error(m.error));}});child.on('exit',()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('worker exited'));}pending.clear();});
const rpc=(action:string,payload:any={},timeout=45000)=>new Promise<any>((resolve,reject)=>{const id=randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(new Error(action+' timed out'));},timeout);pending.set(id,{resolve,reject,timer});child.send({id,action,payload});});
const waitComplete=async(previous?:string)=>{for(let i=0;i<150;i++){const s=await rpc('auditState');if(s.pages.length===1&&s.state.phase==='complete'&&s.state.observation&&s.state.observationStatus!=='running'&&(!previous||s.state.startedAt!==previous))return s;await new Promise(r=>setTimeout(r,200));}throw new Error('completion timed out');};
const result:any={engine,kernel:kernel.version,architecture:kernel.arch,checks:[]};
try{
 await rpc('start',{profile,kernel,profileDir:path.join(root,'profile-'+profile.id),downloadDir:path.join(root,'downloads'),extensions:[],blank:true});await rpc('auditSetup');
 result.first=await waitComplete();assert.equal(result.first.pages.length,1);assert.equal(result.first.state.sources[0].grade,'D');assert.equal(result.first.errors.length,0);result.checks.push('fixed collectors complete without page JS errors');
 for(let i=0;i<3;i++){const previous=(await rpc('auditState')).state.startedAt;await rpc('auditReload');const s=await waitComplete(previous);assert.equal(s.pages.length,1);assert.equal(s.state.sources.filter((s:any)=>s.status==='complete').length,4);}result.checks.push('three reloads: no extra browsers/tabs');
 await rpc('auditExport');await new Promise(r=>setTimeout(r,1000));const files=await fs.readdir(path.join(root,'downloads'));const jsonFile=files.find(f=>f.endsWith('.json'));assert.ok(jsonFile,'browser export must save actual report');const exported=JSON.parse(await fs.readFile(path.join(root,'downloads',jsonFile),'utf8'));assert.equal(exported.profileName,profile.name);assert.equal(exported.sources.length,4);assert.equal(exported.identity.ip,'192.0.2.22');result.checks.push('actual browser JSON export to isolated download directory');
 for(const width of [375,768,1280]){const view=await rpc('auditView',{width,screenshot:path.join(root,'page-'+width+'.png')});assert.ok(view.font);assert.ok(view.contentWidth<=view.width,'dashboard must not overflow '+width);result.checks.push('responsive width '+width);}
 await rpc('auditRtcLeak');const rtcBefore=(await rpc('auditState')).state.startedAt;await rpc('auditRefresh');const rtcResult=await waitComplete(rtcBefore);assert.equal(rtcResult.state.sources[1].items.find((i:any)=>i.label==='WebRTC 泄漏测试').status,'fail');assert.ok(rtcResult.state.sources[1].items.some((i:any)=>i.value==='203.0.113.7'));result.checks.push('two-row BrowserLeaks leak and actual public candidate are reported');
 await rpc('auditProbeHang');await rpc('auditRefresh');await new Promise(r=>setTimeout(r,13000));const limited=await rpc('auditState');assert.equal(limited.state.observationStatus,'limited');assert.ok(limited.state.observation.identity.ua);assert.ok(limited.state.observationError.includes('超时'));result.checks.push('hanging advanced native APIs time out with basic data intact');await waitComplete();await rpc('auditProbeRestore');const beforeRefresh=(await rpc('auditState')).state.startedAt;await rpc('auditRefresh');await waitComplete(beforeRefresh);
 await rpc('auditSlow');await rpc('auditRefresh');await new Promise(r=>setTimeout(r,300));const left=await rpc('auditNavigate');assert.equal(left.state.phase,'complete');assert.ok(left.state.sources.some((s:any)=>s.summary.includes('离开')));assert.deepEqual(left.pages,['about:blank']);assert.equal((await fetch(left.url+'/state')).status,200);await rpc('auditSlowRestore');await rpc('auditReturn');const back=await waitComplete();assert.equal(back.state.sources[0].grade,'A+');assert.equal(back.pages.length,1);result.checks.push('leave page stops owned tests; return can restart cleanly');
 assert.ok((await rpc('auditOpenFail')).includes('503'));result.checks.push('open original site shows HTTP failure to user');
 result.connection=await rpc('auditConnection');assert.ok(result.connection.includes('本地检测服务已关闭'));result.checks.push('closed local service reports connection failure');
 await fs.writeFile(path.join(root,'result.json'),JSON.stringify(result,null,2));console.log('local dashboard audit passed: '+engine);
}catch(error){result.error=error instanceof Error?error.message:String(error);result.failureState=await rpc('auditState').catch(()=>undefined);result.failureView=await rpc('auditView').catch(()=>undefined);await fs.writeFile(path.join(root,'result.json'),JSON.stringify(result,null,2));console.error(result.error);process.exitCode=1;}finally{await rpc('stop',{},30000).catch(()=>{});if(child.connected)child.disconnect();}
