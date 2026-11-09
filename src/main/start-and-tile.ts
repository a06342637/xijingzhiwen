export async function startAndTile(ids:string[],startBatch:(ids:string[])=>Promise<Array<{id:string;ok:boolean;error?:string}>>,tile:(ids:string[])=>Promise<unknown>){
 const unique=[...new Set(ids)],results=await startBatch(unique),ready=results.filter(r=>r.ok).map(r=>r.id);
 if(!ready.length)return {results,layout:null};
 try{return {results,layout:await tile(ready)};}catch(error){return {results,layout:null,layoutError:error instanceof Error?error.message:String(error)};}
}
