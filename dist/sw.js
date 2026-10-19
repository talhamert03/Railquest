// A complete, versioned static bundle. No external responses or account data are cached.
const CACHE='rota-adalari-v10.0.0';
const ASSETS=['./','./index.html','./ui.css','./manifest.webmanifest','./js/app.js','./js/key-signs.js','./js/camera.js','./js/board-gesture.js','./js/viewport.js','./js/dialogs.js','./js/vehicle-motion.js','./js/lock-blueprints.js','./js/boot.js','./js/resources.js','./js/weather.js','./js/biome-sprites.js','./js/signal-blueprints.js','./js/engine.js','./js/renderer.js','./js/level-blueprints.js','./js/expert-blueprints.js','./js/expedition-blueprints.js','./js/monetization.js','./js/levels.js','./js/audio.js','./js/storage.js','./js/icons.js','./assets/cover.webp','./assets/biomes-desert-snow-v5.webp','./assets/biomes-glacier-clock-v5.webp','./assets/conductor.webp','./assets/props-v2.webp','./assets/vehicles-v2.webp','./assets/rubik.woff','./assets/rubik-bold.woff','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const previous=(await caches.keys()).filter(k=>k.startsWith('rota-adalari-')&&k!==CACHE);
 await self.clients.claim();
 // Reload prior clients only after this complete bundle is ready.
 if(previous.length){const clients=await self.clients.matchAll({type:'window'});await Promise.all(clients.map(c=>c.navigate(c.url).catch(()=>{})));}
 await Promise.all(previous.map(k=>caches.delete(k)));
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const allowed=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));if(!allowed.has(url.href))return;
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(cached=>cached||fetch(event.request)));
});
