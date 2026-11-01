import test from 'node:test';
import assert from 'node:assert/strict';
import {parseClosureResponse,closuresAreFresh,attractionClosure,koreaDate,recommendPlaces} from '../lib.js';
const now=Date.parse('2026-11-02T02:00:00Z');
const response={code:'200',list:[{shopSysCd:'4731',atrctNm:'드래곤 와일드슈팅',atrctSttsCd:'HC02905',atrctSttsCdNm:'정기점검'}]};
const hours={code:'200',data:{operDt:'20261102'}};
const ride={id:'ride-16',name:'드래곤 와일드슈팅',category:'attraction',_official:{officialId:'4731'}};
const doc=parseClosureResponse(response,hours,now);
test('official IDs match closure reasons, without confusing guide IDs or similar names',()=>{
 assert.equal(attractionClosure(ride,doc,now).kind,'maintenance');
 assert.equal(attractionClosure(ride,doc,now).active,true);
 assert.equal(attractionClosure({...ride,_official:{officialId:'16'}},doc,now).kind,'unlisted');
 assert.equal(attractionClosure({...ride,_official:null},doc,now).kind,'unknown');
 assert.equal(attractionClosure({...ride,category:'food'},doc,now),null);
});
test('absence from a fresh list means no closure notice, never confirmed operation',()=>{
 const empty=parseClosureResponse({code:200,list:[]},hours,now);
 assert.equal(closuresAreFresh(empty,now),true);
 assert.deepEqual(attractionClosure(ride,empty,now),{kind:'unlisted',active:false,label:'운휴 공지 없음',checkedAt:empty.source.fetchedAt});
});
test('old, failed, future and previous-day data are not current closures or recommendation exclusions',()=>{
 assert.equal(closuresAreFresh(doc,now+31*60000),false);
 assert.equal(attractionClosure(ride,doc,now+31*60000).active,false);
 assert.match(attractionClosure(ride,doc,now+31*60000).label,/이전 정보/);
 for(const changed of [{...doc,date:'20261101'},{...doc,source:{...doc.source,stale:true}},{...doc,source:{fetchedAt:new Date(now+120000).toISOString()}},null])assert.equal(closuresAreFresh(changed,now),false);
 assert.equal(koreaDate(Date.parse('2026-11-01T15:00:00Z')),'20261102');
});
test('malformed or error responses cannot masquerade as an empty closure list',()=>{
 for(const body of [{code:'500',list:[]},{code:'200'},{code:'200',list:[{}]}])assert.throws(()=>parseClosureResponse(body,hours,now));
 assert.throws(()=>parseClosureResponse(response,{code:'200',data:{}},now));
});

test('only current known closures are removed from recommendations',()=>{
 const open={...ride,id:'open',_official:{officialId:'999'}};
 const recommend=(at)=>recommendPlaces([ride,open].filter(p=>!attractionClosure(p,doc,at)?.active));
 assert.deepEqual(recommend(now).map(r=>r.poi.id),['open']);
 assert.equal(recommend(now+31*60000).length,2);
});
