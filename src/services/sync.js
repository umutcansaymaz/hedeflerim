// ===== Sync Service =====
// Hedeflerim — cloud sync, error logging, sync diagnostics

import { doc, collection, getDoc, getDocs, writeBatch, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const db = window.db;
const auth = window.auth;

// ===== Sync Globals =====
const SYNC_EVENT_MAX = 40;
let syncEvents = [];
const cloudSyncStats = {
    lastCloudLoadAt: '',
    lastCloudSaveAt: '',
    lastCloudErrorAt: '',
    lastCloudError: '',
    lastCloudWriteOps: 0,
    lastCloudWriteMs: 0
};
let errorLog = [];
let lastErrorUploadAt = 0;
let errorUploadTimer = null;
let pendingErrorUploads = [];

// ===== Cloud Fetch =====

async function fetchCloudBundle(userId) {
    const userRef = doc(db, 'users', userId);
    const [rootDoc, stateDoc, habitsSnap, todosSnap, booksSnap, notesSnap, focusSessionsSnap] = await Promise.all([
        getDoc(userRef),
        getDoc(doc(db, 'users', userId, 'meta', window.CLOUD_META_STATE_DOC_ID)),
        getDocs(collection(db, 'users', userId, 'habits')),
        getDocs(collection(db, 'users', userId, 'todos')),
        getDocs(collection(db, 'users', userId, 'books')),
        getDocs(collection(db, 'users', userId, 'notes')),
        getDocs(collection(db, 'users', userId, 'focusSessions'))
    ]);

    const rootData = rootDoc.exists ? rootDoc.data() : null;
    const hasV2Data = Boolean(
        stateDoc.exists ||
        !habitsSnap.empty ||
        !todosSnap.empty ||
        !booksSnap.empty ||
        !notesSnap.empty ||
        !focusSessionsSnap.empty
    );

    return {
        rootData,
        hasV2Data,
        v2Data: hasV2Data
            ? window.buildCloudV2DataFromDocs(stateDoc.exists ? stateDoc.data() : {}, habitsSnap, todosSnap, booksSnap, notesSnap, focusSessionsSnap)
            : null,
        legacyData: window.hasLegacyCloudPayload(rootData) ? window.normalizeAppData(rootData) : null
    };
}

async function commitCloudOperations(operations) {
    if (!Array.isArray(operations) || operations.length === 0) return;

    for (let i = 0; i < operations.length; i += window.CLOUD_BATCH_LIMIT) {
        const chunk = operations.slice(i, i + window.CLOUD_BATCH_LIMIT);
        const batch = writeBatch(db);
        chunk.forEach(op => {
            if (op.type === 'set') {
                batch.set(op.ref, op.data, op.options || {});
            } else if (op.type === 'delete') {
                batch.delete(op.ref);
            }
        });
        await batch.commit();
    }
}

async function migrateLegacyCloudDataIfNeeded(userId, legacyData) {
    const userRef = doc(db, 'users', userId);
    const migrationRef = doc(db, 'users', userId, 'meta', window.CLOUD_META_MIGRATION_DOC_ID);
    const migrationDoc = await getDoc(migrationRef);
    const alreadyMigrated = migrationDoc.exists && migrationDoc.data()?.legacyMigrated === true;
    if (alreadyMigrated) return;

    const normalizedLegacy = window.cloneNormalizedDataSnapshot(legacyData);
    const baseline = window.normalizeAppData(window.defaultData);
    const operations = window.buildCloudWriteOperations(userId, normalizedLegacy, baseline);
    operations.push({
        type: 'set',
        ref: migrationRef,
        data: {
            legacyMigrated: true,
            sourceSchemaVersion: Number(legacyData?.schemaVersion || 1),
            migratedAt: serverTimestamp(),
            updatedAt: new Date().toISOString()
        },
        options: { merge: true }
    });

    await commitCloudOperations(operations);
    lastCloudSnapshot = normalizedLegacy;
}

async function loadRemoteV2Snapshot(userId) {
    const bundle = await fetchCloudBundle(userId);
    return bundle.hasV2Data ? bundle.v2Data : null;
}

// ===== Conflict Guard =====

async function _checkCloudConflictBeforeSave() {
    if (lastCloudRootUpdatedAtMs <= 0) return null;
    const now = Date.now();
    if (now - lastCloudRootCheckAtMs <= 15000) return null;
    lastCloudRootCheckAtMs = now;
    try {
        const rootDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const remoteMs = window.getFirestoreTimestampMs(rootDoc.exists ? rootDoc.data()?.updatedAt : null);
        if (remoteMs > 0 && remoteMs > lastCloudRootUpdatedAtMs + 1000) {
            pushSyncEvent('cloud', 'Bulut verisi başka cihazda güncellendi. Önce indiriliyor...');
            pendingCloudSave = true;
            await loadFromCloud();
            return false;
        }
    } catch {
        // ignore root check errors
    }
    return null;
}

// ===== Save to Cloud (split for GR-SP01) =====

function _updateCloudSaveUI(operations, writeStart) {
    cloudSyncStats.lastCloudSaveAt = new Date().toISOString();
    cloudSyncStats.lastCloudWriteOps = Array.isArray(operations) ? operations.length : 0;
    cloudSyncStats.lastCloudWriteMs = Math.max(0, Date.now() - writeStart);
    pushSyncEvent('cloud', `Kayıt tamamlandı (${cloudSyncStats.lastCloudWriteOps} işlem, ${cloudSyncStats.lastCloudWriteMs}ms)`);

    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = `Kaydedildi: ${window.formatTime(new Date())}`;
        syncStatus.style.color = 'var(--success)';
    }
    if (document.getElementById('syncStatusModal')?.classList.contains('active')) {
        renderSyncStatusModal();
    }
}

function _handleCloudSaveError(error) {
    console.error('Cloud save error:', error);
    const safeMessage = String(error?.message || error || 'Bulut kayıt hatası');
    const transient = !window.isNetworkOnline() || isTransientCloudError(error);

    cloudSyncStats.lastCloudErrorAt = new Date().toISOString();
    cloudSyncStats.lastCloudError = safeMessage;
    pushSyncEvent('error', `Bulut kayıt hatası: ${safeMessage}`);
    logAppError(error, { kind: 'cloud_save' });

    if (transient) {
        pendingCloudSave = true;
        cloudRetryCount = Math.min(cloudRetryCount + 1, 8);
        if (window.isNetworkOnline()) {
            scheduleCloudRetry(1500);
        } else {
            const now = Date.now();
            if (now - lastOfflineSaveNoticeAt > 15000) {
                lastOfflineSaveNoticeAt = now;
                window.showToast('Çevrimdışı: değişiklikler yerelde tutuldu, bağlantı gelince buluta aktarılacak.');
            }
        }
    } else {
        cloudRetryCount = 0;
        clearCloudRetryTimer();
        window.showToast(`Bulut kayıt hatası: ${safeMessage}`);
    }
}

async function saveToCloud(force = false) {
    if (!currentUser || !db) return false;

    if (!window.isNetworkOnline()) {
        pendingCloudSave = true;
        const now = Date.now();
        if (now - lastOfflineSaveNoticeAt > 15000) {
            lastOfflineSaveNoticeAt = now;
            pushSyncEvent('net', 'Çevrimdışı: bulut kaydı beklemeye alındı.');
        }
        return false;
    }

    if (cloudLoadInFlight && !force) {
        pendingCloudSave = true;
        return false;
    }

    if (cloudSaveInFlight && !force) {
        pendingCloudSave = true;
        return false;
    }

    if (cloudSaveTimer && force) {
        clearTimeout(cloudSaveTimer);
        cloudSaveTimer = null;
    }
    if (force) {
        clearCloudRetryTimer();
    }

    // Conflict guard
    const conflictResult = await _checkCloudConflictBeforeSave();
    if (conflictResult === false) return false;

    cloudSaveInFlight = true;
    pendingCloudSave = false;

    try {
        pushSyncEvent('cloud', 'Buluta kaydediliyor...');
        const writeStart = Date.now();
        const localSnapshot = window.cloneNormalizedDataSnapshot(appData);
        let baseSnapshot = lastCloudSnapshot ? window.cloneNormalizedDataSnapshot(lastCloudSnapshot) : null;
        if (!baseSnapshot) {
            baseSnapshot = await loadRemoteV2Snapshot(currentUser.uid);
        }
        if (!baseSnapshot) {
            baseSnapshot = window.normalizeAppData(window.defaultData);
        }

        const operations = window.buildCloudWriteOperations(currentUser.uid, localSnapshot, baseSnapshot);
        await commitCloudOperations(operations);
        lastCloudSnapshot = localSnapshot;
        lastCloudRootUpdatedAtMs = Date.now();
        cloudRetryCount = 0;
        clearCloudRetryTimer();

        _updateCloudSaveUI(operations, writeStart);
        return true;
    } catch (error) {
        _handleCloudSaveError(error);
        return false;
    } finally {
        cloudSaveInFlight = false;
        if (pendingCloudSave && window.isNetworkOnline()) {
            queueCloudSave(400);
        }
    }
}

// ===== Load from Cloud (split for GR-SP01) =====

function _processCloudLoadResult(cloudBundle, migratedFromLegacy) {
    const normalizedCloud = window.cloneNormalizedDataSnapshot(cloudBundle);
    const mergedData = window.cloneNormalizedDataSnapshot(window.mergeAppDataForSync(window.appData, normalizedCloud));
    const cloudPayload = JSON.stringify(normalizedCloud);
    const mergedPayload = JSON.stringify(mergedData);

    window.appData = mergedData;
    window.syncWeeklyReviewStoreFromAppData();
    window.flushPendingLocalSave();
    window.loadTheme();
    window.refreshReminderSchedule();

    const activeTabId = document.querySelector('.tab-btn.active')?.dataset.tab || 'dashboard';
    setTimeout(() => {
        window.renderTabContent(activeTabId);
    }, 0);

    lastCloudSnapshot = normalizedCloud;
    if (mergedPayload !== cloudPayload) {
        queueCloudSave(350);
        window.showToast(migratedFromLegacy ? 'Eski bulut verisi taşındı ve birleştirildi' : 'Veriler buluttan indirildi ve birleştirildi');
    } else {
        lastCloudSnapshot = mergedData;
        window.showToast(migratedFromLegacy ? 'Eski bulut verisi yeni yapıya taşındı' : 'Veriler buluttan indirildi');
    }

    cloudSyncStats.lastCloudLoadAt = new Date().toISOString();
    pushSyncEvent('cloud', `Yükleme tamamlandı (${mergedData.habits.length} alışkanlık, ${mergedData.todos.length} görev, ${mergedData.books.length} kitap, ${mergedData.notes.length} not).`);
    if (document.getElementById('syncStatusModal')?.classList.contains('active')) {
        renderSyncStatusModal();
    }
    return true;
}

async function _handleNoCloudData() {
    window.debugLog('No cloud data found, uploading local data...');
    const uploaded = await saveToCloud(true);
    if (uploaded) {
        pushSyncEvent('cloud', 'Bulutta veri yoktu, yerel veri yüklendi.');
        window.showToast('Yerel veriler buluta yüklendi');
    } else {
        pendingCloudSave = true;
        pushSyncEvent('cloud', 'Bulutta veri yok; yerel veri ilk uygun anda yüklenecek.');
    }
    return uploaded;
}

async function loadFromCloud() {
    if (!currentUser || !db) return false;

    if (cloudLoadInFlight) {
        pendingCloudLoad = true;
        return false;
    }

    if (!window.isNetworkOnline()) {
        pendingCloudLoad = true;
        pushSyncEvent('net', 'Çevrimdışı: bulut yükleme ertelendi.');
        return false;
    }

    cloudLoadInFlight = true;
    pendingCloudLoad = false;

    try {
        pushSyncEvent('cloud', 'Bulut verisi indiriliyor...');
        const cloudBundle = await fetchCloudBundle(currentUser.uid);
        const rootUpdatedMs = window.getFirestoreTimestampMs(cloudBundle?.rootData?.updatedAt);
        if (rootUpdatedMs > 0) {
            lastCloudRootUpdatedAtMs = rootUpdatedMs;
            lastCloudRootCheckAtMs = Date.now();
        }
        let cloudData = null;
        let migratedFromLegacy = false;

        if (cloudBundle.hasV2Data && cloudBundle.v2Data) {
            cloudData = cloudBundle.v2Data;
        } else if (cloudBundle.legacyData) {
            cloudData = cloudBundle.legacyData;
            await migrateLegacyCloudDataIfNeeded(currentUser.uid, cloudData);
            migratedFromLegacy = true;
        }

        if (!cloudData) {
            return await _handleNoCloudData();
        }

        return _processCloudLoadResult(cloudData, migratedFromLegacy);
    } catch (error) {
        console.error('Cloud load error:', error);
        const safeMessage = String(error?.message || error || 'Bulut yükleme hatası');
        cloudSyncStats.lastCloudErrorAt = new Date().toISOString();
        cloudSyncStats.lastCloudError = safeMessage;
        pushSyncEvent('error', `Bulut yükleme hatası: ${safeMessage}`);
        logAppError(error, { kind: 'cloud_load' });
        window.showToast(`Senkronizasyon hatası: ${safeMessage}`);
        return false;
    } finally {
        cloudLoadInFlight = false;
        if (pendingCloudLoad && window.isNetworkOnline()) {
            pendingCloudLoad = false;
            setTimeout(() => loadFromCloud(), 500);
        }
    }
}

// ===== Retry Helpers =====

function clearCloudRetryTimer() {
    if (!cloudRetryTimer) return;
    clearTimeout(cloudRetryTimer);
    cloudRetryTimer = null;
}

function isTransientCloudError(error) {
    const code = String(error?.code || '').toLowerCase();
    if (!code) return false;
    return code.includes('unavailable')
        || code.includes('deadline-exceeded')
        || code.includes('aborted')
        || code.includes('internal')
        || code.includes('resource-exhausted')
        || code.includes('network');
}

function scheduleCloudRetry(baseDelayMs = 1600) {
    if (!currentUser || !db) return;
    if (!window.isNetworkOnline()) return;
    if (cloudRetryTimer) return;

    const safeBase = Math.max(800, Math.floor(Number(baseDelayMs) || 1600));
    const backoff = Math.min(60000, Math.round(safeBase * Math.pow(1.9, Math.max(0, cloudRetryCount))));
    const jitter = Math.floor(Math.random() * 500);
    const delay = backoff + jitter;

    cloudRetryTimer = setTimeout(() => {
        cloudRetryTimer = null;
        if (!currentUser || !db) return;
        if (!window.isNetworkOnline()) return;
        pendingCloudSave = true;
        saveToCloud();
    }, delay);
}

// ===== Queue =====

function queueCloudSave(delayMs = window.CLOUD_SAVE_DEBOUNCE_MS) {
    if (!currentUser || !db) return;
    pendingCloudSave = true;
    if (!window.isNetworkOnline()) {
        const now = Date.now();
        if (now - lastOfflineSaveNoticeAt > 15000) {
            lastOfflineSaveNoticeAt = now;
            pushSyncEvent('net', 'Çevrimdışı: değişiklikler sıraya alındı.');
        }
        return;
    }
    clearCloudRetryTimer();
    if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => {
        cloudSaveTimer = null;
        if (pendingCloudSave) {
            saveToCloud();
        }
    }, delayMs);
}

// ===== Error Log =====

function loadErrorLog() {
    try {
        const raw = localStorage.getItem(window.ERROR_LOG_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        errorLog = Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [];
    } catch {
        errorLog = [];
    }
    errorLog = errorLog.slice(0, 50);
}

function persistErrorLog() {
    try {
        localStorage.setItem(window.ERROR_LOG_STORAGE_KEY, JSON.stringify(errorLog.slice(0, 50)));
    } catch {
        // ignore
    }
}

function clearErrorLog() {
    errorLog = [];
    pendingErrorUploads = [];
    persistErrorLog();
}

function sanitizeStack(value) {
    const raw = typeof value === 'string' ? value : '';
    if (!raw) return '';
    return raw.length > 4000 ? raw.slice(0, 4000) : raw;
}

function enqueueErrorUpload(entry) {
    if (!currentUser || !db) return;
    pendingErrorUploads.push(entry);
    if (errorUploadTimer) return;

    errorUploadTimer = setTimeout(async () => {
        errorUploadTimer = null;
        if (!currentUser || !db || pendingErrorUploads.length === 0) return;

        const now = Date.now();
        if (now - lastErrorUploadAt < 15000) return;
        lastErrorUploadAt = now;

        const batch = writeBatch(db);
        const userRef = doc(db, 'users', currentUser.uid);
        const chunk = pendingErrorUploads.splice(0, 5);
        chunk.forEach(item => {
            const docId = item.id || window.generateId();
            const ref = doc(db, 'users', currentUser.uid, 'errors', docId);
            batch.set(ref, {
                ...item,
                userId: currentUser.uid,
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: false });
        });
        try {
            await batch.commit();
        } catch {
            // ignore upload failures
        }
    }, 1200);
}

function logAppError(errorLike, context = {}) {
    const nowIso = new Date().toISOString();
    const message = (errorLike && typeof errorLike === 'object' && 'message' in errorLike)
        ? String(errorLike.message || 'Hata')
        : String(errorLike || 'Hata');

    const stack = (errorLike && typeof errorLike === 'object' && 'stack' in errorLike)
        ? sanitizeStack(errorLike.stack)
        : '';

    const extra = {};
    const source = window.truncateText(String(context.source || ''), 80);
    if (source) extra.source = source;
    if (Number.isFinite(Number(context.lineno))) extra.lineno = Math.floor(Number(context.lineno));
    if (Number.isFinite(Number(context.colno))) extra.colno = Math.floor(Number(context.colno));

    const entry = {
        id: window.generateId(),
        createdAt: nowIso,
        kind: window.truncateText(String(context.kind || 'error'), 24),
        message: window.truncateText(window.decodeMojibakeText(message), 500),
        stack,
        page: window.truncateText(String(location?.pathname || '/'), 120),
        tab: window.truncateText(window.getActiveTabId(), 24),
        online: navigator.onLine === true,
        appVersion: window.APP_VERSION,
        extra
    };

    errorLog.unshift(entry);
    errorLog = errorLog.slice(0, 50);
    persistErrorLog();
    enqueueErrorUpload(entry);
    try {
        pushSyncEvent('error', entry.message);
        if (document.getElementById('syncStatusModal')?.classList.contains('active')) {
            renderSyncStatusModal();
        }
    } catch {
        // ignore
    }
}

function initGlobalErrorCapture() {
    if (window.__appErrorCaptureInitialized) return;
    window.__appErrorCaptureInitialized = true;

    window.addEventListener('error', (event) => {
        try {
            logAppError(event?.error || event?.message || 'Hata', {
                kind: 'error',
                source: event?.filename || '',
                lineno: event?.lineno,
                colno: event?.colno
            });
        } catch {
            // ignore
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        try {
            logAppError(event?.reason || 'Promise hatası', { kind: 'unhandledrejection' });
        } catch {
            // ignore
        }
    });
}

// ===== Sync Events =====

function pushSyncEvent(kind, message) {
    const entry = {
        id: window.generateId(),
        createdAt: new Date().toISOString(),
        kind: window.truncateText(String(kind || 'info'), 24),
        message: window.truncateText(window.decodeMojibakeText(String(message || '')), 260)
    };
    syncEvents.unshift(entry);
    syncEvents = syncEvents.slice(0, SYNC_EVENT_MAX);
}

function copyTextToClipboard(text) {
    const value = String(text || '');
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(value);
    }
    return new Promise((resolve, reject) => {
        try {
            const el = document.createElement('textarea');
            el.value = value;
            el.setAttribute('readonly', 'readonly');
            el.style.position = 'fixed';
            el.style.top = '-1000px';
            el.style.left = '-1000px';
            document.body.appendChild(el);
            el.focus();
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

function buildSyncDebugReport() {
    const user = currentUser
        ? {
            uid: currentUser.uid,
            email: currentUser.email || '',
            name: currentUser.displayName || ''
        }
        : null;

    return {
        generatedAt: new Date().toISOString(),
        app: {
            version: window.APP_VERSION,
            perfMode: PERFORMANCE_MODE
        },
        auth: {
            signedIn: Boolean(currentUser),
            user
        },
        network: {
            online: navigator.onLine === true
        },
        cloud: {
            inFlight: cloudSaveInFlight === true,
            loadInFlight: cloudLoadInFlight === true,
            pendingSave: pendingCloudSave === true,
            pendingLoad: pendingCloudLoad === true,
            retryCount: cloudRetryCount,
            lastRootUpdatedAt: lastCloudRootUpdatedAtMs ? new Date(lastCloudRootUpdatedAtMs).toISOString() : '',
            stats: { ...cloudSyncStats }
        },
        counters: {
            habits: appData.habits?.length || 0,
            todos: appData.todos?.length || 0,
            books: appData.books?.length || 0,
            notes: appData.notes?.length || 0,
            focusSessions: appData.focusSessions?.length || 0
        },
        recentEvents: (syncEvents || []).slice(0, 20),
        recentErrors: (errorLog || []).slice(0, 20)
    };
}

// ===== Sync Status Modal (UI) =====

function renderSyncStatusModal() {
    const grid = document.getElementById('syncStatusGrid');
    const eventsList = document.getElementById('syncEventsList');
    const errorsList = document.getElementById('syncErrorsList');
    if (!grid || !eventsList || !errorsList) return;

    const signedIn = Boolean(currentUser);
    const userLabel = signedIn
        ? `${currentUser.displayName || 'Kullanıcı'} • ${currentUser.email || ''}`
        : 'Giriş yapılmadı';

    const pendingLabel = cloudSaveInFlight
        ? 'Kaydediliyor...'
        : pendingCloudSave
            ? 'Bekleyen kayıt var'
            : 'Hazır';

    const lastLoad = cloudSyncStats.lastCloudLoadAt ? window.formatShortDateTime(cloudSyncStats.lastCloudLoadAt) : '-';
    const lastSave = cloudSyncStats.lastCloudSaveAt ? window.formatShortDateTime(cloudSyncStats.lastCloudSaveAt) : '-';
    const lastErr = cloudSyncStats.lastCloudErrorAt ? window.formatShortDateTime(cloudSyncStats.lastCloudErrorAt) : '-';
    const rootUpdated = lastCloudRootUpdatedAtMs ? new Date(lastCloudRootUpdatedAtMs).toLocaleString('tr-TR') : '-';

    grid.innerHTML = `
        <div class="sync-status-card">
            <div class="sync-status-k">Hesap</div>
            <div class="sync-status-v">${safeText(userLabel)}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Bağlantı</div>
            <div class="sync-status-v">${navigator.onLine === true ? 'Online' : 'Offline'}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Senkron</div>
            <div class="sync-status-v">${safeText(pendingLabel)}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Son Yükleme</div>
            <div class="sync-status-v">${safeText(lastLoad)}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Son Kayıt</div>
            <div class="sync-status-v">${safeText(lastSave)}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Son Hata</div>
            <div class="sync-status-v">${safeText(lastErr)}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Bulut Zamanı</div>
            <div class="sync-status-v">${safeText(rootUpdated)}</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Veri</div>
            <div class="sync-status-v">${appData.habits?.length || 0} alışkanlık • ${appData.todos?.length || 0} görev • ${appData.books?.length || 0} kitap</div>
        </div>
        <div class="sync-status-card">
            <div class="sync-status-k">Not / Odak</div>
            <div class="sync-status-v">${appData.notes?.length || 0} not • ${appData.focusSessions?.length || 0} oturum</div>
        </div>
    `;

    const events = Array.isArray(syncEvents) ? syncEvents.slice(0, 20) : [];
    eventsList.innerHTML = events.length === 0
        ? `<div class="sync-status-item"><span>Henüz olay yok.</span></div>`
        : events.map(item => `
            <div class="sync-status-item">
                <strong>${safeText(item.kind, 'info')}</strong>
                <span>${safeText(window.formatShortDateTime(item.createdAt))} • ${safeText(item.message)}</span>
            </div>
        `).join('');

    const errors = Array.isArray(errorLog) ? errorLog.slice(0, 20) : [];
    errorsList.innerHTML = errors.length === 0
        ? `<div class="sync-status-item"><span>Son hatalarda kayıt yok.</span></div>`
        : errors.map(item => `
            <div class="sync-status-item">
                <strong>${safeText(item.kind, 'error')}</strong>
                <span>${safeText(window.formatShortDateTime(item.createdAt))} • ${safeText(item.message)}</span>
            </div>
        `).join('');
}

function openSyncStatusModal() {
    closeModal('settingsModal');
    openModal('syncStatusModal');
    renderSyncStatusModal();
}

function closeSyncStatusModal() {
    closeModal('syncStatusModal');
}

// Export all public functions globally for module scripts
window.queueCloudSave = queueCloudSave;
window.saveToCloud = saveToCloud;
window.loadFromCloud = loadFromCloud;
window.clearCloudRetryTimer = clearCloudRetryTimer;
window.clearErrorLog = clearErrorLog;
window.logAppError = logAppError;
window.buildSyncDebugReport = buildSyncDebugReport;
window.renderSyncStatusModal = renderSyncStatusModal;
window.openSyncStatusModal = openSyncStatusModal;
window.closeSyncStatusModal = closeSyncStatusModal;
window.loadErrorLog = loadErrorLog;
window.pushSyncEvent = pushSyncEvent;
window.copyTextToClipboard = copyTextToClipboard;
window.initGlobalErrorCapture = initGlobalErrorCapture;
