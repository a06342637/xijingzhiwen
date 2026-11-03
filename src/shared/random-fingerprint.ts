import type {Values} from './model';
import {compatibleHardware,applyHardware,CPUS,GPUS,hardwareCompatible} from './hardware';
import {defaultValues,FEATURES} from './model';
import {DEVICES,SCREEN_PRESETS,applyDevice,fieldSupported} from './devices';

// Keep network/locale and experimental choices explicit. Randomize only coherent,
// supported desktop personas; every environment also receives its own uint64 seed.
export function randomFingerprint(base:Values,random:()=>number=Math.random):Values {
 if(base.deviceType&&base.deviceType!=='desktop')return {...base,cpu:8,memory:'8'};
 const pick=<T,>(items:T[])=>items[Math.floor(random()*items.length)];
 const [screenWidth,screenHeight]=pick([[1920,1080],[2560,1440],[1536,864],[1600,900],[1366,768]]);
 const [cpu,memory]=pick([[4,'4'],[8,'8'],[12,'16'],[16,'16'],[8,'16']] as const);
 const consistent=base.randomStrategy!=='catalog';
 const touch=consistent?0:base.platform==='windows'?pick([0,0,0,10]):0;
 const v:Values={...base,identityMode:'seeded',platform:base.platform||'windows',brand:base.engine==='firefox'?'Firefox':pick(['Chrome','Edge']),brandVersion:'',platformVersion:base.engine==='firefox'||base.platform!=='windows'?'':pick(['10.0.0','15.0.0']),userAgent:'',cpuModel:'',gpuModel:'',cpu,memory:base.engine==='firefox'?'8':memory,screenWidth,screenHeight,taskbarHeight:pick([40,48]),windowWidth:Math.min(1280,screenWidth-80),windowHeight:Math.min(860,screenHeight-100),maximized:false,viewportMode:'native',viewportWidth:Math.min(1200,screenWidth-80),viewportHeight:Math.min(720,screenHeight-160),touch,pointer:'fine',hover:'hover',colorScheme:pick(['light','dark']),contrast:'native',forcedColors:'native','reduced-motion':pick(['native','true']),'reduced-transparency':'native','inverted-colors':'native',timer:0,gpuBackend:'native',gpuVendor:'',gpuRenderer:'',noise:true,pixelNoise:base.engine==='firefox'?'native':'seeded',audioRender:base.engine==='firefox'?'native':'isolated',audioSeed:'',fontPolicy:'native',fontWhitelist:'',windowsFontMetrics:false};
 if(base.noise===false){v.noise=false;v.pixelNoise='native';v.audioRender='native';}
 // Font restriction is an explicit browsing choice, not a random identity field.
 v.fontPolicy=base.fontPolicy;v.fontWhitelist=base.fontWhitelist;
 if(consistent){
  v.brand=base.engine==='firefox'?'Firefox':'Chrome';
  // Do not invent physical GPU identity while WebGPU/driver features stay native.
  v.gpuBackend='native';v.gpuVendor='';v.gpuRenderer='';
  // Keep explicit graphics/audio policies. Default native avoids adding a
  // detectable perturbation merely because the user randomized the layout.
  v.pixelNoise=base.pixelNoise||'native';v.audioRender=base.audioRender||'native';v.audioSeed=base.audioSeed||'';
  v.platformVersion=base.engine==='firefox'||base.platform!=='windows'?'':base.platformVersion||'';
  v.taskbarHeight=base.platform==='windows'?(v.platformVersion==='10.0.0'?40:48):base.platform==='macos'?25:40;
  v.windowHeight=Math.min(Number(v.windowHeight),screenHeight-Number(v.taskbarHeight)-32);
  v.windowWidth=Math.min(Number(v.windowWidth),screenWidth-32);
 }
 if(base.identityMode==='off'){v.identityMode='off';v.pixelNoise='native';v.audioRender='native';v.cpuModel='';v.gpuModel='';v.gpuVendor='';v.gpuRenderer='';v.gpuBackend='native';return v;}
 if(base.hardwareRandom===false){for(const key of ['cpuModel','gpuModel','hardwareRam','cpu','memory','gpuBackend','gpuVendor','gpuRenderer'])v[key]=base[key]??v[key];return v;}
 if(consistent){v.cpu=pick([4,8,12,16]);v.memory='8';v.hardwareRam=16;return v;}
 const choices=compatibleHardware(v);return choices.length?applyHardware(v,pick(choices)):v;
}

// Explicit broad randomization for the user-facing button and new batches.
// Keep the selected engine/device family and network route valid. External file
// paths, real IPs and sandbox-changing experiments cannot be invented.
export function randomFullFingerprint(base:Values,random:()=>number=Math.random,fixed:Values={}):Values{
 const pick=<T,>(items:readonly T[])=>items[Math.min(items.length-1,Math.floor(random()*items.length))];
 const locales=[['en-US','America/New_York'],['en-CA','America/Toronto'],['ja-JP','Asia/Tokyo'],['th-TH','Asia/Bangkok'],['zh-CN','Asia/Shanghai'],['en-GB','Europe/London'],['de-DE','Europe/Berlin'],['fr-FR','Europe/Paris'],['ko-KR','Asia/Seoul'],['en-AU','Australia/Sydney']] as const;
 const [locale,timezone]=pick(locales),network={geoip:base.geoip,webrtcMode:base.webrtcMode,webrtcIp:base.webrtcIp,webrtcPolicy:base.webrtcPolicy};
 let v:Values={...defaultValues(),...base,...network,identityMode:'seeded',locale,timezone,userAgent:'',brandVersion:'',platformVersion:'',hardwareRandom:true,randomStrategy:'broad'};
 if(base.deviceType&&base.deviceType!=='desktop'){
  const choices=DEVICES.filter(d=>d.type===base.deviceType);v=applyDevice(v,pick(choices).id,random()<.2);
  for(const key of ['colorScheme','forcedColors','reduced-motion'] as const)v[key]=key==='colorScheme'?pick(['light','dark']):key==='forcedColors'?'none':pick(['true','false']);
  v.thirdPartyCookies=random()<.5;return {...v,...fixed};
 }
 v.platform=fixed.platform||pick(['windows','macos','linux']);v.platformVersion=v.platform==='windows'?pick(['10.0.0','15.0.0','19.0.0']):'';v.brand=base.engine==='firefox'?'Firefox':pick(['Chrome','Edge','Opera','Vivaldi']);
 const [w,h]=pick(SCREEN_PRESETS);const dpr=pick(['1','1.25','1.5','2']);v.deviceScale=dpr;v.screenWidth=w;v.screenHeight=h;v.taskbarHeight=v.platform==='windows'?pick([40,48]):v.platform==='macos'?25:pick([28,40,48]);
 v.windowWidth=Math.min(w-32,pick([1000,1120,1280,1360,1440,1600]));v.windowHeight=Math.min(h-Number(v.taskbarHeight)-32,pick([640,720,800,860,960]));v.viewportMode=pick(['native','fixed']);v.viewportWidth=Math.max(320,Number(v.windowWidth)-16);v.viewportHeight=Math.max(240,Number(v.windowHeight)-100);v.maximized=false;
 v.colorScheme=pick(['light','dark']);v.contrast='no-preference';v.forcedColors='none';v['inverted-colors']='false';for(const k of ['reduced-motion','reduced-transparency'])v[k]=pick(['true','false']);
 v.touch=v.platform==='windows'?pick([0,0,0,5,10]):0;v.pointer=Number(v.touch)>0?pick(['fine','coarse']):'fine';v.hover=v.pointer==='coarse'?'none':pick(['hover','none']);v.timer=pick([0,0,1,2,5,10]);v.quota=pick([20480,51200,102400,204800,512000]);v.thirdPartyCookies=random()<.5;
 v.noise=true;v.pixelNoise=pick(['native','seeded']);v.audioRender=pick(['native','isolated']);v.audioSeed=v.audioRender==='isolated'?String(1+Math.floor(random()*Number.MAX_SAFE_INTEGER)):'';
 for(const codec of ['h264','vp8','vp9','av1','hevc'])v['codec_'+codec]=pick(['native','native','disabled']);v.widevine=pick(['auto','disabled']);v.widevinePath='';v.fontsDir='';v.windowsFontMetrics=false;
 // Restricting random font families can remove CJK glyph fallback. Browsing
 // uses native fonts unless the user has explicitly locked a font policy.
 v.fontPolicy='native';v.fontWhitelist='';
 let hardware=compatibleHardware(v);
 if(fixed.cpuModel||fixed.gpuModel)hardware=CPUS.flatMap(c=>GPUS.map(g=>({id:c.id+'_'+g.id,cpu:c.id,gpu:g.id,ram:Number(v.hardwareRam)}))).filter(p=>(!fixed.cpuModel||p.cpu===fixed.cpuModel)&&(!fixed.gpuModel||p.gpu===fixed.gpuModel)&&hardwareCompatible(p,String(v.platform)));
 if(hardware.length)v=applyHardware(v,pick(hardware));
 for(const f of FEATURES)if(f.experimental||!fieldSupported(f.key,v))v[f.key]=f.default;
 v={...v,...fixed};
 if(!Object.hasOwn(fixed,'taskbarHeight'))v.taskbarHeight=Math.min(Number(v.taskbarHeight),Number(v.screenHeight)-1);
 return v;
}
