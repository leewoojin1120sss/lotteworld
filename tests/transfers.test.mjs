import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
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
 assert.equal(ids.size,69);
 for(const e of doc.rejectedConnections){assert.ok(!pairs.has([e.from,e.to].sort().join('|')));assert.ok(e.reviewReason);}
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
   for(const step of option.steps){if(step.type==='walk')assert.equal(step.route.floor,floor);else{assert.equal(step.from.floor,floor);if(option.kind!=='mixed')assert.equal(step.from.kind,option.kind);floor=step.to.floor;assert.ok(doc.connections.includes(step.edge));}}
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

const fixture=()=>{
 const point=(id,floor,x,kind='stairs')=>({id,floor,pdf:[x,0],x,y:0,category:'facility',kind});
 const floors=['B1','1F','2F'];return {point,paths:Object.fromEntries(floors.map(f=>[f,[{points:[[0,0],[100,0]]}]])),metadata:floors.map(id=>({id,width:100}))};
};
test('stairs and elevator can form one path when neither mode alone reaches the destination',()=>{
 const {point,paths,metadata}=fixture();const pois=[point('a','B1',10),point('b','1F',10),point('c','1F',30,'elevator'),point('d','2F',30,'elevator')];
 const data={connections:[{from:'a',to:'b',basis:'guide-correspondence',direction:'both'},{from:'c',to:'d',basis:'guide-correspondence',direction:'both'}]};
 const routes=connectedTransferRoutes({floor:'B1',pdf:[0,0]},{floor:'2F',pdf:[40,0]},pois,paths,data,metadata);
 assert.equal(routes.length,1);assert.equal(routes[0].kind,'mixed');assert.deepEqual(routes[0].steps.filter(s=>s.type==='transfer').map(s=>s.from.kind),['stairs','elevator']);
});
test('unknown escalator directions require opt-in and verified one-way links are never reversed',()=>{
 const {point,paths,metadata}=fixture();const pois=[point('a','1F',10,'escalator'),point('b','2F',10,'escalator')];
 const from={floor:'1F',pdf:[0,0]},to={floor:'2F',pdf:[20,0]},edge={from:'a',to:'b',basis:'guide-correspondence',direction:'unknown'},data={connections:[edge]};
 assert.deepEqual(connectedTransferRoutes(from,to,pois,paths,data,metadata),[]);
 assert.ok(connectedTransferRoutes(from,to,pois,paths,data,metadata,{allowUnknownDirections:true})[0].requiresDirectionCheck);
 edge.direction='from-to';assert.equal(connectedTransferRoutes(from,to,pois,paths,data,metadata)[0].requiresDirectionCheck,false);
 assert.deepEqual(connectedTransferRoutes(to,from,pois,paths,data,metadata),[]);
});
test('malformed, invalid and non-facility endpoints cannot produce previews or routes',()=>{
 const {point,paths,metadata}=fixture();const a=point('a','1F',10),b=point('b','2F',10),data={connections:[{from:'a',to:'b',basis:'guide-correspondence'}]};
 for(const bad of [{...b,pdf:[NaN,0]},{...b,x:1001},{...b,category:'attraction'},{...b,kind:'restroom'}]){
  assert.deepEqual(transferLinks('a',[a,bad],data),[]);
  assert.deepEqual(connectedTransferRoutes({floor:'1F',pdf:[0,0]},{floor:'2F',pdf:[20,0]},[a,bad],paths,data,metadata),[]);
 }
 assert.deepEqual(connectedTransferRoutes({floor:'1F',pdf:[NaN,0]},{floor:'2F',pdf:[20,0]},[a,b],paths,data,metadata),[]);
 assert.deepEqual(transferLinks('a',[a,b],{connections:[null,{},false]}),[]);
});
test('arrival confirmation changes the manual floor and position without learning GPS calibration',()=>{
 const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');const code=source.match(/function setTransferArrival\(p\)\{[\s\S]*?\n\}/)[0];
 const target=byId.get('facility-2F-elevator-3'),gps={lat:37.51,lng:127.1,accuracy:60},state={gps,tracking:true,motionBase:{floor:'1F'}};
 const calibrations=[{floor:'1F',x:20,y:30}],before=JSON.stringify(calibrations);
 const context={state,p:target,calibrations,isFloorPoint:()=>true,floorData:()=>({}),addCalibration:()=>{throw Error('A schematic endpoint must not train GPS');},endPick(){},closeDetail(){},updateLocationUI(){},renderLocationPins(){}};
 assert.equal(vm.runInNewContext(code+';setTransferArrival(p)',context),true);
 assert.equal(state.position.floor,'2F');assert.equal(state.position.x,target.x);assert.equal(state.position.origin,'route-arrival');assert.equal(state.locationFloor,'2F');
 assert.equal(state.gps,gps);assert.equal(state.tracking,true);assert.equal(state.motionBase,null);assert.equal(JSON.stringify(calibrations),before);
});
