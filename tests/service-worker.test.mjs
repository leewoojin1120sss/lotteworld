import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('new offline versions revalidate core requests rather than copying stale HTTP cache entries',async()=>{
 const handlers={},requests=[];let skipped=false,completion;
 const self={registration:{scope:'https://example.test/lotteworld/'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>{skipped=true;}};
 const caches={open:async()=>({addAll:async entries=>requests.push(...entries)})};
 vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{self,caches,Request,URL});
 handlers.install({waitUntil:p=>completion=p});await completion;
 assert.ok(skipped);assert.ok(requests.length>10);
 for(const request of requests){assert.equal(request.cache,'reload');assert.ok(request.url.startsWith(self.registration.scope));}
 for(const file of ['app.js','missions.js','missions.css','data/park.json','data/official-links.json','assets/maps/4F.webp'])assert.ok(requests.some(r=>r.url===self.registration.scope+file),file);
});
test('mission reset release refreshes existing in-scope pages once and preserves the release marker',async()=>{
 const handlers={},scope='https://example.test/lotteworld/',stores=new Map([['yaho-old',new Map()],['yaho-v1.0.0',new Map()]]),navigated=[];
 const caches={keys:async()=>[...stores.keys()],delete:async key=>stores.delete(key),open:async key=>{if(!stores.has(key))stores.set(key,new Map());const s=stores.get(key);return {match:async url=>s.get(url),put:async(url,r)=>s.set(url,r)};}};
 const self={registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{},matchAll:async()=>[scope,scope+'?mission=1','https://example.test/other/'].map(url=>({url,navigate:u=>{navigated.push(u);return new Promise(()=>{});}}))}};
 vm.runInNewContext(fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8'),{self,caches,Request,Response,URL});
 async function activate(){let done;handlers.activate({waitUntil:p=>done=p});await done;}
 await activate();assert.deepEqual(navigated,[scope,scope+'?mission=1']);
 assert.ok(!stores.has('yaho-old'));assert.ok(stores.has('yaho-v1.0.0'));assert.ok(stores.has('yaho-release-markers'));
 stores.set('yaho-another-old',new Map());await activate();assert.equal(navigated.length,2);
});
