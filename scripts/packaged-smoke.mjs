import {releaseDir} from './release-path.mjs';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
const arch=process.argv[2]||'arm64',directory=arch==='x64'?'win-unpacked':'win-arm64-unpacked';
const output=path.resolve('.verification/packaged-'+arch);await mkdir(output,{recursive:true});
const env={...process.env,QIJING_SMOKE:'1',QIJING_TEST_DATA:path.resolve('.test-data'),QIJING_SMOKE_BROWSER:'1',QIJING_SMOKE_OUTPUT:output};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(releaseDir,directory,'栖境.exe'),[],{env,windowsHide:true,stdio:'inherit'});child.on('error',error=>{console.error(error);process.exit(1);});child.on('close',async code=>{if(code){try{console.error(await readFile(path.join(output,'smoke-error.txt'),'utf8'));}catch{}}console.log('Packaged '+arch+' exit '+code);process.exit(code??1);});
