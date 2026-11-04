import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapPinVisible,namuSearchURL} from '../lib.js';
test('opening a search result allows every surrounding pin, even outside search/favorite filters',()=>{
 const other={category:'food',kind:null};
 const filters={category:'attraction',favoritesOnly:true,isFavorite:false,matchesSearch:false};
 assert.equal(mapPinVisible(other,filters),false);
 assert.equal(mapPinVisible(other,{...filters,browseAll:true}),true);
 assert.equal(mapPinVisible(other,{category:'food'}),true);
 assert.equal(mapPinVisible(other,{category:'attraction'}),false);
});
test('Namu search links encode attraction names and never appear for restaurants/facilities',()=>{
 const p={category:'attraction',name:'신밧드의 모험 (4D)'};const u=new URL(namuSearchURL(p));
 assert.equal(u.origin,'https://namu.wiki');assert.equal(u.searchParams.get('q'),p.name+' 롯데월드');
 assert.equal(namuSearchURL({category:'food',name:'식당'}),null);
});
