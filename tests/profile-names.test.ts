import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {randomProfileName} from '../src/main/profile-names';
import {prepareProfileBatch} from '../src/main/profile-batch';
import {newProfile} from '../src/shared/model';
test('random names allow blank random templates, batch names differ, manual single names stay intact',()=>{
 const names=new Set<string>();for(let i=0;i<300;i++){const name=randomProfileName(names);assert.ok(name.length>0&&name.length<=80);assert.ok(!names.has(name));names.add(name);}
 const p=newProfile(randomUUID(),'123');const batch=prepareProfileBatch({profile:p,count:100,randomize:false});assert.equal(new Set(batch.map(p=>p.name)).size,100);assert.ok(batch.every(p=>p.name.trim().length>0));assert.ok(prepareProfileBatch({profile:p,count:1,randomize:true})[0].name);p.name='手动名称';assert.equal(prepareProfileBatch({profile:p,count:1,randomize:false})[0].name,p.name);assert.notEqual(prepareProfileBatch({profile:p,count:1,randomize:true})[0].name,p.name);
});
