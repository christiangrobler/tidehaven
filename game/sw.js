/* Tidehaven service worker. Network first so updates always arrive; cached copy when offline. */
const V="tidehaven-20261117200000";
const CORE=["./", "README.md", "css/padtv.css", "game.html", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/logo.png", "icons/icon-maskable-512.png", "index.html", "js/ai.js", "js/ck.js", "js/ckui.js", "js/dice3d.js", "js/engine.js", "js/feel.js", "js/link.js", "js/minimap.js", "js/pad.js", "js/padcore.js", "js/padstubs.js", "js/realism.js", "js/role.js", "js/scene.js", "js/sound.js", "js/stats.js", "js/tb.js", "js/tbba.js", "js/tbui.js", "js/tv.js", "js/ui.js", "manifest.webmanifest", "pad.html", "pad.webmanifest", "tv.html", "vendor/OrbitControls.js", "vendor/peerjs.min.js", "vendor/qrcode.js", "vendor/three.min.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c));}return res;}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("index.html"))));
});
