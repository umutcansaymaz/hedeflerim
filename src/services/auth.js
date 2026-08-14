// ===== Auth Service =====
// Hedeflerim — login, logout, authUI

import { GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence, signOut } from 'firebase/auth';

const auth = window.auth;

async function loginWithGoogle() {
    const loginBtn = document.getElementById('googleLoginBtn');
    const authBtn = document.getElementById('authGoogleBtn');
    const originalText = loginBtn ? loginBtn.innerHTML : '';
    const originalAuthText = authBtn ? authBtn.innerHTML : '';

    try {
        if (!auth) {
            window.showToast('Firebase yapılandırması eksik. Giriş devre dışı.');
            return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="loading-spinner"></span> Google ile bağlanılıyor...';
            loginBtn.style.opacity = '0.7';
            loginBtn.style.pointerEvents = 'none';
        }
        if (authBtn) {
            authBtn.disabled = true;
            authBtn.innerHTML = '<span class="loading-spinner"></span> Bağlanılıyor...';
            authBtn.style.opacity = '0.7';
            authBtn.style.pointerEvents = 'none';
        }

        const provider = new GoogleAuthProvider();
        // Her giris isteginde Google hesap secme ekranini zorla goster
        provider.setCustomParameters({ prompt: 'select_account' });
        await setPersistence(auth, browserLocalPersistence);

        // PWA (standalone) penceresinde Firebase popup/redirect donus zinciri tamamlanmiyor
        // (Android'de dogrulandi: hesap secimi PWA icinde aciliyor ama auth donusu asili kaliyor).
        // Kesin cozum: giris web surumunde (Chrome sekmesi) yapilir; ayni origin oldugu icin
        // oturum localStorage uzerinden PWA'ya otomatik yansir (Firebase multi-tab senkronu).
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
        if (isStandalone) {
            window.debugWarn('PWA modu: giris Chrome sekmesindeki web surumune yonlendiriliyor');
            // Sabit domain yerine runtime origin: hosting domaini degisirse (orn. custom domain)
            // yonlendirme otomatik olarak guncel kalir (ab6d5a8 config'ten okuma yaklasimiyla uyumlu)
            window.open(window.location.origin + '/?pwa_login=1', '_blank');
            window.showToast('Chrome sekmesinde giriş yap; PWA\'ya döndüğünde oturum açılmış olacak');
            return;
        }

        // Web: popup akisi. Redirect KULLANILMAZ: Chrome 115+ (Haziran 2024'ten beri) mobilde
        // 3. parti depolama bolumlemesi nedeniyle signInWithRedirect donusu ASILI KALIYOR
        // (Firebase resmi dokumani + issue #8329). Popup bu kisita tabi degildir ve mobil Chrome'da calisir.
        await signInWithPopup(auth, provider);
        window.showToast('Giriş başarılı');
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
        if (authBtn) {
            authBtn.disabled = false;
            authBtn.innerHTML = originalAuthText;
            authBtn.style.opacity = '1';
            authBtn.style.pointerEvents = 'auto';
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
    const authScreen = document.getElementById('authScreen');
    const headerUser = document.getElementById('headerUser');
    const headerAvatar = document.getElementById('headerAvatar');

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

        // Tam ekran giriş ekranını kapat, header'da oturum durumunu göster
        if (authScreen) authScreen.classList.add('hidden');
        if (headerUser) {
            headerUser.classList.remove('hidden');
            if (headerAvatar) {
                headerAvatar.alt = displayName;
                headerAvatar.onerror = () => {
                    headerAvatar.onerror = null;
                    headerAvatar.src = fallbackAvatar;
                };
                headerAvatar.src = photoUrl || fallbackAvatar;
            }
        }
    } else {
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
        if (syncStatus) {
            syncStatus.textContent = 'Senkronize değil';
            syncStatus.style.color = 'var(--text-secondary)';
        }

        // Oturum yok: tam ekran giriş ekranını göster (hesap seçme akışı buradan başlar)
        if (authScreen) authScreen.classList.remove('hidden');
        var hintEl = document.getElementById('authHint');
        if (hintEl) {
            hintEl.textContent = '';
            var allowed = (window.ALLOWED_EMAILS && window.ALLOWED_EMAILS.length) ? window.ALLOWED_EMAILS : [];
            if (allowed.length) {
                var hintLabel = document.createElement('span');
                hintLabel.className = 'auth-hint-label';
                hintLabel.textContent = 'İzinli hesaplar';
                hintEl.appendChild(hintLabel);
                var chipsWrap = document.createElement('div');
                chipsWrap.className = 'auth-chips';
                allowed.forEach(function (email) {
                    var chip = document.createElement('span');
                    chip.className = 'auth-chip';
                    chip.textContent = email;
                    chipsWrap.appendChild(chip);
                });
                hintEl.appendChild(chipsWrap);
            }
        }
        if (headerUser) headerUser.classList.add('hidden');
    }
}

window.loginWithGoogle = loginWithGoogle;
window.logout = logout;
window.updateAuthUI = updateAuthUI;
