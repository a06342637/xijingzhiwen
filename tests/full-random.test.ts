import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {defaultValues,newProfile} from '../src/shared/model';
import {randomFullFingerprint} from '../src/shared/random-fingerprint';
import {validateProfile} from '../src/shared/config';
import {changeEngine} from '../src/renderer/device-editor';
import {DEVICES,applyDevice} from '../src/shared/devices';
import {prepareProfileBatch} from '../src/main/profile-batch';
import {applyProxyLocale} from '../src/main/proxy-locale';

test('broad random fingerprints vary supported identity, hardware and preferences while keeping network and engine',()=>{
 for(const engine of ['chromium','firefox']){
  const base=changeEngine({...defaultValues(),webrtcMode:'custom',webrtcIp:'203.0.113.9',webrtcPolicy:'disable_non_proxied_udp'},engine),samples=[];
  for(let i=0;i<300;i++){const v=randomFullFingerprint(base);const p=newProfile(randomUUID(),String(i+1));p.name='random';p.values=v;validateProfile(p);assert.equal(v.engine,engine);for(const key of ['geoip','webrtcMode','webrtcIp','webrtcPolicy'])assert.equal(v[key],base[key]);for(const key of ['synthetic','runtimeSuppression','fakeShadowRoot','canvasBridgeConsent'])assert.equal(v[key],false);assert.equal(v.canvasBridge,'');samples.push(v);}
  for(const key of ['platform','screenWidth','windowWidth','cpuModel','gpuModel','hardwareRam','locale','timezone','colorScheme','reduced-motion','thirdPartyCookies'])assert.ok(new Set(samples.map(v=>v[key])).size>1,key);
  if(engine==='chromium')for(const key of ['brand','pixelNoise','audioRender','codec_h264','deviceScale','timer','quota'])assert.ok(new Set(samples.map(v=>v[key])).size>1,key);
  else assert.ok(samples.every(v=>v.brand==='Firefox'&&v.pixelNoise==='native'&&v.audioRender==='native'));
 }
});
test('each mobile family randomizes coherent presets while respecting its engine limits',()=>{
 for(const type of ['iphone','ipad','android']){const initial=applyDevice(defaultValues(),DEVICES.find(d=>d.type===type)!.id),sizes=new Set();for(let i=0;i<100;i++){const v=randomFullFingerprint(initial),p=newProfile(randomUUID(),String(i+1));p.name='mobile';p.values=v;validateProfile(p);assert.equal(v.deviceType,type);assert.equal(v.engine,'chromium');assert.equal(v.fontPolicy,'native');assert.equal(v.taskbarHeight,0);assert.equal(v.webrtcPolicy,initial.webrtcPolicy);sizes.add([v.screenWidth,v.screenHeight,v.deviceScale].join(':'));}assert.ok(sizes.size>2);}
});
test('multi-create randomizes each profile even if the legacy checkbox is false and preserves proxy',()=>{
 const p=newProfile(randomUUID(),'999');p.name='batch';p.proxyId=randomUUID();const batch=prepareProfileBatch({profile:p,count:30,randomize:false});assert.equal(new Set(batch.map(p=>p.seed)).size,30);assert.ok(batch.every(v=>v.proxyId===p.proxyId&&v.values.engine===p.values.engine));assert.ok(new Set(batch.map(p=>JSON.stringify(p.values))).size>20);assert.deepEqual(prepareProfileBatch({profile:p,count:1,randomize:false})[0].values,p.values);
});
test('proxy matching overrides broad random locale and font identity at launch without editing saved values',()=>{
 const p=newProfile(randomUUID(),'123');p.name='broad proxy';p.values={...randomFullFingerprint(defaultValues()),platform:'windows',randomStrategy:'broad',fontWhitelist:'',fontPolicy:'native',locale:'en-US',timezone:'America/New_York'};const result=applyProxyLocale(p,{locale:'ja-JP',timezone:'Asia/Tokyo',exitIp:'192.0.2.8'});assert.equal(result.values.locale,'ja-JP');assert.equal(result.values.timezone,'Asia/Tokyo');assert.ok(String(result.values.fontWhitelist).includes('Meiryo'));assert.equal(p.values.locale,'en-US');p.values.geoip=false;assert.equal(applyProxyLocale(p,{locale:'ja-JP',timezone:'Asia/Tokyo'}).values.locale,'en-US');
});
