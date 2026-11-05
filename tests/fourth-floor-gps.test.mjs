import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fitAffine,fitSimilarity,similarityValidation,toLocal,fromLocal,distanceFromSupport,modelForFloor,projectFix,addCalibration,calibrationPlaces} from '../geo.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/georeference.json',import.meta.url)));
const park=JSON.parse(fs.readFileSync(new URL('../data/park.json',import.meta.url)));
const floor=park.floors.find(f=>f.id==='4F'),anchors=data.anchors.filter(a=>a.floor==='4F');
const at=Date.now(),fix=(a,t=at)=>({...a,accuracy:10,at:t});

test('collinear references recover a similarity and bounded north/south movement',()=>{
 const points=[0,100,200].map(e=>({...fromLocal([e,0]),pdf:[500-3*e,400+.4*e]}));
 assert.equal(fitAffine(points),null);
 const model=fitSimilarity(points),g=fromLocal([50,20]),p=model.project(g);
 assert.ok(Math.hypot(p[0]-(500-150+8),p[1]-(400+20+60))<1e-7);
 assert.ok(Math.abs(model.condition-1)<1e-6);assert.ok(model.determinant<0);
 assert.ok(Math.abs(distanceFromSupport(g,points)-20)<1e-6);
 assert.equal(fitSimilarity([points[0],points[0]]),null);
 assert.equal(fitSimilarity([{...points[0],lat:NaN},points[1]]),null);
});

test('4F retains all original geographic references and validates the constrained model',()=>{
 assert.equal(anchors.length,3);assert.equal(data.anchors.length,28);
 const audit=JSON.parse(fs.readFileSync(new URL('../data/georeference-live-audit.json',import.meta.url)));
 for(const a of anchors){const old=audit.rows.find(r=>r.id===a.id).current;assert.equal(a.lat,old.lat);assert.equal(a.lng,old.lng);}
 const validation=similarityValidation(anchors);
 assert.equal(validation.heldOut.length,3);assert.ok(validation.maxM>60&&validation.maxM<80);
 for(const a of anchors){const p=projectFix(fix(a),'4F',data,floor);assert.ok(p.pdf);assert.equal(p.modelType,'similarity');assert.ok(p.accuracyM>=80);}
 const missing={...data,anchors:data.anchors.filter(a=>a.id!=='ride-30')};
 assert.equal(projectFix(fix(anchors[0]),'4F',missing,floor).reason,'calibration');
});

test('nine physical confirmation places do not create invented latitude/longitude anchors',()=>{
 const places=calibrationPlaces('4F',data,park.pois);
 assert.equal(places.length,9);assert.equal(new Set(places.map(p=>p.id)).size,9);
 assert.ok(places.some(p=>p.name==='파라오스낵'));assert.ok(places.some(p=>p.name==='전망대게임장'));
 for(const p of places){assert.equal(p.floor,'4F');assert.ok(p.pdf);assert.equal(p.lat,undefined);assert.equal(p.lng,undefined);}
 assert.equal(calibrationPlaces('1F',data,park.pois).length,0);
 // Confirming any one place cancels a constant GPS-to-guide displacement.
 for(const p of places){
  const g=fix(anchors[0]),samples=addCalibration([],{floor:'4F',pdf:p.pdf,at},g);
  const result=projectFix(g,'4F',data,floor,samples);
  assert.ok(Math.hypot(...result.pdf.map((v,i)=>v-p.pdf[i]))<1e-6);
  assert.equal(result.method,'calibrated');assert.ok(result.accuracyM>=80);
 }
});

test('two separated 4F confirmations learn direction and scale without claiming zero uncertainty',()=>{
 const ends=[anchors.find(a=>a.id==='ride-32'),anchors.find(a=>a.id==='ride-30')];
 const samples=ends.map(a=>({...a,accuracy:10,at}));
 const g={...fromLocal(toLocal(ends[0]).map((v,i)=>(v+toLocal(ends[1])[i])/2)),accuracy:10,at};
 const info=modelForFloor('4F',data,g,samples);
 assert.equal(info.method,'calibrated');assert.equal(info.modelType,'similarity');assert.equal(info.validationErrorM,null);assert.ok(info.error>=45);
 const p=projectFix(g,'4F',data,floor,samples);assert.ok(p.pdf);assert.ok(p.accuracyM>=45);
 const expected=ends[0].pdf.map((v,i)=>(v+ends[1].pdf[i])/2);
 assert.ok(Math.hypot(...p.pdf.map((v,i)=>v-expected[i]))<1e-5);
 assert.equal(modelForFloor('4F',data,g,samples.map(s=>({...s,floor:'1F'}))).method,'landmarks');
 assert.equal(modelForFloor('4F',data,g,samples.map(s=>({...s,at:at-31*60000}))).method,'landmarks');
 const bad=[samples[0],{...samples[1],pdf:[samples[0].pdf[0],samples[0].pdf[1]+450]}];
 assert.equal(modelForFloor('4F',data,g,bad).method,'landmarks');
});

test('4F pins update with movement while preserving rejection of stale, coarse and distant fixes',()=>{
 const g=fix(anchors[0]),local=toLocal(g),p=projectFix(g,'4F',data,floor);
 const moving={...fromLocal([local[0]+4,local[1]]),accuracy:10,at:at+1000};
 const q=projectFix(moving,'4F',data,floor);
 assert.ok(q.pdf);assert.ok(Math.abs(q.pdf[0]-p.pdf[0]-p.jacobian[0][0]*4)<1e-6);
 assert.ok(Math.abs(q.pdf[1]-p.pdf[1]-p.jacobian[1][0]*4)<1e-6);
 assert.equal(projectFix({...g,accuracy:151},'4F',data,floor).reason,'accuracy');
 assert.equal(projectFix({...g,at:at-61000},'4F',data,floor).reason,'stale');
 assert.equal(projectFix({...g,lat:37.52},'4F',data,floor).reason,'outside');
});

test('4F similarity has no flips or amplification spikes across its entire support margin',()=>{
 const local=anchors.map(toLocal),lo=[0,1].map(i=>Math.min(...local.map(p=>p[i]))-80),hi=[0,1].map(i=>Math.max(...local.map(p=>p[i]))+80);
 let count=0;
 for(let e=lo[0];e<=hi[0];e+=5)for(let n=lo[1];n<=hi[1];n+=5){
  const g={...fromLocal([e,n]),at};if(distanceFromSupport(g,anchors)>80)continue;
  const info=modelForFloor('4F',data,g);assert.ok(info);assert.equal(info.modelType,'similarity');
  assert.ok(info.model.determinant<0);assert.ok(Math.abs(info.model.condition-1)<1e-6);assert.ok(info.model.project(g).every(Number.isFinite));count++;
 }
 assert.ok(count>1000);
});
