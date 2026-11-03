import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {installRuntimeDlls,pythonFailure,graphicsChecks} from '../src/main/components';
import {Store} from '../src/main/store';
import {defaultValues,newProfile} from '../src/shared/model';
import {applyProxyLocale} from '../src/main/proxy-locale';
import {buildOptions} from '../src/shared/config';
import {validateSettingsPatch} from '../src/main/settings';
import {DASHBOARD_SOURCES} from '../src/shared/dashboard';
import {DASHBOARD_LOCALE} from '../src/shared/dashboard-locale';

function pe(machine:number){const b=Buffer.alloc(128);b.write('MZ');b.writeUInt32LE(64,60);b.writeUInt32LE(0x4550,64);b.writeUInt16LE(machine,68);return b;}
test('runtime install copies only the correct DLL architecture and requires C++ dependencies',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-native-dll-'));try{const src=path.join(root,'src'),out=path.join(root,'out');await fs.mkdir(src);await fs.mkdir(out);await fs.writeFile(path.join(src,'msvcp140.dll'),pe(0xaa64));await fs.writeFile(path.join(src,'vcruntime140.dll'),pe(0xaa64));await fs.writeFile(path.join(src,'vcruntime140_1.dll'),pe(0x8664));await installRuntimeDlls(src,out,'arm64');assert.deepEqual((await fs.readdir(out)).sort(),['msvcp140.dll','vcruntime140.dll']);await assert.rejects(()=>installRuntimeDlls(src,out,'x64'),/架构/);await fs.writeFile(path.join(src,'untrusted.dll'),pe(0xaa64));await assert.rejects(()=>installRuntimeDlls(src,out,'arm64'),/意外/);}finally{await fs.rm(root,{recursive:true,force:true});}
 assert.ok(pythonFailure('ImportError: DLL load failed while importing _greenlet').includes('运行库'));
});
test('old installations default to list once, then persist the explicit card choice',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-list-pref-'));const store=new Store(root,{isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s),decryptString:b=>b.toString()});try{await store.init();store.put('settings','app',{view:'cards',theme:'dark',maxBrowsers:4});assert.equal(store.settings().view,'list');store.put('settings','app',validateSettingsPatch({view:'cards',diagnosticLinks:false},store.settings()));assert.equal(store.settings().view,'cards');assert.equal(store.settings().diagnosticLinks,false);assert.equal(store.settings().theme,'dark');}finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('JP/TH language match uses compatible local font lists only for eligible defaults',()=>{
 for(const [locale,timezone,font] of [['ja-JP','Asia/Tokyo','Meiryo'],['th-TH','Asia/Bangkok','Leelawadee UI']]){const p=newProfile(randomUUID(),'1');p.name='regional';const matched=applyProxyLocale(p,{locale,timezone,exitIp:'192.0.2.2'});assert.equal(matched.values.fontPolicy,'restricted');assert.ok(String(matched.values.fontWhitelist).includes(font));assert.ok(String(matched.values.fontWhitelist).includes('SimSun'));assert.equal(p.values.fontPolicy,'native');p.values.fontPolicy='restricted';p.values.fontWhitelist='Arial';assert.equal(applyProxyLocale(p,{locale,timezone}).values.fontWhitelist,'Arial');p.values.geoip=false;p.values.fontPolicy='native';assert.equal(applyProxyLocale(p,{locale,timezone}).values.fontPolicy,'native');}
});
test('proxy DNS restriction is preserved with warning suppression and manual Whoer entry',()=>{
 const p=newProfile(randomUUID(),'1');p.name='proxy';const options=buildOptions(p,'C:/chrome.exe','C:/profile',[],{id:randomUUID(),name:'route',protocol:'http',host:'proxy.test',port:80,username:'',bypass:''});assert.ok(options.args.includes('--test-type'));assert.ok(options.args.some((a:string)=>a.startsWith('--host-resolver-rules=MAP * ~NOTFOUND')));assert.ok(options.args.includes('--disable-quic'));assert.equal(DASHBOARD_SOURCES.find(s=>s.id==='whoer')?.url,'https://whoer.net/zh');assert.equal(DASHBOARD_LOCALE.places.Yokohama,'横滨');assert.equal(DASHBOARD_LOCALE.languages['ja-JP'],'日语（日本）');assert.equal(defaultValues().geoip,true);
});
test('unavailable native GPU is explained as limited without turning actual failures into passes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-graphics-reason-'));try{await fs.writeFile(path.join(root,'webgl.json'),JSON.stringify({launches:[{mode:'native',error:'webgl unavailable'}]}));const checks=await graphicsChecks({suites:[{suite:'webgl',status:'failed'},{suite:'canvas',status:'failed'},{suite:'gpu_identity',status:'incomplete'}]},root);assert.equal(checks[0].status,'limited');assert.ok(checks[0].detail.includes('原生'));assert.equal(checks[1].status,'unverified');assert.equal(checks[2].status,'limited');}finally{await fs.rm(root,{recursive:true,force:true});}
});
