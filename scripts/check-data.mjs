import fs from 'node:fs';
import assert from 'node:assert/strict';
import {isMapPoint} from '../lib.js';
const park=JSON.parse(fs.readFileSync(new URL('../data/park.json',import.meta.url)));
const ids=new Set();
for(const p of park.pois){assert.ok(!ids.has(p.id),`Duplicate ${p.id}`);ids.add(p.id);assert.ok(p.name&&p.category);if(p.x!==null)assert.ok(isMapPoint(p),`Bad map coordinate ${p.id}`);else assert.ok(p.note,`Unlocated entry has no explanation: ${p.id}`);}
assert.equal(park.pois.filter(p=>p.category==='attraction').length,42);
for(const floor of park.floors)assert.ok(fs.existsSync(new URL(`../${floor.image}`,import.meta.url)),`Missing floor map ${floor.id}`);
for(const kind of ['stairs','elevator','escalator','restroom','firstaid','aed'])assert.ok(park.pois.some(p=>p.kind===kind),`Missing kind ${kind}`);
const official=JSON.parse(fs.readFileSync(new URL('../data/official.json',import.meta.url)));
const waits=JSON.parse(fs.readFileSync(new URL('../data/waits.json',import.meta.url)));
assert.ok(Array.isArray(official.attractions)&&Array.isArray(waits.rides));
for(const r of waits.rides)assert.ok(r.waitMinutes===null||Number.isInteger(r.waitMinutes)&&r.waitMinutes>=0);
assert.ok(waits.available||waits.rides.every(r=>r.waitMinutes===null),'Unavailable feed must not publish numeric queues');
console.log(`Validated ${park.pois.length} guide entries, ${park.floors.length} floor maps, official catalog and wait schema.`);
