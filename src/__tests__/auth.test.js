// ===== Auth Katmanı Testleri =====
// updateAuthUI (giriş ekranı + header oturum durumu) & login/logout akışları
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

// --- DOM element mock'ları ---
function makeEl() {
  return {
    classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(), toggle: vi.fn() },
    style: {},
    textContent: '',
    innerHTML: '',
    src: '',
    alt: '',
    disabled: false,
    onerror: null,
    onclick: null
  };
}

const els = {};

function resetDom() {
  Object.keys(els).forEach((k) => delete els[k]);
  ['googleLoginBtn', 'userProfile', 'userName', 'userAvatar', 'syncStatus', 'authScreen', 'authGoogleBtn', 'headerUser', 'headerAvatar', 'headerLogoutBtn'].forEach((id) => {
    els[id] = makeEl();
  });
  document.getElementById = vi.fn((id) => els[id] || null);
}

beforeAll(() => {
  resetDom();
  // loginWithGoogle PWA testi için gerekli globaller
  window.open = vi.fn();
  window.location = { ...window.location, origin: 'https://hedeflerim-2026.web.app', search: '' };
  window.navigator = { ...globalThis.navigator, standalone: false };
  window.showToast = vi.fn();
  // auth.js'in kullandığı GoogleAuthProvider mock'u: setCustomParameters destekli
  globalThis.GoogleAuthProvider = vi.fn(() => ({
    setCustomParameters: vi.fn()
  }));
});

afterEach(() => {
  // Varsayılan: web modu (PWA testi standalone bırakmasın)
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.clearAllMocks();
});

describe('updateAuthUI — tam ekran giriş ekranı (auth gate)', () => {
  it('oturum YOKSA giriş ekranı görünür, header kullanıcı alanı gizli', () => {
    resetDom();
    window.updateAuthUI(null);

    // authScreen: hidden kaldırılır → görünür
    expect(els.authScreen.classList.remove).toHaveBeenCalledWith('hidden');
    // header kullanıcı alanı gizli
    expect(els.headerUser.classList.add).toHaveBeenCalledWith('hidden');
    // Ayarlar paneli: Giriş Yap butonu görünür
    expect(els.googleLoginBtn.classList.remove).toHaveBeenCalledWith('hidden');
    expect(els.userProfile.classList.add).toHaveBeenCalledWith('hidden');
    // Senkron durumu
    expect(els.syncStatus.textContent).toBe('Senkronize değil');
  });

  it('oturum VARSA giriş ekranı gizli, header avatar + çıkış görünür', () => {
    resetDom();
    const user = {
      displayName: 'Test Kullanıcı',
      photoURL: 'https://example.com/avatar.jpg',
      email: 'test@test.com'
    };
    window.updateAuthUI(user);

    // authScreen gizlenir
    expect(els.authScreen.classList.add).toHaveBeenCalledWith('hidden');
    // header kullanıcı alanı görünür
    expect(els.headerUser.classList.remove).toHaveBeenCalledWith('hidden');
    expect(els.headerAvatar.src).toBe('https://example.com/avatar.jpg');
    expect(els.headerAvatar.alt).toBe('Test Kullanıcı');
    // Ayarlar paneli: profil görünür, Giriş Yap gizli
    expect(els.userProfile.classList.remove).toHaveBeenCalledWith('hidden');
    expect(els.googleLoginBtn.classList.add).toHaveBeenCalledWith('hidden');
    expect(els.userName.textContent).toBe('Test Kullanıcı');
    // Senkron durumu
    expect(els.syncStatus.textContent).toBe('Bulut bağlantısı aktif');
  });

  it('fotoğrafı olmayan kullanıcı için fallback avatar (SVG data URL) üretilir', () => {
    resetDom();
    const user = { displayName: 'Ali Veli', photoURL: '', email: 'test@test.com' };
    window.updateAuthUI(user);

    expect(els.headerAvatar.src).toMatch(/^data:image\/svg\+xml/);
    expect(els.userAvatar.src).toMatch(/^data:image\/svg\+xml/);
  });

  it('displayName boşsa "Kullanıcı" gösterilir', () => {
    resetDom();
    window.updateAuthUI({ displayName: '   ', photoURL: '', email: 'test@test.com' });
    expect(els.userName.textContent).toBe('Kullanıcı');
  });
});

describe('logout', () => {
  it('çıkış yapınca signOut çağrılır ve toast gösterilir', async () => {
    resetDom();
    const signOutMock = globalThis.signOut;
    signOutMock.mockClear();
    await window.logout();
    expect(signOutMock).toHaveBeenCalled();
    expect(window.showToast).toHaveBeenCalledWith('Çıkış yapıldı');
  });
});

describe('loginWithGoogle — hesap seçme akışı', () => {
  it('web modunda signInWithPopup çağrılır (hesap seçme popup\'ı)', async () => {
    resetDom();
    const popupMock = globalThis.signInWithPopup;
    popupMock.mockClear();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

    await window.loginWithGoogle();

    expect(popupMock).toHaveBeenCalled();
    expect(window.showToast).toHaveBeenCalledWith('Giriş başarılı');
  });

  it('PWA (standalone) modunda Chrome sekmesi açılır, popup çağrılmaz', async () => {
    resetDom();
    const popupMock = globalThis.signInWithPopup;
    popupMock.mockClear();
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

    await window.loginWithGoogle();

    expect(window.open).toHaveBeenCalledWith('https://hedeflerim-2026.web.app/?pwa_login=1', '_blank');
    expect(popupMock).not.toHaveBeenCalled();
  });

  it('Firebase yapılandırması yoksa auth devre dışı bırakılır (config-yok branch korundu)', () => {
    const fs = require('fs');
    const path = require('path');
    const firebaseSrc = fs.readFileSync(path.resolve(__dirname, '../../src/services/firebase.js'), 'utf8');
    // Config yoksa: auth null + uyarı + giriş devre dışı
    expect(firebaseSrc).toContain('window.auth = null');
    expect(firebaseSrc).toContain('Cloud sync and Google sign-in are disabled');
    // auth.js: auth yokken kullanıcıya net hata toast'u
    const authSrc = fs.readFileSync(path.resolve(__dirname, '../../src/services/auth.js'), 'utf8');
    expect(authSrc).toContain('Firebase yapılandırması eksik. Giriş devre dışı.');
  });

  it('PWA giriş isteğinde başarılı giriş signOut ile kapatılmaz (oturum korunur)', () => {
    const fs = require('fs');
    const path = require('path');
    const firebaseSrc = fs.readFileSync(path.resolve(__dirname, '../../src/services/firebase.js'), 'utf8');
    // ?pwa_login=1 sekmesinde giriş tamamlanınca oturum AÇIK kalmalı: onAuthStateChanged'in
    // user branch'inde pwaLoginRequested'e bağlı signOut YOK (eski davranış girişi anında
    // kapatıp sonsuz döngüye sokuyordu). Hesap seçimi select_account ile sağlanır.
    const userBranchIdx = firebaseSrc.indexOf('if (user) {');
    expect(userBranchIdx).toBeGreaterThan(-1);
    const userBranch = firebaseSrc.slice(userBranchIdx, userBranchIdx + 800);
    expect(userBranch).not.toContain('signOut(auth)');
    expect(userBranch).toContain('window.loadFromCloud()');
    // Oturum-yok branch'i korunmuş olmalı: pwa_login flag tespiti hâlâ mevcut
    expect(firebaseSrc).toContain("get('pwa_login') === '1'");
  });
});

describe('auth gate — index.html statik yapısı', () => {
  it('authScreen ve headerUser DOM\'da mevcut (id + hidden başlangıç)', () => {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');

    expect(html).toContain('id="authScreen"');
    expect(html).toContain('class="auth-screen hidden"');
    expect(html).toContain('id="authGoogleBtn"');
    expect(html).toContain('Google ile devam et');
    expect(html).toContain('id="headerUser"');
    expect(html).toContain('id="headerLogoutBtn"');
  });

  it('authGoogleBtn click listener\'ı app.js _initAuthButtons\'ta bağlı (ölü buton regresyonu)', () => {
    const fs = require('fs');
    const path = require('path');
    const appSrc = fs.readFileSync(path.resolve(__dirname, '../../src/components/app.js'), 'utf8');
    const idx = appSrc.indexOf('function _initAuthButtons');
    expect(idx).toBeGreaterThan(-1);
    const fnBlock = appSrc.slice(idx, idx + 400);
    // Hem Ayarlar'daki hem tam ekran giriş ekranındaki buton aynı akışa bağlanmalı
    expect(fnBlock).toContain("getElementById('googleLoginBtn')");
    expect(fnBlock).toContain("getElementById('authGoogleBtn')");
    expect(fnBlock.match(/addEventListener\('click', window\.loginWithGoogle\)/g) || []).toHaveLength(2);
  });
});
