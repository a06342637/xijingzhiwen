// Maintainer-only lock refresh. Production downloads use these pinned hashes.
import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
const version='3.13.9';
const packages={playwright:'1.64.1',pyee:'13.0.1',greenlet:'3.4.0',pillow:'12.1.0',typing_extensions:'4.15.0',langcodes:'3.5.1',tzdata:'2026.6'};
const result={schema:1,python:version,arches:{}};
for(const arch of ['arm64','x64']){
 const url=`https://www.python.org/ftp/python/${version}/python-${version}-embed-${arch==='x64'?'amd64':arch}.zip`;
 const response=await fetch(url);if(!response.ok)throw new Error('Python download '+response.status);
 const sha256=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
 const wheels=[];
 for(const [pkg,v] of Object.entries(packages)){
  const r=await fetch(`https://pypi.org/pypi/${pkg}/${v}/json`);if(!r.ok)throw new Error('Package metadata '+pkg+' '+r.status);const info=await r.json();
  const platform=arch==='arm64'?'win_arm64':'win_amd64';
  const files=info.urls.filter(f=>f.filename.endsWith('.whl')&&((f.filename.includes('cp313-cp313-')&&f.filename.includes(platform))||(f.filename.includes('py3-none-'+platform))||f.filename.includes('py3-none-any')));
  if(files.length!==1)throw new Error('Ambiguous wheel '+pkg+' '+arch+': '+files.map(x=>x.filename));
  const f=files[0];wheels.push({name:pkg,version:v,url:f.url,sha256:f.digests.sha256,filename:f.filename});
 }
 result.arches[arch]={url,sha256,wheels};
 console.log('Locked '+arch);
}
await mkdir('resources',{recursive:true});await writeFile('resources/components.json',JSON.stringify(result,null,2)+'\n');
