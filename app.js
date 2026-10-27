import {escapeHTML as esc,normalizeName,isMapPoint,encodeShare,decodeShare,corridorRoute,nearbyFacilities,transferRecommendations,recommendPlaces,recommendationPreferences} from './lib.js';

import {FixFilter,projectFix,uncertaintyPolygon,nearbyAnchors,addCalibration,geoDistance,StepBridge} from './geo.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const paths={
  sparkles:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/><path d="m20 2 .7 2.3L23 5l-2.3.7L20 8l-.7-2.3L17 5l2.3-.7L20 2Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  share:'<path d="M12 16V3m-4 4 4-4 4 4M6 11H4v10h16V11h-2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  food:'<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v19M20 3c-4 3-5 8-5 11h5M20 3v19"/>',
  facility:'<path d="M5 21V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v15M3 21h18M9 4V2m6 2V2M8 9h8M8 13h8M10 21v-4h4v4"/>',
  bag:'<path d="M4 7h16l1 14H3L4 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h8a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h4m-6-7-3 3 3 3"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  locate:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
  maximize:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  hand:'<path d="M8 13V5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-2 6-6 6h-2c-2 0-4-2-5-4l-3-5a2 2 0 0 1 3-2l1 2Z"/>',
  sliders:'<path d="M4 6h16M4 18h16M7 3v6m10 6v6"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  restroom:'<circle cx="7" cy="4" r="1.5"/><circle cx="17" cy="4" r="1.5"/><path d="M4 13V8h6v5M7 13v8M3 21h8m4-13h4l3 8H12l3-8Zm0 8v5m4-5v5"/>',
  stairs:'<path d="M3 20h5v-5h5v-5h5V5h4M3 15v5m5-12 3-3 3 3m-3-3v8"/>',
  elevator:'<rect x="3" y="2" width="18" height="20" rx="2"/><path d="m7 8 2-2 2 2m-2-2v6m4 4 2 2 2-2m-2 2v-6"/>',
  escalator:'<path d="M3 16h4L17 6h4v5h-4L7 21H3v-5Z"/><circle cx="6" cy="8" r="1.5"/><path d="M6 10v5"/>',
  firstaid:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  aed:'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 0 9 8 16C20 14 24 9 20 5Z"/><path d="m4 12 5 0 2-4 2 8 2-4h5"/>',
  water:'<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  battery:'<rect x="4" y="7" width="16" height="11" rx="2"/><path d="M20 11h2v3m-10-5-3 4h5l-3 4"/>',
  locker:'<rect x="4" y="3" width="16" height="19" rx="2"/><path d="M12 3v19M8 10v4m8-4v4"/>',
  wheelchair:'<circle cx="13" cy="4" r="2"/><path d="M12 8v5h7l2 6M12 9H8m1 5a5 5 0 1 0 7 6"/>',
  baby:'<path d="m17 3 4 4-3 3-4-4 3-3Zm-3 3-9 9a4 4 0 0 0 6 6l9-9M8 12l4 4m-7-1 4 4"/>',
  photo:'<path d="M3 7h4l2-3h6l2 3h4v14H3V7Z"/><circle cx="12" cy="13" r="4"/>',
  atm:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10v6H7V7Zm1 10h8m-4-4v5"/>',
  lostchild:'<circle cx="12" cy="5" r="2"/><path d="M9 21v-7H7V9h10v5h-2v7M8 10 4 7m12 3 4-3"/>',
  lostfound:'<path d="M4 9h16v12H4V9Zm5 0V6a3 3 0 0 1 6 0v3"/><path d="M10 15h4m-2-2v4"/>',
  sanitary:'<path d="M8 3h8l3 5-2 12-5 2-5-2L5 8l3-5Z"/><path d="M9 7h6m-6 4h6m-6 4h6"/>',
  stroller:'<path d="M4 12h15a7 7 0 0 1-14 0Zm8-8v8H5a7 7 0 0 1 7-8Zm7 8 2-7h2"/><circle cx="7" cy="21" r="1"/><circle cx="17" cy="21" r="1"/>',
  prayer:'<path d="M4 21h16M6 21v-8l6-5 6 5v8M12 8V3m-2 2h4"/>',
  smoking:'<path d="M3 16h16v4H3v-4Zm12 0v4m7-5v6M10 11c4-5-4-4 0-9m5 9c4-5-4-4 0-9"/>',
  check:'<path d="m5 12 4 4L20 5"/>',
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]??paths.info}</svg>`;}
function hydrate(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{if(el.dataset.hydrated)return;el.insertAdjacentHTML('afterbegin',icon(el.dataset.icon));el.dataset.hydrated='true';});}
hydrate();
const names={attraction:'어트랙션',food:'푸드·카페',facility:'편의시설',shop:'샵·체험',all:'모든 장소'};
const kindNames={restroom:'화장실',elevator:'엘리베이터',stairs:'계단',escalator:'에스컬레이터',firstaid:'의무실',aed:'AED',water:'음수대',battery:'배터리 대여',locker:'물품보관함',wheelchair:'휠체어',baby:'베이비라운지',info:'안내·상담',photo:'포토스팟',atm:'ATM',lostchild:'미아보호',lostfound:'분실물',sanitary:'여성용품',stroller:'유모차',prayer:'기도실',smoking:'흡연실',picnic:'피크닉',unknown:'기타'};
let toastTimer,park,guidePois,walkways,official={},localAssets={},georeference={anchors:[],floors:{}};
let gpsWatch=null,calibrations=[];
const fixFilter=new FixFilter(),stepBridge=new StepBridge();
const safeStored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const storedFavs=safeStored('yaho-favorites',[]);
const state={floor:'1F',category:'attraction',query:'',allFloors:false,favoritesOnly:false,kind:null,favorites:new Set(Array.isArray(storedFavs)?storedFavs.filter(v=>typeof v==='string'):[]),selected:null,position:null,gps:null,gpsPending:false,gpsError:'',pick:false,shareAfterPick:false,routeAfterPick:null,shared:null,route:null};
Object.assign(state,{locationFloor:'1F',tracking:false,estimate:null,manualHoldUntil:0,manualBaseGPS:null,motionEnabled:false,heading:null,headingAt:0,motionBase:null,motionSteps:0});
state.recommendations=false;
const savedRecommendations=safeStored('yaho-recommendations',{});
state.rec={category:['attraction','food','shop'].includes(savedRecommendations.category)?savedRecommendations.category:'attraction',preferences:savedRecommendations.preferences??{},balance:['balanced','taste','distance'].includes(savedRecommendations.balance)?savedRecommendations.balance:'balanced',sameFloor:savedRecommendations.sameFloor===true};
state.routeDraft={toId:null,nearestKind:null,query:'',category:'all'};
const view={x:0,y:0,scale:1,fit:1,width:1070,height:760};
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function mobileSheet(open){$('#sidebar').classList.toggle('mobile-open',open);$('#mobileList').classList.toggle('active',open&&!state.favoritesOnly&&!state.recommendations);$('#mobileMap').classList.toggle('active',!open);$('#mobileRecommendations').classList.toggle('active',open&&state.recommendations);$('#mobileFavorites').classList.toggle('active',open&&state.favoritesOnly);}
function floorData(id=state.floor){return park.floors.find(f=>f.id===id);}
function floorLabel(id){return id==='MAGIC'?'매직아일랜드':id==='B1'?'B1 언더랜드':`${id} 어드벤처`;}
function toPDF(p){const f=floorData(p.floor),c=f.crop;return [c[0]+p.x/1000*f.width,c[1]+p.y/1000*f.height];}
function fromPDF(floor,pdf){const f=floorData(floor);return {floor,x:(pdf[0]-f.crop[0])/f.width*1000,y:(pdf[1]-f.crop[1])/f.height*1000};}
function poiIcon(p){return p.category==='facility'?(p.kind??'info'):{attraction:'sparkles',food:'food',shop:'bag'}[p.category];}
function poiById(id){return park.pois.find(p=>p.id===id);}
function nearest(p,cat='attraction'){if(!p.pdf)return null;return park.pois.filter(q=>q.floor===p.floor&&q.category===cat&&q.pdf&&q.id!==p.id).sort((a,b)=>Math.hypot(a.pdf[0]-p.pdf[0],a.pdf[1]-p.pdf[1])-Math.hypot(b.pdf[0]-p.pdf[0],b.pdf[1]-p.pdf[1]))[0];}
function officialEntry(p){return p._official??null;}
const codeFloors={HA00101:'1F',HA00102:'2F',HA00103:'3F',HA00104:'4F',HA00105:'MAGIC',HA00106:'B1',HA00107:'1F'};
function combineOfficial(){
  const consumed=new Set();
  const group={attraction:official.attractions??[],food:official.restaurants??[],shop:official.shops??[],facility:official.facilities??[]};
  park.pois=guidePois.map(p=>({...p}));
  for(const p of park.pois){
    const norm=normalizeName(p.name),list=group[p.category].filter(o=>p.category==='facility'||codeFloors[o.floorCode]===p.floor);
    let candidates=list.filter(o=>normalizeName(o.name)===norm);
    if(!candidates.length&&norm.length>=3)candidates=list.filter(o=>normalizeName(o.name).includes(norm));
    if(p.id==='ride-2')candidates=list.filter(o=>o.name==='4D슈팅시어터');
    if(p.id==='ride-29')candidates=list.filter(o=>o.name==='월드모노레일(실내운영)');
    if(p.id==='shop-19')candidates=list.filter(o=>o.name==='매직캐슬 트레져스');
    if(candidates.length===1){p._official=candidates[0];consumed.add(candidates[0].id);}
  }
  for(const [category,items]of Object.entries(group))for(const o of items){
    if(consumed.has(o.id))continue;const floor=codeFloors[o.floorCode];if(!floor)continue;
    if(category==='facility'&&park.pois.some(p=>p.kind&&normalizeName(p.name)===normalizeName(o.name)))continue;
    // Keep unmatched official entries in the catalogue without projecting
    // independent official pixel coordinates onto the guide illustration.
    const kind=category==='facility'?(o.name.includes('피크닉')?'picnic':'info'):undefined;
    park.pois.push({id:`web-${o.id}`,name:o.name,description:o.description??o.menu??'공식 웹 안내에 수록된 장소입니다.',category,floor,number:null,x:null,y:null,kind,_official:o,source:'official-public-api',coordinateQuality:'official-separate-map',note:'공식 웹 안내에 수록된 장소입니다. 아래 공식 위치 지도에서 위치를 확인하세요.'});
  }
}
function safeURL(v){try{const u=new URL(v);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function ageLabel(at){const d=Date.now()-at;if(d<60000)return '방금';if(d<3600000)return `${Math.floor(d/60000)}분 전`;return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(at);}

function matches(p){
  if(!state.allFloors&&p.floor!==state.floor)return false;
  if(state.favoritesOnly&&!state.favorites.has(p.id))return false;
  if(state.category!=='all'&&p.category!==state.category)return false;
  if(state.kind&&(p.category!=='facility'||p.kind!==state.kind))return false;
  if(!state.query.trim())return true;
  const aliases=p.kind==='elevator'?'엘베 승강기':p.kind==='baby'?'수유실 아기':p.kind==='battery'?'충전 보조배터리':p.kind==='restroom'?'화장실 WC toilet':p.kind==='aed'?'자동심장충격기 심장 제세동기':p.kind==='info'?'안내소 도움':p.kind==='water'?'정수기 물 마실 곳':'';
  const hay=normalizeName([p.name,p.description,names[p.category],floorLabel(p.floor),aliases].join(' '));
  return state.query.trim().split(/\s+/).every(word=>hay.includes(normalizeName(word)));
}
function favoriteButton(p){const on=state.favorites.has(p.id);return `<button class="fav-btn ${on?'saved':''}" type="button" data-favorite="${esc(p.id)}" aria-label="${esc(p.name)} 즐겨찾기 ${on?'해제':'추가'}" aria-pressed="${on}">${icon('heart')}</button>`;}
function renderList(){
  $('#sidebar').classList.toggle('recommendation-mode',state.recommendations);
  $('#recommendationControls').hidden=!state.recommendations;
  $('.search-box').hidden=state.recommendations;$('.sidebar-tabs').hidden=state.recommendations;
  $('#navRecommendations').classList.toggle('active',state.recommendations);$('#navRecommendations').setAttribute('aria-pressed',String(state.recommendations));
  const list=park.pois.filter(matches);
  $('#listTitle').textContent=state.favoritesOnly?'나의 즐겨찾기':state.query?`검색 결과`:state.kind?kindNames[state.kind]:names[state.category];
  $('#resultCount').textContent=`${list.length}곳`;
  $('#clearFilters').hidden=!state.query&&!state.kind;
  if(!list.length)$('#placeList').innerHTML=`<div class="empty-state">${icon(state.favoritesOnly?'heart':'search')}<strong>${state.favoritesOnly?'다음에 가고 싶은 곳을 모아보세요':'찾는 장소가 없어요'}</strong>${state.favoritesOnly?'장소 옆 하트를 누르면 여기에 모아드려요.':'다른 검색어를 쓰거나 모든 층에서 찾아보세요.'}</div>`;
  else $('#placeList').innerHTML=list.map(p=>{
    const subtitle=p.category==='facility'?(p.kind==='unknown'?'원본 범례 미표기 기호':`${nearest(p)?.name??floorLabel(p.floor)} 주변`):p.category==='food'?p.description:p.category==='shop'?p.description:'';
    const photo=p.category==='attraction'?localAssets.attractions?.[p._official?.officialId]:null;
    return `<article class="place-item ${state.selected===p.id?'selected':''}"><button type="button" class="place-open" data-open-place="${esc(p.id)}" aria-label="${esc(p.name)} · ${esc(floorLabel(p.floor))} 상세 보기"></button><div class="place-art ${p.category}">${photo?`<img src="${esc(photo)}" alt="" loading="lazy">`:icon(poiIcon(p))}</div><div class="place-text"><h3>${esc(p.name)}</h3><div class="place-meta"><span class="floor-chip">${esc(p.floor==='MAGIC'?'매직':p.floor)}</span><span>${esc(p.category==='facility'?kindNames[p.kind]??'편의시설':`${names[p.category]}${p.number?` · ${p.number}번`:' · 공식 웹 안내'}`)}</span></div>${subtitle?`<div class="place-sub">${esc(subtitle)}</div>`:''}</div>${favoriteButton(p)}</article>`;
  }).join('');
  $('#favoriteCount').textContent=state.favorites.size;
  $('#scopeFloor').classList.toggle('active',!state.allFloors);$('#scopeFloor').setAttribute('aria-pressed',String(!state.allFloors));
  $('#scopeAll').classList.toggle('active',state.allFloors);$('#scopeAll').setAttribute('aria-pressed',String(state.allFloors));
  $$('.category-tab').forEach(b=>{const on=b.dataset.category===state.category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('#navMap').classList.toggle('active',!state.favoritesOnly&&!state.recommendations);$('#navMap').setAttribute('aria-pressed',String(!state.favoritesOnly&&!state.recommendations));
  $('#navFavorites').classList.toggle('active',state.favoritesOnly);$('#navFavorites').setAttribute('aria-pressed',String(state.favoritesOnly));
  $('#facilityFilters').hidden=state.category!=='facility';
  if(state.category==='facility'){
    const kinds=Object.keys(kindNames).filter(k=>park.pois.some(p=>p.kind===k&&(state.allFloors||p.floor===state.floor)));
    $('#facilityFilters').innerHTML=`<button type="button" data-kind="" class="${!state.kind?'active':''}">모두</button>`+kinds.map(k=>`<button type="button" data-kind="${k}" class="${state.kind===k?'active':''}">${kindNames[k]}</button>`).join('');
  }
  if(state.recommendations)renderRecommendations();
}
function recommendationPosition(){
  const p=state.position;
  return p&&!positionIsStale(p)&&!(p.source==='estimated'&&p.accuracyM>75&&!p.confirmed)?{...p,pdf:toPDF(p)}:null;
}
function renderRecommendations(){
  const c=state.rec,position=recommendationPosition(),prefs=Array.isArray(c.preferences[c.category])?c.preferences[c.category]:[];
  $('#listTitle').textContent='나에게 맞는 추천';$('#clearFilters').hidden=true;$('#facilityFilters').hidden=true;
  $('#recommendationControls').innerHTML=`<div class="rec-intro"><span class="eyebrow">PICK YOUR ADVENTURE</span><p>취향을 고르면 가까운 곳부터 함께 골라드려요.</p></div><div class="rec-categories" role="group" aria-label="추천 종류">${[['attraction','어트랙션'],['food','식당'],['shop','기념품·체험']].map(([id,label])=>`<button type="button" data-rec-category="${id}" aria-pressed="${c.category===id}" class="${c.category===id?'active':''}">${label}</button>`).join('')}</div><div class="rec-preferences" role="group" aria-label="취향 선택 · 여러 개 선택 가능">${recommendationPreferences[c.category].map(([id,label])=>`<button type="button" data-rec-preference="${id}" aria-pressed="${prefs.includes(id)}" class="${prefs.includes(id)?'active':''}">${label}</button>`).join('')}</div><label class="rec-sort">추천 기준<select id="recBalance"><option value="balanced" ${c.balance==='balanced'?'selected':''}>취향과 거리 균형</option><option value="taste" ${c.balance==='taste'?'selected':''}>취향 우선</option><option value="distance" ${c.balance==='distance'?'selected':''}>거리 우선</option></select></label><label class="rec-floor"><input id="recSameFloor" type="checkbox" ${c.sameFloor?'checked':''} ${position?'':'disabled'}>현재 위치와 같은 층만</label><div class="rec-location"><span>${position?esc(positionName(position))+(position.source==='estimated'?' · 거리도 추정값':''):'현재 위치를 지정하면 거리를 반영해요.'}</span><button type="button" data-rec-locate>${position?'위치 변경':'위치 지정'}</button></div><p class="rec-note">${position?'지도 통로 기준 비교 · 다른 층은 거리 비교 제외':'위치 없이 취향으로 추천 중'}${prefs.length?'':' · 취향을 여러 개 골라보세요.'}</p>`;
  const rows=recommendPlaces(park.pois,{...c,preferences:prefs,position,floors:walkways.floors,limit:12});
  $('#resultCount').textContent=`${rows.length}곳`;
  $('#placeList').innerHTML=rows.length?rows.map((r,i)=>{const p=r.poi,photo=localAssets.attractions?.[p._official?.officialId];return `<article class="place-item rec-item"><button type="button" class="place-open" data-open-place="${esc(p.id)}" aria-label="${esc(p.name)} 상세 보기"></button><div class="place-art ${p.category}">${photo?`<img src="${esc(photo)}" alt="" loading="lazy">`:icon(poiIcon(p))}</div><div class="place-text"><div class="rec-rank">추천 ${i+1}</div><h3>${esc(p.name)}</h3><div class="place-meta"><span class="floor-chip">${esc(p.floor==='MAGIC'?'매직':p.floor)}</span><span>${esc(r.distanceLabel)}</span></div><p class="rec-reason">${esc(r.matched.length?r.matched.map(([,label])=>label).join(' · '):prefs.length?'선택한 취향 외 다른 후보':r.tags.slice(0,2).map(([,label])=>label).join(' · ')||'새로운 장소 둘러보기')}</p>${p.description?`<div class="place-sub">${esc(p.description)}</div>`:''}</div>${favoriteButton(p)}</article>`;}).join(''):'<div class="empty-state"><strong>추천할 장소가 없어요</strong>같은 층만 보기를 해제해 보세요.</div>';
  $('#recBalance').onchange=e=>{c.balance=e.target.value;saveRecommendations();renderRecommendations();};
  $('#recSameFloor').onchange=e=>{c.sameFloor=e.target.checked;saveRecommendations();renderRecommendations();};
}
function saveRecommendations(){try{localStorage.setItem('yaho-recommendations',JSON.stringify(state.rec));}catch{}}
function clearCurrentLocation(){
  stopGPS();state.position=null;state.gps=null;state.estimate=null;state.gpsError='';state.manualBaseGPS=null;state.manualHoldUntil=0;state.motionBase=null;calibrations=[];fixFilter.reset();
  endPick();clearRoute();$('#locationDialog').close();$('#shareDialog').close();$('#shareUrl').value='';$('#sharePreview').innerHTML='';updateLocationUI();renderLocationPins();if(state.recommendations)renderRecommendations();toast('내 위치를 지우고 위치 추적을 중지했어요.');
}
function renderPins(){
  const items=park.pois.filter(p=>p.floor===state.floor&&p.x!==null).flatMap(p=>[p,...(p.alternatePDF??[]).map(pdf=>({...p,...fromPDF(p.floor,pdf)}))]);
  const pinVisible=p=>(state.category==='all'||p.category===state.category)&&(!state.kind||p.kind===state.kind)&&(!state.favoritesOnly||state.favorites.has(p.id))&&(!state.query||matches({...p,floor:state.floor}));
  items.sort((a,b)=>Number(pinVisible(a))-Number(pinVisible(b)));
  $('#mapPins').innerHTML=items.map(p=>{
    const visible=pinVisible(p);const on=state.selected===p.id||(state.route?.transfer?.id??state.route?.destinationId)===p.id;
    return `<button type="button" tabindex="${visible||on?'0':'-1'}" class="pin ${p.category} ${on?'selected':''} ${visible||on?'':'muted'}" style="left:${p.x/10}%;top:${p.y/10}%;${visible||on?'z-index:3;':''}" data-open-place="${esc(p.id)}" aria-label="${esc(p.name)} ${p.number?`${p.number}번`:''}" title="${esc(p.name)}">${p.category==='facility'?icon(poiIcon(p)):`<span>${p.number}</span>`}<span class="pin-label">${esc(p.name)}</span></button>`;
  }).join('');
  $('#mapPins').style.pointerEvents=state.pick?'none':'';
  $$('#mapPins button').forEach(b=>{if(state.pick)b.style.pointerEvents='none';});
  renderLocationPins();
}
function renderLocationPins(){
  const p=state.position,s=state.shared?.position;
  const stale=positionIsStale(p);
  const label=p?.source==='estimated'?(stale?'마지막 추정 위치':p.method==='steps'?'걸음 보조 · 추정 위치':'추정 위치'):'내가 지정한 위치';
  $('#locationPins').innerHTML=(p&&p.floor===state.floor?`<div class="location-dot ${p.source==='estimated'?'estimated':''} ${stale?'stale':''}" style="left:${p.x/10}%;top:${p.y/10}%"><span>${label}</span></div>`:'')+(s&&s.floor===state.floor?`<div class="location-dot shared ${s.source==='estimated'?'estimated':''}" style="left:${s.x/10}%;top:${s.y/10}%"><span>${s.source==='estimated'?'공유받은 추정 위치':'공유받은 위치'}</span></div>`:'');
  const area=p&&p.floor===state.floor&&p.source==='estimated'?uncertaintyPolygon(p):'';
  $('#locationAccuracy').innerHTML=area?`<polygon class="location-uncertainty ${stale?'stale':''}" points="${area}"/>`:'';
}
function applyTransform(){
  $('#mapWorld').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;
  $('#mapWorld').style.setProperty('--inverse-scale',1/view.scale);
  // Give the SVG its actual screen dimensions instead of magnifying a cached
  // bitmap layer with the transformed pin container.
  const artwork=$('#mapImage');
  artwork.style.width=`${view.width*view.scale}px`;
  artwork.style.height=`${view.height*view.scale}px`;
  artwork.style.transform=`translate(${view.x}px,${view.y}px)`;
}
function fitMap(){
  if(!park)return;const stage=$('#map');const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  view.fit=Math.min((w-35)/view.width,(h-125)/view.height)*.97;
  view.fit=Math.max(.15,view.fit);view.scale=view.fit;
  view.x=(w-view.width*view.scale)/2;view.y=(h-view.height*view.scale)/2+4;applyTransform();
}
function zoom(factor,cx=$('#map').clientWidth/2,cy=$('#map').clientHeight/2){
  const next=Math.max(view.fit*.6,Math.min(view.fit*6,view.scale*factor));const ratio=next/view.scale;
  view.x=cx-(cx-view.x)*ratio;view.y=cy-(cy-view.y)*ratio;view.scale=next;applyTransform();
}
function focusPoint(p){if(p.x===null)return;const w=$('#map').clientWidth,h=$('#map').clientHeight;view.scale=Math.max(view.fit,Math.min(view.fit*1.65,2));view.x=w*.43-p.x/1000*view.width*view.scale;view.y=h*.44-p.y/1000*view.height*view.scale;applyTransform();}
function setFloor(id,{focus=false}={}){
  const f=floorData(id);if(!f)return;
  state.floor=id;view.width=f.width;view.height=f.height;
  $('#mapWorld').style.width=`${f.width}px`;$('#mapWorld').style.height=`${f.height}px`;
  $('#mapImage').src=f.vectorImage??f.image;$('#mapImage').alt=`${f.name} 지도`;
  $('#floorName').textContent=f.name;
  $('#floorTabs').innerHTML=park.floors.map(a=>`<button type="button" data-floor="${a.id}" class="${a.id===id?'active':''}" aria-pressed="${a.id===id}" aria-label="${esc(a.name)}">${a.id==='MAGIC'?'매직아일랜드':a.label}</button>`).join('');
  if(state.selected&&poiById(state.selected)?.floor!==id){state.selected=null;$('#detail').hidden=true;}
  renderList();renderPins();renderRoute();fitMap();
  if(focus)$('#map').focus({preventScroll:true});
}
function setCategory(category){state.category=category;state.kind=null;renderList();renderPins();}
function toggleFavorite(id){if(!poiById(id))return;state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);try{localStorage.setItem('yaho-favorites',JSON.stringify([...state.favorites]));}catch{toast('브라우저에서 저장을 허용하지 않아 이번 방문 중에만 유지돼요.');}renderList();renderPins();if(state.selected)renderDetail(poiById(state.selected));}
function openPlace(id){
  const p=poiById(id);if(!p)return;
  if(state.pick){setManualPosition(p);return;}
  if(p.floor!==state.floor)setFloor(p.floor);
  state.selected=id;renderList();renderPins();renderDetail(p);focusPoint(p);mobileSheet(false);
}
function renderDetail(p){
  const o=officialEntry(p);
  const url=safeURL(o?.url)??(p.category==='attraction'?'https://adventure.lotteworld.com/enjoy/attrctn/list':p.category==='food'?'https://adventure.lotteworld.com/enjoy/restaurant/list':'https://adventure.lotteworld.com/usage-guide/service/convenient-facilities/information/list');
  const picture=localAssets.attractions?.[o?.officialId]??safeURL(o?.image),detail=$('#detail');
  const description=p.category==='facility'?`${nearest(p)?.name??floorLabel(p.floor)} 부근`:p.description;
  const note=p.note&&p.source!=='official-public-api'?`<details class="detail-source-note"><summary>위치 정보</summary><p>${esc(p.note)}</p></details>`:'';
  detail.innerHTML=`<div class="detail-top ${p.category}">${picture?`<img src="${esc(picture)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer">`:icon(poiIcon(p))}<button class="icon-btn detail-close" type="button" data-detail-close aria-label="상세 정보 닫기">${icon('close')}</button></div>
  <div class="detail-body"><div class="detail-category"><span class="floor-chip">${esc(p.floor==='MAGIC'?'매직아일랜드':p.floor)}</span>${esc(names[p.category])}${p.number?` · ${p.number}번`:''}</div>
  <div class="detail-title-row"><h2>${esc(p.name)}</h2>${favoriteButton(p)}</div>
  <p class="detail-description">${esc(description)}</p>
  ${o?.restrictions?`<p class="detail-restrictions">${esc(typeof o.restrictions==='string'?o.restrictions:JSON.stringify(o.restrictions))}</p>`:''}
  ${note}${p.kind==='unknown'?'<p class="detail-note">종류 미확인 시설</p>':''}
  <div class="detail-actions"><button class="btn btn-primary" type="button" data-route-to="${esc(p.id)}">${icon('route')}${p.category==='facility'?'가까운 시설':'여기로 가기'}</button><button class="btn btn-subtle" type="button" data-set-position="${esc(p.id)}" ${p.x===null?'disabled':''}>${icon('pin')}나 여기 있어요</button></div>
  <div class="detail-extra"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">공식 안내 ↗</a><button type="button" data-share-place="${esc(p.id)}">${icon('share')}장소 공유</button><a href="assets/guide-2026.pdf#page=${floorData(p.floor).page+1}" target="_blank" rel="noopener">가이드맵 ↗</a></div></div>`;
  const img=detail.querySelector('img');if(img)img.addEventListener('error',()=>img.replaceWith(document.createRange().createContextualFragment(icon(poiIcon(p)))),{once:true});
  if(o?.detail?.position||o?.detail?.locations?.length){
    const action=document.createElement('button');action.type='button';action.className=`btn ${p.x===null?'btn-primary':'btn-subtle'} btn-full official-map-button`;action.innerHTML=icon('map')+'공식 위치 지도';action.addEventListener('click',()=>openOfficialMap(p));detail.querySelector('.detail-actions').before(action);
  }
  detail.hidden=false;$('#mapTip').hidden=true;
}

function openOfficialMap(p){
  const o=officialEntry(p);if(!o)return;
  const locations=o.detail?.locations?.length?o.detail.locations:[o.detail?.position].filter(Boolean);
  const maps=o.detail?.maps??[];
  const body=$('#officialMapBody');
  body.innerHTML=`<label class="field-label" for="officialLocationSelect">${esc(p.name)}</label><select id="officialLocationSelect">${locations.map((loc,i)=>`<option value="${i}">${esc(maps.find(m=>m.id===loc.mapId)?.floorName??o.floorName)}${loc.location?` · ${esc(loc.location)}`:''}</option>`).join('')}</select><div id="officialMapFigure"></div>`;
  const render=i=>{const loc=locations[i],m=maps.find(a=>a.id===loc?.mapId)??(official.maps??[]).find(a=>a.id===loc?.mapId);if(!loc||!m)return;const image=localAssets.maps?.[m.id]??safeURL(m.imageUrl);$('#officialMapFigure').innerHTML=`<figure class="official-map-figure"><div style="aspect-ratio:${m.width}/${m.height}"><img src="${esc(image)}" alt="${esc(m.floorName)} 공식 위치 지도"><span class="official-position" style="left:${loc.x/m.width*100}%;top:${loc.y/m.height*100}%">${icon('pin')}</span></div><figcaption>${esc(m.floorName)} · 지도 © 롯데월드</figcaption></figure>`;};
  $('#officialLocationSelect').onchange=e=>render(Number(e.target.value));render(0);$('#officialMapDialog').showModal();
}
function closeDetail(){state.selected=null;$('#detail').hidden=true;renderList();renderPins();}
function beginPick(afterShare=false){state.pick=true;state.shareAfterPick=afterShare;closeDetail();$$('dialog[open]').forEach(d=>d.close());mobileSheet(false);$('#map').classList.add('picking');$('#pickBanner').hidden=false;renderPins();$('#map').focus({preventScroll:true});}
function endPick(){state.pick=false;state.shareAfterPick=false;state.routeAfterPick=null;$('#map').classList.remove('picking');$('#pickBanner').hidden=true;renderPins();}
function positionIsStale(p){return p?.source==='estimated'&&(p.lastKnown||Date.now()-p.at>60000||p.method==='steps'&&Date.now()-(p.basedAt??p.at)>30000);}
function positionName(p){if(!p)return '';const n=nearest({floor:p.floor,pdf:toPDF(p)});return `${p.source==='estimated'?(positionIsStale(p)?'마지막 추정 · ':'추정 · '):''}${n?`${n.name} 부근`:`${floorLabel(p.floor)}에서 지정한 위치`}`;}
function setManualPosition(p){
  if(p.x===null||!isMapPoint(p)){toast('지도 안에서 현재 위치를 지정해 주세요.');return;}
  const after=state.shareAfterPick,routeAfter=state.routeAfterPick,at=Date.now();
  state.locationFloor=p.floor;state.position={floor:p.floor,x:p.x,y:p.y,at,source:'manual'};
  calibrations=addCalibration(calibrations,{...state.position,pdf:toPDF(p)},state.gps);
  state.manualHoldUntil=at+15000;state.manualBaseGPS=state.gps;state.motionBase=null;
  if(state.gps){const e=projectFix(state.gps,p.floor,georeference,floorData(p.floor),calibrations);if(e.x!==undefined){state.motionBase={...e,x:p.x,y:p.y,at};stepBridge.seed(at);}}
  state.shareAfterPick=false;clearRoute();endPick();closeDetail();
  updateLocationUI();renderLocationPins();toast(`${floorLabel(p.floor)}에 내 위치를 표시했어요.`);
  if(after)openShare();
  else if(routeAfter){openRoute(routeAfter.toId,{nearestKind:routeAfter.nearestKind,preserve:true});if(routeAfter.autoRoute)runRoute();}
}
function updateLocationUI(){
  const button=$('#locate');if(!button)return;
  $('#clearLocation').hidden=!state.position&&!state.tracking;
  if(state.recommendations)renderRecommendations();
  const current=state.position?.source==='estimated'&&!positionIsStale(state.position);
  button.classList.toggle('tracking',state.tracking);button.setAttribute('aria-label','내 위치');
  button.innerHTML=icon('locate')+`<span>${state.gpsPending?'위치 찾는 중':current?'추정 위치':'내 위치'}</span>`;
  if($('#locationDialog').open&&document.activeElement?.id!=='locationFloor')renderLocationDialog();
}
function estimationMessage(){
  if(state.gpsError)return state.gpsError;
  if(!state.gps)return state.gpsPending?'GPS·네트워크 위치를 수신하고 있어요.':'자동 추정을 시작하거나 현재 위치를 지도에서 지정하세요.';
  if(Date.now()-state.gps.at>60000)return '새 위치 신호를 찾고 있습니다. 지도에는 마지막 위치가 표시됩니다.';
  const reason=state.estimate?.reason;
  return reason==='outside'?'현재 신호는 이 층의 지도 범위 밖입니다. 층 또는 위치를 보정해 주세요.':reason==='accuracy'?'실내 신호의 오차가 큽니다. 가까운 장소를 선택해 위치를 보정하세요.':reason==='calibration'?state.position?.source==='manual'&&state.position.floor===state.locationFloor?'지정한 위치를 사용 중입니다. 이동 후 보정하면 이 층의 자동 추정을 학습합니다.':'이 층은 자동 변환 기준점이 부족합니다. 지도에서 위치를 보정해 주세요.':reason==='stale'?'새 위치 신호를 기다리고 있어요.':state.estimate?.x!==undefined?'실제 장소 기준점과 선택한 층으로 위치를 추정했습니다.':'위치 신호를 분석하고 있어요.';
}
function locationContent(){
  const g=state.gps,e=state.estimate,hasEstimate=e?.x!==undefined&&Date.now()-e.at<60000,candidates=g&&Date.now()-g.at<60000?nearbyAnchors(g,state.locationFloor,georeference):[];
  return `<div class="location-floor-select"><label class="field-label" for="locationFloor">내가 있는 층</label><select id="locationFloor">${park.floors.map(f=>`<option value="${f.id}" ${f.id===state.locationFloor?'selected':''}>${esc(f.name)}</option>`).join('')}</select></div>
  <div class="gps-reading ${hasEstimate?'has-estimate':''}"><div class="gps-heading">${icon(state.gpsPending?'locate':'pin')}<h3>${hasEstimate?'내 위치 후보':state.gpsPending?'실내 위치 추정 중':'내 위치 찾기'}</h3></div><p>${esc(estimationMessage())}</p>${g?`<div class="gps-metrics"><span>기기 오차 <strong>±${Math.round(g.accuracy)}m</strong></span><span>${g.samples??1}회 수신 · ${esc(ageLabel(g.at))}</span></div>`:''}${hasEstimate?`<p class="estimate-radius">지도 추정 범위 약 <b>${Math.ceil(e.accuracyM/5)*5}m</b>${e.method==='calibrated'?' · 위치 보정 적용':''}</p>`:''}</div>
  ${hasEstimate?'<button class="btn btn-primary btn-full" type="button" id="useEstimated">이 추정 위치 사용</button>':''}
  ${candidates.length?`<div class="location-landmarks"><h3>이 장소에 있다면 눌러 보정하세요</h3>${candidates.map(a=>`<button type="button" data-location-landmark="${esc(a.id)}">${icon('pin')}<span>${esc(a.name)}</span>${icon('check')}</button>`).join('')}</div>`:''}
  <div class="location-options"><button class="btn ${hasEstimate?'btn-subtle':'btn-primary'}" type="button" id="locationRetry">${icon('locate')}${state.tracking?'위치 다시 수신':'자동 추정 시작'}</button><button class="btn btn-subtle" type="button" id="locationPick">${icon('pin')}지도에서 보정</button></div>
  <div class="location-tracking-actions">${state.position||state.tracking?'<button class="text-button" type="button" id="removeCurrentLocation">내 위치 지우기</button>':''}${state.tracking?'<button class="text-button" type="button" id="stopTracking">위치 추적 중지</button>':''}${'DeviceMotionEvent'in window?`<button class="text-button" type="button" id="motionAssist">${state.motionEnabled?'걸음 보조 끄기':'걸음 보조 켜기'}</button>`:''}</div>
  ${state.motionEnabled?`<p class="motion-note">${state.heading===null?'휴대전화를 수평으로 들고 윗부분을 진행 방향으로 향해 주세요.':'휴대전화 윗부분을 진행 방향으로 · 신호 단절 시 최대 30초 보완합니다.'}${state.motionSteps?` · ${state.motionSteps}걸음 보완`:''}</p>`:''}
  <p class="location-privacy">위치와 보정값은 이 기기에만 머뭅니다. 공유 버튼을 누르면 선택한 위치를 전달합니다.</p>
  <div class="location-source"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">좌표 기준 © OpenStreetMap contributors</a><span>실내·조감도 위치는 추정값입니다.</span></div>`;
}
function renderLocationDialog(){
  $('#locationBody').innerHTML=locationContent();
  $('#locationPick').onclick=()=>beginPick(state.shareAfterPick);
  $('#locationRetry').onclick=()=>requestGPS();
  $('#locationFloor').onchange=e=>{const floor=e.target.value;state.locationFloor=floor;if(state.position?.floor!==floor){state.position=null;clearRoute();}setFloor(floor);updateEstimate();if(state.estimate?.x!==undefined)focusPoint(state.estimate);renderLocationDialog();};
  const use=$('#useEstimated');if(use)use.onclick=useEstimatedPosition;
  const remove=$('#removeCurrentLocation');if(remove)remove.onclick=clearCurrentLocation;
  const stop=$('#stopTracking');if(stop)stop.onclick=()=>{stopGPS();renderLocationDialog();};
  const motion=$('#motionAssist');if(motion)motion.onclick=toggleMotion;
}
function openLocation({getGPS=false}={}){if(!state.tracking&&!state.gps)state.locationFloor=state.floor;renderLocationDialog();if(!$('#locationDialog').open)$('#locationDialog').showModal();if(getGPS)requestGPS();}
function updateEstimate(){
  if(!state.gps)return;
  state.estimate=projectFix(state.gps,state.locationFloor,georeference,floorData(state.locationFloor),calibrations);
  const e=state.estimate;
  const hold=state.position?.source==='manual'&&(Date.now()<state.manualHoldUntil||state.manualBaseGPS&&geoDistance(state.manualBaseGPS,state.gps)<8);
  if(e.x!==undefined&&state.tracking&&!state.pick&&!hold){
    const old=state.position;
    state.position={...e,confirmed:old?.confirmed&&old.floor===e.floor&&Math.hypot(old.x-e.x,old.y-e.y)<30};
    state.motionBase={...e};stepBridge.seed(e.at);state.motionSteps=0;
  }else if(e.reason&&state.position?.source==='estimated'){
    // Do not keep a plausible-looking current dot when a new fix is outside or
    // too imprecise; retain only an explicitly labelled last known location.
    state.position.lastKnown=true;
  }
  renderLocationPins();updateLocationUI();
  if($('#routeDialog').open)renderRouteDestinations();
}
function receiveGPS(p){
  if(!state.tracking)return;
  const fix=fixFilter.push({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at:p.timestamp});
  if(!fix)return;
  const first=!state.gps;state.gpsPending=false;state.gpsError='';state.gps=fix;updateEstimate();
  if(first&&state.position?.source==='estimated'&&state.position.floor===state.floor)focusPoint(state.position);
}
function gpsFailure(err){
  state.gpsPending=false;
  state.gpsError=err.code===1?'위치 권한이 꺼져 있습니다. 브라우저 설정에서 위치를 허용해 주세요.':err.code===3?'위치 신호를 더 기다리고 있어요. 실내에서는 보정이 필요할 수 있습니다.':'위치 신호를 찾지 못했습니다. 지도에서 현재 장소를 선택해 보정하세요.';
  if(err.code===1)stopGPS();updateLocationUI();
}
function startWatch(){
  if(gpsWatch!==null||!state.tracking||document.hidden)return;
  gpsWatch=navigator.geolocation.watchPosition(receiveGPS,gpsFailure,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
}
function requestGPS(){
  if(!window.isSecureContext||!navigator.geolocation){state.gpsError='이 브라우저에서는 위치를 사용할 수 없습니다. 지도에서 위치를 지정해 주세요.';renderLocationDialog();return;}
  if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;
  fixFilter.reset();state.tracking=true;state.gpsPending=true;state.gpsError='';startWatch();updateLocationUI();
}
function stopGPS(){if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;state.tracking=false;state.gpsPending=false;disableMotion();updateLocationUI();}
function useEstimatedPosition(){
  const e=state.estimate;if(e?.x===undefined||Date.now()-e.at>60000){toast('새 위치 신호를 먼저 수신해 주세요.');return;}
  const after=state.shareAfterPick,routeAfter=state.routeAfterPick;state.position={...e,confirmed:true};state.shareAfterPick=false;state.routeAfterPick=null;clearRoute();
  $('#locationDialog').close();setFloor(e.floor);focusPoint(e);renderLocationPins();updateLocationUI();
  if(after)openShare();else if(routeAfter){openRoute(routeAfter.toId,{nearestKind:routeAfter.nearestKind,preserve:true});if(routeAfter.autoRoute)runRoute();}
}
async function toggleMotion(){
  if(state.motionEnabled){disableMotion();renderLocationDialog();return;}
  try{
    const requests=[];
    if(typeof DeviceMotionEvent.requestPermission==='function')requests.push(DeviceMotionEvent.requestPermission());
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function')requests.push(DeviceOrientationEvent.requestPermission(true));
    const permissions=await Promise.all(requests);if(permissions.some(p=>p!=='granted'))throw new Error('permission');
    state.motionEnabled=true;state.heading=null;state.headingAt=0;state.motionSteps=0;
    window.addEventListener('deviceorientationabsolute',receiveHeading);window.addEventListener('deviceorientation',receiveHeading);window.addEventListener('devicemotion',receiveMotion);
    renderLocationDialog();
  }catch{toast('움직임 권한을 사용할 수 없습니다. GPS 추정은 계속 사용할 수 있어요.');}
}
function disableMotion(){state.motionEnabled=false;state.motionBase=null;state.heading=null;window.removeEventListener('deviceorientationabsolute',receiveHeading);window.removeEventListener('deviceorientation',receiveHeading);window.removeEventListener('devicemotion',receiveMotion);}
function receiveHeading(e){
  if(Number.isFinite(e.webkitCompassHeading)&&(!Number.isFinite(e.webkitCompassAccuracy)||e.webkitCompassAccuracy<=25))state.heading=e.webkitCompassHeading;
  else if(e.absolute&&Number.isFinite(e.alpha)&&Math.abs(e.beta??90)<60&&Math.abs(e.gamma??90)<60)state.heading=(360-e.alpha)%360;
  else return;
  state.headingAt=Date.now();
}
function receiveMotion(e){
  const now=Date.now(),base=state.motionBase;
  if(!state.tracking||!state.motionEnabled||!base||state.heading===null||now-state.headingAt>3000||now-base.at<10000||now-base.at>30000||base.accuracyM>75||state.pick||state.route)return;
  const step=stepBridge.feed(e.accelerationIncludingGravity,state.heading,now);if(!step)return;
  const [east,north]=step.offset,j=base.jacobian,f=floorData(base.floor),x=base.x+(j[0][0]*east+j[0][1]*north)/f.width*1000,y=base.y+(j[1][0]*east+j[1][1]*north)/f.height*1000;
  if(x<0||x>1000||y<0||y>1000)return;
  state.motionSteps=step.steps;state.position={...base,x,y,at:now,basedAt:base.at,accuracyM:base.accuracyM+step.drift,method:'steps',confirmed:false};renderLocationPins();updateLocationUI();
}

function openShare(){
  const gps=state.gps&&Date.now()-state.gps.at<120000?state.gps:null;
  if(!state.position&&!gps){state.shareAfterPick=true;openLocation({getGPS:!state.tracking});return;}
  const measuredAt=state.position?.source==='estimated'?state.position.at:!state.position&&gps?gps.at:Date.now();
  const hash=encodeShare({position:state.position,gps,floor:state.position?.floor??state.locationFloor,at:measuredAt});
  const url=new URL(location.href);url.hash=hash;$('#shareUrl').value=url.href;
  const floor=state.position?.floor??state.locationFloor;
  $('#sharePreview').innerHTML=`${icon('pin')}<strong>${esc(floorLabel(floor))}</strong><p>${state.position?esc(positionName(state.position)):'기기 위치 좌표 공유'}${state.position?.source==='estimated'?`<br>지도 추정 범위 약 ${Math.ceil(state.position.accuracyM/5)*5}m`:''}${gps?`<br>기기 오차 ±${Math.round(gps.accuracy)}m`:''}<br>지금 위치의 일회성 링크</p>`;
  $('#nativeShare').hidden=!navigator.share;
  if(!$('#shareDialog').open)$('#shareDialog').showModal();
}
async function copy(text){try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);toast('링크를 복사했어요. 친구에게 보내 주세요.');return true;}catch{toast('링크를 선택한 뒤 직접 복사해 주세요.');$('#shareUrl').focus();$('#shareUrl').select();return false;}}
function readHash(){
  const shared=decodeShare(location.hash);
  if(shared){state.shared=shared;setFloor(shared.floor);if(shared.position)focusPoint(shared.position);
    const old=Date.now()-shared.at>60*60000;
    $('#sharedCard').innerHTML=`<button class="icon-btn" type="button" id="dismissShared" aria-label="공유 위치 표시 닫기">${icon('close')}</button><h3>친구가 공유한 위치</h3><p>${esc(floorLabel(shared.floor))} · ${esc(ageLabel(shared.at))}<br>${old?'한 시간 이상 지난 위치예요. 새 위치를 확인해 주세요.':'공유한 순간의 위치예요. 현재 위치와 다를 수 있어요.'}${shared.position?.source==='estimated'?`<br>추정 위치 · 약 ${Math.round(shared.position.accuracyM)}m 범위`:!shared.position?'<br>기기 위치 좌표만 공유되었습니다.':''}</p>${shared.gps?`<a class="text-button" href="https://www.google.com/maps/search/?api=1&query=${shared.gps.lat.toFixed(6)},${shared.gps.lng.toFixed(6)}" target="_blank" rel="noopener noreferrer">GPS 위치 보기 · ±${Math.round(shared.gps.accuracy)}m ↗</a>`:''}`;
    $('#sharedCard').hidden=false;$('#dismissShared').onclick=()=>{state.shared=null;$('#sharedCard').hidden=true;renderLocationPins();history.replaceState(null,'',location.pathname+location.search);};
  }else if(location.hash.startsWith('#place=')){const id=decodeURIComponent(location.hash.slice(7));if(poiById(id))openPlace(id);else toast('이 장소를 찾을 수 없어요.');}
  else if(location.hash.startsWith('#meet='))toast('공유 링크의 위치 정보가 올바르지 않아요.');
}
const routeCategoryNames={all:'전체',attraction:'어트랙션',food:'식당·카페',shop:'기념품·체험'};
const quickFacilityKinds=['restroom','battery','locker','water','firstaid','atm'];
function currentRouteOrigin(){const p=state.position;if(!p)return null;if(p.source==='estimated'&&(positionIsStale(p)||p.accuracyM>75&&!p.confirmed))return null;return {...p,pdf:toPDF(p),name:p.source==='estimated'?'현위치(추정)':'현위치'};}
function routePlaceLabel(p){return p.category==='facility'?`${nearest(p)?.name??floorLabel(p.floor)} 부근 ${kindNames[p.kind]??p.name}`:p.name;}
function facilityQueryKinds(query){
  const q=normalizeName(query);if(!q)return [];
  const aliases={restroom:'화장실 toilet wc',battery:'보조배터리 배터리 충전',locker:'물품보관함 보관함 짐',water:'음수대 정수기 마실물',firstaid:'의무실 응급실',aed:'aed 자동심장충격기 제세동기',atm:'atm 현금지급기 현금',baby:'베이비라운지 수유실',stairs:'계단',elevator:'엘리베이터 승강기 엘베',escalator:'에스컬레이터',stroller:'유모차',wheelchair:'휠체어',smoking:'흡연실',prayer:'기도실',lostfound:'분실물',info:'안내소 손님상담실'};
  return Object.keys(aliases).filter(k=>normalizeName(aliases[k]).includes(q));
}
function routePlaceButton(p){
  const selected=state.routeDraft.toId===p.id;
  return `<button class="route-place ${selected?'selected':''}" type="button" data-route-destination="${esc(p.id)}" aria-pressed="${selected}"><span class="route-place-icon ${p.category}">${icon(poiIcon(p))}</span><span><strong>${esc(p.name)}</strong><small>${esc(floorLabel(p.floor))}${p.x===null?' · 공식 위치 지도':''}</small></span><span class="route-place-check">${selected?icon('check'):icon('plus')}</span></button>`;
}
function renderRouteDestinations(){
  const draft=state.routeDraft,from=currentRouteOrigin();
  $('#routeTo').value=draft.toId??'';
  $('#routeOriginText').textContent=from?`${floorLabel(from.floor)} · ${positionName(from)}`:'지도에서 현재 위치를 지정하세요';
  $('#pickRouteStart').textContent=from?'변경':'위치 지정';
  $('#routeSearch').value=draft.query;
  $('#clearRouteSearch').hidden=!draft.query;
  $('#routeCategories').innerHTML=Object.entries(routeCategoryNames).map(([id,name])=>`<button type="button" data-route-category="${id}" aria-pressed="${draft.category===id}" class="${draft.category===id?'active':''}">${name}</button>`).join('');
  $('#routeQuickFacilities').innerHTML=quickFacilityKinds.map(kind=>`<button type="button" data-route-nearest="${kind}" class="${draft.nearestKind===kind?'active':''}" aria-pressed="${draft.nearestKind===kind}">${icon(kind)}${esc(kindNames[kind])}</button>`).join('');
  const list=$('#routeDestinations');
  if(draft.nearestKind){
    const choice=from?nearbyFacilities(from,park.pois,walkways.floors,{kinds:[draft.nearestKind]})[0]:null;
    const existsHere=from&&park.pois.some(p=>p.category==='facility'&&p.kind===draft.nearestKind&&p.floor===from.floor);
    list.innerHTML=`<div class="route-nearest-selection">${icon(draft.nearestKind)}<div><strong>가까운 ${esc(kindNames[draft.nearestKind])}</strong><p>${choice?esc(routePlaceLabel(choice.poi)):from?existsHere?'시설까지 연결된 통로를 찾지 못했습니다.':'다른 층의 가까운 시설을 찾습니다.':'현위치를 지정하면 가까운 곳을 추천합니다.'}</p></div></div>`;
    return;
  }
  const query=draft.query.trim();const queryKinds=facilityQueryKinds(query);
  const entries=park.pois.filter(p=>p.category!=='facility'&&p.name!=='오픈예정'&&(draft.category==='all'||p.category===draft.category)&&(!query||normalizeName(`${p.name} ${p.description} ${floorLabel(p.floor)}`).includes(normalizeName(query))));
  entries.sort((a,b)=>Number(b.floor===(from?.floor??state.floor))-Number(a.floor===(from?.floor??state.floor))||a.name.localeCompare(b.name,'ko'));
  const shortcuts=queryKinds.map(kind=>`<button class="route-facility-result" type="button" data-route-nearest="${kind}">${icon(kind)}<span>가까운 ${esc(kindNames[kind])} 찾기</span>${icon('route')}</button>`).join('');
  let html=shortcuts;
  for(const category of ['attraction','food','shop']){
    const group=entries.filter(p=>p.category===category);
    if(!group.length)continue;
    const limited=!query&&draft.category==='all'?group.slice(0,4):group;
    html+=`<section class="route-place-group"><h3>${routeCategoryNames[category]} <span>${group.length}</span></h3>${limited.map(routePlaceButton).join('')}${limited.length<group.length?`<button class="route-show-all" type="button" data-route-category="${category}">${routeCategoryNames[category]} 전체 보기</button>`:''}</section>`;
  }
  list.innerHTML=html||'<p class="route-empty">검색 결과가 없습니다.</p>';
}
function openRoute(toId=null,{nearestKind=null,preserve=false}={}){
  if(!preserve)state.routeDraft={toId:null,nearestKind:null,query:'',category:'all'};
  const p=toId?poiById(toId):null;
  if(p?.category==='facility')nearestKind=p.kind;
  if(nearestKind){state.routeDraft={toId:null,nearestKind,query:`가까운 ${kindNames[nearestKind]}`,category:'all'};}
  else if(p){state.routeDraft={toId:p.id,nearestKind:null,query:p.name,category:p.category};}
  renderRouteDestinations();$('#routeError').hidden=true;
  if(!$('#routeDialog').open)$('#routeDialog').showModal();
}
function selectRouteDestination(id){
  const p=poiById(id);if(!p||p.category==='facility')return;
  state.routeDraft.toId=id;state.routeDraft.nearestKind=null;state.routeDraft.query=p.name;
  $('#routeError').hidden=true;renderRouteDestinations();
}
function selectRouteFacility(kind){
  state.routeDraft={toId:null,nearestKind:kind,query:`가까운 ${kindNames[kind]}`,category:'all'};
  $('#routeError').hidden=true;renderRouteDestinations();
}
function showPlannedRoute(route,{destination,transfer=null,alternatives=[],nearestKind=null}){
  state.route={...route,fromName:'현위치',toName:destination.name,destinationId:destination.id,destinationFloor:destination.floor,transfer,alternatives,nearestKind};
  $('#routeDialog').close();closeDetail();setFloor(route.floor);mobileSheet(false);renderRoute();renderRouteCard();
}
function renderRouteCard(){
  const r=state.route,card=$('#routeCard');if(!r){card.hidden=true;return;}
  const destination=poiById(r.destinationId);
  const close=`<button class="icon-btn" type="button" data-clear-route aria-label="경로 지우기">${icon('close')}</button>`;
  if(r.transfer){
    card.innerHTML=`${close}<span class="route-card-badge">${esc(floorLabel(r.destinationFloor))} 목적지</span><h3>먼저 가까운 이동시설로</h3><p>${esc(routePlaceLabel(r.transfer))}</p><div class="transfer-choices">${r.alternatives.map(a=>`<button type="button" data-transfer-choice="${esc(a.poi.id)}" class="${r.transfer.id===a.poi.id?'active':''}" aria-pressed="${r.transfer.id===a.poi.id}">${icon(a.poi.kind)}${a.poi.kind==='elevator'?'승강기':esc(kindNames[a.poi.kind])}</button>`).join('')}</div><button class="btn btn-primary btn-full" type="button" data-route-continue>${esc(r.destinationFloor==='MAGIC'?'매직아일랜드':r.destinationFloor)} 도착 후 계속 ${icon('route')}</button>`;
  }else{
    card.innerHTML=`${close}${r.nearestKind?`<span class="route-card-badge">가까운 ${esc(kindNames[r.nearestKind])} 추천</span>`:''}<h3>${esc(destination?routePlaceLabel(destination):r.toName)}</h3><p>${esc(floorLabel(r.floor))} · 현위치에서 출발</p>`;
  }
  card.hidden=false;
}
function continueRouteAfterTransfer(){
  const r=state.route;if(!r?.transfer)return;
  const destinationId=r.destinationId,nearestKind=r.nearestKind;
  clearRoute();setFloor(poiById(destinationId).floor);
  state.routeAfterPick={toId:destinationId,nearestKind,autoRoute:true};
  beginPick();
}
function changeTransfer(id){
  const r=state.route,choice=r?.alternatives.find(a=>a.poi.id===id);if(!choice)return;
  const destination=poiById(r.destinationId);
  showPlannedRoute(choice.route,{destination,transfer:choice.poi,alternatives:r.alternatives,nearestKind:r.nearestKind});
}
function runRoute(event){
  event?.preventDefault();const draft=state.routeDraft,error=$('#routeError');
  const fail=msg=>{error.textContent=msg;error.hidden=false;};
  if(!draft.toId&&!draft.nearestKind){
    const q=normalizeName(draft.query),kinds=facilityQueryKinds(draft.query);
    const matches=q?park.pois.filter(p=>p.category!=='facility'&&(draft.category==='all'||p.category===draft.category)&&normalizeName(p.name).includes(q)):[];
    if(matches.length===1)draft.toId=matches[0].id;
    else if(kinds.length===1)draft.nearestKind=kinds[0];
    else return fail('목적지를 검색해서 선택해 주세요.');
  }
  const from=currentRouteOrigin();
  if(!from){state.routeAfterPick={toId:draft.toId,nearestKind:draft.nearestKind,autoRoute:true};$('#routeDialog').close();openLocation({getGPS:!state.tracking});return;}
  let to=draft.toId?poiById(draft.toId):null;
  if(draft.nearestKind){
    const match=nearbyFacilities(from,park.pois,walkways.floors,{kinds:[draft.nearestKind]})[0];
    if(!match){
      const sameFloor=park.pois.some(p=>p.kind===draft.nearestKind&&p.floor===from.floor);
      if(sameFloor)return fail('이 시설까지 연결된 통로가 아직 등록되지 않았습니다.');
      const levels={B1:0,'1F':1,'2F':2,'3F':3,'4F':4,MAGIC:2};
      const other=park.pois.filter(p=>p.kind===draft.nearestKind&&p.x!==null&&p.floor!==from.floor).sort((a,b)=>Math.abs(levels[a.floor]-levels[from.floor])-Math.abs(levels[b.floor]-levels[from.floor]));
      const choices=transferRecommendations(from,park.pois,walkways.floors);
      if(other.length&&choices.length)return showPlannedRoute(choices[0].route,{destination:other[0],transfer:choices[0].poi,alternatives:choices,nearestKind:draft.nearestKind});
      return fail(`가까운 ${kindNames[draft.nearestKind]}을 찾지 못했습니다.`);
    }
    return showPlannedRoute(match.route,{destination:match.poi,nearestKind:draft.nearestKind});
  }
  if(!to)return fail('목적지를 다시 선택해 주세요.');
  if(from.floor!==to.floor){
    const choices=transferRecommendations(from,park.pois,walkways.floors);
    if(!choices.length)return fail('이 위치에서 연결되는 이동시설을 찾지 못했습니다. 위치를 통로 위에 다시 지정해 주세요.');
    return showPlannedRoute(choices[0].route,{destination:to,transfer:choices[0].poi,alternatives:choices});
  }
  if(to.x===null){
    if(officialEntry(to)?.detail?.position){$('#routeDialog').close();openOfficialMap(to);return;}
    return fail('이 장소의 지도 위치가 아직 등록되지 않았습니다.');
  }
  if(to.note?.includes('두 곳'))return fail('지도 번호가 중복된 장소입니다. 공식 위치 지도로 확인해 주세요.');
  try{showPlannedRoute(corridorRoute(from.floor,from,to,walkways.floors[from.floor]),{destination:to});}
  catch(e){fail(e.message==='TOO_FAR'?'통로 가까이에서 현위치를 다시 지정해 주세요.':'이 위치에서 이어지는 통로를 찾지 못했습니다.');}
}
function clearRoute(){state.route=null;$('#routeLayer').innerHTML='';$('#routeCard').hidden=true;}

function renderRoute(){
  const r=state.route,svg=$('#routeLayer');if(!r||r.floor!==state.floor){svg.innerHTML='';return;}
  const pts=r.points.map(pdf=>{const p=fromPDF(r.floor,pdf);return `${p.x},${p.y}`;}).join(' ');
  const start=fromPDF(r.floor,r.from),end=fromPDF(r.floor,r.to),first=fromPDF(r.floor,r.points[0]),last=fromPDF(r.floor,r.points.at(-1));
  svg.innerHTML=`<polyline class="route-outline" points="${pts}"/><polyline class="route-path" points="${pts}"/><path class="route-connector" d="M${start.x},${start.y} L${first.x},${first.y} M${last.x},${last.y} L${end.x},${end.y}"/>`;
}
async function refreshOfficial(){
  try{const response=await fetch('data/official.json',{cache:'no-cache'});if(response.ok){const data=await response.json();if(Array.isArray(data.attractions))official=data;}}catch{}
  if(park){combineOfficial();renderList();renderPins();if(state.selected&&poiById(state.selected))renderDetail(poiById(state.selected));}
}

function bindMapGestures(){
  const stage=$('#map'),active=new Map();let gesture=null,moved=false,down=null;
  const local=e=>{const r=stage.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  const ignored=target=>target.closest('button,a,.detail-panel,.route-card,.shared-card');
  stage.addEventListener('wheel',e=>{if(ignored(e.target))return;e.preventDefault();const p=local(e);zoom(Math.exp(-e.deltaY*.0015),p.x,p.y);},{passive:false});
  stage.addEventListener('pointerdown',e=>{if(ignored(e.target)||e.button>0)return;active.set(e.pointerId,local(e));stage.setPointerCapture(e.pointerId);moved=false;down={...local(e),id:e.pointerId};if(active.size===1)gesture={type:'pan',last:local(e)};else if(active.size===2){const [a,b]=[...active.values()];gesture={type:'pinch',distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};moved=true;}});
  stage.addEventListener('pointermove',e=>{if(!active.has(e.pointerId))return;const p=local(e);active.set(e.pointerId,p);if(down&&Math.hypot(p.x-down.x,p.y-down.y)>5)moved=true;if(active.size===2){const[a,b]=[...active.values()],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(gesture?.type==='pinch'&&gesture.distance>0){zoom(d/gesture.distance,c.x,c.y);view.x+=c.x-gesture.center.x;view.y+=c.y-gesture.center.y;applyTransform();}gesture={type:'pinch',distance:d,center:c};}else if(gesture?.type==='pan'){view.x+=p.x-gesture.last.x;view.y+=p.y-gesture.last.y;gesture.last=p;applyTransform();}});
  const finish=(e,cancel=false)=>{if(!active.has(e.pointerId))return;const p=local(e),wasMulti=gesture?.type==='pinch';active.delete(e.pointerId);if(state.pick&&!moved&&!cancel&&!wasMulti){const x=(p.x-view.x)/view.scale/view.width*1000,y=(p.y-view.y)/view.scale/view.height*1000;if(x>=0&&x<=1000&&y>=0&&y<=1000)setManualPosition({floor:state.floor,x,y});else toast('지도 안에서 현재 위치를 눌러 주세요.');}if(active.size===1)gesture={type:'pan',last:[...active.values()][0]};else gesture=null;down=null;};
  stage.addEventListener('pointerup',e=>finish(e));stage.addEventListener('pointercancel',e=>finish(e,true));
  stage.addEventListener('dblclick',e=>{if(ignored(e.target)||state.pick)return;const p=local(e);zoom(1.5,p.x,p.y);});
  stage.addEventListener('keydown',e=>{if(e.target!==stage)return;if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','0','Enter'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')zoom(1.25);if(e.key==='-')zoom(.8);if(e.key==='0')fitMap();if(e.key==='ArrowLeft')view.x+=40;if(e.key==='ArrowRight')view.x-=40;if(e.key==='ArrowUp')view.y+=40;if(e.key==='ArrowDown')view.y-=40;if(e.key==='Enter'&&state.pick){const x=($('#map').clientWidth/2-view.x)/view.scale/view.width*1000,y=($('#map').clientHeight/2-view.y)/view.scale/view.height*1000;setManualPosition({floor:state.floor,x,y});}applyTransform();});
  new ResizeObserver(()=>{if(park)fitMap();}).observe(stage);
}

function bindEvents(){
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if('recLocate'in b.dataset){beginPick();return;}
    if(b.dataset.recCategory){state.rec.category=b.dataset.recCategory;saveRecommendations();renderRecommendations();return;}
    if(b.dataset.recPreference){const c=state.rec,k=b.dataset.recPreference,old=Array.isArray(c.preferences[c.category])?c.preferences[c.category]:[];c.preferences[c.category]=old.includes(k)?old.filter(x=>x!==k):[...old,k];saveRecommendations();renderRecommendations();return;}
    if(b.dataset.locationLandmark){const p=poiById(b.dataset.locationLandmark);if(p){$('#locationDialog').close();setManualPosition(p);}return;}
    if(b.dataset.routeDestination){selectRouteDestination(b.dataset.routeDestination);return;}
    if(b.dataset.routeNearest){selectRouteFacility(b.dataset.routeNearest);return;}
    if(b.dataset.routeCategory){if(state.routeDraft.nearestKind||state.routeDraft.toId)state.routeDraft.query='';state.routeDraft.category=b.dataset.routeCategory;state.routeDraft.nearestKind=null;state.routeDraft.toId=null;$('#routeError').hidden=true;renderRouteDestinations();return;}
    if(b.dataset.transferChoice){changeTransfer(b.dataset.transferChoice);return;}
    if('routeContinue'in b.dataset){continueRouteAfterTransfer();return;}
    if('clearRoute'in b.dataset){clearRoute();renderPins();return;}
    if(b.dataset.favorite){toggleFavorite(b.dataset.favorite);return;}
    if(b.dataset.openPlace){openPlace(b.dataset.openPlace);return;}
    if(b.dataset.category){setCategory(b.dataset.category);return;}
    if(b.dataset.floor){setFloor(b.dataset.floor);return;}
    if('kind'in b.dataset){state.kind=b.dataset.kind||null;renderList();renderPins();return;}
    if('detailClose'in b.dataset){closeDetail();return;}
    if(b.dataset.routeTo){openRoute(b.dataset.routeTo);return;}
    if(b.dataset.setPosition){setManualPosition(poiById(b.dataset.setPosition));return;}
    if(b.dataset.sharePlace){const u=new URL(location.href);u.hash=`place=${encodeURIComponent(b.dataset.sharePlace)}`;if(navigator.share)navigator.share({title:poiById(b.dataset.sharePlace).name,text:'롯데월드야호에서 이 장소를 확인해 봐!',url:u.href}).catch(err=>{if(err.name!=='AbortError')copy(u.href);});else copy(u.href);return;}
    if('closeDialog'in b.dataset){const d=b.closest('dialog');if(d.id==='locationDialog'){state.routeAfterPick=null;state.shareAfterPick=false;}d.close();}
  });
  $('#search').addEventListener('input',e=>{state.query=e.target.value;state.allFloors=!!state.query;if(state.query){state.category='all';state.kind=null;}renderList();renderPins();});
  $('#scopeFloor').onclick=()=>{state.allFloors=false;renderList();renderPins();};$('#scopeAll').onclick=()=>{state.allFloors=true;renderList();renderPins();};
  $('#clearFilters').onclick=()=>{state.query='';state.kind=null;$('#search').value='';renderList();renderPins();};
  const showMap=()=>{state.recommendations=false;state.favoritesOnly=false;renderList();renderPins();mobileSheet(false);};
  const showFavorites=()=>{state.recommendations=false;state.favoritesOnly=true;state.allFloors=true;state.category='all';state.query='';state.kind=null;$('#search').value='';renderList();renderPins();mobileSheet(true);};
  const showRecommendations=()=>{state.recommendations=true;state.favoritesOnly=false;renderList();mobileSheet(true);};
  $('#navRecommendations').onclick=showRecommendations;$('#mobileRecommendations').onclick=showRecommendations;
  $('#clearLocation').onclick=clearCurrentLocation;
  $('#navMap').onclick=showMap;$('#mobileMap').onclick=showMap;$('#navFavorites').onclick=showFavorites;$('#mobileFavorites').onclick=showFavorites;
  $('#openSearch').onclick=()=>{state.recommendations=false;state.favoritesOnly=false;renderList();mobileSheet(true);$('#search').focus();};
  $('#mobileList').onclick=()=>{state.recommendations=false;state.favoritesOnly=false;renderList();mobileSheet(true);};$('#closeSearch').onclick=()=>mobileSheet(false);
  $('#zoomIn').onclick=()=>zoom(1.3);$('#zoomOut').onclick=()=>zoom(1/1.3);$('#fitMap').onclick=fitMap;
  $('#manualLocation').onclick=()=>beginPick();$('#cancelPick').onclick=()=>{state.shareAfterPick=false;endPick();};
  $('#locate').onclick=()=>openLocation({getGPS:!state.tracking});
  $('#shareLocation').onclick=openShare;$('#mobileShare').onclick=openShare;
  $('#resetSharePosition').onclick=()=>beginPick(true);
  $('#copyShare').onclick=()=>copy($('#shareUrl').value);
  $('#nativeShare').onclick=async()=>{try{await navigator.share({title:'롯데월드야호 · 여기서 만나!',text:'내가 공유한 순간의 위치야. 선택한 층도 확인해 줘!',url:$('#shareUrl').value});}catch(err){if(err.name!=='AbortError')copy($('#shareUrl').value);}};
  $('#openRoute').onclick=()=>openRoute();$('#mobileRoute').onclick=()=>openRoute();$('#routeForm').onsubmit=runRoute;
  $('#pickRouteStart').onclick=()=>{state.routeAfterPick={toId:state.routeDraft.toId,nearestKind:state.routeDraft.nearestKind,autoRoute:false};if(state.position)setFloor(state.position.floor);beginPick();};
  $('#routeSearch').addEventListener('input',e=>{state.routeDraft.query=e.target.value;state.routeDraft.toId=null;state.routeDraft.nearestKind=null;state.routeDraft.category='all';$('#routeError').hidden=true;renderRouteDestinations();});
  $('#locationDialog').addEventListener('cancel',()=>{state.routeAfterPick=null;state.shareAfterPick=false;});
  $('#clearRouteSearch').onclick=()=>{state.routeDraft={toId:null,nearestKind:null,query:'',category:'all'};renderRouteDestinations();$('#routeSearch').focus();};
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.target.closest('input,select,textarea')){e.preventDefault();state.recommendations=false;renderList();mobileSheet(true);$('#search').focus();}if(e.key==='Escape'&&!$$('dialog[open]').length){if(state.pick)endPick();else if(state.selected)closeDetail();else mobileSheet(false);}});
  window.addEventListener('hashchange',readHash);window.addEventListener('online',()=>{updateLocationUI();refreshOfficial();});window.addEventListener('offline',updateLocationUI);
  $('#mapImage').addEventListener('error',()=>{toast('지도 이미지를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');$('#mapImage').dataset.error='true';});
  bindMapGestures();
}

async function init(){
  try{
    const responses=await Promise.all([fetch('data/park.json'),fetch('data/walkways.json'),fetch('data/georeference.json')]);
    if(responses.some(r=>!r.ok))throw new Error('Data unavailable');[park,walkways,georeference]=await Promise.all(responses.map(r=>r.json()));guidePois=park.pois;
    try{localAssets=await fetch('data/local-assets.json').then(r=>r.ok?r.json():{});}catch{}
    bindEvents();setFloor('1F');updateLocationUI();await refreshOfficial();readHash();
    setInterval(()=>{if(!document.hidden)refreshOfficial();},30*60000);
    setInterval(()=>{if(state.tracking){renderLocationPins();updateLocationUI();}},5000);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;disableMotion();}else if(state.tracking){state.gpsPending=true;fixFilter.reset();startWatch();updateLocationUI();}});
    window.addEventListener('pagehide',()=>{if(gpsWatch!==null)navigator.geolocation.clearWatch(gpsWatch);gpsWatch=null;disableMotion();});
    if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('sw.js').catch(()=>{});
  }catch(e){console.error(e);$('#placeList').innerHTML='<div class="empty-state"><strong>지도를 펼치지 못했어요</strong>연결을 확인하고 새로고침해 주세요.<br><a href="assets/guide-2026.pdf">원본 가이드맵 보기 ↗</a></div>';$('#resultCount').textContent='연결 확인 필요';}
}
init();
