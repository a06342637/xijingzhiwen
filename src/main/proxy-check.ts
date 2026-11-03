import type {ProxyConfig} from '../shared/model';
import {proxyUrl} from '../shared/config';

type Geo={exitIp?:string|null;timezone?:string|null;locale?:string|null;country?:string|null;region?:string;city?:string;isp?:string};
type Lookup=(proxy:{server:string;username?:string;password?:string})=>Promise<Geo>;
export async function checkProxyRoute(proxy:ProxyConfig,lookup?:Lookup){
 const route={server:proxyUrl(proxy),username:proxy.username||undefined,password:proxy.password||undefined};
 const resolve:Lookup=lookup||((route)=>import('@xiaoxiaofeihh/chromix').then(lib=>lib.maybeResolveGeoip(true,route,undefined,undefined,[])));
 const samples:Geo[]=[];
 for(let i=0;i<3;i++){
  // Pass credentials only to the transport. Never return them to the UI/report.
  const geo=await resolve(route);
  if(!geo.exitIp||!geo.timezone)throw new Error('代理出口缺少 IP 或时区，无法完成出口检查');
  samples.push({exitIp:geo.exitIp,timezone:geo.timezone,locale:geo.locale??null,...(geo.country?{country:geo.country}:{}),...(geo.region?{region:geo.region}:{}),...(geo.city?{city:geo.city}:{}),...(geo.isp?{isp:geo.isp}:{})});
 }
 const routeStable=new Set(samples.map(s=>s.exitIp)).size===1;
 const timezoneStable=new Set(samples.map(s=>s.timezone)).size===1;
 return {...samples[0],samples,routeStable,timezoneStable,message:routeStable?'连续三次查询出口一致；这不保证其他网站或后续连接使用同一出口。':timezoneStable?'检测到轮换出口，当前三次时区一致；其他网站仍可能分配不同城市。请使用供应商固定会话节点。':'检测到轮换出口和不同时区；启动时的语言/时区不能跟随每个后续出口。请使用供应商固定会话或固定城市节点。'};
}
