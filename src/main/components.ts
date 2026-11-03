import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {Store,inside} from './store';
import {downloadVerified,extractZip,hashFile} from './download';
import {replaceDirectory} from './replace-directory';
import {peArchitecture} from './kernels';
import type {DownloadProgress,Kernel,Profile,Report,Check} from '../shared/model';
export function pythonFailure(stderr:string){if(/DLL load failed|specified module could not be found|指定的模块/i.test(stderr))return 'Windows 原生扩展运行库加载失败。请重新准备诊断组件；若仍失败，请检查杀毒软件隔离记录。详情：'+stderr.split(/\r?\n/).filter(Boolean).slice(-1)[0];return stderr.slice(-1000);}
export async function installRuntimeDlls(source:string,destination:string,arch:'arm64'|'x64'){
 const files=await fs.readdir(source,{recursive:true}),dlls=new Map<string,string>();
 for(const relative of files.filter(f=>f.endsWith('.dll')).sort((a,b)=>a.length-b.length)){const name=path.basename(relative).toLowerCase();if(!/^(?:msvcp|vcruntime|concrt|vcamp|vccorlib|vcomp)\d+[\w]*\.dll$/.test(name))throw new Error('运行库包含意外 DLL：'+name);if(await peArchitecture(path.join(source,relative))!==arch){if(arch==='arm64'&&name==='vcruntime140_1.dll')continue;throw new Error('运行库架构不匹配：'+name);}if(!dlls.has(name))dlls.set(name,relative);}
 for(const required of ['msvcp140.dll','vcruntime140.dll',...(arch==='x64'?['vcruntime140_1.dll']:[])])if(!dlls.has(required))throw new Error('运行库缺少 '+required);
 for(const [name,relative] of dlls)await fs.copyFile(path.join(source,relative),path.join(destination,name));
}
export async function graphicsChecks(summary:any,output:string):Promise<Check[]>{
 return Promise.all(summary.suites.map(async(s:any)=>{
  let limited=s.status==='incomplete',detail=s.status==='passed'?'当前内核在本次检查范围内通过':'未通过完整检查，请查看报告中的实际观测';
  if(s.suite==='webgl'){try{const raw=JSON.parse(await fs.readFile(path.join(output,'webgl.json'),'utf8'));if(raw.launches?.find((l:any)=>l.mode==='native'&&/webgl unavailable/i.test(l.error||''))){limited=true;detail='本机原生 WebGL 上下文不可用，无法验证像素扰动；请在支持图形加速的电脑上复测。';}}catch{}}
  if(s.suite==='gpu_identity'&&limited)detail='当前 GPU 或软件渲染器限制了完整显卡身份检查；名称配置不等于真实显卡。';
  return {feature:s.suite,label:({canvas:'Canvas 像素扰动',webgl:'WebGL 像素扰动',gpu_identity:'WebGL 显卡身份'} as Record<string,string>)[s.suite]||s.suite,status:s.status==='passed'?'verified':limited?'limited':'unverified',detail,observed:s};
 }));
}
export async function runPython(exe:string,args:string[],timeout=180000,env:Record<string,string|undefined>={}){
 return new Promise<{code:number;stdout:string;stderr:string}>((resolve,reject)=>{const child=spawn(exe,['-X','utf8',...args],{windowsHide:true,shell:false,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';let timer:NodeJS.Timeout;
 const killTree=()=>{if(process.platform==='win32')spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill();};
 timer=setTimeout(()=>{killTree();reject(new Error('组件操作超时'));},timeout);child.on('error',e=>{clearTimeout(timer);reject(e);});child.stdout.on('data',b=>{stdout+=b;if(stdout.length>32*1024**2){killTree();clearTimeout(timer);reject(new Error('组件输出超过上限'));}});child.stderr.on('data',b=>stderr=(stderr+b).slice(-24000));child.on('close',code=>{clearTimeout(timer);resolve({code:code??1,stdout,stderr});});
 });
}
export class Components {
 private pending?:Promise<string>;
 constructor(private store:Store,private resources:string,private emit:(p:DownloadProgress)=>void,private changed:()=>void,private arch:string=process.arch){}
 private dir(){return inside(this.store.root,'components','python-'+this.arch);}
 async ready(){try{const marker=JSON.parse(await fs.readFile(path.join(this.dir(),'ready.json'),'utf8'));const lock=JSON.parse(await fs.readFile(path.join(this.resources,'config','components.json'),'utf8'));if(marker.python!==lock.python||marker.manifestHash!==await hashFile(path.join(this.resources,'config','components.json'))||marker.executableHash!==await hashFile(path.join(this.dir(),'python.exe'))||!marker.nativeFiles)return false;for(const [file,sha] of Object.entries(marker.nativeFiles)){if(await hashFile(inside(this.dir(),file))!==sha)return false;}return true;}catch{return false;}}
 async ensure(){if(this.pending)return this.pending;this.pending=(async()=>await this.ready()?path.join(this.dir(),'python.exe'):this.install())().finally(()=>{this.pending=undefined;});return this.pending;}
 get preparing(){return Boolean(this.pending);}
 private async install(){
  const lock=JSON.parse(await fs.readFile(path.join(this.resources,'config','components.json'),'utf8'));const spec=lock.arches[this.arch];if(!spec)throw new Error('当前架构没有组件清单');const staging=inside(this.store.root,'components','python-'+this.arch+'-'+randomUUID()+'.staging');const id='python-'+this.arch;
  try{await fs.mkdir(staging,{recursive:true});const archive=path.join(staging,'python.zip');await downloadVerified(spec.url,archive,spec.sha256,this.emit,id,'Python 诊断组件');await extractZip(archive,staging);await fs.rm(archive);const site=path.join(staging,'Lib','site-packages');await fs.mkdir(site,{recursive:true});
   for(const wheel of spec.wheels){const target=path.join(staging,wheel.filename);await downloadVerified(wheel.url,target,wheel.sha256,this.emit,id,wheel.name+' '+wheel.version);await extractZip(target,site);await fs.rm(target);}
   if(!spec.runtime)throw new Error('组件清单缺少 Windows C++ 运行库');
   const runtimeArchive=path.join(staging,spec.runtime.filename),runtimeDir=path.join(staging,'runtime-files');await downloadVerified(spec.runtime.url,runtimeArchive,spec.runtime.sha256,this.emit,id,'Windows C++ 运行库');await extractZip(runtimeArchive,runtimeDir);await fs.rm(runtimeArchive);
   await installRuntimeDlls(runtimeDir,staging,this.arch as 'arm64'|'x64');await fs.cp(runtimeDir,path.join(staging,'runtime-license'),{recursive:true,filter:source=>!source.toLowerCase().endsWith('.dll')&&!source.toLowerCase().endsWith('.pyd')});await fs.rm(runtimeDir,{recursive:true,force:true});
   // Embedded Python has no global runtime prerequisite: load only our verified
   // DLL directory before any third-party native extension is imported.
   await fs.writeFile(path.join(site,'sitecustomize.py'),'import os, sys\nsys.path.insert(0, os.path.join(sys.prefix, "upstream", "tools"))\nif os.name == "nt":\n    _qijing_dll_dir = os.add_dll_directory(sys.prefix)\n');
   const files=await fs.readdir(staging);const pth=files.find((f:string)=>/^python\d+\._pth$/.test(f));if(!pth)throw new Error('Python 嵌入包布局无效');await fs.writeFile(path.join(staging,pth),'python313.zip\n.\nLib/site-packages\nimport site\n');
   await fs.cp(path.join(this.resources,'chromix-python','sdk','python','chromix'),path.join(site,'chromix'),{recursive:true});
   const upstream=path.join(staging,'upstream');await fs.cp(path.join(this.resources,'chromix-tools','tools'),path.join(upstream,'tools'),{recursive:true});await fs.cp(path.join(this.resources,'chromix-python','sdk'),path.join(upstream,'sdk'),{recursive:true});
   const test=await runPython(path.join(staging,'python.exe'),['-c','import chromix, playwright.sync_api, PIL, greenlet, device_pool, fingerprint_smoke; print("ready")']);if(test.code||!test.stdout.includes('ready'))throw new Error('Python 组件自检失败：'+pythonFailure(test.stderr));
   const nativeFiles:Record<string,string>={};for(const file of await fs.readdir(staging,{recursive:true}))if(/\.dll$|\.pyd$|sitecustomize\.py$/.test(file))nativeFiles[file]=await hashFile(path.join(staging,file));
   await fs.writeFile(path.join(staging,'ready.json'),JSON.stringify({python:lock.python,manifestHash:await hashFile(path.join(this.resources,'config','components.json')),executableHash:await hashFile(path.join(staging,'python.exe')),nativeFiles}));
   const destination=this.dir();await replaceDirectory(staging,destination);this.emit({id,label:'诊断组件',received:1,total:1,phase:'已安装'});this.changed();return path.join(destination,'python.exe');
  }catch(error){this.emit({id,label:'诊断组件',received:0,total:0,phase:'失败',error:String(error)});throw error;}finally{await fs.rm(staging,{recursive:true,force:true,maxRetries:8,retryDelay:250}).catch(()=>{});}
 }
 async collect(kernel:Kernel){const python=await this.ensure();const output=inside(this.store.root,'devices',randomUUID());const result=await runPython(python,[path.join(this.dir(),'upstream','tools','collect_device.py'),'--browser',kernel.path,'--output',output,'--headed'],300000,{CLOAKBROWSER_BINARY_PATH:kernel.path,CLOAKBROWSER_WIDEVINE:'0'});if(result.code)throw new Error('实测设备采集未通过，证据保存在 '+output+'。'+pythonFailure(result.stderr||result.stdout));return path.join(output,'record.json');}
 async validateRecord(file:string){const python=await this.ensure();const r=await runPython(python,['-m','chromix.device_pool','validate',file]);if(r.code)throw new Error('设备记录未通过上游校验：'+r.stderr.slice(-1200));return {status:'validated',output:r.stdout};}
 async importRecord(file:string){await this.validateRecord(file);const record=JSON.parse(await fs.readFile(file,'utf8'));const target=inside(this.store.root,'devices',randomUUID());await fs.mkdir(target,{recursive:true});try{await fs.copyFile(file,path.join(target,'record.json'));for(const item of Object.values(record.evidence) as any[]){const relative=String(item.path);if(path.isAbsolute(relative)||relative.split(/[\\/]/).includes('..')||relative.includes(':'))throw new Error('设备证据路径无效');const source=inside(path.dirname(file),relative),destination=inside(target,relative);await fs.mkdir(path.dirname(destination),{recursive:true});await fs.copyFile(source,destination);}await this.validateRecord(path.join(target,'record.json'));return path.join(target,'record.json');}catch(error){await fs.rm(target,{recursive:true,force:true});throw error;}}
 async graphics(kernel:Kernel){const python=await this.ensure(),output=inside(this.store.root,'reports',randomUUID()+'-graphics');const r=await runPython(python,[path.join(this.dir(),'upstream','tools','browser_feature_check.py'),'--browser',kernel.path,'--output-dir',output],1000000,{CLOAKBROWSER_BINARY_PATH:kernel.path,CLOAKBROWSER_WIDEVINE:'0'});let summary:any;try{summary=JSON.parse(await fs.readFile(path.join(output,'summary.json'),'utf8'));}catch{throw new Error('图形诊断未生成完整报告：'+pythonFailure(r.stderr));}if(summary.browser_sha256!==kernel.sha256)throw new Error('诊断报告的内核摘要不匹配');const checks=await graphicsChecks(summary,output);const report:Report={id:randomUUID(),profileId:'',profileName:'内核图形验证',kernelId:kernel.id,version:kernel.version,arch:kernel.arch,sha256:kernel.sha256,createdAt:new Date().toISOString(),kind:'upstream',status:checks.some(c=>c.status==='unverified')?'unverified':checks.some(c=>c.status==='limited')?'limited':'verified',checks,observations:summary,outputDir:output};this.store.put('report',report.id,report);return report;}
}
