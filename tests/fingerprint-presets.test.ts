import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {FEATURES,defaultValues,newProfile,type Values} from '../src/shared/model';
import {fingerprintLocks,preservedFingerprint} from '../src/shared/fingerprint-presets';
import {randomFullFingerprint} from '../src/shared/random-fingerprint';
import {selectHardware} from '../src/shared/hardware';
import {validateProfile} from '../src/shared/config';
import {prepareProfileBatch} from '../src/main/profile-batch';
import {validateSettingsPatch} from '../src/main/settings';
import {changeEngine} from '../src/renderer/device-editor';
import {englishWindowsFonts,browsingFonts,ENGLISH_WINDOWS_FONTS} from '../src/shared/font-presets';
import {applyProxyLocale} from '../src/main/proxy-locale';

test('fixed 3070 and UTC+8 survive repeat and batch randomization; free hardware and seed still vary',()=>{
 for(const engine of ['chromium','firefox']){
  const base:Values={...selectHardware(changeEngine(defaultValues(),engine),{gpu:'rtx-3070'}),timezone:'Asia/Shanghai'};const settings={fingerprintDefaults:base},locks=fingerprintLocks(settings),samples=[];
  for(let i=0;i<100;i++){const values=randomFullFingerprint(base,Math.random,preservedFingerprint(base,locks)),p=newProfile(randomUUID(),String(i+1));p.name='fixed';p.values=values;validateProfile(p);assert.equal(values.gpuModel,'rtx-3070');assert.equal(values.gpuRenderer,base.gpuRenderer);assert.equal(values.timezone,'Asia/Shanghai');samples.push(values);}
  assert.ok(new Set(samples.map(v=>v.screenWidth)).size>1);
  const p=newProfile(randomUUID(),'1','',base);p.name='batch';const batch=prepareProfileBatch({profile:p,count:30,randomize:true},locks);assert.ok(batch.every(p=>p.values.gpuModel==='rtx-3070'&&p.values.timezone==='Asia/Shanghai'));assert.equal(new Set(batch.map(p=>p.seed)).size,30);
 }
});
test('default-valued and false presets lock explicitly, survive settings edits and can be unlocked',()=>{
 const current={view:'list' as const,theme:'system' as const,maxBrowsers:5,fingerprintDefaults:defaultValues()};
 const first=validateSettingsPatch({fingerprintDefaults:{...defaultValues(),timezone:'Asia/Shanghai'}},current);assert.ok(first.fingerprintLocks?.includes('timezone'));
 const fixed=validateSettingsPatch({fingerprintDefaults:defaultValues(),fingerprintLocks:['platform','noise','screenWidth']},first);
 const base={...fixed.fingerprintDefaults,noise:false};const sample=randomFullFingerprint(base,Math.random,preservedFingerprint(base,fingerprintLocks(fixed)));assert.equal(sample.platform,'windows');assert.equal(sample.screenWidth,1920);assert.equal(sample.noise,false);assert.equal(sample.pixelNoise,'native');assert.equal(sample.audioRender,'native');
 assert.deepEqual(validateSettingsPatch({theme:'dark'},fixed).fingerprintLocks,fixed.fingerprintLocks);assert.deepEqual(fingerprintLocks(validateSettingsPatch({fingerprintLocks:[]},fixed)),[]);assert.throws(()=>validateSettingsPatch({fingerprintLocks:['invalid']},fixed));
 // Existing environments retain their own value after global defaults change.
 const existing={...defaultValues(),timezone:'Asia/Tokyo'};assert.equal(randomFullFingerprint(existing,Math.random,preservedFingerprint(existing,['timezone'])).timezone,'Asia/Tokyo');
});
test('each supported fixed field preserves a valid default and manual font/identity policies stay intact',()=>{
 for(const f of FEATURES){for(let i=0;i<5;i++){const base=defaultValues(),p=newProfile(randomUUID(),'1');p.name=f.key;p.values=randomFullFingerprint(base,Math.random,preservedFingerprint(base,[f.key]));assert.equal(p.values[f.key],base[f.key],f.key);validateProfile(p);}}
 const fonts=englishWindowsFonts(defaultValues());assert.ok(String(fonts.fontWhitelist).includes('Microsoft YaHei'));assert.equal(randomFullFingerprint(fonts,Math.random,preservedFingerprint(fonts,['fontPolicy'])).fontWhitelist,fonts.fontWhitelist);
 const old={...defaultValues(),randomStrategy:'broad',fontPolicy:'restricted',fontWhitelist:ENGLISH_WINDOWS_FONTS.join(',')};assert.equal(browsingFonts(old).fontPolicy,'native');assert.equal(old.fontPolicy,'restricted');assert.equal(browsingFonts({...old,randomStrategy:'catalog'}).fontPolicy,'restricted');assert.equal(browsingFonts({...old,fontWhitelist:'Arial'}).fontPolicy,'restricted');
 assert.equal(browsingFonts(old,['fontPolicy']).fontWhitelist,old.fontWhitelist);
});
test('proxy exit matching cannot overwrite locked timezone or a manual font list',()=>{
 const p=newProfile(randomUUID(),'1');p.name='fixed proxy';p.values={...defaultValues(),timezone:'Asia/Shanghai',randomStrategy:'broad',fontPolicy:'restricted',fontWhitelist:'Arial'};
 const effective=applyProxyLocale(p,{locale:'ja-JP',timezone:'Asia/Tokyo',exitIp:'192.0.2.1'},['timezone','fontPolicy']);assert.equal(effective.values.timezone,'Asia/Shanghai');assert.equal(effective.values.locale,'ja-JP');assert.equal(effective.values.fontWhitelist,'Arial');assert.equal(p.values.geoip,true);
});
