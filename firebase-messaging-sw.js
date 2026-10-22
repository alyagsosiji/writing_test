/* firebase-messaging-sw.js - PWA 렌더링 최적화 및 백그라운드 푸시 통합 최종 완결판 */

const CACHE_NAME = 'writing-final-v6.7'; // 버전을 올려 기존 꼬인 캐시를 즉시 파기합니다.
const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'style.css',
    'script.js',
    'manifest.json', 
    '글_하은.png',
    '멘헤라_하은.png'
];

// 1. 서비스 워커 설치 및 뼈대 자산 캐싱
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// 2. 구버전 캐시 및 충돌 찌꺼기 즉시 삭제
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. ⚡ 고급 인터셉터 (PWA 설치 요건 충족 + 멈춤 현상 원천 차단)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // GET 요청이 아니거나 외부 스킴인 경우(확장프로그램 등) 통과
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // BGM(오디오)은 캐싱하면 메모리가 터지므로 통과
    if (event.request.destination === 'audio' || url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav')) return;

    // 외부 폰트/아이콘은 캐시 에러가 잦으므로 통과
    if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }

    // 💡 데스크탑 PWA 요건 (네비게이션 오프라인 폴백) 및 코어 자산 업데이트 전략
    const isCoreFile = event.request.mode === 'navigate' || 
                       url.pathname.endsWith('index.html') || 
                       url.pathname.endsWith('script.js') || 
                       url.pathname.endsWith('style.css') || 
                       url.pathname === '/' || url.pathname.endsWith('./');

    if (isCoreFile) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cachedResponse) => {
                        return cachedResponse || caches.match('index.html');
                    });
                })
        );
    } else {
        // 이미지는 속도 향상을 위해 캐시 우선 호출
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
                    }
                    return response;
                }).catch(() => new Response('Offline Asset Unavailable', { status: 503 }));
            })
        );
    }
});

// ==========================================
// 4. Firebase Cloud Messaging (푸시 알림 엔진)
// ==========================================
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
    console.log('[SW] 백그라운드 푸시 알림 수신: ', payload);
    const notificationTitle = payload.notification.title || "수평선 너머의 서재";
    const notificationOptions = {
        body: payload.notification.body,
        icon: "글_하은.png",
        badge: "멘헤라_하은.png", 
        vibrate: [200, 100, 200]
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// 5. 알림 클릭 시 웹사이트 열기 / 포커스
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // 클릭 시 알림 닫기

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // 1. 이미 서재 창이 열려있는 경우 그 창을 맨 앞으로 가져옴 (포커스)
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    return client.focus();
                }
            }
            // 2. 열려있는 창이 없다면 새로 열기
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

