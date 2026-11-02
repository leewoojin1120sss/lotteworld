import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pdfToMap,mapToPDF,isFloorPoint,pointInPolygon,matchingOfficialRecords,officialLocationsFor,officialPinBox,OFFICIAL_FLOORS} from '../lib.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`,import.meta.url)));
const park=read('park'),audit=read('coordinate-audit'),links=read('official-links'),official=read('official');
const floor=id=>park.floors.find(f=>f.id===id),poi=id=>park.pois.find(p=>p.id===id);
const group={attraction:official.attractions,food:official.restaurants,shop:[...(official.shops??[]),...(official.playshops??[])],facility:official.facilities};
const related=p=>matchingOfficialRecords(p,group[p.category],links.links[p.id]);
test('all 247 guide symbols preserve source geometry through every floor coordinate conversion',()=>{
 assert.equal(audit.locations.length,247);
 for(const entry of audit.locations){
  const p=poi(entry.id),f=floor(p.floor),map=pdfToMap(entry.pdf,f);
  assert.ok(isFloorPoint(map,f),p.id);assert.ok(isFloorPoint(p,f),p.id);
  assert.ok(Math.hypot(...mapToPDF(map,f).map((v,i)=>v-entry.pdf[i]))<1e-9,p.id);
  assert.ok(Math.hypot(map.x-p.x,map.y-p.y)<.000008,p.id);
  const b=p.symbolBounds;assert.ok(Math.hypot(p.pdf[0]-(b[0]+b[2])/2,p.pdf[1]-(b[1]+b[3])/2)<.00002,p.id);
 }
 assert.equal(audit.summary.independentFacilityGlyphs,132);assert.equal(audit.summary.unmatchedFacilityGlyphs,0);
 assert.ok(audit.summary.maxDeltaPDFPoints<2.35);
});
test('source ambiguities are resolved only with explicit identity evidence',()=>{
 assert.deepEqual(park.pois.filter(p=>!p.pdf).map(p=>p.id),['food-1F-22']);
 assert.equal(poi('shop-16').sourceGuideNumber,17);assert.equal(poi('shop-16').number,16);
 assert.equal(poi('shop-17').alternatePDF,undefined);assert.notDeepEqual(poi('shop-16').pdf,poi('shop-17').pdf);
 assert.equal(poi('facility-1F-unknown-1').kind,'meeting');assert.equal(poi('facility-1F-unknown-1').name,'만남의 광장');
});
test('floor masks include boundaries and reject empty corners, floor mismatch and invalid values',()=>{
 const f=floor('3F');assert.ok(f.polygon);
 assert.ok(pointInPolygon(f.polygon[0],f.polygon));assert.ok(isFloorPoint(pdfToMap(f.polygon[0],f),f));
 assert.equal(isFloorPoint({floor:'3F',x:0,y:0},f),false);
 assert.equal(isFloorPoint({floor:'1F',x:500,y:500},f),false);
 assert.equal(isFloorPoint({floor:'3F',x:NaN,y:5},f),false);
});
test('official API coordinates retain their signed top-left origin on the 570×427 canvas',()=>{
 const map={width:570,height:427},position={x:-11,y:219};const box=officialPinBox(position,map);
 assert.equal(box.left,-11/570*100);assert.equal(box.top,219/427*100);
 assert.equal(box.width,44/570*100);assert.equal(box.height,58/427*100);
 const scale=1.7;assert.ok(Math.abs(box.left/100*(570*scale)-(-11*scale))<1e-9);
 assert.equal(officialPinBox(position,{width:0,height:427}),null);
});
test('official identity joins preserve namespaces, branches and composite destinations',()=>{
 for(const p of park.pois.filter(p=>p.category==='attraction'))assert.equal(related(p).length,1,p.id);
 for(const [id,l] of Object.entries(links.links)){
  if(l.recordIds.some(id=>id.startsWith('playshop-')))assert.deepEqual(related(poi(id)).map(o=>o.id),l.recordIds,id);
 }
 assert.deepEqual(related(poi('food-2F-24')).map(o=>o.id),['restaurant-704']);
 assert.deepEqual(related(poi('food-MAGIC-50')).map(o=>o.id),['restaurant-88']);
 assert.deepEqual(related(poi('food-3F-39')).map(o=>o.id),['restaurant-725','restaurant-74']);
 assert.equal(related(poi('shop-13')).length,0);
 assert.equal(OFFICIAL_FLOORS.HA00108,undefined);assert.equal(OFFICIAL_FLOORS.HA00109,undefined);
});
test('every matched facility opens only locations on its physical floor',()=>{
 for(const p of park.pois.filter(p=>p.category==='facility')){
  const locations=officialLocationsFor(p,related(p),links.links[p.id],official.maps);
  for(const v of locations)assert.equal(OFFICIAL_FLOORS[v.location.floorCode??v.map.floorCode],p.floor,p.id);
 }
 const firstAid=poi('facility-MAGIC-firstaid-1'),magic=officialLocationsFor(firstAid,related(firstAid),links.links[firstAid.id],official.maps);
 assert.equal(magic.length,1);assert.equal(magic[0].location.officialLocationId,'2');
 for(const p of park.pois.filter(p=>p.floor==='B1'&&p.kind==='locker')){
  const options=officialLocationsFor(p,related(p),links.links[p.id],official.maps);
  assert.deepEqual(options.map(v=>v.location.officialLocationId).sort(),['10','3','4'],p.id);
  assert.ok(options.some(v=>v.location.y===-11),p.id);
 }
});
