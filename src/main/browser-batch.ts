export async function browserBatch(ids:string[],action:'start'|'stop',browsers:{start:(id:string)=>Promise<unknown>;stop:(id:string)=>Promise<unknown>},maxBrowsers:number){
 const results:Array<{id:string;ok:boolean;error?:string}>=new Array(ids.length);let next=0;
 await Promise.all(Array.from({length:Math.min(ids.length,action==='start'?Math.min(4,maxBrowsers):5)},async()=>{for(;;){const index=next++;if(index>=ids.length)return;const id=ids[index];try{await browsers[action](id);results[index]={id,ok:true};}catch(error){results[index]={id,ok:false,error:error instanceof Error?error.message:String(error)};}}}));
 return results;
}
