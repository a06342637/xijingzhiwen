import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startAndTile} from '../src/main/start-and-tile';
test('start and tile waits for all starts, includes existing successes and skips failures',async()=>{
 const events:string[]=[];const result=await startAndTile(['a','b','a','c'],async ids=>{assert.deepEqual(ids,['a','b','c']);events.push('start');await new Promise(r=>setTimeout(r,10));events.push('ready');return [{id:'a',ok:true},{id:'b',ok:false,error:'fail'},{id:'c',ok:true}];},async ids=>{assert.deepEqual(events,['start','ready']);assert.deepEqual(ids,['a','c']);events.push('tile');return {results:ids.map(id=>({id,ok:true}))};});assert.equal(result.results.length,3);assert.deepEqual(events,['start','ready','tile']);
});
test('tiling failures retain started environment results and no success never invokes tiling',async()=>{
 const result=await startAndTile(['a'],async()=>[{id:'a',ok:true}],async()=>{throw new Error('monitor disconnected');});assert.equal(result.results[0].ok,true);assert.equal(result.layoutError,'monitor disconnected');const failed=await startAndTile(['a'],async()=>[{id:'a',ok:false}],async()=>{throw new Error('must not run');});assert.equal(failed.layout,null);
});
