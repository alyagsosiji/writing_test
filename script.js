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

window.manualTimeOverride = localStorage.getItem('env_time_override') || 'auto';
window.manualWeatherOverride = localStorage.getItem('env_weather_override') || 'auto';

let currentDisplayMode = localStorage.getItem('env_display_mode') || 'list';
let isRestMode = false;
let backupTriggerQueued = false;

// 모달 열림/닫힘 상태에 따라 배경 스크롤 잠금을 안전하게 동기화
function syncBodyScrollLock() {
    const modalIds = [
        'library-modal', 'login-modal', 'backup-modal', 'detail-modal',
        'system-modal', 'donation-modal', 'pin-modal', 'env-modal', 'sound-modal'
    ];
    const isAnyOpen = modalIds.some(id => {
        const el = document.getElementById(id);
        return el && window.getComputedStyle(el).display !== 'none';
    });
    document.body.classList.toggle('no-scroll', isAnyOpen);
}

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
    if (type === 'post') {
        localStorage.removeItem('draft_post-title');
        localStorage.removeItem('draft_post-content');
    } else if (type === 'letter') {
        localStorage.removeItem('draft_letter-title');
        localStorage.removeItem('draft_letter-content');
    }
}

function closeSoundModal() {
    const modal = document.getElementById('sound-modal');
    if (modal) modal.style.display = 'none';
    syncBodyScrollLock();
}
window.closeSoundModal = closeSoundModal;

function openSoundModal() {
    let modal = document.getElementById('sound-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sound-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:999999999;';
        modal.innerHTML = `
            <div onclick="event.stopPropagation()" style="background:#0f172a; padding:25px; border-radius:12px; border:1px solid #38bdf8; width:320px; max-width:90%; text-align:center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <h3 style="color:#fff; margin-bottom:20px; font-size:1.1rem;">서재의 소리 설정</h3>
                <div style="margin-bottom:20px; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-bottom:10px;">🎵 수평선 배경 음악 (BGM)</p>
                    <button id="btn-music-toggle" onclick="window.togglePlayPause()" style="padding:8px 16px; border-radius:6px; background:#0284c7; color:#fff; border:none; cursor:pointer; font-weight:bold;">${isTrackPlaying ? '일시정지' : '음악 재생'}</button>
                </div>
                <div style="margin-bottom:25px; background:rgba(255,255,255,0.05); padding:15px; border-radius:8px;">
                    <p style="color:#cbd5e1; font-size:0.85rem; margin-bottom:10px;">🌊 수평선 파도 소리 (ASMR)</p>
                    <button id="btn-asmr-toggle" onclick="window.toggleAsmr()" style="padding:8px 16px; border-radius:6px; background:#059669; color:#fff; border:none; cursor:pointer; font-weight:bold;">${isAsmrPlaying ? '파도 소리 끄기' : '파도 소리 켜기'}</button>
                </div>
                <button onclick="window.closeSoundModal()" style="padding:6px 20px; border:1px solid #94a3b8; background:transparent; color:#94a3b8; border-radius:6px; cursor:pointer;">닫기</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const mBtn = document.getElementById('btn-music-toggle');
        if (mBtn) mBtn.innerText = isTrackPlaying ? '일시정지' : '음악 재생';
        const aBtn = document.getElementById('btn-asmr-toggle');
        if (aBtn) aBtn.innerText = isAsmrPlaying ? '파도 소리 끄기' : '파도 소리 켜기';
    }
    modal.style.display = 'flex';
    syncBodyScrollLock();
}
window.openSoundModal = openSoundModal;

function toggleAsmr() {
    const btn = document.getElementById('btn-asmr-toggle');
    if (isAsmrPlaying) {
        asmrEngine.pause();
        isAsmrPlaying = false;
        if (btn) btn.innerText = '파도 소리 켜기';
    } else {
        asmrEngine.play().catch(() => {});
        isAsmrPlaying = true;
        if (btn) btn.innerText = '파도 소리 끄기';
    }
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
        audioEngine.play().then(() => {
            if (playerTrigger) playerTrigger.classList.add('playing');
        }).catch(() => {
            isTrackPlaying = false;
            if (playerTrigger) playerTrigger.classList.remove('playing');
        });
    });
}

function loadTrack(index) {
    if (index < 0 || index >= MY_MUSIC_LIST.length) return;
    audioEngine.src = MY_MUSIC_LIST[index].src;
}

function togglePlayPause() {
    const playerTrigger = document.getElementById('mini-audio-trigger');
    const btn = document.getElementById('btn-music-toggle');
    if (isTrackPlaying) {
        audioEngine.pause();
        isTrackPlaying = false;
        if (playerTrigger) playerTrigger.classList.remove('playing');
        if (btn) btn.innerText = '음악 재생';
    } else {
        audioEngine.play().then(() => {
            isTrackPlaying = true;
            if (playerTrigger) playerTrigger.classList.add('playing');
            if (btn) btn.innerText = '일시정지';
        }).catch(() => console.log("오디오 스트리밍 방어"));
    }
}
window.togglePlayPause = togglePlayPause;

function injectRandomMemoryButton() {
    if (document.getElementById('random-memory-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'random-memory-btn';
    btn.innerHTML = '🐚';
    btn.title = "파도에 밀려온 과거의 조각 (필터를 기준으로 랜덤 글 뽑기)";

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
    const modal = document.getElementById('library-modal');
    if (modal) {
        modal.style.display = 'flex';
        syncBodyScrollLock();
    }
};
window.closeLibraryModal = function() {
    const modal = document.getElementById('library-modal');
    if (modal) {
        modal.style.display = 'none';
        syncBodyScrollLock();
    }
};

function requestNotificationPermission() {
    if (!("Notification" in window) || !database || typeof firebase === 'undefined' || !firebase.messaging) return;
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            const messaging = firebase.messaging();
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    messaging.getToken({
                        vapidKey: 'BP8mVTuhszB5HkdHqMC3Lo-flElm8Jj06TGct_qEdzhn30bmgxfYKlG8z0n2DE0BD6L_upJVfliSX9Ua0vCg5Pg',
                        serviceWorkerRegistration: registration
                    }).then((currentToken) => {
                        if (currentToken) {
                            const cleanToken = currentToken.replace(/[.#$\[\]]/g, '_');
                            let tokenPath = 'fcmTokens/visitors/' + cleanToken;

                            if (isAdmin && (loggedInUser === '아시' || loggedInUser === '하은')) {
                                tokenPath = 'fcmTokens/admins/' + loggedInUser + '/' + cleanToken;
                            }

                            const cacheKey = `last_token_path_${loggedInUser || 'visitor'}`;
                            if (localStorage.getItem(cacheKey) === tokenPath) return;

                            database.ref(tokenPath).set(currentToken).then(() => {
                                localStorage.setItem(cacheKey, tokenPath);
                            });
                        }
                    }).catch(() => {});
                });
            }
        }
    });
}

function sendNotification(title, body) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = Date.now();
    const lastNotiTime = Number(localStorage.getItem('last_noti_time') || 0);
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
    if (loader && !loader.classList.contains('fade-out')) {
        loader.classList.add('fade-out');
        setTimeout(() => {
            if (localStorage.getItem('library_welcomed') !== 'true') {
                localStorage.setItem('library_welcomed', 'true');
                window.openLibraryModal();
            }
        }, 300);
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    hideLoadingScreen();
} else {
    document.addEventListener('DOMContentLoaded', hideLoadingScreen);
}

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
        firebase.initializeApp(secureConfig);
        database = firebase.database();

        if (firebase.appCheck) {
            const appCheck = firebase.appCheck();
            appCheck.activate('6LeF0yctAAAAAD-CVI-X1HI3qIi9n_ySlFces9ag', true);
        }
    }
} catch (error) {
    console.error("Firebase 초기화 에러:", error);
}

let isAdmin = false;
let loggedInUser = '';
let currentView = 'posts';
let currentPage = 1;
const postsPerPage = 6;
let allPosts = [];
let allHorizons = [];
let allLetters = [];
let editTargetKey = null;
let searchKeyword = '';
let searchAuthor = 'all';
let isSubmitting = false;
let isInternalSyncAction = false;

document.addEventListener('DOMContentLoaded', function() {
    try {
        if (localStorage.getItem('isAdminLoggedIn') === 'true') {
            isAdmin = true;
            loggedInUser = localStorage.getItem('loggedInUser') || '';
            requestNotificationPermission();
        }
        applyTimeBasedThemeEngine();
        initDraftAutoSaveEngine();
        injectRandomMemoryButton();
        injectTimeGearButton();
        initTopScrollButton();

        let preWeather = document.getElementById('weather-widget');
        if (!preWeather && document.body) {
            preWeather = document.createElement('div');
            preWeather.id = 'weather-widget';
            document.body.appendChild(preWeather);
        }
        if (preWeather) preWeather.innerText = "⏳ 바다 읽는 중...";

        fetchWeatherWidget();
        syncWeatherAndWidget();
        setInterval(syncWeatherAndWidget, 30 * 60000);
        listenPosts();
        listenHorizons();
        listenLetters();
        initMusicPlayerEngine();

        if (typeof firebase !== 'undefined' && database) {
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
            if (typeof firebase !== 'undefined' && firebase.messaging) {
                firebase.messaging().useServiceWorker(reg);
            }
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        const updateToast = document.getElementById('update-toast');
                        if (updateToast) updateToast.classList.add('show');
                    }
                });
            });
        }).catch((err) => console.error(err));
    });
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const reloadBtn = document.getElementById('update-reload-btn');
    const dismissBtn = document.getElementById('update-dismiss-btn');
    const updateToast = document.getElementById('update-toast');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            if (updateToast) updateToast.classList.remove('show');
            if (newWorker) newWorker.postMessage({ action: 'skipWaiting' });
        });
    }
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            if (updateToast) updateToast.classList.remove('show');
        });
    }
});

function formatTo24Hour(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr).trim();
    str = str.replace(/\b24(?=:\d{2})/g, '00');
    if (str.includes('오전') || str.includes('오후')) {
        const isPm = str.includes('오후');
        str = str.replace(/오전\s*|오후\s*/g, '');
        str = str.replace(/(\d{1,2})(?=:\d{2})/, function(match) {
            let h = parseInt(match, 10);
            if (isPm) { if (h !== 12) h += 12; } else { if (h === 12) h = 0; }
            return String(h).padStart(2, '0');
        });
    }
    return str;
}

// ==========================================
// 🛡️ 서재 기록 보호 (우클릭, 드래그, 캡처/개발자도구 단축키 방어 및 ESC 닫기 통합)
// ==========================================
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('selectstart', e => {
    const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (typeof closeModal === 'function') closeModal();
        if (typeof closeDetailModal === 'function') closeDetailModal();
        if (typeof closeBackupModal === 'function') closeBackupModal();
        if (typeof closeDonationModal === 'function') closeDonationModal();
        if (typeof closeLibraryModal === 'function') closeLibraryModal();
        if (typeof closeSoundModal === 'function') closeSoundModal();

        const extraModals = ['env-modal', 'system-modal'];
        extraModals.forEach(id => {
            const m = document.getElementById(id);
            if (m && m.style.display !== 'none') m.style.display = 'none';
        });
        syncBodyScrollLock();
        return;
    }

    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) || (e.ctrlKey && (e.key === 'u' || e.key === 'U'))) {
        e.preventDefault();
        return false;
    }

    if (e.key === 'PrintScreen' ||
       (e.metaKey && e.shiftKey && ['3', '4', '5', 's', 'S'].includes(e.key)) ||
       (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        if (navigator.clipboard) {
            navigator.clipboard.writeText('').catch(() => {});
        }
        showSystemAlert("서재의 기록은 눈과 마음으로만 담아주세요.");
    }
});

function decodeData(str) { return decodeURIComponent(escape(atob(str))); }
const secureAdmin = { id: decodeData("7JWE7Iuc"), pw: atob("YXNoaSMyNjA0MTY=") };

function showSystemAlert(message, callback) {
    const modalElem = document.getElementById('system-modal');
    if (document.getElementById('system-title')) document.getElementById('system-title').innerText = "안내";
    if (document.getElementById('system-message')) document.getElementById('system-message').innerText = message;
    if (document.getElementById('system-buttons')) {
        document.getElementById('system-buttons').innerHTML = "";
        const okBtn = document.createElement('button');
        okBtn.innerText = "확인";
        okBtn.onclick = function() {
            if (modalElem) modalElem.style.display = 'none';
            syncBodyScrollLock();
            if (callback) callback();
        };
        document.getElementById('system-buttons').appendChild(okBtn);
    }
    if (modalElem) modalElem.style.display = 'flex';
    syncBodyScrollLock();
}

function showSystemConfirm(message, onConfirm, onCancel) {
    const modalElem = document.getElementById('system-modal');
    if (document.getElementById('system-title')) document.getElementById('system-title').innerText = "확인";
    if (document.getElementById('system-message')) document.getElementById('system-message').innerText = message;
    if (document.getElementById('system-buttons')) {
        document.getElementById('system-buttons').innerHTML = "";
        const confirmBtn = document.createElement('button');
        confirmBtn.innerText = "확인";
        confirmBtn.onclick = function() {
            if (modalElem) modalElem.style.display = 'none';
            syncBodyScrollLock();
            if (onConfirm) onConfirm();
        };
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = "취소";
        cancelBtn.className = "cancel-btn";
        cancelBtn.onclick = function() {
            if (modalElem) modalElem.style.display = 'none';
            syncBodyScrollLock();
            if (onCancel) onCancel();
        };
        document.getElementById('system-buttons').appendChild(confirmBtn);
        document.getElementById('system-buttons').appendChild(cancelBtn);
    }
    if (modalElem) modalElem.style.display = 'flex';
    syncBodyScrollLock();
}

function openModal() {
    const m = document.getElementById('login-modal');
    if (m) { m.style.display = 'flex'; syncBodyScrollLock(); }
}
function closeModal() {
    const m = document.getElementById('login-modal');
    if (m) { m.style.display = 'none'; syncBodyScrollLock(); }
}
function closeDetailModal() {
    const m = document.getElementById('detail-modal');
    if (m) { m.style.display = 'none'; syncBodyScrollLock(); }
}
window.openModal = openModal;
window.closeModal = closeModal;
window.closeDetailModal = closeDetailModal;

function openDonationModal() {
    const m = document.getElementById('donation-modal');
    if (m) { m.style.display = 'flex'; syncBodyScrollLock(); }
}
function closeDonationModal() {
    const m = document.getElementById('donation-modal');
    if (m) { m.style.display = 'none'; syncBodyScrollLock(); }
}
window.openDonationModal = openDonationModal;
window.closeDonationModal = closeDonationModal;

function openBackupModal() {
    if (!isAdmin) return;
    const m = document.getElementById('backup-modal');
    if (m) {
        m.style.display = 'flex';
        window.switchAdminTab('backup');
        syncBodyScrollLock();
    }
}
function closeBackupModal() {
    const m = document.getElementById('backup-modal');
    if (m) { m.style.display = 'none'; syncBodyScrollLock(); }
}
window.openBackupModal = openBackupModal;
window.closeBackupModal = closeBackupModal;

window.switchAdminTab = function(tab) {
    const btnBackup = document.getElementById('admin-btn-backup');
    const btnSettings = document.getElementById('admin-btn-settings');
    const listContainer = document.getElementById('backup-list-container');
    const delControls = document.getElementById('backup-delete-controls');
    const settingsContainer = document.getElementById('admin-settings-container');
    const subtitleSpan = document.getElementById('backup-modal-subtitle');
    const timelineWrapper = document.querySelector('.backup-timeline-wrapper');

    if (tab === 'backup') {
        if (btnBackup) { btnBackup.style.color = '#f7a37f'; btnBackup.style.borderBottom = '2px solid #f7a37f'; }
        if (btnSettings) { btnSettings.style.color = '#64748b'; btnSettings.style.borderBottom = '2px solid transparent'; }
        if (listContainer) listContainer.style.setProperty('display', 'block', 'important');
        if (delControls) delControls.style.setProperty('display', 'flex', 'important');
        if (settingsContainer) settingsContainer.style.setProperty('display', 'none', 'important');
        if (subtitleSpan) subtitleSpan.style.setProperty('display', 'block', 'important');
        if (timelineWrapper) timelineWrapper.style.setProperty('display', 'block', 'important');
        loadBackupTimelineList();
    } else if (tab === 'settings') {
        if (btnSettings) { btnSettings.style.color = '#f7a37f'; btnSettings.style.borderBottom = '2px solid #f7a37f'; }
        if (btnBackup) { btnBackup.style.color = '#64748b'; btnBackup.style.borderBottom = '2px solid transparent'; }
        if (listContainer) listContainer.style.setProperty('display', 'none', 'important');
        if (delControls) delControls.style.setProperty('display', 'none', 'important');
        if (settingsContainer) settingsContainer.style.setProperty('display', 'block', 'important');
        if (subtitleSpan) subtitleSpan.style.setProperty('display', 'none', 'important');
        if (timelineWrapper) timelineWrapper.style.setProperty('display', 'none', 'important');
        renderAdminSettings();
    }
};

function renderAdminSettings() {
    const container = document.getElementById('admin-settings-container');
    if (!container) return;
    container.innerHTML = `
        <div style="background:rgba(3,10,23,0.5); padding:20px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); text-align:left; margin-bottom: 15px;">
            <h3 style="color:#fff; margin-bottom:15px; font-size:1.05rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">관리자 전용 제어 시스템</h3>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>
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
    if (!isAdmin || !database) return;
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
const ENCRYPTED_PIN_HASH = 'MjYwNDE2';

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (sessionStorage.getItem('pinAuthenticated') === 'true') {
                finalizeLogin(user);
            } else {
                pendingUser = user;
                currentPin = '';
                const pinDisp = document.getElementById('pin-display');
                const pinModal = document.getElementById('pin-modal');
                if (pinDisp) pinDisp.innerText = '';
                if (pinModal) pinModal.style.display = 'flex';
                syncBodyScrollLock();
            }
        } else {
            isAdmin = false;
            loggedInUser = '';
            localStorage.removeItem('isAdminLoggedIn');
            localStorage.removeItem('loggedInUser');
            sessionStorage.removeItem('pinAuthenticated');
            updateUI();
        }
    });
}

function finalizeLogin(user) {
    const wasAlreadyAuthenticated = isAdmin && sessionStorage.getItem('pinAuthenticated') === 'true';
    sessionStorage.setItem('pinAuthenticated', 'true');
    isAdmin = true;
    if (user.email === 'alyagsosiji@gmail.com') loggedInUser = '아시';
    else if (user.email === 'haeunchan0114@naver.com') loggedInUser = '하은';

    localStorage.setItem('isAdminLoggedIn', 'true');
    localStorage.setItem('loggedInUser', loggedInUser);

    if (!wasAlreadyAuthenticated) {
        showSystemAlert(`환영합니다, 수평선 너머 바다의 기록자, ${loggedInUser}님.`);
    }

    requestNotificationPermission();
    listenPosts();
    listenHorizons();
    listenLetters();
    updateUI();
}

function inputPin(num) {
    if (currentPin.length < 6) currentPin += num;
    const disp = document.getElementById('pin-display');
    if (disp) disp.innerText = '●'.repeat(currentPin.length);
}
window.inputPin = inputPin;

function clearPin() {
    currentPin = '';
    const disp = document.getElementById('pin-display');
    if (disp) disp.innerText = '';
}
window.clearPin = clearPin;

async function submitPin() {
    const encodedInput = btoa(currentPin);
    const pinModal = document.getElementById('pin-modal');

    if (encodedInput === ENCRYPTED_PIN_HASH) {
        if (pinModal) pinModal.style.display = 'none';
        syncBodyScrollLock();
        finalizeLogin(pendingUser);
    } else {
        showSystemAlert('올바른 접근이 아닙니다.');
        if (typeof firebase !== 'undefined' && firebase.auth) firebase.auth().signOut();
        if (pinModal) pinModal.style.display = 'none';
        syncBodyScrollLock();
        clearPin();
    }
}
window.submitPin = submitPin;

function login() {
    const modal = document.getElementById('login-modal');
    if (!modal) return;

    const idElem = modal.querySelector('input[type="text"], input[type="email"]') || modal.querySelectorAll('input')[0];
    const pwElem = modal.querySelector('input[type="password"]') || modal.querySelectorAll('input')[1];
    if (!idElem || !pwElem) return;

    const inputId = idElem.value.trim();
    const inputPw = pwElem.value.trim();

    if (!inputId || !inputPw) {
        showSystemAlert('서재의 열쇠를 모두 입력해주세요.');
        return;
    }

    let targetEmail = inputId;
    if (inputId === '아시') targetEmail = 'alyagsosiji@gmail.com';
    else if (inputId === '하은') targetEmail = 'haeunchan0114@naver.com';

    firebase.auth().signInWithEmailAndPassword(targetEmail, inputPw)
        .then(() => {
            closeModal();
            idElem.value = '';
            pwElem.value = '';
        })
        .catch(() => {
            showSystemAlert('서재의 열쇠가 맞지 않습니다.');
        });
}
window.login = login;

function logout() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
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
        if (tabHorizons) tabHorizons.style.display = 'inline-block';
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
        if (tabHorizons) tabHorizons.style.display = 'none';
        if (backupTrigger) backupTrigger.style.display = 'none';
        switchView('posts');
    }

    const letterSubmitBtn = document.getElementById('submit-letter-btn');
    const letterContent = document.getElementById('letter-content');
    if (isRestMode) {
        if (letterSubmitBtn) {
            letterSubmitBtn.disabled = true;
            letterSubmitBtn.innerText = '바다가 쉬어가는 중입니다';
            letterSubmitBtn.style.opacity = '0.5';
        }
        if (letterContent) {
            letterContent.disabled = true;
            letterContent.placeholder = '현재 수평선 너머로 편지를 띄울 수 없습니다. 바다가 고요히 쉬고 있습니다.';
        }
    } else {
        if (letterSubmitBtn) {
            letterSubmitBtn.disabled = false;
            letterSubmitBtn.innerText = '편지 띄우기';
            letterSubmitBtn.style.opacity = '1';
        }
        if (letterContent) {
            letterContent.disabled = false;
            letterContent.placeholder = '기록자 분들에게 띄워 보낼 편지의 내용을 입력해주세요.';
        }
    }
}

function switchView(view) {
    if (!isAdmin && (view === 'letters' || view === 'horizons')) {
        currentView = 'posts';
    } else {
        currentView = view;
    }
    currentPage = 1;

    if (window.infiniteObserver) {
        window.infiniteObserver.disconnect();
        window.infiniteObserver = null;
    }

    const tabPosts = document.getElementById('tab-posts');
    const tabHorizons = document.getElementById('tab-horizons');
    const tabLetters = document.getElementById('tab-letters');

    const mainTitle = document.getElementById('section-main-title');
    const writeTitle = document.getElementById('write-title');
    const submitPostBtn = document.getElementById('submit-post-btn');

    if (tabPosts) tabPosts.classList.remove('active');
    if (tabHorizons) tabHorizons.classList.remove('active');
    if (tabLetters) tabLetters.classList.remove('active');

    if (currentView === 'posts') {
        if (tabPosts) tabPosts.classList.add('active');
        if (mainTitle) mainTitle.innerText = "바다의 기록";
        if (writeTitle && !editTargetKey) writeTitle.innerText = "새로운 기록 남기기";
        if (submitPostBtn && !editTargetKey) submitPostBtn.innerText = "기록하기";
    } else if (currentView === 'horizons') {
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

function handleSearch() {
    searchKeyword = document.getElementById('search-input') ? document.getElementById('search-input').value.trim() : '';
    searchAuthor = document.getElementById('author-filter') ? document.getElementById('author-filter').value : 'all';
    currentPage = 1;
    if (window.infiniteObserver) {
        window.infiniteObserver.disconnect();
        window.infiniteObserver = null;
    }
    renderUI();
}
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
// 🌊 실시간 데이터 감지 및 알림
// ==========================================
let rawPostsSnapshot = null;
let rawHorizonsSnapshot = null;
let rawLettersSnapshot = null;
let isInitialPostLoad = true;
let knownPostIds = new Set();
let isInitialHorizonLoad = true;
let knownHorizonIds = new Set();
let isInitialLetterLoad = true;
let knownLetterIds = new Set();

function listenPosts() {
    if (!database) return;
    database.ref('posts').off();
    database.ref('posts').on('value', (snapshot) => {
        rawPostsSnapshot = snapshot.val();
        allPosts = [];
        let currentIds = new Set();
        let hasNewPost = false;
        let newPostAuthor = '';

        if (rawPostsSnapshot) {
            Object.keys(rawPostsSnapshot).forEach((key) => {
                allPosts.push({ id: key, ...rawPostsSnapshot[key] });
                currentIds.add(key);
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

        knownPostIds = currentIds;
        isInitialPostLoad = false;
        if (currentView === 'posts') renderUI();
    });
}

function listenHorizons() {
    if (!database) return;
    database.ref('horizons').off();
    database.ref('horizons').on('value', (snapshot) => {
        rawHorizonsSnapshot = snapshot.val();
        allHorizons = [];
        let currentIds = new Set();
        let hasNewHorizon = false;
        let newHorizonAuthor = '';

        if (rawHorizonsSnapshot) {
            Object.keys(rawHorizonsSnapshot).forEach((key) => {
                allHorizons.push({ id: key, ...rawHorizonsSnapshot[key] });
                currentIds.add(key);
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

        if (hasNewHorizon && isAdmin && newHorizonAuthor !== loggedInUser) {
            sendNotification("비밀 기록", "수평선 너머에 누군가 은밀한 기록을 남겼습니다.");
        }

        knownHorizonIds = currentIds;
        isInitialHorizonLoad = false;
        if (currentView === 'horizons') renderUI();
    });
}

function listenLetters() {
    if (!database) return;
    database.ref('letters').off();
    database.ref('letters').on('value', (snapshot) => {
        rawLettersSnapshot = snapshot.val();
        allLetters = [];
        let currentIds = new Set();
        let hasNewLetter = false;
        let newLetterAuthor = '';

        if (rawLettersSnapshot) {
            Object.keys(rawLettersSnapshot).forEach((key) => {
                allLetters.push({ id: key, ...rawLettersSnapshot[key] });
                currentIds.add(key);
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

        knownLetterIds = currentIds;
        isInitialLetterLoad = false;
        if (currentView === 'letters') renderUI();
    });
}

const CONTEXT_RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000;

function executeCloudBackupEngine(isAutomatic = true) {
    if (!database) return Promise.reject(new Error("Database connection lost"));
    const now = new Date();
    const timestamp = now.getTime();
    const dateString = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const pCount = rawPostsSnapshot ? Object.keys(rawPostsSnapshot).length : 0;
    const hCount = rawHorizonsSnapshot ? Object.keys(rawHorizonsSnapshot).length : 0;
    const lCount = rawLettersSnapshot ? Object.keys(rawLettersSnapshot).length : 0;

    const backupMeta = { timestamp: timestamp, date: dateString, type: isAutomatic ? "자동" : "수동", pCount: pCount, hCount: hCount, lCount: lCount };
    const backupPayload = { posts: rawPostsSnapshot || {}, horizons: rawHorizonsSnapshot || {}, letters: rawLettersSnapshot || {} };
    const newBackupKey = database.ref().push().key;

    return Promise.all([
        database.ref(`backupMeta/${newBackupKey}`).set(backupMeta),
        database.ref(`backupData/${newBackupKey}`).set(backupPayload)
    ]).then(() => {
        cleanExpiredBackupsTimeline();
        loadBackupTimelineList();
    });
}
window.executeCloudBackupEngine = executeCloudBackupEngine;

window.triggerManualBackup = function() {
    if (!isAdmin || !database) return showSystemAlert("권한이 누락되었습니다.");
    window.executeCloudBackupEngine(false)
        .then(() => showSystemAlert("현재 바다 상태 스냅샷 수동 저장이 완료되었습니다."))
        .catch(err => showSystemAlert("수동 백업 실패: " + err.message));
};

function cleanExpiredBackupsTimeline() {
    if (!database) return;
    const expirationThreshold = new Date().getTime() - CONTEXT_RETENTION_PERIOD;
    database.ref('backupMeta').orderByChild('timestamp').endAt(expirationThreshold).once('value').then((snapshot) => {
        const expiredBackups = snapshot.val();
        if (!expiredBackups) return;
        Object.keys(expiredBackups).forEach((key) => {
            database.ref(`backupMeta/${key}`).remove();
            database.ref(`backupData/${key}`).remove();
        });
    });
}

function toggleAllBackups(source) {
    document.querySelectorAll('.backup-checkbox').forEach(cb => cb.checked = source.checked);
}
window.toggleAllBackups = toggleAllBackups;

function selectBackupsByPeriod(days) {
    const checkboxes = document.querySelectorAll('.backup-checkbox');
    const selectAllCb = document.getElementById('backup-select-all');
    if (selectAllCb) selectAllCb.checked = false;
    if (!days) {
        checkboxes.forEach(cb => cb.checked = false);
        return;
    }
    const now = new Date().getTime();
    const threshold = days === 'all' ? now + 999999999 : now - (parseInt(days, 10) * 24 * 60 * 60 * 1000);
    let allChecked = true;
    checkboxes.forEach(cb => {
        const ts = parseInt(cb.getAttribute('data-timestamp'), 10);
        if (days === 'all') cb.checked = true;
        else cb.checked = ts < threshold;
        if (!cb.checked) allChecked = false;
    });
    if (selectAllCb) selectAllCb.checked = allChecked;
}
window.selectBackupsByPeriod = selectBackupsByPeriod;

function deleteSelectedBackups() {
    if (!isAdmin || !database) return;
    const checkboxes = document.querySelectorAll('.backup-checkbox:checked');
    const keysToDelete = Array.from(checkboxes).map(cb => cb.value);
    if (keysToDelete.length === 0) return showSystemAlert('소멸시킬 백업 지점을 선택해주세요.');
    showSystemConfirm(`선택하신 ${keysToDelete.length}개의 백업 기록을 영구히 소멸시키겠습니까?`, function() {
        const deletePromises = keysToDelete.map(key => Promise.all([
            database.ref(`backupMeta/${key}`).remove(),
            database.ref(`backupData/${key}`).remove()
        ]));
        Promise.all(deletePromises).then(() => {
            showSystemAlert('선택한 백업이 완전 소멸되었습니다.');
            loadBackupTimelineList();
        });
    });
}
window.deleteSelectedBackups = deleteSelectedBackups;

function loadBackupTimelineList() {
    let container = document.getElementById('backup-list-container');
    if (!container) return;
    container.innerHTML = '';

    const selectAllCb = document.getElementById('backup-select-all');
    if (selectAllCb) selectAllCb.checked = false;
    const periodSelect = document.getElementById('backup-period-select');
    if (periodSelect) periodSelect.value = "";

    const loadingMsg = document.getElementById('backup-loading-msg');
    if (loadingMsg) loadingMsg.style.display = 'block';
    const expirationThreshold = new Date().getTime() - CONTEXT_RETENTION_PERIOD;

    database.ref('backupMeta').once('value').then((snapshot) => {
        if (loadingMsg) loadingMsg.style.display = 'none';
        const backups = snapshot.val();
        if (!backups) {
            container.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding: 20px 0; text-align:center;">복구 지점이 없습니다.</p>`;
            return;
        }
        const keys = Object.keys(backups).filter(key => backups[key].timestamp >= expirationThreshold).reverse();
        if (keys.length === 0) {
            container.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding: 20px 0; text-align:center;">복구 지점이 없습니다.</p>`;
            return;
        }

        keys.forEach((key) => {
            const item = backups[key];
            const pCount = item.pCount || 0;
            const hCount = item.hCount || 0;
            const lCount = item.lCount || 0;
            const badgeClass = item.type === "자동" ? "auto" : "manual";
            const element = document.createElement('div');
            element.className = 'backup-item';

            element.innerHTML = `
                <div style="display:flex; align-items:center; width:100%; flex-wrap:wrap; gap:8px;">
                    <input type="checkbox" class="backup-checkbox" value="${key}" data-timestamp="${item.timestamp}" style="margin-right:8px; accent-color:#f7a37f; width:16px; height:16px; cursor:pointer; flex-shrink:0;">
                    <div class="backup-meta" style="flex-grow: 1; padding-right: 8px;">
                        <div class="backup-time-title">${item.date} <span class="backup-badge-type ${badgeClass}">${item.type}</span></div>
                        <div class="backup-counts">글 ${pCount}개 ㅣ 비밀 ${hCount}개 ㅣ 편지 ${lCount}개</div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0; align-items:center; margin-left:auto;">
                        <button onclick="window.downloadBackupFile('${key}', 'txt')" style="font-size:0.75rem; border:1px solid rgba(144,224,239,0.35); color:#90e0ef; padding: 5px 9px; border-radius:6px; background:rgba(144,224,239,0.04); cursor:pointer; font-weight:500;">TXT</button>
                        <button onclick="window.downloadBackupFile('${key}', 'pdf')" style="font-size:0.75rem; border:1px solid rgba(255,212,186,0.35); color:#ffd4ba; padding: 5px 9px; border-radius:6px; background:rgba(255,212,186,0.04); cursor:pointer; font-weight:500;">PDF</button>
                        <button onclick="window.restoreFromTargetBackupPoint('${key}')" style="font-size:0.75rem; border:1px solid #f7a37f; color:#fff; background:linear-gradient(135deg, #f7a37f, #e76f51); padding: 5px 12px; border-radius:6px; cursor:pointer; font-weight:bold; box-shadow:0 2px 6px rgba(247,163,127,0.25);">복구</button>
                    </div>
                </div>
            `;
            container.appendChild(element);
        });
    }).catch(() => {
        if (loadingMsg) loadingMsg.style.display = 'none';
        container.innerHTML = `<p style="color:#ef4444; font-size:0.82rem; padding: 20px 0; text-align:center;">인프라 클라우드 연동 차단 상태</p>`;
    });
}
window.loadBackupTimelineList = loadBackupTimelineList;

function downloadBackupFile(key, format) {
    if (!isAdmin || !database) return;
    database.ref(`backupData/${key}`).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) return showSystemAlert("백업 파일이 유실되었습니다.");

        const posts = data.posts || {};
        const horizons = data.horizons || {};
        const letters = data.letters || {};

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
                textResult += `  ${String(posts[k].content || '').replace(/\n/g, '\n  ')}\n`;
                textResult += ` --------------------------------------------------------\n`;
            });

            textResult += `\n\n─────────────────────────────────────────────────────────\n`;
            textResult += ` [2. 수평선 너머 (비밀 기록)]\n`;
            textResult += `─────────────────────────────────────────────────────────\n`;
            Object.keys(horizons).forEach(k => {
                textResult += `\n ◈ 제목 : ${horizons[k].title}\n`;
                textResult += ` ◈ 기록자 : ${horizons[k].author || '기록자'}  |  작성일 : ${horizons[k].date}\n`;
                textResult += ` --------------------------------------------------------\n`;
                textResult += `  ${String(horizons[k].content || '').replace(/\n/g, '\n  ')}\n`;
                textResult += ` --------------------------------------------------------\n`;
            });

            textResult += `\n\n─────────────────────────────────────────────────────────\n`;
            textResult += ` [3. 띄워진 편지]\n`;
            textResult += `─────────────────────────────────────────────────────────\n`;
            Object.keys(letters).forEach(k => {
                textResult += `\n ◈ 제목 : ${letters[k].title}\n`;
                textResult += ` ◈ 상태 : ${letters[k].read ? '수거됨' : '미수거'}  |  작성일 : ${letters[k].date}\n`;
                textResult += ` --------------------------------------------------------\n`;
                textResult += `  ${String(letters[k].content || '').replace(/\n/g, '\n  ')}\n`;
                textResult += ` --------------------------------------------------------\n`;
            });

            const blob = new Blob([textResult], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `수평선너머_백업_${key}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
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
                    @page { margin: 0; size: A4; }
                    body {
                        font-family: 'KoPub Batang', 'Nanum Myeongjo', 'Times New Roman', serif;
                        background-color: #ffffff;
                        color: #2d3748;
                        line-height: 1.9;
                        margin: 0;
                        padding: 0;
                    }
                    .page-container { width: 100%; border-collapse: collapse; border: none; }
                    .page-header-space { height: 18mm; }
                    .page-footer-space { height: 18mm; }
                    .content-padding { padding: 0 15mm; }
                    .top-right-copyright { text-align: right; font-size: 11px; color: #718096; font-family: sans-serif; margin-bottom: 12px; }
                    .header-container { text-align: center; border-bottom: 2px solid #1d3557; padding-bottom: 15px; margin-bottom: 5px; }
                    .header-title { font-size: 23px; font-weight: bold; color: #1d3557; letter-spacing: 1px; }
                    .timestamp-box { text-align: center; color: #457b9d; font-size: 11.5px; margin-top: 10px; margin-bottom: 25px; font-family: sans-serif; }
                    .library-motto { text-align: center; font-size: 13px; color: #718096; font-style: italic; margin-bottom: 45px; letter-spacing: 0.5px; }
                    h2 { color: #1d3557; font-size: 16px; font-weight: bold; margin-top: 40px; margin-bottom: 18px; border-left: 3px solid #457b9d; padding-left: 12px; page-break-after: avoid; break-after: avoid; }
                    .item-card { background: #fdfbf7; border: 1px solid #e1dbd6; border-radius: 6px; padding: 24px; margin-bottom: 22px; page-break-inside: avoid !important; break-inside: avoid !important; display: block; }
                    .item-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
                    .meta-line { font-size: 11.5px; color: #718096; margin-bottom: 16px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px; font-family: sans-serif; }
                    .author-tag { color: #457b9d; font-weight: bold; }
                    .status-tag { background: #edf2f7; color: #4a5568; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                    .content-text { white-space: pre-wrap; font-size: 14px; color: #2d3748; word-break: break-all; text-align: justify; }
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
                        setTimeout(function() { window.print(); }, 500);
                    }
                <\/script>
            </body>
            </html>`;

            doc.open();
            doc.write(htmlContent);
            doc.close();
        }
    }).catch(() => showSystemAlert("다운로드 파일 추출 실패"));
}
window.downloadBackupFile = downloadBackupFile;

function restoreFromTargetBackupPoint(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm('선택하신 시점으로 바다 데이터를 덮어씌워 복구하시겠습니까?', function() {
        database.ref(`backupData/${key}`).once('value').then((snapshot) => {
            executeRestore(snapshot.val());
        });
    });
}
window.restoreFromTargetBackupPoint = restoreFromTargetBackupPoint;

function executeRestore(targetBackup) {
    if (!targetBackup) return;
    isInternalSyncAction = true;
    database.ref('posts').off();
    database.ref('horizons').off();
    database.ref('letters').off();

    Promise.all([
        database.ref('posts').set(targetBackup.posts || null),
        database.ref('horizons').set(targetBackup.horizons || null),
        database.ref('letters').set(targetBackup.letters || null)
    ]).then(() => {
        listenPosts();
        listenHorizons();
        listenLetters();
        showSystemAlert('수평선 너머 바다가 완전 복원되었습니다.', function() {
            isInternalSyncAction = false;
            closeBackupModal();
        });
    }).catch(() => {
        listenPosts();
        listenHorizons();
        listenLetters();
    });
}

function scrollToPosts() {
    const postsSection = document.getElementById('posts-section');
    if (postsSection) {
        const yOffset = postsSection.getBoundingClientRect().top + window.scrollY - 40;
        window.scrollTo({ top: yOffset, behavior: 'smooth' });
    }
}

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
            // text-shadow 대신 filter: drop-shadow를 적용하여 그라데이션 텍스트가 깨지지 않고 맑게 빛나도록 처리
            if (currentView === 'posts') {
                subtitleText = `<span style="color:#ffffff; font-size:1.02rem; font-weight:500; letter-spacing:0.5px; filter:drop-shadow(0 0 8px rgba(144,224,239,0.5)); background:linear-gradient(120deg, #fff, #b9efff); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; display:inline-block;">아래 바다에 기록된 글들을 클릭하여 읽어주세요!</span><br><span style="color: #90e0ef; font-size: 0.85rem; display: inline-block; margin-top: 9px;">총 기록된 글 : ${allPosts.length}개</span>`;
            } else if (currentView === 'horizons') {
                subtitleText = `<span style="color:#ffffff; font-size:1.02rem; font-weight:500; letter-spacing:0.5px; filter:drop-shadow(0 0 8px rgba(216,180,255,0.5)); background:linear-gradient(120deg, #fff, #e4c1ff); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; display:inline-block;">기록자만이 열람할 수 있는 비밀의 바다입니다.</span><br><span style="color: #c9a0ff; font-size: 0.85rem; display: inline-block; margin-top: 9px;">은밀한 기록 : ${allHorizons.length}개</span>`;
            } else {
                subtitleText = `수평선 너머 바다 위에 띄워진 편지들.<br><span style="color: #ffd4ba; font-size: 0.85rem; display: inline-block; margin-top: 9px;">띄워진 편지 : ${allLetters.length}개</span>`;
            }

            let selectHtml = `
            <div style="margin-top:20px; display:flex; flex-direction:column; align-items:center; width:100%; gap:15px;">
                <div style="display:flex; justify-content:center; width:100%;">
                    <select onchange="window.setDisplayMode(this.value)" style="max-width: 190px;">
                        <option value="list" ${currentDisplayMode === 'list' ? 'selected' : ''}>📄 리스트 모드</option>
                        <option value="grid" ${currentDisplayMode === 'grid' ? 'selected' : ''}>🔲 갤러리 모드</option>
                        <option value="infinite" ${currentDisplayMode === 'infinite' ? 'selected' : ''}>🌊 스크롤 모드</option>
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
                    ">
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
                    ">선택 소멸</div>
                </div>
                `;
            }

            selectHtml += `</div>`;
            subtitleElem.innerHTML = subtitleText + selectHtml;
        }

        if (currentView === 'posts' || currentView === 'horizons') {
            if (authorStatsContainer) authorStatsContainer.style.display = 'flex';
            if (authorFilterContainer) authorFilterContainer.style.display = 'block';
            let targetArrayCount = currentView === 'posts' ? allPosts : allHorizons;
            let ashiCount = 0;
            let haeunCount = 0;
            targetArrayCount.forEach(item => {
                if ((item.author || "").includes("하은")) haeunCount++;
                else ashiCount++;
            });
            if (authorStatsContainer) {
                authorStatsContainer.innerHTML = `<span class="stat-badge">아시 : ${ashiCount}개</span><span class="stat-badge">하은 : ${haeunCount}개</span>`;
            }
        } else {
            if (authorStatsContainer) authorStatsContainer.style.display = 'none';
            if (authorFilterContainer) authorFilterContainer.style.display = 'none';
        }
    }

    let targetArray;
    if (currentView === 'posts') targetArray = allPosts;
    else if (currentView === 'horizons') targetArray = allHorizons;
    else targetArray = allLetters;

    if ((currentView === 'posts' || currentView === 'horizons') && searchAuthor !== 'all') {
        targetArray = targetArray.filter(item => {
            const author = item.author || "기록자";
            return searchAuthor === "하은" ? author.includes("하은") : !author.includes("하은");
        });
    }
    if (searchKeyword) {
        targetArray = targetArray.filter(item => String(item.title || '').toLowerCase().includes(searchKeyword.toLowerCase()));
    }

    if (targetArray.length === 0) {
        if (!isAppend) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#94a3b8; margin-top:40px;">존재하지 않습니다.</p>`;
        }
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

        const displayDate = (currentView === 'posts' || currentView === 'horizons')
            ? `${item.author || "기록자"} ㅣ ${formatTo24Hour(item.date)}`
            : formatTo24Hour(item.date);

        let selectLetterCbHtml = '';
        if (isAdmin && currentView === 'letters') {
            selectLetterCbHtml = `<input type="checkbox" class="letter-checkbox" value="${item.id}" onclick="event.stopPropagation();">`;
        }

        const safeContent = escapeHtml(item.content);
        let footerHtml = `<div class="post-footer"><span class="date">${displayDate}</span>${mgmtButtonsHtml}</div>`;
        let contentHtml = `<div class="post-content-area">${safeContent}</div>`;

        if ((currentView === 'posts' || currentView === 'horizons') && (currentDisplayMode === 'grid' || currentDisplayMode === 'infinite')) {
            contentHtml = `<div class="post-content-area grid-text-clamp">${safeContent}</div>`;

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

        card.innerHTML = `<h3 style="${isAdmin && currentView === 'letters' ? 'padding-right: 34px;' : ''}">${selectLetterCbHtml}${highlightSearchKeyword(item.title, searchKeyword)}${readBadgeHtml}</h3>${contentHtml}${footerHtml}`;
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
                }, { rootMargin: '200px' });
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
            const maxPageButtons = 5;
            const currentGroup = Math.ceil(currentPage / maxPageButtons);
            let startPage = (currentGroup - 1) * maxPageButtons + 1;
            let endPage = Math.min(currentGroup * maxPageButtons, totalPages);

            if (startPage > 1) {
                const prevBtn = document.createElement('div');
                prevBtn.className = 'page-btn';
                prevBtn.innerHTML = '&#139;';
                prevBtn.onclick = () => { currentPage = startPage - 1; renderUI(); scrollToPosts(); };
                pageFragment.appendChild(prevBtn);
            }
            for (let i = startPage; i <= endPage; i++) {
                const btn = document.createElement('div');
                btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                btn.innerText = i;
                btn.onclick = () => { currentPage = i; renderUI(); scrollToPosts(); };
                pageFragment.appendChild(btn);
            }
            if (endPage < totalPages) {
                const nextBtn = document.createElement('div');
                nextBtn.className = 'page-btn';
                nextBtn.innerHTML = '&#155;';
                nextBtn.onclick = () => { currentPage = endPage + 1; renderUI(); scrollToPosts(); };
                pageFragment.appendChild(nextBtn);
            }

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

    const item = targetArray.find(p => p.id === key);
    if (!item) return;

    if (currentView === 'letters' && isAdmin && !item.read && database) {
        database.ref('letters/' + key).update({ read: true });
    }

    if (document.getElementById('detail-title')) {
        document.getElementById('detail-title').innerHTML = escapeHtml(item.title);
    }

    if (document.getElementById('detail-date')) {
        const displayInfo = (currentView === 'posts' || currentView === 'horizons')
            ? `${item.author || "기록자"} ㅣ ${formatTo24Hour(item.date)}`
            : formatTo24Hour(item.date);
        document.getElementById('detail-date').innerText = displayInfo;
    }

    if (document.getElementById('detail-text')) {
        const detailTextElem = document.getElementById('detail-text');
        detailTextElem.innerHTML = escapeHtml(item.content);
        detailTextElem.scrollTop = 0;
    }

    const detailModal = document.getElementById('detail-modal');
    if (detailModal) {
        detailModal.style.display = 'flex';
        syncBodyScrollLock();
    }
}
window.openDetailModal = openDetailModal;

function triggerBottleAnimation(callback) {
    const bottle = document.createElement('div');
    bottle.innerHTML = '🍾';
    bottle.style.cssText = 'position:fixed; bottom:15%; left:-100px; font-size:60px; z-index:9999999999 !important; pointer-events:none; transition: all 2.5s cubic-bezier(0.42, 0, 0.58, 1); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));';
    document.body.appendChild(bottle);
    setTimeout(() => {
        bottle.style.left = '120%';
        bottle.style.transform = 'rotate(720deg) translateY(-80px)';
    }, 50);
    setTimeout(() => {
        bottle.remove();
        if (callback) callback();
    }, 2500);
}

function savePost() {
    if (!isAdmin || !database || isSubmitting) return;
    const title = document.getElementById('post-title')?.value.trim();
    const content = document.getElementById('post-content')?.value.trim();
    if (!title || !content) { showSystemAlert('내용을 모두 입력해주세요.'); return; }
    if (!navigator.onLine) { showSystemAlert('인터넷이 끊겨 글을 기록할 수 없습니다.'); return; }

    const now = new Date();
    const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    isSubmitting = true;
    const postData = { title: title, content: content, date: date, author: loggedInUser };
    const targetNode = currentView === 'horizons' ? 'horizons' : 'posts';

    if (editTargetKey) {
        database.ref(targetNode + '/' + editTargetKey).update(postData).then(() => {
            showSystemAlert('기록이 수정되었습니다.');
            clearDraftCacheStorage('post');
            cancelEdit();
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; });
    } else {
        database.ref(targetNode).push(postData).then(() => {
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
            clearDraftCacheStorage('post');
            currentPage = 1;
            showSystemAlert(currentView === 'horizons' ? '수평선 너머에 은밀히 새겨졌습니다.' : '성공적으로 새겨졌습니다.');
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; });
    }
}
window.savePost = savePost;

function saveLetter() {
    if (!database || isSubmitting || isRestMode) return;

    const nowTime = Date.now();
    const lastSubmitTime = Number(localStorage.getItem('last_letter_submit_time') || 0);
    if (!isAdmin && nowTime - lastSubmitTime < 30000) {
        showSystemAlert('띄워진 편지가 수평선에 닿을 때까지 잠시 기다려주세요. (30초 후 다시 띄울 수 있습니다.)');
        return;
    }

    const title = document.getElementById('letter-title')?.value.trim();
    const content = document.getElementById('letter-content')?.value.trim();
    if (!title || !content) { showSystemAlert('제목과 내용을 모두 채워주세요.'); return; }
    if (!navigator.onLine) { showSystemAlert('인터넷이 끊겨 편지를 띄울 수 없습니다.'); return; }
    if (document.getElementById('agree-terms') && !document.getElementById('agree-terms').checked) {
        showSystemAlert('안내 및 약관에 동의해주세요.');
        return;
    }

    if (title.length > 100 || content.length > 5000) {
        showSystemAlert('편지의 내용이 너무 깁니다. 마음을 조금만 줄여서 적어주세요. 제목 100자 이하, 본문 5000자 이하여야 합니다.');
        return;
    }

    const now = new Date();
    const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    isSubmitting = true;

    const letterData = { title: title, content: content, date: date, author: isAdmin ? loggedInUser : '방문자', read: false };

    triggerBottleAnimation(() => {
        database.ref('letters').push(letterData).then(() => {
            if (!isAdmin) localStorage.setItem('last_letter_submit_time', Date.now().toString());

            document.getElementById('letter-title').value = '';
            document.getElementById('letter-content').value = '';
            if (document.getElementById('agree-terms')) document.getElementById('agree-terms').checked = false;
            clearDraftCacheStorage('letter');
            showSystemAlert('편지가 바다 위로 안전하게 띄워졌습니다.');
            currentPage = 1;
            renderUI();

            if (isAdmin) {
                setTimeout(() => window.executeCloudBackupEngine(true), 800);
            }
        }).finally(() => { isSubmitting = false; });
    });
}
window.saveLetter = saveLetter;

function prepareEdit(key) {
    let targetArray = currentView === 'horizons' ? allHorizons : allPosts;
    const post = targetArray.find(p => p.id === key);
    if (!post) return;
    editTargetKey = key;

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
        if (editTargetKey === key) cancelEdit();
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
    showSystemConfirm('🚨 모든 기록과 편지들이 사라집니다. 초기화할까요?', function() {
        setTimeout(function() {
            showSystemConfirm('정말 소멸시킬까요?', function() {
                Promise.all([
                    database.ref('posts').remove(),
                    database.ref('horizons').remove(),
                    database.ref('letters').remove()
                ]).then(() => {
                    cancelEdit();
                    currentPage = 1;
                    showSystemAlert('초기 상태가 되었습니다.');
                    backupTriggerQueued = true;
                });
            });
        }, 150);
    });
}
window.clearDatabase = clearDatabase;

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.addEventListener('offline', () => { showSystemAlert('수평선 너머와의 연결이 끊어졌습니다. 네트워크를 확인해 주세요.'); });
window.addEventListener('online', () => { showSystemAlert('다시 수평선 너머로 연결되었습니다.'); });

function highlightSearchKeyword(text, keyword) {
    const escaped = escapeHtml(text);
    if (!keyword) return escaped;
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return escaped.replace(regex, match => `<span style="background: rgba(144, 224, 239, 0.25); color: #fff; box-shadow: 0 0 8px rgba(144, 224, 239, 0.6); border-radius: 3px; padding: 0 3px;">${match}</span>`);
}
window.highlightSearchKeyword = highlightSearchKeyword;

function applyTimeBasedThemeEngine() {
    const hour = new Date().getHours();
    let bgStyle = "";
    let themeText = "";
    let mode = window.manualTimeOverride || 'auto';

    if (mode === 'auto') {
        if (hour >= 6 && hour < 12) mode = 'morning';
        else if (hour >= 12 && hour < 18) mode = 'day';
        else if (hour >= 18 && hour < 20) mode = 'evening';
        else mode = 'night';
    }

    if (mode === 'morning') {
        bgStyle = "linear-gradient(135deg, #061121 0%, #153b50 50%, #00b4d8 100%)";
        themeText = "🌅 아침의 바다";
    } else if (mode === 'day') {
        bgStyle = "linear-gradient(135deg, #000428 0%, #004e92 60%, #90e0ef 100%)";
        themeText = "☀️ 낮의 바다";
    } else if (mode === 'evening') {
        bgStyle = "linear-gradient(135deg, #0b0f19 0%, #4a192c 50%, #f7a37f 100%)";
        themeText = "🌇 저녁의 바다";
    } else {
        bgStyle = "linear-gradient(135deg, #02050d 0%, #09132b 60%, #1e1b4b 100%)";
        themeText = "🌌 밤의 바다";
    }

    document.documentElement.style.setProperty('background-color', '#02050d', 'important');
    document.body.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background-image', 'none', 'important');

    let oceanBg = document.getElementById('ocean-bg-layer');
    if (!oceanBg && document.body) {
        oceanBg = document.createElement('div');
        oceanBg.id = 'ocean-bg-layer';
        oceanBg.style.cssText = "position:fixed; top:-10vh; left:-10vw; width:120vw; height:120vh; z-index:-999; pointer-events:none; transition:background 1.5s ease-in-out;";
        document.body.insertBefore(oceanBg, document.body.firstChild);
    }
    if (oceanBg) oceanBg.style.background = bgStyle;

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
    if (!wElem && document.body) {
        wElem = document.createElement('div');
        wElem.id = 'weather-widget';
        document.body.appendChild(wElem);
    }

    if (cachedData && cachedTime && (now - parseInt(cachedTime, 10) < 15 * 60 * 1000)) {
        try {
            renderWeatherHTML(JSON.parse(cachedData));
        } catch (e) {
            if (wElem) wElem.innerText = "⏳ 바다 읽는 중...";
        }
    } else if (wElem) {
        wElem.innerText = "⏳ 바다 읽는 중...";
    }
}

function renderWeatherHTML(data) {
    if (!data || !data.current_weather) return;
    const code = data.current_weather.weathercode;
    let icon = '☁️';
    if (code === 0) icon = '☀️';
    else if (code > 0 && code <= 3) icon = '⛅';
    else if (code >= 51 && code <= 67) icon = '🌧️';
    else if (code >= 71 && code <= 77) icon = '❄️';

    let wElem = document.getElementById('weather-widget');
    if (!wElem && document.body) {
        wElem = document.createElement('div');
        wElem.id = 'weather-widget';
        document.body.appendChild(wElem);
    }
    if (wElem) wElem.innerHTML = `${icon} ${Math.round(data.current_weather.temperature)}°C`;
}

function syncWeatherAndWidget() {
    let wElem = document.getElementById('weather-widget');
    if (!wElem && document.body) {
        wElem = document.createElement('div');
        wElem.id = 'weather-widget';
        document.body.appendChild(wElem);
    }

    if (window.manualWeatherOverride && window.manualWeatherOverride !== 'auto') {
        applyManualWeatherEffect(window.manualWeatherOverride);
        return;
    }

    const defaultLat = 35.1796;
    const defaultLon = 129.0756;

    function fetchWeatherData(lat, lon) {
        const timeStamp = new Date().getTime();
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&_=${timeStamp}`;

        fetch(apiUrl, { cache: "no-store" })
            .then(res => res.json())
            .then(data => {
                localStorage.setItem('weather_cache_payload_v4', JSON.stringify(data));
                localStorage.setItem('weather_cache_timestamp_v4', String(Date.now()));

                if (window.manualWeatherOverride && window.manualWeatherOverride !== 'auto') return;

                renderWeatherHTML(data);

                const code = data.current_weather.weathercode;
                let weatherType = 'clear';
                if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) weatherType = 'rain';
                else if ((code >= 71 && code <= 77) || code === 85 || code === 86) weatherType = 'snow';

                applyManualWeatherEffect(weatherType);
            })
            .catch(() => {
                if (wElem && (!window.manualWeatherOverride || window.manualWeatherOverride === 'auto')) {
                    wElem.innerText = "☁️ 21°C";
                }
                applyManualWeatherEffect('clear');
            });
    }

    if (!navigator.geolocation) {
        fetchWeatherData(defaultLat, defaultLon);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherData(position.coords.latitude, position.coords.longitude),
        () => fetchWeatherData(defaultLat, defaultLon),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
}

function applyManualWeatherEffect(type) {
    let overlay = document.getElementById('weather-overlay-layer');
    if (!overlay && document.body) {
        overlay = document.createElement('div');
        overlay.id = 'weather-overlay-layer';
        document.body.insertBefore(overlay, document.body.firstChild);
    }
    const wElem = document.getElementById('weather-widget');
    if (type === 'rain') {
        if (overlay) overlay.className = 'weather-overlay rain';
        if (window.manualWeatherOverride !== 'auto' && wElem) wElem.innerText = "🌧️ 비 내리는 바다";
    } else if (type === 'snow') {
        if (overlay) overlay.className = 'weather-overlay snow';
        if (window.manualWeatherOverride !== 'auto' && wElem) wElem.innerText = "❄️ 눈 내리는 바다";
    } else if (type === 'clear') {
        if (overlay) overlay.className = 'weather-overlay';
        if (window.manualWeatherOverride !== 'auto' && wElem) wElem.innerText = "☀️ 평온한 바다";
    } else {
        if (overlay) overlay.className = 'weather-overlay';
    }
}

setInterval(() => { applyTimeBasedThemeEngine(); }, 60000);

window.injectTimeGearButton = function() {
    if (document.getElementById('time-gear-btn')) return;
    const btn = document.createElement('div');
    btn.id = 'time-gear-btn';
    btn.innerHTML = '⚙️';
    btn.title = "환경 설정 (시간/날씨 수동 조작)";
    btn.onclick = openEnvironmentSettingsModal;
    document.body.appendChild(btn);
};

window.closeEnvironmentSettingsModal = function() {
    const modal = document.getElementById('env-modal');
    if (modal) modal.style.display = 'none';
    syncBodyScrollLock();
};

window.openEnvironmentSettingsModal = function() {
    let modal = document.getElementById('env-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'env-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()" style="width: 90%; max-width:360px; padding:35px; background:linear-gradient(145deg, #0a1b36, #040d1c); border:1px solid rgba(0, 180, 216, 0.3); border-radius:18px; box-shadow:0 20px 50px rgba(0,0,0,0.7); text-align:center;">
                <h3 style="margin-bottom:25px; font-size:1.3rem; color:#fff; display:flex; align-items:center; justify-content:center;">
                    <span style="background:transparent !important; -webkit-background-clip:padding-box !important; -webkit-text-fill-color:#e2e8f0 !important; color:#e2e8f0 !important; text-shadow:none !important; display:inline-block; font-family:'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif !important; margin-right:8px; font-weight:normal !important;">⚙️</span>
                    <span style="background:linear-gradient(135deg, #a9efff, #90e0ef); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; font-weight: bold;">서재 환경 조작</span>
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
                    <button onclick="window.applyEnvironmentSettings()" style="flex:1; padding:14px; border-radius:12px; background:linear-gradient(135deg, #00b4d8, #0077b6); color:#fff; border:none; cursor:pointer; font-weight:bold; font-size:1rem; box-shadow:0 4px 15px rgba(0, 180, 216, 0.3);">설정 적용</button>
                    <button onclick="window.closeEnvironmentSettingsModal()" style="flex:1; padding:14px; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#cbd5e1; border-radius:12px; cursor:pointer; font-size:1rem;">닫기</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('time-select').value = window.manualTimeOverride || 'auto';
    document.getElementById('weather-select').value = window.manualWeatherOverride || 'auto';
    modal.style.display = 'flex';
    syncBodyScrollLock();
};

window.applyEnvironmentSettings = function() {
    window.manualTimeOverride = document.getElementById('time-select').value;
    window.manualWeatherOverride = document.getElementById('weather-select').value;

    localStorage.setItem('env_time_override', window.manualTimeOverride);
    localStorage.setItem('env_weather_override', window.manualWeatherOverride);

    applyTimeBasedThemeEngine();
    let wElem = document.getElementById('weather-widget');
    if (window.manualWeatherOverride === 'auto' && wElem) {
        wElem.innerText = "⏳ 바다 읽는 중...";
    }
    syncWeatherAndWidget();
    window.closeEnvironmentSettingsModal();
};

// 수면 파문 효과
document.addEventListener('pointerdown', function(e) {
    if (!e.isPrimary) return;
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 800);
}, { passive: true, capture: true });

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
// 🌊 상단 이동(파도) 버튼 및 스크롤 성능 최적화
// ==========================================
function initTopScrollButton() {
    if (document.getElementById('ocean-top-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'ocean-top-btn';
    btn.innerHTML = '🌊';
    btn.title = '수면 위로 올라가기';
    document.body.appendChild(btn);

    let ticking = false;
    let scrollTimeout;

    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('is-scrolling')) {
            document.body.classList.add('is-scrolling');
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            document.body.classList.remove('is-scrolling');
        }, 100);

        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
                btn.classList.toggle('show', scrollPos > 120);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    btn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// ==========================================
// 🐚 개발자 도구 콘솔 이스터에그
// ==========================================
setTimeout(() => {
    console.clear();
    console.log(
        "%c🌊 수평선 너머의 서재 그 뒷면에 닿으신 것을 환영합니다.\n\n%c굳게 닫힌 문을 열고 이곳(Console)까지 찾아오시다니, 바다를 탐험하는 항해사 같으시네요.\n이곳의 코드와 기록들은 눈과 마음으로만 봐주시고, 혹여나 코드를 원하신다면 [ https://github.com/alyagsosiji/writing ] 을 참고해주세요.\n\n- 서재의 기록자이자 마리존 사이트의 주인 아시 올림",
        "color: #90e0ef; font-size: 18px; font-weight: bold; font-family: sans-serif; text-shadow: 0 0 10px rgba(144,224,239,0.5);",
        "color: #cbd5e1; font-size: 13px; line-height: 1.8; font-family: sans-serif;"
    );
}, 2000);
