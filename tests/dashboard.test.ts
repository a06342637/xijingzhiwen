import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createDashboardPage} from '../src/main/dashboard-page';
import {parseWho,parseBrowserLeaks,parseSannysoft,parseCreepjs,readWhoIdentity} from '../src/main/dashboard-parsers';
import {Store} from '../src/main/store';
import {validateSettingsPatch} from '../src/main/settings';

test('official Who grade, localized deductions and absent results remain distinct',()=>{
 const rows=[{label:'言語と IP',value:'言語は日本と一致',className:'ckr st-ok'},{label:'DNS',value:'US',className:'ckr st-bad',tips:['远端 DNS']},{label:'RTT',value:'632ms',className:'ckr st-warn'}];
 const d=parseWho({grade:'評価 D',gradeTitle:'検査結果から採点：48 / 100。',rows});assert.equal(d.grade,'D');assert.equal(d.score,48);assert.equal(d.items[1].status,'fail');
 assert.equal(parseWho({grade:'Grade A+',gradeTitle:'100 / 100',rows}).grade,'A+');
 assert.equal(parseWho({grade:'Checking',rows}).score,undefined);assert.equal(parseWho(null).status,'limited');
 assert.equal(readWhoIdentity({ip:12}),undefined);assert.equal(readWhoIdentity({ip:'not-an-ip'}),undefined);assert.deepEqual(readWhoIdentity({ip:'2001:db8::1',cf:{country:'JP',city:'Tokyo',password:'secret'}}),{ip:'2001:db8::1',country:'JP',region:'',city:'Tokyo',ipTimezone:'',isp:''});
});
test('sites without official scores retain raw metrics and incomplete network results',()=>{
 const s=parseSannysoft([{label:'WebDriver (New)',value:'passed',result:'result passed'},{label:'Chrome',value:'missing',result:'result failed'}]);assert.equal(s.score,undefined);assert.ok(s.summary.includes('1/2'));
 const c=parseCreepjs('6% like headless: 0% headless: 0% stealth: rendering:16% rgba noise\nFP ID: aaaaaaaaaaaaaaaa');assert.equal(c.items[0].value,'6%');assert.equal(c.score,undefined);assert.equal(c.items[3].status,'warn');
 const b=parseBrowserLeaks({rows:[{label:'OS',value:'Android'}],dnsSummary:'Found 2 Servers, 1 ISP, 1 Location',dnsRows:[{ip:'1.1.1.1',isp:'Cloudflare',location:'Japan'},{ip:'invalid'}],rtc:'✔ No Leak',dnsError:'timeout'});assert.equal(b.status,'limited');assert.equal(b.items[0].label,'TCP 系统推断');assert.ok(b.items.some(i=>i.status==='pass'));assert.equal(b.items.filter(i=>/^DNS \d/.test(i.label)).length,1);assert.equal(b.score,undefined);
});
test('dashboard token, origin, refresh exclusion, export and clean shutdown',async()=>{
 const local=await createDashboardPage({profileName:'测试',engine:'firefox',kernelVersion:'158',architecture:'x64',proxy:true});let calls=0,opened='',finish:()=>void=()=>{};
 local.handlers({run:()=>{calls++;return new Promise<void>(r=>{finish=()=>{local.update({phase:'complete'});r();};});},open:async id=>{opened=id;}});
 const post=(action:string,body:any,origin=local.origin)=>fetch(local.url+'/'+action,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await fetch(local.origin+'/')).status,404);assert.equal((await post('run',{},'https://foreign.test')).status,403);assert.equal((await post('run',null)).status,400);
  const html=await fetch(local.url);assert.ok(html.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));assert.equal(html.headers.get('cache-control'),'no-store');
  assert.equal((await post('observation',{})).status,400);assert.equal((await post('observation',{identity:{ua:'actual UA'},screen:{width:1440},webgl:{},preferences:{}})).status,200);
  const runs=await Promise.all([post('run',{}),post('run',{})]);assert.deepEqual(runs.map(r=>r.status).sort(),[200,409]);assert.equal(calls,1);finish();
  assert.equal((await post('open',{id:'http://arbitrary.test'})).status,400);assert.equal((await post('open',{id:'who'})).status,200);assert.equal(opened,'who');
  const exported=await fetch(local.url+'/export');assert.ok(exported.headers.get('content-disposition')?.includes('attachment'));const report=await exported.json();assert.equal(report.observation.identity.ua,'actual UA');assert.equal(report.sources.length,4);assert.ok(!JSON.stringify(report).includes('password'));
 }finally{finish();await local.close();await local.close();}
 await assert.rejects(()=>fetch(local.url));
});
test('startup dashboard defaults on for old settings and disable survives reopening',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-dashboard-settings-'));const crypto={isEncryptionAvailable:()=>true,encryptString:(s:string)=>Buffer.from(s),decryptString:(b:Buffer)=>b.toString()};let store=new Store(root,crypto);
 try{await store.init();store.put('settings','app',{view:'list',theme:'dark',maxBrowsers:4});assert.equal(store.settings().startupDashboard,true);const next=validateSettingsPatch({startupDashboard:false},store.settings());store.put('settings','app',next);assert.throws(()=>validateSettingsPatch({startupDashboard:'false'},next));store.close();store=new Store(root,crypto);await store.init();assert.equal(store.settings().startupDashboard,false);assert.equal(store.settings().theme,'dark');}finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
