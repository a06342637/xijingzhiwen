import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process';
import path from 'node:path';
type Pending={resolve:(value:any)=>void;reject:(error:Error)=>void;timer:NodeJS.Timeout};
// One lazily started helper per script; no process scan or C# compilation per click.
class WindowNative {
 private child?:ChildProcessWithoutNullStreams;
 private pending=new Map<number,Pending>();private sequence=0;private buffer='';private idle?:NodeJS.Timeout;
 constructor(private script:string){}
 private start(){
  const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const child=spawn(executable,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',this.script,'-Persistent'],{windowsHide:true,stdio:['pipe','pipe','pipe']});this.child=child;this.buffer='';let err='';
  child.stdout.on('data',chunk=>{if(this.child!==child)return;this.buffer+=chunk.toString('utf8');if(this.buffer.length>1024*1024){this.stop(new Error('窗口信息超出上限'));return;}let index;while((index=this.buffer.indexOf('\n'))>=0){const line=this.buffer.slice(0,index).replace(/^\uFEFF/,'').trim();this.buffer=this.buffer.slice(index+1);if(!line)continue;let response:any;try{response=JSON.parse(line);}catch{this.stop(new Error('Windows窗口管理返回无效数据'));return;}const p=this.pending.get(response.id);if(p){clearTimeout(p.timer);this.pending.delete(response.id);response.error?p.reject(new Error('窗口管理失败：'+response.error)):p.resolve(response.data);}if(!this.pending.size)this.scheduleIdle();}});
  child.stderr.on('data',chunk=>{err=(err+chunk.toString()).slice(-2000);});
  child.once('error',error=>{if(this.child===child)this.stop(error);});
  child.once('exit',()=>{if(this.child===child)this.stop(new Error('窗口管理进程已退出'+(err?'：'+err:'')));});
  child.stdin.on('error',error=>{if(this.child===child)this.stop(error);});
 }
 private scheduleIdle(){clearTimeout(this.idle);this.idle=setTimeout(()=>this.stop(new Error('窗口管理空闲退出')),5*60*1000);this.idle.unref();}
 request(request:any){clearTimeout(this.idle);if(!this.child)this.start();return new Promise<any>((resolve,reject)=>{const id=++this.sequence;const timer=setTimeout(()=>this.stop(new Error('Windows窗口管理超时')),45000);this.pending.set(id,{resolve,reject,timer});this.child!.stdin.write(JSON.stringify({id,request})+'\n',error=>{if(error)this.stop(error);});});}
 stop(error=new Error('窗口管理已关闭')){clearTimeout(this.idle);const child=this.child;this.child=undefined;child?.kill();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();this.buffer='';}
}
const helpers=new Map<string,WindowNative>();
export function closeWindowHelpers(){for(const helper of helpers.values())helper.stop();helpers.clear();}
export function warmWindowHelper(script:string){void windowNative(script,{action:'inventory',targets:[]}).catch(()=>{});}
export function windowNative(script:string,request:any):Promise<any>{
 if(process.platform!=='win32')return Promise.reject(new Error('窗口平铺目前支持Windows'));const key=path.resolve(script);let helper=helpers.get(key);if(!helper){helper=new WindowNative(key);helpers.set(key,helper);}return helper.request(request);
}
