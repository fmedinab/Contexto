// sw.js
// Service Worker para PWA de CONTEXTO.
// v2: Cache invalidado, dashboard.css incluido, HTML network-first.

const CACHE_NAME = 'contexto-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/reset.css',
    '/css/typography.css',
    '/css/dashboard-new.css',
    '/css/auth-neural.css',
    '/css/themes/variables.css',
    '/css/themes/light.css',
    '/css/themes/dark.css'
];

const API_PATTERNS = [
    /https:\/\/bpfouoddrdelcqicdnor\.supabase\.co\/rest\/v1\/.*/,
    /https:\/\/bpfouoddrdelcqicdnor\.supabase\.co\/auth\/v1\/.*/
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo cachear peticiones GET — POST/PUT/DELETE deben pasar directamente
    if (request.method !== 'GET') {
        event.respondWith(fetch(request));
        return;
    }

    if (API_PATTERNS.some(pattern => pattern.test(request.url))) {
        event.respondWith(networkFirst(request));
        return;
    }

    if (request.destination === 'document') {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cached);

    return cached || fetchPromise;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok && request.method === 'GET') {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.destination === 'document') {
            return caches.match('/index.html');
        }
        throw error;
    }
}

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
