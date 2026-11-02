import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {dashboardSources,type DashboardState} from '../shared/dashboard';
import {PROBE} from './probe';
import {dashboardHtml,dashboardCss,dashboardJs} from './dashboard-view';

export async function createDashboardPage(initial:Omit<DashboardState,'phase'|'sources'>){
 const directory=typeof __dirname==='string'?__dirname:path.resolve('src/main');
 let font:Buffer|undefined;for(const file of [path.join(directory,'dashboard-font.woff2'),path.resolve(directory,'../../resources/dashboard-font.woff2'),path.resolve('resources/dashboard-font.woff2')]){try{font=await readFile(file);break;}catch{}}
 const token=randomUUID(),base='/dashboard/'+token;let origin='',closed=false,sample='';
 let value:DashboardState={...initial,phase:'idle',sources:dashboardSources()};
 let run:()=>Promise<void>=async()=>{},open:(id:string)=>Promise<void>=async()=>{};
 const server=http.createServer((req,res)=>{
  if(closed||req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  if(req.method==='GET'){
   if(req.url===base||req.url===base+'/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");res.end(dashboardHtml(base));return;}
   if(req.url===base+'/font.woff2'&&font){res.setHeader('Content-Type','font/woff2');res.end(font);return;}
   if(req.url===base+'/style.css'){res.setHeader('Content-Type','text/css');res.end(dashboardCss);return;}
   if(req.url===base+'/app.js'){res.setHeader('Content-Type','text/javascript;charset=utf-8');res.end(dashboardJs);return;}
   if(req.url===base+'/probe.js'){
    sample=randomUUID();value={...value,observation:undefined,observationStatus:'running',observationAt:undefined,observationError:undefined};
    res.setHeader('Content-Type','text/javascript;charset=utf-8');res.end(`(()=>{const sample=${JSON.stringify(sample)},url=${JSON.stringify(base+'/observation')};const basic={identity:{ua:navigator.userAgent,platform:navigator.platform,language:navigator.language,languages:[...navigator.languages],cpu:navigator.hardwareConcurrency,memory:navigator.deviceMemory,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone},screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio,touch:navigator.maxTouchPoints,innerWidth,innerHeight},preferences:{},webgl:{}};let finished=false;const post=(observation,status,error)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sample,observation,status,error})}).catch(()=>{});void post(basic,'running');const timer=setTimeout(()=>{finished=true;void post(basic,'limited','本地高级观测超时，已保留基础信息');},12000);${PROBE}.then(observation=>{if(finished)return;finished=true;clearTimeout(timer);void post(observation,'complete');}).catch(()=>{if(finished)return;finished=true;clearTimeout(timer);void post(basic,'limited','部分浏览器 API 观测失败，已保留基础信息');});})();`);return;
   }
   if(req.url===base+'/state'||req.url===base+'/export'){res.setHeader('Content-Type','application/json;charset=utf-8');if(req.url.endsWith('/export'))res.setHeader('Content-Disposition','attachment; filename="Qijing-environment-overview.json"');res.end(JSON.stringify(value));return;}
   res.writeHead(404).end();return;
  }
  if(req.method!=='POST'||![base+'/run',base+'/observation',base+'/open'].includes(req.url||'')){res.writeHead(404).end();return;}
  if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'){res.writeHead(403).end();return;}
  const chunks:Buffer[]=[];let size=0,failed=false;
  req.on('error',()=>{failed=true;});req.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>2*1024**2){failed=true;res.writeHead(413).end();req.destroy();return;}chunks.push(chunk);});
  req.on('end',()=>{if(failed)return;let data:any;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{res.writeHead(400).end();return;}
   if(req.url===base+'/observation'){
    const o=data?.observation;if(!o||typeof o.identity?.ua!=='string'||typeof o.screen?.width!=='number'||!o.webgl||!o.preferences||!['running','complete','limited'].includes(data.status)){res.writeHead(400).end();return;}
    if(!sample||data.sample!==sample||value.observationStatus!=='running'){res.writeHead(409).end();return;}
    value={...value,observation:o,observationStatus:data.status,observationAt:new Date().toISOString(),observationError:typeof data.error==='string'?data.error.slice(0,250):undefined};res.end('{}');return;
   }
   if(req.url===base+'/open'){if(!value.sources.some(s=>s.id===data?.id)){res.writeHead(400).end();return;}void open(data.id).then(()=>res.end('{}')).catch(error=>{if(!res.destroyed)res.writeHead(502,{'Content-Type':'application/json;charset=utf-8'}).end(JSON.stringify({error:error instanceof Error?error.message.slice(0,500):'打开检测站失败'}));});return;}
   if(!data||typeof data!=='object'||Array.isArray(data)){res.writeHead(400).end();return;}
   if(value.phase==='running'){res.writeHead(409).end(JSON.stringify({error:'检测正在进行'}));return;}
   value={...value,phase:'running'};res.end('{}');void run().catch(()=>{value={...value,phase:'complete'};});
  });
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
 return {url:origin+base,origin,base,state:()=>structuredClone(value),update(patch:Partial<DashboardState>){if(!closed)value={...value,...patch};},source(id:string,patch:Partial<DashboardState['sources'][number]>){if(!closed)value={...value,sources:value.sources.map(s=>s.id===id?{...s,...patch}:s)};},handlers(handlers:{run:()=>Promise<void>;open:(id:string)=>Promise<void>}){run=handlers.run;open=handlers.open;},async close(){closed=true;server.closeAllConnections();if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
