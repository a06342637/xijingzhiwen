import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const exe=(await import('electron')).default;
await mkdir('.verification',{recursive:true});
const smokeEnv={...process.env,QIJING_SMOKE:'1',QIJING_TEST_DATA:path.resolve('.test-data'),QIJING_SMOKE_BROWSER:process.env.QIJING_SMOKE_BROWSER||'0'};
delete smokeEnv.ELECTRON_RUN_AS_NODE;
const child=spawn(exe,['.'],{env:smokeEnv,windowsHide:true,stdio:'inherit'});
child.on('close',async code=>{if(code){try{console.error(await readFile('.verification/smoke-error.txt','utf8'));}catch{}}process.exit(code??1);});
