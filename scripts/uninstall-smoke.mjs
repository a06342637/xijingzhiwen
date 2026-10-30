import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const root=path.resolve('.verification/uninstall-installed');
const packageName='qijing-uninstall-verification',productName='Qijing Uninstall Verification';
const data=[path.join(process.env.APPDATA,packageName),path.join(process.env.APPDATA,productName),path.join(process.env.LOCALAPPDATA,packageName+'-updater')];
for(const folder of data){assert.ok(folder.endsWith(packageName)||folder.endsWith(productName)||folder.endsWith(packageName+'-updater'));}
function run(file,args){return new Promise((resolve,reject)=>{const child=spawn(file,args,{windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('close',code=>code?reject(new Error('Exit '+code)):resolve());});}
const installer=path.resolve('.verification/uninstall-build/Uninstall-Verification.exe');
await run(installer,['/S','/D='+root]);
for(const folder of data){await fs.mkdir(path.join(folder,'profiles'),{recursive:true});await fs.writeFile(path.join(folder,'profiles','sentinel'),'preserve for update');}
await run(installer,['/S','--updated','/D='+root]);
for(const folder of data)assert.equal(await fs.readFile(path.join(folder,'profiles','sentinel'),'utf8'),'preserve for update');
const uninstaller=(await fs.readdir(root)).find(n=>n.startsWith('Uninstall')&&n.endsWith('.exe'));assert.ok(uninstaller);
await run(path.join(root,uninstaller),['/S']);
for(let i=0;i<600;i++){if((await Promise.all(data.map(f=>fs.stat(f).catch(()=>null)))).every(v=>v===null))break;await new Promise(r=>setTimeout(r,100));}
for(const folder of data)await assert.rejects(fs.stat(folder),{code:'ENOENT'});
await fs.writeFile('.verification/uninstall-result.json',JSON.stringify({testPackage:packageName,coverage:'Production NSIS settings and macro, isolated package name/app ID/data directories',updatePreservedData:true,explicitUninstallRemovedData:true,updaterCacheRemoved:true},null,2));
console.log('Update preserved data; explicit uninstall removed data and update cache.');
