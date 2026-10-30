import {contextBridge,ipcRenderer} from 'electron';
import type {Reply,AppState} from '../shared/model';
contextBridge.exposeInMainWorld('qijing',{
 async invoke(action:string,payload?:unknown){const reply:Reply=await ipcRenderer.invoke('qijing:request',action,payload);if(!reply.ok)throw new Error(reply.error);return reply.data;},
 onState(callback:(state:AppState)=>void){const listener=(_:unknown,state:AppState)=>callback(state);ipcRenderer.on('qijing:state',listener);return ()=>ipcRenderer.removeListener('qijing:state',listener);}
});
