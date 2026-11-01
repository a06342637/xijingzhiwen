// Updater helpers may outlive a terminal. Never rely on its stdout/stderr pipe.
const fs=require('node:fs');
const path=require('node:path');
function createFileLogger(file){
 const write=(level,...args)=>{try{fs.mkdirSync(path.dirname(file),{recursive:true});if(fs.existsSync(file)&&fs.statSync(file).size>2*1024*1024)fs.renameSync(file,file+'.old');const message=args.map(x=>x instanceof Error?x.stack||x.message:typeof x==='string'?x:JSON.stringify(x)).join(' ');fs.appendFileSync(file,new Date().toISOString()+' '+level+' '+message+'\n',{mode:0o600});}catch{/* Logging must not interrupt a download or installation. */}};
 return {info:(...args)=>write('INFO',...args),warn:(...args)=>write('WARN',...args),error:(...args)=>write('ERROR',...args),debug:(...args)=>write('DEBUG',...args)};
}
function guardOutputPipes(logger,streams=[process.stdout,process.stderr]){
 for(const stream of streams)stream.on('error',error=>{if(error.code==='EPIPE'){logger.warn('Terminal output pipe closed (EPIPE). File logging remains available.');return;}throw error;});
}
module.exports={createFileLogger,guardOutputPipes};
