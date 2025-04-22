// service-worker.js

// Navn på cachen (versjonsnummer er lurt for oppdateringer)
const CACHE_NAME = 'fit-g4fl-cache-v1';

// Filer som skal mellomlagres for offline bruk
// VIKTIG: Oppdater denne listen hvis du legger til/endrer viktige filer!
const urlsToCache = [
  '.', // Betyr rotmappen (Index.html)
  'index.html',
  // CSS (hvis du hadde en separat fil, legg den til her)
  // 'style.css',
  // JavaScript-filer
  'Script Level names.js',
  'Script 1.js',
  'Script 3.js',
  'Script 4.js',
  'Script 5.js',
  'Script 6.js',
  'Script 7.js',
  'Script 8.js',
  'Script 9.js',
  'Script 10.js',
  // Eventuelle ikonfiler (viktig for "Legg til på startskjerm")
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
  // Andre viktige ressurser (f.eks. logo, fonter lastet lokalt)
  // 'logo.png',
  // Eksterne ressurser (CDN) KAN IKKE caches pålitelig på denne måten
  // så vi lar nettleseren håndtere dem når online.
];

// Event: Install - Kjøres når service workeren installeres
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  // Vent til mellomlagring er fullført
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Opened cache:', CACHE_NAME);
        // Legg til alle definerte filer i cachen
        return cache.addAll(urlsToCache).then(() => {
            console.log('[Service Worker] Files successfully cached.');
        }).catch(error => {
            console.error('[Service Worker] Failed to cache files during install:', error);
            // Logg hvilke filer som feilet hvis mulig (krever mer avansert logikk)
        });
      })
      .then(() => {
        // Tving den nye service workeren til å bli aktiv umiddelbart
        // (ellers må brukeren lukke alle faner av siden først)
        return self.skipWaiting();
      })
  );
});

// Event: Activate - Kjøres når service workeren aktiveres
// Her kan man rydde opp i gamle cacher hvis CACHE_NAME endres
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        // Ta kontroll over åpne sider umiddelbart
        return self.clients.claim();
    })
  );
});

// Event: Fetch - Kjøres hver gang nettleseren prøver å hente en ressurs
self.addEventListener('fetch', event => {
  // Vi bruker en "Cache first, falling back to network"-strategi for filene vi har cachet
  // For alle andre forespørsler (f.eks. Firebase, andre API-er), går vi rett til nettverket.

  const requestUrl = new URL(event.request.url);

  // Gå rett til nettverket for ikke-GET requests eller Firebase-requests
  if (event.request.method !== 'GET' || requestUrl.protocol.startsWith('chrome-extension') || requestUrl.hostname.includes('firebase') || requestUrl.hostname.includes('gstatic.com') || requestUrl.hostname.includes('google.com')) {
     // console.log('[Service Worker] Bypassing cache for non-GET or external request:', event.request.url);
    // Viktig: Ikke kall event.respondWith() her hvis du ikke vil håndtere det
    return;
  }

  // Prøv å finne forespørselen i cachen
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Hvis funnet i cache, returner den
        if (cachedResponse) {
          // console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Hvis ikke funnet i cache, hent fra nettverket
        // console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Valgfritt: Legg den nye responsen i cachen for fremtidig bruk
            // Dette er nyttig for filer som ikke var i den opprinnelige urlsToCache,
            // men som lastes inn senere (f.eks. bilder).
            // Vær forsiktig med å cache *alt*, spesielt API-responser.
            // if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME)
            //     .then(cache => {
            //       cache.put(event.request, responseToCache);
            //     });
            // }
            return networkResponse;
          }
        ).catch(error => {
            // Håndter feil ved nettverkshenting (f.eks. vis en offline-side)
            console.warn('[Service Worker] Fetch failed; returning offline page or error.', error);
            // Man kan returnere en spesifikk offline.html her hvis ønskelig
            // return caches.match('offline.html');
        });
      })
  );
});
