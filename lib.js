// Browser-independent validation, one-time location sharing and corridor routing.
export const FLOOR_IDS = ['B1','1F','2F','3F','4F','MAGIC'];
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalizeName = value => String(value??'').normalize('NFKC').toLowerCase().replace(/[\s:×xX·&/()\-]/g,'');
export const isMapPoint = p => !!p && FLOOR_IDS.includes(p.floor) && Number.isFinite(p.x) && p.x>=0 && p.x<=1000 && Number.isFinite(p.y) && p.y>=0 && p.y<=1000;
export function isParkGPS(g) {
  return !!g && Number.isFinite(g.lat) && Number.isFinite(g.lng) && g.lat>=37.50 && g.lat<=37.520 && g.lng>=127.086 && g.lng<=127.112;
}
export function validGPS(g) {
  return !!g && Number.isFinite(g.lat) && Math.abs(g.lat)<=90 && Number.isFinite(g.lng) && Math.abs(g.lng)<=180 && Number.isFinite(g.accuracy) && g.accuracy>=0 && g.accuracy<=100000;
}
export function encodeShare({position,gps,floor,at=Date.now()}) {
  const p = new URLSearchParams({v:'1',floor:FLOOR_IDS.includes(floor)?floor:'1F',at:String(Math.round(at))});
  if (isMapPoint(position)) { p.set('floor',position.floor);p.set('x',position.x.toFixed(2));p.set('y',position.y.toFixed(2)); }
  if(isMapPoint(position)&&position.source==='estimated'){
    if(!Number.isFinite(position.accuracyM)||position.accuracyM<1||position.accuracyM>3000)throw new Error('추정 범위가 올바르지 않습니다.');
    p.set('approx','1');p.set('radius',String(Math.ceil(position.accuracyM)));
  }
  if (validGPS(gps)) {p.set('lat',gps.lat.toFixed(6));p.set('lng',gps.lng.toFixed(6));p.set('acc',Math.round(gps.accuracy).toString());}
  if (!p.has('x')&&!p.has('lat')) throw new Error('공유할 위치가 없습니다.');
  return `#meet=${encodeURIComponent(p.toString())}`;
}
export function decodeShare(hash,now=Date.now()) {
  if (!hash.startsWith('#meet=') || hash.length>1000) return null;
  try {
    const p=new URLSearchParams(decodeURIComponent(hash.slice(6)));
    const floor=p.get('floor');const at=Number(p.get('at'));
    if (p.get('v')!=='1'||!FLOOR_IDS.includes(floor)||!Number.isFinite(at)||at<1577836800000||at>now+300000) return null;
    const position=p.has('x')&&p.has('y')?{floor,x:Number(p.get('x')),y:Number(p.get('y'))}:null;
    if(p.has('approx')){
      const radius=Number(p.get('radius'));
      if(p.get('approx')!=='1'||!position||!Number.isFinite(radius)||radius<1||radius>3000)return null;
      position.source='estimated';position.accuracyM=radius;
    }
    const gps=p.has('lat')&&p.has('lng')&&p.has('acc')?{lat:Number(p.get('lat')),lng:Number(p.get('lng')),accuracy:Number(p.get('acc'))}:null;
    if (position&&!isMapPoint(position)||gps&&!validGPS(gps)||!position&&!gps) return null;
    return {floor,position,gps,at};
  } catch{return null;}
}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function project(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return {point:[a[0]+t*dx,a[1]+t*dy],t};}
// Paths are manually traced on the source illustration, in PDF points. Units
// are never described as metres or converted to walking times.
export function corridorRoute(floor,from,to,walkways,maxConnector=150) {
  if (from.floor!==floor||to.floor!==floor)throw new Error('DIFFERENT_FLOORS');
  if (!Array.isArray(from.pdf)||!Array.isArray(to.pdf)||!walkways?.length)throw new Error('UNLOCATED');
  const nodes=new Map(),edges=[];
  function node(p){const k=p.map(v=>v.toFixed(3)).join(',');if(!nodes.has(k))nodes.set(k,p);return k;}
  for(const path of walkways)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i];edges.push({a:node(a),b:node(b),p:a,q:b});}
  const snap=p=>edges.map((e,i)=>({...project(p,e.p,e.q),i})).map(s=>({...s,d:dist(p,s.point)})).sort((a,b)=>a.d-b.d)[0];
  const s=snap(from.pdf),t=snap(to.pdf);
  if(!s||!t||s.d>maxConnector||t.d>maxConnector)throw new Error('TOO_FAR');
  const start=node(s.point),end=node(t.point);const adj=new Map([...nodes.keys()].map(k=>[k,[]]));
  function add(a,b){const w=dist(nodes.get(a),nodes.get(b));adj.get(a).push([b,w]);adj.get(b).push([a,w]);}
  for(let i=0;i<edges.length;i++){
    const e=edges[i],parts=[{key:e.a,t:0},{key:e.b,t:1}];
    if(s.i===i)parts.push({key:start,t:s.t});if(t.i===i)parts.push({key:end,t:t.t});parts.sort((a,b)=>a.t-b.t);
    for(let j=1;j<parts.length;j++)if(parts[j-1].key!==parts[j].key)add(parts[j-1].key,parts[j].key);
  }
  const cost=new Map([[start,0]]),prev=new Map(),unseen=new Set(nodes.keys());
  while(unseen.size){let k=null,best=Infinity;for(const a of unseen)if((cost.get(a)??Infinity)<best){best=cost.get(a);k=a;}if(k===null)break;unseen.delete(k);if(k===end)break;for(const [b,w] of adj.get(k))if(unseen.has(b)&&best+w<(cost.get(b)??Infinity)){cost.set(b,best+w);prev.set(b,k);}}
  if(!cost.has(end))throw new Error('NO_PATH');
  const path=[];for(let k=end;k;k=prev.get(k)){path.push(nodes.get(k));if(k===start)break;}path.reverse();
  return {floor,points:path,from:from.pdf,to:to.pdf,connectors:[s.d,t.d],illustrationLength:cost.get(end)};
}

// Rank by the traced walking network, including the two access segments.
// Costs remain illustration units; they are never presented as real metres.
export function nearbyFacilities(from,pois,floors,{kinds=[],limit=1,perKind=false}={}) {
  if(!from?.floor||!Array.isArray(from.pdf)||!floors?.[from.floor])return [];
  const allowed=new Set(kinds),ranked=[];
  for(const poi of pois){
    if(poi.category!=='facility'||poi.floor!==from.floor||!Array.isArray(poi.pdf)||allowed.size&&!allowed.has(poi.kind))continue;
    try {
      const route=corridorRoute(from.floor,from,poi,floors[from.floor]);
      ranked.push({poi,route,cost:route.illustrationLength+route.connectors[0]+route.connectors[1]});
    }catch { /* A disconnected or distant pin is not a walking recommendation. */ }
  }
  ranked.sort((a,b)=>a.cost-b.cost||a.poi.id.localeCompare(b.poi.id));
  const seen=new Set();
  return ranked.filter(item=>{if(perKind&&seen.has(item.poi.kind))return false;seen.add(item.poi.kind);return true;}).slice(0,limit);
}

export function transferRecommendations(from,pois,floors) {
  return nearbyFacilities(from,pois,floors,{kinds:['stairs','escalator','elevator'],limit:3,perKind:true});
}
