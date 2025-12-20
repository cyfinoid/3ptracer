// Service Worker for 3rd Party Tracer PWA
// Provides offline functionality and caching
//
// IMPORTANT: Service workers only work over HTTPS or localhost.
// They do NOT work with file:// protocol (opening index.html directly in browser).
// This is a browser security requirement, not a bug.
//
// For local development, use: python3 -m http.server 8000
// Then open: http://localhost:8000

const CACHE_NAME = '3pt-cache-v1.0.3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/about.html',
    '/css/style.css',
    '/js/logger.js',
    '/js/app.js',
    '/js/dns-analyzer.js',
    '/js/service-detection-engine.js',
    '/js/data-processor.js',
    '/js/ui-renderer.js',
    '/js/analysis-controller.js',
    '/js/export-manager.js',
    '/js/visualizer.js',
    '/js/theme-toggle.js'
];

// External CDN resources (cache on first use)
const CDN_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/',
    'https://cdnjs.cloudflare.com/ajax/libs/vis-network/',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Cache installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip DoH requests (always need network)
    if (url.hostname.includes('dns.google') || 
        url.hostname.includes('cloudflare-dns') ||
        url.hostname.includes('dns.quad9')) {
        return;
    }

    // For API requests (crt.sh, hackertarget, etc.), use network-first
    if (url.hostname.includes('crt.sh') ||
        url.hostname.includes('hackertarget') ||
        url.hostname.includes('api.certspotter') ||
        url.hostname.includes('api.ssllabs')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // For CDN resources, use cache-first with network fallback
    if (CDN_RESOURCES.some(cdn => event.request.url.startsWith(cdn))) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // For static assets, use cache-first
    event.respondWith(cacheFirst(event.request));
});

// Cache-first strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Network request failed:', error);
        // Return offline page or error
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Network-first strategy (for API calls)
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    }
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

