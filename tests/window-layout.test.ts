import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {tileRects} from '../src/shared/window-layout';
import {WindowLayouts} from '../src/main/window-layout';
import type {Store} from '../src/main/store';
import type {Browsers} from '../src/main/browsers';
test('tiling partitions 1–4 equally left/right and larger grids fill area without overlap, including negative monitor coordinates',()=>{
 const area={x:-1920,y:-200,width:1919,height:1081};for(let n=1;n<=50;n++){const rects=tileRects(area,n);assert.equal(rects.length,n);assert.equal(rects.reduce((sum,r)=>sum+r.width*r.height,0),area.width*area.height);for(const r of rects){assert.ok(r.width>0&&r.height>0);assert.ok(r.x>=area.x&&r.y>=area.y&&r.x+r.width<=area.x+area.width&&r.y+r.height<=area.y+area.height);}for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=rects[i],b=rects[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);}if(n<=4)assert.ok(rects.every(r=>r.height===area.height&&Math.abs(r.width-area.width/n)<1));}
 assert.ok(tileRects(area,3,'rows').every(r=>r.width===area.width));assert.equal(tileRects(area,6,'grid',3,10).length,6);assert.throws(()=>tileRects(area,0));assert.throws(()=>tileRects({...area,width:2},5,'columns',0,10));
});
test('only selected running profile windows are placed; missing/closed profiles skipped, disconnected monitor rejected, lock cleared',async()=>{
 const a=randomUUID(),b=randomUUID(),c=randomUUID();const profiles=[{id:a,kernelId:'test',values:{engine:'chromium',deviceType:'desktop',viewportMode:'fixed'}},{id:b,kernelId:'test',values:{engine:'firefox'}},{id:c,kernelId:'test',values:{engine:'chromium'}}];const store={root:'C:/test',profiles:()=>profiles,get:(kind:string,id:string)=>kind==='kernel'?{path:'C:/kernel.exe'}:profiles.find(p=>p.id===id)} as unknown as Store;const browsers={running:()=>({[a]:'running',[b]:'running',[c]:'stopping'}),fitViewport:async()=>({fitted:true})} as unknown as Browsers;const requests:any[]=[];const native=async(_script:string,r:any)=>{requests.push(r);return r.action==='inventory'?{monitors:[{id:'1',workArea:{x:0,y:0,width:1920,height:1040}}],windows:[{profileId:a,handle:'77',processId:7,bounds:{}}],missing:[b]}:{results:[{profileId:a,ok:true,bounds:r.placements[0].bounds}]};};const service=new WindowLayouts(store,browsers,'test.ps1',native);
 const raw={ids:[a,b,c],monitorId:'1',mode:'auto',columns:0,gap:0};const r=await service.apply(raw);assert.deepEqual(r.skipped,[b,c]);assert.deepEqual(r.fixedViewport,[]);assert.equal(requests[0].targets.length,2);const apply=requests.find(r=>r.action==='apply');assert.equal(apply.placements.length,1);assert.equal(apply.placements[0].bounds.width,1920);await assert.rejects(()=>service.apply({...raw,monitorId:'2'}),/断开/);await service.apply(raw);
});
