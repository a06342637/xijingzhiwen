import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export async function replaceDirectory(staging:string,destination:string){
 const previous=destination+'.old-'+randomUUID();let moved=false;
 try{await fs.rename(destination,previous);moved=true;}catch(e:any){if(e.code!=='ENOENT')throw e;}
 try{await fs.rename(staging,destination);}catch(error){if(moved)await fs.rename(previous,destination);throw error;}
 // A cleanup failure must not turn a successfully activated component into a failure.
 if(moved)await fs.rm(previous,{recursive:true,force:true}).catch(()=>{});
}
