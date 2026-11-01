import fs from 'node:fs/promises';
import path from 'node:path';
import {isIP} from 'node:net';
import {validateProfile,proxyUrl} from '../shared/config';
import type {Profile,ProxyConfig} from '../shared/model';

// Native Camoufox properties only. No init-script identity overrides or model downloads.
export function firefoxIdentity(p:Profile,version:string){
 const v=p.values,major=String(v.brandVersion||version).split('.')[0];
 const platforms:Record<string,[string,string,string]>={windows:['Windows NT 10.0; Win64; x64','Win32','Windows NT 10.0; Win64; x64'],macos:['Macintosh; Intel Mac OS X 10.15','MacIntel','Intel Mac OS X 10.15'],linux:['X11; Linux x86_64','Linux x86_64','Linux x86_64']};
 const [uaOS,platform,oscpu]=platforms[String(v.platform)];
 const ua=String(v.userAgent||`Mozilla/5.0 (${uaOS}; rv:${major}.0) Gecko/20100101 Firefox/${major}.0`);
 const config:Record<string,unknown>={'navigator.userAgent':ua,'headers.User-Agent':ua,'navigator.platform':platform,'navigator.oscpu':oscpu,'navigator.hardwareConcurrency':Number(v.cpu),'navigator.maxTouchPoints':Number(v.touch),'screen.width':Number(v.screenWidth),'screen.height':Number(v.screenHeight),'screen.availWidth':Number(v.screenWidth),'screen.availHeight':Number(v.screenHeight)-Number(v.taskbarHeight),'screen.colorDepth':24,'screen.pixelDepth':24};
 if(v.viewportMode!=='fixed')Object.assign(config,{'window.outerWidth':Number(v.windowWidth),'window.outerHeight':Number(v.windowHeight)});
 if(v.locale){const l=new Intl.Locale(String(v.locale));Object.assign(config,{'navigator.language':String(v.locale),'headers.Accept-Language':String(v.locale),'locale:language':l.language,'locale:all':String(v.locale)});if(l.region)config['locale:region']=l.region;}
 if(v.timezone)config.timezone=v.timezone;
 if(v.webrtcMode==='custom')config[isIP(String(v.webrtcIp))===6?'webrtc:ipv6':'webrtc:ipv4']=v.webrtcIp;
 if(v.gpuVendor)Object.assign(config,{'webGl:vendor':v.gpuVendor,'webGl:renderer':v.gpuRenderer});
 if(v.fontPolicy==='restricted')config.fonts=String(v.fontWhitelist).split(',').map(x=>x.trim());
 return config;
}
export function chunkConfig(config:Record<string,unknown>){
 const data=JSON.stringify(config).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 return Object.fromEntries(Array.from({length:Math.ceil(data.length/2000)},(_,i)=>['CAMOU_CONFIG_'+(i+1),data.slice(i*2000,(i+1)*2000)]));
}
export async function launchFirefox(p:Profile,binary:string,profileDir:string,version:string,proxy?:ProxyConfig){
 validateProfile(p);const v=p.values,config=firefoxIdentity(p,version);
 if(proxy&&(v.geoip||v.webrtcMode==='auto')){
  if(!proxy)throw new Error('按出口匹配需要有效代理');const lib=await import('@xiaoxiaofeihh/chromix');const geo=await lib.maybeResolveGeoip(true,{server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined},undefined,undefined,[]) as any;
  if(!v.locale&&geo.locale){const l=new Intl.Locale(geo.locale);Object.assign(config,{'navigator.language':geo.locale,'headers.Accept-Language':geo.locale,'locale:language':l.language,'locale:all':geo.locale});if(l.region)config['locale:region']=l.region;}
  if(!v.timezone&&geo.timezone)config.timezone=geo.timezone;
  if(v.webrtcMode==='auto'){if(!isIP(geo.exitIp))throw new Error('出口查询未返回有效 IP');config[isIP(geo.exitIp)===6?'webrtc:ipv6':'webrtc:ipv4']=geo.exitIp;}
 }
 const properties=JSON.parse(await fs.readFile(path.join(path.dirname(binary),'properties.json'),'utf8')) as {property:string;removed?:string}[];
 for(const key of Object.keys(config))if(!properties.some(x=>x.property===key&&!x.removed))throw new Error('此火狐内核不支持配置：'+key);
 const prefs:Record<string,string|number|boolean>={'network.cookie.cookieBehavior':v.thirdPartyCookies?0:1,'network.proxy.socks_remote_dns':true,'media.peerconnection.ice.proxy_only_if_behind_proxy':true,'network.dns.disablePrefetch':true,'network.predictor.enabled':false,'network.proxy.failover_direct':false,'network.trr.mode':5,'intl.locale.requested':String(v.locale||'en-US')};
 if(proxy||v.webrtcPolicy==='disable_non_proxied_udp')Object.assign(prefs,{'media.peerconnection.ice.proxy_only':true,'media.peerconnection.ice.no_host':true,'media.peerconnection.ice.default_address_only':true});
 else if(v.webrtcPolicy!=='auto'&&v.webrtcPolicy!=='default')Object.assign(prefs,{'media.peerconnection.ice.default_address_only':true,'media.peerconnection.ice.no_host':v.webrtcPolicy==='default_public_interface_only'});
 if(!proxy&&v.webrtcPolicy!=='disable_non_proxied_udp')Object.assign(prefs,{'media.peerconnection.ice.proxy_only':false,'media.peerconnection.ice.no_host':false});
 const env={...process.env};for(const key of Object.keys(env))if(/^CAMOU_(CONFIG|PREFS)_/.test(key))delete env[key];Object.assign(env,chunkConfig(config),Object.fromEntries(Object.entries(chunkConfig(prefs)).map(([k,v])=>[k.replace('CAMOU_CONFIG_','CAMOU_PREFS_'),v])));
 const {firefox}=await import('playwright-firefox-driver');
 return firefox.launchPersistentContext(profileDir,{executablePath:binary,headless:false,timeout:120000,env,firefoxUserPrefs:prefs,viewport:v.viewportMode==='fixed'?{width:Number(v.viewportWidth),height:Number(v.viewportHeight)}:null,...(v.viewportMode==='fixed'?{deviceScaleFactor:Number(v.deviceScale),screen:{width:Number(v.screenWidth),height:Number(v.screenHeight)}}:{}),acceptDownloads:true,...(v.locale?{locale:String(v.locale)}:{}),colorScheme:v.colorScheme==='native'?null:v.colorScheme as any,forcedColors:v.forcedColors==='native'?null:v.forcedColors as any,reducedMotion:v['reduced-motion']==='native'?null:v['reduced-motion']==='true'?'reduce':'no-preference',contrast:null,...(proxy?{proxy:{server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined,bypass:[proxy.bypass,'localhost','127.0.0.1','[::1]'].filter(Boolean).join(',')}}:{})});
}
