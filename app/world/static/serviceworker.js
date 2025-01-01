const CACHE_NAME = 'dublin-amenities-cache-v2';
const urlsToCache = [
    '/', // Home page
    '/static/css/styles.css',
    '/static/js/map.js',
    '/static/js/theme.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png',
    '/offline.html' // Offline fallback page
];

// Install event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching assets...');
            return cache.addAll(urlsToCache);
        })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            )
        )
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response; // Return cached file
            }
            return fetch(event.request)
                .then((fetchResponse) => {
                    if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                        return fetchResponse;
                    }
                    // Clone the response and add it to the cache
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return fetchResponse;
                })
                .catch(() => {
                    // Return offline fallback for navigational requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                });
        })
    );
});
