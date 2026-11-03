import {FEATURES,defaultValues,type Values,type Profile} from './model';
import {applyDesktop,fieldSupported} from './devices';

export const CONTROLLED_FEATURES=[
 {id:'manualIdentity',label:'手动浏览器身份',note:'手动 UA、品牌版本和系统版本可能与内核及 Client Hints 不一致。',keys:['userAgent','brandVersion','platformVersion']},
 {id:'hardwareIdentity',label:'硬件名称覆盖',note:'CPU/显卡型号不改变实际架构、驱动或 WebGPU 能力，名称覆盖不能代表完整真机。',keys:['cpuModel','gpuModel','hardwareRam','gpuBackend','gpuVendor','gpuRenderer','hardwareRandom','randomStrategy','cpu','memory']},
 {id:'perturbation',label:'图形与音频扰动',note:'像素和音频隔离会改变实际输出，不能保证网站接受。',keys:['noise','pixelNoise','audioRender','audioSeed']},
 {id:'displayTesting',label:'输入、显示与时钟测试',note:'触摸、强制颜色、反色和时钟量化会影响实际网页行为。',keys:['touch','pointer','hover','contrast','forcedColors','reduced-motion','reduced-transparency','inverted-colors','timer']},
 {id:'fontRestriction',label:'字体限制',note:'只允许本机真实字体；缺少字形或与展示系统不同可能影响布局。',keys:['fontPolicy','fontWhitelist','fontsDir','windowsFontMetrics']},
 {id:'mediaRestriction',label:'媒体能力限制',note:'禁用编码器或 DRM 会降低实际播放能力，不会增加虚构能力。',keys:['codec_h264','codec_vp8','codec_vp9','codec_av1','codec_hevc','widevine','widevinePath']},
 {id:'experiments',label:'实验功能',note:'Synthetic、ShadowRoot、Runtime suppression 和 Canvas Bridge 会改变浏览器行为，Bridge 可能降低沙箱保护。',keys:['synthetic','fakeShadowRoot','runtimeSuppression','canvasBridge','canvasBridgeConsent']},
 {id:'nativeComparison',label:'原生对照测试',note:'此入口仅作测试基线，由管理器启动时可能报告 webdriver=true；不会变成手动浏览器。',keys:['identityMode']},
 {id:'mobileLayout',label:'移动尺寸布局测试',note:'只测试小屏、触摸和响应式布局，使用真实 Chromium 身份。不是 iOS/Android 浏览器，自动化标记可能为 true。',keys:['deviceType','deviceModel']}
] as const;
export type ControlledFeatureId=typeof CONTROLLED_FEATURES[number]['id'];
export type ControlledFeatures=Partial<Record<ControlledFeatureId,boolean>>;
export const controlledGroup=(key:string)=>CONTROLLED_FEATURES.find(group=>(group.keys as readonly string[]).includes(key));
export function controlledDefaults():ControlledFeatures{return Object.fromEntries(CONTROLLED_FEATURES.map(group=>[group.id,false]));}
export function applyControlledValues(values:Values,allowed:ControlledFeatures={}):Values{
 const mobile=Boolean(values.deviceType&&values.deviceType!=='desktop');let v:Values=mobile&&!allowed.mobileLayout?applyDesktop(values,String(values.platform)):{...values};
 const defaults=defaultValues();
 for(const group of CONTROLLED_FEATURES){if(allowed[group.id])continue;for(const key of group.keys)v[key]=defaults[key];}
 if(!allowed.hardwareIdentity){v.hardwareRandom=false;v.randomStrategy='consistent';}
 if(!allowed.perturbation){v.noise=false;v.pixelNoise='native';v.audioRender='native';v.audioSeed='';}
 if(v.engine==='firefox')for(const f of FEATURES)if(!fieldSupported(f.key,v))v[f.key]=f.default;
 if(v.deviceType!=='desktop'){
  // Stored mobile samples now describe layout only; no pretend Safari UA,
  // Android model, or conflicting worker/iframe identity is sent at launch.
  for(const f of FEATURES)if(!fieldSupported(f.key,v))v[f.key]=f.default;
  v.userAgent='';v.deviceModel='';v.platformVersion='';v.brandVersion='';v.brand='Chrome';
  v.cpuModel='';v.gpuModel='';v.gpuBackend='native';v.gpuVendor='';v.gpuRenderer='';v.pixelNoise='native';v.audioRender='native';v.audioSeed='';v.fontPolicy='native';v.fontWhitelist='';
  v.touch=5;v.pointer='coarse';v.hover='none';v.viewportMode='fixed';v.taskbarHeight=0;
 }
 return v;
}
export function applyControlledProfile(profile:Profile,allowed:ControlledFeatures={}):Profile{return profile.mode==='measured'?profile:{...profile,values:applyControlledValues(profile.values,allowed)};}
