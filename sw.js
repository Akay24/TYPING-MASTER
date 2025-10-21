// sw.js - Enhanced Service Worker for TypeFlow
// Strategies implemented (simple custom version):
//  - Precache core shell (app shell)
//  - Stale-While-Revalidate for JS/CSS requests
//  - Cache-First for fonts
//  - Network-First for API calls with basic offline fallback
//  - Versioned cache names & cleanup
//  - Lightweight request dedupe (in-flight tracking)

const VERSION = 'v3';
const CORE_CACHE = `typeflow-core-${VERSION}`;
const RUNTIME_CACHE = `typeflow-runtime-${VERSION}`;
const FONT_CACHE = `typeflow-fonts-${VERSION}`;
const API_CACHE = `typeflow-api-${VERSION}`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/optimized.css',
  '/src/app-optimized.js',
  '/src/engine.js',
  '/src/particles.js',
  '/src/particles-optimized.js',
  '/src/virtual-scroll.js'
];

// Track in-flight fetches to avoid duplicate network calls when many tabs open
const inFlight = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => ![CORE_CACHE, RUNTIME_CACHE, FONT_CACHE, API_CACHE].includes(k)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isFont(req) {
  return /\.(?:woff2?|ttf|otf|eot)$/i.test(new URL(req.url).pathname);
}

function isStaticAsset(req) {
  const url = new URL(req.url);
  return url.origin === location.origin && /\.(?:js|css)$/i.test(url.pathname);
}

function isApi(req) {
  const url = new URL(req.url);
  return url.origin === self.location.origin && url.pathname.startsWith('/api/');
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = (async () => {
    try {
      const resp = await fetch(request);
      if (resp && resp.ok) await cache.put(request, resp.clone());
      return resp;
    } catch (e) {
      return cached;
    }
  })();
  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    return cached;
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ offline: true }), { status: 503, headers: { 'Content-Type': 'application/json' }});
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Avoid handling browser extension or chrome specific schemes
  if (!request.url.startsWith(self.location.origin) && !isApi(request)) return;

  const handle = async () => {
    if (inFlight.has(request.url)) return inFlight.get(request.url);
    let p;
    if (isApi(request)) p = networkFirst(request, API_CACHE);
    else if (isFont(request)) p = cacheFirst(request, FONT_CACHE);
    else if (isStaticAsset(request)) p = staleWhileRevalidate(request, RUNTIME_CACHE);
    else if (request.mode === 'navigate') p = caches.match('/index.html');
    else p = staleWhileRevalidate(request, RUNTIME_CACHE);
    inFlight.set(request.url, p);
    const result = await p.finally(()=> inFlight.delete(request.url));
    return result;
  };

  event.respondWith(handle());
});

// Listen for manual skipWaiting messages (for future update UI)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
