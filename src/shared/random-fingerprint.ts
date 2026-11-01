import type {Values} from './model';
import {compatibleHardware,applyHardware} from './hardware';

// Keep network/locale and experimental choices explicit. Randomize only coherent,
// supported desktop personas; every environment also receives its own uint64 seed.
export function randomFingerprint(base:Values,random:()=>number=Math.random):Values {
 if(base.deviceType&&base.deviceType!=='desktop')return {...base,cpu:8,memory:'8'};
 const pick=<T,>(items:T[])=>items[Math.floor(random()*items.length)];
 const [screenWidth,screenHeight]=pick([[1920,1080],[2560,1440],[1536,864],[1600,900],[1366,768]]);
 const [cpu,memory]=pick([[4,'4'],[8,'8'],[12,'16'],[16,'16'],[8,'16']] as const);
 const touch=pick([0,0,0,10]);
 const v:Values={...base,identityMode:'seeded',platform:base.platform||'windows',brand:base.engine==='firefox'?'Firefox':pick(['Chrome','Edge']),brandVersion:'',platformVersion:base.engine==='firefox'||base.platform!=='windows'?'':pick(['10.0.0','15.0.0']),userAgent:'',cpuModel:'',gpuModel:'',cpu,memory:base.engine==='firefox'?'8':memory,screenWidth,screenHeight,taskbarHeight:pick([40,48]),windowWidth:Math.min(1280,screenWidth-80),windowHeight:Math.min(860,screenHeight-100),maximized:false,viewportMode:'native',viewportWidth:Math.min(1200,screenWidth-80),viewportHeight:Math.min(720,screenHeight-160),touch,pointer:'fine',hover:'hover',colorScheme:pick(['light','dark']),contrast:'native',forcedColors:'native','reduced-motion':pick(['native','true']),'reduced-transparency':'native','inverted-colors':'native',timer:0,gpuBackend:'native',gpuVendor:'',gpuRenderer:'',noise:true,pixelNoise:base.engine==='firefox'?'native':'seeded',audioRender:base.engine==='firefox'?'native':'isolated',audioSeed:'',fontPolicy:'native',fontWhitelist:'',windowsFontMetrics:false};
 if(base.hardwareRandom===false){for(const key of ['cpuModel','gpuModel','hardwareRam','cpu','memory','gpuBackend','gpuVendor','gpuRenderer'])v[key]=base[key]??v[key];return v;}
 const choices=compatibleHardware(v);return choices.length?applyHardware(v,pick(choices)):v;
}
