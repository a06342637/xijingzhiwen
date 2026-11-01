import { isIP } from 'node:net';
import path from 'node:path';
import { FEATURES, profileSchema, type Profile, type ProxyConfig } from './model';
import {fieldSupported} from './devices';
export function validateProfile(raw:unknown):Profile {
 const p=profileSchema.parse(raw);p.values={engine:'chromium',deviceType:'desktop',deviceScale:'1',...p.values};const v=p.values;
 if(v.engine==='firefox'){
  if(p.mode==='measured'||v.deviceType!=='desktop')throw new Error('火狐目前只支持自定义电脑环境');
  if(v.brandVersion&&!/^[1-9]\d*$/.test(String(v.brandVersion)))throw new Error('火狐品牌版本目前只支持主版本整数，例如 158');
  if(v.brand!=='Firefox')throw new Error('火狐内核必须选择 Firefox 品牌');
  for(const f of FEATURES)if(!fieldSupported(f.key,v)&&v[f.key]!==f.default)throw new Error('火狐当前不支持：'+f.label);
  if(p.extensionIds.length)throw new Error('当前扩展管理仅支持 Chromium；火狐扩展请在浏览器内安装');
 }else if(v.brand==='Firefox')throw new Error('Firefox 品牌需要火狐内核');
 if(v.deviceType!=='desktop'){
  if(p.mode==='measured'||v.viewportMode!=='fixed'||Number(v.touch)<1||v.pointer!=='coarse'||v.hover!=='none')throw new Error('移动端模拟需要固定视口、触摸点、粗略指针与无悬停');
  if(v.identityMode==='off'||v.pixelNoise!=='native'||v.audioRender!=='native'||v.gpuVendor||v.fontPolicy!=='native'||v.synthetic)throw new Error('移动端布局模拟不能混入电脑图形、字体或实测身份覆盖');
  for(const f of FEATURES)if(!fieldSupported(f.key,v)&&!['platform','brand','taskbarHeight','viewportMode','pointer','hover'].includes(f.key)&&v[f.key]!==f.default)throw new Error('移动端布局模拟不支持覆盖：'+f.label);
 }
 for(const [key,value] of Object.entries(v))if(typeof value==='string'&&/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value))throw new Error('配置含非法控制字符：'+key);
 if(p.downloadDir&&(!path.isAbsolute(p.downloadDir)||/[\x00-\x1f]/.test(p.downloadDir)))throw new Error('下载目录必须为有效绝对路径');
 for(const key of ['fontsDir','widevinePath'])if(v[key]&&(!path.isAbsolute(String(v[key]))||/[\x00-\x1f]/.test(String(v[key]))))throw new Error('目录必须为有效绝对路径：'+key);
 if(BigInt(p.seed)>18446744073709551615n)throw new Error('环境种子超过 uint64 范围');
 for(const key of Object.keys(v))if(!FEATURES.some(f=>f.key===key))throw new Error('未知配置项：'+key);
 for(const f of FEATURES){const value=v[f.key];if(value===undefined)throw new Error('缺少配置：'+f.label);if(f.kind==='toggle'&&typeof value!=='boolean')throw new Error(f.label+'必须是开关');if(['text','select','directory'].includes(f.kind)&&typeof value!=='string')throw new Error(f.label+'必须是文本');if(f.options&&!f.options.includes(String(value)))throw new Error(f.label+'选项无效');if(f.kind==='number'&&(typeof value!=='number'||!Number.isInteger(value)||(f.min!==undefined&&value<f.min)||(f.max!==undefined&&value>f.max)))throw new Error(f.label+'超出有效范围');}
 for(const u of p.startUrls){if(u==='about:blank')continue;let url:URL;try{url=new URL(u);}catch{throw new Error('启动地址无效：'+u);}if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('启动地址仅支持不带凭据的 HTTP/HTTPS');}
 if(p.mode==='measured'){if(!p.recordPath)throw new Error('实测模式需要设备记录');if(p.proxyId||p.extensionIds.length||Object.keys(v).some(k=>k!=='geoip'&&v[k]!==FEATURES.find(f=>f.key===k)?.default))throw new Error('实测模式不能混用代理、扩展或自定义参数；切换时请重置设置');return p;}
 if(v.webrtcMode==='custom'&&!isIP(String(v.webrtcIp)))throw new Error('请输入有效的 WebRTC IPv4/IPv6');
 if(v.webrtcMode!=='custom'&&v.webrtcIp)throw new Error('手动 WebRTC IP 需要选择 custom 模式');
 if(v.timezone){try{new Intl.DateTimeFormat('en',{timeZone:String(v.timezone)});}catch{throw new Error('时区名称无效');}}
 if(v.locale){try{new Intl.Locale(String(v.locale));}catch{throw new Error('语言标签无效');}}
 for(const k of ['brandVersion','platformVersion'])if(v[k]&&(!/^\d+(\.\d+){0,3}$/.test(String(v[k]))||String(v[k]).split('.').some(x=>BigInt(x)>4294967295n)))throw new Error('版本应为最多四段的有效数字');
 if(v.brandVersion&&(BigInt(String(v.brandVersion).split('.')[0])<1n||BigInt(String(v.brandVersion).split('.')[0])>2147483647n))throw new Error('品牌主版本必须是正 int32');
 if(v.userAgent&&/[\r\n]/.test(String(v.userAgent)))throw new Error('User-Agent 不允许换行');
 if(Boolean(v.gpuVendor)!==Boolean(v.gpuRenderer))throw new Error('WebGL Vendor 和 Renderer 必须成对填写');
 if((v.gpuVendor||v.gpuRenderer)&&v.gpuBackend!=='compatibility')throw new Error('自定义 WebGL 名称需要 compatibility 模式');
 if(v.identityMode==='off'&&(v.pixelNoise==='seeded'||v.audioRender==='isolated'||v.gpuVendor||v.synthetic))throw new Error('原生对照模式与像素扰动、音频隔离、自定义 GPU 或 Synthetic 冲突');
 if(v.noise===false&&(v.pixelNoise==='seeded'||v.audioRender==='isolated'))throw new Error('扰动已关闭，不能同时请求像素扰动或音频隔离');
 if(v.audioSeed&&(!/^[1-9]\d{0,19}$/.test(String(v.audioSeed))||BigInt(String(v.audioSeed))>18446744073709551615n))throw new Error('音频种子必须为非零 uint64');
 if(Number(v.taskbarHeight)>=Number(v.screenHeight))throw new Error('工作区保留高度必须小于屏幕高度');
 if((v.pointer==='none'&&(Number(v.touch)>0||v.hover==='hover'))||(v.pointer==='coarse'&&Number(v.touch)===0))throw new Error('触摸点数、指针和悬停配置矛盾');
 if(v.fontPolicy==='restricted'&&(!String(v.fontWhitelist).trim()||String(v.fontWhitelist).split(',').length>256||String(v.fontWhitelist).split(',').some(x=>!x.trim())||Buffer.byteLength(String(v.fontWhitelist))>4096))throw new Error('限制字体需要 1–256 个非空真实字体族，最长 4096 字节');
 if(v.windowsFontMetrics&&process.platform!=='linux')throw new Error('Windows 字体度量对齐仅适用于 Linux');
 if(v.widevine==='custom'&&!v.widevinePath)throw new Error('请选择 Widevine 目录');
 if(v.canvasBridge){if(!v.canvasBridgeConsent)throw new Error('Canvas Bridge 需要显式确认沙箱影响');let u:URL;try{u=new URL(String(v.canvasBridge).includes('://')?String(v.canvasBridge):'ws://'+v.canvasBridge);}catch{throw new Error('Bridge 地址无效');}if(u.protocol!=='ws:'||!u.hostname||u.username||u.password||!u.port)throw new Error('Bridge 需要不带凭据的 ws://主机:端口 地址');}
 return p;
}
export function proxyUrl(p:ProxyConfig){if(/[\s\x00-\x1f\/\\@?#]/.test(p.host)||(!isIP(p.host)&&!/^\.?[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.?$/i.test(p.host)))throw new Error('代理主机只填写有效域名或 IP');for(const value of [p.username,p.password])if(value&&/[\x00-\x1f\x7f]/.test(value))throw new Error('代理凭据含无效控制字符');if(p.protocol==='socks5'&&(p.username||p.password)&&(!p.username||!p.password||Buffer.byteLength(p.username)>255||Buffer.byteLength(p.password)>255))throw new Error('SOCKS5 认证需要 1–255 字节的用户名和密码');const host=isIP(p.host)===6?'['+p.host+']':p.host;return `${p.protocol}://${host}:${p.port}`;}
export function buildOptions(p:Profile,binary:string,profileDir:string,extensions:string[],proxy?:ProxyConfig){
 validateProfile(p);if(p.mode==='measured')throw new Error('实测模式必须通过专用设备入口启动');
 if(p.values.engine==='firefox')throw new Error('火狐必须通过专用内核入口启动');
 const v=p.values,args:string[]=[`--fingerprint=${v.identityMode==='off'?'off':p.seed}`];
 const nativeExclusions=new Set(['platform','brand','brandVersion','platformVersion','gpuBackend','gpuVendor','gpuRenderer','cpu','memory','screenWidth','screenHeight','taskbarHeight','quota','touch','pointer','hover','fontPolicy','fontWhitelist','audioRender','audioSeed']);
 for(const f of FEATURES){const value=v[f.key];if(!f.flag||value===''||value===false||(value==='native'&&f.key!=='gpuBackend')||(v.identityMode==='off'&&nativeExclusions.has(f.key)))continue;args.push(`--${f.flag}=${value}`);}
 if(v.noise===false)args.push('--fingerprint-noise=false');
 if(v.webrtcMode==='auto')args.push('--fingerprint-webrtc-ip=auto');
 if(v.webrtcMode==='custom')args.push(`--fingerprint-webrtc-ip=${v.webrtcIp}`);
 if(v.webrtcPolicy!=='auto')args.push(`--force-webrtc-ip-handling-policy=${v.webrtcPolicy}`);
 if(v.thirdPartyCookies)args.push('--fingerprint-allow-3p-cookies');
 if(v.fakeShadowRoot)args.push('--enable-blink-features=FakeShadowRoot');
 if(v.canvasBridge)args.push(`--fingerprint-canvas-bridge=${v.canvasBridge}`,'--fingerprint-canvas-bridge-unsafe');
 if(v.maximized)args.push('--start-maximized');else args.push(`--window-size=${v.windowWidth},${v.windowHeight}`);
 if(extensions.length){if(extensions.some(p=>p.includes(',')))throw new Error('扩展目录不能包含逗号');args.push('--load-extension='+extensions.join(','),'--disable-extensions-except='+extensions.join(','));}
 const options:any={userDataDir:profileDir,headless:false,stealthArgs:false,args,geoip:Boolean(v.geoip),viewport:v.viewportMode==='fixed'?{width:v.viewportWidth,height:v.viewportHeight}:null,launchOptions:{executablePath:binary,chromiumSandbox:true,timeout:60000,downloadsPath:p.downloadDir||undefined,ignoreDefaultArgs:extensions.length?['--enable-automation','--disable-extensions']:['--enable-automation']},contextOptions:{acceptDownloads:true}};
 if(v.viewportMode==='fixed')Object.assign(options.contextOptions,{screen:{width:Number(v.screenWidth),height:Number(v.screenHeight)},deviceScaleFactor:Number(v.deviceScale)});
 if(v.deviceType&&v.deviceType!=='desktop'){
  options.args=args.filter(a=>!a.startsWith('--fingerprint-')&&!a.startsWith('--fingerprint='));options.args.unshift('--fingerprint=off');
  Object.assign(options.contextOptions,{isMobile:true,hasTouch:true});
  if(v.colorScheme!=='native')options.colorScheme=v.colorScheme;
  if(v.forcedColors!=='native')options.contextOptions.forcedColors=v.forcedColors;
  if(v['reduced-motion']!=='native')options.contextOptions.reducedMotion=v['reduced-motion']==='true'?'reduce':'no-preference';
 }
 if(v.locale)options.locale=v.locale;if(v.timezone)options.timezone=v.timezone;if(v.userAgent)options.userAgent=v.userAgent;if(v.fontsDir)options.fontsDir=v.fontsDir;
 if(proxy)options.proxy={server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined,bypass:[proxy.bypass,'localhost','127.0.0.1','[::1]'].filter(Boolean).join(',')};
 options.geoip=false; // The worker resolves once through the bound proxy, before launch.
 if(proxy)options.args.push('--disable-quic',`--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE ${proxy.host}, EXCLUDE localhost, EXCLUDE 127.0.0.1`);
 return options;
}
