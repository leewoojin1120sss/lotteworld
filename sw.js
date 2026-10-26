const CACHE='yaho-v1.0.0';
const CORE=['./','index.html','styles.css','app.js','lib.js','manifest.webmanifest','assets/icon.svg','data/park.json','data/walkways.json','assets/maps/B1.webp','assets/maps/1F.webp','assets/maps/2F.webp','assets/maps/3F.webp','assets/maps/4F.webp','assets/maps/MAGIC.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('yaho-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.endsWith('.pdf'))return;
 // Network first for official data: preserve source timestamps on offline fallback.
 if(/\/data\/(official|waits)\.json$/.test(u.pathname)){
  event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;}).catch(()=>caches.match(event.request).then(r=>r||new Response('{}',{headers:{'content-type':'application/json'}}))));return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return r;})));
});
