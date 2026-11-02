import {createDashboardPage} from './dashboard-page';
import {isIP} from 'node:net';
import {dashboardSources,DASHBOARD_SOURCES,type DashboardState} from '../shared/dashboard';
import {parseWho,parseBrowserLeaks,parseSannysoft,parseCreepjs,readWhoIdentity} from './dashboard-parsers';

// Fixed, read-only diagnostic collectors. No user URLs or scripts are accepted.
export async function launchDashboard(context:any,initial:Omit<DashboardState,'phase'|'sources'>,ready:(page:any)=>Promise<void>,safeError:(error:unknown)=>string){
 const local=await createDashboardPage(initial),owned=new Set<any>();let closed=false;
 const close=async()=>{if(closed)return;closed=true;await Promise.allSettled([...owned].map(p=>p.close()));owned.clear();await local.close();};
 context.once('close',()=>void close());
 let page:any;try{page=context.pages().find((p:any)=>p.url()==='about:blank')||await context.newPage();}catch(error){await close();throw error;}
 page.once('close',()=>void close());
 async function navigate(tab:any,url:string){
  const response=await tab.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  if(response&&response.status()>=400)throw new Error('检测站返回 HTTP '+response.status());
  if(new URL(tab.url()).origin!==new URL(url).origin)throw new Error('检测站跳转至其他来源，请打开原站查看');
 }
 async function settled(tab:any,fn:()=>boolean,timeout=30000){try{await tab.waitForFunction(fn,undefined,{timeout});return true;}catch{if(closed||tab.isClosed())throw new Error('检测已停止');return false;}}
 async function collect(id:string,tab:any){
  const source=DASHBOARD_SOURCES.find(s=>s.id===id)!;
  let whoIdentity:DashboardState['identity'];
  const identityTasks:Promise<void>[]=[];
  const responseListener=(response:any)=>{
   if(id!=='who')return;
   const url=new URL(response.url());if(url.origin!=='https://who.1ms.dog'||url.pathname!=='/api/me'||response.status()!==200)return;
   identityTasks.push(response.json().then((raw:any)=>{whoIdentity=readWhoIdentity(raw);if(whoIdentity)local.update({identity:{...whoIdentity,source:'Who 当前页面'}});}).catch(()=>{}));
  };
  tab.on('response',responseListener);
  try{
   await navigate(tab,source.url);
   if(id==='who'){
    const done=await settled(tab,()=>{const grade=document.querySelector('#mGrade'),rows=[...document.querySelectorAll('#checks .ckr')];return Boolean(grade&&/\b(?:A\+?|B|C|D|F)\b/.test(grade.textContent||'')&&rows.length>=3&&rows.every(r=>/\bst-(ok|warn|bad|info)\b/.test(r.className)));},40000);
    const raw=await tab.evaluate(()=>({grade:document.querySelector('#mGrade')?.textContent,gradeTitle:document.querySelector('#mGrade')?.getAttribute('title'),rows:[...document.querySelectorAll('#checks .ckr')].map(row=>({label:[...(row.querySelector('.ck-l')?.childNodes||[])].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(''),value:row.querySelector('.ck-v')?.textContent,className:row.className,tips:[...row.querySelectorAll('.ck-tip li')].map(li=>li.textContent)}))}));
    await Promise.allSettled(identityTasks);const result=parseWho(raw);
    if(!done){result.status='limited';result.summary='检测站尚未完成全部检查；当前等级仅供参考';}
    return result;
   }
   if(id==='browserleaks'){
    const rows=await tab.locator('table.wb tr').evaluateAll((elements:Element[])=>elements.map(e=>{const cells=e.querySelectorAll('td');return {label:cells[0]?.textContent?.trim(),value:cells[1]?.textContent?.trim()};}));
    if(!local.state().identity?.ip){const read=(key:string)=>rows.find((r:any)=>r.label===key)?.value?.slice(0,300)||'',ip=read('IP Address');if(isIP(ip))local.update({identity:{ip,country:read('Country'),region:read('State/Region'),city:read('City'),isp:read('ISP'),ipTimezone:read('Timezone').split(/\s/)[0],source:'BrowserLeaks IP 页面'}});}
    let dnsError='',rtcError='',dnsSummary='',dnsRows:any[]=[],rtc='',rtcRows:any[]=[];
    try{
     await tab.locator('#dns-run').click({timeout:10000});
     const done=await settled(tab,()=>/Found\s+\d+\s+Servers?/i.test(document.querySelector('#dns-test')?.textContent||''),45000);
     dnsSummary=await tab.locator('#dns-test').innerText();
     dnsRows=await tab.locator('#dns-container tr').evaluateAll((elements:Element[])=>elements.map(e=>{const c=e.querySelectorAll('td');return {ip:c[0]?.textContent?.trim(),isp:c[1]?.textContent?.trim(),location:c[2]?.textContent?.trim()};}));
     if(!done)dnsError='DNS 解析器检查超时，不能视为通过';
    }catch(error){dnsError=safeError(error);}
    if(closed)throw new Error('检测已停止');
    try{
     await navigate(tab,'https://browserleaks.com/webrtc');
     const done=await settled(tab,()=>/No Leak|Leaking|Leak Detected/i.test(document.querySelector('#rtc-leak')?.textContent||''),20000);
     rtc=await tab.locator('#rtc-leak').innerText();
     rtcRows=await tab.locator('#rtc-local,#rtc-public,#client-ipv4,#client-ipv6').evaluateAll((elements:Element[])=>elements.map(e=>({label:e.id,value:e.textContent?.trim()})));
     if(!done)rtcError='WebRTC 检查未给出明确结论';
    }catch(error){rtcError=safeError(error);}
    const result=parseBrowserLeaks({rows,dnsSummary,dnsRows,rtc,dnsError,rtcError});
    for(const r of rtcRows)result.items.push({label:({'rtc-local':'WebRTC 本地地址','rtc-public':'WebRTC 公网地址','client-ipv4':'WebRTC 页出口 IPv4','client-ipv6':'WebRTC 页出口 IPv6'} as Record<string,string>)[r.label],value:r.value||'未提供',status:'info'});
    return result;
   }
   if(id==='sannysoft'){
    const done=await settled(tab,()=>document.querySelectorAll('td.result.passed,td.result.failed,td.result.warn').length>=8,20000);
    const rows=await tab.locator('table tr').evaluateAll((elements:Element[])=>elements.map(e=>{const c=e.querySelectorAll('td'),r=e.querySelector('td.result');return {label:c[0]?.textContent?.trim(),value:r?.textContent?.trim(),result:r?.className};}));
    const result=parseSannysoft(rows);if(!done)result.status='limited';
    if(initial.engine==='firefox')result.items.forEach(i=>{if(/Chrome/i.test(i.label))i.detail='此项以 Chromium 为参照，Firefox 的引擎差异不等同于代理泄漏。';});
    return result;
   }
   const done=await settled(tab,()=>['.like-headless-rating','.headless-rating','.stealth-rating'].every(s=>/\d+%/.test(document.querySelector(s)?.textContent||'')),35000);
   const result=parseCreepjs(await tab.locator('body').innerText());if(!done)result.status='limited';return result;
  }finally{tab.off('response',responseListener);}
 }
 local.handlers({
  async open(id){if(closed)return;const source=DASHBOARD_SOURCES.find(s=>s.id===id);if(!source)return;const tab=await context.newPage();await ready(tab);await tab.goto(source.url,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>{});await tab.bringToFront().catch(()=>{});},
  async run(){
   if(closed)return;
   // Set synchronously before the first await, including clearing prior-run identity/grades.
   local.update({phase:'running',identity:undefined,sources:dashboardSources(),startedAt:new Date().toISOString(),completedAt:undefined});
   try{for(const source of DASHBOARD_SOURCES){
    if(closed)break;const started=Date.now();let tab:any,timer:NodeJS.Timeout|undefined;
    local.source(source.id,{status:'running',summary:'正在采集当前环境的实测结果'});
    try{
     tab=await context.newPage();owned.add(tab);if(closed)break;await ready(tab);if(closed)break;
     const result=await Promise.race([collect(source.id,tab),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('检测站总时限已到，未完成结果不能视为通过')),150000);})]);local.source(source.id,{...result,updatedAt:new Date().toISOString(),durationMs:Date.now()-started});
    }catch(error){if(!closed)local.source(source.id,{status:'error',summary:safeError(error),items:[],updatedAt:new Date().toISOString(),durationMs:Date.now()-started});}
    finally{if(timer)clearTimeout(timer);if(tab){await tab.close().catch(()=>{});owned.delete(tab);}}
   }}finally{if(!closed)local.update({phase:'complete',completedAt:new Date().toISOString()});}
  }
 });
 try{await ready(page);await page.goto(local.url,{waitUntil:'load',timeout:15000});}catch(error){await close();throw error;}
 return {page,local,close};
}
