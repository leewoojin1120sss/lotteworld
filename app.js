import {escapeHTML as esc,normalizeName,isMapPoint,isParkGPS,encodeShare,decodeShare,waitState,corridorRoute} from './lib.js';

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
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
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
let toastTimer,park,guidePois,walkways,official={},waits={},localAssets={};
const safeStored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const storedFavs=safeStored('yaho-favorites',[]);
const state={floor:'1F',category:'attraction',query:'',allFloors:false,favoritesOnly:false,kind:null,favorites:new Set(Array.isArray(storedFavs)?storedFavs.filter(v=>typeof v==='string'):[]),selected:null,position:null,gps:null,gpsPending:false,gpsError:'',pick:false,shareAfterPick:false,routeAfterPick:null,shared:null,route:null};
const view={x:0,y:0,scale:1,fit:1,width:1070,height:760};
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function mobileSheet(open){$('#sidebar').classList.toggle('mobile-open',open);$('#mobileList').classList.toggle('active',open&&!state.favoritesOnly);$('#mobileMap').classList.toggle('active',!open);$('#mobileFavorites').classList.toggle('active',open&&state.favoritesOnly);}
function floorData(id=state.floor){return park.floors.find(f=>f.id===id);}
function floorLabel(id){return id==='MAGIC'?'매직아일랜드':id==='B1'?'B1 언더랜드':`${id} 어드벤처`;}
function toPDF(p){const f=floorData(p.floor),c=f.crop;return [c[0]+p.x/1000*f.width,c[1]+p.y/1000*f.height];}
function fromPDF(floor,pdf){const f=floorData(floor);return {floor,x:(pdf[0]-f.crop[0])/f.width*1000,y:(pdf[1]-f.crop[1])/f.height*1000};}
function poiIcon(p){return p.category==='facility'?(p.kind??'info'):{attraction:'sparkles',food:'food',shop:'bag'}[p.category];}
function poiById(id){return park.pois.find(p=>p.id===id);}
function nearest(p,cat='attraction'){if(!p.pdf)return null;return park.pois.filter(q=>q.floor===p.floor&&q.category===cat&&q.pdf&&q.id!==p.id).sort((a,b)=>Math.hypot(a.pdf[0]-p.pdf[0],a.pdf[1]-p.pdf[1])-Math.hypot(b.pdf[0]-p.pdf[0],b.pdf[1]-p.pdf[1]))[0];}
function officialEntry(p){return p._official??null;}
function waitEntry(p){const o=officialEntry(p);return (waits.rides??[]).find(q=>o&&q.officialId===o.officialId||normalizeName(q.name)===normalizeName(p.name));}
const currentWait=p=>waitState(waitEntry(p),Date.now(),waits);
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
  const list=park.pois.filter(matches);
  $('#listTitle').textContent=state.favoritesOnly?'나의 즐겨찾기':state.query?`검색 결과`:state.kind?kindNames[state.kind]:names[state.category];
  $('#resultCount').textContent=`${list.length}곳`;
  $('#clearFilters').hidden=!state.query&&!state.kind;
  if(!list.length)$('#placeList').innerHTML=`<div class="empty-state">${icon(state.favoritesOnly?'heart':'search')}<strong>${state.favoritesOnly?'다음에 가고 싶은 곳을 모아보세요':'찾는 장소가 없어요'}</strong>${state.favoritesOnly?'장소 옆 하트를 누르면 여기에 모아드려요.':'다른 검색어를 쓰거나 모든 층에서 찾아보세요.'}</div>`;
  else $('#placeList').innerHTML=list.map(p=>{
    const w=p.category==='attraction'?currentWait(p):null;
    const subtitle=p.category==='facility'?(p.kind==='unknown'?'원본 범례 미표기 기호':`${nearest(p)?.name??floorLabel(p.floor)} 주변`):p.category==='food'?p.description:p.category==='shop'?p.description:'';
    const photo=p.category==='attraction'?localAssets.attractions?.[p._official?.officialId]:null;
    return `<article class="place-item ${state.selected===p.id?'selected':''}"><button type="button" class="place-open" data-open-place="${esc(p.id)}" aria-label="${esc(p.name)} · ${esc(floorLabel(p.floor))} 상세 보기"></button><div class="place-art ${p.category}">${photo?`<img src="${esc(photo)}" alt="" loading="lazy">`:icon(poiIcon(p))}</div><div class="place-text"><h3>${esc(p.name)}</h3><div class="place-meta"><span class="floor-chip">${esc(p.floor==='MAGIC'?'매직':p.floor)}</span><span>${esc(p.category==='facility'?kindNames[p.kind]??'편의시설':`${names[p.category]}${p.number?` · ${p.number}번`:' · 공식 웹 안내'}`)}</span>${w?`<span class="wait-tag ${w.kind}">${esc(w.label)}</span>`:''}</div>${subtitle?`<div class="place-sub">${esc(subtitle)}</div>`:''}</div>${favoriteButton(p)}</article>`;
  }).join('');
  $('#favoriteCount').textContent=state.favorites.size;
  $('#scopeFloor').classList.toggle('active',!state.allFloors);$('#scopeFloor').setAttribute('aria-pressed',String(!state.allFloors));
  $('#scopeAll').classList.toggle('active',state.allFloors);$('#scopeAll').setAttribute('aria-pressed',String(state.allFloors));
  $$('.category-tab').forEach(b=>{const on=b.dataset.category===state.category;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('#navMap').classList.toggle('active',!state.favoritesOnly);$('#navMap').setAttribute('aria-pressed',String(!state.favoritesOnly));
  $('#navFavorites').classList.toggle('active',state.favoritesOnly);$('#navFavorites').setAttribute('aria-pressed',String(state.favoritesOnly));
  $('#facilityFilters').hidden=state.category!=='facility';
  if(state.category==='facility'){
    const kinds=Object.keys(kindNames).filter(k=>park.pois.some(p=>p.kind===k&&(state.allFloors||p.floor===state.floor)));
    $('#facilityFilters').innerHTML=`<button type="button" data-kind="" class="${!state.kind?'active':''}">모두</button>`+kinds.map(k=>`<button type="button" data-kind="${k}" class="${state.kind===k?'active':''}">${kindNames[k]}</button>`).join('');
  }
}
function renderPins(){
  const items=park.pois.filter(p=>p.floor===state.floor&&p.x!==null).flatMap(p=>[p,...(p.alternatePDF??[]).map(pdf=>({...p,...fromPDF(p.floor,pdf)}))]);
  const pinVisible=p=>(state.category==='all'||p.category===state.category)&&(!state.kind||p.kind===state.kind)&&(!state.favoritesOnly||state.favorites.has(p.id))&&(!state.query||matches({...p,floor:state.floor}));
  items.sort((a,b)=>Number(pinVisible(a))-Number(pinVisible(b)));
  $('#mapPins').innerHTML=items.map(p=>{
    const visible=pinVisible(p);const on=state.selected===p.id;
    return `<button type="button" tabindex="${visible||on?'0':'-1'}" class="pin ${p.category} ${on?'selected':''} ${visible||on?'':'muted'}" style="left:${p.x/10}%;top:${p.y/10}%;${visible||on?'z-index:3;':''}" data-open-place="${esc(p.id)}" aria-label="${esc(p.name)} ${p.number?`${p.number}번`:''}" title="${esc(p.name)}">${p.category==='facility'?icon(poiIcon(p)):`<span>${p.number}</span>`}<span class="pin-label">${esc(p.name)}</span></button>`;
  }).join('');
  $('#mapPins').style.pointerEvents=state.pick?'none':'';
  $$('#mapPins button').forEach(b=>{if(state.pick)b.style.pointerEvents='none';});
  renderLocationPins();
}
function renderLocationPins(){
  const p=state.position,s=state.shared?.position;
  $('#locationPins').innerHTML=(p&&p.floor===state.floor?`<div class="location-dot" style="left:${p.x/10}%;top:${p.y/10}%"><span>내가 지정한 위치</span></div>`:'')+(s&&s.floor===state.floor?`<div class="location-dot shared" style="left:${s.x/10}%;top:${s.y/10}%"><span>공유받은 위치</span></div>`:'');
}
function applyTransform(){
  $('#mapWorld').style.transform=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;
  $('#mapWorld').style.setProperty('--inverse-scale',1/view.scale);
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
  $('#mapImage').src=f.image;$('#mapImage').alt=`${f.name} 공식 가이드맵`;
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
  const w=currentWait(p),o=officialEntry(p);const url=safeURL(o?.url)??(p.category==='attraction'?'https://adventure.lotteworld.com/enjoy/attrctn/list':p.category==='food'?'https://adventure.lotteworld.com/enjoy/restaurant/list':'https://adventure.lotteworld.com/usage-guide/service/convenient-facilities/information/list');
  const picture=localAssets.attractions?.[o?.officialId]??safeURL(o?.image);const detail=$('#detail');
  detail.innerHTML=`<div class="detail-top ${p.category}">${picture?`<img src="${esc(picture)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer">`:icon(poiIcon(p))}<button class="icon-btn detail-close" type="button" data-detail-close aria-label="상세 정보 닫기">${icon('close')}</button></div><div class="detail-body"><div class="detail-category"><span class="floor-chip">${esc(p.floor==='MAGIC'?'매직아일랜드':p.floor)}</span>${esc(names[p.category])}${p.number?` · 가이드맵 ${p.number}번`:''}</div><div class="detail-title-row"><h2>${esc(p.name)}</h2>${favoriteButton(p)}</div><p class="detail-description">${esc(p.description)}</p>${p.category==='attraction'?`<div class="detail-wait"><span>${icon('clock')}</span><div><strong>${esc(w.label)}</strong><small>${waitEntry(p)?.updatedAt?`원본 수신 ${esc(ageLabel(Date.parse(waitEntry(p).updatedAt)))}`:'확인된 공식 대기 시간만 표시합니다.'}</small></div></div>`:''}${o?.restrictions?`<p class="detail-location-note">${esc(typeof o.restrictions==='string'?o.restrictions:JSON.stringify(o.restrictions))}</p>`:''}${p.note?`<p class="detail-note">${esc(p.note)}</p>`:''}${p.kind==='unknown'?'<p class="detail-note">원본 범례에 없는 기호입니다. 시설 종류는 현장에서 확인해 주세요.</p>':''}<p class="detail-location-note">${p.x!==null?'공식 조감도의 표시 위치입니다. 실제 입구와 이용 여부는 현장 안내를 확인해 주세요.':'목록에 수록된 장소입니다. 정확한 위치는 원본 지도와 현장 안내를 확인해 주세요.'}</p><div class="detail-actions"><button class="btn btn-primary" type="button" data-route-to="${esc(p.id)}" ${p.x===null?'disabled':''}>${icon('route')}여기로 가기</button><button class="btn btn-subtle" type="button" data-set-position="${esc(p.id)}" ${p.x===null?'disabled':''}>${icon('pin')}나 여기 있어요</button></div><div class="detail-extra"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">공식 안내 ↗</a><button type="button" data-share-place="${esc(p.id)}">${icon('share')}장소 공유</button><a href="assets/guide-2026.pdf#page=${floorData(p.floor).page+1}" target="_blank" rel="noopener">원본 보기 ↗</a></div></div>`;
  const img=detail.querySelector('img');if(img)img.addEventListener('error',()=>img.replaceWith(document.createRange().createContextualFragment(icon(poiIcon(p)))),{once:true});
  if(o?.detail?.position||o?.detail?.locations?.length){
    const action=document.createElement('button');action.type='button';action.className=`btn ${p.x===null?'btn-primary':'btn-subtle'} btn-full official-map-button`;action.innerHTML=icon('map')+'공식 위치 지도 보기';action.addEventListener('click',()=>openOfficialMap(p));detail.querySelector('.detail-actions').before(action);
  }
  if(o?.source?.fetchedAt){const source=document.createElement('p');source.className='detail-source';source.textContent=`공식 웹 정보 확인: ${ageLabel(Date.parse(o.detail?.source?.fetchedAt??o.source.fetchedAt))}${o.source.stale?' · 최신 갱신 실패':''}`;detail.querySelector('.detail-extra').before(source);}
  detail.hidden=false;$('#mapTip').hidden=true;
}
function openOfficialMap(p){
  const o=officialEntry(p);if(!o)return;
  const locations=o.detail?.locations?.length?o.detail.locations:[o.detail?.position].filter(Boolean);
  const maps=o.detail?.maps??[];
  const body=$('#officialMapBody');
  body.innerHTML=`<label class="field-label" for="officialLocationSelect">${esc(p.name)}</label><select id="officialLocationSelect">${locations.map((loc,i)=>`<option value="${i}">${esc(maps.find(m=>m.id===loc.mapId)?.floorName??o.floorName)}${loc.location?` · ${esc(loc.location)}`:''}</option>`).join('')}</select><div id="officialMapFigure"></div><p class="form-note">공식 웹 안내의 위치입니다. 실제 입구와 통제 구간은 현장 표지로 확인해 주세요.</p>`;
  const render=i=>{const loc=locations[i],m=maps.find(a=>a.id===loc?.mapId)??(official.maps??[]).find(a=>a.id===loc?.mapId);if(!loc||!m)return;const image=localAssets.maps?.[m.id]??safeURL(m.imageUrl);$('#officialMapFigure').innerHTML=`<figure class="official-map-figure"><div style="aspect-ratio:${m.width}/${m.height}"><img src="${esc(image)}" alt="${esc(m.floorName)} 공식 위치 지도"><span class="official-position" style="left:${loc.x/m.width*100}%;top:${loc.y/m.height*100}%">${icon('pin')}</span></div><figcaption>${esc(m.floorName)} · 지도 © 롯데월드</figcaption></figure>`;};
  $('#officialLocationSelect').onchange=e=>render(Number(e.target.value));render(0);$('#officialMapDialog').showModal();
}
function closeDetail(){state.selected=null;$('#detail').hidden=true;renderList();renderPins();}
function beginPick(afterShare=false){state.pick=true;state.shareAfterPick=afterShare;closeDetail();$$('dialog[open]').forEach(d=>d.close());mobileSheet(false);$('#map').classList.add('picking');$('#pickBanner').hidden=false;renderPins();$('#map').focus({preventScroll:true});}
function endPick(){state.pick=false;state.shareAfterPick=false;state.routeAfterPick=null;$('#map').classList.remove('picking');$('#pickBanner').hidden=true;renderPins();}
function positionName(p){if(!p)return '';const n=nearest({floor:p.floor,pdf:toPDF(p)});return n?`${n.name} 부근`:`${floorLabel(p.floor)}에서 지정한 위치`;}
function setManualPosition(p){
  if(p.x===null||!isMapPoint(p)){toast('이 장소의 정확한 위치는 원본에 표시되어 있지 않아요.');return;}
  const after=state.shareAfterPick,routeAfter=state.routeAfterPick;
  state.position={floor:p.floor,x:p.x,y:p.y,at:Date.now()};state.shareAfterPick=false;endPick();
  updateLocationStatus();renderLocationPins();toast(`${floorLabel(p.floor)}에 내 위치를 표시했어요.`);
  if(after)openShare();
  else if(routeAfter)openRoute(routeAfter.toId);
}
function updateLocationStatus(){
  const s=$('#locationStatus');s.classList.toggle('located',!!state.position||!!state.gps);
  const text=state.position?`${state.position.floor==='MAGIC'?'매직아일랜드':state.position.floor} · 내가 지정한 위치${state.gps?' · GPS 별도 수신':''}`:state.gps?`GPS ±${Math.round(state.gps.accuracy)}m · 지도 위치는 직접 지정해 주세요`:state.gpsPending?'GPS를 수신하고 있어요…':!navigator.onLine?'오프라인 · 저장된 지도를 보고 있어요':'위치 권한 없이도 지도를 둘러볼 수 있어요';
  s.innerHTML=`<span class="status-dot"></span>${esc(text)}`;
}
function locationContent(){
  const g=state.gps;return `${g?`<div class="gps-reading"><h3>${isParkGPS(g)?'GPS를 수신했어요':'현재 GPS가 롯데월드 밖을 가리켜요'}</h3><p>위도 ${g.lat.toFixed(6)} · 경도 ${g.lng.toFixed(6)}<br>수신 오차 <strong>±${Math.round(g.accuracy)}m</strong> · ${esc(ageLabel(g.at))}</p></div>`:`<div class="gps-reading"><h3>${state.gpsPending?'GPS를 수신하고 있어요…':'내 위치를 지도에 표시해 보세요'}</h3><p>${esc(state.gpsError||'GPS 권한을 허용하거나, 지도를 눌러 직접 위치를 지정할 수 있어요.')}</p></div>`}<p class="gps-warning">선택한 층: <b>${esc(floorLabel(state.floor))}</b><br>실내 GPS에는 오차가 있습니다. 공식 지도는 기울어진 조감도여서 GPS를 핀으로 자동 변환하지 않아요. 현장에서 층을 선택하고 지도 위치를 직접 지정해 주세요.</p><div class="location-options"><button class="btn btn-primary" type="button" id="locationPick">${icon('pin')}지도에서 직접 지정</button><button class="btn btn-subtle" type="button" id="locationRetry" ${state.gpsPending?'disabled':''}>${icon('locate')}${g?'GPS 새로고침':'GPS 사용'}</button></div>${g?`<a class="text-button" href="https://www.google.com/maps/search/?api=1&query=${g.lat.toFixed(6)},${g.lng.toFixed(6)}" target="_blank" rel="noopener noreferrer">GPS 위치를 지리 지도에서 보기 ↗</a>`:''}${state.position?`<button class="text-button" type="button" id="removePosition">직접 지정한 내 위치 지우기</button>`:''}`;
}
function renderLocationDialog(){const body=$('#locationBody');body.innerHTML=locationContent();$('#locationPick').onclick=()=>beginPick(state.shareAfterPick);$('#locationRetry').onclick=()=>requestGPS();const remove=$('#removePosition');if(remove)remove.onclick=()=>{state.position=null;renderLocationPins();updateLocationStatus();renderLocationDialog();};}
function openLocation({getGPS=false}={}){renderLocationDialog();if(!$('#locationDialog').open)$('#locationDialog').showModal();if(getGPS)requestGPS();}
function requestGPS(){
  if(state.gpsPending)return;
  if(!window.isSecureContext||!navigator.geolocation){state.gpsError='이 환경에서는 GPS를 사용할 수 없어요. HTTPS로 접속하거나 지도에서 직접 지정해 주세요.';renderLocationDialog();return;}
  state.gpsPending=true;state.gpsError='';renderLocationDialog();updateLocationStatus();
  navigator.geolocation.getCurrentPosition(p=>{state.gpsPending=false;state.gps={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at:p.timestamp};renderLocationDialog();updateLocationStatus();},err=>{state.gpsPending=false;state.gpsError=err.code===1?'위치 권한이 꺼져 있어요. 브라우저의 사이트 권한을 확인하거나 직접 지정해 주세요.':err.code===3?'GPS 수신 시간이 길어지고 있어요. 다시 시도하거나 직접 지정해 주세요.':'현재 GPS 신호를 찾지 못했어요. 지도에서 위치를 직접 지정할 수 있어요.';renderLocationDialog();updateLocationStatus();},{enableHighAccuracy:true,timeout:15000,maximumAge:15000});
}
function openShare(){
  const gps=state.gps&&Date.now()-state.gps.at<120000?state.gps:null;
  if(!state.position&&!gps){state.shareAfterPick=true;openLocation();return;}
  const hash=encodeShare({position:state.position,gps,floor:state.position?.floor??state.floor});
  const url=new URL(location.href);url.hash=hash;$('#shareUrl').value=url.href;
  const floor=state.position?.floor??state.floor;
  $('#sharePreview').innerHTML=`${icon('pin')}<strong>${esc(floorLabel(floor))}</strong><p>${state.position?esc(positionName(state.position)):'GPS 좌표만 공유 · 조감도 핀 없음'}${gps?`<br>GPS 오차 ±${Math.round(gps.accuracy)}m`:''}<br>지금 위치의 일회성 링크</p>`;
  $('#nativeShare').hidden=!navigator.share;
  if(!$('#shareDialog').open)$('#shareDialog').showModal();
}
async function copy(text){try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);toast('링크를 복사했어요. 친구에게 보내 주세요.');return true;}catch{toast('링크를 선택한 뒤 직접 복사해 주세요.');$('#shareUrl').focus();$('#shareUrl').select();return false;}}
function readHash(){
  const shared=decodeShare(location.hash);
  if(shared){state.shared=shared;setFloor(shared.floor);if(shared.position)focusPoint(shared.position);
    const old=Date.now()-shared.at>60*60000;
    $('#sharedCard').innerHTML=`<button class="icon-btn" type="button" id="dismissShared" aria-label="공유 위치 표시 닫기">${icon('close')}</button><h3>친구가 공유한 위치</h3><p>${esc(floorLabel(shared.floor))} · ${esc(ageLabel(shared.at))}<br>${old?'한 시간 이상 지난 위치예요. 새 위치를 확인해 주세요.':'공유한 순간의 위치예요. 현재 위치와 다를 수 있어요.'}${!shared.position?'<br>GPS 좌표만 공유되어 지도 핀이 없습니다.':''}</p>${shared.gps?`<a class="text-button" href="https://www.google.com/maps/search/?api=1&query=${shared.gps.lat.toFixed(6)},${shared.gps.lng.toFixed(6)}" target="_blank" rel="noopener noreferrer">GPS 위치 보기 · ±${Math.round(shared.gps.accuracy)}m ↗</a>`:''}`;
    $('#sharedCard').hidden=false;$('#dismissShared').onclick=()=>{state.shared=null;$('#sharedCard').hidden=true;renderLocationPins();history.replaceState(null,'',location.pathname+location.search);};
  }else if(location.hash.startsWith('#place=')){const id=decodeURIComponent(location.hash.slice(7));if(poiById(id))openPlace(id);else toast('이 장소를 찾을 수 없어요.');}
  else if(location.hash.startsWith('#meet='))toast('공유 링크의 위치 정보가 올바르지 않아요.');
}
function optionHTML(p){return `<option value="${esc(p.id)}">${esc(p.floor==='MAGIC'?'매직':p.floor)} · ${esc(p.name)}${p.category==='facility'?` (${esc(p.id.split('-').at(-1))})`:''}</option>`;}
function openRoute(toId){
  const locatable=park.pois.filter(p=>p.x!==null&&p.kind!=='unknown');
  $('#routeFrom').innerHTML=(state.position?`<option value="my">내가 지정한 위치 · ${esc(state.position.floor)}</option>`:'<option value="" disabled selected>출발지를 선택해 주세요</option>')+locatable.map(optionHTML).join('');
  $('#routeTo').innerHTML='<option value="" disabled selected>도착지를 선택해 주세요</option>'+locatable.map(optionHTML).join('');
  if(state.shared?.position)$('#routeFrom').insertAdjacentHTML('afterbegin',`<option value="shared">공유받은 위치 · ${esc(state.shared.floor)}</option>`);
  if(toId)$('#routeTo').value=toId;
  $('#routeError').hidden=true;$('#routeDialog').showModal();
}
function routePoint(id){if(id==='my'&&state.position)return {...state.position,pdf:toPDF(state.position),name:'내가 지정한 위치'};if(id==='shared'&&state.shared?.position)return {...state.shared.position,pdf:toPDF(state.shared.position),name:'공유받은 위치'};return poiById(id);}
function runRoute(event){
  event.preventDefault();const from=routePoint($('#routeFrom').value),to=routePoint($('#routeTo').value);const error=$('#routeError');
  const fail=msg=>{error.textContent=msg;error.hidden=false;};
  if(!from||!to)return fail('출발지와 도착지를 선택해 주세요.');
  if(from.floor!==to.floor)return fail(`${floorLabel(from.floor)}에서 ${floorLabel(to.floor)}로 이동하는 층간 연결은 확인되지 않았습니다. 계단·엘리베이터·에스컬레이터는 편의시설 탭에서 확인하고, 목적지 층으로 이동한 뒤 다시 길을 찾아 주세요.`);
  if(from.note?.includes('두 곳')||to.note?.includes('두 곳'))return fail('원본 지도에서 같은 번호가 중복된 장소입니다. 정확한 입구를 확인한 뒤 지도에서 출발 위치를 지정해 주세요.');
  try{
    const route=corridorRoute(from.floor,from,to,walkways.floors[from.floor]);state.route={...route,fromName:from.name,toName:to.name};
    $('#routeDialog').close();closeDetail();setFloor(from.floor);mobileSheet(false);renderRoute();
    $('#routeCard').innerHTML=`<button class="icon-btn" type="button" id="clearRoute" aria-label="경로 지우기">${icon('close')}</button><h3>${esc(from.name)} → ${esc(to.name)}</h3><p>가이드맵 통로를 따라 표시한 참고 동선입니다.<br>점선은 장소와 통로를 잇는 참고선이에요. 입구·통제 구간은 현장에서 확인해 주세요.</p>`;$('#routeCard').hidden=false;$('#clearRoute').onclick=clearRoute;
  }catch(e){fail(e.message==='TOO_FAR'?'표시된 통로와 멀어 안전한 참고 동선을 만들 수 없어요. 통로에서 출발 위치를 다시 지정해 주세요.':'이 두 위치를 잇는 통로를 확인하지 못했어요. 현장 안내를 확인해 주세요.');}
}
function clearRoute(){state.route=null;$('#routeLayer').innerHTML='';$('#routeCard').hidden=true;}
function renderRoute(){
  const r=state.route,svg=$('#routeLayer');if(!r||r.floor!==state.floor){svg.innerHTML='';return;}
  const pts=r.points.map(pdf=>{const p=fromPDF(r.floor,pdf);return `${p.x},${p.y}`;}).join(' ');
  const start=fromPDF(r.floor,r.from),end=fromPDF(r.floor,r.to),first=fromPDF(r.floor,r.points[0]),last=fromPDF(r.floor,r.points.at(-1));
  svg.innerHTML=`<polyline class="route-outline" points="${pts}"/><polyline class="route-path" points="${pts}"/><path class="route-connector" d="M${start.x},${start.y} L${first.x},${first.y} M${last.x},${last.y} L${end.x},${end.y}"/>`;
}
async function refreshOfficial(){
  const results=await Promise.allSettled([fetch('data/official.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{}),fetch('data/waits.json',{cache:'no-cache'}).then(r=>r.ok?r.json():{})]);
  if(results[0].status==='fulfilled'&&Array.isArray(results[0].value?.attractions))official=results[0].value;
  if(results[1].status==='fulfilled'&&Array.isArray(results[1].value?.rides))waits=results[1].value;
  const fresh=(waits.rides??[]).filter(p=>waitState(p,Date.now(),waits).kind==='fresh').length;
  $('#waitStatus').innerHTML=fresh?`대기 정보 ${fresh}곳 · ${esc(ageLabel(Date.parse(waits.fetchedAt)))} ↗`:'대기 시간 미제공 · 공식 안내 ↗';
  $('#waitGuideText').textContent=fresh?'공식 공개 API에서 수신한 대기 정보입니다. 수신 후 5분이 지난 값은 숨깁니다. API의 현장 갱신 주기는 확인되지 않았으며, 현장 안내가 우선입니다.':'공식 대기 시간 API를 연동했지만 현재 확인된 대기 시간은 없습니다. 빈 응답을 0분으로 표시하지 않아요. 운영 중 데이터가 제공되면 표시하며, 수신 후 5분이 지난 값은 숨깁니다.';
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
    if(b.dataset.favorite){toggleFavorite(b.dataset.favorite);return;}
    if(b.dataset.openPlace){openPlace(b.dataset.openPlace);return;}
    if(b.dataset.category){setCategory(b.dataset.category);return;}
    if(b.dataset.floor){setFloor(b.dataset.floor);return;}
    if('kind'in b.dataset){state.kind=b.dataset.kind||null;renderList();renderPins();return;}
    if('detailClose'in b.dataset){closeDetail();return;}
    if(b.dataset.routeTo){openRoute(b.dataset.routeTo);return;}
    if(b.dataset.setPosition){setManualPosition(poiById(b.dataset.setPosition));return;}
    if(b.dataset.sharePlace){const u=new URL(location.href);u.hash=`place=${encodeURIComponent(b.dataset.sharePlace)}`;if(navigator.share)navigator.share({title:poiById(b.dataset.sharePlace).name,text:'롯데월드야호에서 이 장소를 확인해 봐!',url:u.href}).catch(err=>{if(err.name!=='AbortError')copy(u.href);});else copy(u.href);return;}
    if('closeDialog'in b.dataset)b.closest('dialog').close();
  });
  $('#search').addEventListener('input',e=>{state.query=e.target.value;state.allFloors=!!state.query;if(state.query){state.category='all';state.kind=null;}renderList();renderPins();});
  $('#scopeFloor').onclick=()=>{state.allFloors=false;renderList();renderPins();};$('#scopeAll').onclick=()=>{state.allFloors=true;renderList();renderPins();};
  $('#clearFilters').onclick=()=>{state.query='';state.kind=null;$('#search').value='';renderList();renderPins();};
  const showMap=()=>{state.favoritesOnly=false;renderList();renderPins();mobileSheet(false);};
  const showFavorites=()=>{state.favoritesOnly=true;state.allFloors=true;state.category='all';state.query='';state.kind=null;$('#search').value='';renderList();renderPins();mobileSheet(true);};
  $('#navMap').onclick=showMap;$('#mobileMap').onclick=showMap;$('#navFavorites').onclick=showFavorites;$('#mobileFavorites').onclick=showFavorites;
  const showGuide=()=>$('#guideDialog').showModal();$('#openGuide').onclick=showGuide;$('#mobileGuide').onclick=showGuide;$('#waitStatus').onclick=showGuide;
  $('#openSearch').onclick=()=>{state.favoritesOnly=false;renderList();mobileSheet(true);$('#search').focus();};
  $('#mobileList').onclick=()=>{state.favoritesOnly=false;renderList();mobileSheet(true);};$('#closeSearch').onclick=()=>mobileSheet(false);
  $('#zoomIn').onclick=()=>zoom(1.3);$('#zoomOut').onclick=()=>zoom(1/1.3);$('#fitMap').onclick=fitMap;
  $('#manualLocation').onclick=()=>beginPick();$('#cancelPick').onclick=()=>{state.shareAfterPick=false;endPick();};
  $('#locate').onclick=()=>openLocation({getGPS:!state.gps});
  $('#shareLocation').onclick=openShare;$('#mobileShare').onclick=openShare;
  $('#resetSharePosition').onclick=()=>beginPick(true);
  $('#copyShare').onclick=()=>copy($('#shareUrl').value);
  $('#nativeShare').onclick=async()=>{try{await navigator.share({title:'롯데월드야호 · 여기서 만나!',text:'내가 공유한 순간의 위치야. 선택한 층도 확인해 줘!',url:$('#shareUrl').value});}catch(err){if(err.name!=='AbortError')copy($('#shareUrl').value);}};
  $('#openRoute').onclick=()=>openRoute();$('#routeForm').onsubmit=runRoute;$('#pickRouteStart').onclick=()=>{state.routeAfterPick={toId:$('#routeTo').value};beginPick();};
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.target.closest('input,select,textarea')){e.preventDefault();mobileSheet(true);$('#search').focus();}if(e.key==='Escape'&&!$$('dialog[open]').length){if(state.pick)endPick();else if(state.selected)closeDetail();else mobileSheet(false);}});
  window.addEventListener('hashchange',readHash);window.addEventListener('online',()=>{updateLocationStatus();refreshOfficial();});window.addEventListener('offline',updateLocationStatus);
  $('#mapImage').addEventListener('error',()=>{toast('지도 이미지를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');$('#mapImage').dataset.error='true';});
  bindMapGestures();
}

async function init(){
  try{
    const responses=await Promise.all([fetch('data/park.json'),fetch('data/walkways.json')]);
    if(responses.some(r=>!r.ok))throw new Error('Data unavailable');[park,walkways]=await Promise.all(responses.map(r=>r.json()));guidePois=park.pois;
    try{localAssets=await fetch('data/local-assets.json').then(r=>r.ok?r.json():{});}catch{}
    bindEvents();setFloor('1F');updateLocationStatus();await refreshOfficial();readHash();
    setInterval(()=>{if(!document.hidden)refreshOfficial();},120000);
    if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('sw.js').catch(()=>{});
  }catch(e){console.error(e);$('#placeList').innerHTML='<div class="empty-state"><strong>지도를 펼치지 못했어요</strong>연결을 확인하고 새로고침해 주세요.<br><a href="assets/guide-2026.pdf">원본 가이드맵 보기 ↗</a></div>';$('#resultCount').textContent='연결 확인 필요';}
}
init();
