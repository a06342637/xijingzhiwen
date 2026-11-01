import {fork,type ChildProcess} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store,inside} from './store';
import {Kernels} from './kernels';
import {acquireProfileLock,copyProfile} from './profile-files';
import {CAPABILITIES,type Profile,type Kernel,type Report,type Check,type Extension,type ProxyConfig} from '../shared/model';
import {validateProfile} from '../shared/config';
import {fieldSupported} from '../shared/devices';
type Runner={profile?:Profile;release?:()=>Promise<void>;child:ChildProcess;pending:Map<string,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout}>;kernelId:string;status:string;busy?:boolean};
export class Browsers {
 private runners=new Map<string,Runner>();
 private starting=new Set<string>();
 private starts=new Map<string,Promise<unknown>>();
 private operations=new Set<string>();
 private shutdown=false;
 constructor(private store:Store,private kernels:Kernels,private worker:string,private changed:()=>void,private python:()=>Promise<string>,private notice:(s:string)=>void){}
 running(){return {...Object.fromEntries([...this.starting].map(id=>[id,'starting'])),...Object.fromEntries([...this.runners].map(([id,r])=>[id,r.status]))};}
 isRunning(id:string){return this.runners.has(id)||this.starting.has(id);}
 isBusy(id:string){return this.isRunning(id)||this.operations.has(id)||this.store.deleting.has(id);}
 get operating(){return this.operations.size>0||this.store.deleting.size>0;}
 private begin(id:string){if(this.operations.has(id))throw new Error('此环境正在诊断、迁移或复制数据');this.operations.add(id);}
 private async ready(id:string){await this.starts.get(id);const r=this.runners.get(id);if(!r||r.status!=='running')throw new Error('环境尚未运行或正在关闭');return r;}
 private create(id:string,kernelId='',profile?:Profile,release?:()=>Promise<void>){
  const child=fork(this.worker,[],{execPath:process.execPath,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},stdio:['ignore','pipe','pipe','ipc'],windowsHide:true});
  const runner:Runner={child,pending:new Map(),kernelId,status:'starting',profile:profile?structuredClone(profile):undefined,release};this.runners.set(id,runner);
  // Raw browser stderr may contain launch arguments or credentials. Keep it out of logs.
  child.stdout?.on('data',()=>{});child.stderr?.on('data',()=>{});
  child.on('message',(m:any)=>{if(m.id){const p=runner.pending.get(m.id);if(p){clearTimeout(p.timer);runner.pending.delete(m.id);m.ok?p.resolve(m.result):p.reject(new Error(m.error));}}else if(m.event==='started'){if(runner.status==='starting')runner.status='running';this.changed();}else if(m.event==='notice'||m.event==='fatal'){this.notice(m.error);}else if(m.event==='closed'){runner.status='stopping';this.changed();}});
  child.once('error',error=>this.dispose(id,runner,error));child.once('exit',()=>{void (runner.release?.()||Promise.resolve()).catch(error=>this.notice('释放环境锁失败：'+String(error))).finally(()=>this.dispose(id,runner,new Error('浏览器进程已退出')));});this.changed();return runner;
 }
 private dispose(id:string,runner:Runner,error:Error){if(this.runners.get(id)===runner)this.runners.delete(id);for(const p of runner.pending.values()){clearTimeout(p.timer);p.reject(error);}runner.pending.clear();this.changed();}
 private rpc(runner:Runner,action:string,payload:any={},timeout=120000){return new Promise<any>((resolve,reject)=>{const id=randomUUID();const timer=setTimeout(()=>{runner.pending.delete(id);reject(new Error('操作超时：'+action));},timeout);runner.pending.set(id,{resolve,reject,timer});runner.child.send({id,action,payload},error=>{if(error){clearTimeout(timer);runner.pending.delete(id);reject(error);}});});}
 async start(id:string,blank=false,internal=false){if(this.store.deleting.has(id))throw new Error('环境正在删除');if(!internal&&this.operations.has(id))throw new Error('此环境正在操作数据');if(this.shutdown)throw new Error('软件正在关闭');if(this.isRunning(id))throw new Error('此环境正在启动或运行');if(new Set([...this.starting,...this.runners.keys()].filter(x=>!x.startsWith('_'))).size>=this.store.settings().maxBrowsers)throw new Error('已达到设置中的浏览器并发上限');this.starting.add(id);this.changed();const task=this.startInner(id,blank);this.starts.set(id,task);try{return await task;}finally{this.starting.delete(id);this.starts.delete(id);this.changed();}}
 private async startInner(id:string,blank=false){
  const p=validateProfile(this.store.get<Profile>('profile',id));if(p.archived)throw new Error('请先取消归档');const kernel=await this.kernels.verify(p.kernelId);if((kernel.engine||'chromium')!==p.values.engine)throw new Error('环境与内核引擎不匹配，请选择对应内核');const profileDir=inside(this.store.root,'profiles',p.id);
  const release=await acquireProfileLock(profileDir);let r:Runner|undefined;
  try{let python;if(p.mode==='measured')python=await this.python();const extensions=p.extensionIds.map(x=>this.store.get<Extension>('extension',x).path);for(const folder of extensions)await fs.access(path.join(folder,'manifest.json'));const proxy=p.proxyId?await this.store.proxy(p.proxyId):undefined;r=this.create(id,kernel.id,p,release);await this.rpc(r,'start',{profile:p,kernel,profileDir,extensions,proxy,downloadDir:inside(this.store.root,'downloads',id),python,blank},180000);return true;}catch(error){if(r)await this.terminate(id,r);else await release();throw error;}
 }
 private async terminate(id:string,r:Runner){
  const exited=new Promise<void>(resolve=>{if(r.child.exitCode!==null||r.child.signalCode!==null)resolve();else r.child.once('exit',()=>resolve());});
  if(r.child.exitCode===null&&r.child.signalCode===null)r.child.kill();
  let timer:NodeJS.Timeout|undefined;try{await Promise.race([exited,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('浏览器尚未退出，保留环境锁')),5000);})]);}finally{if(timer)clearTimeout(timer);}
  await r.release?.();this.dispose(id,r,new Error('环境已关闭'));
 }
 async stop(id:string){await this.starts.get(id)?.catch(()=>{});const r=this.runners.get(id);if(!r)return;r.status='stopping';this.changed();try{await this.rpc(r,'stop',{},10000);}catch{}finally{await this.terminate(id,r);}}
 async stopAll(){this.shutdown=true;try{await Promise.allSettled([...this.starts.values()]);await Promise.all([...this.runners.keys()].map(id=>this.stop(id)));}finally{this.shutdown=false;}}
 async focus(id:string){return this.rpc(await this.ready(id),'focus');}
 async proxyTest(proxy:ProxyConfig){if(this.shutdown)throw new Error('软件正在关闭');const id='_proxy-'+randomUUID();const r=this.create(id);try{return await this.rpc(r,'proxyTest',{proxy},20000);}finally{await this.terminate(id,r);}}
 async cookie(id:string,action:'exportCookies'|'importCookies',file:string,passphrase:string){
  if(Buffer.byteLength(passphrase)<12||Buffer.byteLength(passphrase)>1024)throw new Error('口令需要 12–1024 个 UTF-8 字节');
  if(action==='importCookies'&&this.isRunning(id))throw new Error('导入需要关闭环境后打开空白上下文，且目标 Cookie 必须为空');
  this.begin(id);let created=false;
  try{if(!this.isRunning(id)){await this.start(id,true,true);created=true;}const r=await this.ready(id);try{return await this.rpc(r,action,{path:file,passphrase});}catch(error){if(action==='importCookies'){await this.stop(id);this.notice('Cookie 导入失败，可能已部分写入；请新建空环境重试，不要把失败视为回滚。');}throw error;}}
  finally{try{if(created)await this.stop(id);}finally{this.operations.delete(id);}}
 }
 async diagnose(id:string){this.begin(id);let created=false;
  try{if(!this.isRunning(id)){await this.start(id,true,true);created=true;}const r=await this.ready(id);const p=r.profile||this.store.get<Profile>('profile',id);const kernel=await this.kernels.verify(p.kernelId);const result=await this.rpc(r,'diagnose',{},50000);const o=result.observation;const checks:Check[]=CAPABILITIES.map(f=>({feature:f.key,label:f.label,status:f.status==='unsupported'?'unsupported':'unverified',expected:p.values[f.key],detail:f.note}));
   const check=(key:string,expected:any,observed:any,detail='仅验证当前窗口中的观测值。')=>{const row=checks.find(c=>c.feature===key);if(row){row.expected=expected;row.observed=observed;row.status=observed===undefined||observed===null?'unverified':expected===observed?'verified':'limited';row.detail=expected===observed?detail:'配置与实测不同，或受到原生环境限制。 '+detail;}};
   const v={...p.values};if(v.geoip&&result.resolvedGeo){v.locale=result.resolvedGeo.locale;v.timezone=result.resolvedGeo.timezone;check('geoip',true,true,'按实际代理出口匹配语言与时区。');}if(p.mode==='custom'&&v.identityMode!=='off'){check('cpu',v.cpu,o.identity.cpu);check('memory',Number(v.memory),o.identity.memory);check('screenWidth',v.screenWidth,o.screen.width);check('screenHeight',v.screenHeight,o.screen.height);check('touch',v.touch,o.screen.touch);if(v.gpuVendor){check('gpuVendor',v.gpuVendor,o.webgl.webgl?.vendor);check('gpuRenderer',v.gpuRenderer,o.webgl.webgl?.renderer);}}
   if(v.locale)check('locale',v.locale,o.identity.language);if(v.timezone)check('timezone',v.timezone,o.identity.timezone);if(v.userAgent)check('userAgent',v.userAgent,o.identity.ua);
   for(const codec of ['h264','vp8','vp9','av1','hevc'])if(v['codec_'+codec]==='disabled')check('codec_'+codec,'',o.codecs[codec],'此项只检查 canPlayType，实际解码仍需完整媒体验收。');
   if(p.mode==='custom'&&v.identityMode!=='off'&&v.engine!=='firefox'&&v.deviceType==='desktop'){
    const platformNames:Record<string,string>={windows:'Windows',macos:'macOS',linux:'Linux'};check('platform',platformNames[String(v.platform)],o.identity.ch?.platform,'验证 User-Agent Client Hints 平台字段。');
    if(v.platformVersion)check('platformVersion',v.platformVersion,o.identity.ch?.platformVersion);
    check('taskbarHeight',Number(v.screenHeight)-Number(v.taskbarHeight),o.screen.availHeight,'验证 screen.availHeight，不改变实体任务栏。');
    const brandNames:Record<string,string>={Chrome:'Google Chrome',Edge:'Microsoft Edge',Opera:'Opera',Vivaldi:'Vivaldi'};const chBrand=o.identity.ch?.fullVersionList?.find((x:any)=>x.brand===brandNames[String(v.brand)]);check('brand',brandNames[String(v.brand)],chBrand?.brand,'检查 Client Hints 品牌；请求头另附原始证据。');if(v.brandVersion)check('brandVersion',v.brandVersion,chBrand?.version);
   }
   if(v.viewportMode==='fixed'){check('viewportWidth',v.viewportWidth,o.screen.innerWidth);check('viewportHeight',v.viewportHeight,o.screen.innerHeight);}
   const preferences:Record<string,[string,boolean]>={colorScheme:['(prefers-color-scheme: dark)',v.colorScheme==='dark'],contrast:[`(prefers-contrast: ${v.contrast})`,true],forcedColors:['(forced-colors: active)',v.forcedColors==='active'],'reduced-motion':['(prefers-reduced-motion: reduce)',v['reduced-motion']==='true'],'reduced-transparency':['(prefers-reduced-transparency: reduce)',v['reduced-transparency']==='true'],'inverted-colors':['(inverted-colors: inverted)',v['inverted-colors']==='true'],pointer:[`(pointer: ${v.pointer})`,true],hover:['(hover: hover)',v.hover==='hover']};for(const [key,[query,expected]] of Object.entries(preferences))if(v[key]!=='native')check(key,expected,o.preferences[query],'仅验证当前页面 CSS 偏好。');
   const ua=checks.find(c=>c.feature==='brand')!;ua.observed={ua:o.identity.ua,ch:o.identity.ch,httpUA:result.headers['user-agent'],brand:ua.observed};ua.detail+=' 已采集 UA、Client Hints 和 HTTP 请求头。';
   const webrtc=checks.find(c=>c.feature==='webrtcMode')!;webrtc.observed=o.webrtc;webrtc.status='limited';
   const gpu=checks.find(c=>c.feature==='webgpu')!;gpu.observed=o.webgpu;gpu.status='limited';
   const pixel=checks.find(c=>c.feature==='pixelNoise')!;pixel.observed=o.canvas;pixel.detail='采集重复读回摘要；不能据此证明跨种子噪声。使用内核图形验证完成对照。';
   const audio=checks.find(c=>c.feature==='audioRender')!;audio.observed=o.audio;audio.detail='已采集音频图输出摘要和采样率；单次摘要不能证明隔离机制。';const fonts=checks.find(c=>c.feature==='fontPolicy')!;fonts.observed=o.fonts;fonts.detail='字体可用性采样不是字形文件来源或名单限制的完整验收。';const quota=checks.find(c=>c.feature==='quota')!;quota.observed=o.storage;quota.detail='采集实际存储估计；配额写入、Buckets 等另需专门验收。';
   if(v.engine==='firefox'){check('brand','Firefox',o.identity.ua.includes('Firefox/')?'Firefox':undefined,'火狐原生没有 Chromium Client Hints。');check('platform',({windows:'Win32',macos:'MacIntel',linux:'Linux x86_64'} as any)[String(v.platform)],o.identity.platform);for(const c of checks)if(!fieldSupported(c.feature,v)&&c.feature!=='webgpu'&&c.feature!=='deviceScale'){c.status='unsupported';c.detail='当前模式不支持此覆盖项，保留原生能力。';}}
   if(v.viewportMode==='fixed')checks.push({feature:'deviceScale',label:'设备像素比 DPR',expected:Number(v.deviceScale),observed:o.screen.dpr,status:Number(v.deviceScale)===o.screen.dpr?'verified':'limited',detail:'当前窗口 CSS 像素比。'});
   if(v.deviceType!=='desktop'){for(const c of checks)if(!fieldSupported(c.feature,v)&&!['webgpu','deviceScale'].includes(c.feature)){c.status='unsupported';c.detail='移动端布局模拟不覆盖此原生能力。';}}
   if(v.deviceType!=='desktop')checks.push({feature:'mobileSimulation',label:'移动端模拟边界',status:'limited',detail:'Chromium 布局、触摸及 UA 模拟；不是 Safari/WebKit 或真实移动系统。',observed:{type:v.deviceType,ua:o.identity.ua,ch:o.identity.ch,screen:o.screen}});
   const report:Report={id:randomUUID(),profileId:id,profileName:p.name,kernelId:kernel.id,version:kernel.version,arch:kernel.arch,sha256:kernel.sha256,createdAt:new Date().toISOString(),kind:'environment',status:'limited',checks,observations:result};this.store.put('report',report.id,report);await fs.writeFile(inside(this.store.root,'reports',report.id+'.json'),JSON.stringify(report,null,2));return report;
  }finally{try{if(created)await this.stop(id);}finally{this.operations.delete(id);}}
 }
 async upgrade(id:string,kernelId:string){
  if(this.isBusy(id))throw new Error('请先关闭环境并等待数据操作完成');this.begin(id);
  try{const original=this.store.get<Profile>('profile',id);if(original.mode==='measured')throw new Error('实测环境绑定原始内核，请为新内核重新采集记录');if(original.archived)throw new Error('请先取消归档');if(original.kernelId===kernelId)throw new Error('已经使用此内核');const targetKernel=await this.kernels.verify(kernelId);if((targetKernel.engine||'chromium')!==(original.values.engine||'chromium'))throw new Error('不能跨引擎复制浏览器数据，请新建环境');const cloneId=randomUUID(),target=inside(this.store.root,'profiles',cloneId),source=inside(this.store.root,'profiles',id);await copyProfile(source,target);
   const now=new Date().toISOString();const clone={...original,id:cloneId,kernelId,name:original.name.slice(0,69)+' · 升级验证副本',archived:false,createdAt:now,updatedAt:now};try{this.store.put('profile',cloneId,clone);}catch(error){await fs.rm(target,{recursive:true,force:true});throw error;}
   try{const report=await this.diagnose(cloneId);report.kind='upgrade';report.profileName=clone.name;this.store.put('report',report.id,report);await fs.writeFile(inside(this.store.root,'reports',report.id+'.json'),JSON.stringify(report,null,2));return {profileId:cloneId,report};}catch(error){this.notice('升级验证未完成，原环境未修改；验证副本保留供检查。');throw error;}
  }finally{this.operations.delete(id);}
 }
}
