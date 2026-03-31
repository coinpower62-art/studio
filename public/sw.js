
// A basic service worker to make the app installable.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // You can add caching logic here if needed in the future.
});

self.addEventListener('fetch', (event) => {
  // For now, just fetch from the network.
  event.respondWith(fetch(event.request));
});
