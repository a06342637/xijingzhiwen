import fs from 'node:fs/promises';
import path from 'node:path';
import type {Profile} from '../shared/model';
async function atomic(file:string,data:string){await fs.mkdir(path.dirname(file),{recursive:true});const temporary=file+'.qijing-tmp';await fs.writeFile(temporary,data,{mode:0o600});await fs.rename(temporary,file);}
// Camoufox ships a policy that removes search engines and selects "None".
export function googleFirefoxPolicy(current:any){return {...current,policies:{...current.policies,SearchEngines:{Default:'Google',DefaultPrivate:'Google',Add:[{Name:'Google',Description:'Google Search',Method:'GET',URLTemplate:'https://www.google.com/search?q={searchTerms}',SuggestURLTemplate:'https://www.google.com/complete/search?client=firefox&q={searchTerms}',IconURL:'https://www.google.com/favicon.ico',Encoding:'UTF-8'}]}}};}
const preparing=new Map<string,Promise<void>>();
export async function prepareSearchDefaults(profile:Profile,binary:string):Promise<Record<string,string|boolean>>{
 if(profile.mode==='measured'||profile.values.engine!=='firefox')return {};
 const file=path.join(path.dirname(binary),'distribution','policies.json');let original:any={policies:{}};try{original=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 let task=preparing.get(file);if(!task){task=(async()=>{const next=googleFirefoxPolicy(original);if(JSON.stringify(next)!==JSON.stringify(original)){try{await fs.copyFile(file,file+'.before-qijing-google',fs.constants.COPYFILE_EXCL);}catch(e){if(!['ENOENT','EEXIST'].includes((e as NodeJS.ErrnoException).code||''))throw e;}await atomic(file,JSON.stringify(next,null,2));}})().finally(()=>preparing.delete(file));preparing.set(file,task);}await task;
 return {'keyword.enabled':true,'browser.urlbar.suggest.searches':true};
}
export async function initializeChromiumSearch(context:any,profileDir:string){
 const marker=path.join(profileDir,'qijing-search-default-v2.json');if(await fs.stat(marker).catch(()=>null))return;
 const page=await context.newPage();try{await page.goto('chrome://settings/searchEngines',{waitUntil:'domcontentloaded',timeout:15000});const result=await page.evaluate(async()=>{const module=await (new Function('return import("chrome://settings/settings.js")'))();const proxy=module.SearchEnginesBrowserProxyImpl.getInstance();let list=await proxy.getSearchEnginesList();const all=(v:any)=>[...v.defaults,...v.actives,...v.others];let google=all(list).find((e:any)=>e.keyword==='google.com');if(!google){proxy.searchEngineEditStarted(typeof all(list)[0]?.id==='number'?0:null);proxy.searchEngineEditCompleted('Google','google.com','https://www.google.com/search?q=%s','https://www.google.com/complete/search?client=chrome&q=%s');for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));list=await proxy.getSearchEnginesList();google=all(list).find((e:any)=>e.keyword==='google.com');if(google)break;}}if(!google)throw new Error('Google搜索引擎添加失败');proxy.setDefaultSearchEngine(google.id,2,null);for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));const saved=await proxy.getSearchEnginesList();if(all(saved).some((e:any)=>e.id===google.id&&e.default))return google;}throw new Error('Google默认搜索保存失败');});await atomic(marker,JSON.stringify({provider:'Google',id:result.id}));}finally{await page.close();}
}
