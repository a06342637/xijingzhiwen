import type {Profile,ProxyConfig} from '../shared/model';
import {proxyUrl} from '../shared/config';
export async function resolveProxyLocale(profile:Profile,proxy?:ProxyConfig){
 const p=structuredClone(profile);if(p.mode!=='measured'&&!proxy&&p.values.webrtcMode==='auto')throw new Error('自动 WebRTC 出口地址需要有效代理');if(p.mode==='measured'||!proxy||(!p.values.geoip&&p.values.webrtcMode!=='auto'))return {profile:p};
 const lib=await import('@xiaoxiaofeihh/chromix');const geo=await lib.maybeResolveGeoip(true,{server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined},undefined,undefined,[]);
 if(p.values.geoip){if(!geo.locale||!geo.timezone)throw new Error('代理出口缺少语言或时区资料，无法自动匹配');p.values.locale=geo.locale;p.values.timezone=geo.timezone;}
 if(p.values.webrtcMode==='auto'){p.values.webrtcMode='custom';p.values.webrtcIp=geo.exitIp!;}
 p.values.geoip=false;return {profile:p,geo};
}
