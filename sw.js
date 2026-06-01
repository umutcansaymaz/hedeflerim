const CACHE_NAME = 'habit-tracker-v9.8-frontend-prod';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
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

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Got network response - cache it and return
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
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
        body: data.body || 'Bugun aliskanliklarini takip etmeyi unutma.',
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
