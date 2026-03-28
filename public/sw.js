// This is a basic service worker file.
// It's required for a web app to be installable (PWA).
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

self.addEventListener('fetch', (event) => {
  // A basic fetch handler.
  // For a more robust offline experience, you would add caching strategies here.
  event.respondWith(fetch(event.request));
});
