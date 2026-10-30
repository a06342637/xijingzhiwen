import {execFileSync} from 'node:child_process';
import path from 'node:path';
const builder=path.resolve('node_modules/electron-builder/cli.js');
for(const arch of ['arm64','x64'])execFileSync(process.execPath,[builder,'--win','nsis','--'+arch,'--publish','never'],{stdio:'inherit',windowsHide:true});
await import('./delivery.mjs');
