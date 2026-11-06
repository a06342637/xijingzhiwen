import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {randomProfileName} from '../src/main/profile-names';
import {prepareProfileBatch} from '../src/main/profile-batch';
import {newProfile} from '../src/shared/model';
test('random names allow blank random templates, batch names differ, manual single names stay intact',()=>{
 assert.match(randomProfileName([],new Date(2026,10,6,13,4,5)),/^[a-zA-Z0-9]{4}-20261106-130405$/);
 const names=new Set<string>();for(let i=0;i<300;i++){const name=randomProfileName(names);assert.ok(name.length>0&&name.length<=80);assert.ok(!names.has(name));names.add(name);}
 const p=newProfile(randomUUID(),'123');const batch=prepareProfileBatch({profile:p,count:100,randomize:false});assert.equal(new Set(batch.map(p=>p.name)).size,100);assert.ok(batch.every((p,index)=>new RegExp('^[a-zA-Z0-9]{4}-\\d{8}-\\d{6}-'+(index+1)+'$').test(p.name)));const pair=prepareProfileBatch({profile:p,count:2,randomize:true});assert.ok(pair[0].name.endsWith('-1'));assert.ok(pair[1].name.endsWith('-2'));assert.match(prepareProfileBatch({profile:p,count:1,randomize:true})[0].name,/^[a-zA-Z0-9]{4}-\d{8}-\d{6}$/);p.name='手动名称';assert.equal(prepareProfileBatch({profile:p,count:1,randomize:false})[0].name,p.name);
});
