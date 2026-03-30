// This is a basic service worker to make the app installable (PWA).
self.addEventListener('fetch', (event) => {
  // For now, we're just letting the network handle everything.
  // This satisfies the "has a fetch handler" requirement for PWA installability.
});
