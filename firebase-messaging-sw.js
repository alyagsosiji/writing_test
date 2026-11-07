/* firebase-messaging-sw.js - PWA 렌더링 최적화 및 백그라운드 푸시 통합 */
const CACHE_NAME = 'writing-final-v6.8';
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    '글_하은.png',
    '멘헤라_하은.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : null))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) return;
    if (event.request.destination === 'audio' || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) return;
    if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }
    const isCoreFile = event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('script.js') || url.pathname.endsWith('style.css') || url.pathname === '/';
    if (isCoreFile) {
        event.respondWith(
            fetch(event.request).then((response) => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => caches.match(event.request).then((res) => res || caches.match('index.html')))
        );
    }
});

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const secureConfig = {
    apiKey: atob("QUl6YVN5QzducVFxRUpjRnBfamR5NHdWRzMzV1lYSWo1eFdKdVYw"),
    authDomain: atob("c3Rhci1ib2NrLmZpcmViYXNlYXBwLmNvbQ=="),
    databaseURL: atob("aHR0cHM6Ly9zdGFyLWJvY2stZGVmYXVsdC1ydGRiLmZpcmViYXNlaW8uY29t"),
    projectId: atob("c3Rhci1ib2Nr"),
    storageBucket: atob("c3Rhci1ib2NrLmZpcmViYXNlc3RvcmFnZS5hcHA="),
    messagingSenderId: atob("MzUxNTA3Nzg0NzE3"),
    appId: atob("MTozNTE1MDc3ODQ3MTc6d2ViOmUyMmJiNTcxOGMwZWJmYmQzY2ExNDQ="),
    measurementId: atob("Ry0zRU03OTQ3OUpU")
};

firebase.initializeApp(secureConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = (payload.notification && payload.notification.title) || "수평선 너머의 서재";
    const notificationOptions = {
        body: payload.notification && payload.notification.body,
        icon: "글_하은.png",
        badge: "멘헤라_하은.png",
        vibrate: [200, 100, 200]
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
