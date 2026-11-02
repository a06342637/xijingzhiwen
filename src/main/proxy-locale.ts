import type {Profile,ProxyConfig} from '../shared/model';
import {proxyUrl} from '../shared/config';
import {englishWindowsFonts} from '../shared/font-presets';
type Geo={locale?:string|null;timezone?:string|null;exitIp?:string|null};
export function applyProxyLocale(profile:Profile,geo:Geo){
 const p=structuredClone(profile);
 if(p.values.geoip){if(!geo.locale||!geo.timezone)throw new Error('代理出口缺少语言或时区资料，无法自动匹配');p.values.locale=geo.locale;p.values.timezone=geo.timezone;}
 if(p.values.geoip&&p.values.randomStrategy!=='catalog'&&p.values.fontPolicy==='native'&&p.values.platform==='windows'&&p.values.deviceType==='desktop'&&p.values.identityMode!=='off'&&['en-CA','en-US'].includes(String(geo.locale)))p.values=englishWindowsFonts(p.values);
 if(p.values.webrtcMode==='auto'){p.values.webrtcMode='custom';p.values.webrtcIp=geo.exitIp!;}
 p.values.geoip=false;return p;
}
export async function resolveProxyLocale(profile:Profile,proxy?:ProxyConfig){
 const p=structuredClone(profile);if(p.mode!=='measured'&&!proxy&&p.values.webrtcMode==='auto')throw new Error('自动 WebRTC 出口地址需要有效代理');if(p.mode==='measured'||!proxy||(!p.values.geoip&&p.values.webrtcMode!=='auto'))return {profile:p};
 const lib=await import('@xiaoxiaofeihh/chromix');const geo=await lib.maybeResolveGeoip(true,{server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined},undefined,undefined,[]);
 return {profile:applyProxyLocale(p,geo),geo};
}
