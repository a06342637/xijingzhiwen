import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {newSeed} from './store';
import {validateProfile} from '../shared/config';
import {randomFullFingerprint} from '../shared/random-fingerprint';
import {randomProfileName} from './profile-names';
import {preservedFingerprint} from '../shared/fingerprint-presets';

export function prepareProfileBatch(raw:unknown,locks:readonly string[]=[]){
 const {profile,count,randomize}=z.object({profile:z.unknown(),count:z.number().int().min(1).max(100),randomize:z.boolean()}).strict().parse(raw);
 const input=profile&&typeof profile==='object'?profile as Record<string,unknown>:undefined;
 const template=validateProfile(input&&(randomize||count>1)&&typeof input.name==='string'&&!input.name.trim()?{...input,name:randomProfileName()}:profile);
 if(template.mode==='measured'&&(count>1||randomize))throw new Error('实测设备记录请单独创建');
 if(count>1&&template.downloadDir)throw new Error('批量创建请留空下载目录，每个环境将使用独立目录');
 const now=new Date().toISOString();
 const used=new Set<string>();
 return Array.from({length:count},(_,index)=>{const baseName=randomize||count>1?randomProfileName(used):template.name;used.add(baseName);const name=count>1?baseName+'-'+(index+1):baseName;return validateProfile({...template,id:randomUUID(),seed:count===1&&!randomize?template.seed:newSeed(),name,values:randomize||count>1?randomFullFingerprint(template.values,Math.random,preservedFingerprint(template.values,locks)):{...template.values},createdAt:now,updatedAt:now,lastStartedAt:undefined});});
}
