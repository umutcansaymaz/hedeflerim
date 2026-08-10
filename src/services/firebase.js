// ===== Firebase Service =====
// Hedeflerim - Firebase init & auth state (singleton pattern)

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, getRedirectResult, setPersistence, browserLocalPersistence, signOut, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { initializeFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// ===== Firebase Config =====
// Public repo default: keep real project values out of source control.
// Use src/config/firebase-config.example.js as the template for your own values.
const firebaseConfig = window.HDEFLERIM_FIREBASE_CONFIG || {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: ""
};

// ===== Firebase Globals =====
let db, auth;

// PWA'dan gelen giris istegi (?pwa_login=1): web sekmesinde oturum yoksa otomatik Google giris akisi
const pwaLoginRequested = new URLSearchParams(window.location.search).get('pwa_login') === '1';
let pwaLoginAttempted = false;

// ===== Allowed Users Whitelist =====
const ALLOWED_EMAILS = Array.isArray(window.HDEFLERIM_ALLOWED_EMAILS)
    ? window.HDEFLERIM_ALLOWED_EMAILS
    : [];

function hasFirebaseConfig(config) {
    return Boolean(
        config &&
        config.apiKey &&
        config.authDomain &&
        config.projectId &&
        config.appId
    );
}

// ===== Initialize Firebase =====
try {
    if (!hasFirebaseConfig(firebaseConfig)) {
        window.debugWarn('Firebase config missing. Cloud sync and Google sign-in are disabled.');
        window.db = null;
        window.auth = null;
        window.ALLOWED_EMAILS = ALLOWED_EMAILS;
        window.currentUser = null;
    } else {
        const app = initializeApp(firebaseConfig);
        db = initializeFirestore(app, { ignoreUndefinedProperties: true });
        auth = getAuth(app);
        window.debugLog('Firebase initialized');

        // Firestore local cache improves perceived performance and supports offline usage.
        try {
            enableMultiTabIndexedDbPersistence(db)
                .then(() => window.debugLog('Firestore persistence enabled'))
                .catch((err) => window.debugWarn('Firestore persistence not enabled:', err));
        } catch (err) {
            window.debugWarn('Firestore persistence init error:', err);
        }

        onAuthStateChanged(auth, user => {
            if (user && user.email && !ALLOWED_EMAILS.includes(user.email)) {
                window.debugWarn('Unauthorized login attempt blocked: ' + user.email);
                signOut(auth).then(() => {
                    window.showToast('Giris izniniz yok: ' + user.email + '. Izinli hesaplar: ' + (ALLOWED_EMAILS.join(', ') || 'bos'));
                });
                window.currentUser = null;
                window.updateAuthUI(null);
                return;
            }

            window.currentUser = user;
            window.updateAuthUI(user);
            if (user) {
                window.loadFromCloud().finally(() => {
                    if (appData.settings?.notificationsEnabled && Notification.permission === 'granted') {
                        window.ensurePushSubscription({ silent: true });
                    }
                });
            } else {
                lastCloudSnapshot = null;
                pendingCloudLoad = false;
                cloudRetryCount = 0;
                window.clearCloudRetryTimer();

                // PWA'dan gelen giris istegi: web sekmesinde oturum yoksa Google girisini baslat.
                // (PWA penceresi ?pwa_login=1 ile web surumunu acti -> burada redirect akisi tamamlanir.)
                if (pwaLoginRequested && !pwaLoginAttempted) {
                    pwaLoginAttempted = true;
                    window.debugLog('PWA login: web oturumu yok, Google giris akisi baslatiliyor');
                    const pwaProvider = new GoogleAuthProvider();
                    // Google hesap secme ekranini zorla goster
                    pwaProvider.setCustomParameters({ prompt: 'select_account' });
                    signInWithRedirect(auth, pwaProvider).catch((err) => {
                        window.debugWarn('PWA login redirect hatasi:', err);
                        window.showToast('Google giris baslatilamadi: ' + err.message);
                    });
                }
            }
        });

        getRedirectResult(auth).then((result) => {
            if (result.user) {
                window.debugLog('User signed in via redirect');
            }
        }).catch((error) => {
            window.debugWarn('Redirect auth error:', error);
        });

        setPersistence(auth, browserLocalPersistence)
            .then(() => window.debugLog('Persistence set to LOCAL'))
            .catch((err) => console.error('Persistence error:', err));

        window.db = db;
        window.auth = auth;
        window.ALLOWED_EMAILS = ALLOWED_EMAILS;
    }
} catch (error) {
    console.error('Firebase Error:', error);
}
