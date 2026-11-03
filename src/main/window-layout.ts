import {spawn} from 'node:child_process';
import path from 'node:path';
import {z} from 'zod';
import {tileRects,type WindowInventory} from '../shared/window-layout';
import {idSchema,type Profile,type Kernel} from '../shared/model';
import type {Store} from './store';
import type {Browsers} from './browsers';
export interface WindowTarget {profileId:string;profileDir:string;binary:string;engine:string}
export async function windowNative(script:string,request:any):Promise<any>{
 if(process.platform!=='win32')throw new Error('窗口平铺目前支持Windows');
 const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 return new Promise((resolve,reject)=>{const child=spawn(executable,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='',settled=false;const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else try{resolve(JSON.parse(out.replace(/^\uFEFF/,'')));}catch{reject(new Error('Windows窗口管理返回无效数据'));}};const timer=setTimeout(()=>{child.kill();finish(new Error('Windows窗口管理超时'));},45000);child.stdout.on('data',b=>{out+=b.toString('utf8');if(out.length>1024*1024){child.kill();finish(new Error('窗口信息超出上限'));}});child.stderr.on('data',b=>{if(err.length<4000)err+=b.toString();});child.once('error',e=>finish(e));child.once('close',code=>finish(code?new Error('窗口管理失败：'+err.slice(-2000)):undefined));child.stdin.on('error',e=>finish(e));child.stdin.end(JSON.stringify(request));});
}
export class WindowLayouts {
 private busy=false;
 get arranging(){return this.busy;}
 constructor(private store:Store,private browsers:Browsers,private script:string,private native=windowNative){}
 private targets(ids?:string[]){const running=this.browsers.running();return this.store.profiles().filter(p=>(!ids||ids.includes(p.id))&&running[p.id]==='running').map(p=>{const k=this.store.get<Kernel>('kernel',p.kernelId);return {profileId:p.id,profileDir:path.join(this.store.root,'profiles',p.id),binary:k.path,engine:p.values.engine};});}
 async inventory():Promise<WindowInventory>{return this.native(this.script,{action:'inventory',targets:this.targets()});}
 async apply(raw:unknown){
  const p=z.object({ids:z.array(idSchema).min(1).max(50),monitorId:z.string().regex(/^\d+$/),mode:z.enum(['auto','columns','rows','grid']),columns:z.number().int().min(0).max(50),gap:z.number().int().min(0).max(40)}).strict().parse(raw);
  if(this.busy)throw new Error('正在调整窗口，请稍候');this.busy=true;
  try{const ids=[...new Set(p.ids)],targets=this.targets(ids);if(!targets.length)throw new Error('所选环境没有已打开的窗口');const inventory:WindowInventory=await this.native(this.script,{action:'inventory',targets}),monitor=inventory.monitors.find(m=>m.id===p.monitorId);if(!monitor)throw new Error('目标显示器已断开，请刷新');
   const windows=ids.map(id=>inventory.windows.find(w=>w.profileId===id)).filter((w):w is WindowInventory['windows'][number]=>Boolean(w));if(!windows.length)throw new Error('未找到当前桌面上的所选窗口');const rects=tileRects(monitor.workArea,windows.length,p.mode,p.columns,p.gap);
   const placements=windows.map((w,i)=>({...w,bounds:rects[i]}));const response=await this.native(this.script,{action:'apply',targets,placements});
   return {results:response.results.map((r:any)=>{const desired=placements.find(p=>p.profileId===r.profileId)?.bounds;return {...r,error:r.error==='window_changed'?'窗口已关闭、切换桌面或发生变化':r.error==='window_position_denied'?'Windows拒绝调整窗口':r.error,...(r.ok&&desired&&(['width','height','x','y'] as const).some(k=>Math.abs(r.bounds[k]-desired[k])>2)?{warning:'窗口最小尺寸或系统边框限制，实际位置/尺寸与平铺区域不同'}:{})};}),skipped:ids.filter(id=>!windows.some(w=>w.profileId===id)),fixedViewport:windows.filter(w=>this.store.get<Profile>('profile',w.profileId).values.viewportMode==='fixed').map(w=>w.profileId)};
  }finally{this.busy=false;}
 }
}
