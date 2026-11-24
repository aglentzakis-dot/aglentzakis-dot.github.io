// Βιτρίνα GlenApps — sw.js
// ΜΗΝ αφαιρεθεί — κανόνας GlenApps: η εφαρμογή ανοίγει ΑΜΕΣΩΣ από το αποθηκευμένο αντίγραφο
// της συσκευής και ελέγχει για νέα έκδοση στο παρασκήνιο· το δίκτυο περιμένει το πολύ 3 δευτερόλεπτα.
const CACHE = "vitrina-6.4.1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
function netWithTimeout(req, ms) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout")), ms);
    fetch(req).then(r => { clearTimeout(t); res(r); }, er => { clearTimeout(t); rej(er); });
  });
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const update = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(update); return hit; }
    try { return await netWithTimeout(req, 3000); }
    catch { return (await cache.match("./index.html")) || new Response("Χωρίς σύνδεση", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }); }
  })());
});
