import fs from 'node:fs';
import path from 'node:path';
import {format} from 'node:util';
export function fileLogger(file:string){
 const write=(level:string,args:unknown[])=>{try{fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&fs.statSync(file).size>2*1024**2){fs.rmSync(file+'.old',{force:true});fs.renameSync(file,file+'.old');}fs.appendFileSync(file,new Date().toISOString()+' '+level+' '+format(...args)+'\n',{mode:0o600});}catch{/* Log failures must not abort updates. */}};
 return {info:(...args:unknown[])=>write('INFO',args),warn:(...args:unknown[])=>write('WARN',args),error:(...args:unknown[])=>write('ERROR',args),debug:(...args:unknown[])=>write('DEBUG',args)};
}
export function guardOutputPipes(logger:ReturnType<typeof fileLogger>,streams=[process.stdout,process.stderr]){
 for(const stream of streams)stream.on('error',(error:NodeJS.ErrnoException)=>{if(error.code==='EPIPE'){logger.warn('Terminal output closed (EPIPE); continuing with file logging.');return;}throw error;});
}
