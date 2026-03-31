// A minimal service worker to make the app installable.
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // Optional: skip waiting to activate the new service worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service worker activated.');
    // Optional: take control of all pages under its scope immediately.
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A basic fetch handler. For a real app, you would implement caching strategies here.
  event.respondWith(fetch(event.request));
});
