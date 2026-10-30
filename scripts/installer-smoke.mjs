import {releaseDir} from './release-path.mjs';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const version=JSON.parse(await fs.readFile('package.json','utf8')).version;
const root=path.resolve('.verification/installed-arm64'),output=path.resolve('.verification/installer');
await fs.mkdir(output,{recursive:true});
function execute(file,args,env=process.env){return new Promise((resolve,reject)=>{const p=spawn(file,args,{windowsHide:true,stdio:'inherit',env});p.on('error',reject);p.on('close',code=>code?reject(new Error(path.basename(file)+' exit '+code)):resolve());});}
await execute(path.join(releaseDir,`Qijing-${version}-arm64-Setup.exe`),['/S','/D='+root]);
assert.ok((await fs.stat(path.join(root,'栖境.exe'))).isFile());
const env={...process.env,QIJING_SMOKE:'1',QIJING_TEST_DATA:path.resolve('.test-data'),QIJING_SMOKE_BROWSER:'1',QIJING_SMOKE_OUTPUT:output};delete env.ELECTRON_RUN_AS_NODE;
await execute(path.join(root,'栖境.exe'),[],env);
const dbBefore=await fs.readFile(path.resolve('.test-data/qijing.sqlite'));
await execute(path.join(releaseDir,`Qijing-${version}-arm64-Setup.exe`),['/S','/D='+root]);
assert.deepEqual(await fs.readFile(path.resolve('.test-data/qijing.sqlite')),dbBefore);
await fs.writeFile(path.join(output,'installer.json'),JSON.stringify({arch:'arm64',checks:[{name:'安装器安装至独立验收目录',passed:true},{name:'安装后程序与浏览器启动',passed:true},{name:'再次覆盖安装保留数据',passed:true}]},null,2));
console.log('Installer install / run / reinstall passed: '+root);
