// Maintainer verification: real GitHub updater and NSIS in a dedicated test directory.
const {app}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {NsisUpdater}=require('electron-updater');
const {ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor');
const version=require('../package.json').version;
const root=path.resolve('.verification/update-install-'+version);
const installDir=path.join(root,'installed'),data=path.join(root,'data');
const {createFileLogger,guardOutputPipes}=require('./file-log.cjs');
const logger=createFileLogger(path.join(root,'updater.log'));guardOutputPipes(logger);
app.setPath('userData',path.join(root,'driver'));
function execute(file,args,env=process.env){return new Promise((resolve,reject)=>{const child=spawn(file,args,{env,windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('close',code=>code?reject(new Error(path.basename(file)+' exited '+code)):resolve());});}
app.whenReady().then(async()=>{
 await fs.mkdir(root,{recursive:true});await fs.mkdir(data,{recursive:true});
 const cached=path.resolve('.verification/github-update/arm64');
 const adapter={version:'0.1.2',name:'qijing-update-test',isPackaged:true,appUpdateConfigPath:path.join(cached,'app-update.yml'),userDataPath:cached,baseCachePath:cached,whenReady:()=>Promise.resolve(),relaunch(){},quit(){this.didQuit=true;},onQuit(){}};
 const updater=new NsisUpdater(null,adapter);updater.logger=logger;updater.httpExecutor=new ElectronHttpExecutor();updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.disableDifferentialDownload=true;updater.disableWebInstaller=true;
 updater.setFeedURL({provider:'github',owner:'a06342637',repo:'xijingzhiwen',channel:'latest-arm64'});updater.installDirectory=installDir;
 let updaterError;updater.on('error',error=>{updaterError=error;});
 const result=await updater.checkForUpdates();if(result.updateInfo.version!==version)throw new Error('Published version differs from source');
 await updater.downloadUpdate();
 const baseline=path.resolve('../xijing发行版本/0.1.2/Qijing-0.1.2-arm64-Setup.exe');await execute(baseline,['/S','/D='+installDir]);
 const executable=path.join(installDir,'栖境.exe');
 const smokeEnv={...process.env,QIJING_SMOKE:'1',QIJING_TEST_DATA:data,QIJING_SMOKE_OUTPUT:path.join(root,'baseline'),QIJING_SMOKE_BROWSER:'0'};delete smokeEnv.ELECTRON_RUN_AS_NODE;
 await execute(executable,[],smokeEnv);
 const db=path.join(data,'qijing.sqlite');const before=await fs.readFile(db);await fs.writeFile(path.join(data,'update-sentinel'),'preserve-this');
 updater.quitAndInstall(true,false);
 const run=promisify(execFile);let installed=false;
 for(let i=0;i<600;i++){
  if(updaterError)throw updaterError;
  try{const actual=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`[System.Diagnostics.FileVersionInfo]::GetVersionInfo($env:QIJING_VERIFY_EXE).FileVersion`],{windowsHide:true,env:{...process.env,QIJING_VERIFY_EXE:executable},timeout:15000});if(actual.stdout.trim()===version){installed=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!installed||!adapter.didQuit)throw new Error('Updater did not install and request quit');
 // Finish the installer before reopening so its old-process cleanup cannot race the test.
 for(let i=0;i<180;i++){const running=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq $env:QIJING_VERIFY_NAME }).Count`],{windowsHide:true,env:{...process.env,QIJING_VERIFY_NAME:'Qijing-'+version+'-arm64-Setup.exe'},timeout:15000});if(running.stdout.trim()==='0')break;await new Promise(resolve=>setTimeout(resolve,500));}
 if(!before.equals(await fs.readFile(db)))throw new Error('Installer modified saved environment data');
 const output=path.join(root,'updated');await execute(executable,[],{...smokeEnv,QIJING_SMOKE_OUTPUT:output});
 const state=JSON.parse(await fs.readFile(path.join(output,'smoke.json'),'utf8'));if(state.state.version!==version||!state.checks.every(c=>c.passed))throw new Error('Updated program failed its isolated runtime check');
 if(await fs.readFile(path.join(data,'update-sentinel'),'utf8')!=='preserve-this')throw new Error('Update removed data');
 await fs.writeFile(path.join(root,'result.json'),JSON.stringify({version,githubDownload:true,sha512Verified:true,quitAndInstall:true,silentInstallation:true,dataPreserved:true,updatedRuntime:true,automaticRestartArgument:'Covered by SoftwareUpdates unit tests; this harness reopens with isolated environment variables.',checks:state.checks},null,2));logger.info('GitHub download, updater installation, data retention and updated runtime passed: '+version);app.exit(0);
}).catch(error=>{logger.error(error);app.exit(1);});
