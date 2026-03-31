// This is a minimal service worker file required to make the app installable (PWA).
// It doesn't perform any caching, but its presence is necessary.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
