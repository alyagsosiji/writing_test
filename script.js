// ==========================================
// 🔔 0-A. 모바일 및 PC 알림 커스텀 설정 항목
// ==========================================
const NOTIFICATION_CONFIG = {
    postTitle: "수평선 너머의 서재",
    postBody: "새로운 기록이 수평선 너머, 바다에 새겨졌습니다.",
    letterTitle: "수평선 너머의 서재",
    letterBody: "새로운 편지가 수평선 너머, 바다 위로 띄워졌습니다.",
    icon: "글_하은.png",                               
    badge: "글_하은.png",                                
    vibrate: [200, 100, 200]                 
};

// ==========================================
// 🎵 0-B. 음악 및 소리 엔진 설정
// ==========================================
const MY_MUSIC_LIST = [
    { title: "Ethereal Horizon - KUSE.", src: "Ethereal Horizon.mp3" },
    { title: "Ethereal Horizon - KUSE.", src: "Ethereal Horizon.mp3" }
];

let currentTrackIndex = 0;
let isTrackPlaying = false;
let audioEngine = new Audio();
let asmrEngine = new Audio("waves.mp3"); 
asmrEngine.loop = true;
let isAsmrPlaying = false;

// [글로벌 환경 제어 변수 로컬 스토리지 연동 및 안전 초기화]
window.manualTimeOverride = localStorage.getItem('env_time_override') || 'auto';
window.manualWeatherOverride = localStorage.getItem('env_weather_override') || 'auto';

let currentDisplayMode = localStorage.getItem('env_display_mode') || 'list';
let isRestMode = false; 
let backupTriggerQueued = false;

function initDraftAutoSaveEngine() {
    const targetFields = ['post-title', 'post-content', 'letter-title', 'letter-content'];
    targetFields.forEach(id => {
        const field = document.getElementById(id);
        if (!field) return;
        const savedDraft = localStorage.getItem('draft_' + id);
        if (savedDraft) field.value = savedDraft;
        field.addEventListener('input', () => localStorage.setItem('draft_' + id, field.value));
    });
}

function clearDraftCacheStorage(type) {
    if (type === 'post') { localStorage.removeItem('draft_post-title'); localStorage.removeItem('draft_post-content'); } 
    else if (type === 'letter') { localStorage.removeItem('draft_letter-title'); localStorage.removeItem('draft_letter-content'); }
}

function openSoundModal() {
    let modal = document.getElementById('sound-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'sound-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:99999;';
        modal.innerHTML = `
            <div style="background:#0f172a; padding:25px; border-radius:12px; border:1px solid #38bdf8; width:320px; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h3 style="color:#fff; margin-bottom:20px; font-size:1.1rem;">서재의 소리 설정</h3>
                <div style="margin-bottom:20px; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-bottom:10px;">🎵 수평선 배경 음악 (BGM)</p>
                    <button id="btn-music-toggle" onclick="window.togglePlayPause()" style="padding:8px 16px; border-radius:6px; background:#0284c7; color:#fff; border:none; cursor:pointer; font-weight:bold;">${isTrackPlaying ? '일시정지' : '음악 재생'}</button>
                </div>
                <div style="margin-bottom:25px; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-bottom:10px;">🌊 수평선 파도 소리 (ASMR)</p>
                    <button id="btn-asmr-toggle" onclick="window.toggleAsmr()" style="padding:8px 16px; border-radius:6px; background:#059669; color:#fff; border:none; cursor:pointer; font-weight:bold;">${isAsmrPlaying ? '파도 소리 끄기' : '파도 소리 켜기'}</button>
                </div>
                <button onclick="document.getElementById('sound-modal').style.display='none'" style="padding:6px 20px; border:1px solid #94a3b8; background:transparent; color:#94a3b8; border-radius:6px; cursor:pointer;">닫기</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const mBtn = document.getElementById('btn-music-toggle'); if(mBtn) mBtn.innerText = isTrackPlaying ? '일시정지' : '음악 재생';
        const aBtn = document.getElementById('btn-asmr-toggle'); if(aBtn) aBtn.innerText = isAsmrPlaying ? '파도 소리 끄기' : '파도 소리 켜기';
    }
    modal.style.display = 'flex';
}
window.openSoundModal = openSoundModal;

function toggleAsmr() {
    const btn = document.getElementById('btn-asmr-toggle');
    if(isAsmrPlaying) { asmrEngine.pause(); isAsmrPlaying=false; if(btn) btn.innerText='파도 소리 켜기'; }
    else { asmrEngine.play().catch(()=>{}); isAsmrPlaying=true; if(btn) btn.innerText='파도 소리 끄기'; }
}
window.toggleAsmr = toggleAsmr;

function initMusicPlayerEngine() {
    if (MY_MUSIC_LIST.length === 0) return;
    const playerTrigger = document.getElementById('mini-audio-trigger');
    loadTrack(currentTrackIndex);
    if (playerTrigger) playerTrigger.addEventListener('click', openSoundModal);
    audioEngine.addEventListener('ended', () => {
        currentTrackIndex = (currentTrackIndex + 1) % MY_MUSIC_LIST.length;
        loadTrack(currentTrackIndex);
        audioEngine.play().then(() => { if (playerTrigger) playerTrigger.classList.add('playing'); }).catch(() => { isTrackPlaying = false; if (playerTrigger) playerTrigger.classList.remove('playing'); });
    });
}

function loadTrack(index) { if (index < 0 || index >= MY_MUSIC_LIST.length) return; audioEngine.src = MY_MUSIC_LIST[index].src; }

function togglePlayPause() {
    const playerTrigger = document.getElementById('mini-audio-trigger');
    const btn = document.getElementById('btn-music-toggle');
    if (isTrackPlaying) {
        audioEngine.pause(); isTrackPlaying = false;
        if (playerTrigger) playerTrigger.classList.remove('playing');
        if (btn) btn.innerText = '음악 재생';
    } else {
        audioEngine.play().then(() => {
            isTrackPlaying = true;
            if (playerTrigger) playerTrigger.classList.add('playing');
            if (btn) btn.innerText = '일시정지';
        }).catch(err => console.log("오디오 스트리밍 방어"));
    }
}
window.togglePlayPause = togglePlayPause;

function injectRandomMemoryButton() {
    if (document.getElementById('random-memory-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'random-memory-btn';
    btn.innerHTML = '🐚';
    btn.title = "파도에 밀려온 과거의 조각 (필터를 기준으로 랜덤 글 뽑기)";
    btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
    
    btn.onclick = () => {
        let filtered = allPosts;
        if (searchAuthor !== 'all') {
            filtered = filtered.filter(item => {
                const author = item.author || "기록자";
                return searchAuthor === "하은" ? author.includes("하은") : !author.includes("하은");
            });
        }

        if (filtered.length === 0) {
            return showSystemAlert(searchAuthor === 'all' ? '아직 바다에 기록된 추억이 없습니다.' : `현재 선택된 기록자(${searchAuthor} 님)의 글이 존재하지 않습니다.`);
        }
        
        const randomPost = filtered[Math.floor(Math.random() * filtered.length)];
        openDetailModal(randomPost.id);
    };
    document.body.appendChild(btn);
}

window.openLibraryModal = function() {
    if (document.getElementById('library-modal')) {
        document.getElementById('library-modal').style.display = 'flex';
        document.body.classList.add('no-scroll');
    }
}
window.closeLibraryModal = function() {
    if (document.getElementById('library-modal')) {
        document.getElementById('library-modal').style.display = 'none';
        document.body.classList.remove('no-scroll');
    }
}

function requestNotificationPermission() {
    if (!("Notification" in window) || !database) return;
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            const messaging = firebase.messaging();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    messaging.getToken({ vapidKey: 'BP8mVTuhszB5HkdHqMC3Lo-flElm8Jj06TGct_qEdzhn30bmgxfYKlG8z0n2DE0BD6L_upJVfliSX9Ua0vCg5Pg', serviceWorkerRegistration: registration })
                    .then((currentToken) => {
                        if (currentToken) {
                            const cleanToken = currentToken.replace(/[.#$\[\]]/g, '_');
                            let tokenPath = 'fcmTokens/visitors/' + cleanToken;
                            
                            if (isAdmin && (loggedInUser === '아시' || loggedInUser === '하은')) {
                                tokenPath = 'fcmTokens/admins/' + loggedInUser + '/' + cleanToken;
                            }

                            const cacheKey = `last_token_path_${loggedInUser || 'visitor'}`;
                            if (localStorage.getItem(cacheKey) === tokenPath) return;
                            
                            database.ref(tokenPath).set(currentToken)
                            .then(() => {
                                localStorage.setItem(cacheKey, tokenPath);
                            });
                        }
                    });
                });
            }
        }
    });
}

// ==========================================
// 🔒 [최종 해결] 웹앱 설치 시 중복 알림 방지 & 서비스 워커 알림 위임
// ==========================================
function sendNotification(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = Date.now();
    const lastNotiTime = localStorage.getItem('last_noti_time') || 0;
    const lastNotiBody = localStorage.getItem('last_noti_body') || '';

    if (now - lastNotiTime < 5000 && lastNotiBody === body) return;

    localStorage.setItem('last_noti_time', now.toString());
    localStorage.setItem('last_noti_body', body);

    const notificationOptions = {
        body: body,
        icon: NOTIFICATION_CONFIG.icon,
        badge: NOTIFICATION_CONFIG.badge,
        vibrate: NOTIFICATION_CONFIG.vibrate,
        tag: 'library-notification' 
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function(registration) {
            registration.showNotification(title, notificationOptions);
        }).catch(function() {
            new Notification(title, notificationOptions);
        });
    } else {
        new Notification(title, notificationOptions);
    }
}

function hideLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            if (localStorage.getItem('library_welcomed') !== 'true') {
                localStorage.setItem('library_welcomed', 'true');
                window.openLibraryModal();
            }
        }, 300);
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') { hideLoadingScreen(); } 
else { document.addEventListener('DOMContentLoaded', hideLoadingScreen); }

window.setDisplayMode = function(mode) {
    currentDisplayMode = mode;
    currentPage = 1; 
    localStorage.setItem('env_display_mode', mode);
    
    if (window.infiniteObserver) {
        window.infiniteObserver.disconnect();
        window.infiniteObserver = null;
    }
    renderUI();
};

const secureConfig = {
    apiKey: "AIzaSyC7nqQqEJcFp_jdy4wVG33WYXIj5xWJuV0",
    authDomain: "star-bock.firebaseapp.com",
    databaseURL: "https://star-bock-default-rtdb.firebaseio.com", 
    projectId: "star-bock",
    storageBucket: "star-bock.appspot.com",
    messagingSenderId: "351507784717",
    appId: "1:351507784717:web:e22bb5718c0ebfbd3ca144",
    measurementId: "G-3EM79479JT"
};

let database = null;
try { 
    if (typeof firebase !== 'undefined') { 
        // 1. 파이어베이스 기본 초기화가 먼저 무조건 실행되어야 합니다!
        firebase.initializeApp(secureConfig); 
        database = firebase.database(); 
        
        // 2. 초기화가 끝난 직후에 앱 체크(App Check) 방어막을 켭니다.
        if (firebase.appCheck) {
            const appCheck = firebase.appCheck();
            appCheck.activate('6LeF0yctAAAAAD-CVI-X1HI3qIi9n_ySlFces9ag', true);
        }
    } 
} catch (error) { 
    console.error("Firebase 초기화 에러:", error); 
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        if (localStorage.getItem('isAdminLoggedIn') === 'true') { isAdmin = true; loggedInUser = localStorage.getItem('loggedInUser') || ''; requestNotificationPermission(); }
        applyTimeBasedThemeEngine();
        initDraftAutoSaveEngine();
        injectRandomMemoryButton();
        injectTimeGearButton();
        
        let preWeather = document.getElementById('weather-widget');
        if(!preWeather && document.body) {
            preWeather = document.createElement('div');
            preWeather.id = 'weather-widget';
            document.body.appendChild(preWeather);
        }
        if(preWeather) preWeather.innerText = "⏳ 바다 읽는 중...";

        fetchWeatherWidget();
        syncWeatherAndWidget(); 
        setInterval(syncWeatherAndWidget, 30 * 60000); 
        listenPosts();
        listenHorizons(); // 🚨 추가된 수평선 실시간 감지
        listenLetters();
        initMusicPlayerEngine(); 
        
        if(typeof firebase !== 'undefined' && database) {
            database.ref('settings').on('value', snap => {
                const settings = snap.val() || {};
                isRestMode = settings.restMode || false;
                updateUI();
            });
        }
    } catch (e) {
        console.error("인프라 가동 실패 예외 : ", e);
        hideLoadingScreen();
    }
});

let newWorker;
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('firebase-messaging-sw.js', { scope: './' }).then((reg) => {
            if (typeof firebase !== 'undefined' && firebase.messaging) { firebase.messaging().useServiceWorker(reg); }
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => { if (newWorker.state === 'installed' && navigator.serviceWorker.controller) { const updateToast = document.getElementById('update-toast'); if (updateToast) updateToast.classList.add('show'); } });
            });
        }).catch((err) => console.error(err));
    });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!refreshing) { refreshing = true; window.location.reload(); } });
}

document.addEventListener('DOMContentLoaded', () => {
    const reloadBtn = document.getElementById('update-reload-btn'); const dismissBtn = document.getElementById('update-dismiss-btn'); const updateToast = document.getElementById('update-toast');
    if (reloadBtn) reloadBtn.addEventListener('click', () => { if (updateToast) updateToast.classList.remove('show'); if (newWorker) newWorker.postMessage({ action: 'skipWaiting' }); });
    if (dismissBtn) dismissBtn.addEventListener('click', () => { if (updateToast) updateToast.classList.remove('show'); });
});

function formatTo24Hour(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr).trim(); str = str.replace(/\b24(?=:\d{2})/g, '00');
    if (str.includes('오전') || str.includes('오후')) {
        const isPm = str.includes('오후'); str = str.replace(/오전\s*|오후\s*/g, ''); 
        str = str.replace(/(\d{1,2})(?=:\d{2})/, function(match) {
            let h = parseInt(match, 10);
            if (isPm) { if (h !== 12) h += 12; } else { if (h === 12) h = 0; }
            return String(h).padStart(2, '0');
        });
    }
    return str;
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('keydown', function(e) {
    if (e.key === "F12") { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) { e.preventDefault(); return false; }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
});

function decodeData(str) { return decodeURIComponent(escape(atob(str))); }

const secureAdmin = { id: decodeData("7JWE7Iuc"), pw: atob("YXNoaSMyNjA0MTY=") };

let isAdmin = false; let loggedInUser = ''; let currentView = 'posts'; let currentPage = 1; const postsPerPage = 6;
let allPosts = []; let allHorizons = []; let allLetters = []; let editTargetKey = null; let searchKeyword = ''; let searchAuthor = 'all';
let isSubmitting = false; let isInternalSyncAction = false; 

function showSystemAlert(message, callback) {
    const modalElem = document.getElementById('system-modal');
    if (document.getElementById('system-title')) document.getElementById('system-title').innerText = "안내";
    if (document.getElementById('system-message')) document.getElementById('system-message').innerText = message;
    if (document.getElementById('system-buttons')) {
        document.getElementById('system-buttons').innerHTML = "";
        const okBtn = document.createElement('button'); okBtn.innerText = "확인";
        okBtn.onclick = function() { if (modalElem) modalElem.style.display = 'none'; if (callback) callback(); };
        document.getElementById('system-buttons').appendChild(okBtn);
    }
    if (modalElem) modalElem.style.display = 'flex';
}

function showSystemConfirm(message, onConfirm, onCancel) {
    const modalElem = document.getElementById('system-modal');
    if (document.getElementById('system-title')) document.getElementById('system-title').innerText = "확인";
    if (document.getElementById('system-message')) document.getElementById('system-message').innerText = message;
    if (document.getElementById('system-buttons')) {
        document.getElementById('system-buttons').innerHTML = "";
        const confirmBtn = document.createElement('button'); confirmBtn.innerText = "확인";
        confirmBtn.onclick = function() { if (modalElem) modalElem.style.display = 'none'; if (onConfirm) onConfirm(); };
        const cancelBtn = document.createElement('button'); cancelBtn.innerText = "취소"; cancelBtn.className = "cancel-btn";
        cancelBtn.onclick = function() { if (modalElem) modalElem.style.display = 'none'; if (onCancel) onCancel(); };
        document.getElementById('system-buttons').appendChild(confirmBtn); document.getElementById('system-buttons').appendChild(cancelBtn);
    }
    if (modalElem) modalElem.style.display = 'flex';
}

function openModal() { if (document.getElementById('login-modal')) document.getElementById('login-modal').style.display = 'flex'; }
function closeModal() { if (document.getElementById('login-modal')) document.getElementById('login-modal').style.display = 'none'; }
function closeDetailModal() { if (document.getElementById('detail-modal')) { document.getElementById('detail-modal').style.display = 'none'; document.body.classList.remove('no-scroll'); } }
window.openModal = openModal; window.closeModal = closeModal; window.closeDetailModal = closeDetailModal;

function openBackupModal() { 
    if (!isAdmin) return; 
    if (document.getElementById('backup-modal')) { 
        document.getElementById('backup-modal').style.display = 'flex'; 
        window.switchAdminTab('backup'); 
    } 
}
function closeBackupModal() { if (document.getElementById('backup-modal')) document.getElementById('backup-modal').style.display = 'none'; }
window.openBackupModal = openBackupModal; window.closeBackupModal = closeBackupModal;

window.switchAdminTab = function(tab) {
    const btnBackup = document.getElementById('admin-btn-backup');
    const btnSettings = document.getElementById('admin-btn-settings');
    const listContainer = document.getElementById('backup-list-container');
    const delControls = document.getElementById('backup-delete-controls');
    const settingsContainer = document.getElementById('admin-settings-container');
    const subtitleSpan = document.getElementById('backup-modal-subtitle');
    const timelineWrapper = document.querySelector('.backup-timeline-wrapper');

    if (tab === 'backup') {
        if(btnBackup) { btnBackup.style.color = '#f7a37f'; btnBackup.style.borderBottom = '2px solid #f7a37f'; }
        if(btnSettings) { btnSettings.style.color = '#64748b'; btnSettings.style.borderBottom = '2px solid transparent'; }
        if(listContainer) listContainer.style.setProperty('display', 'block', 'important');
        if(delControls) delControls.style.setProperty('display', 'flex', 'important');
        if(settingsContainer) settingsContainer.style.setProperty('display', 'none', 'important');
        if(subtitleSpan) subtitleSpan.style.setProperty('display', 'block', 'important'); 
        if(timelineWrapper) timelineWrapper.style.setProperty('display', 'block', 'important');
        loadBackupTimelineList();
    } else if (tab === 'settings') {
        if(btnSettings) { btnSettings.style.color = '#f7a37f'; btnSettings.style.borderBottom = '2px solid #f7a37f'; }
        if(btnBackup) { btnBackup.style.color = '#64748b'; btnBackup.style.borderBottom = '2px solid transparent'; }
        if(listContainer) listContainer.style.setProperty('display', 'none', 'important');
        if(delControls) delControls.style.setProperty('display', 'none', 'important'); 
        if(settingsContainer) settingsContainer.style.setProperty('display', 'block', 'important');
        if(subtitleSpan) subtitleSpan.style.setProperty('display', 'none', 'important'); 
        if(timelineWrapper) timelineWrapper.style.setProperty('display', 'none', 'important');
        renderAdminSettings();
    }
}

function renderAdminSettings() {
    const container = document.getElementById('admin-settings-container');
    if(!container) return;
    container.innerHTML = `
        <div style="background:rgba(3,10,23,0.5); padding:20px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); text-align:left; margin-bottom: 15px;">
            <h3 style="color:#fff; margin-bottom:15px; font-size:1.05rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">관리자 전용 제어 시스템</h3>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="padding-right:10px;">
                    <div style="color:#e2e8f0; font-weight:bold; margin-bottom:5px;">🌊 바다 휴식 모드 (수신 차단)</div>
                    <div style="color:#94a3b8; font-size:0.75rem; line-height:1.4;">활성화 시, 일반 방문객들의 편지 수신 작성이 제한되고 안내 문구가 표시됩니다.</div>
                </div>
                <button onclick="window.toggleRestMode()" style="flex-shrink:0; padding:8px 14px; font-size:0.8rem; border-radius:6px; background:${isRestMode ? '#ef4444' : '#475569'}; color:#fff; border:none; cursor:pointer;">
                    ${isRestMode ? '휴식 중 (해제하기)' : '휴식 모드 켜기'}
                </button>
            </div>
        </div>
    `;
}

function toggleRestMode() {
    if(!isAdmin || !database) return;
    const targetState = !isRestMode; 
    database.ref('settings/restMode').set(targetState).then(() => {
        showSystemAlert(targetState ? '바다가 휴식에 들어갑니다. 편지 수신이 차단됩니다.' : '바다의 휴식이 끝났습니다. 편지 수신이 재개됩니다.');
        renderAdminSettings();
    });
}
window.toggleRestMode = toggleRestMode;

// ==========================================
// 🔐 2차 인증 및 로그인 상태 제어
// ==========================================
let currentPin = '';
let pendingUser = null; 

// ✅ 암호화된 해시값은 반드시 딱 한 번만 선언해야 합니다!
const ENCRYPTED_PIN_HASH = 'MjYwNDE2';

// 1. 기존 onAuthStateChanged
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // 이미 이번 접속에서 PIN 인증을 통과했다면 곧바로 진입
        if (sessionStorage.getItem('pinAuthenticated') === 'true') {
            finalizeLogin(user);
        } else {
            // 이메일 로그인은 맞지만, 아직 PIN을 안 쳤다면 팝업창 띄우기
            pendingUser = user;
            currentPin = '';
            document.getElementById('pin-display').innerText = '';
            document.getElementById('pin-modal').style.display = 'flex';
        }
    } else {
        // 로그아웃 상태
        isAdmin = false;
        loggedInUser = '';
        localStorage.removeItem('isAdminLoggedIn'); 
        localStorage.removeItem('loggedInUser');
        sessionStorage.removeItem('pinAuthenticated'); // 로그아웃 시 인증 기록 초기화
        updateUI();
    }
});

// 2. 2차 인증 성공 시 최종 진입 함수
function finalizeLogin(user) {
    sessionStorage.setItem('pinAuthenticated', 'true'); // 브라우저를 닫기 전까지 인증 유지
    isAdmin = true;
    if (user.email === 'alyagsosiji@gmail.com') loggedInUser = '아시';
    else if (user.email === 'haeunchan0114@naver.com') loggedInUser = '하은';
    
    localStorage.setItem('isAdminLoggedIn', 'true'); 
    localStorage.setItem('loggedInUser', loggedInUser);
    
    // 🚨 PIN 코드까지 통과하여 최종 입장할 때 비로소 환영 인사를 띄웁니다.
    if (typeof showSystemAlert === 'function') {
        showSystemAlert(`환영합니다, 수평선 너머 바다의 기록자, ${loggedInUser}님.`);
    } else {
        alert(`환영합니다, 수평선 너머 바다의 기록자, ${loggedInUser}님.`);
    }
    
    requestNotificationPermission();
    listenPosts();
    listenHorizons();
    listenLetters();
    updateUI(); 
}

// 3. 키패드 작동 함수들
function inputPin(num) {
    if (currentPin.length < 6) currentPin += num;
    document.getElementById('pin-display').innerText = '●'.repeat(currentPin.length);
}

function clearPin() {
    currentPin = '';
    document.getElementById('pin-display').innerText = '';
}

// 🚨 기존에 여기에 있던 중복된 const ENCRYPTED_PIN_HASH 선언을 삭제했습니다.

async function submitPin() {
    // 사용자가 키패드로 입력한 번호를 똑같이 암호화(인코딩)하여 대조합니다.
    const encodedInput = btoa(currentPin);

    if (encodedInput === ENCRYPTED_PIN_HASH) {
        // ✅ 비밀번호 일치: 서재 입장
        document.getElementById('pin-modal').style.display = 'none';
        finalizeLogin(pendingUser);
    } else {
        // ❌ 비밀번호 불일치: 접근 차단 및 강제 로그아웃
        if (typeof showSystemAlert === 'function') {
            showSystemAlert('올바른 접근이 아닙니다.');
        } else {
            alert('올바른 접근이 아닙니다.');
        }
        firebase.auth().signOut();
        document.getElementById('pin-modal').style.display = 'none';
        clearPin();
    }
}

// ==========================================
// 🔐 4. 아이디(닉네임) -> 이메일 자동 매핑 로그인 함수
// ==========================================

function login() {
    // 1. HTML의 태그(id) 이름을 몰라도, 로그인 모달창 자체를 알아서 찾아냅니다.
    const modal = document.getElementById('login-modal');
    if (!modal) {
        console.error("로그인 모달창을 찾을 수 없습니다.");
        return;
    }
    
    // 2. 모달창 안에 있는 입력칸(텍스트, 비밀번호)을 자동으로 쏙 뽑아옵니다.
    const idElem = modal.querySelector('input[type="text"], input[type="email"]') || modal.querySelectorAll('input')[0];
    const pwElem = modal.querySelector('input[type="password"]') || modal.querySelectorAll('input')[1];
    
    if (!idElem || !pwElem) {
        console.error("아이디와 비밀번호 입력칸을 찾을 수 없습니다.");
        return;
    }
    
    const inputId = idElem.value.trim();
    const inputPw = pwElem.value.trim();
    
    // 3. 빈칸 방지
    if (!inputId || !inputPw) {
        if (typeof showSystemAlert === 'function') {
            showSystemAlert('서재의 열쇠를 모두 입력해주세요.');
        } else {
            alert('서재의 열쇠를 모두 입력해주세요.');
        }
        return;
    }
    
    // 4. 기록자님의 원래 로직 복구: 닉네임을 파이어베이스 이메일로 마법처럼 자동 변환
    let targetEmail = inputId; // 기본적으로는 입력값을 쓰되,
    if (inputId === '아시') {
        targetEmail = 'alyagsosiji@gmail.com';
    } else if (inputId === '하은') {
        targetEmail = 'haeunchan0114@naver.com';
    }
    
    // 5. 파이어베이스 인증의 문을 두드립니다.
    firebase.auth().signInWithEmailAndPassword(targetEmail, inputPw)
        .then(() => {
            // 1차 통과 시 껍데기 모달창만 닫아주고 입력칸 초기화
            if (typeof closeModal === 'function') closeModal(); 
            idElem.value = ''; 
            pwElem.value = '';
            // 🚨 최종 환영 인사는 이후 2차 PIN 인증까지 통과하면 finalizeLogin()에서 등장합니다.
        })
        .catch((error) => {
            console.error("인증 에러:", error);
            if (typeof showSystemAlert === 'function') {
                showSystemAlert('서재의 열쇠가 맞지 않습니다.');
            } else {
                alert('서재의 열쇠가 맞지 않습니다.');
            }
        });
}

window.login = login;

function logout() { 
    firebase.auth().signOut().then(() => {
        cancelEdit(); 
        showSystemAlert('로그아웃 되었습니다.'); 
    });
}
window.logout = logout;

function updateUI() {
    const writeSection = document.getElementById('write-section'); 
    const letterSection = document.getElementById('letter-section');
    const loginBtn = document.getElementById('login-btn'); 
    const adminMenu = document.getElementById('admin-menu');
    const tabContainer = document.getElementById('view-tab-container'); 
    const currentUserBtn = document.getElementById('current-user-btn'); 
    const backupTrigger = document.getElementById('mini-backup-trigger');
    const tabHorizons = document.getElementById('tab-horizons');

    if (isAdmin) {
        document.body.classList.add('admin-logged-in'); 
        if (writeSection) writeSection.style.display = 'block'; 
        if (letterSection) letterSection.style.display = 'none'; 
        if (loginBtn) loginBtn.style.display = 'none'; 
        if (adminMenu) adminMenu.style.display = 'flex'; 
        if (tabContainer) tabContainer.style.display = 'flex'; 
        if (tabHorizons) tabHorizons.style.display = 'inline-block'; // 관리자 전용 수평선 너머 탭 활성화
        if (currentUserBtn) currentUserBtn.innerText = `기록자 ${loggedInUser}님`; 
        if (backupTrigger) backupTrigger.style.display = 'flex'; 
        switchView(currentView);
    } else {
        document.body.classList.remove('admin-logged-in');
        if (writeSection) writeSection.style.display = 'none'; 
        if (letterSection) letterSection.style.display = 'block'; 
        if (loginBtn) loginBtn.style.display = 'inline-block'; 
        if (adminMenu) adminMenu.style.display = 'none';
        if (tabContainer) tabContainer.style.display = 'none'; 
        if (tabHorizons) tabHorizons.style.display = 'none'; // 비로그인 시 수평선 너머 탭 강제 은닉
        if (backupTrigger) backupTrigger.style.display = 'none'; 
        
        // 만약 비로그인 상태인데 수평선 너머 탭을 보고 있었다면 메인으로 사출
        if (currentView === 'horizons') switchView('posts');
        else switchView('posts'); 
    }

    const letterSubmitBtn = document.getElementById('submit-letter-btn');
    const letterContent = document.getElementById('letter-content');
    if (isRestMode) {
        if(letterSubmitBtn) { letterSubmitBtn.disabled = true; letterSubmitBtn.innerText = '바다가 쉬어가는 중입니다'; letterSubmitBtn.style.opacity = '0.5'; }
        if(letterContent) { letterContent.disabled = true; letterContent.placeholder = '현재 수평선 너머로 편지를 띄울 수 없습니다. 바다가 고요히 쉬고 있습니다.'; }
    } else {
        if(letterSubmitBtn) { letterSubmitBtn.disabled = false; letterSubmitBtn.innerText = '편지 띄우기'; letterSubmitBtn.style.opacity = '1'; }
        if(letterContent) { letterContent.disabled = false; letterContent.placeholder = '기록자 분들에게 띄워 보낼 편지의 내용을 입력해주세요.'; }
    }
}

// 🚨 뷰 스위칭: 'horizons' 로직 완벽 통합
function switchView(view) {
    if (!isAdmin && (view === 'letters' || view === 'horizons')) { currentView = 'posts'; return; }
    currentView = view; currentPage = 1;
    
    const tabPosts = document.getElementById('tab-posts'); 
    const tabHorizons = document.getElementById('tab-horizons'); 
    const tabLetters = document.getElementById('tab-letters');
    
    const mainTitle = document.getElementById('section-main-title');
    const writeTitle = document.getElementById('write-title');
    const submitPostBtn = document.getElementById('submit-post-btn');

    if (tabPosts) tabPosts.classList.remove('active'); 
    if (tabHorizons) tabHorizons.classList.remove('active'); 
    if (tabLetters) tabLetters.classList.remove('active');

    if (view === 'posts') { 
        if (tabPosts) tabPosts.classList.add('active'); 
        if (mainTitle) mainTitle.innerText = "바다의 기록"; 
        if (writeTitle && !editTargetKey) writeTitle.innerText = "새로운 기록 남기기";
        if (submitPostBtn && !editTargetKey) submitPostBtn.innerText = "기록하기";
    } else if (view === 'horizons') { 
        if (tabHorizons) tabHorizons.classList.add('active'); 
        if (mainTitle) mainTitle.innerText = "수평선 너머"; 
        if (writeTitle && !editTargetKey) writeTitle.innerText = "수평선 너머에 비밀 기록하기";
        if (submitPostBtn && !editTargetKey) submitPostBtn.innerText = "비밀 기록하기";
    } else { 
        if (tabLetters) tabLetters.classList.add('active'); 
        if (mainTitle) mainTitle.innerText = "띄워진 편지"; 
    }
    renderUI();
}
window.switchView = switchView;

function handleSearch() { searchKeyword = document.getElementById('search-input') ? document.getElementById('search-input').value.trim() : ''; searchAuthor = document.getElementById('author-filter') ? document.getElementById('author-filter').value : 'all'; currentPage = 1; renderUI(); }
window.handleSearch = handleSearch;

function parseCustomDate(dateStr) {
    if (!dateStr) return 0;
    const cleaned = String(dateStr).replace(/\s+/g, '');
    const parts = cleaned.split('.');
    if (parts.length < 4) return 0;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const timeParts = parts[3].split(':');
    const hours = parseInt(timeParts[0], 10) || 0;
    const minutes = parseInt(timeParts[1], 10) || 0;
    const seconds = parseInt(timeParts[2], 10) || 0;
    return new Date(year, month, day, hours, minutes, seconds).getTime();
}

// ==========================================
// 🌊 2. 글(Post) 실시간 감지 및 알림 타겟팅
// ==========================================
let rawPostsSnapshot = null; let rawHorizonsSnapshot = null; let rawLettersSnapshot = null; 
let isInitialPostLoad = true; let knownPostIds = new Set();
let isInitialHorizonLoad = true; let knownHorizonIds = new Set();
let isInitialLetterLoad = true; let knownLetterIds = new Set();

function listenPosts() {
    if (!database) return;
    database.ref('posts').off();
    database.ref('posts').on('value', (snapshot) => {
        rawPostsSnapshot = snapshot.val(); allPosts = []; let currentIds = new Set(); 
        let hasNewPost = false; let newPostAuthor = ''; 
        
        if (rawPostsSnapshot) {
            Object.keys(rawPostsSnapshot).forEach((key) => {
                allPosts.push({ id: key, ...rawPostsSnapshot[key] }); currentIds.add(key);
                if (!isInitialPostLoad && !knownPostIds.has(key)) {
                    hasNewPost = true;
                    newPostAuthor = rawPostsSnapshot[key].author || '기록자';
                }
            });
            allPosts.sort((a, b) => {
                const timeA = parseCustomDate(a.date) || 0;
                const timeB = parseCustomDate(b.date) || 0;
                if (timeB !== timeA) return timeB - timeA;
                return b.id.localeCompare(a.id);
            });
        }
        
        if (hasNewPost && isAdmin && newPostAuthor !== loggedInUser) {
            sendNotification(NOTIFICATION_CONFIG.postTitle, NOTIFICATION_CONFIG.postBody);
        }
        
        knownPostIds = currentIds; isInitialPostLoad = false;
        if(currentView === 'posts') renderUI();
    });
}

// 🚨 [추가] 수평선 너머 (비밀 기록) 실시간 감지 리스너
function listenHorizons() {
    if (!database) return;
    database.ref('horizons').off();
    database.ref('horizons').on('value', (snapshot) => {
        rawHorizonsSnapshot = snapshot.val(); allHorizons = []; let currentIds = new Set(); 
        let hasNewHorizon = false; let newHorizonAuthor = ''; 
        
        if (rawHorizonsSnapshot) {
            Object.keys(rawHorizonsSnapshot).forEach((key) => {
                allHorizons.push({ id: key, ...rawHorizonsSnapshot[key] }); currentIds.add(key);
                if (!isInitialHorizonLoad && !knownHorizonIds.has(key)) {
                    hasNewHorizon = true;
                    newHorizonAuthor = rawHorizonsSnapshot[key].author || '기록자';
                }
            });
            allHorizons.sort((a, b) => {
                const timeA = parseCustomDate(a.date) || 0;
                const timeB = parseCustomDate(b.date) || 0;
                if (timeB !== timeA) return timeB - timeA;
                return b.id.localeCompare(a.id);
            });
        }
        
        // 비밀 기록 알림 (다른 관리자가 비밀 글을 썼을 때 수신)
        if (hasNewHorizon && isAdmin && newHorizonAuthor !== loggedInUser) {
            sendNotification("비밀 기록", "수평선 너머에 누군가 은밀한 기록을 남겼습니다.");
        }
        
        knownHorizonIds = currentIds; isInitialHorizonLoad = false;
        if(currentView === 'horizons') renderUI();
    });
}

function listenLetters() {
    if (!database) return;
    database.ref('letters').off();
    database.ref('letters').on('value', (snapshot) => {
        rawLettersSnapshot = snapshot.val(); allLetters = []; let currentIds = new Set(); 
        let hasNewLetter = false; let newLetterAuthor = ''; 
        
        if (rawLettersSnapshot) {
            Object.keys(rawLettersSnapshot).forEach((key) => {
                allLetters.push({ id: key, ...rawLettersSnapshot[key] }); currentIds.add(key);
                if (!isInitialLetterLoad && !knownLetterIds.has(key)) {
                    hasNewLetter = true;
                    newLetterAuthor = rawLettersSnapshot[key].author || '방문자';
                }
            });
            allLetters.sort((a, b) => {
                const timeA = parseCustomDate(a.date) || 0;
                const timeB = parseCustomDate(b.date) || 0;
                if (timeB !== timeA) return timeB - timeA;
                return b.id.localeCompare(a.id);
            });
        }
        
        if (hasNewLetter && isAdmin && newLetterAuthor !== loggedInUser) {
            sendNotification(NOTIFICATION_CONFIG.letterTitle, NOTIFICATION_CONFIG.letterBody);
        }
        
        knownLetterIds = currentIds; isInitialLetterLoad = false;
        if(currentView === 'letters') renderUI();
    });
}
const CONTEXT_RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000;

// 🚨 백업 엔진에 horizons (비밀 기록) 완벽 통합
function executeCloudBackupEngine(isAutomatic = true) {
    if (!database) return Promise.reject(new Error("Database connection lost"));
    const now = new Date(); const timestamp = now.getTime();
    const dateString = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const pCount = rawPostsSnapshot ? Object.keys(rawPostsSnapshot).length : 0; 
    const hCount = rawHorizonsSnapshot ? Object.keys(rawHorizonsSnapshot).length : 0;
    const lCount = rawLettersSnapshot ? Object.keys(rawLettersSnapshot).length : 0;
    
    const backupMeta = { timestamp: timestamp, date: dateString, type: isAutomatic ? "자동" : "수동", pCount: pCount, hCount: hCount, lCount: lCount };
    const backupPayload = { posts: rawPostsSnapshot || {}, horizons: rawHorizonsSnapshot || {}, letters: rawLettersSnapshot || {} };
    const newBackupKey = database.ref().push().key;
    
    return Promise.all([ database.ref(`backupMeta/${newBackupKey}`).set(backupMeta), database.ref(`backupData/${newBackupKey}`).set(backupPayload) ])
    .then(() => { cleanExpiredBackupsTimeline(); loadBackupTimelineList(); });
}
window.executeCloudBackupEngine = executeCloudBackupEngine;

window.triggerManualBackup = function() {
    if (!isAdmin || !database) return showSystemAlert("권한이 누락되었습니다.");
    window.executeCloudBackupEngine(false)
    .then(() => showSystemAlert("현재 바다 상태 스냅샷 수동 저장이 완료되었습니다."))
    .catch(err => showSystemAlert("수동 백업 실패: " + err.message));
};
window.triggerManualBackup = triggerManualBackup;

function cleanExpiredBackupsTimeline() {
    if (!database) return;
    const expirationThreshold = new Date().getTime() - CONTEXT_RETENTION_PERIOD;
    database.ref('backupMeta').orderByChild('timestamp').endAt(expirationThreshold).once('value').then((snapshot) => {
        const expiredBackups = snapshot.val(); if (!expiredBackups) return;
        Object.keys(expiredBackups).forEach((key) => { database.ref(`backupMeta/${key}`).remove(); database.ref(`backupData/${key}`).remove(); });
    });
}

function toggleAllBackups(source) { document.querySelectorAll('.backup-checkbox').forEach(cb => cb.checked = source.checked); }
window.toggleAllBackups = toggleAllBackups;

function selectBackupsByPeriod(days) {
    const checkboxes = document.querySelectorAll('.backup-checkbox'); const selectAllCb = document.getElementById('backup-select-all');
    if(selectAllCb) selectAllCb.checked = false;
    if (!days) { checkboxes.forEach(cb => cb.checked = false); return; }
    const now = new Date().getTime(); const threshold = days === 'all' ? now + 999999999 : now - (parseInt(days) * 24 * 60 * 60 * 1000);
    let allChecked = true;
    checkboxes.forEach(cb => { const ts = parseInt(cb.getAttribute('data-timestamp')); if (days === 'all') cb.checked = true; else cb.checked = ts < threshold; if(!cb.checked) allChecked = false; });
    if (selectAllCb) selectAllCb.checked = allChecked;
}
window.selectBackupsByPeriod = selectBackupsByPeriod;

function deleteSelectedBackups() {
    if (!isAdmin || !database) return;
    const checkboxes = document.querySelectorAll('.backup-checkbox:checked'); const keysToDelete = Array.from(checkboxes).map(cb => cb.value);
    if (keysToDelete.length === 0) return showSystemAlert('소멸시킬 백업 지점을 선택해주세요.');
    showSystemConfirm(`선택하신 ${keysToDelete.length}개의 백업 기록을 영구히 소멸시키겠습니까?`, function() {
        const deletePromises = keysToDelete.map(key => { return Promise.all([ database.ref(`backupMeta/${key}`).remove(), database.ref(`backupData/${key}`).remove() ]); });
        Promise.all(deletePromises).then(() => { showSystemAlert('선택한 백업이 완전 소멸되었습니다.'); loadBackupTimelineList(); });
    });
}
window.deleteSelectedBackups = deleteSelectedBackups;

function loadBackupTimelineList() {
    let container = document.getElementById('backup-list-container'); 
    if (!container) return; container.innerHTML = '';
    
    const selectAllCb = document.getElementById('backup-select-all'); if(selectAllCb) selectAllCb.checked = false;
    const periodSelect = document.getElementById('backup-period-select'); if(periodSelect) periodSelect.value = "";

    if (document.getElementById('backup-loading-msg')) document.getElementById('backup-loading-msg').style.display = 'block';
    const expirationThreshold = new Date().getTime() - CONTEXT_RETENTION_PERIOD;
    
    database.ref('backupMeta').once('value').then((snapshot) => {
        if (document.getElementById('backup-loading-msg')) document.getElementById('backup-loading-msg').style.display = 'none';
        const backups = snapshot.val(); 
        if (!backups) { container.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding: 20px 0; text-align:center;">복구 지점이 없습니다.</p>`; return; }
        const keys = Object.keys(backups).filter(key => backups[key].timestamp >= expirationThreshold).reverse();
        if (keys.length === 0) { container.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding: 20px 0; text-align:center;">복구 지점이 없습니다.</p>`; return; }

        keys.forEach((key) => {
            const item = backups[key]; 
            const pCount = item.pCount || 0; 
            const hCount = item.hCount || 0; // 비밀기록
            const lCount = item.lCount || 0; 
            const badgeClass = item.type === "자동" ? "auto" : "manual";
            const element = document.createElement('div'); element.className = 'backup-item';
            
            element.innerHTML = `
                <div style="display:flex; align-items:center; width:100%;">
                    <input type="checkbox" class="backup-checkbox" value="${key}" data-timestamp="${item.timestamp}" style="margin-right:12px; accent-color:#f7a37f; width:16px; height:16px; cursor:pointer; flex-shrink:0;">
                    <div class="backup-meta" style="flex-grow: 1; padding-right: 8px;">
                        <div class="backup-time-title">${item.date} <span class="backup-badge-type ${badgeClass}">${item.type}</span></div>
                        <div class="backup-counts">글 ${pCount}개 ㅣ 비밀 ${hCount}개 ㅣ 편지 ${lCount}개</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-shrink:0; align-items:center;">
                        <button onclick="window.downloadBackupFile('${key}', 'txt')" style="font-size:0.75rem; border:1px solid rgba(144,224,239,0.35); color:#90e0ef; padding: 5px 9px; border-radius:6px; background:rgba(144,224,239,0.04); cursor:pointer; font-weight:500; transition:all 0.2s;">TXT</button>
                        <button onclick="window.downloadBackupFile('${key}', 'pdf')" style="font-size:0.75rem; border:1px solid rgba(255,212,186,0.35); color:#ffd4ba; padding: 5px 9px; border-radius:6px; background:rgba(255,212,186,0.04); cursor:pointer; font-weight:500; transition:all 0.2s;">PDF</button>
                        <button onclick="window.restoreFromTargetBackupPoint('${key}')" style="font-size:0.75rem; border:1px solid #f7a37f; color:#fff; background:linear-gradient(135deg, #f7a37f, #e76f51); padding: 5px 12px; border-radius:6px; cursor:pointer; font-weight:bold; transition:all 0.2s; box-shadow:0 2px 6px rgba(247,163,127,0.25);">복구</button>
                    </div>
                </div>
            `;
            container.appendChild(element);
        });
    }).catch(err => {
        if (document.getElementById('backup-loading-msg')) document.getElementById('backup-loading-msg').style.display = 'none';
        container.innerHTML = `<p style="color:#ef4444; font-size:0.82rem; padding: 20px 0; text-align:center;">인프라 클라우드 연동 차단 상태</p>`;
    });
}
window.loadBackupTimelineList = loadBackupTimelineList;

function downloadBackupFile(key, format) {
    if (!isAdmin || !database) return;
    database.ref(`backupData/${key}`).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) return showSystemAlert("백업 파일이 유실되었습니다.");
        
        // 데이터 추출
        const posts = data.posts || {}; 
        const horizons = data.horizons || {}; 
        const letters = data.letters || {};
        
        // =====================================
        // 📄 1. TXT 포맷 (정렬 및 가독성 극대화)
        // =====================================
        if (format === 'txt') {
            let textResult = `=========================================================\n`;
            textResult += `                 🌊 수평선 너머의 서재 백업 🌊\n`;
            textResult += `=========================================================\n`;
            textResult += `▶ 스냅샷 기준 시점 : ${key}\n\n`;

            textResult += `─────────────────────────────────────────────────────────\n`;
            textResult += ` [1. 바다의 기록]\n`;
            textResult += `─────────────────────────────────────────────────────────\n`;
            Object.keys(posts).forEach(k => { 
                textResult += `\n ◈ 제목 : ${posts[k].title}\n`;
                textResult += ` ◈ 기록자 : ${posts[k].author || '기록자'}  |  작성일 : ${posts[k].date}\n`;
                textResult += ` --------------------------------------------------------\n`;
                // 본문 내용이 들여쓰기 되도록 줄바꿈 문자 뒤에 공백 추가
                textResult += `  ${posts[k].content.replace(/\n/g, '\n  ')}\n`; 
                textResult += ` --------------------------------------------------------\n`;
            });
            
            textResult += `\n\n─────────────────────────────────────────────────────────\n`;
            textResult += ` [2. 수평선 너머 (비밀 기록)]\n`;
            textResult += `─────────────────────────────────────────────────────────\n`;
            Object.keys(horizons).forEach(k => { 
                textResult += `\n ◈ 제목 : ${horizons[k].title}\n`;
                textResult += ` ◈ 기록자 : ${horizons[k].author || '기록자'}  |  작성일 : ${horizons[k].date}\n`;
                textResult += ` --------------------------------------------------------\n`;
                textResult += `  ${horizons[k].content.replace(/\n/g, '\n  ')}\n`; 
                textResult += ` --------------------------------------------------------\n`;
            });
            
            textResult += `\n\n─────────────────────────────────────────────────────────\n`;
            textResult += ` [3. 띄워진 편지]\n`;
            textResult += `─────────────────────────────────────────────────────────\n`;
            Object.keys(letters).forEach(k => { 
                textResult += `\n ◈ 제목 : ${letters[k].title}\n`;
                textResult += ` ◈ 상태 : ${letters[k].read ? '수거됨' : '미수거'}  |  작성일 : ${letters[k].date}\n`;
                textResult += ` --------------------------------------------------------\n`;
                textResult += `  ${letters[k].content.replace(/\n/g, '\n  ')}\n`; 
                textResult += ` --------------------------------------------------------\n`;
            });
            
            const blob = new Blob([textResult], { type: "text/plain;charset=utf-8" }); 
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); 
            a.href = url; 
            a.download = `수평선너머_백업_${key}.txt`; 
            a.click(); 
            URL.revokeObjectURL(url);
        } 
        // =====================================
        // 🖨️ 2. PDF 포맷 (가짜 테이블 여백 기법으로 2페이지 상단 잘림 완벽 해결)
        // =====================================
        else if (format === 'pdf') {
            let printFrame = document.getElementById('pdf-print-frame');
            if (!printFrame) {
                printFrame = document.createElement('iframe');
                printFrame.id = 'pdf-print-frame';
                printFrame.style.cssText = 'position:absolute; width:0; height:0; border:none; top:-1000px; left:-1000px;';
                document.body.appendChild(printFrame);
            }
            
            const doc = printFrame.contentWindow.document;
            
            let htmlContent = `
            <html>
            <head>
                <title>수평선 너머의 서재 - 백업 리포트</title>
                <style>
                    /* 브라우저 기본 머리글(날짜/제목) 완전 제거 */
                    @page { margin: 0; size: A4; }
                    body { 
                        font-family: 'KoPub Batang', 'Nanum Myeongjo', 'Times New Roman', serif;
                        background-color: #ffffff; 
                        color: #2d3748; 
                        line-height: 1.9; 
                        margin: 0;
                        padding: 0; /* padding은 컨텐츠 래퍼로 이동합니다 */
                    }
                    
                    /* 🚨 [핵심 해결] 모든 페이지 상/하단에 안전한 빈 공간을 강제로 만들어주는 투명 테이블 세팅 */
                    .page-container { width: 100%; border-collapse: collapse; border: none; }
                    .page-header-space { height: 18mm; } /* 2페이지부터 맨 위에 생길 안전 여백 */
                    .page-footer-space { height: 18mm; } /* 맨 아래 안전 여백 */
                    .content-padding { padding: 0 15mm; } /* 좌우 여백 */

                    .top-right-copyright {
                        text-align: right;
                        font-size: 11px;
                        color: #718096;
                        font-family: sans-serif;
                        margin-bottom: 12px;
                    }

                    .header-container {
                        text-align: center;
                        border-bottom: 2px solid #1d3557; 
                        padding-bottom: 15px;
                        margin-bottom: 5px;
                    }
                    .header-title { 
                        font-size: 23px; 
                        font-weight: bold; 
                        color: #1d3557; 
                        letter-spacing: 1px;
                    }
                    
                    .timestamp-box { 
                        text-align: center; 
                        color: #457b9d; 
                        font-size: 11.5px; 
                        margin-top: 10px;
                        margin-bottom: 25px;
                        font-family: sans-serif;
                    }
                    .library-motto {
                        text-align: center;
                        font-size: 13px;
                        color: #718096;
                        font-style: italic;
                        margin-bottom: 45px;
                        letter-spacing: 0.5px;
                    }
                    
                    h2 { 
                        color: #1d3557; 
                        font-size: 16px; 
                        font-weight: bold;
                        margin-top: 40px; 
                        margin-bottom: 18px;
                        border-left: 3px solid #457b9d; 
                        padding-left: 12px;
                        page-break-after: avoid; 
                        break-after: avoid;
                    }
                    
                    /* 글 박스 디자인 */
                    .item-card { 
                        background: #fdfbf7; 
                        border: 1px solid #e1dbd6; 
                        border-radius: 6px; 
                        padding: 24px; 
                        margin-bottom: 22px; 
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.01);
                        
                        /* 이제 2페이지 맨 위에도 18mm 여백이 생기므로 안심하고 avoid를 쓸 수 있습니다. */
                        page-break-inside: avoid !important; 
                        break-inside: avoid !important;
                        display: block; 
                    }
                    
                    .item-title { 
                        font-size: 16px; 
                        font-weight: bold; 
                        color: #0f172a; 
                        margin-bottom: 8px;
                    }
                    .meta-line { 
                        font-size: 11.5px; 
                        color: #718096; 
                        margin-bottom: 16px; 
                        border-bottom: 1px dashed #e2e8f0; 
                        padding-bottom: 10px;
                        font-family: sans-serif;
                    }
                    .author-tag {
                        color: #457b9d;
                        font-weight: bold;
                    }
                    .status-tag {
                        background: #edf2f7;
                        color: #4a5568;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: bold;
                    }
                    .content-text { 
                        white-space: pre-wrap; 
                        font-size: 14px; 
                        color: #2d3748; 
                        word-break: break-all;
                        text-align: justify; 
                    }
                </style>
            </head>
            <body>
                <table class="page-container">
                    <thead><tr><td><div class="page-header-space"></div></td></tr></thead>
                    <tbody><tr><td>
                        <div class="content-padding">
                        
                            <div class="top-right-copyright">© 2026. atritime. & haeun.</div>
                            
                            <div class="header-container">
                                <div class="header-title">🌊 수평선 너머의 서재 - 백업 리포트</div>
                            </div>
                            
                            <div class="timestamp-box">스냅샷 보존 시점 : ${key}</div>
                            <div class="library-motto">"노을지는 수평선 너머의 바다, 그곳에 온전히 새겨진 기록들"</div>
                            
                            <h2>[1. 바다의 기록 — Public Archive]</h2>`;
            
            Object.keys(posts).forEach(k => { 
                htmlContent += `<div class="item-card"><div class="item-title">${escapeHtml(posts[k].title)}</div><div class="meta-line">기록자: <span class="author-tag">${posts[k].author || '기록자'}</span> &nbsp;|&nbsp; 새긴일시: ${posts[k].date}</div><div class="content-text">${escapeHtml(posts[k].content)}</div></div>`; 
            });
            
            htmlContent += `<h2>[2. 수평선 너머 — Private Secret Archive]</h2>`;
            Object.keys(horizons).forEach(k => { 
                htmlContent += `<div class="item-card"><div class="item-title">${escapeHtml(horizons[k].title)}</div><div class="meta-line">기록자: <span class="author-tag">${horizons[k].author || '기록자'}</span> &nbsp;|&nbsp; 새긴일시: ${horizons[k].date}</div><div class="content-text">${escapeHtml(horizons[k].content)}</div></div>`; 
            });
            
            htmlContent += `<h2>[3. 띄워진 편지 — Received Letters]</h2>`;
            Object.keys(letters).forEach(k => { 
                const statusBadge = letters[k].read ? `<span class="status-tag">수거됨</span>` : `<span class="status-tag" style="background:#fff5f5; color:#c53030;">미수거</span>`;
                htmlContent += `<div class="item-card"><div class="item-title">${escapeHtml(letters[k].title)}</div><div class="meta-line">상태: ${statusBadge} &nbsp;|&nbsp; 띄운일시: ${letters[k].date}</div><div class="content-text">${escapeHtml(letters[k].content)}</div></div>`; 
            });
            
            htmlContent += `
                        </div>
                    </td></tr></tbody>
                    <tfoot><tr><td><div class="page-footer-space"></div></td></tr></tfoot>
                </table>
                
                <script>
                    window.onload = function() { 
                        setTimeout(function() {
                            window.print(); 
                        }, 500);
                    }
                </script>
            </body>
            </html>`;
            
            doc.open();
            doc.write(htmlContent);
            doc.close();
        }
    }).catch(err => showSystemAlert("다운로드 파일 추출 실패"));
}
window.downloadBackupFile = downloadBackupFile;

function restoreFromTargetBackupPoint(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm('선택하신 시점으로 바다 데이터를 덮어씌워 복구하시겠습니까?', function() { database.ref(`backupData/${key}`).once('value').then((snapshot) => { executeRestore(snapshot.val()); }); });
}
window.restoreFromTargetBackupPoint = restoreFromTargetBackupPoint;

function executeRestore(targetBackup) {
    if (!targetBackup) return; isInternalSyncAction = true;
    database.ref('posts').off(); database.ref('horizons').off(); database.ref('letters').off();
    
    // 🚨 비밀 기록 (horizons) 복구 추가
    Promise.all([ 
        database.ref('posts').set(targetBackup.posts || null), 
        database.ref('horizons').set(targetBackup.horizons || null), 
        database.ref('letters').set(targetBackup.letters || null) 
    ]).then(() => {
        listenPosts(); listenHorizons(); listenLetters(); 
        showSystemAlert('수평선 너머 바다가 완전 복원되었습니다.', function() { isInternalSyncAction = false; closeBackupModal(); });
    }).catch(() => { listenPosts(); listenHorizons(); listenLetters(); });
}

function scrollToPosts() { const postsSection = document.getElementById('posts-section'); if (postsSection) { const yOffset = postsSection.getBoundingClientRect().top + window.scrollY - 40; window.scrollTo({ top: yOffset, behavior: 'smooth' }); } }

function renderUI(isAppend = false) {
    const container = document.getElementById('posts-container'); 
    const paginationContainer = document.getElementById('pagination-container');
    const subtitleElem = document.querySelector('.section-subtitle'); 
    const authorStatsContainer = document.getElementById('author-stats'); 
    const authorFilterContainer = document.getElementById('author-filter-container');

    if (!container || !paginationContainer) return; 

    if (!isAppend) {
        container.innerHTML = ''; 
        paginationContainer.innerHTML = '';

        if (currentDisplayMode === 'grid' || currentDisplayMode === 'infinite') {
            container.classList.add('posts-grid-view'); 
        } else {
            container.classList.remove('posts-grid-view');
        }

        if (subtitleElem) {
            let subtitleText = '';
            if (currentView === 'posts') {
                subtitleText = `<span style="color:#ffffff; font-size:1.02rem; font-weight:500; letter-spacing:0.5px; text-shadow:0 0 10px rgba(144,224,239,0.6); background:linear-gradient(120deg, #fff, #b9efff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; display:inline-block;">아래 바다에 기록된 글들을 클릭하여 읽어주세요!</span><br><span style="color: #90e0ef; font-size: 0.85rem; display: inline-block; margin-top: 9px;">총 기록된 글 : ${allPosts.length}개</span>`;
            } else if (currentView === 'horizons') {
                subtitleText = `<span style="color:#ffffff; font-size:1.02rem; font-weight:500; letter-spacing:0.5px; text-shadow:0 0 10px rgba(216, 180, 255, 0.6); background:linear-gradient(120deg, #fff, #e4c1ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; display:inline-block;">기록자만이 열람할 수 있는 비밀의 바다입니다.</span><br><span style="color: #c9a0ff; font-size: 0.85rem; display: inline-block; margin-top: 9px;">은밀한 기록 : ${allHorizons.length}개</span>`;
            } else {
                subtitleText = `수평선 너머 바다 위에 띄워진 편지들.<br><span style="color: #ffd4ba; font-size: 0.85rem; display: inline-block; margin-top: 9px;">띄워진 편지 : ${allLetters.length}개</span>`;
            }
            
            let selectHtml = `
            <div style="margin-top:20px; display:flex; flex-direction:column; align-items:center; width:100%; gap:15px;">
                <div style="display:flex; justify-content:center; width:100%;">
                    <select onchange="window.setDisplayMode(this.value)" style="
                        height: 38px; 
                        width: 100%; 
                        max-width: 180px; 
                        -webkit-appearance: none; 
                        -moz-appearance: none; 
                        appearance: none; 
                        background-color: rgba(255, 255, 255, 0.04); 
                        background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23fff\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Cpolyline points=\\'6 9 12 15 18 9\\'%3E%3C/polyline%3E%3C/svg%3E'), url('data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23fff\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Cpolyline points=\\'6 9 12 15 18 9\\'%3E%3C/polyline%3E%3C/svg%3E'); 
                        background-repeat: no-repeat, no-repeat; 
                        background-position: left 15px center, right 15px center; 
                        background-size: 14px, 14px; 
                        border: 1px solid rgba(0, 180, 216, 0.25); 
                        color: #fff; 
                        padding: 0 35px; 
                        border-radius: 25px; 
                        font-size: 0.85rem; 
                        font-weight: 500; 
                        outline: none; 
                        cursor: pointer; 
                        transition: all 0.25s ease; 
                        text-align: center; 
                        text-align-last: center; 
                        box-shadow: 0 4px 12px rgba(0,0,0,0.35); 
                        letter-spacing: 0.5px;
                    "
                    onfocus="this.style.borderColor='#00b4d8'; this.style.backgroundColor='rgba(3, 10, 23, 0.85)'; this.style.boxShadow='0 0 10px rgba(0, 180, 216, 0.2)';"
                    onblur="this.style.borderColor='rgba(0, 180, 216, 0.25)'; this.style.backgroundColor='rgba(255, 255, 255, 0.04)'; this.style.boxShadow='none';"
                    >
                        <option value="list" ${currentDisplayMode === 'list' ? 'selected' : ''} style="background: #030a16; color: #fff;">📄 리스트 모드</option>
                        <option value="grid" ${currentDisplayMode === 'grid' ? 'selected' : ''} style="background: #030a16; color: #fff;">🔲 갤러리 모드</option>
                        <option value="infinite" ${currentDisplayMode === 'infinite' ? 'selected' : ''} style="background: #030a16; color: #fff;">🌊 스크롤 모드</option>
                    </select>
                </div>
            `;

            if (currentView === 'letters' && isAdmin) {
                selectHtml += `
                <div id="letter-batch-controls" style="
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    width: 100% !important;
                    max-width: 450px !important;
                    height: 36px !important;
                    background: transparent !important;
                    border: none !important;             
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 25px auto 10px auto !important;
                    box-sizing: border-box !important;
                    user-select: none !important;
                ">
                    <label style="
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        height: 32px !important;
                        padding: 0 14px !important;
                        font-size: 0.78rem !important;
                        font-weight: 700 !important;
                        border-radius: 20px !important;
                        background: rgba(144, 224, 239, 0.06) !important;
                        color: #90e0ef !important;
                        border: 1px solid rgba(144, 224, 239, 0.2) !important;
                        cursor: pointer !important;
                        letter-spacing: 0.5px !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    "
                    onmouseenter="this.style.background='rgba(144, 224, 239, 0.25)'; this.style.borderColor='#00b4d8'; this.style.color='#fff'; this.style.boxShadow='0 0 12px rgba(144, 224, 239, 0.45)';"
                    onmouseleave="this.style.background='rgba(144, 224, 239, 0.06)'; this.style.borderColor='rgba(144, 224, 239, 0.2)'; this.style.color='#90e0ef'; this.style.boxShadow='none';"
                    >
                        <input type="checkbox" id="letter-select-all" onclick="window.toggleAllLetters(this)" style="
                            accent-color: #00b4d8 !important;
                            width: 14px !important;
                            height: 14px !important;
                            cursor: pointer !important;
                            margin: 0 6px 0 0 !important;
                        "> 전체 선택
                    </label>

                    <div id="batch-delete-btn-custom" onclick="window.deleteSelectedLetters()" style="
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        height: 32px !important;
                        padding: 0 16px !important;
                        font-size: 0.78rem !important;
                        font-weight: 700 !important;
                        border-radius: 20px !important;
                        background: rgba(239, 68, 68, 0.1) !important;
                        color: #fca5a5 !important;
                        border: 1px solid rgba(239, 68, 68, 0.25) !important;
                        cursor: pointer !important;
                        letter-spacing: 0.5px !important;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    "
                    onmouseenter="this.style.background='rgba(239, 68, 68, 0.25)'; this.style.borderColor='#ef4444'; this.style.color='#fff'; this.style.boxShadow='0 0 12px rgba(239, 68, 68, 0.45)';"
                    onmouseleave="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.25)'; this.style.color='#fca5a5'; this.style.boxShadow='none';"
                    >선택 소멸</div>
                </div>
                `;
            }

            selectHtml += `</div>`;
            subtitleElem.innerHTML = subtitleText + selectHtml;
        }

        // 필터 및 통계는 '기록된 바다'와 '수평선 너머' 두 곳 모두에서 동일하게 작동
        if (currentView === 'posts' || currentView === 'horizons') {
            if (authorStatsContainer) authorStatsContainer.style.display = 'flex'; if (authorFilterContainer) authorFilterContainer.style.display = 'block';
            let targetArrayCount = currentView === 'posts' ? allPosts : allHorizons;
            let ashiCount = 0; let haeunCount = 0; 
            targetArrayCount.forEach(item => { if ((item.author || "").includes("하은")) haeunCount++; else ashiCount++; });
            if (authorStatsContainer) authorStatsContainer.innerHTML = `<span class="stat-badge">아시 : ${ashiCount}개</span><span class="stat-badge">하은 : ${haeunCount}개</span>`;
        } else {
            if (authorStatsContainer) authorStatsContainer.style.display = 'none'; if (authorFilterContainer) authorFilterContainer.style.display = 'none';
        }
    }

    let targetArray;
    if (currentView === 'posts') targetArray = allPosts;
    else if (currentView === 'horizons') targetArray = allHorizons;
    else targetArray = allLetters;

    if ((currentView === 'posts' || currentView === 'horizons') && searchAuthor !== 'all') { 
        targetArray = targetArray.filter(item => { const author = item.author || "기록자"; return searchAuthor === "하은" ? author.includes("하은") : !author.includes("하은"); }); 
    }
    if (searchKeyword) targetArray = targetArray.filter(item => String(item.title).toLowerCase().includes(searchKeyword.toLowerCase()));

    if (targetArray.length === 0) { 
        if (!isAppend) container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#94a3b8; margin-top:40px;">존재하지 않습니다.</p>`; 
        return; 
    }

    const totalPages = Math.ceil(targetArray.length / postsPerPage);
    let currentItems = [];

    if (currentDisplayMode === 'infinite') {
        if (isAppend) {
            currentItems = targetArray.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
        } else {
            currentItems = targetArray.slice(0, currentPage * postsPerPage);
        }
    } else {
        currentItems = targetArray.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
    }

    const cardFragment = document.createDocumentFragment();

    currentItems.forEach((item) => {
        const card = document.createElement('div'); 
        card.className = 'post-card'; 
        card.onclick = () => openDetailModal(item.id);
        
        let mgmtButtonsHtml = '';
        if (isAdmin) {
            mgmtButtonsHtml = (currentView === 'posts' || currentView === 'horizons')
                ? `<div class="card-mgmt-btns"><button class="mgmt-btn" onclick="event.stopPropagation(); window.prepareEdit('${item.id}')">수정</button><button class="mgmt-btn danger-btn" onclick="event.stopPropagation(); window.deletePost('${item.id}')">소멸</button></div>`
                : `<div class="card-mgmt-btns"><button class="mgmt-btn danger-btn" onclick="event.stopPropagation(); window.deleteLetter('${item.id}')">소멸</button></div>`;
        }
        
        let readBadgeHtml = ''; 
        if (currentView === 'letters' && item.read === true) { 
            readBadgeHtml = `<span class="read-badge" style="font-size:0.7rem; background:rgba(247,163,127,0.15); color:#f7a37f; border:1px solid rgba(247,163,127,0.35); padding:2px 5px; border-radius:4px; margin-left:8px; font-weight:bold; vertical-align:middle; display:inline-block;">수거됨</span>`; 
        }

        const displayDate = (currentView === 'posts' || currentView === 'horizons') ? `${item.author || "기록자"} ㅣ ${formatTo24Hour(item.date)}` : formatTo24Hour(item.date);
        
        let selectLetterCbHtml = '';
        if (isAdmin && currentView === 'letters') {
            selectLetterCbHtml = `<input type="checkbox" class="letter-checkbox" value="${item.id}" onclick="event.stopPropagation();" style="margin-right:12px; accent-color:#00b4d8; width:16px; height:16px; cursor:pointer; vertical-align:middle; flex-shrink:0;">`;
        }

        let footerHtml = `<div class="post-footer"><span class="date">${displayDate}</span>${mgmtButtonsHtml}</div>`;
        let contentHtml = `<div class="post-content-area">${item.content}</div>`;

        if ((currentView === 'posts' || currentView === 'horizons') && (currentDisplayMode === 'grid' || currentDisplayMode === 'infinite')) {
            contentHtml = `<div class="post-content-area grid-text-clamp">${item.content}</div>`;

            let datePart = displayDate;
            let timePart = "";
            let timeMatch = displayDate.match(/\d{1,2}:\d{2}(:\d{2})?$/);
            if (timeMatch) {
                timePart = timeMatch[0];
                datePart = displayDate.replace(timePart, '').trim();
            }

            if (isAdmin) {
                footerHtml = `
                    <div class="admin-grid-footer" onclick="event.stopPropagation();">
                        <div class="grid-date">${datePart}</div>
                        <div class="grid-more"><button onclick="window.openDetailModal('${item.id}')">더보기</button></div>
                        <div class="grid-time">${timePart}</div>
                        <div class="grid-actions">${mgmtButtonsHtml}</div>
                    </div>
                `;
            } else {
                footerHtml = `
                    <div class="post-footer">
                        <span class="date">${displayDate}</span>
                    </div>
                `;
            }
        }

        card.innerHTML = `<h3>${selectLetterCbHtml}${highlightSearchKeyword(item.title, searchKeyword)}${readBadgeHtml}</h3>${contentHtml}${footerHtml}`;
        cardFragment.appendChild(card);
    });
    
    container.appendChild(cardFragment);

    if (currentDisplayMode === 'infinite') {
        if (!isAppend) {
            paginationContainer.innerHTML = '';
            if (currentPage < totalPages) {
                const sentinel = document.createElement('div');
                sentinel.id = 'infinite-sentinel';
                sentinel.style.cssText = 'width: 100%; height: 20px; grid-column: 1/-1; margin-top: 20px; background: transparent;';
                paginationContainer.appendChild(sentinel);

                if (window.infiniteObserver) window.infiniteObserver.disconnect();
                window.infiniteObserver = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        if (currentPage < Math.ceil(targetArray.length / postsPerPage)) {
                            currentPage++;
                            renderUI(true);
                        }
                    }
                }, { rootMargin: '150px' });
                window.infiniteObserver.observe(sentinel);
            }
        } else {
            if (currentPage >= totalPages && window.infiniteObserver) {
                window.infiniteObserver.disconnect();
                const sentinel = document.getElementById('infinite-sentinel');
                if (sentinel) sentinel.remove();
            }
        }
    } else {
        if (!isAppend && totalPages > 1) {
            const pageFragment = document.createDocumentFragment();
            const maxPageButtons = 5; const currentGroup = Math.ceil(currentPage / maxPageButtons);
            let startPage = (currentGroup - 1) * maxPageButtons + 1; let endPage = Math.min(currentGroup * maxPageButtons, totalPages);
            
            if (startPage > 1) { const prevBtn = document.createElement('div'); prevBtn.className = 'page-btn'; prevBtn.innerHTML = '&#139;'; prevBtn.onclick = () => { currentPage = startPage - 1; renderUI(); scrollToPosts(); }; pageFragment.appendChild(prevBtn); }
            for (let i = startPage; i <= endPage; i++) { const btn = document.createElement('div'); btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.innerText = i; btn.onclick = () => { currentPage = i; renderUI(); scrollToPosts(); }; pageFragment.appendChild(btn); }
            if (endPage < totalPages) { const nextBtn = document.createElement('div'); nextBtn.className = 'page-btn'; nextBtn.innerHTML = '&#155;'; nextBtn.onclick = () => { currentPage = endPage + 1; renderUI(); scrollToPosts(); }; pageFragment.appendChild(nextBtn); }
            
            paginationContainer.appendChild(pageFragment);
        }
    }
}

function openDetailModal(key) {
    if (!isAdmin && (currentView === 'letters' || currentView === 'horizons')) return;
    
    let targetArray;
    if (currentView === 'posts') targetArray = allPosts;
    else if (currentView === 'horizons') targetArray = allHorizons;
    else targetArray = allLetters;

    const item = targetArray.find(p => p.id === key); if (!item) return;

    if (currentView === 'letters' && isAdmin && !item.read) database.ref('letters/' + key).update({ read: true });

    if (document.getElementById('detail-title')) {
        document.getElementById('detail-title').innerHTML = escapeHtml(item.title);
    }
    
    if (document.getElementById('detail-date')) {
        const displayInfo = (currentView === 'posts' || currentView === 'horizons') ? `${item.author || "기록자"} ㅣ ${formatTo24Hour(item.date)}` : formatTo24Hour(item.date);
        document.getElementById('detail-date').innerText = displayInfo;
    }
    
    if (document.getElementById('detail-text')) {
        document.getElementById('detail-text').innerHTML = escapeHtml(item.content);
    } 

    if (document.getElementById('detail-modal')) { 
        document.getElementById('detail-modal').style.display = 'flex'; 
        document.body.classList.add('no-scroll'); 
    }
}

function triggerBottleAnimation(callback) {
    const bottle = document.createElement('div'); bottle.innerHTML = '🍾'; 
    bottle.style.cssText = 'position:fixed; bottom:15%; left:-100px; font-size:60px; z-index:99999 !important; transition: all 2.5s cubic-bezier(0.42, 0, 0.58, 1); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));';
    document.body.appendChild(bottle);
    setTimeout(() => { bottle.style.left = '120%'; bottle.style.transform = 'rotate(720deg) translateY(-80px)'; }, 50);
    setTimeout(() => { bottle.remove(); if(callback) callback(); }, 2500);
}

// 🚨 글 및 비밀 기록 저장 로직
function savePost() {
    if (!isAdmin || !database || isSubmitting) return;
    const title = document.getElementById('post-title')?.value.trim(); const content = document.getElementById('post-content')?.value.trim();
    if (!title || !content) { showSystemAlert('내용을 모두 입력해주세요.'); return; }
    if (!navigator.onLine) { showSystemAlert('인터넷이 끊겨 글을 기록할 수 없습니다.'); return; }
    
    const now = new Date(); const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    isSubmitting = true; 
    const postData = { title: title, content: content, date: date, author: loggedInUser };
    
    // 현재 보고 있는 탭에 따라 데이터베이스 저장 경로 변경 (수평선 너머일 경우 horizons)
    const targetNode = currentView === 'horizons' ? 'horizons' : 'posts';

    if (editTargetKey) { 
        database.ref(targetNode + '/' + editTargetKey).update(postData).then(() => { 
            showSystemAlert('기록이 수정되었습니다.'); clearDraftCacheStorage('post'); cancelEdit(); 
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; }); 
    } else { 
        database.ref(targetNode).push(postData).then(() => { 
            document.getElementById('post-title').value = ''; document.getElementById('post-content').value = ''; clearDraftCacheStorage('post'); currentPage = 1; 
            showSystemAlert(currentView === 'horizons' ? '수평선 너머에 은밀히 새겨졌습니다.' : '성공적으로 새겨졌습니다.'); 
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; }); 
    }
}
window.savePost = savePost;

function saveLetter() {
    if (!database || isSubmitting || isRestMode) return;

    // 🚨 [보안 1] 편지 도배 매크로 방어 (일반 방문자 한정 30초 쿨타임)
    const nowTime = Date.now();
    const lastSubmitTime = localStorage.getItem('last_letter_submit_time') || 0;
    if (!isAdmin && nowTime - lastSubmitTime < 30000) {
        showSystemAlert('띄워진 편지가 수평선에 닿을 때까지 잠시 기다려주세요. (30초 후 다시 띄울 수 있습니다.)');
        return;
    }

    const title = document.getElementById('letter-title')?.value.trim(); 
    const content = document.getElementById('letter-content')?.value.trim();
    if (!title || !content) { showSystemAlert('제목과 내용을 모두 채워주세요.'); return; }
    if (!navigator.onLine) { showSystemAlert('인터넷이 끊겨 편지를 띄울 수 없습니다.'); return; }
    if (document.getElementById('agree-terms') && !document.getElementById('agree-terms').checked) { showSystemAlert('안내 및 약관에 동의해주세요.'); return; }

    // 🚨 [보안 2] 비정상적인 데이터 폭탄(Payload) 방어
    if (title.length > 100 || content.length > 5000) {
        showSystemAlert('편지의 내용이 너무 깁니다. 마음을 조금만 줄여서 적어주세요. 제목 100자 이하, 본문 5000자 이하여야 합니다.');
        return;
    }

    const now = new Date(); const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    isSubmitting = true; 
    
    const letterData = { title: title, content: content, date: date, author: isAdmin ? loggedInUser : '방문자', read: false };

    triggerBottleAnimation(() => {
        database.ref('letters').push(letterData).then(() => {
            // 🚨 [보안 1-2] 편지가 성공적으로 띄워지면 현재 시간을 로컬 스토리지에 기록
            if (!isAdmin) localStorage.setItem('last_letter_submit_time', Date.now().toString());

            document.getElementById('letter-title').value = ''; document.getElementById('letter-content').value = '';
            if (document.getElementById('agree-terms')) document.getElementById('agree-terms').checked = false;
            clearDraftCacheStorage('letter'); showSystemAlert('편지가 바다 위로 안전하게 띄워졌습니다.'); currentPage = 1; renderUI();
            
            if (isAdmin) {
                setTimeout(() => window.executeCloudBackupEngine(true), 800);
            }
        }).finally(() => { isSubmitting = false; });
    });
}
window.saveLetter = saveLetter;

function prepareEdit(key) {
    let targetArray = currentView === 'horizons' ? allHorizons : allPosts;
    const post = targetArray.find(p => p.id === key); if (!post) return; editTargetKey = key;
    
    if (document.getElementById('write-title')) document.getElementById('write-title').innerText = currentView === 'horizons' ? "비밀 기록 수정하기" : "기록 수정하기";
    if (document.getElementById('post-title')) document.getElementById('post-title').value = post.title;
    if (document.getElementById('post-content')) document.getElementById('post-content').value = post.content;
    if (document.getElementById('submit-post-btn')) document.getElementById('submit-post-btn').innerText = "수정하기";
    if (document.getElementById('cancel-edit-btn')) document.getElementById('cancel-edit-btn').style.display = "inline-block";
    
    const writeSection = document.getElementById('write-section');
    if (writeSection) {
        const yOffset = writeSection.getBoundingClientRect().top + window.scrollY - 60; 
        window.scrollTo({ top: yOffset, behavior: 'smooth' });
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
window.prepareEdit = prepareEdit;

function cancelEdit() {
    editTargetKey = null;
    if (document.getElementById('write-title')) document.getElementById('write-title').innerText = currentView === 'horizons' ? "수평선 너머에 비밀 기록하기" : "새로운 기록 남기기";
    if (document.getElementById('post-title')) document.getElementById('post-title').value = '';
    if (document.getElementById('post-content')) document.getElementById('post-content').value = '';
    if (document.getElementById('submit-post-btn')) document.getElementById('submit-post-btn').innerText = currentView === 'horizons' ? "비밀 기록하기" : "기록하기";
    if (document.getElementById('cancel-edit-btn')) document.getElementById('cancel-edit-btn').style.display = "none";
    clearDraftCacheStorage('post'); 
}
window.cancelEdit = cancelEdit;

function deletePost(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm(currentView === 'horizons' ? '이 비밀 기록을 완전히 소멸시키겠습니까?' : '이 기록을 완전히 소멸시키겠습니까?', function() {
        if(editTargetKey === key) cancelEdit();
        const targetNode = currentView === 'horizons' ? 'horizons' : 'posts';
        database.ref(targetNode + '/' + key).remove().then(() => { 
            let targetArrayCount = currentView === 'horizons' ? allHorizons : allPosts;
            const totalPagesAfterDelete = Math.ceil((targetArrayCount.length - 1) / postsPerPage); 
            if (currentPage > totalPagesAfterDelete && currentPage > 1) currentPage = totalPagesAfterDelete; 
            renderUI(); 
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        });
    });
}
window.deletePost = deletePost;

function deleteLetter(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm('이 편지를 바다에서 완전히 소멸시키겠습니까?', function() {
        database.ref('letters/' + key).remove().then(() => { 
            const totalPagesAfterDelete = Math.ceil((allLetters.length - 1) / postsPerPage); 
            if (currentPage > totalPagesAfterDelete && currentPage > 1) currentPage = totalPagesAfterDelete; 
            renderUI(); 
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        });
    });
}
window.deleteLetter = deleteLetter;

function clearDatabase() {
    if (!isAdmin || !database) return;
    showSystemConfirm('🚨 모든 기록과 편지들이 사라집니다. 초기화할까요?', function() { setTimeout(function() { showSystemConfirm('정말 소멸시킬까요?', function() { Promise.all([database.ref('posts').remove(), database.ref('horizons').remove(), database.ref('letters').remove()]).then(() => { cancelEdit(); currentPage = 1; showSystemAlert('초기 상태가 되었습니다.'); backupTriggerQueued = true; }); }); }, 150); });
}
window.clearDatabase = clearDatabase;

function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

window.addEventListener('offline', () => { showSystemAlert('수평선 너머와의 연결이 끊어졌습니다. 네트워크를 확인해 주세요.'); });
window.addEventListener('online', () => { showSystemAlert('다시 수평선 너머로 연결되었습니다.'); });

function highlightSearchKeyword(text, keyword) {
    const escaped = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!keyword) return escaped;
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return escaped.replace(regex, match => `<span style="background: rgba(144, 224, 239, 0.25); color: #fff; box-shadow: 0 0 8px rgba(144, 224, 239, 0.6); border-radius: 3px; padding: 0 3px;">${match}</span>`);
}
window.highlightSearchKeyword = highlightSearchKeyword;

function applyTimeBasedThemeEngine() {
    const hour = new Date().getHours();
    let bgStyle = ""; let themeText = "";
    let mode = window.manualTimeOverride || 'auto';

    if (mode === 'auto') {
        if (hour >= 6 && hour < 12) mode = 'morning';
        else if (hour >= 12 && hour < 18) mode = 'day';
        else if (hour >= 18 && hour < 20) mode = 'evening';
        else mode = 'night';
    }

    if (mode === 'morning') { bgStyle = "linear-gradient(135deg, #061121 0%, #153b50 50%, #00b4d8 100%)"; themeText = "🌅 아침의 바다"; }
    else if (mode === 'day') { bgStyle = "linear-gradient(135deg, #000428 0%, #004e92 60%, #90e0ef 100%)"; themeText = "☀️ 낮의 바다"; }
    else if (mode === 'evening') { bgStyle = "linear-gradient(135deg, #0b0f19 0%, #4a192c 50%, #f7a37f 100%)"; themeText = "🌇 저녁의 바다"; }
    else { bgStyle = "linear-gradient(135deg, #02050d 0%, #09132b 60%, #1e1b4b 100%)"; themeText = "🌌 밤의 바다"; }

    document.documentElement.style.setProperty('background-color', '#02050d', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');

    let oceanBg = document.getElementById('ocean-bg-layer');
    if (!oceanBg) {
        oceanBg = document.createElement('div');
        oceanBg.id = 'ocean-bg-layer';
        oceanBg.style.cssText = "position:fixed; top:-10vh; left:-10vw; width:120vw; height:120vh; z-index:-999; pointer-events:none; transition:background 1.5s ease-in-out;";
        document.body.insertBefore(oceanBg, document.body.firstChild);
    }
    oceanBg.style.background = bgStyle;

    let tElem = document.getElementById('theme-widget'); 
    if (!tElem && document.body) { 
        tElem = document.createElement('div'); 
        tElem.id = 'theme-widget'; 
        document.body.appendChild(tElem); 
    }
    if (tElem) tElem.innerText = themeText;
}

function fetchWeatherWidget() {
    const cacheKey = 'weather_cache_payload_v4';
    const cacheTimeKey = 'weather_cache_timestamp_v4';
    const now = Date.now();
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);

    let wElem = document.getElementById('weather-widget');
    if(!wElem) {
        wElem = document.createElement('div');
        wElem.id = 'weather-widget';
        document.body.appendChild(wElem);
    }

    if (cachedData && cachedTime && (now - parseInt(cachedTime) < 15 * 60 * 1000)) {
        renderWeatherHTML(JSON.parse(cachedData));
    } else {
        wElem.innerText = "⏳ 바다 읽는 중...";
    }
}

function renderWeatherHTML(data) {
    const code = data.current_weather.weathercode;
    let icon = '☁️';
    if(code === 0) icon = '☀️';
    else if(code > 0 && code <= 3) icon = '⛅';
    else if(code >= 51 && code <= 67) icon = '🌧️';
    else if(code >= 71 && code <= 77) icon = '❄️';
    
    let wElem = document.getElementById('weather-widget');
    if(!wElem) {
        wElem = document.createElement('div');
        wElem.id = 'weather-widget';
        document.body.appendChild(wElem);
    }
    wElem.innerHTML = `${icon} ${Math.round(data.current_weather.temperature)}°C`;
}

function syncWeatherAndWidget() {
    let wElem = document.getElementById('weather-widget');
    if (!wElem && document.body) { wElem = document.createElement('div'); wElem.id = 'weather-widget'; document.body.appendChild(wElem); }
    
    if (window.manualWeatherOverride && window.manualWeatherOverride !== 'auto') { applyManualWeatherEffect(window.manualWeatherOverride); return; }
    
    const defaultLat = 35.1796; const defaultLon = 129.0756;
    
    function fetchWeatherData(lat, lon) {
        // 🚨 [핵심 해결 1] 주소 맨 끝에 현재 시간을 밀리초 단위로 달아서, 브라우저가 매번 '완전히 새로운 요청'으로 착각하게 만듭니다.
        const timeStamp = new Date().getTime();
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&_=${timeStamp}`;

        // 🚨 [핵심 해결 2] fetch 옵션에 { cache: 'no-store' }를 달아 인터넷 캐시를 원천 차단합니다.
        fetch(apiUrl, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
            localStorage.setItem('weather_cache_payload_v4', JSON.stringify(data));
            localStorage.setItem('weather_cache_timestamp_v4', String(Date.now()));

            if (window.manualWeatherOverride && window.manualWeatherOverride !== 'auto') return; 
            
            renderWeatherHTML(data); 
            
            const code = data.current_weather.weathercode; 
            let weatherType = 'clear';
            if((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) { weatherType = 'rain'; }
            else if((code >= 71 && code <= 77) || code === 85 || code === 86) { weatherType = 'snow'; }
            
            applyManualWeatherEffect(weatherType);
        })
        .catch(err => {
            if (wElem && (!window.manualWeatherOverride || window.manualWeatherOverride === 'auto')) { wElem.innerText = "☁️ 21°C"; }
            applyManualWeatherEffect('clear');
        });
    }
    
    if (!navigator.geolocation) { fetchWeatherData(defaultLat, defaultLon); return; }
    
    // 🚨 [핵심 해결 3] GPS 옵션 대폭 강화: 과거 위치(캐시) 무시, 최고 정확도 요구, 응답 대기시간 연장
    navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherData(position.coords.latitude, position.coords.longitude), 
        (error) => fetchWeatherData(defaultLat, defaultLon), 
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
}
    

function applyManualWeatherEffect(type) {
    let overlay = document.getElementById('weather-overlay-layer');
    if (!overlay && document.body) { overlay = document.createElement('div'); overlay.id = 'weather-overlay-layer'; document.body.insertBefore(overlay, document.body.firstChild); }
    if (type === 'rain') {
        if (overlay) overlay.className = 'weather-overlay rain';
        if (window.manualWeatherOverride !== 'auto') { const wElem = document.getElementById('weather-widget'); if (wElem) wElem.innerText = "🌧️ 비 내리는 바다"; }
    } else if (type === 'snow') {
        if (overlay) overlay.className = 'weather-overlay snow';
        if (window.manualWeatherOverride !== 'auto') { const wElem = document.getElementById('weather-widget'); if (wElem) wElem.innerText = "❄️ 눈 내리는 바다"; }
    } else if (type === 'clear') {
        if (overlay) overlay.className = 'weather-overlay';
        if (window.manualWeatherOverride !== 'auto') { const wElem = document.getElementById('weather-widget'); if (wElem) wElem.innerText = "☀️ 평온한 바다"; }
    } else { if (overlay) overlay.className = 'weather-overlay'; }
}

applyTimeBasedThemeEngine();
setInterval(() => { applyTimeBasedThemeEngine(); }, 60000);

window.injectTimeGearButton = function() {
    if (document.getElementById('time-gear-btn')) return;
    const btn = document.createElement('div'); btn.id = 'time-gear-btn'; btn.innerHTML = '⚙️'; btn.title = "환경 설정 (시간/날씨 수동 조작)"; btn.onclick = openEnvironmentSettingsModal; document.body.appendChild(btn);
};

window.openEnvironmentSettingsModal = function() {
    let modal = document.getElementById('env-modal');
    if(!modal) {
        modal = document.createElement('div'); modal.id = 'env-modal'; modal.className = 'modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(2, 6, 15, 0.85); display:flex; justify-content:center; align-items:center; z-index:99999; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);';
        modal.innerHTML = `
            <div class="modal-content" style="width: 90%; max-width:360px; padding:35px; background:linear-gradient(145deg, #0a1b36, #040d1c); border:1px solid rgba(0, 180, 216, 0.3); border-radius:18px; box-shadow:0 20px 50px rgba(0,0,0,0.7); text-align:center;">
                
                <h3 style="margin-bottom:25px; font-size:1.3rem; color:#fff; display:flex; align-items:center; justify-content:center;">
                    <span style="background:transparent !important; -webkit-background-clip:padding-box !important; -webkit-text-fill-color:#e2e8f0 !important; color:#e2e8f0 !important; text-shadow:none !important; display:inline-block; font-family:'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif !important; margin-right:8px; font-weight:normal !important;">⚙️</span>
                    
                    <span style="background:linear-gradient(135deg, #a9efff, #90e0ef); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight: bold;">서재 환경 조작</span>
                    
                    <span style="background:transparent !important; -webkit-background-clip:padding-box !important; -webkit-text-fill-color:#e2e8f0 !important; color:#e2e8f0 !important; text-shadow:none !important; display:inline-block; font-family:'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif !important; margin-left:8px; font-weight:normal !important; opacity:0; pointer-events:none;">⚙️</span>
                </h3>
                
                <div class="env-panel-area">
                    <label class="env-label" style="color: #90e0ef;">🌅 시간대 배경</label>
                    <select id="time-select" class="env-select-box">
                        <option value="auto">⏱️ 자동 (실시간 동기화)</option>
                        <option value="morning">🌅 아침 (물안개 청록)</option>
                        <option value="day">☀️ 낮 (스카이 블루)</option>
                        <option value="evening">🌇 저녁 (코랄빛 노을)</option>
                        <option value="night">🌌 밤 (오로라 심해)</option>
                    </select>
                </div>
                <div class="env-panel-area" style="margin-bottom: 32px;">
                    <label class="env-label" style="color: #f7a37f;">⛅ 날씨 효과</label>
                    <select id="weather-select" class="env-select-box" style="border-color: rgba(247, 163, 127, 0.3);">
                        <option value="auto">📍 자동 (현재 위치 기반)</option>
                        <option value="clear">☀️ 맑음 (평온한 바다)</option>
                        <option value="rain">🌧️ 비 (비 내리는 바다)</option>
                        <option value="snow">❄️ 눈 (눈 내리는 바다)</option>
                    </select>
                </div>
                <div style="display:flex; gap:12px; justify-content:center;">
                    <button onclick="applyEnvironmentSettings()" style="flex:1; padding:14px; border-radius:12px; background:linear-gradient(135deg, #00b4d8, #0077b6); color:#fff; border:none; cursor:pointer; font-weight:bold; font-size:1rem; box-shadow:0 4px 15px rgba(0, 180, 216, 0.3); transition:transform 0.2s;">설정 적용</button>
                    <button onclick="document.getElementById('env-modal').style.display='none'" style="flex:1; padding:14px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#cbd5e1; border-radius:12px; cursor:pointer; font-size:1rem; transition:background 0.2s;">닫기</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('time-select').value = window.manualTimeOverride || 'auto';
    document.getElementById('weather-select').value = window.manualWeatherOverride || 'auto';
    modal.style.display = 'flex';
};

window.applyEnvironmentSettings = function() {
    window.manualTimeOverride = document.getElementById('time-select').value;
    window.manualWeatherOverride = document.getElementById('weather-select').value;
    
    localStorage.setItem('env_time_override', window.manualTimeOverride);
    localStorage.setItem('env_weather_override', window.manualWeatherOverride);
    
    applyTimeBasedThemeEngine(); 
    let wElem = document.getElementById('weather-widget');
    if (window.manualWeatherOverride === 'auto' && wElem) { wElem.innerText = "⏳ 바다 읽는 중..."; }
    syncWeatherAndWidget(); 
    document.getElementById('env-modal').style.display = 'none';
};

document.addEventListener('pointerdown', function(e) {
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 800);
}, true);

window.toggleAllLetters = function(source) {
    const checkboxes = document.querySelectorAll('.letter-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
};

window.deleteSelectedLetters = function() {
    if (!isAdmin || !database) return;
    
    const checkboxes = document.querySelectorAll('.letter-checkbox:checked');
    const keysToDelete = Array.from(checkboxes).map(cb => cb.value);
    
    if (keysToDelete.length === 0) {
        return showSystemAlert('소멸시키고자 하는 편지들을 먼저 선택해 주세요.');
    }
    
    showSystemConfirm(`선택하신 ${keysToDelete.length}개의 편지를 바다에서 완전히 소멸시키겠습니까?`, function() {
        const batchUpdates = {};
        keysToDelete.forEach(key => {
            batchUpdates['letters/' + key] = null; 
        });
        
        database.ref().update(batchUpdates)
        .then(() => {
            showSystemAlert('선택하신 편지 조각들이 완벽히 소멸되었습니다.');
            const totalPagesAfterDelete = Math.ceil((allLetters.length - keysToDelete.length) / postsPerPage);
            if (currentPage > totalPagesAfterDelete && currentPage > 1) {
                currentPage = totalPagesAfterDelete;
            }
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        })
        .catch(err => {
            showSystemAlert('일괄 소멸 동기화 실패 : ' + err.message);
        });
    });
};

// ==========================================
// 🛡️ 모달창 바깥 배경 클릭 시 닫힘 강제 방어
// ==========================================
document.addEventListener('click', function(event) {
    const backupModal = document.getElementById('backup-modal');
    const libraryModal = document.getElementById('library-modal');
    const detailModal = document.getElementById('detail-modal'); 
    const pinModal = document.getElementById('pin-modal');     // 🚨 키패드 창 추가!
    const loginModal = document.getElementById('login-modal'); // 🚨 로그인 창 추가!
    
    // 클릭한 곳이 모달창들의 바깥 배경(어두운 부분)일 경우, 
    // 창이 닫히는 동작(이벤트)을 그 자리에서 즉시 차단합니다.
    if (event.target === backupModal || 
        event.target === libraryModal || 
        event.target === detailModal || 
        event.target === pinModal || 
        event.target === loginModal) {
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
}, true);

// 카카오페이 후원 팝업창 제어 함수 (오직 X 버튼으로만 닫힘)
function openDonationModal() {
    document.getElementById('donation-modal').style.display = 'flex';
}

function closeDonationModal() {
    document.getElementById('donation-modal').style.display = 'none';
}
// ==========================================
// 🛡️ 서재 기록 보호 (스크린샷 단축키 및 우클릭 방어)
// ==========================================

// 1. 우클릭 차단
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

// 2. 캡처 단축키 차단 (PrintScreen, Mac Cmd+Shift+3/4/5 등)
document.addEventListener('keydown', function(e) {
    // 윈도우 PrintScreen 또는 Mac 캡처 단축키 감지
    if (e.key === 'PrintScreen' || 
       (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5' || e.key === 's' || e.key === 'S')) ||
       (e.ctrlKey && e.key === 'p') || // 인쇄 단축키 차단
       (e.ctrlKey && e.key === 's')) { // 저장 단축키 차단
        
        e.preventDefault(); // 기본 캡처/인쇄 동작 막기
        
        // 캡처 시도 시 클립보드를 강제로 비워버림
        if (navigator.clipboard) {
            navigator.clipboard.writeText(''); 
        }
        
        // 서재의 시스템 알림창 띄우기 (경고)
        if (typeof showSystemAlert === 'function') {
            showSystemAlert("서재의 기록은 눈과 마음으로만 담아주세요.");
        } else {
            alert("서재의 기록은 눈과 마음으로만 담아주세요.");
        }
    }
});
// ==========================================
// 🚀 지독한 Z-index 갇힘 현상 원천 차단 (DOM 물리적 이동)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // 1. 화면에 띄워지는 모든 팝업/안내창들의 ID 목록
    const targetModals = [
        'system-modal', 'login-modal', 'backup-modal', 
        'library-modal', 'detail-modal', 'pin-modal'
    ];
    
    targetModals.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            // 2. 🚨 갇혀있던 모달창을 HTML의 가장 바깥쪽 부모(body)로 물리적 강제 이사!
            document.body.appendChild(modal);
            
            // 3. 바깥으로 꺼낸 뒤 최상단 층수 999만을 쐐기로 박아넣음
            modal.style.setProperty('z-index', '9999999999999', 'important');
        }
    });
});
// ==========================================
// ✨ 하단 고정 아이콘 호버: 은은한 움직임 + 원본의 영롱한 빛 복구
// ==========================================
const unifyHoverStyle = document.createElement('style');
unifyHoverStyle.innerHTML = `
    /* 1. 기본 상태: 아주 부드럽고 차분한 전환 속도 */
    #time-gear-btn, 
    #random-memory-btn, 
    #mini-audio-trigger, 
    #mini-backup-trigger {
        transition: all 0.25s ease-out !important;
        cursor: pointer !important;
        opacity: 0.9 !important; 
    }

    /* 2. 호버 상태: 살짝만 커지고(1.1배), 지침서 원본 느낌의 푸른빛 그림자(Glow) 강하게 발산 */
    #time-gear-btn:hover, 
    #random-memory-btn:hover, 
    #mini-audio-trigger:hover, 
    #mini-backup-trigger:hover {
        transform: scale(1.1) translateY(-2px) translateZ(0) !important; /* 🚨 translateZ(0) 추가 */
        filter: drop-shadow(0 0 8px rgba(144, 224, 239, 0.8)) !important; 
        opacity: 1 !important; 
    }
    
    /* 3. 클릭할 때: 아주 미세하게 눌리는 느낌 */
    #time-gear-btn:active, 
    #random-memory-btn:active, 
    #mini-audio-trigger:active, 
    #mini-backup-trigger:active {
        transform: scale(0.98) translateY(0) translateZ(0) !important; /* 🚨 translateZ(0) 추가 */
        filter: drop-shadow(0 0 4px rgba(144, 224, 239, 0.5)) !important; 
    }
`;
document.head.appendChild(unifyHoverStyle);


// ==========================================
// 🐚 숨겨진 감성: 개발자 도구를 열어본 이를 위한 이스터에그
// ==========================================
setTimeout(() => {
    console.clear(); // 브라우저 기본 경고들을 살짝 지워주고
    console.log(
        "%c🌊 수평선 너머의 서재 그 뒷면에 닿으신 것을 환영합니다.\n\n%c굳게 닫힌 문을 열고 이곳(Console)까지 찾아오시다니, 바다를 탐험하는 항해사 같으시네요.\n이곳의 코드와 기록들은 눈과 마음으로만 봐주시고, 혹여나 코드를 원하신다면 [ https://github.com/alyagsosiji/writing ] 을 참고해주세요.\n\n- 서재의 기록자이자 마리존 사이트의 주인 아시 올림", 
        "color: #90e0ef; font-size: 18px; font-weight: bold; font-family: sans-serif; text-shadow: 0 0 10px rgba(144,224,239,0.5);",
        "color: #cbd5e1; font-size: 13px; line-height: 1.8; font-family: sans-serif;"
    );
}, 2000);

// ==========================================
// 🪄 보이지 않는 편의성: ESC 키로 모든 열린 창 부드럽게 닫기
// ==========================================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // 기존에 만들어두신 닫기 함수들을 호출합니다.
        if (typeof closeModal === 'function') closeModal();
        if (typeof closeDetailModal === 'function') closeDetailModal();
        if (typeof closeBackupModal === 'function') closeBackupModal();
        if (typeof closeDonationModal === 'function') closeDonationModal();
        if (typeof closeLibraryModal === 'function') closeLibraryModal();
        
        // ID로 직접 제어되는 창들도 숨겨줍니다.
        const extraModals = ['env-modal', 'sound-modal', 'system-modal', 'pin-modal'];
        extraModals.forEach(id => {
            const m = document.getElementById(id);
            if (m && m.style.display !== 'none') m.style.display = 'none';
        });
        
        // ESC를 누르면 스크롤 잠금도 확실히 풀어줍니다.
        document.body.classList.remove('no-scroll');
    }
});

// ==========================================
// 🚀 최종 완성: 0.1초의 끊김도 없는 부드러운 하드웨어 가속 버전
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const oldBtn = document.getElementById('ocean-top-btn');
    if (oldBtn) oldBtn.remove();
    const oldStyle = document.getElementById('ocean-optimized-style');
    if (oldStyle) oldStyle.remove();

    const style = document.createElement('style');
    style.id = 'ocean-optimized-style';
    style.innerHTML = `
        #ocean-top-btn {
            position: fixed; bottom: 104px;
            left: 38px !important;
            z-index: 999999 !important; /* 🚨 [데스크탑 해결] 다른 배경 레이어에 가려지지 않도록 최상위 층수 부여 */
            width: 42px; height: 42px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
            font-size: 1.1rem;
            background: rgba(10, 15, 25, 0.85) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            color: #fff;
            transition: opacity 0.3s ease, transform 0.25s ease-out, filter 0.25s ease-out !important;
            cursor: pointer !important;
        }
        body.admin-logged-in #ocean-top-btn { bottom: 157px; }
        #ocean-top-btn.show { opacity: 0.9; pointer-events: auto; }
        
        #ocean-top-btn.show:hover {
            transform: scale(1.1) translateY(-2px) translateZ(0) !important; 
            filter: drop-shadow(0 0 8px rgba(144, 224, 239, 0.8)) !important;
            opacity: 1 !important; 
            background: rgba(15, 20, 30, 0.95) !important;
        }

        /* 🚨 [모바일 최적화 및 대칭 해결] 맨 아래(20px)로 쏠려 기기 바에 가려지던 현상을 기존 서재 플로팅 아이콘 높이(104px/157px)와 일치시켜 대칭 복구 */
         @media (max-width: 768px) {
    #ocean-top-btn { 
        bottom: 30px !important; left: 28px !important; right: auto !important; 
        width: 60px !important; height: 48px !important; padding: 0 !important; 
        border-radius: 30px !important; font-size: 20px !important; 
    }
    body.admin-logged-in #ocean-top-btn { 
        bottome: 50px !important; left: 28px !important; 
        width: 36px !important; height: 36px !important; 
        border-radius: 50% !important; font-size: 16px !important; 
    }
}
            
            /* 관리자 로그인 시 모바일에서도 완벽한 높이 대칭 유지 */
            body.admin-logged-in #ocean-top-btn { bottom: 157px !important; left: 30px !important; }
        }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('div');
    btn.id = 'ocean-top-btn';
    btn.innerHTML = '🌊';
    document.body.appendChild(btn);

    // 🚨 [데스크탑 해결] 일반 스크롤과 특정 컨테이너 내부 스크롤을 동시에 실시간 추적하여 스크롤 증발 현상 차단
    let ticking = false;
    window.addEventListener('scroll', (e) => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // 1. 전체 화면 스크롤 측정
                let scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
                
                // 2. 데스크탑 브라우저 특성상 내부 컨테이너가 스크롤될 경우 해당 높이까지 합산 감지
                if (e.target && e.target.scrollTop) {
                    scrollPos = Math.max(scrollPos, e.target.scrollTop);
                }
                
                const isShow = scrollPos > 100;
                if (isShow !== btn.classList.contains('show')) {
                    btn.classList.toggle('show', isShow);
                }
                ticking = false;
            });
            ticking = true;
        }
    }, true); 

    btn.onclick = () => {
        const scrollConfig = { top: 0, behavior: 'smooth' };
        window.scrollTo(scrollConfig);
        document.documentElement.scrollTo(scrollConfig);
        document.body.scrollTo(scrollConfig);
        
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }, 300);
    };
});
// ==========================================
// 🌊 서재 분위기에 녹아드는 투명한 물빛 스크롤바
// ==========================================
(function() {
    // 이미 스크롤바 스타일이 적용되어 있다면 중복 생성 방지
    if (!document.getElementById('custom-scrollbar-style')) {
        const scrollStyle = document.createElement('style');
        scrollStyle.id = 'custom-scrollbar-style';
        
        // 🚨 어떤 배경에서든 잘 보이고 분위기를 살리는 디자인
        scrollStyle.innerHTML = `
            /* 크롬(Chrome), 엣지(Edge), 사파리(Safari) 브라우저 지원 */
            
            /* 1. 스크롤바 전체 길 (트랙) */
            ::-webkit-scrollbar {
                width: 14px !important; /* 마우스로 잡기 편한 넉넉한 두께 */
                background: transparent !important;
            }
            
            /* 2. 스크롤바가 지나다니는 배경 */
            ::-webkit-scrollbar-track {
                background: rgba(3, 10, 23, 0.1) !important; /* 아주 옅은 심해색으로 길만 살짝 표시 */
                border-radius: 10px !important;
            }
            
            /* 3. 🚨 움직이는 스크롤바 (손잡이) */
            ::-webkit-scrollbar-thumb {
                background: rgba(144, 224, 239, 0.4) !important; /* 서재의 네온 빛과 맞춘 반투명 물빛 */
                border-radius: 10px !important; /* 둥글고 부드러운 마감 */
                
                /* 벽에 딱 붙지 않고 살짝 떨어져 보이게 하는 마법의 CSS */
                border: 4px solid transparent !important; 
                background-clip: padding-box !important;
            }
            
            /* 4. 마우스를 올렸을 때 (호버) */
            ::-webkit-scrollbar-thumb:hover {
                background: rgba(144, 224, 239, 0.8) !important; /* 마우스를 올리면 확 선명해짐 */
            }

            /* 파이어폭스(Firefox) 브라우저 호환성 지원 */
            * {
                scrollbar-width: thin !important;
                scrollbar-color: rgba(144, 224, 239, 0.6) transparent !important;
            }
        `;
        document.head.appendChild(scrollStyle);
    }
})();
// ==========================================
// 🛡️ 호버 시 0.1초 텍스트 깨짐 완벽 방어 (최종 클린 버전)
// ==========================================
const oldAntiBlur = document.getElementById('anti-blur-style');
if (oldAntiBlur) oldAntiBlur.remove();

const antiBlurStyle = document.createElement('style');
antiBlurStyle.id = 'anti-blur-style';
antiBlurStyle.innerHTML = `
    /* 🚨 1. 텍스트가 있는 글자 버튼과 모달창을 GPU 가속(transform) 간섭 대상에서 완전히 제외합니다. (아이콘과 카드만 유지) */
    .post-card,
    #time-gear-btn, #random-memory-btn, #mini-audio-trigger, #mini-backup-trigger, #ocean-top-btn {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
    }

    /* 🚨 2. 글자가 없는 둥근 아이콘(플로팅 버튼)들만 렌더링 모드 전환(will-change)을 적용합니다. */
    #time-gear-btn, #random-memory-btn, #mini-audio-trigger, #mini-backup-trigger, #ocean-top-btn {
        will-change: transform;
    }

    /* 🚨 3. 자식 요소들 뒷면 숨김 처리 (모달 간섭 제거) */
    .post-card *, #ocean-top-btn * {
        backface-visibility: hidden !important;
        -webkit-backface-visibility: hidden !important;
    }

    /* 모바일 터치 액티브 효과 */
    @media (max-width: 768px) {
        .post-card:active { transform: scale(0.99) translateZ(0) !important; }
        #ocean-top-btn.show:active, #time-gear-btn:active, #random-memory-btn:active { transform: scale(0.95) translateZ(0) !important; }
    }
`;
document.head.appendChild(antiBlurStyle);
// ==========================================
// 🚀 성능 최적화: 저사양 기기 렌더링(GPU) 효율 극대화
// ==========================================
const hardwareAccelerationStyle = document.createElement('style');
hardwareAccelerationStyle.innerHTML = `
    /* 🚨 [핵심 해결] content-visibility 제거: 무한 스크롤 시 높이 재계산으로 인한 레이아웃 뒤틀림과 스크롤 버벅임 완벽 제거 */
    .post-card {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
    }

    #ocean-bg-layer,
    .weather-overlay,
    body::before {
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
        will-change: background, transform;
        pointer-events: none;
    }

    .modal {
        will-change: opacity;
        transform: translateZ(0);
    }
`;
document.head.appendChild(hardwareAccelerationStyle);

// ==========================================
// 🚀 극한의 스크롤 최적화: 렌더링 격리(Containment) + 스크롤 연산 차단
// ==========================================
(function() {
    const oldStyle = document.getElementById('ultimate-scroll-opt');
    if (oldStyle) oldStyle.remove();

    const scrollOptStyle = document.createElement('style');
    scrollOptStyle.id = 'ultimate-scroll-opt';
    scrollOptStyle.innerHTML = `
        /* 🚨 1. 렌더링 격리(Containment): 카드 내부와 외부의 그래픽 연산을 완전히 분리! 
           브라우저가 스크롤할 때마다 전체 페이지를 다시 그리지 않게 만들어 프레임을 방어합니다. */
        .post-card {
            contain: layout style; 
        }

        /* 🚨 2. 스크롤 중일 때 마우스 호버 연산을 완벽히 끕니다 */
        .is-scrolling .post-card {
            pointer-events: none !important;
        }
        
        /* 🚨 3. 스크롤 중에는 브라우저를 괴롭히는 부드러운 전환(Transition) 효과를 잠시 꺼서 렌더링 속도에 100% 올인합니다 */
        .is-scrolling * {
            transition-duration: 0s !important;
        }
    `;
    document.head.appendChild(scrollOptStyle);

    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (!document.body.classList.contains('is-scrolling')) {
            document.body.classList.add('is-scrolling');
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            document.body.classList.remove('is-scrolling');
        }, 100); 
    }, { passive: true }); 
})();
