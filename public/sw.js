self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
});

self.addEventListener('fetch', (event) => {
  // This is a basic pass-through service worker.
  // It's sufficient to make the app installable.
  event.respondWith(fetch(event.request));
});
