import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {corridorRoute,nearbyFacilities,transferRecommendations} from '../lib.js';
const park=JSON.parse(fs.readFileSync(new URL('../data/park.json',import.meta.url)));
const walk=JSON.parse(fs.readFileSync(new URL('../data/walkways.json',import.meta.url)));
const find=id=>park.pois.find(p=>p.id===id);
test('route follows a shared edge directly rather than detouring to its endpoints',()=>{
  const a={floor:'1F',pdf:[25,10]},b={floor:'1F',pdf:[75,10]};
  const r=corridorRoute('1F',a,b,[{points:[[0,0],[100,0]]}]);
  assert.deepEqual(r.points,[[25,0],[75,0]]);assert.equal(r.illustrationLength,50);
});
test('disconnected, distant and cross-floor routes are refused',()=>{
  const a={floor:'1F',pdf:[0,0]},b={floor:'1F',pdf:[1000,1000]};
  assert.throws(()=>corridorRoute('1F',a,{...b,floor:'2F'},[{points:[[0,0],[10,0]]}]),/DIFFERENT_FLOORS/);
  assert.throws(()=>corridorRoute('1F',a,b,[{points:[[0,0],[10,0]]}]),/TOO_FAR/);
  assert.throws(()=>corridorRoute('1F',a,b,[{points:[[0,0],[10,0]]},{points:[[1000,1000],[1001,1000]]}]),/NO_PATH/);
});
test('representative attraction routes work on all six guide floors',()=>{
  for(const [a,b]of [[1,3],[6,13],[26,27],[28,29],[30,32],[33,38]]){
    const from=find(`ride-${a}`),to=find(`ride-${b}`);const r=corridorRoute(from.floor,from,to,walk.floors[from.floor]);
    assert.ok(r.points.length>=1);assert.equal(r.floor,from.floor);assert.ok(Number.isFinite(r.illustrationLength));
  }
});

test('nearest facilities use walking distance rather than a shortcut across a gap',()=>{
  const floor='1F',from={floor,pdf:[0,0]};
  const floors={[floor]:[{points:[[0,0],[100,0],[100,100],[0,100],[0,10]]}]};
  const closeAcrossGap={id:'across',category:'facility',kind:'restroom',floor,pdf:[0,10]};
  const closeAlongPath={id:'along',category:'facility',kind:'restroom',floor,pdf:[40,0]};
  const found=nearbyFacilities(from,[closeAcrossGap,closeAlongPath],floors,{kinds:['restroom']});
  assert.equal(found[0].poi.id,'along');assert.equal(found[0].cost,40);
});

test('recommendations stay on the current floor and give one best option per transfer type',()=>{
  const floor='1F',from={floor,pdf:[0,0]},floors={[floor]:[{points:[[0,0],[100,0]]}]};
  const fac=(id,kind,x,f=floor)=>({id,kind,category:'facility',floor:f,pdf:[x,0]});
  const results=transferRecommendations(from,[fac('stairs-near','stairs',10),fac('stairs-far','stairs',50),fac('lift','elevator',20),fac('esc','escalator',30),fac('other-floor','elevator',0,'2F'),fac('toilet','restroom',2)],floors);
  assert.deepEqual(results.map(r=>r.poi.id),['stairs-near','lift','esc']);
  assert.equal(nearbyFacilities(from,[fac('not-here','restroom',0,'2F')],floors,{kinds:['restroom']}).length,0);
});

test('real map offers an approach route to a transfer on each floor',()=>{
  for(const floor of park.floors){
    const path=walk.floors[floor.id][0];const from={floor:floor.id,pdf:path.points[0]};
    const options=transferRecommendations(from,park.pois,walk.floors);
    assert.ok(options.length>0,`${floor.id} needs an approach`);
    assert.ok(options.every(o=>o.route.floor===floor.id&&o.poi.floor===floor.id));
  }
});
