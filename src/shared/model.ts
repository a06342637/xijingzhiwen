import { z } from 'zod';

export type Verification = 'verified' | 'limited' | 'unverified' | 'unsupported';
export type Values = Record<string, string | number | boolean>;
export const UPSTREAM_COMMIT='bf3221bcfa08b652ff62a44f52ccce393ef1d351';
export const BASE_VERSION='155.0.8059.79';
export const idSchema=z.string().uuid();
export const profileSchema=z.object({
  id:idSchema, name:z.string().trim().min(1).max(80), group:z.string().max(80), tags:z.array(z.string().max(40)).max(20),
  notes:z.string().max(4000), archived:z.boolean(), seed:z.string().regex(/^[1-9]\d{0,19}$/),
  kernelId:z.string().max(120), proxyId:z.union([idSchema,z.literal('')]), extensionIds:z.array(idSchema).max(50),
  startUrls:z.array(z.string().max(2048)).max(20), downloadDir:z.string().max(4096),
  mode:z.enum(['custom','measured']), recordPath:z.string().max(4096),
  values:z.record(z.string(),z.union([z.string().max(8192),z.number().finite(),z.boolean()])),
  createdAt:z.string(),updatedAt:z.string()
}).strict();
export type Profile=z.infer<typeof profileSchema>;
export const proxySchema=z.object({id:idSchema,name:z.string().trim().min(1).max(80),protocol:z.enum(['http','https','socks5']),host:z.string().trim().min(1).max(255),port:z.number().int().min(1).max(65535),username:z.string().max(512),password:z.string().max(4096).optional(),hasPassword:z.boolean().optional(),bypass:z.string().max(1024)}).strict();
export type ProxyConfig=z.infer<typeof proxySchema>;
export interface Extension {id:string;name:string;path:string;version:string}
export interface Kernel {id:string;version:string;arch:'arm64'|'x64';path:string;sha256:string;source:'release'|'local';status:Verification;installedAt:string;provenance?:unknown}
export interface Feature {key:string;label:string;group:string;kind:'select'|'text'|'number'|'toggle'|'directory';default:string|number|boolean;options?:string[];flag?:string;min?:number;max?:number;note:string;status:Verification;source:string;probe?:string;experimental?:boolean;platform?:string}
export interface Check {feature:string;label:string;status:Verification;expected?:unknown;observed?:unknown;detail:string}
export interface Report {id:string;profileId:string;profileName:string;kernelId:string;version:string;arch:string;sha256:string;createdAt:string;kind:'environment'|'upstream'|'upgrade'|'device';status:Verification;checks:Check[];observations:unknown;outputDir?:string}
export interface DownloadProgress {id:string;label:string;received:number;total:number;phase:string;error?:string}
export interface SoftwareUpdate {phase:'idle'|'checking'|'available'|'current'|'downloading'|'downloaded'|'installing'|'error';version?:string;notes?:string;percent:number;message:string}
export interface AppSettings {view:'cards'|'list';theme:'system'|'light'|'dark';maxBrowsers:number;fingerprintDefaults:Values}
export interface AppState {profiles:Profile[];proxies:ProxyConfig[];extensions:Extension[];kernels:Kernel[];reports:Report[];running:Record<string,string>;downloads:DownloadProgress[];dataDir:string;arch:string;version:string;pythonReady:boolean;notice?:string;settings:AppSettings;features:Feature[];update:SoftwareUpdate}
export type Reply<T=unknown>={ok:true;data:T}|{ok:false;error:string};
export interface DesktopApi {invoke<T=unknown>(action:string,payload?:unknown):Promise<T>;onState(callback:(state:AppState)=>void):()=>void}
declare global { interface Window { qijing:DesktopApi } }

const base='https://github.com/xiaozhou26/Chromix/blob/'+UPSTREAM_COMMIT+'/docs/';
function feature(key:string,label:string,group:string,kind:Feature['kind'],value:Feature['default'],flag:string|undefined,note:string,more:Partial<Feature>={}):Feature{return {key,label,group,kind,default:value,flag,note,status:'unverified',source:base+'fingerprint-flags.md',...more};}
export const FEATURES:Feature[]=[
 feature('identityMode','身份模式','身份 / User-Agent','select','seeded',undefined,'原生对照关闭身份覆盖；语言与时区仍可显式设置。',{options:['seeded','off']}),
 feature('platform','系统展示','身份 / User-Agent','select','windows','fingerprint-platform','不会更换真实操作系统。',{options:['windows','macos','linux']}),
 feature('brand','浏览器品牌','身份 / User-Agent','select','Chrome','fingerprint-brand','UA 与 Client Hints 通过原生参数共同配置。',{options:['Chrome','Edge','Opera','Vivaldi']}),
 feature('brandVersion','品牌版本','身份 / User-Agent','text','','fingerprint-brand-version','留空跟随内核；并不安装对应版本的厂商功能。'),
 feature('platformVersion','系统版本展示','身份 / User-Agent','text','','fingerprint-platform-version','Client Hints 的系统版本，不改变宿主系统。'),
 feature('userAgent','手动 User-Agent','身份 / User-Agent','text','',undefined,'留空自动生成。手动 UA 可能与 Client Hints 不一致，保存时会提示。'),
 feature('locale','语言','语言 / 时区','text','',undefined,'例如 zh-CN、en-US。留空保留原生，或由出口匹配填充。'),
 feature('timezone','时区','语言 / 时区','text','',undefined,'IANA 名称，例如 Asia/Shanghai。'),
 feature('geoip','按出口匹配','语言 / 时区','toggle',false,undefined,'经有效代理查询 ip-api.com（HTTP）；手动语言、时区、IP 优先，失败中止启动。'),
 feature('webrtcMode','WebRTC 地址展示','WebRTC / 网络','select','native',undefined,'展示地址不等于实际通信路由；自动模式通过出口元数据解析。',{options:['native','auto','custom'],status:'limited'}),
 feature('webrtcIp','手动 WebRTC IP','WebRTC / 网络','text','',undefined,'仅接受 IPv4 / IPv6 字面量，在手动模式下使用。',{status:'limited'}),
 feature('webrtcPolicy','WebRTC 网络策略','WebRTC / 网络','select','auto',undefined,'代理默认限制非代理 UDP；可能影响通话。SOCKS5 不提供 UDP ASSOCIATE。',{options:['auto','default','default_public_interface_only','default_public_and_private_interfaces','disable_non_proxied_udp'],status:'limited'}),
 feature('gpuBackend','GPU 身份模式','WebGL / Canvas','select','native','fingerprint-gpu-backend','自定义 Vendor / Renderer 要选择 compatibility；软件渲染上下文保留原生。',{options:['native','compatibility'],status:'limited'}),
 feature('gpuVendor','WebGL Vendor','WebGL / Canvas','text','','fingerprint-gpu-vendor','未屏蔽厂商展示字符串，建议与 Renderer 成对填写。',{status:'limited'}),
 feature('gpuRenderer','WebGL Renderer','WebGL / Canvas','text','','fingerprint-gpu-renderer','仅更改名称；WebGPU 身份、GL 能力和实际 GPU 保持原生。',{status:'limited'}),
 feature('pixelNoise','Canvas / WebGL 像素','WebGL / Canvas','select','native','fingerprint-pixel-noise','seeded 仅覆盖支持的 8-bit 路径，透明 WebGL、PBO、FLOAT 等不保证覆盖。',{options:['native','seeded'],status:'limited',source:base+'pixel-noise.md'}),
 feature('noise','允许指纹扰动','WebGL / Canvas','toggle',true,undefined,'关闭后禁止指纹扰动，包括可选音频隔离。'),
 feature('audioRender','音频策略','音频 / 媒体','select','native','fingerprint-audio-render','isolated 为音频图输出隔离，不是虚拟设备。',{options:['native','isolated'],status:'limited'}),
 feature('audioSeed','音频种子','音频 / 媒体','text','','fingerprint-audio-seed','留空使用环境种子；非零 uint64 十进制整数。'),
 ...['h264','vp8','vp9','av1','hevc'].map(c=>feature('codec_'+c,c.toUpperCase()+' 编码','音频 / 媒体','select','native','fingerprint-codec-'+c,'仅保留原生能力或禁用，不增加解码器。',{options:['native','disabled'],status:'limited'})),
 feature('widevine','Widevine','音频 / 媒体','select','auto',undefined,'使用本机已有 CDM，不附带受许可限制的组件。',{options:['auto','disabled','custom'],status:'limited'}),
 feature('widevinePath','Widevine 目录','音频 / 媒体','directory','',undefined,'自定义模式时选择有效 CDM 目录。',{status:'limited'}),
 feature('cpu','CPU 核数展示','硬件 / 屏幕','number',8,'fingerprint-hardware-concurrency','不分配实际 CPU。',{min:1,max:128}),
 feature('memory','内存展示（GB）','硬件 / 屏幕','select','8','fingerprint-device-memory','不改变实际内存或 V8 堆限制。',{options:['0.25','0.5','1','2','4','8','16','32']}),
 feature('screenWidth','屏幕宽度（DIP）','硬件 / 屏幕','number',1920,'fingerprint-screen-width','与窗口及页面视口分别设置。',{min:1,max:32768}),
 feature('screenHeight','屏幕高度（DIP）','硬件 / 屏幕','number',1080,'fingerprint-screen-height','不是物理显示器模拟。',{min:1,max:32768}),
 feature('taskbarHeight','工作区保留高度','硬件 / 屏幕','number',48,'fingerprint-taskbar-height','不调整真实系统任务栏。',{min:0,max:32767}),
 feature('windowWidth','窗口宽度','硬件 / 屏幕','number',1280,undefined,'真实浏览器窗口初始尺寸。',{min:320,max:16384}),
 feature('windowHeight','窗口高度','硬件 / 屏幕','number',860,undefined,'真实浏览器窗口初始尺寸。',{min:240,max:16384}),
 feature('maximized','启动时最大化','硬件 / 屏幕','toggle',false,undefined,'开启时以最大化窗口启动。'),
 feature('viewportMode','页面视口','硬件 / 屏幕','select','native',undefined,'原生视口随窗口；固定视口用于布局检查。',{options:['native','fixed']}),
 feature('viewportWidth','固定视口宽度','硬件 / 屏幕','number',1280,undefined,'仅固定视口模式生效。',{min:1,max:16384}),
 feature('viewportHeight','固定视口高度','硬件 / 屏幕','number',720,undefined,'仅固定视口模式生效。',{min:1,max:16384}),
 feature('touch','最大触摸点','输入 / 显示偏好','number',0,'fingerprint-max-touch-points','不生成实体触摸屏。',{min:0,max:16}),
 feature('pointer','指针类型','输入 / 显示偏好','select','fine','fingerprint-pointer','fine 为鼠标精细指针，coarse 为触摸类指针。',{options:['fine','coarse','none']}),
 feature('hover','悬停能力','输入 / 显示偏好','select','hover','fingerprint-hover','无指针时不能开启悬停。',{options:['hover','none']}),
 feature('colorScheme','颜色主题','输入 / 显示偏好','select','native','fingerprint-color-scheme','网页 CSS 颜色偏好。',{options:['native','light','dark']}),
 feature('contrast','对比度','输入 / 显示偏好','select','native','fingerprint-preferred-contrast','网页的对比度偏好。',{options:['native','no-preference','more','less']}),
 feature('forcedColors','强制颜色','输入 / 显示偏好','select','native','fingerprint-forced-colors','会影响实际网页样式。',{options:['native','active','none']}),
 ...['reduced-motion','reduced-transparency','inverted-colors'].map((name,i)=>feature(name,['减少动画','减少透明度','反色'][i],'输入 / 显示偏好','select','native','fingerprint-'+name,'设置网页有效显示偏好。',{options:['native','true','false']})),
 feature('timer','时钟精度（毫秒）','输入 / 显示偏好','number',0,'fingerprint-timer-resolution','0 为原生；正值量化公开时间，不改变内部调度。',{min:0,max:1000}),
 feature('fontPolicy','字体策略','字体 / 存储','select','native','fingerprint-font-policy','restricted 需要真实已安装字体名称。',{options:['native','restricted'],status:'limited'}),
 feature('fontWhitelist','字体名单','字体 / 存储','text','','fingerprint-font-whitelist','用逗号分隔 1–256 个字体族；不模拟其它系统栅格器。',{status:'limited'}),
 feature('fontsDir','字体目录','字体 / 存储','directory','',undefined,'用于读取字体和名单；只有 Linux 接入 Fontconfig，Windows 不自动安装字体。',{status:'limited'}),
 feature('windowsFontMetrics','Windows 字体度量','字体 / 存储','toggle',false,'fingerprint-windows-font-metrics','仅 Linux → Windows persona 且有匹配字体时生效；Windows 本机不支持。',{status:'unsupported',platform:'linux'}),
 feature('quota','存储配额（MiB）','字体 / 存储','number',102400,'fingerprint-storage-quota','浏览器配额策略，非磁盘预留；0 禁止新分配。',{min:0,max:8796093022207}),
 feature('thirdPartyCookies','允许第三方 Cookie','字体 / 存储','toggle',false,undefined,'不覆盖 SameSite、Secure 或站点内容规则。'),
 feature('synthetic','Synthetic 测试模式','实验设置','toggle',false,'uxr-synthetic-device-tests','合成夹具不是实测设备库。',{experimental:true,status:'limited'}),
 feature('fakeShadowRoot','读取封闭 author ShadowRoot','实验设置','toggle',false,undefined,'不暴露浏览器内部 shadow root。',{experimental:true,status:'limited'}),
 feature('runtimeSuppression','Runtime suppression','实验设置','toggle',false,'fingerprint-devtools-runtime-suppression','可能破坏控制台、绑定以及环境诊断。',{experimental:true,status:'limited'}),
 feature('canvasBridge','Canvas Bridge 地址','实验设置','text','',undefined,'需自备服务；会关闭相关 renderer 沙箱并向服务发送图形操作。',{experimental:true,status:'limited'}),
 feature('canvasBridgeConsent','允许 Bridge 降低渲染器沙箱保护','实验设置','toggle',false,undefined,'仅在了解并接受上述影响后选择；默认关闭。',{experimental:true,status:'limited'})
];
export const CAPABILITIES:Feature[]=[...FEATURES,
 feature('webgpu','WebGPU 原生信息','能力边界','text','',undefined,'普通模式保留真实 Dawn adapter identity、features 与 limits。',{status:'limited'}),
 feature('hdr','HDR / 色域 / 键盘布局','能力边界','text','native',undefined,'保留真实设备能力，仅支持原生。',{status:'limited'}),
 feature('clientRects','ClientRects 独立扰动','能力边界','text','',undefined,'上游未完成同等覆盖，不提供开关。',{status:'unsupported'}),
 feature('socksUdp','SOCKS5 UDP 转发','能力边界','text','',undefined,'上游未实现 UDP ASSOCIATE。',{status:'unsupported'}),
 feature('portableCookies','跨机原生 Cookie 数据库','能力边界','text','',undefined,'使用显式加密 Cookie 迁移，不能直接复制数据库保证登录。',{status:'unsupported'})
];
export function defaultValues():Values {return Object.fromEntries(FEATURES.map(f=>[f.key,f.default]));}
export function newProfile(id:string,seed:string,kernelId='',defaults:Values={}):Profile {const now=new Date().toISOString();return {id,seed,kernelId,name:'',group:'未分组',tags:[],notes:'',archived:false,proxyId:'',extensionIds:[],startUrls:['about:blank'],downloadDir:'',mode:'custom',recordPath:'',values:{...defaultValues(),...defaults},createdAt:now,updatedAt:now};}
