// This basic service worker is required to make the app installable.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
