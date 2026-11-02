import {isIP} from 'node:net';
import type {DashboardItem,DashboardSource,DashboardState} from '../shared/dashboard';

export function cleanText(value:unknown,max=800){return typeof value==='string'?value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'').trim().slice(0,max):'';}
export function readWhoIdentity(raw:any):DashboardState['identity']|undefined{
 if(!raw||typeof raw.ip!=='string'||!isIP(raw.ip))return;
 const cf=raw.cf||{};return {ip:raw.ip,country:cleanText(cf.country,80),region:cleanText(cf.region,120),city:cleanText(cf.city,120),ipTimezone:cleanText(cf.timezone,100),isp:cleanText(cf.asOrganization,160)};
}
type Result=Pick<DashboardSource,'status'|'summary'|'items'|'grade'|'score'>;
export function parseWho(raw:any):Result{
 const grade=/\b(A\+|A|B|C|D|F)(?![A-Za-z])/.exec(cleanText(raw?.grade,80))?.[1];
 const score=/\b(100|\d{1,2})\s*\/\s*100\b/.exec(cleanText(raw?.gradeTitle,300));
 const items:DashboardItem[]=(Array.isArray(raw?.rows)?raw.rows:[]).slice(0,30).filter((r:any)=>r&&cleanText(r.label)&&cleanText(r.value)).map((r:any)=>({label:cleanText(r.label,100),value:cleanText(r.value),status:/\bst-bad\b/.test(r.className)?'fail':/\bst-warn\b/.test(r.className)?'warn':/\bst-ok\b/.test(r.className)?'pass':'info',detail:(Array.isArray(r.tips)?r.tips:[]).map((t:any)=>cleanText(t,250)).slice(0,4).join('；')}));
 if(!grade||items.length<3)return {status:'limited',summary:'页面未给出完整等级；已读取部分结果',items};
 return {status:'complete',grade,score:score?Number(score[1]):undefined,summary:'检测站实际等级；不是安全认证',items};
}
export function parseSannysoft(rows:any[]):Result{
 const items:DashboardItem[]=(Array.isArray(rows)?rows:[]).filter(r=>cleanText(r.label)&&cleanText(r.value)&&r.result).slice(0,40).map(r=>({label:cleanText(r.label,100).replace(/\s*\((Old|New)\)/g,''),value:cleanText(r.value,250),status:/\bfailed\b/.test(r.result)?'fail':/\bwarn\b/.test(r.result)?'warn':/\bpassed\b/.test(r.result)?'pass':'info'}));
 const checked=items.filter(i=>i.status==='pass'||i.status==='fail'),failed=checked.filter(i=>i.status==='fail');
 return {status:items.length?'complete':'limited',summary:items.length?`${checked.length-failed.length}/${checked.length} 个有明确结论的项目通过；此站没有官方总分`:'没有读取到检查表，可能尚未完成或页面变化',items};
}
export function parseCreepjs(text:string):Result{
 const items:DashboardItem[]=[];
 for(const [pattern,label,reverse] of [[/(\d+(?:\.\d+)?)% like headless/i,'类似无界面环境',true],[/(\d+(?:\.\d+)?)% headless/i,'无界面特征',true],[/(\d+(?:\.\d+)?)% stealth/i,'修改特征',true]] as const){const match=pattern.exec(text);if(match)items.push({label,value:match[1]+'%',status:Number(match[1])===0?'pass':'warn',detail:'网站原始百分比；不是栖境计算的安全分数'});}
 const noise=/rendering:\s*([^\n]*)/i.exec(text);if(noise)items.push({label:'Canvas 渲染观测',value:cleanText(noise[1],200)||'未显示扰动标记',status:/noise/i.test(noise[1])?'warn':'info'});
 const fp=/FP ID:\s*([a-f0-9]{16,128})/i.exec(text);if(fp)items.push({label:'指纹摘要',value:fp[1],status:'info',detail:'此站显示的指纹标识，不代表跨站匿名'});
 const ratios=items.filter(i=>/%$/.test(i.value));
 return {status:ratios.length===3?'complete':'limited',summary:ratios.length?ratios.map(i=>i.label+' '+i.value).join(' · ')+'；无官方总分':'未读取到特征比例；此站没有统一安全总分',items};
}
export function parseBrowserLeaks(raw:any):Result{
 const rows=(Array.isArray(raw.rows)?raw.rows:[]).slice(0,500),items:DashboardItem[]=[];
 for(const key of ['IP Address','Country','State/Region','City','ISP','Timezone','OS','JA4','JA4T']){const row=rows.find((r:any)=>cleanText(r.label)===key);if(row&&cleanText(row.value))items.push({label:key==='OS'?'TCP 系统推断':key,value:cleanText(row.value,300),status:'info'});}
 const dns=cleanText(raw.dnsSummary,500);if(dns)items.push({label:'DNS 解析器测试',value:dns,status:/Found\s+\d+/i.test(dns)?'info':'warn',detail:'解析器所在地不是直接流量路由证明；请与出口及直连对照'});
 const dnsRows=(Array.isArray(raw.dnsRows)?raw.dnsRows:[]).slice(0,150);
 for(const row of dnsRows){if(isIP(cleanText(row.ip)))items.push({label:'DNS '+cleanText(row.ip,64),value:[cleanText(row.isp,120),cleanText(row.location,160)].filter(Boolean).join(' · ')||'位置未知',status:'info'});}
 const rtc=cleanText(raw.rtc,300);if(rtc)items.push({label:'WebRTC 泄漏测试',value:rtc,status:/No Leak/i.test(rtc)?'pass':/Leak/i.test(rtc)?'fail':'info',detail:'当前站点的结果；无可见候选不证明所有 UDP 路由已验证'});
 if(raw.dnsError)items.push({label:'DNS 检查未完成',value:cleanText(raw.dnsError),status:'warn'});
 if(raw.rtcError)items.push({label:'WebRTC 检查未完成',value:cleanText(raw.rtcError),status:'warn'});
 return {status:items.length?(raw.dnsError||raw.rtcError?'limited':'complete'):'limited',summary:'此站没有官方总分；显示网络、DNS 与 WebRTC 实测',items};
}
