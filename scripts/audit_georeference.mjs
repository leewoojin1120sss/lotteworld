// Reproduce model disagreement after guide-symbol centering. No network or GPS.
import fs from 'node:fs';
import {fitAffine,distanceFromSupport} from '../geo.js';
const data=JSON.parse(fs.readFileSync(new URL('../data/georeference.json',import.meta.url)));
const median=a=>{a=[...a].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const floors={};
for(const id of [...new Set(data.anchors.map(a=>a.floor))]){
 const anchors=data.anchors.filter(a=>a.floor===id),heldOut=[];
 if(anchors.length>=4)for(const a of anchors){
  const others=anchors.filter(b=>b.id!==a.id),model=fitAffine(others,a);if(!model)continue;
  const d=model.project(a).map((v,i)=>v-a.pdf[i]),error=Math.hypot(...model.inverse.map(row=>row[0]*d[0]+row[1]*d[1]));
  heldOut.push({id:a.id,inverseEquivalentM:+error.toFixed(3),outsideRemainingSupportM:+distanceFromSupport(a,others).toFixed(3)});
 }
 floors[id]={anchors:anchors.length,independentHoldouts:heldOut.length,medianInverseEquivalentM:heldOut.length?+median(heldOut.map(a=>a.inverseEquivalentM)).toFixed(3):null,maxInverseEquivalentM:heldOut.length?Math.max(...heldOut.map(a=>a.inverseEquivalentM)):null,heldOut};
}
console.log(JSON.stringify({method:'Leave one anchor out; fit runtime distance-weighted geo→PDF affine at held-out coordinate, convert PDF residual with that fit’s inverse Jacobian.',meaning:'Model/source disagreement in equivalent metres; not measured indoor GPS accuracy or entrance accuracy. No independent holdout is available with only three anchors.',floors},null,2));
