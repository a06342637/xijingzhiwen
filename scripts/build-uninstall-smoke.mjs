import fs from 'node:fs/promises';
import path from 'node:path';
import {build,Platform,Arch} from 'electron-builder';
const root=path.resolve('.verification/uninstall-fixture');await fs.mkdir(root,{recursive:true});
await fs.writeFile(path.join(root,'package.json'),JSON.stringify({name:'qijing-uninstall-verification',version:'0.1.2',main:'main.cjs',author:'Qijing',description:'Isolated uninstall verification'}));
await fs.writeFile(path.join(root,'main.cjs'),"require('electron').app.whenReady().then(()=>require('electron').app.quit());");
await build({projectDir:root,targets:Platform.WINDOWS.createTarget('nsis',Arch.arm64),publish:'never',config:{appId:'io.qijing.uninstall.verification',productName:'Qijing Uninstall Verification',electronVersion:'45.1.0',electronDist:path.resolve('node_modules/electron/dist'),directories:{output:path.resolve('.verification/uninstall-build')},files:['main.cjs','package.json'],compression:'normal',win:{signExecutable:false,artifactName:'Uninstall-Verification.exe'},nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,deleteAppDataOnUninstall:true,createDesktopShortcut:false,createStartMenuShortcut:false,include:path.resolve('scripts/installer.nsh')}}});
