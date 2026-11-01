import fs from 'node:fs/promises';
export async function firefoxCookies(context:any,action:string,file:string,passphrase:string){
 const {encryptCookies,decryptCookies}=await import('@xiaoxiaofeihh/chromix/cookies');
 if(action==='exportCookies'){
  const cookies=await context.cookies();if(cookies.some((c:any)=>c.partitionKey))throw new Error('当前火狐迁移不支持分区 Cookie');
  const clean=cookies.map((c:any)=>Object.fromEntries(['name','value','domain','path','secure','httpOnly','expires','sameSite'].filter(k=>c[k]!==undefined&&c[k]!==null&&!(k==='sameSite'&&c[k]==='None'&&!c.secure)).map(k=>[k,c[k]])));const data=await encryptCookies(clean,passphrase);const handle=await fs.open(file,'wx',0o600);try{await handle.writeFile(data);await handle.sync();}finally{await handle.close();}return {exported:cookies.length,formatVersion:1};
 }
 if((await context.cookies()).length)throw new Error('目标 Cookie 必须为空');
 if((await fs.stat(file)).size>16*1024**2)throw new Error('Cookie 文件过大');
 const cookies=await decryptCookies(await fs.readFile(file),passphrase);
 if(cookies.some((c:any)=>c.partitionKey||c.priority||c.sourcePort!==undefined||c.sourceScheme!==undefined))throw new Error('文件含 Chromium 专属 Cookie 元数据，请使用同引擎迁移');
 await context.addCookies(cookies);return {imported:cookies.length,formatVersion:1};
}
