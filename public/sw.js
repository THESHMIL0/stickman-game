// A minimal Service Worker required for the "Install App" prompt
self.addEventListener('fetch', function(event) {
    // We just need this file to exist to trick the browser into 
    // thinking we are a fully offline-capable app!
});