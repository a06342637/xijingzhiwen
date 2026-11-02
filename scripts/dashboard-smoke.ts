// Maintainer-only isolated browser verification; not bundled or exposed in the product.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import initSqlJs from 'sql.js';
import {newProfile} from '../src/shared/model';
import {randomFingerprint} from '../src/shared/random-fingerprint';
import {changeEngine} from '../src/renderer/device-editor';
import {parseProxyInput} from '../src/shared/proxy-input';
const engine=process.argv[2]||'chromium',mode=process.argv[3]||'real',region=process.argv[4]||'DIRECT';
const root=path.resolve(process.env.QIJING_DASHBOARD_OUTPUT||'.verification/dashboard-013/'+engine+'-'+mode+'-'+region);await fs.mkdir(root,{recursive:true});
const SQL=await initSqlJs(),db=new SQL.Database(await fs.readFile('.test-data/qijing.sqlite'));
const kernels=(db.exec("SELECT data FROM objects WHERE kind='kernel'")[0]?.values||[]).map(r=>JSON.parse(String(r[0])));db.close();
const kernel=kernels.find(k=>(k.engine||'chromium')===engine&&(engine==='firefox'||k.arch===process.arch));assert.ok(kernel,'isolated kernel required');
const p=newProfile(randomUUID(),'2345678123456',kernel.id);p.name='总览验收 · '+engine;p.values=engine==='firefox'?changeEngine(p.values,'firefox'):p.values;p.values=randomFingerprint(p.values);
if(mode==='urls')p.startUrls=['about:blank','https://example.com/'];
if(mode==='mobile'){p.values=changeEngine(p.values,'chromium');const {applyDevice,DEVICES}=await import('../src/shared/devices');const preset=DEVICES.find(x=>x.id.includes('iphone'))!;p.values=applyDevice(p.values,preset.id);}
let proxy:any;if(region!=='DIRECT'){const s=JSON.parse(await fs.readFile('.verification/region-proxy-private.json','utf8'));proxy={...parseProxyInput(s.host+':'+s.port+':'+s.usernames[region]+':'+s.password),id:randomUUID(),name:region+' temporary',bypass:''};p.proxyId=proxy.id;}
const extension=String.raw`
 if(action==='dashboardSnapshot'){
  const page=dashboard?.page||context.pages()[0];
  if(payload.capture&&page){await page.waitForTimeout(1800);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:payload.capture,fullPage:true});}
  return {state:dashboard?.local.state(),pages:context.pages().map(p=>p.url()),body:await page?.locator('body').innerText().catch(()=>''),errors:await page?.evaluate(()=>window.__dashboardErrors||[]).catch(()=>[])};
 }
 if(action==='dashboardRefresh'){await dashboard.page.locator('#refresh').click();return true;}
 if(action==='dashboardFail'){await context.route('https://abrahamjuliot.github.io/**',route=>route.fulfill({status:503,body:'site unavailable'}));return true;}
 if(action==='dashboardClose'){await context.newPage();const url=dashboard.local.url;await dashboard.page.close();await new Promise(r=>setTimeout(r,800));const serviceClosed=await fetch(url).then(()=>false).catch(()=>true);return {serviceClosed,pages:context.pages().map(p=>p.url())};}
 if(action==='dashboardExpand'){await dashboard.page.locator('details').first().click();await dashboard.page.waitForTimeout(2000);return await dashboard.page.locator('details').first().getAttribute('open');}
 if(action==='dashboardFixture'){
  await context.route('https://who.1ms.dog/**',route=>route.fulfill({contentType:'text/html',body:'<div id="mGrade" title="48 / 100">Grade D</div><div id="checks">'+Array.from({length:12},(_,i)=>'<div class="ckr st-ok"><span class="ck-l">test '+i+'</span><span class="ck-v">actual fixture</span></div>').join('')+'</div>'}));
  await context.route('https://browserleaks.com/**',route=>route.fulfill({contentType:'text/html',body:'<table class="wb"><tr><td>IP Address</td><td>192.0.2.1</td></tr></table><button id="dns-run" onclick="document.querySelector(\'#dns-test\').textContent=\'Found 1 Servers, 1 ISP, 1 Location\'">Run</button><div id="dns-test"></div><div id="dns-container"><table><tr><td>1.1.1.1</td><td>DNS</td><td>JP</td></tr></table></div><div id="rtc-leak">No Leak</div><div id="rtc-local">-</div><div id="rtc-public">-</div>'}));
  await context.route('https://bot.sannysoft.com/**',route=>route.fulfill({contentType:'text/html',body:'<table>'+Array.from({length:8},(_,i)=>'<tr><td>Test '+i+'</td><td class="result passed">passed</td></tr>').join('')+'</table>'}));
  await context.route('https://abrahamjuliot.github.io/**',route=>route.fulfill({contentType:'text/html',body:'<div class="like-headless-rating">0% like headless</div><div class="headless-rating">0% headless</div><div class="stealth-rating">0% stealth</div>'}));return true;
 }
`;
const source=(await fs.readFile('src/main/browser-worker.ts','utf8')).replace(" if(action==='start')",extension+" if(action==='start')");const worker=path.join(root,'worker.cjs');await build({stdin:{contents:source,resolveDir:path.resolve('src/main'),loader:'ts'},outfile:worker,bundle:true,platform:'node',format:'cjs',packages:'external'});
const child=fork(worker,[],{windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});child.stdout?.resume();child.stderr?.resume();const pending=new Map<string,any>(),notices:string[]=[];child.on('message',(m:any)=>{if(m.event==='notice'||m.event==='fatal')notices.push(m.error);const req=pending.get(m.id);if(req){clearTimeout(req.timer);pending.delete(m.id);m.ok?req.resolve(m.result):req.reject(new Error(m.error));}});child.on('exit',()=>{for(const req of pending.values()){clearTimeout(req.timer);req.reject(new Error('worker exited'));}pending.clear();});
const rpc=(action:string,payload:any={},timeout=180000)=>new Promise<any>((resolve,reject)=>{const id=randomUUID(),timer=setTimeout(()=>{pending.delete(id);reject(new Error(action+' timeout'));},timeout);pending.set(id,{resolve,reject,timer});child.send({id,action,payload});});
const report:any={engine,mode,region,kernel:kernel.version,arch:kernel.arch,checks:[],notices};
try{
 if(mode==='disabled'||mode==='blank'){
  await rpc('start',{profile:p,kernel,profileDir:path.join(root,'profile'),downloadDir:path.join(root,'downloads'),extensions:[],blank:mode==='blank',startupDashboard:mode==='blank'});await new Promise(r=>setTimeout(r,1500));const s=await rpc('dashboardSnapshot');assert.equal(s.state,undefined);assert.deepEqual(s.pages,['about:blank']);report.checks.push('disabled/blank: no dashboard or external tabs');
 }else{
  await rpc('start',{profile:p,kernel,profileDir:path.join(root,'profile'),downloadDir:path.join(root,'downloads'),extensions:[],proxy,blank:false,startupDashboard:true});
  let last='';for(let i=0;i<300;i++){const s=await rpc('dashboardSnapshot');if(!s.state)throw new Error('startup dashboard missing');const status=s.state.sources.map((x:any)=>x.id+':'+x.status).join(',');if(status!==last){console.log(status);last=status;}if(s.state.phase==='complete'){report.initial=s;break;}await new Promise(r=>setTimeout(r,1000));}
  assert.ok(report.initial,'collection must finish with bounded outcomes');assert.equal(report.initial.pages.length,mode==='urls'?2:1);if(mode==='urls')assert.ok(report.initial.pages.some((u:string)=>u==='https://example.com/'));assert.equal(report.initial.state.observation?.identity?.ua?.includes(mode==='mobile'?'iPhone':engine==='firefox'?'Firefox':'Chrome'),true);assert.ok(report.initial.body.includes('环境检测总览'));assert.ok(report.initial.body.includes('导出报告'));await rpc('dashboardSnapshot',{capture:path.join(root,'initial.png')});
  report.checks.push('native local observation, all outcomes settle, only dashboard tab remains');
  if(report.initial.state.sources.some((s:any)=>s.items.length))assert.equal(await rpc('dashboardExpand'),'');
  await rpc('dashboardFixture');await rpc('dashboardRefresh');
  for(let i=0;i<30;i++){const s=await rpc('dashboardSnapshot');if(s.state.phase==='complete'&&s.state.startedAt!==report.initial.state.startedAt){report.refresh=s;break;}await new Promise(r=>setTimeout(r,500));}
  assert.ok(report.refresh,'refresh complete');assert.ok(report.refresh.state.sources.every((s:any)=>s.status==='complete'));assert.equal(report.refresh.state.sources[0].grade,'D');assert.equal(report.refresh.state.sources[0].score,48);assert.equal(report.refresh.state.identity.ip,'192.0.2.1');assert.equal(report.refresh.state.identity.source,'BrowserLeaks IP 页面');assert.equal(report.refresh.pages.length,mode==='urls'?2:1);assert.equal(await rpc('dashboardExpand'),'');await rpc('dashboardSnapshot',{capture:path.join(root,'refreshed.png')});report.checks.push('refresh removes stale identity, fallback IP source explicit, DOM parser fixture, details stay expanded');
  await rpc('dashboardFail');await rpc('dashboardRefresh');for(let i=0;i<30;i++){const s=await rpc('dashboardSnapshot');if(s.state.phase==='complete'&&s.state.startedAt!==report.refresh.state.startedAt){report.failedSite=s;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(report.failedSite);assert.equal(report.failedSite.state.sources[3].status,'error');assert.ok(report.failedSite.state.sources[3].summary.includes('503'));assert.ok(report.failedSite.state.sources.slice(0,3).every((s:any)=>s.status==='complete'));report.checks.push('one failed source preserves other actual results');
  await rpc('dashboardRefresh');const closed=await rpc('dashboardClose');assert.equal(closed.serviceClosed,true);assert.ok(closed.pages.every((url:string)=>url==='about:blank'||url==='https://example.com/'));report.checks.push('closing dashboard during refresh cancels owned tabs and loopback service, user tabs remain');
 }
 await fs.writeFile(path.join(root,'result.json'),JSON.stringify(report,null,2));console.log('Dashboard verification passed: '+engine+' '+mode+' '+region);
}catch(error){report.error=error instanceof Error?error.message:String(error);await fs.writeFile(path.join(root,'result.json'),JSON.stringify(report,null,2));console.error(report.error);process.exitCode=1;}finally{await rpc('stop',{},30000).catch(()=>{});if(child.connected)child.disconnect();}
