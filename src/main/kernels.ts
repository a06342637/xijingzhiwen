import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Store,inside} from './store';
import {getJson,getText,checksumFromManifest,downloadVerified,extractZip,hashFile} from './download';
import {BASE_VERSION,type Kernel,type DownloadProgress} from '../shared/model';
import {FIREFOX_VERSION,type Engine} from '../shared/devices';
const exec=promisify(execFile);
export async function peArchitecture(file:string):Promise<'arm64'|'x64'>{const f=await fs.open(file,'r');try{const head=Buffer.alloc(64);await f.read(head,0,64,0);if(head.toString('ascii',0,2)!=='MZ')throw new Error('不是 Windows PE 可执行文件');const offset=head.readUInt32LE(60);const pe=Buffer.alloc(6);await f.read(pe,0,6,offset);if(pe.readUInt32LE(0)!==0x4550)throw new Error('PE 头无效');const machine=pe.readUInt16LE(4);if(machine===0xaa64)return 'arm64';if(machine===0x8664)return 'x64';throw new Error('只支持 Windows ARM64 / x64');}finally{await f.close();}}
export class Kernels {
 private busy=new Set<string>();
 private inspections=new Set<string>();
 get preparing(){return this.busy.size>0||this.inspections.size>0;}
 async inspect<T>(id:string,operation:(kernel:Kernel)=>Promise<T>){if(this.inspections.has(id))throw new Error('此内核正在验证或采集');this.inspections.add(id);try{return await operation(await this.verify(id));}finally{this.inspections.delete(id);}}
 constructor(private store:Store,private emit:(p:DownloadProgress)=>void){}
 async available(engine:Engine='chromium'){const repo=engine==='firefox'?'daijro/camoufox':'xiaozhou26/Chromix';const releases=await getJson<any[]>('https://api.github.com/repos/'+repo+'/releases?per_page=15');return releases.filter(r=>!r.draft&&!r.prerelease).map(r=>({engine,version:r.tag_name.replace(/^v/,''),date:r.published_at,archs:engine==='firefox'?(r.assets.some((x:any)=>x.name===`camoufox-${r.tag_name.replace(/^v/,'')}-win.x86_64.zip`)?['x64']:[]):['arm64','x64'].filter(a=>r.assets.some((x:any)=>x.name===`chromix-win-${a}.zip`)),url:r.html_url})).filter(r=>r.archs.length);}
 async installFirefox(version=FIREFOX_VERSION){
  if(!/^\d+\.\d+\.\d+-beta\.\d+$/.test(version))throw new Error('火狐内核版本格式无效');const id='firefox-'+version+'-x64';if(this.busy.has(id))throw new Error('该内核正在下载');this.busy.add(id);
  const dir=inside(this.store.root,'kernels',id),staging=inside(this.store.root,'kernels',id+'.'+randomUUID()+'.staging');
  try{if(this.store.kernels().some(k=>k.id===id))throw new Error('该内核已安装');const release=await getJson<any>('https://api.github.com/repos/daijro/camoufox/releases/tags/v'+version);const asset=release.assets.find((a:any)=>a.name===`camoufox-${version}-win.x86_64.zip`);if(!asset||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw new Error('火狐发行包缺少可信摘要');
   const archive=path.join(staging,'bundle.zip');await downloadVerified(asset.browser_download_url,archive,asset.digest.slice(7),this.emit,id,'Firefox / Camoufox '+version);await extractZip(archive,path.join(staging,'bundle'));await fs.rm(archive);
   const files=await fs.readdir(path.join(staging,'bundle'),{recursive:true});const candidates=files.filter(f=>path.basename(f).toLowerCase()==='camoufox.exe');if(candidates.length!==1)throw new Error('发行包内核路径不唯一');const relative=candidates[0],exe=path.join(staging,'bundle',relative);if(await peArchitecture(exe)!=='x64')throw new Error('火狐发行包架构不符');await fs.access(path.join(path.dirname(exe),'properties.json'));if(!files.some(f=>/license|copying/i.test(f)))throw new Error('发行包缺少许可证');
   const kernel:Kernel={id,engine:'firefox',version,arch:'x64',path:path.join(dir,'bundle',relative),sha256:await hashFile(exe),source:'release',status:'unverified',installedAt:new Date().toISOString(),provenance:{release:release.html_url,archiveSha256:asset.digest.slice(7)}};
   await fs.rename(staging,dir);try{this.store.put('kernel',id,kernel);}catch(error){await fs.rename(dir,staging);throw error;}this.emit({id,label:'Firefox '+version,received:1,total:1,phase:'已安装'});return kernel;
  }catch(error){this.emit({id,label:'Firefox '+version,received:0,total:0,phase:'失败',error:String(error)});throw error;}finally{this.busy.delete(id);await fs.rm(staging,{recursive:true,force:true});}
 }
 async install(version=BASE_VERSION,arch:'arm64'|'x64'=process.arch==='arm64'?'arm64':'x64'){
  if(!/^\d+\.\d+\.\d+\.\d+$/.test(version))throw new Error('内核版本格式无效');const id=`${version}-${arch}`;if(this.busy.has(id))throw new Error('该内核正在下载');this.busy.add(id);
  const dir=inside(this.store.root,'kernels',id),staging=inside(this.store.root,'kernels',id+'.'+randomUUID()+'.staging');
  try{if(this.store.kernels().some(k=>k.id===id))throw new Error('该内核已安装');
   const release=await getJson<any>('https://api.github.com/repos/xiaozhou26/Chromix/releases/tags/v'+version);const name=`chromix-win-${arch}.zip`;const asset=release.assets.find((a:any)=>a.name===name),manifest=release.assets.find((a:any)=>a.name===`SHA256SUMS-win-${arch}`)||release.assets.find((a:any)=>a.name==='SHA256SUMS');if(!asset||!manifest)throw new Error('该架构没有完整发行包与校验清单');
   const checksum=checksumFromManifest(await getText(manifest.browser_download_url),name);await fs.mkdir(staging,{recursive:true});const archive=path.join(staging,'bundle.zip');await downloadVerified(asset.browser_download_url,archive,checksum,this.emit,id,'Chromix '+version+' '+arch);await extractZip(archive,path.join(staging,'bundle'));await fs.rm(archive);
   const exe=path.join(staging,'bundle','chromix','chrome.exe');if(await peArchitecture(exe)!==arch)throw new Error('内核架构与发行包不符');const hash=await hashFile(exe);
   let provenance:unknown={release:release.html_url,archiveSha256:checksum};const receipt=release.assets.find((a:any)=>a.name===`provenance-win-${arch}.json`);if(receipt)provenance={...(provenance as object),receipt:await getJson(receipt.browser_download_url)};
   const licenses=await fs.readdir(path.join(staging,'bundle','chromix'));if(!licenses.some(s=>/license|credits/i.test(s)))throw new Error('发行包缺少许可证文件');
   await fs.rename(staging,dir);const kernel:Kernel={id,version,arch,path:path.join(dir,'bundle','chromix','chrome.exe'),sha256:hash,source:'release',status:'unverified',installedAt:new Date().toISOString(),provenance};try{this.store.put('kernel',id,kernel);}catch(error){await fs.rename(dir,staging);throw error;}this.emit({id,label:'Chromix '+version,received:1,total:1,phase:'已安装'});return kernel;
  }catch(error){this.emit({id,label:'Chromix '+version,received:0,total:0,phase:'失败',error:String(error)});throw error;}finally{this.busy.delete(id);await fs.rm(staging,{recursive:true,force:true});}
 }
 async importLocal(file:string){const arch=await peArchitecture(file);const engine:Engine=path.basename(file).toLowerCase()==='camoufox.exe'?'firefox':'chromium';if(engine==='firefox')await fs.access(path.join(path.dirname(file),'properties.json'));let version:string|undefined;try{const {stdout}=await exec(file,['--version'],{windowsHide:true,timeout:15000,maxBuffer:16384});version=(engine==='firefox'?/\d+\.\d+(?:\.\d+)?/:/\d+\.\d+\.\d+\.\d+/).exec(stdout)?.[0];}catch{}if(!version){const type=engine==='firefox'?(await import('playwright-firefox-driver')).firefox:(await import('playwright-core')).chromium;const browser=await type.launch({executablePath:file,headless:true,timeout:30000});try{version=browser.version();}finally{await browser.close();}}if(!version)throw new Error('无法读取浏览器版本');const kernel:Kernel={id:randomUUID(),engine,version,arch,path:file,sha256:await hashFile(file),source:'local',status:'unverified',installedAt:new Date().toISOString()};return this.store.put('kernel',kernel.id,kernel);}
 async verify(id:string){const k=this.store.get<Kernel>('kernel',id);if(await hashFile(k.path)!==k.sha256)throw new Error('内核文件已改变，请重新导入并验证');return k;}
 async remove(id:string){if(this.inspections.has(id)||this.busy.has(id))throw new Error('内核正在下载、验证或采集，请稍后再删除');if(this.store.profiles().some(p=>p.kernelId===id))throw new Error('仍有环境绑定此内核，请先更换或删除环境');const k=this.store.get<Kernel>('kernel',id);if(k.source==='release'){const source=inside(this.store.root,'kernels',id),recycled=inside(this.store.root,'trash',`kernel-${id}-${randomUUID()}`);await fs.rename(source,recycled);try{this.store.remove('kernel',id);}catch(error){await fs.rename(recycled,source);throw error;}}else this.store.remove('kernel',id);}
}
