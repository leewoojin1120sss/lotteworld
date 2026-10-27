import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendPlaces} from '../lib.js';
const pois=[
 {id:'near',name:'회전목마',category:'attraction',floor:'1F',pdf:[10,0]},
 {id:'far',name:'자이로드롭',category:'attraction',floor:'1F',pdf:[90,0]},
 {id:'other',name:'자이로스윙',category:'attraction',floor:'MAGIC',pdf:[0,0]},
 {id:'missing',name:'새로운 체험',category:'attraction',floor:'1F',pdf:null},
 {id:'planned',name:'오픈예정',category:'attraction',floor:'1F',pdf:[0,0]}
];
const position={floor:'1F',pdf:[0,0]},floors={'1F':[{points:[[0,0],[100,0]]}]};
test('taste and distance priorities produce different recommendations without invented cross-floor distances',()=>{
 assert.equal(recommendPlaces(pois,{position,floors,preferences:['thrill'],balance:'taste'})[0].poi.id,'far');
 assert.equal(recommendPlaces(pois,{position,floors,preferences:['thrill'],balance:'distance'})[0].poi.id,'near');
 const rows=recommendPlaces(pois,{position,floors});
 assert.equal(rows.find(r=>r.poi.id==='other').cost,null);
 assert.equal(rows.find(r=>r.poi.id==='missing').cost,null);
 assert.ok(rows.every(r=>r.poi.id!=='planned'));
});
test('same-floor uses physical position, and no position leaves taste-only rankings',()=>{
 assert.ok(recommendPlaces(pois,{position,floors,sameFloor:true}).every(r=>r.poi.floor==='1F'));
 const rows=recommendPlaces(pois,{preferences:['thrill'],sameFloor:true});
 assert.equal(rows[0].taste,1);assert.ok(rows.every(r=>r.cost===null));
});
