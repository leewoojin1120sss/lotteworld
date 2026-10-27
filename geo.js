// Geographic inference in metres, separate from the schematic's PDF coordinates.
// All estimates are approximate. No user positions or calibration samples persist.
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
export function fitAffine(anchors,near=null){
  if(anchors.length<3)return null;
  const rows=anchors.map(a=>({g:toLocal(a),p:a.pdf}));
  const center=near?toLocal(near):rows.reduce((v,r)=>v.map((x,i)=>x+r.g[i]/rows.length),[0,0]);
  const matrix=Array.from({length:3},()=>[0,0,0]),values=[[0,0,0],[0,0,0]];
  for(const row of rows){const dx=row.g[0]-center[0],dy=row.g[1]-center[1],v=[1,dx,dy],w=near?1/(40+Math.hypot(dx,dy))**2:1;
    for(let i=0;i<3;i++){for(let j=0;j<3;j++)matrix[i][j]+=w*v[i]*v[j];for(let k=0;k<2;k++)values[k][i]+=w*v[i]*row.p[k];}
  }
  const x=solve(matrix,values[0]),y=solve(matrix,values[1]);if(!x||!y)return null;
  const jacobian=[[x[1],x[2]],[y[1],y[2]]],det=x[1]*y[2]-x[2]*y[1];if(Math.abs(det)<.01)return null;
  const inverse=[[y[2]/det,-x[2]/det],[-y[1]/det,x[1]/det]];
  const projectLocal=g=>[x[0]+x[1]*(g[0]-center[0])+x[2]*(g[1]-center[1]),y[0]+y[1]*(g[0]-center[0])+y[2]*(g[1]-center[1])];
  const residual=Math.sqrt(rows.reduce((n,r)=>{const p=projectLocal(r.g),d=p.map((v,i)=>v-r.p[i]);return n+(inverse[0][0]*d[0]+inverse[0][1]*d[1])**2+(inverse[1][0]*d[0]+inverse[1][1]*d[1])**2;},0)/rows.length);
  return {jacobian,inverse,residual,project:g=>projectLocal(toLocal(g)),projectLocal};
}
function hull(points){
  const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;
  const half=arr=>{const h=[];for(const a of arr){while(h.length>1&&cross(h.at(-2),h.at(-1),a)<=0)h.pop();h.push(a);}return h;};
  return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];
}
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
export function distanceFromSupport(g,anchors){
  const p=toLocal(g),polygon=hull(anchors.map(toLocal));if(polygon.length<3)return Infinity;
  if(polygon.every((a,i)=>cross(a,polygon[(i+1)%polygon.length],p)>=-1e-5))return 0;
  return Math.min(...polygon.map((a,i)=>segmentDistance(p,a,polygon[(i+1)%polygon.length])));
}
export class FixFilter{
  constructor(){this.samples=[];this.pendingJump=null;}
  reset(){this.samples=[];this.pendingJump=null;}
  push(fix,now=Date.now()){
    if(!fix||![fix.lat,fix.lng,fix.accuracy,fix.at].every(Number.isFinite)||Math.abs(fix.lat)>90||Math.abs(fix.lng)>180||fix.accuracy<0||fix.accuracy>2500||fix.at>now+5000||now-fix.at>30000)return null;
    const last=this.samples.at(-1);if(last&&fix.at<=last.at)return null;
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
export function modelForFloor(floor,data,g,calibrations=[]){
  const surveyed=data.anchors.filter(a=>a.floor===floor),samples=calibrations.filter(a=>a.floor===floor&&g.at-a.at<30*60000&&a.accuracy<=40);
  // Three distinct user-confirmed references can calibrate an unsupported floor.
  const polygon=hull(samples.map(toLocal));
  const area=Math.abs(polygon.reduce((v,p,i)=>v+cross([0,0],p,polygon[(i+1)%polygon.length]),0))/2;
  const learned=samples.length>=3&&area>=100?fitAffine(samples,g):null;
  if(learned&&learned.residual<25&&distanceFromSupport(g,samples)<=35)return {model:learned,anchors:samples,error:Math.max(25,...samples.map(a=>a.accuracy)),method:'calibrated'};
  if(surveyed.length<3)return null;
  const model=fitAffine(surveyed,g);if(!model)return null;
  const error=Math.max(data.floors[floor]?.modelAllowanceM??60,model.residual);
  return {model,anchors:surveyed,error,method:'landmarks'};
}
export function projectFix(g,floor,data,floorData,calibrations=[]){
  if(!g||Date.now()-g.at>60000)return {reason:'stale'};
  if(g.accuracy>150)return {reason:'accuracy'};
  const info=modelForFloor(floor,data,g,calibrations);if(!info)return {reason:'calibration'};
  const {model}=info;
  const calibration=[...calibrations].reverse().find(a=>a.floor===floor&&g.at-a.at<10*60000&&a.accuracy<=60&&geoDistance(a,g)<100);
  if(!calibration&&distanceFromSupport(g,info.anchors)>50)return {reason:'outside'};
  let pdf=model.project(g),allowance=info.error,method=info.method;
  // A recent manual landmark can cancel a roughly constant indoor bias.
  if(calibration){const original=model.project(calibration);pdf=pdf.map((v,i)=>v+calibration.pdf[i]-original[i]);allowance=Math.hypot(20,calibration.accuracy,geoDistance(calibration,g)*.5);method='calibrated';}
  const crop=floorData.crop,x=(pdf[0]-crop[0])/floorData.width*1000,y=(pdf[1]-crop[1])/floorData.height*1000;
  if(x<0||x>1000||y<0||y>1000)return {reason:'outside'};
  if(floorData.polygon&&!inPolygon(pdf,floorData.polygon))return {reason:'outside'};
  const accuracyM=Math.hypot(g.accuracy,allowance),j=model.jacobian;
  return {floor,x,y,pdf,at:g.at,source:'estimated',accuracyM,method,jacobian:j,samples:g.samples??1,ellipse:{east:[j[0][0]/floorData.width*1000,j[1][0]/floorData.height*1000],north:[j[0][1]/floorData.width*1000,j[1][1]/floorData.height*1000]}};
}
function inPolygon(p,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function uncertaintyPolygon(p){
  if(!p?.ellipse||!Number.isFinite(p.accuracyM))return '';
  return Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2,e=Math.cos(a)*p.accuracyM,n=Math.sin(a)*p.accuracyM;return `${p.x+p.ellipse.east[0]*e+p.ellipse.north[0]*n},${p.y+p.ellipse.east[1]*e+p.ellipse.north[1]*n}`;}).join(' ');
}
export function nearbyAnchors(g,floor,data,limit=3){return data.anchors.filter(a=>a.floor===floor&&geoDistance(a,g)<=Math.max(120,g.accuracy)).sort((a,b)=>geoDistance(a,g)-geoDistance(b,g)).slice(0,limit);}
export function addCalibration(list,p,g){
  if(!g||g.accuracy>60||Math.abs(p.at-g.at)>20000)return list;
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
