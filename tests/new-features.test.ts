import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {parseProxyInput,type ProxyFormat} from '../src/shared/proxy-input';
import {defaultValues,newProfile} from '../src/shared/model';
import {randomFingerprint} from '../src/shared/random-fingerprint';
import {validateProfile,buildOptions} from '../src/shared/config';
import {validateSettingsPatch} from '../src/main/settings';
import {prepareProfileBatch} from '../src/main/profile-batch';
import {SoftwareUpdates} from '../src/main/software-update';

test('all five proxy formats, credentials containing separators and URL encoding',()=>{
 const expected={protocol:'http',host:'gate.example.test',port:1000,username:'account-id',password:'secret-JP-session'};
 for(const text of ['account-id:secret-JP-session@gate.example.test:1000','account-id:secret-JP-session:gate.example.test:1000','gate.example.test:1000@account-id:secret-JP-session','gate.example.test:1000:account-id:secret-JP-session','gate.example.test:1000##account-id##secret-JP-session'])assert.deepEqual(parseProxyInput(text),expected);
 assert.equal(parseProxyInput('user:pass:with@at@gate.example.test:80','user-at').password,'pass:with@at');
 assert.deepEqual(parseProxyInput('socks5://user%40test:pass%3Aword@[::1]:1080'),{protocol:'socks5',host:'::1',port:1080,username:'user@test',password:'pass:word'});
 assert.equal(parseProxyInput('http://host.test:80').port,80);
 assert.equal(parseProxyInput('host:8080','auto','socks5').protocol,'socks5');
 assert.throws(()=>parseProxyInput('host:80:user:1234'),/多种/);
 assert.equal(parseProxyInput('host:80:user:1234','host-colon').password,'1234');
 for(const text of ['host:0','host:65536','ftp://host:80','http://host:80/path','host:8080\nuser:pass'])assert.throws(()=>parseProxyInput(text));
});
test('defaults validate cross-field rules and preference patches preserve them',()=>{
 const current={view:'cards' as const,theme:'system' as const,maxBrowsers:5,fingerprintDefaults:defaultValues()};
 const values={...defaultValues(),locale:'ja-JP',timezone:'Asia/Tokyo',fakeShadowRoot:true};
 const settings=validateSettingsPatch({fingerprintDefaults:values},current);
 assert.equal(validateSettingsPatch({theme:'dark'},settings).fingerprintDefaults.locale,'ja-JP');
 assert.throws(()=>validateSettingsPatch({fingerprintDefaults:{...values,timezone:'nonsense'}},current),/时区/);
 assert.throws(()=>validateSettingsPatch({fingerprintDefaults:{...values,canvasBridge:'ws://localhost:9000'}},current),/显式确认/);
 const p=newProfile(randomUUID(),'1','',settings.fingerprintDefaults);p.name='one';p.values.locale='en-US';assert.equal(settings.fingerprintDefaults.locale,'ja-JP');
});
test('random personas stay valid and preserve explicit network/locale/experimental choices',()=>{
 const base={...defaultValues(),geoip:true,timezone:'Asia/Tokyo',locale:'ja-JP',webrtcMode:'custom',webrtcIp:'203.0.113.5',synthetic:true};
 const variants=new Set<string>();
 for(let i=0;i<250;i++){const p=newProfile(randomUUID(),String(i+1));p.name='random';p.values=randomFingerprint(base);validateProfile(p);const options=buildOptions(p,'C:/browser.exe','C:/data',[]);assert.ok(options.args.includes('--fingerprint-pixel-noise=seeded'));assert.equal(p.values.locale,base.locale);assert.equal(p.values.timezone,base.timezone);assert.equal(p.values.webrtcIp,base.webrtcIp);assert.equal(p.values.synthetic,true);assert.equal(p.values.canvasBridgeConsent,false);variants.add(JSON.stringify(p.values));}
 assert.ok(variants.size>100);
});
test('batch names, ids, seeds and limits; measured/custom directories guarded',()=>{
 const p=newProfile(randomUUID(),'123');p.name='环境';p.values.locale='ja-JP';
 const copies=prepareProfileBatch({profile:p,count:100,randomize:true});
 assert.equal(new Set(copies.map(x=>x.seed)).size,100);assert.equal(new Set(copies.map(x=>x.id)).size,100);assert.equal(copies[0].name,'环境 001');assert.equal(copies[99].name,'环境 100');assert.ok(copies.every(x=>x.values.locale==='ja-JP'&&x.downloadDir===''));
 assert.equal(prepareProfileBatch({profile:p,count:1,randomize:false})[0].seed,p.seed);
 assert.throws(()=>prepareProfileBatch({profile:p,count:101,randomize:false}));
 assert.throws(()=>prepareProfileBatch({profile:{...p,downloadDir:'C:/shared'},count:2,randomize:false}),/独立目录/);
});
class FakeUpdater extends EventEmitter {autoDownload=true;autoInstallOnAppQuit=true;allowPrerelease=true;allowDowngrade=true;checks=0;downloads=0;installed=false;async checkForUpdates(){this.checks++;this.emit('update-available',{version:'0.2.0',releaseNotes:'notes'});}async downloadUpdate(){this.downloads++;this.emit('download-progress',{percent:50});this.emit('update-downloaded');}quitAndInstall(){this.installed=true;}}
test('update requires checked/downloaded states and waits for browser shutdown',async()=>{
 const fake=new FakeUpdater();let stopComplete=false;const updater=new SoftwareUpdates(fake,true,()=>{},async()=>{await Promise.resolve();stopComplete=true;});
 assert.equal(fake.autoDownload,false);assert.equal(fake.autoInstallOnAppQuit,false);
 await assert.rejects(()=>updater.download());await assert.rejects(()=>updater.install());
 await updater.check();assert.equal(updater.state().version,'0.2.0');await updater.download();assert.equal(updater.state().phase,'downloaded');await updater.check();assert.equal(fake.checks,1);
 fake.quitAndInstall=()=>{assert.equal(stopComplete,true);fake.installed=true;};await updater.install();assert.equal(fake.installed,true);
});
test('updater failures allow retry; busy operation does not install or discard download',async()=>{
 const fake=new FakeUpdater();const updater=new SoftwareUpdates(fake,true,()=>{},async()=>{throw new Error('busy');});await updater.check();await updater.download();await updater.install();assert.equal(fake.installed,false);assert.equal(updater.state().phase,'downloaded');
 fake.emit('error',new Error('network failure'));assert.equal(updater.state().phase,'error');await updater.check();assert.equal(updater.state().phase,'available');
 const dev=new SoftwareUpdates(new FakeUpdater(),false,()=>{},async()=>{});await assert.rejects(()=>dev.check(),/已安装/);
});
