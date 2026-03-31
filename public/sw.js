// This is a basic service worker to make the app installable.
self.addEventListener('fetch', function(event) {
  // We are not adding any offline caching for now.
  // The service worker's presence is enough for PWA installability.
  event.respondWith(fetch(event.request));
});
