import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export async function renameWithRetry(source:string,target:string){for(let attempt=0;;attempt++){try{await fs.rename(source,target);return;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes((error as NodeJS.ErrnoException).code||'')||attempt>=10)throw error;await new Promise(r=>setTimeout(r,250));}}}
export async function replaceDirectory(staging:string,destination:string){
 const previous=destination+'.old-'+randomUUID();let moved=false;
 try{await renameWithRetry(destination,previous);moved=true;}catch(e:any){if(e.code!=='ENOENT')throw e;}
 try{await renameWithRetry(staging,destination);}catch(error){if(moved)await renameWithRetry(previous,destination);throw error;}
 // A cleanup failure must not turn a successfully activated component into a failure.
 if(moved)await fs.rm(previous,{recursive:true,force:true}).catch(()=>{});
}
