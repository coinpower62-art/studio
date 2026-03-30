// A minimal service worker to make the app installable.
// This is required for the 'beforeinstallprompt' event to be fired.

self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  // The service worker is installed.
  // We are not pre-caching any assets in this simple setup.
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  // The service worker is activated.
});

self.addEventListener('fetch', (event) => {
  // This is a "network-first" service worker.
  // It simply passes the request to the network.
  // This is the simplest strategy and ensures the app is always up-to-date,
  // but it does not provide offline capabilities.
  event.respondWith(fetch(event.request));
});
