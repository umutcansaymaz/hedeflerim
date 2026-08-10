// ===== Auth Service =====
// Hedeflerim — login, logout, authUI

import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';

const auth = window.auth;

async function loginWithGoogle() {
    const loginBtn = document.getElementById('googleLoginBtn');
    const originalText = loginBtn ? loginBtn.innerHTML : '';

    try {
        if (!auth) {
            window.showToast('Firebase yapilandirmasi eksik. Giris devre disi.');
            return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="loading-spinner"></span> Google ile bağlanılıyor...';
            loginBtn.style.opacity = '0.7';
            loginBtn.style.pointerEvents = 'none';
        }

        const provider = new GoogleAuthProvider();
        await setPersistence(auth, browserLocalPersistence);

        // PWA (standalone) penceresinde redirect akisi Chrome tarafindan bozulabilir;
        // popup ise window.open + postMessage ile calisir ve standalone moddan etkilenmez.
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

        let signedIn = false;
        if (isStandalone) {
            try {
                await signInWithPopup(auth, provider);
                signedIn = true;
                window.showToast('Giriş başarılı');
            } catch (popupError) {
                if (popupError.code !== 'auth/popup-blocked' && popupError.code !== 'auth/popup-closed-by-user') {
                    throw popupError;
                }
                window.debugWarn('PWA popup akisi kullanilamadi, redirect deneniyor:', popupError.code);
            }
        }
        if (!signedIn) {
            await signInWithRedirect(auth, provider);
            // Redirect basladi: sayfa Google'a yonlenir. Donuste getRedirectResult + onAuthStateChanged oturumu tamamlar.
        }
    } catch (error) {
        console.error("Login Error:", error);
        window.showToast('Giriş başlatılamadı: ' + error.message);
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalText;
            loginBtn.style.opacity = '1';
            loginBtn.style.pointerEvents = 'auto';
        }
    }
}

async function logout() {
    try {
        if (!auth) {
            window.showToast('Firebase yapilandirmasi eksik.');
            return;
        }

        await signOut(auth);
        window.showToast('Çıkış yapıldı');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function buildFallbackAvatarDataUrl(name) {
    const raw = typeof name === 'string' ? name.trim() : '';
    const token = (raw || 'Kullanıcı')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || 'K';
    const safeToken = window.escapeHtml(token.slice(0, 2));
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'><rect width='96' height='96' fill='#0EA5E9'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='Segoe UI,Arial,sans-serif' font-size='36' fill='white'>${safeToken}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('googleLoginBtn');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const syncStatus = document.getElementById('syncStatus');

    if (!loginBtn || !userProfile) return;

    if (user) {
        const displayName = window.truncateText(
            typeof user.displayName === 'string' && user.displayName.trim() ? user.displayName.trim() : 'Kullanıcı',
            80
        );
        const photoUrl = typeof user.photoURL === 'string' ? user.photoURL.trim() : '';
        const fallbackAvatar = buildFallbackAvatarDataUrl(displayName);

        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userName.textContent = displayName;
        if (userAvatar) {
            userAvatar.alt = displayName;
            userAvatar.onerror = () => {
                userAvatar.onerror = null;
                userAvatar.src = fallbackAvatar;
            };
            userAvatar.src = photoUrl || fallbackAvatar;
        }
        if (syncStatus) {
            syncStatus.textContent = 'Bulut bağlantısı aktif';
            syncStatus.style.color = 'var(--success)';
        }
    } else {
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        if (syncStatus) {
            syncStatus.textContent = 'Senkronize değil';
            syncStatus.style.color = 'var(--text-secondary)';
        }
    }
}

window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.updateAuthUI = updateAuthUI;
