const CACHE_NAME = 'habit-tracker-v11.0-1786472635710-prod';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/src/config/firebase-config.js'
];

// Install event - cache static assets and skip waiting immediately
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()) // Force immediate activation
    );
});

// Activate event - clean ALL old caches and claim clients immediately
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('Service Worker activated, claiming clients');
            return self.clients.claim(); // Take control immediately
        })
    );
});

// Fetch event - NETWORK FIRST strategy (always try to get fresh content)
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (origin-exact match — prefix match ayni on ekli
    // harici domainleri (orn. evil.com) yanlislikla same-origin kabul edebilir)
    let requestUrl;
    try {
        requestUrl = new URL(event.request.url);
    } catch {
        return;
    }
    if (requestUrl.origin !== self.location.origin) return;

    // Firebase auth akisini SW'den muaf tut: /__/auth/ sayfalari cache'lenmemeli
    // (SW'nin cache/index.html fallback'i auth donusunu bozabilir)
    if (event.request.url.includes('/__/auth/')) return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Got network response - cache it and return
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    // Cache yazim hatasi (kota vb.) network yanitini bozmamali:
                    // ayri .catch ile zincirden izole et (skill: sw cache put)
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseToCache))
                        .catch(() => {});
                }
                return networkResponse;
            })
            .catch(() => {
                // Network failed - try cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If navigation request, return index.html from cache
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Push notification handler
self.addEventListener('push', event => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        const text = event.data ? event.data.text() : '';
        data = text ? { body: text } : {};
    }

    const title = data.title || 'Hedeflerim Hatirlatici';
    const options = {
        body: data.body || 'Bugün alışkanlıklarını takip etmeyi unutma.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'habit-reminder',
        data: {
            url: data.url || '/',
            source: data.source || 'push'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = event.notification?.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                try {
                    const url = new URL(client.url);
                    if (url.pathname === targetUrl || url.pathname === '/') {
                        if ('focus' in client) return client.focus();
                    }
                } catch {
                    // Ignore malformed client URLs.
                }
            }
            return clients.openWindow(targetUrl);
        })
    );
});
