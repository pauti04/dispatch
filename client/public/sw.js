// Minimal service worker for Dispatch PWA — installs cleanly, doesn't aggressively cache.
// We keep this conservative so served HTML/CSS/JS is always fresh from Vercel (no stale UI).
// Cached assets are limited to the icon + manifest for offline app-icon rendering.

const CACHE = "dispatch-v1";
const PRECACHE = ["/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only serve cached responses for the small precache list; everything else goes to network.
  if (event.request.method === "GET" && PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
