import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {newSeed} from './store';
import {validateProfile} from '../shared/config';
import {randomFingerprint} from '../shared/random-fingerprint';

export function prepareProfileBatch(raw:unknown){
 const {profile,count,randomize}=z.object({profile:z.unknown(),count:z.number().int().min(1).max(100),randomize:z.boolean()}).strict().parse(raw);
 const template=validateProfile(profile);
 if(template.mode==='measured'&&(count>1||randomize))throw new Error('实测设备记录请单独创建');
 if(count>1&&template.downloadDir)throw new Error('批量创建请留空下载目录，每个环境将使用独立目录');
 const now=new Date().toISOString();
 return Array.from({length:count},(_,i)=>validateProfile({...template,id:randomUUID(),seed:count===1&&!randomize?template.seed:newSeed(),name:count===1?template.name:template.name.slice(0,74)+' '+String(i+1).padStart(3,'0'),values:randomize?randomFingerprint(template.values):{...template.values},createdAt:now,updatedAt:now}));
}
