// Read-only, reproducible comparison. Does not contact a GPS sensor or edit data.
import fs from 'node:fs';
import {fitAffine,fitSpatial,wellSpread,toLocal,fromLocal,distanceFromSupport} from '../geo.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/georeference.json',import.meta.url)));
const round=n=>Number.isFinite(n)?+n.toFixed(6):null;
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
const summarize=rows=>{
 if(!rows.length)return null;
 const values=rows.map(r=>r.equivalentM).sort((a,b)=>a-b),mid=values.length/2;
 return {count:rows.length,rmsEquivalentM:round(rms(values)),medianEquivalentM:round(values.length%2?values[Math.floor(mid)]:(values[mid-1]+values[mid])/2),maxEquivalentM:round(Math.max(...values)),rmsPDFPoints:round(rms(rows.map(r=>r.pdfPoints)))};
};
const discrepancy=(model,reference,point)=>{
 const d=model.project(point).map((v,i)=>v-point.pdf[i]);
 return {equivalentM:Math.hypot(...reference.inverse.map(r=>r[0]*d[0]+r[1]*d[1])),pdfPoints:Math.hypot(...d)};
};
const floors={};
for(const id of ['B1','1F','2F','3F','4F','MAGIC']){
 const anchors=data.anchors.filter(a=>a.floor===id),reference=fitAffine(anchors);
 const automatic=!!reference&&wellSpread(anchors),heldOut=[],spatial=[];
 if(anchors.length>=4)for(const point of anchors){
  const others=anchors.filter(a=>a!==point),metric=fitAffine(others);
  const row={id:point.id,outsideRemainingSupportM:round(distanceFromSupport(point,others))};
  for(const kernel of ['legacy','smooth'])row[kernel]=discrepancy(fitAffine(others,point,{kernel}),metric,point);
  heldOut.push(row);
 }
 if(anchors.length>=4)for(const axis of [0,1]){
  const ordered=[...anchors].sort((a,b)=>toLocal(a)[axis]-toLocal(b)[axis]),folds=anchors.length<10?2:4;
  for(let fold=0;fold<folds;fold++){
   const held=ordered.slice(Math.floor(fold*anchors.length/folds),Math.floor((fold+1)*anchors.length/folds)),training=anchors.filter(a=>!held.includes(a)),metric=fitAffine(training);
   if(!metric)continue;
   for(const point of held){
    const row={axis,fold,id:point.id};
    for(const kernel of ['legacy','smooth'])row[kernel]=discrepancy(fitAffine(training,point,{kernel}),metric,point);
    spatial.push(row);
   }
  }
 }
 const local=anchors.map(toLocal);
 let grid=null;
 if(automatic){
  const lo=[0,1].map(k=>Math.min(...local.map(p=>p[k]))-50),hi=[0,1].map(k=>Math.max(...local.map(p=>p[k]))+50);
  grid={spacingM:5,supportMarginM:50,samples:0,rejected:0,reversed:0,maxCondition:0,maxDerivativeDifference:0};
  for(let e=lo[0];e<=hi[0];e+=5)for(let n=lo[1];n<=hi[1];n+=5){
   const g=fromLocal([e,n]);if(distanceFromSupport(g,anchors)>50)continue;
   grid.samples++;const m=fitSpatial(anchors,g);
   if(!m){grid.rejected++;continue;}
   if(m.determinant>=0)grid.reversed++;
   grid.maxCondition=Math.max(grid.maxCondition,m.condition);
   for(const axis of [0,1]){
    const a=[e,n],b=[e,n];a[axis]+=.02;b[axis]-=.02;
    const p=m.project(fromLocal(a)),q=m.project(fromLocal(b));
    for(let k=0;k<2;k++)grid.maxDerivativeDifference=Math.max(grid.maxDerivativeDifference,Math.abs((p[k]-q[k])/.04-m.jacobian[k][axis]));
   }
  }
  grid.maxCondition=round(grid.maxCondition);grid.maxDerivativeDifference=round(grid.maxDerivativeDifference);
 }
 floors[id]={anchors:anchors.length,automaticProjection:automatic,reason:automatic?'supported':anchors.length<3?'insufficient-controls':'nearly-collinear-controls',leaveOneOut:Object.fromEntries(['legacy','smooth'].map(k=>[k,summarize(heldOut.map(r=>r[k]))])),spatialBlockHoldout:Object.fromEntries(['legacy','smooth'].map(k=>[k,summarize(spatial.map(r=>r[k]))])),grid,heldOut};
}
console.log(JSON.stringify({
 schemaVersion:2,
 sourceVerifiedAt:data.source.verifiedAt,
 method:'Compare old inverse-distance weights and smooth 40m inverse-quartic weights using the same training-only global affine inverse for both residuals. Leave one control out; additionally hold out contiguous east/north groups.',
 limitation:'Model/source disagreement, not measured GPS accuracy. Kernel selection uses these controls, so this is internal validation rather than a new independent field test. A three-control exact fit has no independent validation. Coordinates are not relocated to fit the model.',
 floors
},null,2));
