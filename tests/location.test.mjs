import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeShare,decodeShare,isMapPoint} from '../lib.js';

test('floor, manual location, GPS precision and timestamp survive a shared link',()=>{
  const at=Date.now(),p={floor:'4F',x:314.159,y:826.125};
  const hash=encodeShare({position:p,gps:{lat:37.5111,lng:127.0986,accuracy:18.3},floor:'4F',at});
  const result=decodeShare(hash,at);
  assert.equal(result.floor,'4F');assert.equal(result.position.x,314.16);assert.equal(result.position.y,826.13);assert.equal(result.gps.accuracy,18);assert.equal(result.at,at);
});
test('GPS-only and manually selected locations work independently',()=>{
  const gps=decodeShare(encodeShare({gps:{lat:37.511,lng:127.098,accuracy:55},floor:'MAGIC'}));
  assert.equal(gps.position,null);assert.equal(gps.floor,'MAGIC');
  const manual=decodeShare(encodeShare({position:{floor:'B1',x:0,y:1000}}));assert.equal(manual.gps,null);assert.equal(manual.floor,'B1');
});
test('malformed, out-of-range, future and oversized shared payloads are rejected',()=>{
  assert.equal(decodeShare('#meet=%XX'),null);
  assert.equal(decodeShare('#meet='+'a'.repeat(1100)),null);
  for(const data of [{v:1,floor:'99F',x:2,y:3,at:Date.now()},{v:1,floor:'1F',x:-1,y:0,at:Date.now()},{v:1,floor:'1F',lat:91,lng:0,acc:2,at:Date.now()},{v:1,floor:'1F',x:2,y:3,at:Date.now()+3600000}])assert.equal(decodeShare('#meet='+encodeURIComponent(new URLSearchParams(data))),null);
  assert.equal(isMapPoint({floor:'1F',x:NaN,y:0}),false);assert.throws(()=>encodeShare({floor:'1F'}));
});
test('estimated location sharing preserves uncertainty and stays compatible with old links',()=>{
 const p={floor:'1F',x:400,y:600,source:'estimated',accuracyM:58.2};const s=decodeShare(encodeShare({position:p}));
 assert.equal(s.position.source,'estimated');assert.equal(s.position.accuracyM,59);
 assert.equal(decodeShare(encodeShare({position:{floor:'1F',x:400,y:600}})).position.source,undefined);
 const bad='#meet='+encodeURIComponent(new URLSearchParams({v:1,floor:'1F',x:2,y:3,at:Date.now(),approx:1,radius:99999}));assert.equal(decodeShare(bad),null);
 assert.throws(()=>encodeShare({position:{...p,accuracyM:NaN}}));
});
