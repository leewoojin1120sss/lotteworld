import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {corridorRoute} from '../lib.js';
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
