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
    '/hooks/useGemini.ts',
    '/icon.svg',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Dancing+Script:wght@700&family=Lora:wght@400&display=swap',
    'https://aistudiocdn.com/@google/genai@^0.14.0'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
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
                return fetch(event.request);
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