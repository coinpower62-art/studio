// This service worker is required to make the app installable (PWA).
self.addEventListener('fetch', (event) => {
  // A simple pass-through fetch handler.
  event.respondWith(fetch(event.request));
});
