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
 for(const file of ['app.js','data/park.json','data/official-links.json','assets/maps/4F.webp'])assert.ok(requests.some(r=>r.url===self.registration.scope+file),file);
});
