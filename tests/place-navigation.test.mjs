import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapPinVisible,namuDocumentURL} from '../lib.js';
import {readFileSync} from 'node:fs';
test('opening a search result allows every surrounding pin, even outside search/favorite filters',()=>{
 const other={category:'food',kind:null};
 const filters={category:'attraction',favoritesOnly:true,isFavorite:false,matchesSearch:false};
 assert.equal(mapPinVisible(other,filters),false);
 assert.equal(mapPinVisible(other,{...filters,browseAll:true}),true);
 assert.equal(mapPinVisible(other,{category:'food'}),true);
 assert.equal(mapPinVisible(other,{category:'attraction'}),false);
});
test('every guide attraction links directly to its specific Namu document',()=>{
 const park=JSON.parse(readFileSync(new URL('../data/park.json',import.meta.url)));
 const attractions=park.pois.filter(p=>p.category==='attraction');assert.equal(attractions.length,42);
 for(const p of attractions){const u=new URL(namuDocumentURL(p));assert.equal(u.origin,'https://namu.wiki');assert.ok(u.pathname.startsWith('/w/'));assert.equal(u.search,'');}
 assert.equal(decodeURIComponent(new URL(namuDocumentURL({category:'attraction',id:'ride-13'})).pathname),'/w/회전목마(롯데월드 어드벤처)');
 assert.equal(decodeURIComponent(new URL(namuDocumentURL({category:'attraction',id:'ride-6'})).pathname),'/w/신밧드의 모험(롯데월드 어드벤처)');
 assert.equal(namuDocumentURL({category:'food',id:'ride-13'}),null);
 assert.equal(namuDocumentURL({category:'attraction',id:'unverified'}),null);
});
