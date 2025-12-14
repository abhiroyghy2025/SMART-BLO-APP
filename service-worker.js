
const CACHE_NAME = 'smart-blo-cache-v12';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/index.tsx',
    '/src/App.tsx',
    '/metadata.json',
    '/src/components/FileUpload.tsx',
    '/src/components/DataEditor.tsx',
    '/src/components/DataTable.tsx',
    '/src/components/Header.tsx',
    '/src/components/HomeScreen.tsx',
    '/src/components/icons.tsx',
    '/src/components/Modal.tsx',
    '/src/components/SearchPage.tsx',
    '/src/components/LoginScreen.tsx',
    '/src/components/VoterFormModal.tsx',
    '/src/components/AboutPage.tsx',
    '/src/components/AdminDashboard.tsx',
    '/src/hooks/useGemini.ts',
    '/src/hooks/useSpeechRecognition.ts',
    '/src/utils/geminiParser.ts',
    '/src/utils/auth.ts',
    '/src/utils/safeStorage.ts',
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
                const cachePromises = URLS_TO_CACHE.map(url => {
                    return cache.add(new Request(url, {cache: 'no-cache'})).catch(e => {
                        console.warn(`Failed to cache ${url}`, e);
                    });
                });
                return Promise.all(cachePromises);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && !event.request.url.startsWith('chrome-extension://')) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    // console.error('Fetch failed:', error);
                    throw error;
                });
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
