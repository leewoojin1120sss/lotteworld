import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COMMON_MISSIONS,OPTIONAL_MISSIONS,drawOptionalMissions,boardMissions,exportLayout} from '../missions.js';

const seeded=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
test('mission board always has four fixed and four distinct optional missions',()=>{
 assert.deepEqual(COMMON_MISSIONS.map(m=>m.title),['민경서 선생님 만나 사진 찍기','어트랙션 탑승하기','점심 식사하기','간식 또는 기념품 구매하기']);
 assert.equal(OPTIONAL_MISSIONS.length,25);
 for(let seed=0;seed<200;seed++){
  const ids=drawOptionalMissions(seeded(seed));assert.equal(new Set(ids).size,4);
  const board=boardMissions({optionalIds:ids});assert.equal(board.length,8);assert.deepEqual(board.slice(0,4),COMMON_MISSIONS);
 }
 assert.notDeepEqual(drawOptionalMissions(seeded(1)),drawOptionalMissions(seeded(123456)));
});
test('teacher mission has four times the final inclusion probability of each other mission',()=>{
 const rng=seeded(32847),counts=Object.fromEntries(OPTIONAL_MISSIONS.map(m=>[m.id,0])),trials=100000;
 for(let i=0;i<trials;i++)for(const id of drawOptionalMissions(rng))counts[id]++;
 assert.ok(Math.abs(counts['optional-1']/trials-4/7)<.006);
 for(const m of OPTIONAL_MISSIONS.slice(1))assert.ok(Math.abs(counts[m.id]/trials-1/7)<.006,`${m.id}: ${counts[m.id]/trials}`);
 assert.ok(drawOptionalMissions(()=>.57).includes('optional-1'));
 assert.ok(!drawOptionalMissions(()=>4/7).includes('optional-1'));
});
test('independent rerolls may repeat any previous mission, including the entire same set',()=>{
 const first=drawOptionalMissions(seeded(5678));
 const repeat=drawOptionalMissions(seeded(5678));
 assert.deepEqual(repeat,first);assert.equal(new Set(repeat).size,4);
 assert.deepEqual(drawOptionalMissions(()=>0),drawOptionalMissions(()=>0));
 const seen=new Set();const rng=seeded(9876);
 for(let n=0;n<1000;n++)drawOptionalMissions(rng).forEach(id=>seen.add(id));
 for(const mission of OPTIONAL_MISSIONS)assert.ok(seen.has(mission.id));
});
test('saved selections preserve ordering and reject damaged data instead of rerolling',()=>{
 const optionalIds=['optional-17','optional-2','optional-9','optional-6'];
 assert.deepEqual(boardMissions({optionalIds}).slice(4).map(m=>m.id),optionalIds);
 for(const optionalIds of [[],['optional-1'],['optional-1','optional-1','optional-2','optional-3'],['optional-1','optional-2','optional-3','bad']])assert.throws(()=>boardMissions({optionalIds}));
 assert.throws(()=>boardMissions(null));
});
test('high resolution collages fit all eight photos below common mobile canvas limits',()=>{
 for(let count=1;count<=8;count++){
  const l=exportLayout(count);assert.equal(l.width,2400);assert.ok(l.width*l.height<16777216);
  const lastY=300+Math.floor((count-1)/l.columns)*(l.cardHeight+l.gap);
  assert.ok(lastY+l.cardHeight<l.height-45);assert.ok(l.photoHeight>=1000);
 }
 for(const count of [0,9,1.5])assert.throws(()=>exportLayout(count));
});
