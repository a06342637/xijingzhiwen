import type {Values} from './model';
import {compatibleHardware,applyHardware} from './hardware';

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
