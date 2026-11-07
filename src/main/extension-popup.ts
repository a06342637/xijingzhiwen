import fs from 'node:fs/promises';
import path from 'node:path';

// Chromix's seeded display emulation can clip browser action bubbles. Keep
// extension code/data intact and open the same popup document in a tool window.
const preparing=new Map<string,Promise<void>>();
export function prepareExtensionPopup(directory:string){const key=path.resolve(directory);let task=preparing.get(key);if(!task){task=preparePopup(key).finally(()=>preparing.delete(key));preparing.set(key,task);}return task;}
async function preparePopup(directory:string){
 const file=path.join(directory,'manifest.json'),marker=path.join(directory,'qijing-popup-adapter.json');
 const manifest=JSON.parse(await fs.readFile(file,'utf8'));if(await fs.stat(marker).catch(()=>null))return;
 const action=manifest.action||manifest.browser_action;const popup=action?.default_popup;
 if(typeof popup!=='string'||!popup)return;
 if(manifest.manifest_version===2&&manifest.background?.page)return;
 const normalized=popup.replaceAll('\\','/');const popupFile=path.resolve(directory,normalized.split(/[?#]/)[0]);const relative=path.relative(directory,popupFile);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('扩展弹窗路径无效');await fs.access(popupFile);
 const adapter='qijing-popup-window.js';if(await fs.stat(path.join(directory,adapter)).catch(()=>null))throw new Error('扩展兼容文件名冲突');
 const original=structuredClone(manifest.background||{});const module=original.type==='module';
 const prefix=original.service_worker?(module?'import '+JSON.stringify('./'+original.service_worker)+';\n':'importScripts('+JSON.stringify(original.service_worker)+');\n'):'';
 const script=prefix+`const qijingAction=chrome.action||chrome.browserAction;
let qijingToolWindow;
async function qijingOpenPopupWindow(){
 try{if(qijingToolWindow){await chrome.windows.update(qijingToolWindow,{focused:true});return;}}catch{qijingToolWindow=undefined;}
 const tool=await chrome.windows.create({url:chrome.runtime.getURL(${JSON.stringify(normalized)}),type:'popup',width:580,height:680});qijingToolWindow=tool.id;
}
qijingAction.onClicked.addListener(qijingOpenPopupWindow);
chrome.windows.onRemoved.addListener(id=>{if(id===qijingToolWindow)qijingToolWindow=undefined;});
`;
 await fs.writeFile(path.join(directory,adapter),script);
 const next=structuredClone(manifest);delete (next.action||next.browser_action).default_popup;
 if(next.manifest_version===3)next.background={service_worker:adapter,...(module?{type:'module'}:{})};
 else next.background={...original,scripts:[...(original.scripts||[]),adapter]};
 // Publish the manifest last; a failed preparation leaves the original usable.
 const tmp=file+'.qijing-tmp';await fs.writeFile(tmp,JSON.stringify(next,null,2));await fs.rename(tmp,file);
 await fs.writeFile(marker,JSON.stringify({popup:normalized,background:original,version:1}),{mode:0o600});
}
