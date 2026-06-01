// ===== Data Layer Service =====
// Hedeflerim — veri normalizasyonu, merge, diff, cloud write operasyonları

import { doc, collection, serverTimestamp } from 'firebase/firestore';

const db = window.db;

// ===== Default Data =====
const defaultData = {
    habits: [],
    todos: [],
    books: [],
    notes: [],
    focusSessions: [],
    weeklyReview: {},
    moods: {},
    xp: 0,
    level: 1,
    achievements: [],
    settings: {
        theme: '',
        notificationsEnabled: false,
        reminderTime: '20:00',
        smartReminderEnabled: true,
        lastFixedReminderKey: '',
        lastSmartReminderDate: '',
        lastWeeklySummaryDismissed: '',
        focusWeeklyGoalMinutes: 0,
        focusSoundEnabled: false,
        annualGoalValue: 0,
        annualGoalUnit: 'adım'
    }
};

// ===== Normalization Helpers =====

function normalizeSettings(source) {
    const rawSettings = source && typeof source === 'object' ? source : {};
    const settings = {
        ...defaultData.settings,
        ...rawSettings
    };
    settings.theme = window.truncateText(typeof settings.theme === 'string' ? settings.theme : '', 32);
    settings.notificationsEnabled = Boolean(settings.notificationsEnabled);
    settings.reminderTime = window.normalizeReminderTime(settings.reminderTime);
    settings.smartReminderEnabled = settings.smartReminderEnabled !== false;
    settings.lastFixedReminderKey = window.truncateText(
        typeof settings.lastFixedReminderKey === 'string' ? settings.lastFixedReminderKey : '', 64
    );
    settings.lastSmartReminderDate = window.truncateText(
        typeof settings.lastSmartReminderDate === 'string' ? settings.lastSmartReminderDate : '', 32
    );
    if (settings.lastSmartReminderDate && !/^\d{4}-\d{2}-\d{2}$/.test(settings.lastSmartReminderDate)) {
        settings.lastSmartReminderDate = '';
    }
    settings.lastWeeklySummaryDismissed = window.truncateText(
        typeof settings.lastWeeklySummaryDismissed === 'string' ? settings.lastWeeklySummaryDismissed : '', 32
    );
    if (settings.lastWeeklySummaryDismissed && !/^\d{4}-\d{2}-\d{2}$/.test(settings.lastWeeklySummaryDismissed)) {
        settings.lastWeeklySummaryDismissed = '';
    }
    settings.focusWeeklyGoalMinutes = Number.isFinite(Number(settings.focusWeeklyGoalMinutes))
        ? Math.max(0, Math.min(200 * 60, Math.floor(Number(settings.focusWeeklyGoalMinutes))))
        : 0;
    settings.focusSoundEnabled = Boolean(settings.focusSoundEnabled);
    settings.annualGoalValue = Number.isFinite(Number(settings.annualGoalValue))
        ? Math.max(0, Math.min(100000000, Math.floor(Number(settings.annualGoalValue))))
        : 0;
    settings.annualGoalUnit = window.truncateText(
        typeof settings.annualGoalUnit === 'string' ? settings.annualGoalUnit : 'adım', 24
    ) || 'adım';
    const VALID_DASHBOARD_ORDERS = ['default', 'motivation', 'productivity', 'minimal'];
    settings.dashboardOrder = VALID_DASHBOARD_ORDERS.includes(
        typeof settings.dashboardOrder === 'string' ? settings.dashboardOrder : ''
    ) ? settings.dashboardOrder : 'default';
    return settings;
}

function normalizeHabitsArray(habits) {
    return Array.isArray(habits) ? habits.map((habit, index) => {
        const item = habit && typeof habit === 'object' ? { ...habit } : {};
        item.id = typeof item.id === 'string' && item.id ? item.id : `habit_${Date.now()}_${index}`;
        item.name = window.truncateText(typeof item.name === 'string' ? item.name : '', 120);
        item.color = window.sanitizeColor(item.color);
        item.completions = item.completions && typeof item.completions === 'object' && !Array.isArray(item.completions)
            ? item.completions
            : {};
        item.category = window.truncateText(typeof item.category === 'string' ? item.category : '', 40);
        item.createdAt = window.normalizeDateValue(item.createdAt, new Date().toISOString());
        item.updatedAt = window.normalizeDateValue(item.updatedAt, item.createdAt);
        if (item.goal && typeof item.goal === 'object') {
            item.goal = {
                value: Number.isFinite(Number(item.goal.value)) ? Math.max(0, Number(item.goal.value)) : 0,
                unit: window.truncateText(typeof item.goal.unit === 'string' ? item.goal.unit : '', 32),
                frequency: item.goal.frequency === 'weekly' ? 'weekly' : 'daily'
            };
            if (item.goal.value === 0 || !item.goal.unit) {
                item.goal = null;
            }
        } else {
            item.goal = null;
        }
        return item;
    }) : [];
}

function normalizeTodosArray(todos) {
    return Array.isArray(todos) ? todos.map((todo, index) => {
        const item = todo && typeof todo === 'object' ? { ...todo } : {};
        item.id = typeof item.id === 'string' && item.id ? item.id : `todo_${Date.now()}_${index}`;
        item.text = window.truncateText(typeof item.text === 'string' ? item.text : '', 500);
        item.completed = Boolean(item.completed);
        item.bucket = window.normalizeTodoBucket(item.bucket);
        item.dueDate = window.normalizeDueDate(item.dueDate);
        item.createdAt = window.normalizeDateValue(item.createdAt, new Date().toISOString());
        item.updatedAt = window.normalizeDateValue(item.updatedAt, item.createdAt);
        return item;
    }) : [];
}

function normalizeBooksArray(books) {
    return Array.isArray(books) ? books.map((book, index) => {
        const item = book && typeof book === 'object' ? { ...book } : {};
        item.id = typeof item.id === 'string' && item.id ? item.id : `book_${Date.now()}_${index}`;
        item.title = window.truncateText(typeof item.title === 'string' ? item.title : '', 240);
        item.author = window.truncateText(typeof item.author === 'string' ? item.author : '', 160);
        item.coverUrl = window.sanitizeImageUrl(item.coverUrl);
        item.totalPages = Math.max(0, Math.floor(Number(item.totalPages) || 0));
        item.currentPage = Math.max(0, Math.floor(Number(item.currentPage) || 0));
        item.dailyGoalPages = Math.max(0, Math.min(5000, Math.floor(Number(item.dailyGoalPages) || 0)));
        item.dailyReadLog = window.normalizeBookDailyReadLog(item.dailyReadLog);
        item.status = window.normalizeBookStatus(item);
        item.completed = item.status === 'completed';
        if (item.status === 'completed' && item.totalPages > 0) {
            item.currentPage = Math.max(item.currentPage, item.totalPages);
        }
        item.createdAt = window.normalizeDateValue(item.createdAt, new Date().toISOString());
        item.updatedAt = window.normalizeDateValue(item.updatedAt, item.createdAt);
        return item;
    }) : [];
}

function normalizeNotesArray(notes) {
    return Array.isArray(notes) ? notes.map((note, index) => {
        const item = note && typeof note === 'object' ? { ...note } : {};
        item.id = typeof item.id === 'string' && item.id ? item.id : `note_${Date.now()}_${index}`;
        item.title = window.truncateText(typeof item.title === 'string' ? item.title : '', 240);
        item.content = window.truncateText(typeof item.content === 'string' ? item.content : '', 50000);
        item.category = window.truncateText(typeof item.category === 'string' ? item.category : 'general', 40);
        item.color = window.sanitizeColor(item.color, '#ffffff');
        item.pinned = Boolean(item.pinned);
        item.archived = Boolean(item.archived);
        item.createdAt = window.normalizeDateValue(item.createdAt, new Date().toISOString());
        item.updatedAt = window.normalizeDateValue(item.updatedAt, item.createdAt);
        return item;
    }) : [];
}

function normalizeFocusSessionsArray(sessions) {
    return Array.isArray(sessions) ? sessions.map((session, index) => {
        const item = session && typeof session === 'object' ? { ...session } : {};
        item.id = typeof item.id === 'string' && item.id ? item.id : `focus_${Date.now()}_${index}`;
        item.label = window.truncateText(typeof item.label === 'string' ? item.label : 'Ders', 80);
        item.mode = item.mode === 'stopwatch' || item.mode === 'countdown' ? item.mode : 'pomodoro';
        item.preset = window.truncateText(typeof item.preset === 'string' ? item.preset : '', 24);
        item.workSec = Math.max(0, Math.floor(Number(item.workSec) || 0));
        item.breakSec = Math.max(0, Math.floor(Number(item.breakSec) || 0));
        item.interruptions = Math.max(0, Math.floor(Number(item.interruptions) || 0));
        item.plannedWorkSec = Math.max(0, Math.floor(Number(item.plannedWorkSec) || item.workSec || 0));
        item.completionPct = Math.max(0, Math.min(200, Math.round(Number(item.completionPct) || 0)));
        item.deepWorkScore = Math.max(0, Math.min(100, Math.round(Number(item.deepWorkScore) || 0)));
        item.linkedType = item.linkedType === 'habit' || item.linkedType === 'todo' ? item.linkedType : '';
        item.linkedId = window.truncateText(typeof item.linkedId === 'string' ? item.linkedId : '', 120);
        item.linkedLabel = window.truncateText(typeof item.linkedLabel === 'string' ? item.linkedLabel : '', 160);
        item.startedAt = window.normalizeDateValue(item.startedAt, new Date().toISOString());
        item.endedAt = window.normalizeDateValue(item.endedAt, item.startedAt);
        item.createdAt = window.normalizeDateValue(item.createdAt, item.startedAt);
        item.updatedAt = window.normalizeDateValue(item.updatedAt, item.endedAt);
        item.cycles = Math.max(0, Math.floor(Number(item.cycles) || 0));
        return item;
    }) : [];
}

function normalizeMoodsAndGamification(source) {
    const moods = source.moods && typeof source.moods === 'object' && !Array.isArray(source.moods)
        ? source.moods
        : {};
    const xp = Number.isFinite(Number(source.xp)) ? Math.max(0, Math.floor(Number(source.xp))) : 0;
    const level = Number.isFinite(Number(source.level)) ? Math.max(1, Math.floor(Number(source.level))) : 1;
    let achievements = Array.isArray(source.achievements)
        ? source.achievements
            .filter(item => item && typeof item.id === 'string')
            .map(item => ({ id: item.id, date: item.date || new Date().toISOString() }))
        : [];
    achievements = achievements.filter((item, index, arr) =>
        arr.findIndex(candidate => candidate.id === item.id) === index
    );
    return { moods, xp, level, achievements };
}

// ===== main normalizeAppData (orchestrator, < 80 lines) =====

function normalizeAppData(rawData) {
    const source = rawData && typeof rawData === 'object' ? rawData : {};
    const normalized = {
        ...window.defaultData,
        ...source
    };
    normalized.settings = normalizeSettings(source.settings);
    normalized.habits = normalizeHabitsArray(source.habits);
    normalized.todos = normalizeTodosArray(source.todos);
    normalized.books = normalizeBooksArray(source.books);
    normalized.notes = normalizeNotesArray(source.notes);
    normalized.focusSessions = normalizeFocusSessionsArray(source.focusSessions);
    normalized.weeklyReview = window.normalizeWeeklyReviewMap(source.weeklyReview);
    const { moods, xp, level, achievements } = normalizeMoodsAndGamification(source);
    normalized.moods = moods;
    normalized.xp = xp;
    normalized.level = level;
    normalized.achievements = achievements;
    migrateLegacyGamificationData(normalized);
    return normalized;
}

// ===== Snapshot & Legacy Helpers =====

function cloneNormalizedDataSnapshot(source) {
    try {
        return normalizeAppData(JSON.parse(JSON.stringify(source || window.defaultData)));
    } catch (error) {
        window.debugWarn('Snapshot clone failed, falling back to defaults:', error);
        return normalizeAppData(window.defaultData);
    }
}

function hasLegacyCloudPayload(payload) {
    if (!payload || typeof payload !== 'object') return false;
    return (
        Array.isArray(payload.habits) ||
        Array.isArray(payload.todos) ||
        Array.isArray(payload.books) ||
        Array.isArray(payload.notes) ||
        (payload.weeklyReview && typeof payload.weeklyReview === 'object') ||
        (payload.settings && typeof payload.settings === 'object') ||
        (payload.moods && typeof payload.moods === 'object') ||
        Number.isFinite(Number(payload.xp)) ||
        Number.isFinite(Number(payload.level)) ||
        Array.isArray(payload.achievements)
    );
}

function migrateLegacyGamificationData(data) {
    if (!data || typeof data !== 'object') return;
    const legacy = data.gamification;
    if (!legacy || typeof legacy !== 'object') return;

    if ((!Number.isFinite(data.xp) || data.xp < 0) && Number.isFinite(legacy.xp)) {
        data.xp = Math.max(0, Math.floor(legacy.xp));
    }
    if ((!Number.isFinite(data.level) || data.level < 1) && Number.isFinite(legacy.level)) {
        data.level = Math.max(1, Math.floor(legacy.level));
    }

    if (!Array.isArray(data.achievements)) data.achievements = [];
    const legacyAchievements = Array.isArray(legacy.achievements) ? legacy.achievements : [];
    const knownIds = new Set(window.ACHIEVEMENT_DEFINITIONS.map(def => def.id));
    legacyAchievements.forEach(item => {
        if (!item || !knownIds.has(item.id)) return;
        if (!data.achievements.some(existing => existing.id === item.id)) {
            data.achievements.push({
                id: item.id,
                date: item.unlockedAt || new Date().toISOString()
            });
        }
    });
}

// ===== Cloud Payload Builders =====

function buildCloudStatePayload(data, includeAuditTimestamp = true) {
    const normalized = cloneNormalizedDataSnapshot(data);
    const payload = {
        settings: normalized.settings,
        weeklyReview: normalized.weeklyReview || {},
        moods: normalized.moods || {},
        xp: normalized.xp || 0,
        level: normalized.level || 1,
        achievements: Array.isArray(normalized.achievements) ? normalized.achievements : []
    };
    if (includeAuditTimestamp) {
        payload.updatedAt = new Date().toISOString();
    }
    return payload;
}

function buildCloudMetadataPayload(data) {
    const normalized = cloneNormalizedDataSnapshot(data);
    return {
        schemaVersion: window.CLOUD_SCHEMA_VERSION,
        lastClientSyncAt: new Date().toISOString(),
        counters: {
            habits: normalized.habits.length,
            todos: normalized.todos.length,
            books: normalized.books.length,
            notes: normalized.notes.length,
            focusSessions: normalized.focusSessions.length
        },
        app: {
            source: 'web',
            version: window.APP_VERSION
        },
        updatedAt: serverTimestamp()
    };
}

// ===== Diff Functions =====

function diffCollectionItems(localItems, baseItems) {
    const localMap = new Map();
    const baseMap = new Map();
    const upserts = [];
    const deletes = [];

    (localItems || []).forEach(item => {
        if (!item || typeof item.id !== 'string' || !item.id) return;
        localMap.set(item.id, item);
    });
    (baseItems || []).forEach(item => {
        if (!item || typeof item.id !== 'string' || !item.id) return;
        baseMap.set(item.id, item);
    });

    localMap.forEach((localItem, id) => {
        const baseItem = baseMap.get(id);
        const localJson = JSON.stringify(localItem);
        const baseJson = baseItem ? JSON.stringify(baseItem) : '';
        if (!baseItem || localJson !== baseJson) {
            upserts.push(localItem);
        }
    });

    baseMap.forEach((_baseItem, id) => {
        if (!localMap.has(id)) {
            deletes.push(id);
        }
    });

    return { upserts, deletes };
}

function diffCollectionItemsByUpdatedAt(localItems, baseItems) {
    const getTime = (item) => {
        const raw = item?.updatedAt || item?.endedAt || item?.createdAt || '';
        const parsed = Date.parse(raw);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const baseTimeById = new Map();
    const baseItemById = new Map();
    (baseItems || []).forEach(item => {
        if (!item || typeof item.id !== 'string' || !item.id) return;
        baseTimeById.set(item.id, getTime(item));
        baseItemById.set(item.id, item);
    });

    const localIds = new Set();
    const upserts = [];
    const deletes = [];

    (localItems || []).forEach(item => {
        if (!item || typeof item.id !== 'string' || !item.id) return;
        localIds.add(item.id);
        const localTime = getTime(item);
        const baseTime = baseTimeById.get(item.id);
        if (!baseTimeById.has(item.id) || localTime > baseTime) {
            upserts.push(item);
            return;
        }
        if (localTime === baseTime) {
            const baseItem = baseItemById.get(item.id);
            if (!baseItem || JSON.stringify(item) !== JSON.stringify(baseItem)) {
                upserts.push(item);
            }
        }
    });

    baseTimeById.forEach((_time, id) => {
        if (!localIds.has(id)) deletes.push(id);
    });

    return { upserts, deletes };
}

// ===== Cloud V2 Data Builder =====

function buildCloudV2DataFromDocs(stateData, habitsSnap, todosSnap, booksSnap, notesSnap, focusSessionsSnap) {
    const cloudRaw = {
        habits: habitsSnap.docs.map(doc => ({ ...(doc.data() || {}), id: doc.id })),
        todos: todosSnap.docs.map(doc => ({ ...(doc.data() || {}), id: doc.id })),
        books: booksSnap.docs.map(doc => ({ ...(doc.data() || {}), id: doc.id })),
        notes: notesSnap.docs.map(doc => ({ ...(doc.data() || {}), id: doc.id })),
        focusSessions: focusSessionsSnap.docs.map(doc => ({ ...(doc.data() || {}), id: doc.id })),
        settings: stateData?.settings || {},
        weeklyReview: stateData?.weeklyReview || {},
        moods: stateData?.moods || {},
        xp: stateData?.xp ?? 0,
        level: stateData?.level ?? 1,
        achievements: Array.isArray(stateData?.achievements) ? stateData.achievements : []
    };
    return normalizeAppData(cloudRaw);
}

// ===== Cloud Write Operations Builder =====

function buildCloudWriteOperations(userId, localData, baseData) {
    const userRef = doc(db, 'users', userId);
    const normalizedLocal = cloneNormalizedDataSnapshot(localData);
    const normalizedBase = cloneNormalizedDataSnapshot(baseData);
    const operations = [];

    const localStateForCompare = buildCloudStatePayload(normalizedLocal, false);
    const baseStateForCompare = buildCloudStatePayload(normalizedBase, false);
    if (JSON.stringify(localStateForCompare) !== JSON.stringify(baseStateForCompare)) {
        operations.push({
            type: 'set',
            ref: doc(db, 'users', userId, 'meta', window.CLOUD_META_STATE_DOC_ID),
            data: buildCloudStatePayload(normalizedLocal, true),
            options: { merge: false }
        });
    }

    const collectionDefs = [
        { name: 'habits', local: normalizedLocal.habits, base: normalizedBase.habits },
        { name: 'todos', local: normalizedLocal.todos, base: normalizedBase.todos },
        { name: 'books', local: normalizedLocal.books, base: normalizedBase.books },
        { name: 'notes', local: normalizedLocal.notes, base: normalizedBase.notes },
        { name: 'focusSessions', local: normalizedLocal.focusSessions, base: normalizedBase.focusSessions }
    ];

    collectionDefs.forEach(def => {
        const { upserts, deletes } = diffCollectionItemsByUpdatedAt(def.local, def.base);
        upserts.forEach(item => {
            const payload = { ...item, id: item.id };
            operations.push({
                type: 'set',
                ref: doc(db, 'users', userId, def.name, item.id),
                data: payload,
                options: { merge: false }
            });
        });
        deletes.forEach(id => {
            operations.push({
                type: 'delete',
                ref: doc(db, 'users', userId, def.name, id)
            });
        });
    });

    operations.push({
        type: 'set',
        ref: userRef,
        data: buildCloudMetadataPayload(normalizedLocal),
        options: { merge: true }
    });

    return operations;
}

// ===== Merge Functions =====

function mergeWeeklyReviewMaps(localMap, cloudMap) {
    const local = window.normalizeWeeklyReviewMap(localMap);
    const cloud = window.normalizeWeeklyReviewMap(cloudMap);
    const merged = {};
    const keys = new Set([...Object.keys(local), ...Object.keys(cloud)]);

    keys.forEach((weekKey) => {
        const localEntry = local[weekKey];
        const cloudEntry = cloud[weekKey];
        if (!localEntry) {
            merged[weekKey] = cloudEntry;
            return;
        }
        if (!cloudEntry) {
            merged[weekKey] = localEntry;
            return;
        }
        const localUpdatedMs = window.parseTimestamp(localEntry.updatedAt);
        const cloudUpdatedMs = window.parseTimestamp(cloudEntry.updatedAt);
        merged[weekKey] = cloudUpdatedMs >= localUpdatedMs ? cloudEntry : localEntry;
    });

    return window.normalizeWeeklyReviewMap(merged);
}

function getItemSyncTimeMs(item) {
    if (!item || typeof item !== 'object') return 0;
    return window.parseTimestamp(item.updatedAt || item.endedAt || item.createdAt || '');
}

function getCompletionEntryTimeMs(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    return window.parseTimestamp(entry.time || entry.timestamp || entry.updatedAt || '');
}

function isCompletionDone(entry) {
    if (entry === true) return true;
    if (!entry) return false;
    if (typeof entry === 'number') return entry > 0;
    if (typeof entry === 'object') {
        if ('done' in entry) return entry.done === true;
        if ('value' in entry) {
            const numeric = Number(entry.value);
            if (Number.isFinite(numeric)) return numeric > 0;
            return Boolean(entry.value);
        }
        return true;
    }
    return Boolean(entry);
}

function mergeCompletionEntries(localEntry, cloudEntry) {
    if (localEntry === undefined) return cloudEntry;
    if (cloudEntry === undefined) return localEntry;

    const localTime = getCompletionEntryTimeMs(localEntry);
    const cloudTime = getCompletionEntryTimeMs(cloudEntry);

    if (localTime > 0 || cloudTime > 0) {
        if (cloudTime > localTime) return cloudEntry;
        if (localTime > cloudTime) return localEntry;
        return cloudEntry;
    }

    const localDone = isCompletionDone(localEntry);
    const cloudDone = isCompletionDone(cloudEntry);
    if (cloudDone && !localDone) return cloudEntry;
    if (localDone && !cloudDone) return localEntry;
    return cloudEntry;
}

function mergeItemsById(localItems, cloudItems, mergeFn) {
    const map = new Map();
    (localItems || []).forEach(item => {
        if (item && item.id) map.set(item.id, item);
    });
    (cloudItems || []).forEach(item => {
        if (!item || !item.id) return;
        if (map.has(item.id)) {
            map.set(item.id, mergeFn(map.get(item.id), item));
        } else {
            map.set(item.id, item);
        }
    });
    return Array.from(map.values());
}

function mergeAppDataForSync(localData, cloudData) {
    const local = normalizeAppData(localData);
    const cloud = normalizeAppData(cloudData);

    const merged = normalizeAppData({
        ...local,
        ...cloud,
        settings: { ...local.settings, ...cloud.settings }
    });

    merged.habits = mergeItemsById(local.habits, cloud.habits, (localHabit, cloudHabit) => ({
        ...(getItemSyncTimeMs(cloudHabit) >= getItemSyncTimeMs(localHabit) ? localHabit : cloudHabit),
        ...(getItemSyncTimeMs(cloudHabit) >= getItemSyncTimeMs(localHabit) ? cloudHabit : localHabit),
        color: window.sanitizeColor((getItemSyncTimeMs(cloudHabit) >= getItemSyncTimeMs(localHabit) ? cloudHabit.color : localHabit.color)
            || (getItemSyncTimeMs(cloudHabit) >= getItemSyncTimeMs(localHabit) ? localHabit.color : cloudHabit.color)),
        completions: (() => {
            const mergedCompletions = {};
            const localCompletions = localHabit.completions && typeof localHabit.completions === 'object' ? localHabit.completions : {};
            const cloudCompletions = cloudHabit.completions && typeof cloudHabit.completions === 'object' ? cloudHabit.completions : {};
            const keys = new Set([...Object.keys(localCompletions), ...Object.keys(cloudCompletions)]);
            keys.forEach(key => {
                mergedCompletions[key] = mergeCompletionEntries(localCompletions[key], cloudCompletions[key]);
            });
            return mergedCompletions;
        })(),
        updatedAt: (() => {
            const ms = Math.max(getItemSyncTimeMs(localHabit), getItemSyncTimeMs(cloudHabit));
            return ms > 0 ? new Date(ms).toISOString() : (cloudHabit.updatedAt || localHabit.updatedAt || cloudHabit.createdAt || localHabit.createdAt || new Date().toISOString());
        })()
    }));

    merged.todos = mergeItemsById(local.todos, cloud.todos, (localTodo, cloudTodo) => ({
        ...(getItemSyncTimeMs(cloudTodo) >= getItemSyncTimeMs(localTodo) ? localTodo : cloudTodo),
        ...(getItemSyncTimeMs(cloudTodo) >= getItemSyncTimeMs(localTodo) ? cloudTodo : localTodo),
        completed: Boolean((getItemSyncTimeMs(cloudTodo) >= getItemSyncTimeMs(localTodo) ? cloudTodo.completed : localTodo.completed)),
        updatedAt: (() => {
            const ms = Math.max(getItemSyncTimeMs(localTodo), getItemSyncTimeMs(cloudTodo));
            return ms > 0 ? new Date(ms).toISOString() : (cloudTodo.updatedAt || localTodo.updatedAt || cloudTodo.createdAt || localTodo.createdAt || new Date().toISOString());
        })()
    }));

    merged.books = mergeItemsById(local.books, cloud.books, (localBook, cloudBook) => {
        const cloudWins = getItemSyncTimeMs(cloudBook) >= getItemSyncTimeMs(localBook);
        const winner = cloudWins ? cloudBook : localBook;
        const loser = cloudWins ? localBook : cloudBook;
        const mergedBook = {
            ...loser,
            ...winner
        };
        mergedBook.coverUrl = window.sanitizeImageUrl(winner.coverUrl || loser.coverUrl);
        mergedBook.totalPages = Math.max(0, Math.floor(Number(mergedBook.totalPages) || 0));
        mergedBook.currentPage = Math.max(0, Math.floor(Number(mergedBook.currentPage) || 0));
        const status = window.normalizeBookStatus(mergedBook);
        mergedBook.status = status;
        mergedBook.completed = status === 'completed';
        if (mergedBook.completed && mergedBook.totalPages > 0) {
            mergedBook.currentPage = Math.max(mergedBook.currentPage, mergedBook.totalPages);
        }
        const ms = Math.max(getItemSyncTimeMs(localBook), getItemSyncTimeMs(cloudBook));
        mergedBook.updatedAt = ms > 0 ? new Date(ms).toISOString() : (mergedBook.updatedAt || mergedBook.createdAt || new Date().toISOString());
        return mergedBook;
    });

    merged.notes = mergeItemsById(local.notes, cloud.notes, (localNote, cloudNote) => {
        const localTime = window.parseTimestamp(localNote.updatedAt || localNote.createdAt);
        const cloudTime = window.parseTimestamp(cloudNote.updatedAt || cloudNote.createdAt);
        return cloudTime >= localTime ? cloudNote : localNote;
    });

    merged.focusSessions = mergeItemsById(local.focusSessions, cloud.focusSessions, (localSession, cloudSession) => {
        const localTime = window.parseTimestamp(localSession.updatedAt || localSession.endedAt || localSession.createdAt);
        const cloudTime = window.parseTimestamp(cloudSession.updatedAt || cloudSession.endedAt || cloudSession.createdAt);
        return cloudTime >= localTime ? cloudSession : localSession;
    });

    merged.weeklyReview = mergeWeeklyReviewMaps(local.weeklyReview, cloud.weeklyReview);

    merged.moods = {
        ...(local.moods || {}),
        ...(cloud.moods || {})
    };

    merged.achievements = [...(local.achievements || []), ...(cloud.achievements || [])]
        .filter(item => item && typeof item.id === 'string')
        .filter((item, index, arr) => arr.findIndex(candidate => candidate.id === item.id) === index);

    merged.xp = Math.max(local.xp || 0, cloud.xp || 0);
    merged.level = Math.max(local.level || 1, cloud.level || 1);

    return normalizeAppData(merged);
}

// Export all public functions/constants globally for module scripts
window.defaultData = defaultData;
window.normalizeAppData = normalizeAppData;
window.cloneNormalizedDataSnapshot = cloneNormalizedDataSnapshot;
window.hasLegacyCloudPayload = hasLegacyCloudPayload;
window.mergeWeeklyReviewMaps = mergeWeeklyReviewMaps;
window.buildCloudWriteOperations = buildCloudWriteOperations;
window.buildCloudV2DataFromDocs = buildCloudV2DataFromDocs;
window.isCompletionDone = isCompletionDone;
window.mergeAppDataForSync = mergeAppDataForSync;
