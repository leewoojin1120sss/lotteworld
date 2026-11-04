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


// Tags are editorial keyword matches to the guide/catalogue, not ratings.
export const recommendationPreferences={
 attraction:[
 ['thrill','짜릿한 스릴','스릴|아찔|급발진|롤러코스터|자유낙하|자이로|후렌치|혜성특급'],
 ['story','모험·스토리','모험|판타지|동화|탐사|여행|신비'],
 ['gentle','여유·풍경','회전목마|모노레일|풍선비행|로티트레인|환타지드림|드림보트'],
 ['game','슈팅·레이싱','슈팅|레이싱|카트라이더|배틀'],
 ['kids','어린이와 함께','어린이|꼬마|키즈|놀이터|유아|햇님달님|스윙팡팡'],
 ['height','높이·낙하','자이로드롭|자이로스윙|스페인해적선|풍선비행|폭포|자유낙하'],
 ['spin','빙글빙글 회전','회전바구니|자이로스핀|자이로스윙|혜성특급|스윙팡팡'],
 ['water','보트·급류','드림보트|신밧드|후룸라이드|아트란티스|와일드밸리|와일드 밸리|보트|급류'],
 ['dark','어둠 속 모험','어둠|다크|동굴|어크로스다크|혜성특급'],
 ['show','공연·관람','극장|뮤지컬|시어터|씨어터|관람'],
 ['coaster','롤러코스터','롤러코스터|후렌치|혜성특급|아트란티스'],
 ['classic','대표 어트랙션','회전목마|신밧드|스페인해적선|후룸라이드|후렌치|아트란티스|자이로드롭'],
 ['sky','하늘에서 구경','풍선비행|모노레일'],
 ['interactive','직접 조작·참여','슈팅|범퍼카|카트라이더|배틀|황야의 무법자']
 ],
 food:[
 ['meal','든든한 식사','밥|한식|중식|돈까스|돈카츠|돈코츠|우동|라멘|라면|파스타|피자|버거|짜장|짬뽕|스테이크'],
 ['snack','간편한 간식','츄러스|핫도그|소시지|소떡|떡볶이|프레즐|팝콘|콜팝|샌드위치'],
 ['sweet','달콤한 디저트','아이스크림|젤라또|빙수|와플|탕후루|모찌|케이크|마카롱|베이커리|호두과자|소프트콘'],
 ['cafe','커피·음료','커피|라떼|밀크티|버블티|에이드|주스|쉐이크|프라페|카페'],
 ['korean','한식·분식','한식|분식|비빔밥|볶음밥|스팸마리|떡볶이|김계떡|김피라'],
 ['japanese','돈까스·일식','돈까스|돈카츠|돈코츠|라멘|우동|유부|초밥'],
 ['chinese','짜장·중식','중식|짜장|짬뽕|탕수육'],
 ['western','피자·버거·양식','피자|파스타|스테이크|버거|샌드위치|필라프|타코|퀘사디아'],
 ['chicken','치킨·콜팝','치킨|콜팝|통다리|BHC|BBQ'],
 ['ice','아이스크림·빙수','아이스크림|젤라또|빙수|소프트콘|소프트아이스'],
 ['bakery','빵·와플·츄러스','빵|와플|츄러스|프레즐|베이커리|호두과자'],
 ['tea','밀크티·상큼한 음료','밀크티|버블티|에이드|주스|스무디|공차'],
 ['noodles','면 요리','우동|라멘|라면|파스타|짜장|짬뽕'],
 ['rice','밥 요리','비빔밥|볶음밥|덮밥|스팸마리|한식|필라프'],
 ['fruit','과일·상큼한 맛','과일|탕후루|주스|에이드|스무디|요거트'],
 ['chocolate','초콜릿·진한 달콤함','초콜릿|초코|오레오|브라우니'],
 ['coffee','커피 한 잔','커피|라떼|카페라떼|아메리카노|룽고']
 ],
 shop:[
 ['character','캐릭터·굿즈','캐릭터|굿즈|기프트|헬로키티'],
 ['toy','완구·풍선','완구|풍선|인형|토이'],
 ['candy','캔디·초콜릿','캔디|초콜릿|젤리'],
 ['photo','사진 남기기','사진|포토|촬영|인화'],
 ['play','게임·체험','게임|오락실|체험|타로|문보트'],
 ['dress','교복·드레스','드레스|교복|분장'],
 ['accessory','머리띠·소품','헤어밴드|머리띠|가방|소품|키링'],
 ['maple','메이플스토리','메이플'],
 ['sanrio','헬로키티','헬로키티|산리오'],
 ['plush','인형 모으기','인형|봉제'],
 ['small','작은 기념품','키링|문구|스티커|머리띠|헤어밴드|소품'],
 ['lottie','로티·로리','로티|로리|롯데월드 캐릭터'],
 ['fortune','타로·운세 체험','타로|운세|아벤투라']
 ]
};
export const recommendationPresets={
 attraction:[['friends','친구와 신나게',['thrill','game']],['relax','여유롭게 구경',['gentle','story']],['family','아이와 함께',['kids','show']],['signature','대표 놀이기구',['classic']],['pilot','직접 즐기는 재미',['game','interactive']],['view','전망 즐기기',['gentle','sky']]],
 food:[['lunch','든든한 한 끼',['meal','korean']],['sugar','달달하게 충전',['sweet','ice','bakery']],['quick','가볍게 쉬어가기',['snack','cafe']],['noodlemeal','면이 당기는 날',['noodles']],['fruitbreak','상큼하게 쉬기',['fruit','tea']],['coffeebreak','커피와 디저트',['coffee','bakery']]],
 shop:[['gift','선물 고르기',['character','accessory']],['memory','추억 남기기',['photo','dress']],['fan','캐릭터 팬이라면',['character','maple','sanrio']],['collect','인형 수집가',['plush','toy']],['smallgift','가벼운 기념품',['small','accessory']],['experience','체험으로 추억 남기기',['play','fortune']]]
};
function recommendationHash(id,seed){let h=(seed>>>0)^2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function recommendPlaces(pois,{category='attraction',preferences=[],position=null,floors={},sameFloor=false,balance='balanced',limit=12,area='all',avoid=[],onlyMatches=false,excludeIds=[],seed=0,party='all',heightCm=null,knownHeightOnly=false}={}){
 const definitions=recommendationPreferences[category]??[],wanted=definitions.filter(([id])=>preferences.includes(id)),excluded=new Set(excludeIds);
 const avoidance=category==='attraction'?definitions.filter(([id])=>avoid.includes(id)):[];
 const rows=[];
 for(const p of pois){
  if(p.category!==category||/오픈예정/.test(p.name)||excluded.has(p.id)||sameFloor&&position&&p.floor!==position.floor||area==='magic'&&p.floor!=='MAGIC'||area==='adventure'&&p.floor==='MAGIC')continue;
  // Prefer the guide's concrete description over an additional marketing blurb.
  const text=[p.name,p.description,p._official?.menu].join(' ');
  const tags=definitions.filter(([,label,pattern])=>new RegExp(pattern,'i').test(text));
  if(avoidance.some(([id])=>tags.some(([key])=>key===id)))continue;
  const matched=tags.filter(([id])=>wanted.some(([key])=>key===id));
  if(onlyMatches&&wanted.length&&!matched.length)continue;
  let heightLabel='';
  if(category==='attraction'&&Number.isFinite(heightCm)&&heightCm>=50&&heightCm<=230){
   const o=p._official,min=o?.heightMinCm,max=o?.heightMaxCm;
   const hasMin=Number.isFinite(min)&&min>0,hasMax=Number.isFinite(max)&&max>0;
   if(hasMin&&heightCm<min||hasMax&&heightCm>max||knownHeightOnly&&!hasMin&&!hasMax)continue;
   heightLabel=hasMin||hasMax?`키 ${heightCm}cm · 공개 키 제한 범위 내`:'키 제한 확인 필요';
  }
  const partyTags={friends:{attraction:['thrill','game','interactive'],food:['snack','chicken'],shop:['play','photo']},family:{attraction:['kids','gentle','show'],food:['meal','ice'],shop:['toy','plush','lottie']},couple:{attraction:['gentle','story','sky'],food:['cafe','sweet'],shop:['photo','dress']},solo:{attraction:['game','story'],food:['snack','coffee'],shop:['small','character']}}[party]?.[category]??[];
  const partyMatches=tags.filter(([id])=>partyTags.includes(id));
  const partyReason=partyMatches.length?`동행 취향 · ${partyMatches.slice(0,2).map(([,label])=>label).join(' · ')}`:'';
  let cost=null;
  if(position?.pdf&&p.floor===position.floor&&p.pdf){try{const route=corridorRoute(p.floor,position,p,floors[p.floor]);cost=route.illustrationLength+route.connectors.reduce((a,b)=>a+b,0);}catch{}}
  rows.push({poi:p,tags,matched,cost,partyReason,heightLabel,partyAffinity:partyMatches.length/Math.max(1,partyTags.length),taste:wanted.length?matched.length/wanted.length:0,tie:recommendationHash(p.id,seed)});
 }
 const reachable=rows.filter(r=>r.cost!==null).sort((a,b)=>a.cost-b.cost||a.poi.id.localeCompare(b.poi.id));
 const weight=balance==='taste'?.85:balance==='distance'?.25:.6;
 for(const row of rows){const rank=reachable.indexOf(row);row.near=rank<0?0:1-rank/Math.max(1,reachable.length);row.score=(wanted.length?weight*row.taste:0)+(position?(wanted.length?1-weight:1)*row.near:0)+.12*row.partyAffinity;row.distanceLabel=!position?'위치 지정 후 거리 반영':row.poi.floor!==position.floor?'층·구역 이동 필요':row.cost===null?'같은 층 · 거리 미확인':rank===0?'같은 층 · 가장 가까운 후보':rank<Math.ceil(reachable.length/3)?'같은 층 · 가까운 편':'같은 층 · 통로 거리 반영';}
 const chosen=[],seenTags=new Set(),seenNames=new Set(),remaining=[...rows];
 const strength=balance==='distance'?.025:.08;
 while(remaining.length&&chosen.length<limit){
  const value=row=>row.score+strength*row.matched.filter(([id])=>!seenTags.has(id)).length/Math.max(1,wanted.length)+(!wanted.length&&!position?strength*row.tags.filter(([id])=>!seenTags.has(id)).length/Math.max(1,row.tags.length):0)-(seenNames.has(normalizeName(row.poi.name))?strength:0);
  remaining.sort((a,b)=>value(b)-value(a)||b.matched.length-a.matched.length||a.tie-b.tie||a.poi.id.localeCompare(b.poi.id,'ko',{numeric:true}));
  const row=remaining.shift();chosen.push(row);row.tags.forEach(([id])=>seenTags.add(id));seenNames.add(normalizeName(row.poi.name));
 }
 return chosen;
}



export function koreaDate(at=Date.now()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('');
}
export function parseClosureResponse(body,hours,at=Date.now()){
 if(String(body?.code)!=='200'||!Array.isArray(body.list)||String(hours?.code)!=='200'||!/^\d{8}$/.test(hours.data?.operDt))throw new Error('INVALID_CLOSURES');
 const rides=body.list.map(row=>{
  if(!/^\d+$/.test(String(row.shopSysCd))||typeof row.atrctNm!=='string'||!row.atrctNm.trim()||typeof row.atrctSttsCdNm!=='string'||!row.atrctSttsCdNm.trim()||typeof row.atrctSttsCd!=='string')throw new Error('INVALID_CLOSURES');
  return {officialId:String(row.shopSysCd),name:row.atrctNm,statusCode:row.atrctSttsCd,statusLabel:row.atrctSttsCdNm};
 });
 return {rides,date:hours.data.operDt,source:{fetchedAt:new Date(at).toISOString(),stale:false,url:'https://adventure.lotteworld.com/api/today/closed-list',method:'GET'}};
}
export function closuresAreFresh(doc,now=Date.now()){
 const at=Date.parse(doc?.source?.fetchedAt);
 return !!doc&&!doc.source?.stale&&Array.isArray(doc.rides)&&Number.isFinite(at)&&at<=now+60000&&now-at<=30*60000&&doc.date===koreaDate(now);
}
export function attractionClosure(p,doc,now=Date.now()){
 if(p.category!=='attraction')return null;
 const fresh=closuresAreFresh(doc,now),id=p._official?.officialId;
 const row=id?doc?.rides?.find(r=>String(r.officialId)===String(id)):null;
 const listed=!!row,stopped=listed&&row.statusCode!=='HC02901';
 const label=stopped?row.statusLabel:'운휴 공지 없음';
 if(!fresh)return {kind:'unknown',active:false,label:stopped?`이전 정보 · ${label}`:'운휴 확인 필요',checkedAt:doc?.source?.fetchedAt??null};
 if(!id)return {kind:'unknown',active:false,label:'운휴 확인 필요',checkedAt:doc.source.fetchedAt};
 return {kind:stopped?(/점검/.test(label)?'maintenance':'closed'):'unlisted',active:stopped,label,checkedAt:doc.source.fetchedAt};
}

// Explicit coordinate contracts: schematic PDF, normalized map and API pin boxes.
export function pdfToMap(pdf,floor){
 if(!floor||!Array.isArray(pdf)||pdf.length!==2||!pdf.every(Number.isFinite))throw new Error('INVALID_PDF_POINT');
 return {floor:floor.id,x:(pdf[0]-floor.crop[0])/floor.width*1000,y:(pdf[1]-floor.crop[1])/floor.height*1000};
}
export function mapToPDF(p,floor){
 if(!isMapPoint(p)||p.floor!==floor?.id)throw new Error('INVALID_FLOOR_POINT');
 return [floor.crop[0]+p.x/1000*floor.width,floor.crop[1]+p.y/1000*floor.height];
}
export function pointInPolygon(point,polygon){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i],dx=b[0]-a[0],dy=b[1]-a[1],t=((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(dx*dx+dy*dy||1);
  if(t>=0&&t<=1&&Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dy)<1e-6)return true;
  if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function isFloorPoint(p,floor){return isMapPoint(p)&&p.floor===floor?.id&&(!floor.polygon||pointInPolygon(mapToPDF(p,floor),floor.polygon));}
export const OFFICIAL_FLOORS={HA00101:'1F',HA00102:'2F',HA00103:'3F',HA00104:'4F',HA00105:'MAGIC',HA00106:'B1',HA00107:'1F'};
export function matchingOfficialRecords(p,items,link=null){
 const eligible=items.filter(o=>p.category==='facility'||OFFICIAL_FLOORS[o.floorCode]===p.floor);
 if(link?.recordIds?.length)return link.recordIds.map(id=>eligible.find(o=>o.id===id||(o.id?.slice(0,o.id.lastIndexOf('-'))===id.slice(0,id.lastIndexOf('-'))&&o.aliases?.includes(id.slice(id.lastIndexOf('-')+1))))).filter(Boolean);
 const norm=normalizeName(p.name);let matches=eligible.filter(o=>normalizeName(o.name)===norm);
 if(!matches.length&&norm.length>=3)matches=eligible.filter(o=>normalizeName(o.name).includes(norm));
 return matches.length===1?matches:[];
}
export function officialLocationsFor(p,records,link=null,fallbackMaps=[]){
 const seen=new Set(),result=[];
 for(const record of records){
  const locations=record.detail?.locations?.length?record.detail.locations:[record.detail?.position].filter(Boolean);
  for(const location of locations){
   const map=[...(record.detail?.maps??[]),...fallbackMaps].find(m=>m.id===location.mapId);
   if(!map||OFFICIAL_FLOORS[location.floorCode??map.floorCode]!==p.floor||![location.x,location.y,map.width,map.height].every(Number.isFinite)||map.width<=0||map.height<=0)continue;
   if(link?.locationIds?.length&&!link.locationIds.includes(location.officialLocationId))continue;
   const key=[map.id,location.x,location.y,location.officialLocationId??''].join(':');if(seen.has(key))continue;seen.add(key);
   result.push({location,map,recordName:record.name,recordId:record.id});
  }
 }
 return result;
}
export function officialPinBox(location,map){
 if(!location||!map||![location.x,location.y,map.width,map.height].every(Number.isFinite)||map.width<=0||map.height<=0)return null;
 return {left:location.x/map.width*100,top:location.y/map.height*100,width:44/map.width*100,height:58/map.height*100};
}

// Search/list filters must not trap the map after opening a result.
export function mapPinVisible(p,{browseAll=false,category='all',kind=null,favoritesOnly=false,isFavorite=false,matchesSearch=true}={}){
 return browseAll||((category==='all'||category===p.category)&&(!kind||kind===p.kind)&&(!favoritesOnly||isFavorite)&&matchesSearch);
}
// Explicit document titles: guide labels often differ or have namesakes.
const NAMU_ATTRACTION_DOCUMENTS=Object.freeze({
 "ride-1": "드림보트",
 "ride-2": "4D슈팅시어터",
 "ride-3": "와일드 밸리",
 "ride-4": "와일드 정글",
 "ride-5": "와일드 윙",
 "ride-6": "신밧드의 모험(롯데월드 어드벤처)",
 "ride-7": "스페인 해적선",
 "ride-8": "후룸라이드(롯데월드 어드벤처)",
 "ride-9": "회전바구니",
 "ride-10": "로티트레인",
 "ride-11": "배틀그라운드 월드 에이전트",
 "ride-12": "플라이 벤처",
 "ride-13": "회전목마(롯데월드 어드벤처)",
 "ride-14": "3D 황야의 무법자 2",
 "ride-15": "키즈토리아",
 "ride-16": "드래곤 와일드 슈팅",
 "ride-17": "어린이 범퍼카",
 "ride-18": "햇님달님(롯데월드 어드벤처)",
 "ride-19": "점핑피쉬",
 "ride-20": "언더씨킹덤(롯데월드 어드벤처)",
 "ride-21": "유레카(롯데월드 어드벤처)",
 "ride-22": "스윙팡팡",
 "ride-23": "매직붕붕카",
 "ride-24": "어린이 동화극장",
 "ride-25": "카트라이더 레이싱 월드",
 "ride-26": "후렌치 레볼루션",
 "ride-27": "범퍼카(롯데월드 어드벤처)",
 "ride-28": "콩 X 고질라: 더 라이드",
 "ride-29": "월드모노레일",
 "ride-30": "풍선비행",
 "ride-31": "파라오의 분노",
 "ride-32": "어크로스다크",
 "ride-33": "아트란티스",
 "ride-34": "자이로스윙",
 "ride-35": "쁘띠빵빵",
 "ride-36": "자이로드롭",
 "ride-37": "환타지 드림",
 "ride-38": "혜성특급",
 "ride-39": "자이로스핀",
 "ride-40": "스톤 익스프레스",
 "ride-41": "아르카나 라이드",
 "ride-42": "에오스 타워"
});
export function namuDocumentURL(p){
 const title=p?.category==='attraction'?NAMU_ATTRACTION_DOCUMENTS[p.id]:null;
 return title?'https://namu.wiki/w/'+encodeURIComponent(title):null;
}
