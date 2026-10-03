/* Offline support: cache the app shell, serve it cache-first, refresh in the background.
   Bump VERSION whenever you deploy changes you want phones to pick up immediately. */
const VERSION = "surfletics-v2.0.0";
const SHELL = [
  "./", "index.html", "manifest.webmanifest",
  "src/css/base.css", "src/css/components.css", "src/css/screens.css",
  "src/js/app.js", "src/js/data.js", "src/js/dates.js", "src/js/model.js", "src/js/state.js", "src/js/morph.js", "src/js/icons.js", "src/js/ui.js", "src/js/sheets.js",
  "src/js/screens/onboarding.js", "src/js/screens/spots.js", "src/js/screens/lessons.js", "src/js/screens/bookings.js", "src/js/screens/profile.js",
  "assets/fonts/fonts.css", "assets/fonts/figtree-latin.woff2", "assets/fonts/bricolage-latin.woff2",
  "assets/img/icon.svg", "assets/img/wordmark-white.png", "assets/img/favicon.svg", "assets/img/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })
  );
});
