// This is a basic service worker to make the app installable.
// It is intentionally left simple to meet PWA criteria without adding complexity.
self.addEventListener('fetch', (event) => {
  // A simple pass-through fetch handler.
  // This allows the browser to handle all network requests as it normally would.
  event.respondWith(fetch(event.request));
});
