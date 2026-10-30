import {execFileSync,spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {releaseDir,pkg} from './release-path.mjs';
const gh=(...args)=>execFileSync('gh',args,{encoding:'utf8',stdio:['ignore','pipe','inherit']}).trim();
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw new Error('Commit all source changes before publishing');
execFileSync('git',['fetch','origin','main'],{stdio:'inherit'});
if(git('rev-parse','HEAD')!==git('rev-parse','origin/main'))throw new Error('Push the verified commit to main first');
const repo='a06342637/xijingzhiwen',tag='v'+pkg.version,files=[];
for(const arch of ['arm64','x64']){
 const manifest=arch==='arm64'?'latest-arm64.yml':'latest.yml';
 const metadata=JSON.parse(await fs.readFile(path.join(releaseDir,manifest),'utf8'));
 const file=`Qijing-${pkg.version}-${arch}-Setup.exe`;
 if(metadata.version!==pkg.version||metadata.path!==file)throw new Error('Manifest version/architecture mismatch');
 const hash=createHash('sha512');for await(const chunk of createReadStream(path.join(releaseDir,file)))hash.update(chunk);
 if(metadata.sha512!==hash.digest('base64')||metadata.files[0].size!==(await fs.stat(path.join(releaseDir,file))).size)throw new Error('Installer checksum mismatch');
 files.push(file,file+'.blockmap',manifest);
}
files.push('SHA256SUMS','release-notes.md');
for(const file of files)await fs.access(path.join(releaseDir,file));
const existing=spawnSync('gh',['release','view',tag,'--repo',repo,'--json','isDraft'],{encoding:'utf8'});
if(existing.status===0){if(!JSON.parse(existing.stdout).isDraft)throw new Error('Version already published; do not replace published binaries');}
else gh('release','create',tag,'--repo',repo,'--draft','--target',git('rev-parse','HEAD'),'--title','栖境 '+pkg.version,'--notes-file','scripts/release-notes.md');
gh('release','upload',tag,...files.map(file=>path.join(releaseDir,file)),'--repo',repo,'--clobber');
const uploaded=JSON.parse(gh('release','view',tag,'--repo',repo,'--json','assets')).assets;
for(const file of files){const asset=uploaded.find(a=>a.name===file);if(!asset||asset.size!==(await fs.stat(path.join(releaseDir,file))).size)throw new Error('Missing or incomplete release asset: '+file);}
gh('release','edit',tag,'--repo',repo,'--draft=false','--latest');
console.log(gh('release','view',tag,'--repo',repo,'--json','url','--jq','.url'));
