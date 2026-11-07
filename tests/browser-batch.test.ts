import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserBatch} from '../src/main/browser-batch';
test('batch launch overlaps limited workers, reports each failure in input order and respects configured capacity',async()=>{
 let active=0,peak=0;const browser={start:async(id:string)=>{peak=Math.max(peak,++active);await new Promise(r=>setTimeout(r,id==='a'?30:5));active--;if(id==='b')throw new Error('fixture failure');},stop:async()=>{}};
 const result=await browserBatch(['a','b','c','d'],'start',browser,2);assert.equal(peak,2);assert.deepEqual(result.map(r=>r.id),['a','b','c','d']);assert.equal(result[1].ok,false);assert.equal(result[1].error,'fixture failure');assert.ok(result.filter(r=>r.id!=='b').every(r=>r.ok));assert.deepEqual(await browserBatch([],'start',browser,2),[]);
});
