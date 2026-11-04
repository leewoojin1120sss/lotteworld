import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {transferLinks,connectedTransferRoutes,isMapPoint} from '../lib.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url)));
const park=read('data/park.json'),walk=read('data/walkways.json'),doc=read('data/transfers.json');
const byId=new Map(park.pois.map(p=>[p.id,p]));
test('all 69 transfer symbols have explicit paired or unresolved audit records',()=>{
 const ids=new Set(),pairs=new Set();
 for(const e of doc.connections){
  const a=byId.get(e.from),b=byId.get(e.to);assert.ok(a&&b);assert.ok(isMapPoint(a)&&isMapPoint(b));
  assert.equal(a.kind,b.kind);assert.notEqual(a.floor,b.floor);assert.equal(e.basis,'guide-correspondence');assert.ok(e.evidence.length>20);
  const key=[e.from,e.to].sort().join('|');assert.ok(!pairs.has(key));pairs.add(key);ids.add(e.from);ids.add(e.to);
  assert.ok(transferLinks(e.to,park.pois,doc).some(l=>l.to.id===e.from));
 }
 for(const u of doc.unresolved){assert.ok(!ids.has(u.id));assert.ok(u.reason);ids.add(u.id);}
 assert.equal(ids.size,69);assert.equal(doc.connections.length,33);
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../assets/guide-2026.pdf',import.meta.url))).digest('hex'),doc.source.sha256);
});
test('unknown and dedicated/off-map facilities never acquire invented floor links',()=>{
 for(const id of ['facility-1F-elevator-5','facility-1F-elevator-6','facility-MAGIC-escalator-1','facility-MAGIC-elevator-1'])assert.deepEqual(transferLinks(id,park.pois,doc),[]);
 const links=transferLinks('facility-3F-elevator-3',park.pois,doc);assert.deepEqual(new Set(links.map(x=>x.to.floor)),new Set(['2F','4F']));
});
test('cross-floor plan follows explicit consecutive endpoints, with walks on physical floors',()=>{
 for(const [a,b] of [['ride-13','ride-31'],['ride-31','ride-6'],['ride-1','ride-26']]){
  const from=byId.get(a),to=byId.get(b),options=connectedTransferRoutes(from,to,park.pois,walk.floors,doc,park.floors);
  assert.ok(options.length>0,`${a} to ${b}`);
  for(const option of options){let floor=from.floor;
   for(const step of option.steps){if(step.type==='walk')assert.equal(step.route.floor,floor);else{assert.equal(step.from.floor,floor);assert.equal(step.from.kind,option.kind);floor=step.to.floor;assert.ok(doc.connections.includes(step.edge));}}
   assert.equal(floor,to.floor);assert.equal(option.route.floor,from.floor);assert.ok(option.arrival.floor!==from.floor);
  }
 }
});
test('a nearby dead-end transfer is not recommended for an unrelated destination',()=>{
 const f=(id,floor,x)=>({id,floor,pdf:[x,0],x,y:0,category:'facility',kind:'stairs'});
 const pois=[f('near','1F',1),f('near-end','2F',1),f('far','1F',80),f('far-end','3F',80)];
 const data={connections:[{from:'near',to:'near-end',basis:'guide-correspondence'},{from:'far',to:'far-end',basis:'guide-correspondence'}]};
 const paths=Object.fromEntries(['1F','2F','3F'].map(floor=>[floor,[{points:[[0,0],[100,0]]}]]));
 const opts=connectedTransferRoutes({floor:'1F',pdf:[0,0]},{floor:'3F',pdf:[90,0]},pois,paths,data,[{id:'1F',width:100},{id:'2F',width:100},{id:'3F',width:100}]);
 assert.equal(opts[0].poi.id,'far');assert.equal(opts[0].arrival.id,'far-end');
});
test('unmapped external area and missing destination coordinates do not become teleport routes',()=>{
 const a=byId.get('ride-13'),b=byId.get('ride-33');
 assert.deepEqual(connectedTransferRoutes(a,b,park.pois,walk.floors,doc,park.floors),[]);
 assert.deepEqual(connectedTransferRoutes(a,{floor:'2F'},park.pois,walk.floors,doc,park.floors),[]);
});
