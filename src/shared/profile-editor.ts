import {defaultValues,type Profile,type Values,type Kernel} from './model';
export function switchProfileMode(p:Profile,mode:Profile['mode'],defaults:Values,kernels:Kernel[]):Profile{
 const values=mode==='measured'?defaultValues():{...defaultValues(),...defaults};
 const current=kernels.find(k=>k.id===p.kernelId&&(k.engine||'chromium')===values.engine);
 const kernel=current||kernels.find(k=>(k.engine||'chromium')===values.engine);
 return {...p,mode,values,kernelId:kernel?.id||'',recordPath:'',proxyId:mode==='measured'?'':p.proxyId,extensionIds:values.engine==='firefox'||mode==='measured'?[]:p.extensionIds};
}
