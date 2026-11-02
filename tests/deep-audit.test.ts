import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {defaultValues,newProfile,type Values,type Kernel} from '../src/shared/model';
import {randomFingerprint} from '../src/shared/random-fingerprint';
import {validateProfile,proxyUrl} from '../src/shared/config';
import {applyDevice,DEVICES} from '../src/shared/devices';
import {switchProfileMode} from '../src/shared/profile-editor';
import {Store} from '../src/main/store';
test('repeated randomization preserves noise opt-out and native comparison for both engines',()=>{
 for(const engine of ['chromium','firefox'])for(const platform of ['windows','macos','linux'])for(const native of [false,true]){
  let v:Values={...defaultValues(),engine,brand:engine==='firefox'?'Firefox':'Chrome',platform,noise:engine==='firefox'?true:false,identityMode:native?'off':'seeded'};
  // Firefox has no native comparison override, so its available identity mode stays seeded.
  if(engine==='firefox'&&native)continue;
  for(let i=0;i<60;i++){v=randomFingerprint(v);const p=newProfile(randomUUID(),'1');p.name='repeated';p.values=v;assert.doesNotThrow(()=>validateProfile(p));assert.equal(v.noise,engine==='firefox'?true:false);assert.equal(v.pixelNoise,'native');assert.equal(v.audioRender,'native');assert.equal(v.identityMode,native?'off':'seeded');if(platform!=='windows')assert.equal(v.touch,0);}
 }
});
test('every mobile preset survives repeated randomization without drifting into desktop hardware',()=>{
 for(const d of DEVICES)for(const landscape of [false,true]){let v=applyDevice(defaultValues(),d.id,landscape);const before={...v};for(let i=0;i<20;i++){v=randomFingerprint(v);const p=newProfile(randomUUID(),'1');p.name=d.id;p.values=v;assert.doesNotThrow(()=>validateProfile(p));for(const key of ['deviceType','deviceModel','screenWidth','screenHeight','viewportWidth','viewportHeight','deviceScale','pointer','hover','touch'])assert.equal(v[key],before[key]);assert.equal(v.gpuModel,'');}}
});
test('custom/measured mode switches choose matching engines and clear incompatible records',()=>{
 const kernel=(id:string,engine:'chromium'|'firefox'):Kernel=>({id,engine,version:'test',arch:'x64',path:'test',sha256:'',source:'local',status:'unverified',installedAt:''});
 const p=newProfile(randomUUID(),'1','chromium');p.name='switch';p.recordPath='old-record';p.proxyId=randomUUID();p.extensionIds=[randomUUID()];const list=[kernel('chromium','chromium'),kernel('firefox','firefox')];
 const measured=switchProfileMode(p,'measured',defaultValues(),list);assert.equal(measured.kernelId,'chromium');assert.equal(measured.proxyId,'');assert.deepEqual(measured.extensionIds,[]);assert.equal(measured.recordPath,'');
 const custom=switchProfileMode(measured,'custom',{...defaultValues(),engine:'firefox',brand:'Firefox'},list);assert.equal(custom.kernelId,'firefox');assert.equal(custom.recordPath,'');assert.doesNotThrow(()=>validateProfile(custom));
 const missing=switchProfileMode(measured,'custom',{...defaultValues(),engine:'firefox',brand:'Firefox'},[list[0]]);assert.equal(missing.kernelId,'');
});
test('concurrent proxy saves keep request order and preserve the newest password on metadata edits',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-proxy-queue-'));let release!:()=>void,started!:()=>void;
 const entered=new Promise<void>(r=>started=r),gate=new Promise<void>(r=>release=r);
 const store=new Store(root,{isEncryptionAvailable:()=>true,encryptString:async s=>{if(s==='first-password'){started();await gate;}return Buffer.from(s);},decryptString:b=>b.toString()});
 try{await store.init();const p={id:randomUUID(),name:'test',host:'localhost',port:8080,protocol:'http' as const,username:'u',bypass:''};const first=store.saveProxy({...p,password:'first-password'});await entered;const second=store.saveProxy({...p,password:'new-password'});const edit=store.saveProxy({...p,name:'renamed'});assert.equal(store.saving,true);assert.throws(()=>store.remove('proxy',p.id),/保存/);release();await Promise.all([first,second,edit]);assert.equal((await store.proxy(p.id)).password,'new-password');assert.equal(store.proxies()[0].name,'renamed');assert.equal(store.saving,false);assert.equal(store.proxies()[0].password,undefined);}
 finally{release?.();store.close();await fs.rm(root,{recursive:true,force:true});}
});
test('a failed first proxy save does not prevent later valid save and authentication is validated in storage',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-proxy-retry-'));const store=new Store(root,{isEncryptionAvailable:()=>true,encryptString:async s=>{if(s==='fail')throw new Error('encrypt failed');return Buffer.from(s);},decryptString:b=>b.toString()});
 try{await store.init();const p={id:randomUUID(),name:'test',host:'localhost',port:8080,protocol:'http' as const,username:'u',bypass:''};const first=store.saveProxy({...p,password:'fail'}),second=store.saveProxy({...p,password:'valid-password'});await assert.rejects(()=>first,/encrypt failed/);await second;assert.equal((await store.proxy(p.id)).password,'valid-password');await assert.rejects(()=>store.saveProxy({...p,protocol:'socks5',password:''}),/认证/);assert.equal((await store.proxy(p.id)).protocol,'http');}
 finally{store.close();await fs.rm(root,{recursive:true,force:true});}
});

test('Firefox Cookie export activates only a complete envelope and never overwrites an existing file',async()=>{const {publishCookieFile}=await import('../src/main/firefox-cookies');const root=await fs.mkdtemp(path.join(os.tmpdir(),'qijing-cookie-publish-'));try{const file=path.join(root,'cookies.enc');await fs.writeFile(file,'existing');await assert.rejects(()=>publishCookieFile(file,Buffer.from('new envelope')),/EEXIST/);assert.equal(await fs.readFile(file,'utf8'),'existing');assert.deepEqual(await fs.readdir(root),['cookies.enc']);const target=path.join(root,'new.enc');await publishCookieFile(target,Buffer.from('complete encrypted envelope'));assert.equal(await fs.readFile(target,'utf8'),'complete encrypted envelope');assert.ok((await fs.readdir(root)).every(f=>!f.endsWith('.tmp')));}finally{await fs.rm(root,{recursive:true,force:true});}});

test('WebRTC IPv6 scope IDs are rejected at save time rather than failing in the browser SDK',()=>{const p=newProfile(randomUUID(),'1');p.name='IPv6';p.values.webrtcMode='custom';p.values.webrtcIp='fe80::1%eth0';assert.throws(()=>validateProfile(p),/区域标记/);p.values.webrtcIp='2001:db8::1';assert.doesNotThrow(()=>validateProfile(p));});

test('proxy scoped IPv6 is rejected before URL construction or credential saving',()=>{assert.throws(()=>proxyUrl({id:randomUUID(),name:'scope',protocol:'http',host:'fe80::1%eth0',port:8080,username:'',bypass:''}),/区域标记/);});
