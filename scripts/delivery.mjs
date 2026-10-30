import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {releaseDir as out,pkg} from './release-path.mjs';
await fs.mkdir(out,{recursive:true});
for(const doc of ['README.md','VERIFICATION.md','BUGFIXES.md','THIRD_PARTY_NOTICES.md'])await fs.copyFile(doc,path.join(out,doc));
const notes=await fs.readFile('scripts/release-notes.md','utf8');
const checksums=[];
for(const arch of ['arm64','x64']){
 const file='Qijing-'+pkg.version+'-'+arch+'-Setup.exe';
 const sha256=createHash('sha256'),sha512=createHash('sha512');
 for await(const chunk of createReadStream(path.join(out,file))){sha256.update(chunk);sha512.update(chunk);}
 const sha=sha512.digest('base64'),size=(await fs.stat(path.join(out,file))).size;
 const metadata={version:pkg.version,files:[{url:file,sha512:sha,size}],path:file,sha512:sha,releaseDate:new Date().toISOString(),releaseNotes:notes};
 // JSON is valid YAML; separate manifests prevent selecting the wrong Windows architecture.
 await fs.writeFile(path.join(out,arch==='arm64'?'latest-arm64.yml':'latest.yml'),JSON.stringify(metadata,null,2)+'\n');
 checksums.push(sha256.digest('hex')+'  '+file);
}
await fs.writeFile(path.join(out,'SHA256SUMS'),checksums.join('\n')+'\n');
await fs.copyFile('scripts/release-notes.md',path.join(out,'release-notes.md'));
await fs.mkdir(path.join(out,'screenshots'),{recursive:true});
for(const name of ['desktop.png','settings-defaults.png','settings-experimental.png','batch-random-proxy.png','batch-created.png']){try{await fs.copyFile(path.join('.verification',name),path.join(out,'screenshots',name));}catch{}}
console.log('Release ready: '+out);
console.log(checksums.join('\n'));
