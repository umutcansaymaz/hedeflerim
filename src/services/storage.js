// ===== Storage Service =====
// Hedeflerim — local storage (localStorage) data management

// ===== Data Load/Save =====

function loadData() {
    try {
        const storedData = localStorage.getItem(window.STORAGE_KEY);
        if (storedData) {
            window.appData = window.normalizeAppData(JSON.parse(storedData));
        } else {
            window.appData = window.normalizeAppData(window.defaultData);
        }
    } catch (e) {
        console.error('Error loading data:', e);
        window.appData = window.normalizeAppData(window.defaultData);
    }
}

function persistLocalDataNow() {
    const payload = JSON.stringify(window.appData);
    if (payload === window.lastPersistedPayload) return;
    localStorage.setItem(window.STORAGE_KEY, payload);
    window.lastPersistedPayload = payload;
}

function queueLocalSave() {
    if (localSaveTimer) clearTimeout(localSaveTimer);
    localSaveTimer = setTimeout(() => {
        localSaveTimer = null;
        try {
            persistLocalDataNow();
        } catch (e) {
            console.error('Error saving local data:', e);
            window.showToast('Veri kaydedilemedi!');
        }
    }, window.LOCAL_SAVE_DEBOUNCE_MS);
}

function flushPendingLocalSave() {
    if (window.localSaveTimer) {
        clearTimeout(window.localSaveTimer);
        window.localSaveTimer = null;
    }
    try {
        persistLocalDataNow();
    } catch {
        // ignore
    }
}

function saveData(skipCloudSave = false, options = {}) {
    const immediate = options.immediate === true;
    window.appData = window.normalizeAppData(window.appData);

    window.checkAchievements();

    try {
        const payload = JSON.stringify(window.appData);
        const dataChanged = payload !== window.lastPersistedPayload;

        if (immediate) {
            if (window.localSaveTimer) {
                clearTimeout(window.localSaveTimer);
                window.localSaveTimer = null;
            }
            if (dataChanged) {
                localStorage.setItem(window.STORAGE_KEY, payload);
                window.lastPersistedPayload = payload;
            }
        } else if (dataChanged) {
            queueLocalSave();
        }

        if (window.currentUser && !skipCloudSave && dataChanged) {
            if (immediate) {
                window.pendingCloudSave = true;
                if (window.isNetworkOnline()) {
                    window.saveToCloud(true);
                }
            } else {
                window.queueCloudSave();
            }
        }
    } catch (e) {
        console.error('Error saving data:', e);
        window.showToast('Veri kaydedilemedi!');
    }
}

// ===== Trash Bin =====

function loadTrashBin() {
    try {
        const raw = localStorage.getItem(window.TRASH_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        window.trashBin = Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [];
    } catch {
        window.trashBin = [];
    }
    pruneTrashBin();
}

function persistTrashBin() {
    localStorage.setItem(window.TRASH_STORAGE_KEY, JSON.stringify(window.trashBin));
}

function pruneTrashBin() {
    const threshold = Date.now() - (window.TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    window.trashBin = (window.trashBin || []).filter(item => {
        const deletedAt = Date.parse(item?.deletedAt || '');
        return Number.isFinite(deletedAt) && deletedAt >= threshold;
    });
    persistTrashBin();
}

function addToTrash(type, item) {
    if (!item || typeof item !== 'object' || !item.id) return null;
    pruneTrashBin();
    const entry = {
        trashId: window.generateId(),
        type,
        label: item.name || item.title || item.text || item.content?.slice(0, 80) || 'Kayıt',
        deletedAt: new Date().toISOString(),
        payload: item
    };
    window.trashBin.unshift(entry);
    persistTrashBin();
    return entry;
}

function restoreTrashEntryById(trashId) {
    const index = window.trashBin.findIndex(entry => entry.trashId === trashId);
    if (index === -1) return false;

    const [entry] = window.trashBin.splice(index, 1);
    persistTrashBin();
    if (!entry?.payload || !entry?.payload.id) return false;

    if (entry.type === 'habit') {
        window.appData.habits = (window.appData.habits || []).filter(h => h.id !== entry.payload.id);
        window.appData.habits.push(entry.payload);
    } else if (entry.type === 'todo') {
        window.appData.todos = (window.appData.todos || []).filter(t => t.id !== entry.payload.id);
        window.appData.todos.push(entry.payload);
    } else if (entry.type === 'book') {
        window.appData.books = (window.appData.books || []).filter(b => b.id !== entry.payload.id);
        window.appData.books.push(entry.payload);
    } else if (entry.type === 'note') {
        window.appData.notes = (window.appData.notes || []).filter(n => n.id !== entry.payload.id);
        window.appData.notes.push(entry.payload);
    } else {
        return false;
    }

    saveData(false, { immediate: true });
    window.renderActiveTab();
    return true;
}

function permanentlyDeleteTrashEntry(trashId) {
    const originalLen = window.trashBin.length;
    window.trashBin = window.trashBin.filter(entry => entry.trashId !== trashId);
    persistTrashBin();
    return window.trashBin.length !== originalLen;
}

function clearTrashBin() {
    window.trashBin = [];
    persistTrashBin();
}

// ===== Progress Card Collapse State =====

function normalizeProgressCardCollapseState(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const normalized = {};
    window.PROGRESS_COLLAPSIBLE_CARD_KEYS.forEach((key) => {
        normalized[key] = source[key] === true;
    });
    return normalized;
}

function persistProgressCardCollapseState() {
    try {
        localStorage.setItem(window.PROGRESS_CARD_COLLAPSE_STORAGE_KEY, JSON.stringify(window.progressCardCollapseState));
    } catch {
        // ignore
    }
}

function loadProgressCardCollapseState() {
    let parsed = {};
    try {
        const raw = localStorage.getItem(window.PROGRESS_CARD_COLLAPSE_STORAGE_KEY);
        parsed = raw ? JSON.parse(raw) : {};
    } catch {
        parsed = {};
    }
    window.progressCardCollapseState = normalizeProgressCardCollapseState(parsed);
}

// ===== Weekly Review Store =====

function loadWeeklyReviewStore() {
    let localWeeklyReview = {};
    try {
        const raw = localStorage.getItem(window.WEEKLY_REVIEW_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        localWeeklyReview = window.normalizeWeeklyReviewMap(parsed);
    } catch {
        localWeeklyReview = {};
    }
    const appWeeklyReview = window.normalizeWeeklyReviewMap(window.appData?.weeklyReview);
    window.weeklyReviewStore = window.mergeWeeklyReviewMaps(appWeeklyReview, localWeeklyReview);
    if (window.appData && typeof window.appData === 'object') {
        window.appData.weeklyReview = { ...window.weeklyReviewStore };
    }
    localStorage.setItem(window.WEEKLY_REVIEW_STORAGE_KEY, JSON.stringify(window.weeklyReviewStore));
}

function syncWeeklyReviewStoreFromAppData() {
    window.weeklyReviewStore = window.normalizeWeeklyReviewMap(window.appData?.weeklyReview);
    localStorage.setItem(window.WEEKLY_REVIEW_STORAGE_KEY, JSON.stringify(window.weeklyReviewStore));
}

function persistWeeklyReviewStore(options = {}) {
    const pushToCloud = options.pushToCloud !== false;
    window.weeklyReviewStore = window.normalizeWeeklyReviewMap(window.weeklyReviewStore);
    if (window.appData && typeof window.appData === 'object') {
        window.appData.weeklyReview = { ...window.weeklyReviewStore };
    }
    localStorage.setItem(window.WEEKLY_REVIEW_STORAGE_KEY, JSON.stringify(window.weeklyReviewStore));
    if (pushToCloud) saveData();
}

function getWeeklyReviewEntry(weekKey) {
    const entry = window.appData?.weeklyReview?.[weekKey] || window.weeklyReviewStore?.[weekKey];
    return entry && typeof entry === 'object' ? entry : {
        wins: '',
        blockers: '',
        focus: '',
        nextWeekFocus: '',
        goalTarget: 0,
        goalActual: 0,
        updatedAt: ''
    };
}

// ===== Onboarding =====

function setOnboardingSeen() {
    localStorage.setItem(window.ONBOARDING_STORAGE_KEY, '1');
}

function shouldShowOnboarding() {
    return localStorage.getItem(window.ONBOARDING_STORAGE_KEY) !== '1';
}

function applyExternalAppDataPayload(payload) {
    if (!payload || payload === window.lastPersistedPayload) return;
    try {
        window.appData = window.normalizeAppData(JSON.parse(payload));
        window.lastPersistedPayload = payload;
        window.syncWeeklyReviewStoreFromAppData?.();
        window.refreshReminderSchedule?.();
        window.renderActiveTab?.();
    } catch (error) {
        console.error('Error applying external data:', error);
    }
}

// Listen for cross-tab storage changes so stale tabs cannot re-save deleted items.
window.addEventListener('storage', (e) => {
    if (e.key === window.STORAGE_KEY && e.newValue) {
        applyExternalAppDataPayload(e.newValue);
    }
});

// Export all functions globally for module scripts
window.loadData = loadData;
window.persistLocalDataNow = persistLocalDataNow;
window.queueLocalSave = queueLocalSave;
window.flushPendingLocalSave = flushPendingLocalSave;
window.saveData = saveData;
window.applyExternalAppDataPayload = applyExternalAppDataPayload;
window.loadTrashBin = loadTrashBin;
window.persistTrashBin = persistTrashBin;
window.pruneTrashBin = pruneTrashBin;
window.addToTrash = addToTrash;
window.restoreTrashEntryById = restoreTrashEntryById;
window.permanentlyDeleteTrashEntry = permanentlyDeleteTrashEntry;
window.clearTrashBin = clearTrashBin;
window.normalizeProgressCardCollapseState = normalizeProgressCardCollapseState;
window.persistProgressCardCollapseState = persistProgressCardCollapseState;
window.loadProgressCardCollapseState = loadProgressCardCollapseState;
window.loadWeeklyReviewStore = loadWeeklyReviewStore;
window.syncWeeklyReviewStoreFromAppData = syncWeeklyReviewStoreFromAppData;
window.persistWeeklyReviewStore = persistWeeklyReviewStore;
window.getWeeklyReviewEntry = getWeeklyReviewEntry;
window.setOnboardingSeen = setOnboardingSeen;
window.shouldShowOnboarding = shouldShowOnboarding;
