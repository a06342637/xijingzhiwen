import type {Profile,ProxyConfig} from '../shared/model';
import {proxyUrl} from '../shared/config';
import {regionalWindowsFonts,browsingFonts} from '../shared/font-presets';
import {browsingAppearance} from '../shared/browsing-appearance';
type Geo={locale?:string|null;timezone?:string|null;exitIp?:string|null};
export function applyProxyLocale(profile:Profile,geo:Geo,locked:readonly string[]=[]){
 const p=structuredClone(profile);
 p.values=browsingAppearance(browsingFonts(p.values,locked),locked);
 if(p.values.geoip){if(!geo.locale||!geo.timezone)throw new Error('代理出口缺少语言或时区资料，无法自动匹配');if(!locked.includes('locale'))p.values.locale=geo.locale;if(!locked.includes('timezone'))p.values.timezone=geo.timezone;}
 if(p.values.geoip&&p.values.randomStrategy!=='catalog'&&p.values.fontPolicy==='native'&&!locked.some(k=>['fontPolicy','fontWhitelist','fontsDir'].includes(k))&&p.values.platform==='windows'&&p.values.deviceType==='desktop'&&p.values.identityMode!=='off'&&['en-CA','en-US','ja-JP','th-TH'].includes(String(p.values.locale)))p.values=regionalWindowsFonts(p.values,String(p.values.locale));
 if(p.values.webrtcMode==='auto'){p.values.webrtcMode='custom';p.values.webrtcIp=geo.exitIp!;}
 p.values.geoip=false;return p;
}
export async function resolveProxyLocale(profile:Profile,proxy?:ProxyConfig,locked:readonly string[]=[]){
 const p=structuredClone(profile);if(p.mode!=='measured')p.values=browsingAppearance(browsingFonts(p.values,locked),locked);if(p.mode!=='measured'&&!proxy&&p.values.webrtcMode==='auto')throw new Error('自动 WebRTC 出口地址需要有效代理');if(p.mode==='measured'||!proxy||(!p.values.geoip&&p.values.webrtcMode!=='auto'))return {profile:p};
 const lib=await import('@xiaoxiaofeihh/chromix');const geo=await lib.maybeResolveGeoip(true,{server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined},undefined,undefined,[]);
 return {profile:applyProxyLocale(p,geo,locked),geo};
}
