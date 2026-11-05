import {escapeHTML as esc} from './lib.js';
const SUBMISSION_URL='https://script.google.com/macros/s/AKfycby1ae0P6gI2I-hvCeAV67g7S39v3t4HOh3jlKgOUIZz9iS0h4IugMFp7v7SD1G67JOoJg/exec';
export const MISSION_VERSION=2;
export const COMMON_MISSIONS=[
 {id:'common-1',title:'민경서 선생님 만나 사진 찍기'},
 {id:'common-2',title:'어트랙션 탑승하기'},
 {id:'common-3',title:'점심 식사하기'},
 {id:'common-4',title:'간식 또는 기념품 구매하기'}
];
export const OPTIONAL_MISSIONS=[
 ['윤현진 선생님 만나 사진 찍기',''],['회전목마 앞에서 사진 찍기',''],['메이플 아일랜드 방문하기',''],['화장실 방문하기',''],['에비앙 사 마시기',''],['4층에서 아이스링크장 바라보기',''],['오락실에서 게임 한 판 하기',''],['모노레일 또는 풍선비행 타기',''],['다크라이드 1개 타기','신밧드의 모험 · 환타지 드림 · 혜성특급 · 파라오의 분노 · 드래곤 와일드 슈팅 · 콩X고질라:더라이드'],['물 맞기','후룸라이드 탑승 또는 그냥 물 맞기'],['와일드투어 1개 타기','와일드윙 · 와일드밸리 · 와일드정글'],['친구한테 선물 주기',''],['친구와 사진 찍기',''],['자이로 어트랙션 1개 타기','자이로드롭 · 자이로스윙 · 자이로스핀'],['롯데월드타워 사진 찍기',''],['동심으로 돌아가 어트랙션 타기','회전목마 · 범퍼카 · 회전바구니'],['롤러코스터류 1개 타기','후렌치레볼루션 · 아트란티스 · 혜성특급 · 스톤익스프레스 · 후룸라이드 · 신밧드의 모험 · 환타지 드림'],
 ['롯데월드 캐릭터와 사진 찍기','그림 · 인형탈 모두 가능'],['매직캐슬을 배경으로 사진 찍기',''],['숫자 4가 쓰인 표지판 찾기',''],['음수대에서 물 마시기',''],['머리띠 쓰고 돌아다니기',''],['친구의 어트랙션 탑승 장면 찍어주기',''],['사람이 없는 곳 가보기',''],['벤치에 앉아 잠시 쉬기','']
].map(([title,description],i)=>({id:`optional-${i+1}`,title,description}));
function random(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
function shuffle(items,rng){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
// Every draw uses the full pool, including missions from previous draws.
// The teacher has 4x the final inclusion probability of each other mission.
export function drawOptionalMissions(rng=random){
 const teacher=OPTIONAL_MISSIONS[0],others=OPTIONAL_MISSIONS.slice(1);
 const includeTeacher=rng()<16/(others.length+4);
 const chosen=shuffle(others,rng).slice(0,includeTeacher?3:4);
 return shuffle(includeTeacher?[teacher,...chosen]:chosen,rng).map(m=>m.id);
}
function newBoard(optionalIds=drawOptionalMissions()){
 const revision=Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-');
 return {id:'board',version:MISSION_VERSION,revision,optionalIds,createdAt:new Date().toISOString()};
}
export function boardMissions(board){const ids=board?.optionalIds;if(!Array.isArray(ids)||ids.length!==4||new Set(ids).size!==4||ids.some(id=>!OPTIONAL_MISSIONS.some(m=>m.id===id)))throw Error('저장된 미션을 읽을 수 없어요.');return [...COMMON_MISSIONS,...ids.map(id=>OPTIONAL_MISSIONS.find(m=>m.id===id))];}
export function exportLayout(count){if(!Number.isInteger(count)||count<1||count>8)throw Error('완료한 미션을 먼저 선택해 주세요.');const width=2400,columns=count===1?1:2,gap=48,margin=80,cardWidth=(width-margin*2-gap*(columns-1))/columns,photoHeight=count===1?2200:1000,cardHeight=photoHeight+260,rows=Math.ceil(count/columns);return {width,height:340+rows*(cardHeight+gap)+60,columns,gap,margin,cardWidth,photoHeight,cardHeight};}
export function openMissionDB(){return new Promise((resolve,reject)=>{
 if(!globalThis.indexedDB)return reject(Error('이 브라우저에서 사진 저장을 사용할 수 없어요.'));
 const q=indexedDB.open('yaho-missions',MISSION_VERSION);
 q.onupgradeneeded=()=>{for(const name of ['state','photos'])if(!q.result.objectStoreNames.contains(name))q.result.createObjectStore(name,{keyPath:'id'});};
 q.onsuccess=()=>{const db=q.result;db.onversionchange=()=>db.close();resolve(db);};
 q.onerror=()=>reject(q.error);q.onblocked=()=>reject(Error('다른 탭을 닫고 다시 열어 주세요.'));
});}
export function loadMissionBoard(db){return new Promise((resolve,reject)=>{
 const tx=db.transaction(['state','photos'],'readwrite'),s=tx.objectStore('state');let board;
 const q=s.get('board');q.onsuccess=()=>{
  board=q.result;
  // Reset the old mission edition and its photos together, once per browser.
  if(!board||board.version!==MISSION_VERSION){board=newBoard();tx.objectStore('photos').clear();s.put(board);}
 };
 tx.oncomplete=()=>resolve(board);tx.onabort=()=>reject(tx.error||Error('미션을 저장하지 못했어요.'));
});}
export function readMissionSnapshot(db){return new Promise((resolve,reject)=>{
 const tx=db.transaction(['state','photos']);let board,photos;
 tx.objectStore('state').get('board').onsuccess=e=>{board=e.target.result;};
 tx.objectStore('photos').getAll().onsuccess=e=>{photos=e.target.result;};
 tx.oncomplete=()=>resolve({board,photos});tx.onabort=()=>reject(tx.error||Error('미션을 읽지 못했어요.'));
});}
export async function readMissionPhotos(db){return (await readMissionSnapshot(db)).photos;}
function staleBoard(){return Error('다른 탭에서 미션이 바뀌었어요. 다시 선택해 주세요.');}
export function writeMissionPhoto(db,record,expectedRevision){return new Promise((resolve,reject)=>{
 const tx=db.transaction(['state','photos'],'readwrite');let failure;
 tx.objectStore('state').get('board').onsuccess=e=>{
  const board=e.target.result;
  if(board?.version!==MISSION_VERSION||(expectedRevision&&board.revision!==expectedRevision)||!boardMissions(board).some(m=>m.id===record.id)){failure=staleBoard();tx.abort();return;}
  tx.objectStore('photos').put(record);
 };
 tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure||tx.error||Error('사진을 저장하지 못했어요.'));
});}
export function rerollMissionBoard(db,expectedRevision,rng=random){return new Promise((resolve,reject)=>{
 const tx=db.transaction(['state','photos'],'readwrite');let board,failure;
 tx.objectStore('state').get('board').onsuccess=e=>{
  const old=e.target.result;
  if(old?.version!==MISSION_VERSION||old.revision!==expectedRevision){failure=staleBoard();tx.abort();return;}
  board=newBoard(drawOptionalMissions(rng));
  tx.objectStore('state').put(board);
  // Common photos stay; optional photos reset atomically with the new selection.
  for(const m of OPTIONAL_MISSIONS)tx.objectStore('photos').delete(m.id);
 };
 tx.oncomplete=()=>resolve(board);tx.onabort=()=>reject(failure||tx.error||Error('미션을 다시 뽑지 못했어요.'));
});}
function deletePhoto(db,id){return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').delete(id);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});}
async function decode(blob){const url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();return {image:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>{img.src='';URL.revokeObjectURL(url);}};}catch(e){URL.revokeObjectURL(url);throw e;}}
function canvasBlob(canvas,type='image/png',quality){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('이미지를 만들지 못했어요.')),type,quality));}
async function preparePhoto(file){if(!file||!file.type.startsWith('image/')||file.size>80*1024*1024)throw Error('80MB 이하의 사진 파일을 선택해 주세요.');let decoded;try{decoded=await decode(file);}catch{throw Error('사진을 열 수 없어요. JPEG, PNG 또는 WebP 사진으로 다시 선택해 주세요.');}try{const scale=Math.min(1,640/Math.max(decoded.width,decoded.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(decoded.width*scale));c.height=Math.max(1,Math.round(decoded.height*scale));c.getContext('2d').drawImage(decoded.image,0,0,c.width,c.height);return {original:file,thumbnail:await canvasBlob(c,'image/jpeg',.86),width:decoded.width,height:decoded.height,name:file.name||'photo.jpg',type:file.type};}finally{decoded.close();}}
function wrap(ctx,text,x,y,maxWidth,lineHeight){let line='';for(const ch of text){if(ctx.measureText(line+ch).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;line='';}line+=ch;}if(line)ctx.fillText(line,x,y);return y+lineHeight;}
export async function createMissionCollage(missions,photos){const completed=missions.filter(m=>photos.has(m.id));const l=exportLayout(completed.length);await document.fonts.ready;const c=document.createElement('canvas');c.width=l.width;c.height=l.height;const ctx=c.getContext('2d');if(!ctx)throw Error('이미지 저장을 지원하지 않는 브라우저예요.');ctx.fillStyle='#f6f1ff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#5c2de8';ctx.font='bold 76px sans-serif';ctx.fillText('롯데월드야호',80,130);ctx.fillStyle='#30243e';ctx.font='bold 48px sans-serif';ctx.fillText(`오늘의 미션 기록 · ${completed.length} / 8 완료`,80,225);
 for(let i=0;i<completed.length;i++){const m=completed[i],p=photos.get(m.id),x=l.margin+(i%l.columns)*(l.cardWidth+l.gap),y=300+Math.floor(i/l.columns)*(l.cardHeight+l.gap);ctx.fillStyle='white';ctx.fillRect(x,y,l.cardWidth,l.cardHeight);ctx.fillStyle='#7250a5';ctx.font='bold 30px sans-serif';ctx.fillText(`${m.id.startsWith('common')?'공통':'추가'} 미션 · 완료`,x+32,y+55);ctx.fillStyle='#2c203a';ctx.font='bold 43px sans-serif';wrap(ctx,m.title,x+32,y+120,l.cardWidth-64,55);const d=await decode(p.original);try{const box={x:x+24,y:y+230,w:l.cardWidth-48,h:l.photoHeight},s=Math.min(box.w/d.width,box.h/d.height);ctx.drawImage(d.image,box.x+(box.w-d.width*s)/2,box.y+(box.h-d.height*s)/2,d.width*s,d.height*s);}finally{d.close();}}
 ctx.fillStyle='#7e6b92';ctx.font='28px sans-serif';ctx.fillText('함께 남긴 오늘의 모험',80,c.height-45);const blob=await canvasBlob(c);c.width=c.height=1;return blob;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
// Apps Script returns a cross-origin response. A random receipt ID lets us
// check the result without reading an opaque POST response or exposing photos.
export function getSubmissionReceipt(id,{timeoutMs=30000,intervalMs=2000}={}){
 return new Promise(resolve=>{
  const callback='__missionReceipt_'+id,started=Date.now();let script,retryTimer,deadlineTimer,done=false;
  function finish(value){if(done)return;done=true;clearTimeout(retryTimer);clearTimeout(deadlineTimer);script?.remove();delete window[callback];resolve(value);}
  window[callback]=value=>{script?.remove();if(value?.ok===true||value?.ok===false)finish(value);else retry();};
  function retry(){if(done)return;if(Date.now()-started>=timeoutMs){finish({pending:true});return;}retryTimer=setTimeout(poll,intervalMs);}
  function poll(){
   if(done)return;script?.remove();script=document.createElement('script');
   const url=new URL(SUBMISSION_URL);url.searchParams.set('id',id);url.searchParams.set('callback',callback);url.searchParams.set('_',String(Date.now()));
   script.src=url.href;script.onerror=retry;document.head.append(script);
  }
  deadlineTimer=setTimeout(()=>finish({pending:true}),timeoutMs);poll();
 });
}
export function mountMissions({onOpen=()=>{},onClose=()=>{}}={}){
 const host=document.querySelector('#missionsView');let db,board,missions=[],photos=new Map(),busy=false,ready=false,initializing=false,pendingSync=false,exportFile=null;const urls=[];
 const say=text=>{host.querySelector('[data-mission-status]').textContent=text;};
 const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('yaho-missions'):null;
 function release(){urls.splice(0).forEach(url=>URL.revokeObjectURL(url));}
 function render(){release();const done=missions.filter(m=>photos.has(m.id)).length;host.innerHTML=`<div class="missions-shell"><div class="missions-heading"><span class="mission-eyebrow">TODAY’S MEMORY</span><h1>오늘의 미션</h1><p>함께 즐기고, 사진으로 남겨요.</p><div class="mission-progress"><strong>${done}<small> / 8 완료</small></strong><progress max="8" value="${done}" aria-label="미션 완료 수"></progress></div></div><div class="mission-export"><button type="button" class="btn btn-primary" data-mission-export ${!done?'disabled':''}>완료 미션 이미지 만들기</button><span>고화질 PNG · 사진 원본은 각 미션에서 저장</span></div><p class="mission-status" data-mission-status role="status"></p>${exportFile?`<div class="mission-export-ready"><strong>고화질 이미지가 준비됐어요</strong><button type="button" data-mission-download class="btn btn-primary">다운로드</button><button type="button" data-mission-share class="btn btn-subtle">공유</button><button type="button" data-mission-submit-open class="btn btn-subtle">서버에 올리기</button><form class="mission-submit-form" data-mission-submit-form hidden><label>이름<input name="name" maxlength="40" required autocomplete="name" placeholder="이름 입력"></label><label>최종 미션 제출인가요?<select name="final" required><option value="">선택해 주세요</option><option value="true">예, 최종 제출</option><option value="false">아니요, 중간 제출</option></select></label><p>제출하면 이름과 미션 이미지가 관리자에게 전달됩니다.</p><button type="submit" class="btn btn-primary">제출하기</button><p data-submit-status role="status"></p></form></div>`:''}${['common','optional'].map(group=>`<section class="mission-group"><div class="mission-group-heading"><h2>${group==='common'?'함께하는 공통 미션':'나만의 추가 미션'} <small>4개</small></h2>${group==='optional'?'<button type="button" class="btn btn-subtle" data-mission-reroll>선택 미션 다시 뽑기</button>':''}</div><div class="mission-grid">${missions.filter(m=>m.id.startsWith(group)).map(m=>{const p=photos.get(m.id);let url='';if(p){url=URL.createObjectURL(p.thumbnail);urls.push(url);}return `<article class="mission-card ${p?'completed':''}" data-mission-card="${m.id}"><div class="mission-card-title"><span>${p?'✓ 완료':'도전 중'}</span><h3>${esc(m.title)}</h3>${m.description?`<p>${esc(m.description)}</p>`:''}</div>${p?`<img class="mission-photo" src="${url}" alt="${esc(m.title)} 인증 사진"><div class="mission-photo-meta">원본 ${p.width} × ${p.height}px 보관 중</div>`:'<div class="mission-photo-empty" aria-hidden="true">사진으로 미션을 완성해요<span>＋</span></div>'}<div class="mission-photo-actions"><button type="button" data-mission-camera="${m.id}">${p?'다시 촬영':'사진 촬영'}</button><button type="button" data-mission-upload="${m.id}">${p?'사진 교체':'사진 업로드'}</button>${p?`<button type="button" data-mission-original="${m.id}">원본 저장</button><button type="button" data-mission-remove="${m.id}">사진 삭제</button>`:''}</div></article>`;}).join('')}</div></section>`).join('')}<p class="missions-storage-note">미션과 사진은 이 브라우저에 저장됩니다. 사이트 데이터를 삭제하면 기록도 사라집니다.</p><input type="file" accept="image/*" capture="environment" data-mission-camera-input hidden><input type="file" accept="image/*" data-mission-upload-input hidden></div>`;}
 async function reload(){const snapshot=await readMissionSnapshot(db);board=snapshot.board;missions=boardMissions(board);photos=new Map(snapshot.photos.filter(p=>missions.some(m=>m.id===p.id)).map(p=>[p.id,p]));exportFile=null;render();}
 function finish(){busy=false;if(pendingSync){pendingSync=false;reload().catch(()=>{});}}
 async function init(){if(initializing)return;initializing=true;host.innerHTML='<div class="missions-shell"><h1>오늘의 미션</h1><p role="status">미션을 불러오고 있어요…</p></div>';try{db=await openMissionDB();board=await loadMissionBoard(db);missions=boardMissions(board);await reload();ready=true;}catch(e){host.innerHTML=`<div class="missions-shell"><h1>미션을 저장할 수 없어요</h1><p>${esc(e.message||'브라우저 저장 공간을 확인해 주세요.')}</p><button type="button" class="btn btn-primary" data-mission-retry>다시 시도</button></div>`;}finally{initializing=false;}}
 function nav(open){for(const id of ['navMissions','mobileMissions']){const b=document.getElementById(id);b.classList.toggle('active',open);b.setAttribute('aria-pressed',String(open));}if(open)document.querySelectorAll('.header-nav button,.mobile-bottom-nav button').forEach(b=>{if(!['navMissions','mobileMissions'].includes(b.id)){b.classList.remove('active');b.setAttribute('aria-pressed','false');}});}
 function open(){document.body.classList.add('missions-open');host.hidden=false;onOpen();nav(true);if(!ready&&!db)init();}
 function close(){if(!document.body.classList.contains('missions-open'))return;host.hidden=true;document.body.classList.remove('missions-open');nav(false);onClose();}
 document.getElementById('navMissions').onclick=open;document.getElementById('mobileMissions').onclick=open;
 document.addEventListener('click',e=>{const b=e.target.closest('.header-nav button,.mobile-bottom-nav button');if(b&&!['navMissions','mobileMissions'].includes(b.id))close();},true);
 host.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if('missionRetry'in b.dataset){db=null;init();return;}if(!ready||busy)return;const id=b.dataset.missionCamera||b.dataset.missionUpload||b.dataset.missionOriginal||b.dataset.missionRemove;
  if(id&&!missions.some(m=>m.id===id))return;
  if('missionSubmitOpen'in b.dataset){host.querySelector('[data-mission-submit-form]').hidden=false;host.querySelector('[data-mission-submit-form] input').focus();return;}
  if(b.dataset.missionCamera||b.dataset.missionUpload){const input=host.querySelector(b.dataset.missionCamera?'[data-mission-camera-input]':'[data-mission-upload-input]');input.dataset.missionId=id;input.value='';input.click();return;}
  try{if('missionReroll'in b.dataset){if(missions.some(m=>m.id.startsWith('optional')&&photos.has(m.id))&&!window.confirm('선택 미션 4개를 다시 뽑을까요? 선택 미션의 사진과 완료 기록이 초기화됩니다. 공통 미션 기록은 유지됩니다.'))return;busy=true;say('선택 미션을 다시 뽑고 있어요…');await rerollMissionBoard(db,board.revision);await reload();channel?.postMessage('changed');say('선택 미션 4개를 다시 뽑았어요.');return;}if(b.dataset.missionOriginal){const p=photos.get(id);if(p)download(p.original,p.name);return;}if(b.dataset.missionRemove){busy=true;await deletePhoto(db,id);await reload();channel?.postMessage('changed');return;}
   if('missionExport'in b.dataset){busy=true;say('고화질 이미지를 만드는 중이에요…');const blob=await createMissionCollage(missions,photos);exportFile=new File([blob],'롯데월드야호-미션기록.png',{type:'image/png'});render();say('준비 완료 · 다운로드하거나 공유해 주세요.');return;}
   if('missionDownload'in b.dataset&&exportFile){download(exportFile,exportFile.name);return;}
   if('missionShare'in b.dataset&&exportFile){if(navigator.canShare?.({files:[exportFile]})&&navigator.share){await navigator.share({files:[exportFile],title:'롯데월드야호 · 오늘의 미션 기록'});}else{download(exportFile,exportFile.name);say('이 브라우저는 파일 공유를 지원하지 않아 이미지로 다운로드했어요.');}}
  }catch(e){if(e.name!=='AbortError')say(e.name==='QuotaExceededError'?'저장 공간이 부족해요. 사진 원본을 내려받은 뒤 불필요한 사진을 삭제해 주세요.':e.message||'처리하지 못했어요. 다시 시도해 주세요.');}finally{finish();}
 });
 host.addEventListener('submit',async e=>{
  const form=e.target;if(!form.matches('[data-mission-submit-form]'))return;e.preventDefault();
  if(busy||!exportFile||!form.reportValidity())return;
  const name=form.elements.name.value.trim(),finalValue=form.elements.final.value,status=form.querySelector('[data-submit-status]'),button=form.querySelector('button[type="submit"]');
  if(!name||!['true','false'].includes(finalValue)){status.textContent='이름과 최종 제출 여부를 입력해 주세요.';return;}
  busy=true;button.disabled=true;status.textContent='이미지를 전송하는 중이에요…';
  try{
   const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('이미지를 읽지 못했어요.'));reader.readAsDataURL(exportFile);});
   const image=String(dataUrl).split(',')[1];if(!image||image.length>16000000)throw Error('이미지가 너무 커요. 다운로드한 뒤 관리자에게 전달해 주세요.');
   const requestId=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
   await fetch(SUBMISSION_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({requestId,name,final:finalValue==='true',image})});
   status.textContent='저장 결과를 확인하고 있어요…';
   const result=await getSubmissionReceipt(requestId);
   if(result.ok===true)status.textContent='드라이브에 저장했어요: '+result.filename;
   else if(result.ok===false)status.textContent='저장 실패: '+(result.error||'서버 설정을 확인해 주세요.');
   else status.textContent='저장 결과를 확인하지 못했어요. 다시 제출하기 전에 관리자 폴더와 Apps Script 배포 설정을 확인해 주세요.';
  }catch(err){status.textContent=err.message||'전송하지 못했어요. 연결을 확인하고 다시 시도해 주세요.';}
  finally{button.disabled=false;finish();}
 });
 host.addEventListener('change',async e=>{const input=e.target;if(!input.matches('input[type="file"]')||busy)return;const file=input.files?.[0],id=input.dataset.missionId;if(!file||!missions.some(m=>m.id===id))return;busy=true;const revision=board.revision;say('사진 원본을 저장하는 중이에요…');try{const p=await preparePhoto(file);await writeMissionPhoto(db,{id,...p,updatedAt:new Date().toISOString()},revision);await reload();channel?.postMessage('changed');navigator.storage?.persist?.()?.catch(()=>{});say('사진을 저장했어요. 미션 완료!');}catch(e){say(e.name==='QuotaExceededError'?'저장 공간이 부족해 사진을 저장하지 못했어요. 기존 사진은 유지돼요.':e.message||'사진을 저장하지 못했어요.');}finally{finish();input.value='';}});
 if(channel)channel.onmessage=()=>{if(!db||!ready)return;if(busy)pendingSync=true;else reload().catch(()=>{});};
 window.addEventListener('pagehide',release);window.addEventListener('pageshow',()=>{if(ready)reload().catch(()=>{});});
 return {open,close};
}
