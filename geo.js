// Geographic inference in metres, separate from the schematic's PDF coordinates.
// All estimates are approximate. No user positions or calibration samples persist.
import {pdfToMap,isFloorPoint} from './lib.js';
const LAT0=37.5105,LNG0=127.0985,R=6371008.8,D=Math.PI/180;
export const toLocal=g=>[(g.lng-LNG0)*D*R*Math.cos(LAT0*D),(g.lat-LAT0)*D*R];
export const fromLocal=([e,n])=>({lat:LAT0+n/(D*R),lng:LNG0+e/(D*R*Math.cos(LAT0*D))});
export const geoDistance=(a,b)=>Math.hypot(...toLocal(a).map((v,i)=>v-toLocal(b)[i]));
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
function solve(matrix,values){
  const a=matrix.map((r,i)=>[...r,values[i]]);
  for(let col=0;col<3;col++){
    let pivot=col;for(let j=col+1;j<3;j++)if(Math.abs(a[j][col])>Math.abs(a[pivot][col]))pivot=j;
    if(Math.abs(a[pivot][col])<1e-8)return null;
    [a[col],a[pivot]]=[a[pivot],a[col]];const divisor=a[col][col];for(let k=col;k<4;k++)a[col][k]/=divisor;
    for(let j=0;j<3;j++)if(j!==col){const v=a[j][col];for(let k=col;k<4;k++)a[j][k]-=v*a[col][k];}
  }
  return a.map(r=>r[3]);
}
const finitePair=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const validGeo=g=>!!g&&Number.isFinite(g.lat)&&Math.abs(g.lat)<=90&&Number.isFinite(g.lng)&&Math.abs(g.lng)<=180;
const validAnchor=a=>validGeo(a)&&finitePair(a.pdf);
export function fitAffine(anchors,near=null,{kernel='smooth',bandwidthM=40}={}){
  if(anchors.length<3||!anchors.every(validAnchor)||near&&!validGeo(near)||!Number.isFinite(bandwidthM)||bandwidthM<=0)return null;
  const rows=anchors.map(a=>({g:toLocal(a),p:a.pdf}));
  const center=near?toLocal(near):rows.reduce((v,r)=>v.map((x,i)=>x+r.g[i]/rows.length),[0,0]);
  const matrix=Array.from({length:3},()=>[0,0,0]),values=[[0,0,0],[0,0,0]];
  for(const row of rows){const dx=row.g[0]-center[0],dy=row.g[1]-center[1],v=[1,dx,dy],w=!near?1:kernel==='legacy'?1/(40+Math.hypot(dx,dy))**2:1/(1+(dx*dx+dy*dy)/(bandwidthM*bandwidthM))**2;
    for(let i=0;i<3;i++){for(let j=0;j<3;j++)matrix[i][j]+=w*v[i]*v[j];for(let k=0;k<2;k++)values[k][i]+=w*v[i]*row.p[k];}
  }
  const x=solve(matrix,values[0]),y=solve(matrix,values[1]);if(!x||!y)return null;
  const jacobian=[[x[1],x[2]],[y[1],y[2]]],det=x[1]*y[2]-x[2]*y[1];if(Math.abs(det)<.01)return null;
  const inverse=[[y[2]/det,-x[2]/det],[-y[1]/det,x[1]/det]];
  const projectLocal=g=>[x[0]+x[1]*(g[0]-center[0])+x[2]*(g[1]-center[1]),y[0]+y[1]*(g[0]-center[0])+y[2]*(g[1]-center[1])];
  const residual=Math.sqrt(rows.reduce((n,r)=>{const p=projectLocal(r.g),d=p.map((v,i)=>v-r.p[i]);return n+(inverse[0][0]*d[0]+inverse[0][1]*d[1])**2+(inverse[1][0]*d[0]+inverse[1][1]*d[1])**2;},0)/rows.length);
  return {jacobian,inverse,residual,determinant:det,project:g=>projectLocal(toLocal(g)),projectLocal};
}

function matrixInfo(j){
  if(!j.flat().every(Number.isFinite))return null;
  const [[a,b],[c,d]]=j,det=a*d-b*c;
  if(Math.abs(det)<.01)return null;
  const trace=a*a+b*b+c*c+d*d;
  const condition=(trace+Math.sqrt(Math.max(0,trace*trace-4*det*det)))/(2*Math.abs(det));
  return {jacobian:j,inverse:[[d/det,-b/det],[-c/det,a/det]],determinant:det,condition};
}
// A similarity has only translation, rotation and a single scale. Unlike a
// six-parameter affine, it does not invent shear from nearly collinear controls.
// Geographic north is up; the guide's y axis is down (negative determinant).
export function fitSimilarity(anchors,{minSpanM=20}={}){
  if(anchors.length<2||!anchors.every(validAnchor)||!Number.isFinite(minSpanM)||minSpanM<=0)return null;
  const rows=anchors.map(a=>({g:toLocal(a),p:a.pdf}));
  const spanM=Math.max(...rows.flatMap((a,i)=>rows.slice(i+1).map(b=>length(a.g,b.g))));
  if(spanM<minSpanM)return null;
  const center=rows.reduce((v,r)=>v.map((n,i)=>n+r.g[i]/rows.length),[0,0]);
  const target=rows.reduce((v,r)=>v.map((n,i)=>n+r.p[i]/rows.length),[0,0]);
  let aa=0,bb=0,denominator=0;
  for(const r of rows){
    const e=r.g[0]-center[0],n=r.g[1]-center[1],x=r.p[0]-target[0],y=r.p[1]-target[1];
    aa+=e*x-n*y;bb+=n*x+e*y;denominator+=e*e+n*n;
  }
  if(denominator<1e-8)return null;
  const a=aa/denominator,b=bb/denominator,info=matrixInfo([[a,b],[b,-a]]);
  if(!info)return null;
  const projectLocal=g=>[target[0]+a*(g[0]-center[0])+b*(g[1]-center[1]),target[1]+b*(g[0]-center[0])-a*(g[1]-center[1])];
  const scale=Math.hypot(a,b),residual=Math.sqrt(rows.reduce((sum,r)=>sum+length(projectLocal(r.g),r.p)**2,0)/rows.length)/scale;
  return {...info,scale,spanM,residual,projectLocal,project:g=>projectLocal(toLocal(g))};
}
export function similarityValidation(anchors,reference=fitSimilarity(anchors)){
  if(!reference||anchors.length<3)return null;
  const heldOut=anchors.map((point,i)=>{
    const model=fitSimilarity(anchors.filter((_,j)=>j!==i));
    const pdfPoints=model?length(model.project(point),point.pdf):Infinity;
    // Use one fixed conversion scale for every held-out residual.
    return {id:point.id??String(i),pdfPoints,equivalentM:pdfPoints/reference.scale};
  });
  return {heldOut,rmsM:Math.sqrt(heldOut.reduce((sum,r)=>sum+r.equivalentM**2,0)/heldOut.length),maxM:Math.max(...heldOut.map(r=>r.equivalentM))};
}
// A moving least-squares fit changes its weights as the visitor moves. Its
// fitted affine slopes alone are NOT the derivative of that changing map.
export function fitSpatial(anchors,g,options={}){
  const fit=fitAffine(anchors,g,options);if(!fit)return null;
  const projectLocal=local=>{
    const at=fromLocal(local),m=fitAffine(anchors,at,options);
    return m?m.projectLocal(local):[NaN,NaN];
  };
  const center=toLocal(g),h=.25;
  const columns=[0,1].map(axis=>{
    const a=[...center],b=[...center];a[axis]+=h;b[axis]-=h;
    const p=projectLocal(a),q=projectLocal(b);
    return p.map((v,i)=>(v-q[i])/(2*h));
  });
  const info=matrixInfo([[columns[0][0],columns[1][0]],[columns[0][1],columns[1][1]]]);
  if(!info||Math.sign(info.determinant)!==Math.sign(fit.determinant)||info.condition>12)return null;
  return {...fit,...info,projectLocal,project:point=>projectLocal(toLocal(point))};
}

function hull(points){
  const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;
  const half=arr=>{const h=[];for(const a of arr){while(h.length>1&&cross(h.at(-2),h.at(-1),a)<=0)h.pop();h.push(a);}return h;};
  return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];
}
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function distanceFromSupport(g,anchors){
  const p=toLocal(g),polygon=hull(anchors.map(toLocal));if(!polygon.length)return Infinity;
  if(polygon.length===1)return length(p,polygon[0]);
  if(polygon.length===2)return segmentDistance(p,polygon[0],polygon[1]);
  if(polygon.every((a,i)=>cross(a,polygon[(i+1)%polygon.length],p)>=-1e-5))return 0;
  return Math.min(...polygon.map((a,i)=>segmentDistance(p,a,polygon[(i+1)%polygon.length])));
}
export class FixFilter{
  constructor(){this.samples=[];this.pendingJump=null;}
  reset(){this.samples=[];this.pendingJump=null;}
  push(fix,now=Date.now()){
    if(!fix||![fix.lat,fix.lng,fix.accuracy,fix.at].every(Number.isFinite)||Math.abs(fix.lat)>90||Math.abs(fix.lng)>180||fix.accuracy<0||fix.accuracy>2500||fix.at>now+5000||now-fix.at>30000)return null;
    const last=this.samples.at(-1);if(fix.at<=Math.max(last?.at??-Infinity,this.pendingJump?.at??-Infinity))return null;
    if(last&&now-last.at<30000){
      const dt=(fix.at-last.at)/1000,d=geoDistance(last,fix),budget=4*Math.max(dt,1)+Math.max(15,last.accuracy)+Math.max(15,fix.accuracy);
      if(d>budget){
        // A new cluster needs two independent samples before it replaces a fix.
        if(!this.pendingJump||fix.at-this.pendingJump.at>15000||geoDistance(this.pendingJump,fix)>Math.max(20,fix.accuracy)){this.pendingJump=fix;return null;}
        this.samples=[];
      }
    }
    this.pendingJump=null;this.samples=this.samples.filter(p=>fix.at-p.at<15000).slice(-5);this.samples.push({...fix,accuracy:Math.max(5,fix.accuracy)});
    // Accuracy-weighted smoothing, with a short window and no artificial sqrt(N)
    // confidence gain: indoor fixes can have a shared, unobserved bias.
    const recent=this.samples.filter(p=>p.accuracy<=Math.max(25,fix.accuracy*2));let total=0,e=0,n=0;
    for(const p of recent){const age=(fix.at-p.at)/1000,w=Math.exp(-age/4)/p.accuracy**2,g=toLocal(p);total+=w;e+=g[0]*w;n+=g[1]*w;}
    const location=fromLocal([e/total,n/total]);const spread=Math.max(0,...recent.map(p=>geoDistance(p,location)));
    return {...location,accuracy:Math.max(fix.accuracy,spread),at:fix.at,samples:this.samples.length,raw:{...fix}};
  }
}
export function wellSpread(samples){
  if(samples.length<3||!samples.every(validGeo))return false;
  const points=samples.map(toLocal),center=points.reduce((v,p)=>v.map((x,i)=>x+p[i]/points.length),[0,0]);
  let xx=0,xy=0,yy=0;
  for(const p of points){const x=p[0]-center[0],y=p[1]-center[1];xx+=x*x/points.length;xy+=x*y/points.length;yy+=y*y/points.length;}
  const gap=Math.hypot(xx-yy,2*xy),small=(xx+yy-gap)/2,large=(xx+yy+gap)/2;
  // An area threshold alone accepts long, almost collinear triangles.
  const accuracy=[...samples].map(a=>Number.isFinite(a.accuracy)?a.accuracy:10).sort((a,b)=>a-b)[Math.floor(samples.length/2)];
  return small>=Math.max(8,accuracy*.7)**2&&large/small<=100;
}
function holdoutError(samples,sign){
  if(samples.length===3)return null; // Three fitted points have no independent residual.
  const errors=samples.map((a,i)=>{
    const other=samples.filter((_,j)=>i!==j);if(!wellSpread(other))return Infinity;
    const m=fitSpatial(other,a);if(!m||Math.sign(m.determinant)!==sign)return Infinity;
    const d=m.project(a).map((v,k)=>v-a.pdf[k]);return Math.hypot(...m.inverse.map(row=>row[0]*d[0]+row[1]*d[1]));
  });
  return Math.sqrt(errors.reduce((n,e)=>n+e*e,0)/errors.length);
}
export function modelForFloor(floor,data,g,calibrations=[]){
  const landmarks=data.anchors.filter(a=>a.floor===floor&&validAnchor(a)),reference=fitAffine(landmarks);
  const config=data.floors[floor]??{};
  const constrained=config.fallbackModel==='similarity'&&landmarks.length>=3?fitSimilarity(landmarks,{minSpanM:60}):null;
  const constrainedValidation=constrained?similarityValidation(landmarks,constrained):null;
  const usableConstrained=constrained&&constrained.residual<=35&&constrainedValidation?.maxM<=config.modelAllowanceM;
  const sign=usableConstrained?Math.sign(constrained.determinant):reference?Math.sign(reference.determinant):-1;
  const samples=calibrations.filter(a=>a.floor===floor&&g.at>=a.at&&g.at-a.at<30*60000&&a.accuracy>=0&&a.accuracy<=40&&validAnchor(a));
  const learned=wellSpread(samples)?fitSpatial(samples,g):null;
  const validation=learned?holdoutError(samples,sign):Infinity;
  if(learned&&Math.sign(learned.determinant)===sign&&learned.residual<25&&(validation===null||validation<=35)&&distanceFromSupport(g,samples)<=35){
    return {model:learned,anchors:samples,error:Math.max(45,validation??45,...samples.map(a=>a.accuracy)),method:'calibrated',validationErrorM:validation};
  }
  // Two well-separated visitor confirmations can refine 4F without requiring
  // the visitor to leave its narrow corridor to manufacture a third direction.
  if(usableConstrained&&samples.length>=2){
    const two=fitSimilarity(samples,{minSpanM:Math.max(60,3*Math.max(...samples.map(a=>a.accuracy)))});
    const check=two?similarityValidation(samples,two):null;
    const ratio=two?.scale/constrained.scale;
    const alignment=two?(two.jacobian[0][0]*constrained.jacobian[0][0]+two.jacobian[0][1]*constrained.jacobian[0][1])/(two.scale*constrained.scale):0;
    if(two&&ratio>=.65&&ratio<=1.5&&alignment>=Math.cos(35*D)&&two.residual<=25&&(!check||check.maxM<=35)&&distanceFromSupport(g,samples)<=35){
      return {model:two,anchors:samples,error:Math.max(45,check?.maxM??45,...samples.map(a=>a.accuracy)),method:'calibrated',modelType:'similarity',validationErrorM:check?.rmsM??null};
    }
  }
  if(!wellSpread(landmarks)&&usableConstrained){
    return {model:constrained,anchors:landmarks,error:Math.max(config.modelAllowanceM,constrainedValidation.maxM),method:'landmarks',modelType:'similarity',supportMarginM:Math.min(80,config.supportMarginM??50),validationErrorM:constrainedValidation.rmsM};
  }
  if(!reference||!wellSpread(landmarks))return null;
  const model=fitSpatial(landmarks,g);if(!model||Math.sign(model.determinant)!==sign)return null;
  const error=Math.max(data.floors[floor]?.modelAllowanceM??60,model.residual);
  return {model,anchors:landmarks,error,method:'landmarks'};
}
export function projectFix(g,floor,data,floorData,calibrations=[]){
  if(!validGeo(g)||!Number.isFinite(g.at)||!Number.isFinite(g.accuracy)||g.accuracy<0)return {reason:'invalid'};
  if(Date.now()-g.at>60000||g.at>Date.now()+5000)return {reason:'stale'};
  if(g.accuracy>150)return {reason:'accuracy'};
  const info=modelForFloor(floor,data,g,calibrations);if(!info)return {reason:'calibration'};
  const {model}=info;
  const calibration=[...calibrations].reverse().find(a=>a.floor===floor&&validAnchor(a)&&g.at>=a.at&&g.at-a.at<10*60000&&a.accuracy>=0&&a.accuracy<=60&&geoDistance(a,g)<100);
  const outside=distanceFromSupport(g,info.anchors);
  if(!calibration&&outside>(info.supportMarginM??50))return {reason:'outside'};
  let allowance=Math.hypot(info.error,outside),method=info.method,offset=[0,0];
  // Evaluate the SAME spatial mapping at each end. A correction at a known
  // location stays fixed instead of changing when the visitor's weights change.
  if(calibration){
    const original=model.project(calibration);
    offset=calibration.pdf.map((v,i)=>v-original[i]);
    allowance=Math.max(info.error,Math.hypot(20,calibration.accuracy,geoDistance(calibration,g)*.5));
    method='calibrated';
  }
  const project=point=>model.project(point).map((v,i)=>v+offset[i]);
  const pdf=project(g),f={...floorData,id:floor},{x,y}=pdfToMap(pdf,f);
  if(!isFloorPoint({floor,x,y},f))return {reason:'outside'};
  const accuracyM=Math.hypot(g.accuracy,allowance),j=model.jacobian;
  return {floor,x,y,pdf,at:g.at,source:'estimated',accuracyM,method,modelType:info.modelType??'spatial',jacobian:j,samples:g.samples??1,
    ellipse:{east:[j[0][0]/floorData.width*1000,j[1][0]/floorData.height*1000],north:[j[0][1]/floorData.width*1000,j[1][1]/floorData.height*1000]}};
}
export function uncertaintyPolygon(p){
  if(!p?.ellipse||!Number.isFinite(p.accuracyM))return '';
  return Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2,e=Math.cos(a)*p.accuracyM,n=Math.sin(a)*p.accuracyM;return `${p.x+p.ellipse.east[0]*e+p.ellipse.north[0]*n},${p.y+p.ellipse.east[1]*e+p.ellipse.north[1]*n}`;}).join(' ');
}
export function nearbyAnchors(g,floor,data,limit=3){return data.anchors.filter(a=>a.floor===floor&&geoDistance(a,g)<=Math.max(120,g.accuracy)).sort((a,b)=>geoDistance(a,g)-geoDistance(b,g)).slice(0,limit);}
// These are guide places to confirm physically, not extra geographic controls.
export function calibrationPlaces(floor,data,pois){
  const ids=new Set(data.floors[floor]?.calibrationPoiIds??[]);
  return pois.filter(p=>ids.has(p.id)&&p.floor===floor&&finitePair(p.pdf)&&Number.isFinite(p.x)&&Number.isFinite(p.y));
}
export function addCalibration(list,p,g){
  if(!validGeo(g)||!Number.isFinite(g.accuracy)||g.accuracy<0||g.accuracy>60||!finitePair(p?.pdf)||!Number.isFinite(p.at)||!Number.isFinite(g.at)||Math.abs(p.at-g.at)>20000)return list;
  const sample={floor:p.floor,pdf:p.pdf,lat:g.lat,lng:g.lng,accuracy:g.accuracy,at:p.at};
  return [...list.filter(a=>a.floor!==p.floor||length(a.pdf,p.pdf)>25),sample].slice(-18);
}
export class StepBridge{
  constructor(){this.reset();}
  reset(){this.gravity=9.81;this.lastStep=0;this.steps=0;this.offset=[0,0];this.startedAt=0;}
  seed(at){this.reset();this.startedAt=at;}
  feed(acceleration,heading,at=Date.now()){
    if(!acceleration||![acceleration.x,acceleration.y,acceleration.z,heading].every(Number.isFinite)||!this.startedAt||at-this.startedAt>30000||this.steps>=35)return null;
    const total=Math.hypot(acceleration.x,acceleration.y,acceleration.z);this.gravity=.9*this.gravity+.1*total;
    if(total-this.gravity<1.6||at-this.lastStep<350)return null;
    this.lastStep=at;this.steps++;
    const stride=.65;this.offset[0]+=Math.sin(heading*D)*stride;this.offset[1]+=Math.cos(heading*D)*stride;
    return {offset:[...this.offset],steps:this.steps,drift:3+this.steps*.45};
  }
}
