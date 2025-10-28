

const CACHE_NAME = 'smart-blo-cache-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/index.tsx',
    '/App.tsx',
    '/types.ts',
    '/metadata.json',
    '/components/FileUpload.tsx',
    '/components/DataEditor.tsx',
    '/components/DataTable.tsx',
    '/components/Header.tsx',
    '/components/HomeScreen.tsx',
    '/components/icons.tsx',
    '/components/Modal.tsx',
    '/components/SearchPage.tsx',
    '/components/LoginScreen.tsx',
    '/components/VoterFormModal.tsx',
    '/components/AboutPage.tsx',
    '/components/OnboardingTour.tsx',
    '/components/Adsense.tsx',
    '/components/SettingsModal.tsx',
    '/components/AdminDashboard.tsx',
    '/hooks/useGemini.ts',
    '/hooks/useSpeechRecognition.ts',
    '/utils/geminiParser.ts',
    '/utils/auth.ts',
    '/icon.svg',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Lora:wght@400&family=Teko:wght@400&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                // Use addAll with a new Request object with no-cache mode to bypass HTTP cache
                const cachePromises = URLS_TO_CACHE.map(url => {
                    return cache.add(new Request(url, {cache: 'no-cache'}));
                });
                return Promise.all(cachePromises);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Use a stale-while-revalidate strategy
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Check if we received a valid response.
                    // We don't cache chrome-extension:// requests.
                    if (networkResponse && networkResponse.status === 200 && !event.request.url.startsWith('chrome-extension://')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('Fetch failed:', error);
                    // If network fails and there's no cache, the request will fail.
                    // A custom offline page could be returned here if it were cached.
                    throw error;
                });

                // Return the cached response if it exists, otherwise wait for the network.
                return response || fetchPromise;
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
