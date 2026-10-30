// Run with Electron after publishing. Uses isolated update cache and an older
// adapter version to exercise the real GitHub provider and checksum download.
const {app}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {NsisUpdater}=require('electron-updater');
const {ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor');
const root=path.resolve('.verification/github-update');
app.setPath('userData',path.join(root,'electron'));
app.whenReady().then(async()=>{
 await fs.mkdir(root,{recursive:true});const checks=[];
 for(const arch of ['arm64','x64']){
  const dir=path.join(root,arch);await fs.mkdir(dir,{recursive:true});
  const config=path.join(dir,'app-update.yml');await fs.writeFile(config,'updaterCacheDirName: isolated-update-cache\n');
  const adapter={version:'0.1.1',name:'qijing-update-test',isPackaged:true,appUpdateConfigPath:config,userDataPath:dir,baseCachePath:dir,whenReady:()=>Promise.resolve(),relaunch(){},quit(){},onQuit(){}};
  const updater=new NsisUpdater({provider:'github',owner:'a06342637',repo:'xijingzhiwen',channel:arch==='arm64'?'latest-arm64':'latest'},adapter);
  updater.httpExecutor=new ElectronHttpExecutor();updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.disableDifferentialDownload=true;updater.disableWebInstaller=true;
  updater.on('error',()=>{});
  const result=await updater.checkForUpdates();if(result.updateInfo.version!==require('../package.json').version)throw new Error('Unexpected published version');
  if(!result.updateInfo.files[0].url.includes('-'+arch+'-'))throw new Error('Wrong architecture');
  const downloaded=await updater.downloadUpdate();if(!(await fs.stat(downloaded[0])).size)throw new Error('Empty download');
  checks.push({arch,version:result.updateInfo.version,file:path.basename(downloaded[0]),githubCheck:true,checksumDownload:true});
 }
 await fs.writeFile(path.join(root,'result.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});
