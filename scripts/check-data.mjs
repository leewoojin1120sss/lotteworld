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
const waits=JSON.parse(fs.readFileSync(new URL('../data/waits.json',import.meta.url)));
assert.ok(Array.isArray(official.attractions)&&Array.isArray(waits.rides));
for(const r of waits.rides)assert.ok(r.waitMinutes===null||Number.isInteger(r.waitMinutes)&&r.waitMinutes>=0);
assert.ok(waits.available||waits.rides.every(r=>r.waitMinutes===null),'Unavailable feed must not publish numeric queues');
console.log(`Validated ${park.pois.length} guide entries, ${park.floors.length} floor maps, official catalog and wait schema.`);
