import type {SoftwareUpdate} from '../shared/model';

export interface UpdateClient {
 autoDownload:boolean;autoInstallOnAppQuit:boolean;allowPrerelease:boolean;allowDowngrade:boolean;
 on(event:string,listener:(...args:any[])=>void):unknown;
 checkForUpdates():Promise<unknown>;downloadUpdate():Promise<unknown>;quitAndInstall(silent?:boolean,forceRunAfter?:boolean):void;
}
export class SoftwareUpdates {
 private value:SoftwareUpdate={phase:'idle',percent:0,message:'从 GitHub 检查软件新版本。'};
 private installing=false;
 constructor(private client:UpdateClient,private packaged:boolean,private changed:()=>void,private prepare:()=>Promise<void>){
  client.autoDownload=false;client.autoInstallOnAppQuit=false;client.allowPrerelease=false;client.allowDowngrade=false;
  client.on('update-available',info=>this.set({phase:'available',version:info.version,notes:typeof info.releaseNotes==='string'?info.releaseNotes:Array.isArray(info.releaseNotes)?info.releaseNotes.map((n:any)=>n.note||'').join('\n'):'',percent:0,message:'发现新版本，可下载更新。'}));
  client.on('update-not-available',()=>this.set({phase:'current',version:undefined,notes:undefined,percent:0,message:'当前已是最新版本。'}));
  client.on('download-progress',p=>this.set({phase:'downloading',percent:Math.min(100,Math.max(0,p.percent||0)),message:'正在下载并校验更新…'}));
  client.on('update-downloaded',()=>this.set({phase:'downloaded',percent:100,message:'更新已下载并通过校验，可以安装并重启。'}));
  client.on('error',e=>this.fail(e));
 }
 state(){return {...this.value};}
 private set(p:Partial<SoftwareUpdate>){this.value={...this.value,...p};this.changed();}
 private fail(error:unknown){this.installing=false;this.set({phase:'error',message:'更新失败：'+(error instanceof Error?error.message:String(error)).slice(0,600)});}
 private available(){if(!this.packaged)throw new Error('请在已安装的软件中检查更新。');}
 async check(){this.available();if(['checking','downloading','downloaded','installing'].includes(this.value.phase)||this.installing)return this.state();this.set({phase:'checking',version:undefined,notes:undefined,percent:0,message:'正在连接 GitHub…'});try{await this.client.checkForUpdates();}catch(e){this.fail(e);}return this.state();}
 async download(){this.available();if(this.value.phase!=='available')throw new Error('请先检查更新并确认有新版本');this.set({phase:'downloading',percent:0,message:'正在下载更新…'});try{await this.client.downloadUpdate();}catch(e){this.fail(e);}return this.state();}
 async install(){this.available();if(this.installing)return this.state();if(this.value.phase!=='downloaded')throw new Error('请先下载并校验更新');this.installing=true;try{await this.prepare();this.set({phase:'installing',message:'正在关闭环境并安装更新…'});this.client.quitAndInstall(true,true);}catch(e){this.installing=false;this.set({phase:'downloaded',message:'暂时无法安装：'+(e instanceof Error?e.message:String(e))});}return this.state();}
}
