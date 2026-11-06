import http,{type IncomingMessage,type ServerResponse} from 'node:http';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {Store,newSeed} from './store';
import type {Browsers} from './browsers';
import {randomProfileName} from './profile-names';
import {FEATURES,idSchema,newProfile,proxySchema,type Profile,type Values} from '../shared/model';
import {LOCAL_API_ROUTES,type LocalApiState} from '../shared/local-api';
import {validateProfile} from '../shared/config';
import {randomFullFingerprint} from '../shared/random-fingerprint';
import {fingerprintLocks,preservedFingerprint} from '../shared/fingerprint-presets';
import {applyControlledValues,controlledGroup} from '../shared/controlled-features';
import {enabledExtensionIds} from '../shared/extension-defaults';

const valuesSchema=z.record(z.string(),z.union([z.string().max(8192),z.number().finite(),z.boolean()]));
const profileInput=z.object({user_id:idSchema.optional(),name:z.string().trim().max(80).optional(),group_id:z.string().max(80).optional(),remark:z.string().max(4000).optional(),tags:z.array(z.string().max(40)).max(20).optional(),randomize:z.boolean().optional(),seed:z.string().regex(/^[1-9]\d{0,19}$/).optional(),kernel_id:z.string().max(120).optional(),proxy_id:z.union([idSchema,z.literal('')]).optional(),extension_ids:z.array(idSchema).max(50).optional(),open_urls:z.array(z.string().max(2048)).max(20).optional(),values:valuesSchema.optional(),fingerprint_config:z.record(z.string(),z.unknown()).optional(),user_proxy_config:z.object({proxy_soft:z.enum(['other','no_proxy']).optional(),proxy_type:z.enum(['http','https','socks5']).optional(),proxy_host:z.string().optional(),proxy_port:z.union([z.string(),z.number()]).optional(),proxy_user:z.string().optional(),proxy_password:z.string().optional()}).strict().optional()}).strict();
const boolFlag=(value:unknown)=>{if(value==='1'||value===1||value===true)return true;if(value==='0'||value===0||value===false)return false;throw new Error('开关值必须为 0 或 1');};
export function apiFingerprint(raw:Record<string,unknown>={}):Values{
 const values:Values={};
 for(const [key,value] of Object.entries(raw)){
  if(FEATURES.some(f=>f.key===key)){values[key]=valuesSchema.parse({[key]:value})[key];continue;}
  if(key==='automatic_timezone'){values.geoip=boolFlag(value);continue;}
  if(key==='language'){values.locale=z.array(z.string()).min(1).max(1).parse(value)[0];continue;}
  if(key==='ua'){values.userAgent=z.string().parse(value);continue;}
  if(key==='hardware_concurrency'){values.cpu=z.coerce.number().int().parse(value);continue;}
  if(key==='device_memory'){values.memory=String(z.coerce.number().parse(value));continue;}
  if(key==='screen_resolution'){const match=z.string().parse(value).match(/^(\d+)x(\d+)$/);if(!match)throw new Error('screen_resolution 使用 宽x高');values.screenWidth=Number(match[1]);values.screenHeight=Number(match[2]);continue;}
  if(key==='webrtc'){values.webrtcPolicy=z.enum(['disabled','forward']).parse(value)==='disabled'?'disable_non_proxied_udp':'auto';continue;}
  throw new Error('不支持的 fingerprint_config 字段：'+key+'；请查询 /api/v1/fingerprint/schema');
 }
 return values;
}
function publicProfile(p:Profile){return {user_id:p.id,name:p.name,group_id:p.group,remark:p.notes,tags:p.tags,seed:p.seed,kernel_id:p.kernelId,proxy_id:p.proxyId,extension_ids:p.extensionIds,open_urls:p.startUrls,values:p.values,createdAt:p.createdAt,updatedAt:p.updatedAt,archived:p.archived};}

export class LocalApi {
 private server?:http.Server;private key='';private config={enabled:false,port:50325};private error='';private management=Promise.resolve();private tasks=new Set<Promise<void>>();private stopping=false;
 constructor(private store:Store,private browsers:Browsers,private changed:()=>void,private closing:()=>boolean,private version:string){}
 state():LocalApiState{return {...this.config,running:Boolean(this.server?.listening),hasKey:Boolean(this.key),error:this.error||undefined};}
 get operating(){return this.tasks.size>0;}
 async init(){try{this.config=z.object({enabled:z.boolean(),port:z.number().int().min(1024).max(65535)}).strict().parse(this.store.get('localApi','config'));}catch{}try{this.key=await this.store.apiKey();if(this.config.enabled){if(!this.key)throw new Error('请先生成 API Key');await this.listen();}}catch(error){this.error=error instanceof Error?error.message:String(error);}}
 manage(raw:unknown){const operation=this.management.then(async()=>{
  const p=z.object({action:z.enum(['generate','reveal','configure']),enabled:z.boolean().optional(),port:z.number().int().min(1024).max(65535).optional()}).strict().parse(raw);
  if(this.closing())throw new Error('软件正在关闭');
  if(p.action==='reveal')return {key:this.key};
  if(this.operating)throw new Error('请等待 API 请求完成再修改服务');
  if(p.action==='generate'){const key=randomBytes(32).toString('hex');await this.store.saveApiKey(key);this.key=key;this.changed();return {key};}
  const previous={...this.config},next={enabled:p.enabled??previous.enabled,port:p.port??previous.port};if(next.enabled&&!this.key)throw new Error('请先生成 API Key');
  await this.stop();this.config=next;
  try{if(next.enabled)await this.listen();this.store.put('localApi','config',next);this.error='';}
  catch(error){await this.stop();this.config=previous;this.error=error instanceof Error?error.message:String(error);if(previous.enabled)await this.listen().catch(()=>{});this.changed();throw error;}
  this.changed();return this.state();
 });this.management=operation.then(()=>{},()=>{});return operation;}
 private async listen(){this.stopping=false;const server=http.createServer((req,res)=>{if(this.tasks.size>=16){this.reply(res,429,1,'请求过多，请稍后重试');req.resume();return;}const task=this.request(req,res);this.tasks.add(task);void task.finally(()=>this.tasks.delete(task));});server.requestTimeout=15000;server.headersTimeout=10000;server.timeout=240000;this.server=server;
  await new Promise<void>((resolve,reject)=>{const fail=(error:Error)=>{server.off('listening',ready);reject(error);};const ready=()=>{server.off('error',fail);resolve();};server.once('error',fail);server.once('listening',ready);server.listen(this.config.port,'127.0.0.1');});
  server.on('error',error=>{this.error=error.message;this.changed();});
 }
 async stop(){this.stopping=true;const server=this.server;this.server=undefined;if(server){const closed=new Promise<void>(resolve=>server.close(()=>resolve()));server.closeIdleConnections();await Promise.allSettled([...this.tasks]);server.closeAllConnections();await closed;}}
 private reply(res:ServerResponse,status:number,code:number,msg:string,data:unknown={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({code,msg,data}));}
 private async request(req:IncomingMessage,res:ServerResponse){try{
  if(this.stopping||this.closing())throw new Error('软件或 API 服务正在关闭');
  const host=req.headers.host;if(host!==`127.0.0.1:${this.config.port}`&&host!==`localhost:${this.config.port}`){this.reply(res,403,1,'请求主机无效');req.resume();return;}
  if(req.headers.origin||req.headers['sec-fetch-site']){this.reply(res,403,1,'请由本机项目调用，网页来源不允许访问');req.resume();return;}
  const authorization=req.headers.authorization||'',token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
  if(!this.key||Buffer.byteLength(token)!==Buffer.byteLength(this.key)||!timingSafeEqual(Buffer.from(token),Buffer.from(this.key))){this.reply(res,401,1,'API Key 无效');req.resume();return;}
  const url=new URL(req.url||'/',`http://127.0.0.1:${this.config.port}`),route=LOCAL_API_ROUTES.find(([method,pathname])=>method===req.method&&pathname===url.pathname);
  if(!route){this.reply(res,404,1,'接口或请求方法不支持');req.resume();return;}
  let input:Record<string,unknown>=Object.fromEntries(url.searchParams);if(req.method==='POST'){
   if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')){this.reply(res,415,1,'POST 请求使用 application/json');req.resume();return;}
   const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024){this.reply(res,413,1,'请求体超过 1 MiB');req.resume();return;}chunks.push(chunk);}input=JSON.parse(Buffer.concat(chunks).toString()||'{}');if(!input||Array.isArray(input)||typeof input!=='object')throw new Error('请求体必须为 JSON 对象');
  }
  const data=await this.dispatch(url.pathname,input);this.changed();this.reply(res,200,0,'success',data);
 }catch(error){let msg=error instanceof Error?error.message:String(error);if(this.key)msg=msg.split(this.key).join('[已隐藏]');if(!res.headersSent)this.reply(res,400,1,msg);}}
 private async draft(raw:unknown,previous?:Profile,forceRandom=false){
  const input=profileInput.parse(raw),settings=this.store.settings(),explicit={...apiFingerprint(input.fingerprint_config),...input.values};
  for(const [key,value] of Object.entries(explicit)){const feature=FEATURES.find(f=>f.key===key);if(!feature)throw new Error('未知指纹字段：'+key);const group=controlledGroup(key);if(group&&!settings.controlledFeatures?.[group.id]&&value!==feature.default)throw new Error('请先在软件设置开启：'+group.label);}
  const base=previous?structuredClone(previous):newProfile(randomUUID(),newSeed(),'',applyControlledValues(settings.fingerprintDefaults,settings.controlledFeatures));
  const randomize=forceRandom||input.randomize===true||(!previous&&input.randomize!==false),fixed={...preservedFingerprint(base.values,fingerprintLocks(settings)),...explicit};
  base.values=applyControlledValues(randomize?randomFullFingerprint({...base.values,...explicit},Math.random,fixed):{...base.values,...explicit},settings.controlledFeatures);
  // An explicitly supplied locale must survive proxy-based auto matching.
  if((explicit.locale||explicit.timezone)&&explicit.geoip===undefined)base.values.geoip=false;
  base.seed=input.seed??(randomize?newSeed():base.seed);base.name=input.name||(randomize||!previous?randomProfileName(this.store.profiles().map(p=>p.name)):base.name);
  if(input.group_id!==undefined)base.group=input.group_id;if(input.remark!==undefined)base.notes=input.remark;if(input.tags)base.tags=input.tags;if(input.open_urls)base.startUrls=input.open_urls;
  if(previous&&input.kernel_id!==undefined&&previous.kernelId&&input.kernel_id!==previous.kernelId)throw new Error('已有环境请通过升级验证副本更换内核');
  if(previous&&base.values.engine!==previous.values.engine)throw new Error('已有环境不能更换引擎，请新建环境');
  base.kernelId=input.kernel_id??base.kernelId;if(!base.kernelId)base.kernelId=this.store.kernels().find(k=>(k.engine||'chromium')===base.values.engine&&k.arch===process.arch)?.id||this.store.kernels().find(k=>(k.engine||'chromium')===base.values.engine)?.id||'';
  if(base.kernelId){const k=this.store.kernels().find(k=>k.id===base.kernelId);if(!k||(k.engine||'chromium')!==base.values.engine)throw new Error('内核不存在或引擎不匹配');}
  base.extensionIds=input.extension_ids??(previous?base.extensionIds:enabledExtensionIds(settings,this.store.extensions(),base.values));for(const id of base.extensionIds)this.store.get('extension',id);
  if(input.proxy_id!==undefined)base.proxyId=input.proxy_id;if(base.proxyId)this.store.get('proxy',base.proxyId);
  if(input.proxy_id!==undefined&&input.user_proxy_config)throw new Error('proxy_id 与 user_proxy_config 只能选择一个');
  const proxyInput=input.user_proxy_config;let proxy;
  if(proxyInput){if(proxyInput.proxy_soft==='no_proxy')base.proxyId='';else {proxy=proxySchema.parse({id:randomUUID(),name:base.name+' · API代理',protocol:proxyInput.proxy_type||'http',host:proxyInput.proxy_host,port:Number(proxyInput.proxy_port),username:proxyInput.proxy_user||'',password:proxyInput.proxy_password||'',bypass:''});base.proxyId=proxy.id;}}
  base.updatedAt=new Date().toISOString();const profile=validateProfile(base);for(const [key,value] of Object.entries(explicit))if(profile.values[key]!==value)throw new Error('指定指纹字段与其他设置冲突：'+key);return {profile,proxy};
 }
 private async saveDraft(raw:unknown,previous?:Profile,forceRandom=false){const {profile,proxy}=await this.draft(raw,previous,forceRandom);if(proxy)await this.store.saveProxy(proxy);try{if(this.closing())throw new Error('软件正在关闭');this.store.put('profile',profile.id,profile);}catch(error){if(proxy)this.store.remove('proxy',proxy.id);throw error;}return publicProfile(profile);}
 private async dispatch(route:string,p:Record<string,unknown>):Promise<unknown>{
  if(route==='/status'){z.object({}).strict().parse(p);return {status:'success',version:this.version};}
  if(route==='/api/v1/fingerprint/schema'){z.object({}).strict().parse(p);return {fields:FEATURES.map(f=>({key:f.key,label:f.label,kind:f.kind,default:f.default,options:f.options,min:f.min,max:f.max,enabled:!controlledGroup(f.key)||Boolean(this.store.settings().controlledFeatures?.[controlledGroup(f.key)!.id])})),aliases:['automatic_timezone','language','ua','hardware_concurrency','device_memory','screen_resolution','webrtc']};}
  if(route==='/api/v1/kernel/list'){z.object({}).strict().parse(p);return {list:this.store.kernels().map(({id,engine,version,arch})=>({kernel_id:id,engine:engine||'chromium',version,arch}))};}
  if(route==='/api/v1/user/list'){const query=z.object({user_id:idSchema.optional(),group_id:z.string().optional(),page:z.coerce.number().int().min(1).default(1),page_size:z.coerce.number().int().min(1).max(100).default(50)}).strict().parse(p);const profiles=this.store.profiles().filter(x=>(!query.user_id||x.id===query.user_id)&&(query.group_id===undefined||x.group===query.group_id));return {list:profiles.slice((query.page-1)*query.page_size,query.page*query.page_size).map(publicProfile),page:query.page,page_size:query.page_size,total:profiles.length};}
  if(route==='/api/v1/user/create'){if(p.user_id!==undefined)throw new Error('创建不接受 user_id');return this.saveDraft(p);}
  if(route==='/api/v1/fingerprint/random'){if(p.user_id!==undefined||p.user_proxy_config)throw new Error('随机预览不接受 user_id 或代理凭据');return publicProfile((await this.draft(p,undefined,true)).profile);}
  if(route==='/api/v1/user/update'||route==='/api/v1/user/random'){const id=idSchema.parse(p.user_id);return this.browsers.withIdleProfile(id,()=>this.saveDraft(p,this.store.profiles().find(x=>x.id===id)||this.store.get('profile',id),route.endsWith('/random')));}
  if(route==='/api/v1/user/delete'){const {user_ids}=z.object({user_ids:z.array(idSchema).min(1).max(100)}).strict().parse(p);const results=[];for(const id of new Set(user_ids)){try{await this.browsers.withIdleProfile(id,()=>this.store.deleteProfilePermanently(id));results.push({user_id:id,ok:true});}catch(error){results.push({user_id:id,ok:false,error:error instanceof Error?error.message:String(error)});}}return {results};}
  if(route==='/api/v1/browser/local-active'){z.object({}).strict().parse(p);return {list:Object.entries(this.browsers.running()).filter(([id])=>!id.startsWith('_')).map(([user_id,status])=>({user_id,status}))};}
  if(route==='/api/v1/browser/tabs'){const input=z.object({user_id:idSchema,action:z.enum(['list','open','goto','close','content','click','fill']),tab:z.number().int().min(0).max(1000).optional(),url:z.string().max(2048).optional(),selector:z.string().max(2048).optional(),text:z.string().max(100000).optional()}).strict().parse(p);if(['open','goto'].includes(input.action)){const url=new URL(input.url||'about:blank');if(!['http:','https:','about:'].includes(url.protocol)||url.username||url.password||(url.protocol==='about:'&&url.href!=='about:blank'))throw new Error('网址仅支持 HTTP/HTTPS 或 about:blank');}return this.browsers.automation(input.user_id,input);}
  const input=z.object({user_id:idSchema,open_tabs:z.enum(['0','1']).optional(),ip_tab:z.enum(['0','1']).optional()}).strict().parse(p),id=input.user_id;this.store.get('profile',id);
  if(route.endsWith('/start')){if(!this.browsers.isRunning(id))await this.browsers.start(id,input.open_tabs!=='0',false,true);return this.browsers.automationInfo(id);}
  if(route.endsWith('/stop')){await this.browsers.stop(id);return {status:'Inactive'};}
  if(route.endsWith('/active')){const status=this.browsers.running()[id];return {status:status==='running'?'Active':'Inactive',phase:status||'closed',...(status==='running'?await this.browsers.automationInfo(id):{})};}
  throw new Error('接口不支持');
 }
}
