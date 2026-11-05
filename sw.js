const CACHE='yaho-v1.0.0';
const RELEASE_CACHE='yaho-release-markers';
const CORE=['./','index.html','styles.css','readability.css','missions.css','missions.js','app.js','lib.js','geo.js','manifest.webmanifest','assets/icon.svg','data/official-links.json','assets/official-map-pin.png','data/park.json','data/georeference.json','data/walkways.json','assets/maps/B1.webp','assets/maps/1F.webp','assets/maps/2F.webp','assets/maps/3F.webp','assets/maps/4F.webp','assets/maps/MAGIC.webp'];
// A new version must revalidate every core file. Otherwise GitHub Pages' HTTP
// cache can populate a new offline cache with an old map/app for ten minutes.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys(),previous=keys.some(k=>k.startsWith('yaho-')&&k!==CACHE&&k!==RELEASE_CACHE);
 const markers=await caches.open(RELEASE_CACHE),marker=new URL('mission-reset-v2',self.registration.scope).href,seen=await markers.match(marker);
 await Promise.all(keys.filter(k=>k.startsWith('yaho-')&&k!==CACHE&&k!==RELEASE_CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
 // Refresh existing windows once for the requested mission reset edition.
 // Later releases preserve the marker and never repeat this forced refresh.
 if(!seen){
  await markers.put(marker,new Response('done'));
  if(previous){const windows=await self.clients.matchAll({type:'window'});await Promise.all(windows.filter(c=>c.url.startsWith(self.registration.scope)).map(c=>c.navigate(c.url).catch(()=>{})));}
 }
})()));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.endsWith('.pdf'))return;
 // Network first for official data: preserve source timestamps on offline fallback.
 if(/\/data\/official\.json$/.test(u.pathname)){
  event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;}).catch(()=>caches.match(event.request).then(r=>r||new Response('{}',{headers:{'content-type':'application/json'}}))));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;}).catch(async()=>{
  if(/\/assets\/maps\/[^/]+\.svg$/.test(u.pathname)){const fallback=new URL(u);fallback.pathname=fallback.pathname.replace(/\.svg$/,'.webp');const image=await caches.match(fallback.href);if(image)return image;}
  return new Response('Offline',{status:503});
 })));
});
