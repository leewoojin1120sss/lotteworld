import fs from 'node:fs';
import assert from 'node:assert/strict';
import {isMapPoint} from '../lib.js';
const park=JSON.parse(fs.readFileSync(new URL('../data/park.json',import.meta.url)));
const ids=new Set();
for(const p of park.pois){assert.ok(!ids.has(p.id),`Duplicate ${p.id}`);ids.add(p.id);assert.ok(p.name&&p.category);if(p.x!==null)assert.ok(isMapPoint(p),`Bad map coordinate ${p.id}`);else assert.ok(p.note,`Unlocated entry has no explanation: ${p.id}`);}
assert.equal(park.pois.filter(p=>p.category==='attraction').length,42);
for(const floor of park.floors){
  assert.ok(fs.existsSync(new URL(`../${floor.image}`,import.meta.url)),`Missing floor map ${floor.id}`);
  assert.ok(floor.vectorImage,`Missing vector map metadata ${floor.id}`);
  const svg=fs.readFileSync(new URL(`../${floor.vectorImage}`,import.meta.url),'utf8');
  assert.ok(svg.includes(`viewBox="0 0 ${floor.width} ${floor.height}"`),`Vector map dimensions differ from pins: ${floor.id}`);
  assert.ok(!/(?:href|xlink:href)="https?:/i.test(svg),`Vector map must contain its own artwork: ${floor.id}`);
}
for(const kind of ['stairs','elevator','escalator','restroom','firstaid','aed'])assert.ok(park.pois.some(p=>p.kind===kind),`Missing kind ${kind}`);
const official=JSON.parse(fs.readFileSync(new URL('../data/official.json',import.meta.url)));
assert.ok(Array.isArray(official.attractions));
console.log(`Validated ${park.pois.length} guide entries, ${park.floors.length} floor maps and official catalog.`);
const geo=JSON.parse(fs.readFileSync(new URL('../data/georeference.json',import.meta.url)));
const anchorIds=new Set();
for(const a of geo.anchors){
 const p=park.pois.find(p=>p.id===a.id);
 assert.ok(p&&p.floor===a.floor&&JSON.stringify(p.pdf)===JSON.stringify(a.pdf),`Mismatched geographic anchor ${a.id}`);
 assert.ok(!anchorIds.has(a.id),`Duplicate geographic anchor ${a.id}`);anchorIds.add(a.id);
 assert.ok(Number.isFinite(a.lat)&&Number.isFinite(a.lng)&&a.sourceUrl.startsWith('https://www.openstreetmap.org/node/'));
}
console.log(`Validated ${geo.anchors.length} attributed geographic anchors.`);
