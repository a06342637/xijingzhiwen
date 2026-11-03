import {createDashboardPage} from './dashboard-page';
import {DASHBOARD_SOURCES,type DashboardState} from '../shared/dashboard';
import {readWhoIdentity} from './dashboard-parsers';

// Only query exit metadata automatically; full tests are opened by the user.
export async function launchDashboard(context:any,initial:Omit<DashboardState,'phase'|'sources'>,ready:(page:any)=>Promise<void>,safeError:(error:unknown)=>string){
 const local=await createDashboardPage(initial),owned=new Set<any>();let closed=false,generation=0;
 const cancel=async()=>{generation++;const tabs=[...owned];owned.clear();local.update({phase:'complete'});await Promise.allSettled(tabs.map(p=>p.close()));};
 const close=async()=>{if(closed)return;closed=true;await cancel();await local.close();};context.once('close',()=>void close());
 let page:any;try{page=context.pages().find((p:any)=>p.url()==='about:blank')||await context.newPage();}catch(error){await close();throw error;}
 const isDashboard=()=>[local.url,local.url+'/'].includes(page.url().split('#')[0]);page.once('close',()=>void close());
 page.on('framenavigated',(frame:any)=>{if(frame===page.mainFrame()&&!closed&&!isDashboard())void cancel();});
 local.handlers({
  async open(id){
   if(closed)throw new Error('本地服务已关闭');if(initial.diagnosticLinks===false)throw new Error('检测网站入口已在设置中关闭');
   const source=DASHBOARD_SOURCES.find(s=>s.id===id);if(!source)throw new Error('检测站不存在');
   try{const tab=await context.newPage();await ready(tab);const response=await tab.goto(source.url,{waitUntil:'domcontentloaded',timeout:30000});if(response&&response.status()>=400)throw new Error('检测站返回 HTTP '+response.status());await tab.bringToFront();}catch(error){throw new Error(safeError(error));}
  },
  async run(){
   if(closed||!isDashboard()){local.update({phase:'complete'});return;}const epoch=++generation;let tab:any;
   local.update({phase:'running',identity:undefined,identityError:undefined,startedAt:new Date().toISOString(),completedAt:undefined});
   try{
    tab=await context.newPage();owned.add(tab);await ready(tab);if(closed||epoch!==generation)return;
    const response=await tab.goto('https://who.1ms.dog/api/me',{waitUntil:'domcontentloaded',timeout:20000});
    if(!response||response.status()!==200)throw new Error('出口查询失败 HTTP '+response?.status());
    if(new URL(tab.url()).origin!=='https://who.1ms.dog')throw new Error('出口查询跳转到其他来源');
    const identity=readWhoIdentity(JSON.parse(await tab.locator('body').innerText()));if(!identity)throw new Error('出口查询未返回有效 IP');
    if(!closed&&epoch===generation)local.update({identity:{...identity,source:'浏览器出口查询'}});
   }catch(error){if(!closed&&epoch===generation)local.update({identityError:safeError(error)});}
   finally{if(tab){await tab.close().catch(()=>{});owned.delete(tab);}if(!closed&&epoch===generation)local.update({phase:'complete',completedAt:new Date().toISOString()});}
  }
 });
 try{await ready(page);await page.goto(local.url,{waitUntil:'domcontentloaded',timeout:15000});}catch(error){await close();throw error;}
 return {page,local,close};
}
