import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {toLocal,fromLocal,geoDistance,fitAffine,distanceFromSupport,FixFilter,projectFix,modelForFloor,addCalibration,StepBridge} from '../geo.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/georeference.json',import.meta.url)));
const park=JSON.parse(fs.readFileSync(new URL('../data/park.json',import.meta.url)));
const floor=id=>park.floors.find(f=>f.id===id);
const at=Date.now();
const fix=(e,n,accuracy=10,time=at)=>({...fromLocal([e,n]),accuracy,at:time});
const anchors=[[0,0],[100,0],[0,100],[100,100]].map(g=>({...fromLocal(g),pdf:[400+g[0]*2+g[1]*.3,500-g[0]*.1-g[1]*1.5],floor:'1F'}));
const mockData={anchors,floors:{'1F':{modelAllowanceM:50}}};
const schematic={crop:[300,300,900,900],width:600,height:600};
test('geographic projection uses metres and an invertible affine transform',()=>{
 const g=fix(23,57),round=toLocal(g);assert.ok(Math.abs(round[0]-23)<1e-6);assert.ok(Math.abs(round[1]-57)<1e-6);
 const model=fitAffine(anchors,g),p=model.project(g);assert.ok(Math.abs(p[0]-(400+46+17.1))<1e-5);assert.ok(Math.abs(p[1]-(500-2.3-85.5))<1e-5);
 assert.ok(Math.abs(geoDistance(fix(0,0),fix(30,40))-50)<1e-5);
});
test('approximation includes model allowance and does not shrink GPS uncertainty',()=>{
 const p=projectFix(fix(30,30,20),'1F',mockData,schematic);assert.equal(p.source,'estimated');assert.ok(p.accuracyM>=50);assert.ok(p.accuracyM>=20);assert.ok(p.ellipse.east.every(Number.isFinite));
});
test('outside, stale and excessively coarse GPS do not become map pins',()=>{
 assert.equal(projectFix(fix(1000,1000),'1F',mockData,schematic).reason,'outside');
 assert.equal(projectFix(fix(20,20,500),'1F',mockData,schematic).reason,'accuracy');
 assert.equal(projectFix(fix(20,20,5,at-120000),'1F',mockData,schematic).reason,'stale');
 assert.equal(distanceFromSupport(fix(50,50),anchors),0);
});
test('a missing floor calibration is explicit instead of copying another floor',()=>{
 for(const id of ['B1','2F','3F'])assert.equal(projectFix({...data.anchors[0],accuracy:10,at},id,data,floor(id)).reason,'calibration');
 const collinear=[0,1,2].map(e=>({...fix(e,0),pdf:[e,0]}));assert.equal(fitAffine(collinear),null);
});
test('three noncollinear manual references can calibrate an unsupported floor',()=>{
 const samples=anchors.slice(0,3).map(a=>({...a,floor:'B1',accuracy:10,at}));
 const learned=modelForFloor('B1',{anchors:[],floors:{}},fix(20,20),samples);assert.equal(learned.method,'calibrated');
 assert.equal(modelForFloor('B1',{anchors:[],floors:{}},fix(20,20),samples.slice(0,2)),null);
});
test('a manual reference corrects constant bias and respects floor and time',()=>{
 const g=fix(30,30),pdf=[500,450],samples=addCalibration([],{floor:'1F',pdf,at},g);
 const p=projectFix(g,'1F',mockData,schematic,samples);assert.ok(Math.hypot(p.pdf[0]-500,p.pdf[1]-450)<1e-5);assert.equal(p.method,'calibrated');
 assert.equal(addCalibration([],{floor:'1F',pdf,at},fix(30,30,200)).length,0);
 assert.equal(addCalibration([],{floor:'1F',pdf,at},fix(30,30,10,at-50000)).length,0);
});
test('a trusted manual reference can correct a biased GPS outside the initial hull',()=>{
 const g=fix(200,200),samples=addCalibration([],{floor:'1F',pdf:[500,450],at},g);
 assert.equal(projectFix(g,'1F',mockData,schematic,samples).method,'calibrated');
});
test('filter rejects stale, duplicate and impossible samples without a false accuracy boost',()=>{
 const f=new FixFilter();assert.ok(f.push(fix(0,0,15),at));assert.equal(f.push(fix(0,0,15),at),null);
 assert.equal(f.push(fix(0,0,15,at-40000),at),null);assert.equal(f.push(fix(0,0,15,at+20000),at),null);
 const p=f.push(fix(1,0,15,at+1000),at+1000);assert.ok(p.accuracy>=15);assert.equal(p.samples,2);
});
test('one multipath jump is rejected; a stable new cluster can reacquire',()=>{
 const f=new FixFilter();f.push(fix(0,0,5),at);
 assert.equal(f.push(fix(200,0,5,at+1000),at+1000),null);
 const reacquired=f.push(fix(201,0,5,at+2000),at+2000);assert.ok(reacquired);assert.ok(toLocal(reacquired)[0]>190);
});
test('OSM anchors belong to real guide POIs; conflicting duplicates are excluded',()=>{
 assert.equal(data.anchors.length,28);
 for(const a of data.anchors){const p=park.pois.find(p=>p.id===a.id);assert.equal(a.floor,p.floor);assert.deepEqual(a.pdf,p.pdf);assert.ok(a.sourceUrl.startsWith('https://www.openstreetmap.org/node/'));}
 for(const id of ['ride-37','ride-39'])assert.ok(!data.anchors.some(a=>a.id===id));
 for(const id of ['1F','MAGIC','4F']){const a=data.anchors.find(a=>a.floor===id);assert.ok(fitAffine(data.anchors.filter(a=>a.floor===id)));const p=projectFix({...a,accuracy:15,at},id,data,floor(id));assert.ok(p.x!==undefined,`${id}: ${p.reason}`);}
});
test('step bridge ignores stillness and is limited by time and step count',()=>{
 const b=new StepBridge();b.seed(1000);for(let t=1100;t<3000;t+=100)assert.equal(b.feed({x:0,y:0,z:9.81},90,t),null);
 const step=b.feed({x:0,y:0,z:13},90,3000);assert.equal(step.steps,1);assert.ok(Math.abs(step.offset[0]-.65)<1e-6);assert.ok(step.drift>0);
 assert.equal(b.feed({x:0,y:0,z:13},90,3100),null);
 assert.equal(b.feed({x:0,y:0,z:13},90,32000),null);
});
