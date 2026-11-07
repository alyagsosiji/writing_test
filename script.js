// ==========================================
// 🌊 수평선 너머의 서재 (Marizon) — 통합 스크립트 (오류 수정 + 신규 보완 기능 완비)
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

let bgmVolume = parseFloat(localStorage.getItem('marizon_bgm_volume') || '0.65');
let asmrVolume = parseFloat(localStorage.getItem('marizon_asmr_volume') || '0.55');
audioEngine.volume = bgmVolume;
asmrEngine.volume = asmrVolume;

window.manualTimeOverride = localStorage.getItem('env_time_override') || 'auto';
window.manualWeatherOverride = localStorage.getItem('env_weather_override') || 'auto';

let currentDisplayMode = localStorage.getItem('env_display_mode') || 'list';
let readerFontSize = localStorage.getItem('marizon_reader_font_size') || 'md';
let bookmarkedIds = new Set(JSON.parse(localStorage.getItem('marizon_bookmarks') || '[]'));
let onlyBookmarkedFilter = false;
let currentDetailKey = null;

let isRestMode = false;
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

// ✍️ 실시간 글자 수 카운터 및 임시저장 상태 표시 엔진
function updateCharCounter(type) {
    if (type === 'post') {
        const content = document.getElementById('post-content')?.value || '';
        const title = document.getElementById('post-title')?.value || '';
        const counter = document.getElementById('post-char-counter');
        const clearBtn = document.getElementById('clear-post-draft-btn');
        if (counter) {
            const withSpaces = content.length;
            const noSpaces = content.replace(/\s+/g, '').length;
            counter.innerText = `공백 포함 ${withSpaces.toLocaleString()}자 · 공백 제외 ${noSpaces.toLocaleString()}자`;
        }
        if (clearBtn) {
            clearBtn.style.display = (!editTargetKey && (title || content)) ? 'inline-block' : 'none';
        }
    } else if (type === 'letter') {
        const content = document.getElementById('letter-content')?.value || '';
        const counter = document.getElementById('letter-char-counter');
        if (counter) {
            const withSpaces = content.length;
            const noSpaces = content.replace(/\s+/g, '').length;
            counter.innerText = `공백 포함 ${withSpaces.toLocaleString()} / 5,000자 · 공백 제외 ${noSpaces.toLocaleString()}자`;
        }
    }
}

function initDraftAutoSaveEngine() {
    const targetFields = ['post-title', 'post-content', 'letter-title', 'letter-content'];
    targetFields.forEach(id => {
        const field = document.getElementById(id);
        if (!field) return;
        const savedDraft = localStorage.getItem('draft_' + id);
        if (savedDraft) field.value = savedDraft;
        field.addEventListener('input', () => {
            const isPostField = id.startsWith('post-');
            if (isPostField && editTargetKey) {
                updateCharCounter('post');
                return;
            }
            localStorage.setItem('draft_' + id, field.value);
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const statusElem = document.getElementById(isPostField ? 'post-draft-status' : 'letter-draft-status');
            if (statusElem) statusElem.innerText = `✓ 임시저장됨 (${timeStr})`;
            updateCharCounter(isPostField ? 'post' : 'letter');
        });
    });
    updateCharCounter('post');
    updateCharCounter('letter');
}

function clearDraftCacheStorage(type) {
    if (type === 'post') {
        localStorage.removeItem('draft_post-title');
        localStorage.removeItem('draft_post-content');
        const st = document.getElementById('post-draft-status');
        if (st) st.innerText = '';
        updateCharCounter('post');
    } else if (type === 'letter') {
        localStorage.removeItem('draft_letter-title');
        localStorage.removeItem('draft_letter-content');
        const st = document.getElementById('letter-draft-status');
        if (st) st.innerText = '';
        updateCharCounter('letter');
    }
}

window.clearDraftManual = function(type) {
    if (type === 'post') {
        if (document.getElementById('post-title')) document.getElementById('post-title').value = '';
        if (document.getElementById('post-content')) document.getElementById('post-content').value = '';
        clearDraftCacheStorage('post');
    }
};

// 🎵 소리 설정 모달 (개별 볼륨 슬라이더 추가)
function openSoundModal() {
    let modal = document.getElementById('sound-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sound-modal';
        modal.className = 'modal';
        modal.onclick = () => { modal.style.display = 'none'; };
        modal.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width:350px;">
                <h3 style="color:#fff; margin-bottom:20px; font-size:1.15rem;">🎵 서재의 소리 설정</h3>
                <div style="margin-bottom:16px; background:rgba(255,255,255,0.04); padding:16px; border-radius:12px; text-align:left; border:1px solid rgba(255,255,255,0.08);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="color:#bae6fd; font-size:0.85rem; font-weight:bold;">🎵 배경 음악 (BGM)</span>
                        <button id="btn-music-toggle" onclick="window.togglePlayPause()" style="padding:6px 14px; border-radius:8px; background:#0284c7; color:#fff; border:none; cursor:pointer; font-weight:bold; font-size:0.8rem;">${isTrackPlaying ? '일시정지' : '음악 재생'}</button>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="range" id="bgm-vol-slider" min="0" max="1" step="0.01" value="${bgmVolume}" oninput="window.setBgmVolume(this.value)" style="flex:1; accent-color:#38bdf8; cursor:pointer;">
                        <span id="bgm-vol-label" style="font-size:0.78rem; color:#cbd5e1; width:38px; text-align:right;">${Math.round(bgmVolume * 100)}%</span>
                    </div>
                </div>
                <div style="margin-bottom:22px; background:rgba(255,255,255,0.04); padding:16px; border-radius:12px; text-align:left; border:1px solid rgba(255,255,255,0.08);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <span style="color:#a7f3d0; font-size:0.85rem; font-weight:bold;">🌊 파도 소리 (ASMR)</span>
                        <button id="btn-asmr-toggle" onclick="window.toggleAsmr()" style="padding:6px 14px; border-radius:8px; background:#059669; color:#fff; border:none; cursor:pointer; font-weight:bold; font-size:0.8rem;">${isAsmrPlaying ? '파도 끄기' : '파도 켜기'}</button>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="range" id="asmr-vol-slider" min="0" max="1" step="0.01" value="${asmrVolume}" oninput="window.setAsmrVolume(this.value)" style="flex:1; accent-color:#34d399; cursor:pointer;">
                        <span id="asmr-vol-label" style="font-size:0.78rem; color:#cbd5e1; width:38px; text-align:right;">${Math.round(asmrVolume * 100)}%</span>
                    </div>
                </div>
                <button onclick="document.getElementById('sound-modal').style.display='none'" class="cancel-btn" style="width:100%; border-radius:10px;">닫기</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const mBtn = document.getElementById('btn-music-toggle'); if (mBtn) mBtn.innerText = isTrackPlaying ? '일시정지' : '음악 재생';
        const aBtn = document.getElementById('btn-asmr-toggle'); if (aBtn) aBtn.innerText = isAsmrPlaying ? '파도 끄기' : '파도 켜기';
    }
    modal.style.display = 'flex';
}
window.openSoundModal = openSoundModal;

window.setBgmVolume = function(val) {
    bgmVolume = parseFloat(val);
    audioEngine.volume = bgmVolume;
    localStorage.setItem('marizon_bgm_volume', String(bgmVolume));
    const lbl = document.getElementById('bgm-vol-label');
    if (lbl) lbl.innerText = Math.round(bgmVolume * 100) + '%';
};

window.setAsmrVolume = function(val) {
    asmrVolume = parseFloat(val);
    asmrEngine.volume = asmrVolume;
    localStorage.setItem('marizon_asmr_volume', String(asmrVolume));
    const lbl = document.getElementById('asmr-vol-label');
    if (lbl) lbl.innerText = Math.round(asmrVolume * 100) + '%';
};

function toggleAsmr() {
    const btn = document.getElementById('btn-asmr-toggle');
    if (isAsmrPlaying) {
        asmrEngine.pause(); isAsmrPlaying = false;
        if (btn) btn.innerText = '파도 켜기';
    } else {
        asmrEngine.volume = asmrVolume;
        asmrEngine.play().catch(() => {}); isAsmrPlaying = true;
        if (btn) btn.innerText = '파도 끄기';
    }
}
window.toggleAsmr = toggleAsmr;

function initMusicPlayerEngine() {
    if (MY_MUSIC_LIST.length === 0) return;
    const playerTrigger = document.getElementById('mini-audio-trigger');
    audioEngine.src = MY_MUSIC_LIST[currentTrackIndex].src;
    if (playerTrigger) playerTrigger.addEventListener('click', openSoundModal);
    audioEngine.addEventListener('ended', () => {
        currentTrackIndex = (currentTrackIndex + 1) % MY_MUSIC_LIST.length;
        audioEngine.src = MY_MUSIC_LIST[currentTrackIndex].src;
        audioEngine.play().then(() => { if (playerTrigger) playerTrigger.classList.add('playing'); }).catch(() => { isTrackPlaying = false; if (playerTrigger) playerTrigger.classList.remove('playing'); });
    });
}

function togglePlayPause() {
    const playerTrigger = document.getElementById('mini-audio-trigger');
    const btn = document.getElementById('btn-music-toggle');
    if (isTrackPlaying) {
        audioEngine.pause(); isTrackPlaying = false;
        if (playerTrigger) playerTrigger.classList.remove('playing');
        if (btn) btn.innerText = '음악 재생';
    } else {
        audioEngine.volume = bgmVolume;
        audioEngine.play().then(() => {
            isTrackPlaying = true;
            if (playerTrigger) playerTrigger.classList.add('playing');
            if (btn) btn.innerText = '일시정지';
        }).catch(() => {});
    }
}
window.togglePlayPause = togglePlayPause;

// 🔖 책갈피(북마크) 시스템
function saveBookmarksToStorage() {
    localStorage.setItem('marizon_bookmarks', JSON.stringify(Array.from(bookmarkedIds)));
}

window.toggleBookmark = function(id, event) {
    if (event) event.stopPropagation();
    if (bookmarkedIds.has(id)) bookmarkedIds.delete(id);
    else bookmarkedIds.add(id);
    saveBookmarksToStorage();
    renderUI();
    updateDetailBookmarkUI();
};

window.toggleCurrentDetailBookmark = function() {
    if (!currentDetailKey) return;
    window.toggleBookmark(currentDetailKey);
};

window.toggleBookmarkFilter = function() {
    onlyBookmarkedFilter = !onlyBookmarkedFilter;
    currentPage = 1;
    const btn = document.getElementById('bookmark-filter-btn');
    if (btn) btn.classList.toggle('active', onlyBookmarkedFilter);
    renderUI();
};

function updateDetailBookmarkUI() {
    const btn = document.getElementById('detail-bookmark-btn');
    if (!btn || !currentDetailKey) return;
    const isMarked = bookmarkedIds.has(currentDetailKey);
    btn.classList.toggle('active', isMarked);
    btn.innerText = isMarked ? '🔖 책갈피됨' : '🔖 책갈피';
}

// 독서 모달 글자 크기 조절
window.setReaderFontSize = function(size) {
    readerFontSize = size;
    localStorage.setItem('marizon_reader_font_size', size);
    const textElem = document.getElementById('detail-text');
    if (textElem) {
        textElem.className = 'reader-font-' + size;
    }
    document.querySelectorAll('.font-size-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-size') === size);
    });
};

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
    const m = document.getElementById('library-modal');
    if (m) { m.style.display = 'flex'; document.body.classList.add('no-scroll'); }
};
window.closeLibraryModal = function() {
    const m = document.getElementById('library-modal');
    if (m) { m.style.display = 'none'; document.body.classList.remove('no-scroll'); }
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
        if (firebase.appCheck && window.location.hostname.includes('marizon.live')) {
            const appCheck = firebase.appCheck();
            appCheck.activate('6LeF0yctAAAAAD-CVI-X1HI3qIi9n_ySlFces9ag', true);
        }
    }
} catch (error) {
    console.error("Firebase 초기화 에러:", error);
}

function requestNotificationPermission() {
    if (!("Notification" in window) || !database) return;
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted' && firebase.messaging) {
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
                            database.ref(tokenPath).set(currentToken).then(() => localStorage.setItem(cacheKey, tokenPath));
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
    const lastNotiTime = localStorage.getItem('last_noti_time') || 0;
    const lastNotiBody = localStorage.getItem('last_noti_body') || '';
    if (now - lastNotiTime < 5000 && lastNotiBody === body) return;
    localStorage.setItem('last_noti_time', now.toString());
    localStorage.setItem('last_noti_body', body);
    const options = { body, icon: NOTIFICATION_CONFIG.icon, badge: NOTIFICATION_CONFIG.badge, vibrate: NOTIFICATION_CONFIG.vibrate, tag: 'library-notification' };
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options)).catch(() => new Notification(title, options));
    } else {
        new Notification(title, options);
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
if (document.readyState === 'complete' || document.readyState === 'interactive') hideLoadingScreen();
else document.addEventListener('DOMContentLoaded', hideLoadingScreen);

window.setDisplayMode = function(mode) {
    currentDisplayMode = mode;
    currentPage = 1;
    localStorage.setItem('env_display_mode', mode);
    if (window.infiniteObserver) { window.infiniteObserver.disconnect(); window.infiniteObserver = null; }
    renderUI();
};

function formatTo24Hour(dateStr) {
    if (!dateStr) return '';
    let str = String(dateStr).trim().replace(/\b24(?=:\d{2})/g, '00');
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

function parseCustomDate(dateStr) {
    if (!dateStr) return 0;
    const cleaned = String(dateStr).replace(/\s+/g, '');
    const parts = cleaned.split('.');
    if (parts.length < 4) return 0;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const timeParts = parts[3].split(':');
    return new Date(year, month, day, parseInt(timeParts[0], 10) || 0, parseInt(timeParts[1], 10) || 0, parseInt(timeParts[2], 10) || 0).getTime();
}

function escapeHtml(text) {
    return String(text || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function highlightSearchKeyword(text, keyword) {
    const escaped = escapeHtml(text);
    if (!keyword) return escaped;
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return escaped.replace(regex, match => `<span style="background: rgba(144, 224, 239, 0.28); color: #fff; border-radius: 3px; padding: 0 3px;">${match}</span>`);
}

function showSystemAlert(message, callback) {
    const modalElem = document.getElementById('system-modal');
    if (document.getElementById('system-title')) document.getElementById('system-title').innerText = "안내";
    if (document.getElementById('system-message')) document.getElementById('system-message').innerText = message;
    const btns = document.getElementById('system-buttons');
    if (btns) {
        btns.innerHTML = "";
        const okBtn = document.createElement('button'); okBtn.innerText = "확인";
        okBtn.onclick = function() { if (modalElem) modalElem.style.display = 'none'; if (callback) callback(); };
        btns.appendChild(okBtn);
    }
    if (modalElem) modalElem.style.display = 'flex';
}

function showSystemConfirm(message, onConfirm, onCancel) {
    const modalElem = document.getElementById('system-modal');
    if (document.getElementById('system-title')) document.getElementById('system-title').innerText = "확인";
    if (document.getElementById('system-message')) document.getElementById('system-message').innerText = message;
    const btns = document.getElementById('system-buttons');
    if (btns) {
        btns.innerHTML = "";
        const confirmBtn = document.createElement('button'); confirmBtn.innerText = "확인";
        confirmBtn.onclick = function() { if (modalElem) modalElem.style.display = 'none'; if (onConfirm) onConfirm(); };
        const cancelBtn = document.createElement('button'); cancelBtn.innerText = "취소"; cancelBtn.className = "cancel-btn";
        cancelBtn.onclick = function() { if (modalElem) modalElem.style.display = 'none'; if (onCancel) onCancel(); };
        btns.appendChild(confirmBtn); btns.appendChild(cancelBtn);
    }
    if (modalElem) modalElem.style.display = 'flex';
}

function openModal() { if (document.getElementById('login-modal')) document.getElementById('login-modal').style.display = 'flex'; }
function closeModal() { if (document.getElementById('login-modal')) document.getElementById('login-modal').style.display = 'none'; }
function closeDetailModal() {
    currentDetailKey = null;
    if (document.getElementById('detail-modal')) {
        document.getElementById('detail-modal').style.display = 'none';
        document.body.classList.remove('no-scroll');
    }
}
window.openModal = openModal; window.closeModal = closeModal; window.closeDetailModal = closeDetailModal;
window.openDonationModal = function() { if (document.getElementById('donation-modal')) document.getElementById('donation-modal').style.display = 'flex'; };
window.closeDonationModal = function() { if (document.getElementById('donation-modal')) document.getElementById('donation-modal').style.display = 'none'; };

// 🔐 2차 인증 및 로그인
let currentPin = '';
let pendingUser = null;
const ENCRYPTED_PIN_HASH = 'MjYwNDE2';

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            if (sessionStorage.getItem('pinAuthenticated') === 'true') {
                finalizeLogin(user, true);
            } else {
                pendingUser = user;
                currentPin = '';
                if (document.getElementById('pin-display')) document.getElementById('pin-display').innerText = '';
                if (document.getElementById('pin-modal')) document.getElementById('pin-modal').style.display = 'flex';
            }
        } else {
            isAdmin = false; loggedInUser = '';
            localStorage.removeItem('isAdminLoggedIn'); localStorage.removeItem('loggedInUser');
            sessionStorage.removeItem('pinAuthenticated');
            updateUI();
        }
    });
}

function finalizeLogin(user, silent) {
    sessionStorage.setItem('pinAuthenticated', 'true');
    isAdmin = true;
    if (user.email === 'alyagsosiji@gmail.com') loggedInUser = '아시';
    else if (user.email === 'haeunchan0114@naver.com') loggedInUser = '하은';
    else loggedInUser = '기록자';
    localStorage.setItem('isAdminLoggedIn', 'true');
    localStorage.setItem('loggedInUser', loggedInUser);
    if (!silent) showSystemAlert(`환영합니다, 수평선 너머 바다의 기록자, ${loggedInUser}님.`);
    requestNotificationPermission();
    listenPosts(); listenHorizons(); listenLetters();
    updateUI();
}

window.inputPin = function(num) {
    if (currentPin.length < 6) currentPin += num;
    if (document.getElementById('pin-display')) document.getElementById('pin-display').innerText = '●'.repeat(currentPin.length);
};
window.clearPin = function() {
    currentPin = '';
    if (document.getElementById('pin-display')) document.getElementById('pin-display').innerText = '';
};
window.submitPin = function() {
    if (btoa(currentPin) === ENCRYPTED_PIN_HASH) {
        if (document.getElementById('pin-modal')) document.getElementById('pin-modal').style.display = 'none';
        finalizeLogin(pendingUser, false);
    } else {
        showSystemAlert('올바른 접근이 아닙니다.');
        if (firebase.auth) firebase.auth().signOut();
        if (document.getElementById('pin-modal')) document.getElementById('pin-modal').style.display = 'none';
        window.clearPin();
    }
};

window.login = function() {
    const idElem = document.getElementById('admin-id');
    const pwElem = document.getElementById('admin-pw');
    const inputId = idElem ? idElem.value.trim() : '';
    const inputPw = pwElem ? pwElem.value.trim() : '';
    if (!inputId || !inputPw) return showSystemAlert('서재의 열쇠를 모두 입력해주세요.');
    let targetEmail = inputId;
    if (inputId === '아시') targetEmail = 'alyagsosiji@gmail.com';
    else if (inputId === '하은') targetEmail = 'haeunchan0114@naver.com';
    firebase.auth().signInWithEmailAndPassword(targetEmail, inputPw)
        .then(() => { closeModal(); if (idElem) idElem.value = ''; if (pwElem) pwElem.value = ''; })
        .catch(() => showSystemAlert('서재의 열쇠가 맞지 않습니다.'));
};

window.logout = function() {
    firebase.auth().signOut().then(() => { cancelEdit(); showSystemAlert('로그아웃 되었습니다.'); });
};

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
        if (writeSection) writeSection.style.display = currentView === 'letters' ? 'none' : 'block';
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
        if (letterSubmitBtn) { letterSubmitBtn.disabled = true; letterSubmitBtn.innerText = '바다가 쉬어가는 중입니다'; letterSubmitBtn.style.opacity = '0.5'; }
        if (letterContent) { letterContent.disabled = true; letterContent.placeholder = '현재 수평선 너머로 편지를 띄울 수 없습니다. 바다가 고요히 쉬고 있습니다.'; }
    } else {
        if (letterSubmitBtn) { letterSubmitBtn.disabled = false; letterSubmitBtn.innerText = '편지 띄우기'; letterSubmitBtn.style.opacity = '1'; }
        if (letterContent) { letterContent.disabled = false; letterContent.placeholder = '기록자 분들에게 띄워 보낼 편지의 내용을 입력해주세요.'; }
    }
}

function switchView(view) {
    if (!isAdmin && (view === 'letters' || view === 'horizons')) { currentView = 'posts'; return; }
    currentView = view; currentPage = 1;
    const tabPosts = document.getElementById('tab-posts');
    const tabHorizons = document.getElementById('tab-horizons');
    const tabLetters = document.getElementById('tab-letters');
    const mainTitle = document.getElementById('section-main-title');
    const writeTitle = document.getElementById('write-title');
    const submitPostBtn = document.getElementById('submit-post-btn');
    const writeSection = document.getElementById('write-section');

    if (tabPosts) tabPosts.classList.remove('active');
    if (tabHorizons) tabHorizons.classList.remove('active');
    if (tabLetters) tabLetters.classList.remove('active');

    if (view === 'posts') {
        if (tabPosts) tabPosts.classList.add('active');
        if (mainTitle) mainTitle.innerText = "기록된 바다";
        if (writeSection && isAdmin) writeSection.style.display = 'block';
        if (writeTitle && !editTargetKey) writeTitle.innerText = "새로운 기록 남기기";
        if (submitPostBtn && !editTargetKey) submitPostBtn.innerText = "기록하기";
    } else if (view === 'horizons') {
        if (tabHorizons) tabHorizons.classList.add('active');
        if (mainTitle) mainTitle.innerText = "수평선 너머";
        if (writeSection && isAdmin) writeSection.style.display = 'block';
        if (writeTitle && !editTargetKey) writeTitle.innerText = "수평선 너머에 비밀 기록하기";
        if (submitPostBtn && !editTargetKey) submitPostBtn.innerText = "비밀 기록하기";
    } else {
        if (tabLetters) tabLetters.classList.add('active');
        if (mainTitle) mainTitle.innerText = "띄워진 편지";
        if (writeSection) writeSection.style.display = 'none';
    }
    renderUI();
}
window.switchView = switchView;

window.handleSearch = function() {
    searchKeyword = document.getElementById('search-input') ? document.getElementById('search-input').value.trim() : '';
    searchAuthor = document.getElementById('author-filter') ? document.getElementById('author-filter').value : 'all';
    currentPage = 1;
    renderUI();
};

function getFilteredArray() {
    let targetArray = currentView === 'posts' ? allPosts : (currentView === 'horizons' ? allHorizons : allLetters);
    if ((currentView === 'posts' || currentView === 'horizons') && searchAuthor !== 'all') {
        targetArray = targetArray.filter(item => {
            const author = item.author || "기록자";
            return searchAuthor === "하은" ? author.includes("하은") : !author.includes("하은");
        });
    }
    if ((currentView === 'posts' || currentView === 'horizons') && onlyBookmarkedFilter) {
        targetArray = targetArray.filter(item => bookmarkedIds.has(item.id));
    }
    if (searchKeyword) {
        const kw = searchKeyword.toLowerCase();
        targetArray = targetArray.filter(item => String(item.title || '').toLowerCase().includes(kw) || String(item.content || '').toLowerCase().includes(kw));
    }
    return targetArray;
}

let rawPostsSnapshot = null, rawHorizonsSnapshot = null, rawLettersSnapshot = null;
let isInitialPostLoad = true, knownPostIds = new Set();
let isInitialHorizonLoad = true, knownHorizonIds = new Set();
let isInitialLetterLoad = true, knownLetterIds = new Set();

function listenPosts() {
    if (!database) return;
    database.ref('posts').off();
    database.ref('posts').on('value', (snapshot) => {
        rawPostsSnapshot = snapshot.val(); allPosts = []; let currentIds = new Set();
        let hasNewPost = false, newPostAuthor = '';
        if (rawPostsSnapshot) {
            Object.keys(rawPostsSnapshot).forEach((key) => {
                allPosts.push({ id: key, ...rawPostsSnapshot[key] }); currentIds.add(key);
                if (!isInitialPostLoad && !knownPostIds.has(key)) { hasNewPost = true; newPostAuthor = rawPostsSnapshot[key].author || '기록자'; }
            });
            allPosts.sort((a, b) => (parseCustomDate(b.date) || 0) - (parseCustomDate(a.date) || 0) || b.id.localeCompare(a.id));
        }
        if (hasNewPost && isAdmin && newPostAuthor !== loggedInUser) sendNotification(NOTIFICATION_CONFIG.postTitle, NOTIFICATION_CONFIG.postBody);
        knownPostIds = currentIds; isInitialPostLoad = false;
        if (currentView === 'posts') renderUI();
    });
}

function listenHorizons() {
    if (!database) return;
    database.ref('horizons').off();
    database.ref('horizons').on('value', (snapshot) => {
        rawHorizonsSnapshot = snapshot.val(); allHorizons = []; let currentIds = new Set();
        let hasNewHorizon = false, newHorizonAuthor = '';
        if (rawHorizonsSnapshot) {
            Object.keys(rawHorizonsSnapshot).forEach((key) => {
                allHorizons.push({ id: key, ...rawHorizonsSnapshot[key] }); currentIds.add(key);
                if (!isInitialHorizonLoad && !knownHorizonIds.has(key)) { hasNewHorizon = true; newHorizonAuthor = rawHorizonsSnapshot[key].author || '기록자'; }
            });
            allHorizons.sort((a, b) => (parseCustomDate(b.date) || 0) - (parseCustomDate(a.date) || 0) || b.id.localeCompare(a.id));
        }
        if (hasNewHorizon && isAdmin && newHorizonAuthor !== loggedInUser) sendNotification("비밀 기록", "수평선 너머에 누군가 은밀한 기록을 남겼습니다.");
        knownHorizonIds = currentIds; isInitialHorizonLoad = false;
        if (currentView === 'horizons') renderUI();
    });
}

function listenLetters() {
    if (!database) return;
    database.ref('letters').off();
    database.ref('letters').on('value', (snapshot) => {
        rawLettersSnapshot = snapshot.val(); allLetters = []; let currentIds = new Set();
        let hasNewLetter = false, newLetterAuthor = '';
        if (rawLettersSnapshot) {
            Object.keys(rawLettersSnapshot).forEach((key) => {
                allLetters.push({ id: key, ...rawLettersSnapshot[key] }); currentIds.add(key);
                if (!isInitialLetterLoad && !knownLetterIds.has(key)) { hasNewLetter = true; newLetterAuthor = rawLettersSnapshot[key].author || '방문자'; }
            });
            allLetters.sort((a, b) => (parseCustomDate(b.date) || 0) - (parseCustomDate(a.date) || 0) || b.id.localeCompare(a.id));
        }
        if (hasNewLetter && isAdmin && newLetterAuthor !== loggedInUser) sendNotification(NOTIFICATION_CONFIG.letterTitle, NOTIFICATION_CONFIG.letterBody);
        knownLetterIds = currentIds; isInitialLetterLoad = false;
        if (currentView === 'letters') renderUI();
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
    const bookmarkBtn = document.getElementById('bookmark-filter-btn');

    if (!container || !paginationContainer) return;

    if (!isAppend) {
        container.innerHTML = '';
        paginationContainer.innerHTML = '';
        if (currentDisplayMode === 'grid' || currentDisplayMode === 'infinite') container.classList.add('posts-grid-view');
        else container.classList.remove('posts-grid-view');

        if (subtitleElem) {
            let subtitleText = '';
            if (currentView === 'posts') {
                subtitleText = `<span style="color:#fff; font-size:1.02rem; font-weight:500;">아래 바다에 기록된 글들을 클릭하여 읽어주세요!</span><br><span style="color:#90e0ef; font-size:0.85rem; display:inline-block; margin-top:8px;">총 기록된 글 : ${allPosts.length}개</span>`;
            } else if (currentView === 'horizons') {
                subtitleText = `<span style="color:#e9d5ff; font-size:1.02rem; font-weight:500;">기록자만이 열람할 수 있는 비밀의 바다입니다.</span><br><span style="color:#c9a0ff; font-size:0.85rem; display:inline-block; margin-top:8px;">은밀한 기록 : ${allHorizons.length}개</span>`;
            } else {
                subtitleText = `수평선 너머 바다 위에 띄워진 편지들.<br><span style="color:#ffd4ba; font-size:0.85rem; display:inline-block; margin-top:8px;">띄워진 편지 : ${allLetters.length}개</span>`;
            }

            let selectHtml = `
            <div style="margin-top:18px; display:flex; flex-direction:column; align-items:center; width:100%; gap:14px;">
                <select onchange="window.setDisplayMode(this.value)" style="height:38px; max-width:180px; background:rgba(255,255,255,0.05); border:1px solid rgba(0,180,216,0.28); color:#fff; padding:0 28px; border-radius:25px; font-size:0.85rem; cursor:pointer; text-align:center;">
                    <option value="list" ${currentDisplayMode === 'list' ? 'selected' : ''} style="background:#030a16;">📄 리스트 모드</option>
                    <option value="grid" ${currentDisplayMode === 'grid' ? 'selected' : ''} style="background:#030a16;">🔲 갤러리 모드</option>
                    <option value="infinite" ${currentDisplayMode === 'infinite' ? 'selected' : ''} style="background:#030a16;">🌊 스크롤 모드</option>
                </select>
            `;
            if (currentView === 'letters' && isAdmin) {
                selectHtml += `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; max-width:450px; margin-top:10px;">
                    <label style="display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px; background:rgba(144,224,239,0.08); border:1px solid rgba(144,224,239,0.25); color:#90e0ef; font-size:0.78rem; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" id="letter-select-all" onclick="window.toggleAllLetters(this)" style="accent-color:#00b4d8;"> 전체 선택
                    </label>
                    <button type="button" onclick="window.deleteSelectedLetters()" class="danger-btn" style="padding:6px 16px; font-size:0.78rem;">선택 소멸</button>
                </div>`;
            }
            selectHtml += `</div>`;
            subtitleElem.innerHTML = subtitleText + selectHtml;
        }

        if (currentView === 'posts' || currentView === 'horizons') {
            if (authorStatsContainer) authorStatsContainer.style.display = 'flex';
            if (authorFilterContainer) authorFilterContainer.style.display = 'flex';
            let targetArrayCount = currentView === 'posts' ? allPosts : allHorizons;
            let ashiCount = 0, haeunCount = 0, bmCount = 0;
            targetArrayCount.forEach(item => {
                if ((item.author || "").includes("하은")) haeunCount++; else ashiCount++;
                if (bookmarkedIds.has(item.id)) bmCount++;
            });
            if (authorStatsContainer) authorStatsContainer.innerHTML = `<span class="stat-badge">아시 : ${ashiCount}개</span><span class="stat-badge">하은 : ${haeunCount}개</span>`;
            if (bookmarkBtn) {
                bookmarkBtn.innerText = `🔖 책갈피 모아보기 (${bmCount})`;
                bookmarkBtn.classList.toggle('active', onlyBookmarkedFilter);
            }
        } else {
            if (authorStatsContainer) authorStatsContainer.style.display = 'none';
            if (authorFilterContainer) authorFilterContainer.style.display = 'none';
        }
    }

    const targetArray = getFilteredArray();
    if (targetArray.length === 0) {
        if (!isAppend) container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#94a3b8; margin-top:40px;">${onlyBookmarkedFilter ? '책갈피해 둔 기록이 없습니다.' : '존재하지 않습니다.'}</p>`;
        return;
    }

    const totalPages = Math.ceil(targetArray.length / postsPerPage);
    let currentItems = [];
    if (currentDisplayMode === 'infinite') {
        currentItems = isAppend ? targetArray.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage) : targetArray.slice(0, currentPage * postsPerPage);
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

        let readBadgeHtml = (currentView === 'letters' && item.read === true)
            ? `<span class="read-badge" style="font-size:0.7rem; background:rgba(247,163,127,0.15); color:#f7a37f; border:1px solid rgba(247,163,127,0.35); padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:bold;">수거됨</span>`
            : '';

        const displayDate = (currentView === 'posts' || currentView === 'horizons') ? `${escapeHtml(item.author || "기록자")} ㅣ ${formatTo24Hour(item.date)}` : formatTo24Hour(item.date);
        const selectLetterCbHtml = (isAdmin && currentView === 'letters')
            ? `<input type="checkbox" class="letter-checkbox" value="${item.id}" onclick="event.stopPropagation();" style="margin-right:10px; accent-color:#00b4d8; width:16px; height:16px; cursor:pointer; vertical-align:middle;">`
            : '';

        const isMarked = bookmarkedIds.has(item.id);
        const bookmarkIconHtml = (currentView !== 'letters')
            ? `<button type="button" class="card-bookmark-btn ${isMarked ? 'bookmarked' : ''}" onclick="window.toggleBookmark('${item.id}', event)" title="책갈피">🔖</button>`
            : '';

        const safeContentHtml = `<div class="post-content-area">${highlightSearchKeyword(item.content, searchKeyword)}</div>`;
        const footerHtml = `<div class="post-footer"><span class="date">${displayDate}</span>${mgmtButtonsHtml}</div>`;

        card.innerHTML = `<div class="card-title-row"><h3>${selectLetterCbHtml}${highlightSearchKeyword(item.title, searchKeyword)}${readBadgeHtml}</h3>${bookmarkIconHtml}</div>${safeContentHtml}${footerHtml}`;
        cardFragment.appendChild(card);
    });
    container.appendChild(cardFragment);

    if (currentDisplayMode === 'infinite') {
        if (!isAppend && currentPage < totalPages) {
            const sentinel = document.createElement('div');
            sentinel.id = 'infinite-sentinel';
            sentinel.style.cssText = 'width: 100%; height: 20px; grid-column: 1/-1; margin-top: 20px;';
            paginationContainer.appendChild(sentinel);
            if (window.infiniteObserver) window.infiniteObserver.disconnect();
            window.infiniteObserver = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && currentPage < Math.ceil(targetArray.length / postsPerPage)) {
                    currentPage++; renderUI(true);
                }
            }, { rootMargin: '150px' });
            window.infiniteObserver.observe(sentinel);
        }
    } else if (!isAppend && totalPages > 1) {
        const pageFragment = document.createDocumentFragment();
        const maxPageButtons = 5;
        const currentGroup = Math.ceil(currentPage / maxPageButtons);
        let startPage = (currentGroup - 1) * maxPageButtons + 1;
        let endPage = Math.min(currentGroup * maxPageButtons, totalPages);
        if (startPage > 1) {
            const prevBtn = document.createElement('div'); prevBtn.className = 'page-btn'; prevBtn.innerHTML = '&#139;';
            prevBtn.onclick = () => { currentPage = startPage - 1; renderUI(); scrollToPosts(); };
            pageFragment.appendChild(prevBtn);
        }
        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('div'); btn.className = `page-btn ${i === currentPage ? 'active' : ''}`; btn.innerText = i;
            btn.onclick = () => { currentPage = i; renderUI(); scrollToPosts(); };
            pageFragment.appendChild(btn);
        }
        if (endPage < totalPages) {
            const nextBtn = document.createElement('div'); nextBtn.className = 'page-btn'; nextBtn.innerHTML = '&#155;';
            nextBtn.onclick = () => { currentPage = endPage + 1; renderUI(); scrollToPosts(); };
            pageFragment.appendChild(nextBtn);
        }
        paginationContainer.appendChild(pageFragment);
    }
}

// 📖 상세 독서 모달 (이전 글 / 다음 글 이동 및 글자 크기, 책갈피 연동)
function openDetailModal(key) {
    if (!isAdmin && (currentView === 'letters' || currentView === 'horizons')) return;
    const filteredList = getFilteredArray();
    const currentIndex = filteredList.findIndex(p => p.id === key);
    const sourceList = currentView === 'posts' ? allPosts : (currentView === 'horizons' ? allHorizons : allLetters);
    const item = sourceList.find(p => p.id === key);
    if (!item) return;

    currentDetailKey = key;
    if (currentView === 'letters' && isAdmin && !item.read && database) {
        database.ref('letters/' + key).update({ read: true });
    }

    if (document.getElementById('detail-title')) document.getElementById('detail-title').innerHTML = escapeHtml(item.title);
    if (document.getElementById('detail-date')) {
        const charInfo = ` · ${item.content.length.toLocaleString()}자`;
        const displayInfo = (currentView === 'posts' || currentView === 'horizons')
            ? `${item.author || "기록자"} ㅣ ${formatTo24Hour(item.date)}${charInfo}`
            : `${formatTo24Hour(item.date)}${charInfo}`;
        document.getElementById('detail-date').innerText = displayInfo;
    }
    const textElem = document.getElementById('detail-text');
    if (textElem) {
        textElem.innerHTML = escapeHtml(item.content);
        textElem.className = 'reader-font-' + readerFontSize;
        textElem.scrollTop = 0;
    }

    const bmBtn = document.getElementById('detail-bookmark-btn');
    if (bmBtn) bmBtn.style.display = currentView === 'letters' ? 'none' : 'inline-block';
    updateDetailBookmarkUI();

    // 이전 기록 / 다음 기록 네비게이션 렌더링
    const navBar = document.getElementById('detail-nav-bar');
    if (navBar) {
        const prevItem = currentIndex > 0 ? filteredList[currentIndex - 1] : null;
        const nextItem = (currentIndex !== -1 && currentIndex < filteredList.length - 1) ? filteredList[currentIndex + 1] : null;
        if (!prevItem && !nextItem) {
            navBar.style.display = 'none';
        } else {
            navBar.style.display = 'grid';
            navBar.innerHTML = `
                ${prevItem ? `<button type="button" class="detail-nav-btn prev" onclick="window.openDetailModal('${prevItem.id}')">← 이전: ${escapeHtml(prevItem.title)}</button>` : `<div></div>`}
                ${nextItem ? `<button type="button" class="detail-nav-btn next" onclick="window.openDetailModal('${nextItem.id}')">다음: ${escapeHtml(nextItem.title)} →</button>` : `<div></div>`}
            `;
        }
    }

    if (document.getElementById('detail-modal')) {
        document.getElementById('detail-modal').style.display = 'flex';
        document.body.classList.add('no-scroll');
    }
}
window.openDetailModal = openDetailModal;

// 글/편지 저장, 수정, 소멸, 백업 엔진
function savePost() {
    if (!isAdmin || !database || isSubmitting) return;
    const title = document.getElementById('post-title')?.value.trim();
    const content = document.getElementById('post-content')?.value.trim();
    if (!title || !content) return showSystemAlert('내용을 모두 입력해주세요.');
    if (!navigator.onLine) return showSystemAlert('인터넷이 끊겨 글을 기록할 수 없습니다.');

    const now = new Date();
    const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    isSubmitting = true;
    const postData = { title, content, date, author: loggedInUser };
    const targetNode = currentView === 'horizons' ? 'horizons' : 'posts';

    if (editTargetKey) {
        database.ref(targetNode + '/' + editTargetKey).update(postData).then(() => {
            showSystemAlert('기록이 수정되었습니다.'); clearDraftCacheStorage('post'); cancelEdit();
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; });
    } else {
        database.ref(targetNode).push(postData).then(() => {
            document.getElementById('post-title').value = ''; document.getElementById('post-content').value = '';
            clearDraftCacheStorage('post'); currentPage = 1;
            showSystemAlert(currentView === 'horizons' ? '수평선 너머에 은밀히 새겨졌습니다.' : '성공적으로 새겨졌습니다.');
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; });
    }
}
window.savePost = savePost;

function triggerBottleAnimation(callback) {
    const bottle = document.createElement('div'); bottle.innerHTML = '🍾';
    bottle.style.cssText = 'position:fixed; bottom:15%; left:-100px; font-size:60px; z-index:99999; transition: all 2.2s ease-in-out;';
    document.body.appendChild(bottle);
    setTimeout(() => { bottle.style.left = '115%'; bottle.style.transform = 'rotate(720deg) translateY(-80px)'; }, 50);
    setTimeout(() => { bottle.remove(); if (callback) callback(); }, 2250);
}

function saveLetter() {
    if (!database || isSubmitting || isRestMode) return;
    const nowTime = Date.now();
    const lastSubmitTime = localStorage.getItem('last_letter_submit_time') || 0;
    if (!isAdmin && nowTime - lastSubmitTime < 30000) {
        return showSystemAlert('띄워진 편지가 수평선에 닿을 때까지 잠시 기다려주세요. (30초 후 다시 띄울 수 있습니다.)');
    }
    const title = document.getElementById('letter-title')?.value.trim();
    const content = document.getElementById('letter-content')?.value.trim();
    if (!title || !content) return showSystemAlert('제목과 내용을 모두 채워주세요.');
    if (!navigator.onLine) return showSystemAlert('인터넷이 끊겨 편지를 띄울 수 없습니다.');
    if (document.getElementById('agree-terms') && !document.getElementById('agree-terms').checked) return showSystemAlert('안내 및 약관에 동의해주세요.');
    if (title.length > 100 || content.length > 5000) return showSystemAlert('제목 100자 이하, 본문 5000자 이하여야 합니다.');

    const now = new Date();
    const date = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    isSubmitting = true;
    const letterData = { title, content, date, author: isAdmin ? loggedInUser : '방문자', read: false };

    triggerBottleAnimation(() => {
        database.ref('letters').push(letterData).then(() => {
            if (!isAdmin) localStorage.setItem('last_letter_submit_time', Date.now().toString());
            document.getElementById('letter-title').value = ''; document.getElementById('letter-content').value = '';
            if (document.getElementById('agree-terms')) document.getElementById('agree-terms').checked = false;
            clearDraftCacheStorage('letter'); showSystemAlert('편지가 바다 위로 안전하게 띄워졌습니다.'); currentPage = 1; renderUI();
            if (isAdmin) setTimeout(() => window.executeCloudBackupEngine(true), 800);
        }).finally(() => { isSubmitting = false; });
    });
}
window.saveLetter = saveLetter;

function prepareEdit(key) {
    let targetArray = currentView === 'horizons' ? allHorizons : allPosts;
    const post = targetArray.find(p => p.id === key); if (!post) return;
    editTargetKey = key;
    if (document.getElementById('write-title')) document.getElementById('write-title').innerText = currentView === 'horizons' ? "비밀 기록 수정하기" : "기록 수정하기";
    if (document.getElementById('post-title')) document.getElementById('post-title').value = post.title;
    if (document.getElementById('post-content')) document.getElementById('post-content').value = post.content;
    if (document.getElementById('submit-post-btn')) document.getElementById('submit-post-btn').innerText = "수정하기";
    if (document.getElementById('cancel-edit-btn')) document.getElementById('cancel-edit-btn').style.display = "inline-block";
    updateCharCounter('post');
    const writeSection = document.getElementById('write-section');
    if (writeSection) window.scrollTo({ top: writeSection.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
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

window.deletePost = function(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm(currentView === 'horizons' ? '이 비밀 기록을 완전히 소멸시키겠습니까?' : '이 기록을 완전히 소멸시키겠습니까?', function() {
        if (editTargetKey === key) cancelEdit();
        const targetNode = currentView === 'horizons' ? 'horizons' : 'posts';
        database.ref(targetNode + '/' + key).remove().then(() => {
            renderUI(); setTimeout(() => window.executeCloudBackupEngine(true), 800);
        });
    });
};

window.deleteLetter = function(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm('이 편지를 바다에서 완전히 소멸시키겠습니까?', function() {
        database.ref('letters/' + key).remove().then(() => {
            renderUI(); setTimeout(() => window.executeCloudBackupEngine(true), 800);
        });
    });
};

window.toggleAllLetters = function(source) {
    document.querySelectorAll('.letter-checkbox').forEach(cb => cb.checked = source.checked);
};

window.deleteSelectedLetters = function() {
    if (!isAdmin || !database) return;
    const keysToDelete = Array.from(document.querySelectorAll('.letter-checkbox:checked')).map(cb => cb.value);
    if (keysToDelete.length === 0) return showSystemAlert('소멸시키고자 하는 편지들을 먼저 선택해 주세요.');
    showSystemConfirm(`선택하신 ${keysToDelete.length}개의 편지를 바다에서 완전히 소멸시키겠습니까?`, function() {
        const batchUpdates = {};
        keysToDelete.forEach(key => { batchUpdates['letters/' + key] = null; });
        database.ref().update(batchUpdates).then(() => {
            showSystemAlert('선택하신 편지 조각들이 완벽히 소멸되었습니다.');
            setTimeout(() => window.executeCloudBackupEngine(true), 800);
        });
    });
};

window.clearDatabase = function() {
    if (!isAdmin || !database) return;
    showSystemConfirm('🚨 모든 기록과 편지들이 사라집니다. 초기화할까요?', function() {
        setTimeout(() => {
            showSystemConfirm('정말 소멸시킬까요?', function() {
                Promise.all([database.ref('posts').remove(), database.ref('horizons').remove(), database.ref('letters').remove()]).then(() => {
                    cancelEdit(); currentPage = 1; showSystemAlert('초기 상태가 되었습니다.');
                });
            });
        }, 150);
    });
};

// 💾 클라우드 백업 및 복원
const CONTEXT_RETENTION_PERIOD = 30 * 24 * 60 * 60 * 1000;

window.openBackupModal = function() {
    if (!isAdmin) return;
    if (document.getElementById('backup-modal')) {
        document.getElementById('backup-modal').style.display = 'flex';
        window.switchAdminTab('backup');
    }
};
window.closeBackupModal = function() {
    if (document.getElementById('backup-modal')) document.getElementById('backup-modal').style.display = 'none';
};

window.switchAdminTab = function(tab) {
    const btnBackup = document.getElementById('admin-btn-backup');
    const btnSettings = document.getElementById('admin-btn-settings');
    const listContainer = document.getElementById('backup-list-container');
    const delControls = document.getElementById('backup-delete-controls');
    const settingsContainer = document.getElementById('admin-settings-container');
    const timelineWrapper = document.querySelector('.backup-timeline-wrapper');

    if (tab === 'backup') {
        if (btnBackup) { btnBackup.style.color = '#f7a37f'; btnBackup.style.borderBottom = '2px solid #f7a37f'; }
        if (btnSettings) { btnSettings.style.color = '#64748b'; btnSettings.style.borderBottom = '2px solid transparent'; }
        if (listContainer) listContainer.style.display = 'block';
        if (delControls) delControls.style.display = 'flex';
        if (settingsContainer) settingsContainer.style.display = 'none';
        if (timelineWrapper) timelineWrapper.style.display = 'block';
        loadBackupTimelineList();
    } else {
        if (btnSettings) { btnSettings.style.color = '#f7a37f'; btnSettings.style.borderBottom = '2px solid #f7a37f'; }
        if (btnBackup) { btnBackup.style.color = '#64748b'; btnBackup.style.borderBottom = '2px solid transparent'; }
        if (listContainer) listContainer.style.display = 'none';
        if (delControls) delControls.style.display = 'none';
        if (settingsContainer) settingsContainer.style.display = 'block';
        if (timelineWrapper) timelineWrapper.style.display = 'none';
        renderAdminSettings();
    }
};

function renderAdminSettings() {
    const container = document.getElementById('admin-settings-container');
    if (!container) return;
    container.innerHTML = `
        <div style="background:rgba(3,10,23,0.5); padding:20px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); text-align:left; margin-bottom:15px; word-break:keep-all;">
            <h3 style="color:#fff; margin-bottom:14px; font-size:1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">관리자 전용 제어 시스템</h3>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                <div>
                    <div style="color:#e2e8f0; font-weight:bold; margin-bottom:5px;">🌊 바다 휴식 모드 (수신 차단)</div>
                    <div style="color:#94a3b8; font-size:0.78rem; line-height:1.6;">활성화 시, 일반 방문객들의 편지 수신 작성이 제한되고 안내 문구가 표시됩니다.</div>
                </div>
                <button onclick="window.toggleRestMode()" style="flex-shrink:0; padding:8px 14px; font-size:0.8rem; border-radius:8px; background:${isRestMode ? '#ef4444' : '#475569'}; color:#fff; border:none;">
                    ${isRestMode ? '휴식 중 (해제하기)' : '휴식 모드 켜기'}
                </button>
            </div>
        </div>
    `;
}

window.toggleRestMode = function() {
    if (!isAdmin || !database) return;
    const targetState = !isRestMode;
    database.ref('settings/restMode').set(targetState).then(() => {
        showSystemAlert(targetState ? '바다가 휴식에 들어갑니다. 편지 수신이 차단됩니다.' : '바다의 휴식이 끝났습니다. 편지 수신이 재개됩니다.');
        renderAdminSettings();
    });
};

window.executeCloudBackupEngine = function(isAutomatic = true) {
    if (!database) return Promise.reject(new Error("Database connection lost"));
    const now = new Date();
    const timestamp = now.getTime();
    const dateString = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const pCount = rawPostsSnapshot ? Object.keys(rawPostsSnapshot).length : 0;
    const hCount = rawHorizonsSnapshot ? Object.keys(rawHorizonsSnapshot).length : 0;
    const lCount = rawLettersSnapshot ? Object.keys(rawLettersSnapshot).length : 0;
    const backupMeta = { timestamp, date: dateString, type: isAutomatic ? "자동" : "수동", pCount, hCount, lCount };
    const backupPayload = { posts: rawPostsSnapshot || {}, horizons: rawHorizonsSnapshot || {}, letters: rawLettersSnapshot || {} };
    const newBackupKey = database.ref().push().key;
    return Promise.all([database.ref(`backupMeta/${newBackupKey}`).set(backupMeta), database.ref(`backupData/${newBackupKey}`).set(backupPayload)]).then(() => loadBackupTimelineList());
};

window.triggerManualBackup = function() {
    if (!isAdmin || !database) return;
    window.executeCloudBackupEngine(false).then(() => showSystemAlert("현재 바다 상태 스냅샷 수동 저장이 완료되었습니다."));
};

window.toggleAllBackups = function(source) { document.querySelectorAll('.backup-checkbox').forEach(cb => cb.checked = source.checked); };
window.selectBackupsByPeriod = function(days) {
    const checkboxes = document.querySelectorAll('.backup-checkbox');
    if (!days) { checkboxes.forEach(cb => cb.checked = false); return; }
    const now = Date.now();
    const threshold = days === 'all' ? now + 999999999 : now - (parseInt(days, 10) * 24 * 60 * 60 * 1000);
    checkboxes.forEach(cb => {
        const ts = parseInt(cb.getAttribute('data-timestamp'), 10);
        cb.checked = days === 'all' ? true : ts < threshold;
    });
};

window.deleteSelectedBackups = function() {
    if (!isAdmin || !database) return;
    const keysToDelete = Array.from(document.querySelectorAll('.backup-checkbox:checked')).map(cb => cb.value);
    if (keysToDelete.length === 0) return showSystemAlert('소멸시킬 백업 지점을 선택해주세요.');
    showSystemConfirm(`선택하신 ${keysToDelete.length}개의 백업 기록을 영구히 소멸시키겠습니까?`, function() {
        Promise.all(keysToDelete.map(k => Promise.all([database.ref(`backupMeta/${k}`).remove(), database.ref(`backupData/${k}`).remove()]))).then(() => {
            showSystemAlert('선택한 백업이 완전 소멸되었습니다.'); loadBackupTimelineList();
        });
    });
};

function loadBackupTimelineList() {
    const container = document.getElementById('backup-list-container');
    if (!container || !database) return;
    container.innerHTML = '';
    const expirationThreshold = Date.now() - CONTEXT_RETENTION_PERIOD;
    database.ref('backupMeta').once('value').then((snapshot) => {
        if (document.getElementById('backup-loading-msg')) document.getElementById('backup-loading-msg').style.display = 'none';
        const backups = snapshot.val();
        if (!backups) { container.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem; padding:20px 0; text-align:center;">복구 지점이 없습니다.</p>`; return; }
        const keys = Object.keys(backups).filter(k => backups[k].timestamp >= expirationThreshold).reverse();
        keys.forEach((key) => {
            const item = backups[key];
            const badgeClass = item.type === "자동" ? "auto" : "manual";
            const el = document.createElement('div'); el.className = 'backup-item';
            el.innerHTML = `
                <div style="display:flex; align-items:center; width:100%; justify-content:space-between; gap:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="checkbox" class="backup-checkbox" value="${key}" data-timestamp="${item.timestamp}" style="accent-color:#f7a37f; width:16px; height:16px;">
                        <div>
                            <div class="backup-time-title">${item.date} <span class="backup-badge-type ${badgeClass}">${item.type}</span></div>
                            <div class="backup-counts">글 ${item.pCount || 0}개 ㅣ 비밀 ${item.hCount || 0}개 ㅣ 편지 ${item.lCount || 0}개</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button onclick="window.downloadBackupFile('${key}', 'txt')" style="font-size:0.75rem; padding:5px 9px; border-radius:6px;">TXT</button>
                        <button onclick="window.downloadBackupFile('${key}', 'pdf')" style="font-size:0.75rem; padding:5px 9px; border-radius:6px; color:#ffd4ba;">PDF</button>
                        <button onclick="window.restoreFromTargetBackupPoint('${key}')" style="font-size:0.75rem; padding:5px 11px; border-radius:6px; background:#e76f51; color:#fff; border:none;">복구</button>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    });
}

window.downloadBackupFile = function(key, format) {
    if (!isAdmin || !database) return;
    database.ref(`backupData/${key}`).once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data) return showSystemAlert("백업 파일이 유실되었습니다.");
        const posts = data.posts || {}, horizons = data.horizons || {}, letters = data.letters || {};
        if (format === 'txt') {
            let textResult = `🌊 수평선 너머의 서재 백업 (${key})\n\n[1. 바다의 기록]\n`;
            Object.keys(posts).forEach(k => { textResult += `\n◈ ${posts[k].title} (${posts[k].author || '기록자'} | ${posts[k].date})\n${posts[k].content}\n`; });
            textResult += `\n[2. 수평선 너머]\n`;
            Object.keys(horizons).forEach(k => { textResult += `\n◈ ${horizons[k].title} (${horizons[k].author || '기록자'} | ${horizons[k].date})\n${horizons[k].content}\n`; });
            textResult += `\n[3. 띄워진 편지]\n`;
            Object.keys(letters).forEach(k => { textResult += `\n◈ ${letters[k].title} (${letters[k].date})\n${letters[k].content}\n`; });
            const blob = new Blob([textResult], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `수평선너머_백업_${key}.txt`; a.click(); URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
            window.print();
        }
    });
};

window.restoreFromTargetBackupPoint = function(key) {
    if (!isAdmin || !database) return;
    showSystemConfirm('선택하신 시점으로 바다 데이터를 덮어씌워 복구하시겠습니까?', function() {
        database.ref(`backupData/${key}`).once('value').then((snapshot) => {
            const targetBackup = snapshot.val();
            if (!targetBackup) return;
            Promise.all([
                database.ref('posts').set(targetBackup.posts || null),
                database.ref('horizons').set(targetBackup.horizons || null),
                database.ref('letters').set(targetBackup.letters || null)
            ]).then(() => { showSystemAlert('수평선 너머 바다가 완전 복원되었습니다.'); window.closeBackupModal(); });
        });
    });
};

// 🌅 시간대 배경 및 ⛅ 실시간 날씨 엔진
function applyTimeBasedThemeEngine() {
    const hour = new Date().getHours();
    let mode = window.manualTimeOverride || 'auto';
    if (mode === 'auto') {
        if (hour >= 6 && hour < 12) mode = 'morning';
        else if (hour >= 12 && hour < 18) mode = 'day';
        else if (hour >= 18 && hour < 20) mode = 'evening';
        else mode = 'night';
    }
    let bgStyle = "", themeText = "";
    if (mode === 'morning') { bgStyle = "linear-gradient(135deg, #061121 0%, #153b50 50%, #00b4d8 100%)"; themeText = "🌅 아침의 바다"; }
    else if (mode === 'day') { bgStyle = "linear-gradient(135deg, #000428 0%, #004e92 60%, #90e0ef 100%)"; themeText = "☀️ 낮의 바다"; }
    else if (mode === 'evening') { bgStyle = "linear-gradient(135deg, #0b0f19 0%, #4a192c 50%, #f7a37f 100%)"; themeText = "🌇 저녁의 바다"; }
    else { bgStyle = "linear-gradient(135deg, #02050d 0%, #09132b 60%, #1e1b4b 100%)"; themeText = "🌌 밤의 바다"; }

    let oceanBg = document.getElementById('ocean-bg-layer');
    if (!oceanBg && document.body) {
        oceanBg = document.createElement('div'); oceanBg.id = 'ocean-bg-layer';
        oceanBg.style.cssText = "position:fixed; top:-10vh; left:-10vw; width:120vw; height:120vh; z-index:-999; pointer-events:none; transition:background 1.5s ease-in-out;";
        document.body.insertBefore(oceanBg, document.body.firstChild);
    }
    if (oceanBg) oceanBg.style.background = bgStyle;

    let tElem = document.getElementById('theme-widget');
    if (!tElem && document.body) { tElem = document.createElement('div'); tElem.id = 'theme-widget'; document.body.appendChild(tElem); }
    if (tElem) tElem.innerText = themeText;
}

function applyManualWeatherEffect(type) {
    let overlay = document.getElementById('weather-overlay-layer');
    if (!overlay && document.body) { overlay = document.createElement('div'); overlay.id = 'weather-overlay-layer'; document.body.insertBefore(overlay, document.body.firstChild); }
    const wElem = document.getElementById('weather-widget');
    if (type === 'rain') {
        if (overlay) overlay.className = 'weather-overlay rain';
        if (window.manualWeatherOverride !== 'auto' && wElem) wElem.innerText = "🌧️ 비 내리는 바다";
    } else if (type === 'snow') {
        if (overlay) overlay.className = 'weather-overlay snow';
        if (window.manualWeatherOverride !== 'auto' && wElem) wElem.innerText = "❄️ 눈 내리는 바다";
    } else {
        if (overlay) overlay.className = 'weather-overlay';
        if (window.manualWeatherOverride !== 'auto' && wElem) wElem.innerText = "☀️ 평온한 바다";
    }
}

function syncWeatherAndWidget() {
    let wElem = document.getElementById('weather-widget');
    if (!wElem && document.body) { wElem = document.createElement('div'); wElem.id = 'weather-widget'; document.body.appendChild(wElem); }
    if (window.manualWeatherOverride && window.manualWeatherOverride !== 'auto') { applyManualWeatherEffect(window.manualWeatherOverride); return; }
    const defaultLat = 35.1796, defaultLon = 129.0756;
    function fetchWeatherData(lat, lon) {
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&_=${Date.now()}`, { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
            if (window.manualWeatherOverride && window.manualWeatherOverride !== 'auto') return;
            const code = data.current_weather.weathercode;
            let icon = '☁️';
            if (code === 0) icon = '☀️';
            else if (code > 0 && code <= 3) icon = '⛅';
            else if (code >= 51 && code <= 67) icon = '🌧️';
            else if (code >= 71 && code <= 77) icon = '❄️';
            if (wElem) wElem.innerHTML = `${icon} ${Math.round(data.current_weather.temperature)}°C`;
            let weatherType = 'clear';
            if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) weatherType = 'rain';
            else if ((code >= 71 && code <= 77) || code === 85 || code === 86) weatherType = 'snow';
            applyManualWeatherEffect(weatherType);
        }).catch(() => { if (wElem) wElem.innerText = "☁️ 21°C"; applyManualWeatherEffect('clear'); });
    }
    if (!navigator.geolocation) { fetchWeatherData(defaultLat, defaultLon); return; }
    navigator.geolocation.getCurrentPosition(pos => fetchWeatherData(pos.coords.latitude, pos.coords.longitude), () => fetchWeatherData(defaultLat, defaultLon), { timeout: 8000 });
}

window.injectTimeGearButton = function() {
    if (document.getElementById('time-gear-btn')) return;
    const btn = document.createElement('div'); btn.id = 'time-gear-btn'; btn.innerHTML = '⚙️'; btn.title = "환경 설정 (시간/날씨 수동 조작)";
    btn.onclick = window.openEnvironmentSettingsModal; document.body.appendChild(btn);
};

window.openEnvironmentSettingsModal = function() {
    let modal = document.getElementById('env-modal');
    if (!modal) {
        modal = document.createElement('div'); modal.id = 'env-modal'; modal.className = 'modal';
        modal.onclick = () => { modal.style.display = 'none'; };
        modal.innerHTML = `
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width:350px;">
                <h3 style="color:#fff; margin-bottom:20px;">⚙️ 서재 환경 조작</h3>
                <div style="margin-bottom:16px; text-align:left;">
                    <label style="color:#90e0ef; font-size:0.85rem; font-weight:bold; display:block; margin-bottom:8px;">🌅 시간대 배경</label>
                    <select id="time-select" style="width:100%; padding:12px; border-radius:10px; background:#030a17; border:1px solid rgba(144,224,239,0.3); color:#fff;">
                        <option value="auto">⏱️ 자동 (실시간 동기화)</option>
                        <option value="morning">🌅 아침 (물안개 청록)</option>
                        <option value="day">☀️ 낮 (스카이 블루)</option>
                        <option value="evening">🌇 저녁 (코랄빛 노을)</option>
                        <option value="night">🌌 밤 (오로라 심해)</option>
                    </select>
                </div>
                <div style="margin-bottom:22px; text-align:left;">
                    <label style="color:#f7a37f; font-size:0.85rem; font-weight:bold; display:block; margin-bottom:8px;">⛅ 날씨 효과</label>
                    <select id="weather-select" style="width:100%; padding:12px; border-radius:10px; background:#030a17; border:1px solid rgba(247,163,127,0.3); color:#fff;">
                        <option value="auto">📍 자동 (현재 위치 기반)</option>
                        <option value="clear">☀️ 맑음 (평온한 바다)</option>
                        <option value="rain">🌧️ 비 (비 내리는 바다)</option>
                        <option value="snow">❄️ 눈 (눈 내리는 바다)</option>
                    </select>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="window.applyEnvironmentSettings()" style="flex:1; background:#0284c7; color:#fff;">설정 적용</button>
                    <button onclick="document.getElementById('env-modal').style.display='none'" class="cancel-btn" style="flex:1;">닫기</button>
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
    syncWeatherAndWidget();
    document.getElementById('env-modal').style.display = 'none';
};

// 초기화 및 이벤트 바인딩
document.addEventListener('DOMContentLoaded', function() {
    applyTimeBasedThemeEngine();
    setInterval(applyTimeBasedThemeEngine, 60000);
    initDraftAutoSaveEngine();
    injectRandomMemoryButton();
    window.injectTimeGearButton();
    syncWeatherAndWidget();
    setInterval(syncWeatherAndWidget, 30 * 60000);
    listenPosts(); listenHorizons(); listenLetters();
    initMusicPlayerEngine();

    if (database) {
        database.ref('settings').on('value', snap => {
            const settings = snap.val() || {};
            isRestMode = settings.restMode || false;
            updateUI();
        });
    }

    // 🌊 맨 위로 가기 버튼 생성 및 스크롤 감지
    const topBtn = document.createElement('div');
    topBtn.id = 'ocean-top-btn';
    topBtn.innerHTML = '🌊';
    topBtn.title = '맨 위로 올라가기';
    topBtn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.scrollTo({ top: 0, behavior: 'smooth' });
    };
    document.body.appendChild(topBtn);

    window.addEventListener('scroll', () => {
        const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        topBtn.classList.toggle('show', scrollPos > 120);
    }, { passive: true });
});

// 수면 파문 및 키보드 단축키 (ESC 닫기, 좌/우 방향키로 이전/다음 글 이동)
document.addEventListener('pointerdown', function(e) {
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 800);
}, { passive: true });

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal(); closeDetailModal(); window.closeBackupModal(); window.closeDonationModal(); window.closeLibraryModal();
        ['env-modal', 'sound-modal', 'system-modal'].forEach(id => {
            const m = document.getElementById(id);
            if (m) m.style.display = 'none';
        });
        document.body.classList.remove('no-scroll');
    } else if (currentDetailKey && document.getElementById('detail-modal')?.style.display === 'flex') {
        const list = getFilteredArray();
        const idx = list.findIndex(p => p.id === currentDetailKey);
        if (e.key === 'ArrowLeft' && idx > 0) openDetailModal(list[idx - 1].id);
        else if (e.key === 'ArrowRight' && idx !== -1 && idx < list.length - 1) openDetailModal(list[idx + 1].id);
    }
});
