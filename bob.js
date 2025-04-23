// bob.js (Service Worker)

// Navn på cachen (endre versjon ved store endringer i cachede filer)
const CACHE_NAME = 'fit-g4fl-cache-v2'; // Økt versjon pga endring

// Filer som skal mellomlagres for offline bruk
const urlsToCache = [
  '.', // Betyr rotmappen (index.html)
  'index.html',
  // CSS (hvis du hadde en separat fil)
  // 'style.css',
  // === JavaScript-filer (Basert på din refaktorering) ===
  'Script Level names.js',
  'Script 1.js', // Admin
  // Script 2 er erstattet
  'Script 3.js', // Chat
  'Script 4.js', // Log Helpers
  'Script 5.js', // Charts
  'Script 6.js', // Comments
  'Script 7.js', // Discord
  'Script 8.js', // Core Setup, State, Basic UI, Helpers, Feed
  'Script 9.js', // Core Logic - Logging, Display, Data Management
  'Script 10.js', // Antatt å inneholde setupBaseEventListeners
  // ======================================================
  // Ikoner
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  // Andre ressurser du vil cache?
];

// Event: Install
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        // Prøv å cache alle filer. Viktig at alle finnes!
        return cache.addAll(urlsToCache).then(() => {
            console.log('[Service Worker] Files successfully cached.');
        }).catch(error => {
            console.error('[Service Worker] Failed to cache one or more files during install. Check urlsToCache list and file paths! Error:', error);
            // Kast feilen videre for å signalisere at installasjonen feilet
            throw error;
        });
      })
      .then(() => {
        console.log('[Service Worker] Installation successful, skipping waiting.');
        return self.skipWaiting(); // Aktiver umiddelbart
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Event: Activate
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) { // Slett alle ANDRE cacher enn den nyeste
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('[Service Worker] Claiming clients...');
        return self.clients.claim(); // Ta kontroll over sider umiddelbart
    })
  );
   console.log('[Service Worker] Activated.');
});

// Event: Fetch
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignorer ikke-GET, chrome-extension, og kjente eksterne API-kall
  const isExternal = requestUrl.origin !== self.location.origin;
  const isFirebase = requestUrl.hostname.includes('firebase') || requestUrl.hostname.includes('gstatic') || requestUrl.hostname.includes('google.com');
  const isExtension = requestUrl.protocol.startsWith('chrome-extension');
  const isTailwind = requestUrl.hostname.includes('tailwindcss.com'); // Ignorer også Tailwind CDN
  const isTone = requestUrl.hostname.includes('cdnjs.cloudflare.com'); // Ignorer Tone.js CDN
  const isChart = requestUrl.hostname.includes('cdn.jsdelivr.net'); // Ignorer Chart.js CDN


  if (event.request.method !== 'GET' || isExtension || isFirebase || isExternal || isTailwind || isTone || isChart) {
    // La nettleseren håndtere disse som normalt
    return;
  }

  // Strategi: Cache First, then Network (for lokale assets listet i urlsToCache)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Funnet i cache!
          return cachedResponse;
        }
        // Ikke i cache, hent fra nettverket
        return fetch(event.request).catch(error => {
            console.warn('[Service Worker] Network fetch failed:', error, event.request.url);
            // Kan evt. returnere en fallback-side her ved feil
             return new Response('Network error trying to fetch resource', {
               status: 408, headers: { 'Content-Type': 'text/plain' },
             });
        });
      })
  );
});
