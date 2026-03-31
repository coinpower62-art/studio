// This is a basic service worker file.
// It's required for a web app to be installable (PWA).
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('fetch', (event) => {
  // A simple "network-first" strategy.
  // For a real-world app, you'd want more robust caching.
  event.respondWith(
    fetch(event.request).catch(() => {
      // If the network fails, you could try to serve a cached response
      // For now, it will just fail.
    })
  );
});
