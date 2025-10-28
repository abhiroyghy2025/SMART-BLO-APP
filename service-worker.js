

const CACHE_NAME = 'smart-blo-cache-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
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
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Dancing+Script:wght@700&family=Lora:wght@400&display=swap',
    'https://aistudiocdn.com/@google/genai@^0.14.0'
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
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Optional: Cache new requests on the fly
                        // Be careful with this, especially with API calls
                        return networkResponse;
                    }
                );
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
