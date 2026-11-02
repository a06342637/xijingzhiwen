import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {PROBE} from './probe';
export async function diagnosticPage(){
 const token=randomUUID(),pagePath='/check/'+token,resultPath='/result/'+token;
 let origin='',headers:http.IncomingHttpHeaders={},resolveResult!:(value:any)=>void;
 const result=new Promise<any>(resolve=>{resolveResult=resolve;});
 const server=http.createServer((req,res)=>{
  if(req.headers.host!==new URL(origin).host){res.writeHead(403).end();return;}
  if(req.method==='POST'&&req.url===resultPath){
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'){res.writeHead(403).end();return;}
   let bytes=0,failed=false;const chunks:Buffer[]=[];req.on('error',()=>{failed=true;});
   req.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>2*1024**2){failed=true;res.writeHead(413).end();req.destroy();return;}chunks.push(chunk);});
   req.on('end',()=>{if(failed)return;try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value.identity?.ua!=='string'||typeof value.screen?.width!=='number'||!value.webgl||!value.preferences)throw new Error('Incomplete observation');resolveResult(value);res.end('ok');}catch{res.writeHead(400).end();}});return;
  }
  if(req.method!=='GET'||req.url!==pagePath){res.writeHead(404).end();return;}
  headers=req.headers;res.setHeader('Content-Type','text/html;charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.end('<!doctype html><html><head><title>栖境 · 本地环境检查</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font:16px Segoe UI;padding:40px"><h2>正在检查当前环境</h2><p>检查结束后本页面会自动关闭。</p><script>'+PROBE+'.then(result=>fetch('+JSON.stringify(resultPath)+',{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(result)}));</script></body></html>');
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 origin='http://127.0.0.1:'+(server.address() as {port:number}).port;
 return {url:origin+pagePath,result,headers:()=>({...headers}),async close(){server.closeAllConnections();if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
