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

test('specific food and gift tastes match actual descriptions, and only-matches removes unrelated places',()=>{
 const items=[{id:'rice',name:'밥집',description:'김치볶음밥, 떡볶이',category:'food',floor:'1F'}, {id:'coffee',name:'카페',description:'커피, 라떼',category:'food',floor:'1F'}, {id:'noodle',name:'면집',description:'우동, 돈까스',category:'food',floor:'1F'}];
 assert.deepEqual(recommendPlaces(items,{category:'food',preferences:['japanese'],onlyMatches:true}).map(r=>r.poi.id),['noodle']);
 assert.deepEqual(recommendPlaces(items,{category:'food',preferences:['korean'],onlyMatches:true}).map(r=>r.poi.id),['rice']);
});
test('area, known avoidance types and favorite exclusions combine without assuming cross-floor distances',()=>{
 const items=[{id:'spin',name:'자이로스윙',category:'attraction',floor:'MAGIC'}, {id:'drop',name:'자이로드롭',category:'attraction',floor:'MAGIC'}, {id:'gentle',name:'회전목마',category:'attraction',floor:'1F'}];
 assert.deepEqual(recommendPlaces(items,{area:'magic',avoid:['spin']}).map(r=>r.poi.id),['drop']);
 assert.deepEqual(recommendPlaces(items,{area:'adventure'}).map(r=>r.poi.id),['gentle']);
 assert.equal(recommendPlaces(items,{area:'magic',avoid:['spin'],excludeIds:['drop']}).length,0);
});
test('different recommendation sets vary tied candidates reproducibly and never relax selected filters',()=>{
 const items=Array.from({length:25},(_,i)=>({id:`cafe-${i}`,name:`카페 ${i}`,category:'food',description:'커피, 라떼',floor:'1F'}));
 const options={category:'food',preferences:['cafe'],onlyMatches:true};
 const a=recommendPlaces(items,{...options,seed:1}).map(r=>r.poi.id),b=recommendPlaces(items,{...options,seed:2}).map(r=>r.poi.id);
 assert.notDeepEqual(a,b);assert.deepEqual(a,recommendPlaces(items,{...options,seed:1}).map(r=>r.poi.id));
 assert.ok(recommendPlaces(items,{...options,seed:2}).every(r=>r.matched.length===1));
});
test('equally relevant results cover multiple selected tastes rather than repeating a single type',()=>{
 const items=[...Array.from({length:5},(_,i)=>({id:`thrill-${i}`,name:`스릴 ${i}`,category:'attraction',floor:'1F'})),{id:'gentle',name:'회전목마',category:'attraction',floor:'1F'}];
 const rows=recommendPlaces(items,{preferences:['thrill','gentle'],onlyMatches:true,limit:2});
 assert.ok(rows.some(r=>r.poi.id==='gentle'));assert.ok(rows.some(r=>r.poi.id.startsWith('thrill-')));
});
