// A simple network-first service worker

const CACHE_NAME = 'coinpower-network-first-v1';

// On install, activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately so that the service worker can control the page
  event.waitUntil(self.clients.claim());
});

// Network-first fetch strategy
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Try to fetch from the network first
        const networkResponse = await fetch(event.request);
        
        // If the fetch is successful, clone it and store it in the cache for offline use.
        // This is important for caching the cross-origin Supabase image.
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // If the network fails (e.g., offline), try to serve from the cache.
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If not in cache either, it fails.
        // This could be improved to return a generic offline fallback page,
        // but for now, this handles the core caching logic.
        console.warn('Fetch failed; returning offline fallback (if available). Resource:', event.request.url);
        return new Response('Network error: The content is not available offline.', {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});
