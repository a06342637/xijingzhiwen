import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {SoftwareUpdates} from '../src/main/software-update';
class Client extends EventEmitter {
 autoDownload=true;autoInstallOnAppQuit=true;allowPrerelease=true;allowDowngrade=true;downloads=0;installed=false;
 async checkForUpdates(){this.emit('update-available',{version:'0.1.4',releaseNotes:'new version'});}
 async downloadUpdate(){this.downloads++;this.emit('download-progress',{percent:45});this.emit('update-downloaded');}
 quitAndInstall(){this.installed=true;}
}
test('automatic check downloads but never installs until explicitly requested',async()=>{const client=new Client();const update=new SoftwareUpdates(client,true,()=>{},async()=>{},()=>true);await update.check();assert.equal(client.downloads,1);assert.equal(update.state().phase,'downloaded');assert.equal(client.installed,false);await update.install();assert.equal(client.installed,true);assert.equal(client.autoInstallOnAppQuit,false);});
test('manual mode waits for download; concurrent downloads share one operation',async()=>{const client=new Client();let finish!:()=>void;client.downloadUpdate=async()=>{client.downloads++;await new Promise<void>(r=>finish=r);client.emit('update-downloaded');};const update=new SoftwareUpdates(client,true,()=>{},async()=>{},()=>false);await update.check();assert.equal(client.downloads,0);const a=update.download(),b=update.download();finish();await Promise.all([a,b]);assert.equal(client.downloads,1);});
test('install preparation is locked immediately and errors restore normal application state',async()=>{const client=new Client();let finish!:()=>void,recovered=0;const update=new SoftwareUpdates(client,true,()=>{},()=>new Promise<void>(r=>finish=r),()=>false,()=>recovered++);await update.check();await update.download();const install=update.install();assert.equal(update.state().phase,'installing');await update.check();assert.equal(client.downloads,1);finish();await install;client.emit('error',new Error('installer failed'));assert.equal(recovered,1);assert.equal(update.state().phase,'error');});
test('automatic download failure is visible and a subsequent check can retry',async()=>{const client=new Client();let failed=true;client.downloadUpdate=async()=>{client.downloads++;if(failed)throw new Error('offline');client.emit('update-downloaded');};const update=new SoftwareUpdates(client,true,()=>{},async()=>{},()=>true);await update.check();assert.equal(update.state().phase,'error');failed=false;await update.check();assert.equal(update.state().phase,'downloaded');});

