// ===== Settings Component =====
// Hedeflerim — Tema, dışa/içe aktarım, bildirimler

import { doc, getDoc, setDoc } from 'firebase/firestore';

const db = window.db;

// ----- Theme Functions -----

function setTheme(themeName) {
    if (themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    window.appData.settings.theme = themeName;
    window.saveData();

    // Update theme picker UI
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
}

function loadTheme() {
    const savedTheme = window.appData.settings?.theme || '';
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
}

// ----- Notification / Push Functions -----

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        window.showToast('Bu tarayıcı bildirimleri desteklemiyor');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        window.showToast('Bildirimler açıldı');
        return true;
    } else {
        window.showToast('Bildirim izni reddedildi');
        return false;
    }
}

function getPushDeviceId() {
    let existing = '';
    try {
        existing = String(localStorage.getItem(window.PUSH_DEVICE_ID_STORAGE_KEY) || '').trim();
    } catch {
        existing = '';
    }
    if (existing) return existing;
    const next = window.generateId();
    try {
        localStorage.setItem(window.PUSH_DEVICE_ID_STORAGE_KEY, next);
    } catch {
        // ignore
    }
    return next;
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

function normalizePushSubscriptionPayload(subscription, options = {}) {
    const raw = subscription && typeof subscription.toJSON === 'function'
        ? subscription.toJSON()
        : (subscription || {});
    const keys = raw && raw.keys && typeof raw.keys === 'object' ? raw.keys : {};
    const timezone = window.truncateText(
        typeof options.timezone === 'string' && options.timezone
            ? options.timezone
            : (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
        80
    );
    const locale = window.truncateText(
        typeof options.locale === 'string' && options.locale ? options.locale : (navigator.language || ''),
        24
    );
    return {
        endpoint: window.truncateText(String(raw.endpoint || ''), 4096),
        keys: {
            p256dh: window.truncateText(String(keys.p256dh || ''), 512),
            auth: window.truncateText(String(keys.auth || ''), 512)
        },
        timezone,
        locale,
        platform: window.truncateText(String(navigator.platform || ''), 64),
        userAgent: window.truncateText(String(navigator.userAgent || ''), 320),
        permission: window.truncateText(String(Notification.permission || 'default'), 16),
        enabled: true
    };
}

async function savePushSubscriptionToCloud(subscription, options = {}) {
    if (!window.currentUser || !db || !subscription) return false;
    const payload = normalizePushSubscriptionPayload(subscription, options);
    if (!payload.endpoint || !payload.keys.p256dh || !payload.keys.auth) return false;

    const nowIso = new Date().toISOString();
    const deviceId = getPushDeviceId();
    const ref = doc(db, 'users', window.currentUser.uid, 'pushSubscriptions', deviceId);

    const existing = await getDoc(ref);
    const base = {
        ...payload,
        updatedAt: nowIso
    };
    if (!existing.exists) {
        base.createdAt = nowIso;
    }

    await setDoc(ref, base, { merge: true });
    return true;
}

async function ensurePushSubscription(options = {}) {
    const silent = options.silent === true;
    if (!window.currentUser || !db) return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!silent) window.showToast('Push bildirim bu cihazda desteklenmiyor');
        return false;
    }
    if (!window.WEB_PUSH_PUBLIC_KEY) {
        if (!silent) window.showToast('Web push anahtari yapilandirilmamis');
        return false;
    }
    if (Notification.permission !== 'granted') {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.WEB_PUSH_PUBLIC_KEY)
            });
        }
        if (!subscription) return false;

        const saved = await savePushSubscriptionToCloud(subscription, {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            locale: navigator.language || ''
        });
        if (saved && !silent) {
            window.showToast('Push bildirim kaydı tamamlandı');
        }
        return saved;
    } catch (error) {
        window.logAppError(error, { kind: 'push_subscribe' });
        if (!silent) {
            window.showToast(`Push kayıt hatası: ${String(error?.message || error || 'bilinmeyen hata')}`);
        }
        return false;
    }
}

// ----- Reminder Functions -----

function scheduleReminder(options = {}) {
    const persist = options.persist !== false;

    // Schedule a daily reminder at 20:00
    const reminderTime = window.normalizeReminderTime(window.appData.settings?.reminderTime || '20:00');
    window.appData.settings.notificationsEnabled = true;
    window.appData.settings.reminderTime = reminderTime;
    if (typeof window.appData.settings.smartReminderEnabled !== 'boolean') {
        window.appData.settings.smartReminderEnabled = true;
    }
    if (persist) {
        window.saveData();
    }

    // Set up check interval (checks every minute)
    if (window.reminderIntervalId) clearInterval(window.reminderIntervalId);
    window.reminderIntervalId = setInterval(checkReminder, 60000);
    checkReminder();
    if (Notification.permission === 'granted') {
        ensurePushSubscription({ silent: true });
    }
}

function refreshReminderSchedule() {
    if (window.reminderIntervalId) {
        clearInterval(window.reminderIntervalId);
        window.reminderIntervalId = null;
    }
    if (window.appData.settings?.notificationsEnabled) {
        scheduleReminder({ persist: false });
    }
}

function collectCompletionMinutes(now = new Date(), options = {}) {
    const daysBack = Math.max(1, Math.floor(Number(options.daysBack) || 28));
    const weekday = Number.isInteger(options.weekday) ? options.weekday : null;
    const minMs = now.getTime() - (daysBack * 24 * 60 * 60 * 1000);
    const minutes = [];

    (window.appData.habits || []).forEach(habit => {
        if (!habit || typeof habit !== 'object') return;
        const completions = habit.completions && typeof habit.completions === 'object' ? habit.completions : {};
        Object.values(completions).forEach(entry => {
            if (!entry || typeof entry !== 'object' || !entry.time) return;
            if (!window.isCompletionDone(entry)) return;
            const ms = Date.parse(entry.time);
            if (!Number.isFinite(ms) || ms < minMs) return;
            const d = new Date(ms);
            if (weekday !== null && d.getDay() !== weekday) return;
            minutes.push((d.getHours() * 60) + d.getMinutes());
        });
    });

    return minutes;
}

function getMedianMinute(values) {
    if (!Array.isArray(values) || values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    return sorted[mid];
}

function getAdaptiveReminderProfile(now = new Date()) {
    const fallbackTime = window.normalizeReminderTime(window.appData.settings?.reminderTime || '20:00');
    const weekdayMinutes = collectCompletionMinutes(now, { daysBack: 56, weekday: now.getDay() });
    const overallMinutes = collectCompletionMinutes(now, { daysBack: 35 });

    let source = 'fallback';
    let baseMinute = window.parseClockToMinutes(fallbackTime);
    let sampleSize = 0;

    const weekdayMedian = getMedianMinute(weekdayMinutes);
    const overallMedian = getMedianMinute(overallMinutes);

    if (weekdayMedian !== null && weekdayMinutes.length >= 3) {
        source = 'weekday';
        baseMinute = weekdayMedian;
        sampleSize = weekdayMinutes.length;
    } else if (overallMedian !== null && overallMinutes.length >= 6) {
        source = 'overall';
        baseMinute = overallMedian;
        sampleSize = overallMinutes.length;
    }

    const shiftedMinute = baseMinute - 30;
    const boundedMinute = Math.max((7 * 60) + 30, Math.min((22 * 60) + 30, shiftedMinute));
    return {
        time: window.formatMinutesAsClock(boundedMinute),
        source,
        sampleSize,
        fallbackTime
    };
}

function checkReminder() {
    if (!window.appData.settings?.notificationsEnabled) return;

    const now = new Date();
    const todayKey = window.formatDate(now);
    const reminderProfile = getAdaptiveReminderProfile(now);
    const reminderTime = reminderProfile.time;
    const [hours, minutes] = reminderTime.split(':').map(Number);
    const fixedReminderKey = `${todayKey}|${reminderTime}|${reminderProfile.source}`;

    if (now.getHours() === hours && now.getMinutes() === minutes) {
        // Check if user has logged habits today
        const habitsToday = window.appData.habits.filter(h => window.isCompletionDone(h.completions[todayKey]));

        if (habitsToday.length < window.appData.habits.length && window.appData.settings.lastFixedReminderKey !== fixedReminderKey) {
            const modeText = reminderProfile.source === 'weekday'
                ? `Bugün için geçmiş ritmine göre (${reminderTime})`
                : reminderProfile.source === 'overall'
                    ? `Geçmiş verine göre (${reminderTime})`
                    : `Varsayılan saat (${reminderTime})`;
            const sent = showLocalNotification('Hedeflerim Hatırlatıcı', `${modeText}. Bugün alışkanlıklarını takip etmeyi unutma.`, {
                tag: 'daily-reminder'
            });
            if (sent) {
                window.appData.settings.lastFixedReminderKey = fixedReminderKey;
                window.saveData();
            }
        }
    }

    if (window.appData.settings.smartReminderEnabled === false) return;
    if (window.appData.settings.lastSmartReminderDate === todayKey) return;

    const risk = computeMissRiskSnapshot(now);
    if (risk.score < 58) return;

    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const suggestedMinutes = window.parseClockToMinutes(risk.suggestedTime);
    const shouldNotifyByTime = nowMinutes >= suggestedMinutes;
    const shouldNotifyByUrgency = risk.score >= 82 && now.getHours() >= 14;
    if (!shouldNotifyByTime && !shouldNotifyByUrgency) return;

    const sent = showLocalNotification('Hedeflerim Akıllı Hatırlatıcı', risk.message, {
        tag: 'smart-reminder'
    });
    if (sent) {
        window.appData.settings.lastSmartReminderDate = todayKey;
        window.saveData();
    }
}

// ===== Local Notification =====

function showLocalNotification(title = 'Hedeflerim Hatırlatıcı', body = 'Bugün alışkanlıklarını takip etmeyi unutma.', options = {}) {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
        const notificationOptions = {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: typeof options.tag === 'string' && options.tag ? options.tag : 'hedeflerim-reminder',
            data: {
                url: '/',
                source: 'local'
            }
        };
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration()
                .then(reg => {
                    if (reg && typeof reg.showNotification === 'function') {
                        return reg.showNotification(title, notificationOptions);
                    }
                    new Notification(title, notificationOptions);
                    return null;
                })
                .catch(() => {
                    new Notification(title, notificationOptions);
                });
            return true;
        }
        new Notification(title, notificationOptions);
        return true;
    }
    return false;
}

function suggestSmartReminderTime(now = new Date()) {
    return getAdaptiveReminderProfile(now).time;
}

function computeMissRiskSnapshot(now = new Date()) {
    const todayKey = window.formatDate(now);
    const weekDates = window.getWeekDates(0).map(d => window.formatDate(d));
    const dayProgress = ((now.getDay() + 6) % 7) + 1; // Monday=1
    const daysLeft = Math.max(1, 8 - dayProgress);

    let dailyPlanned = 0;
    let dailyDone = 0;
    let weeklyTarget = 0;
    let weeklyDone = 0;
    let weeklyBehind = 0;

    (window.appData.habits || []).forEach(habit => {
        const completions = habit?.completions && typeof habit.completions === 'object' ? habit.completions : {};
        const isWeekly = habit?.goal && habit.goal.frequency === 'weekly';
        if (isWeekly) {
            const target = Math.max(1, Math.floor(Number(habit.goal.value) || 1));
            const doneCount = weekDates.filter(dateKey => window.isCompletionDone(completions[dateKey])).length;
            weeklyTarget += target;
            weeklyDone += doneCount;
            const expectedByNow = Math.ceil(target * (dayProgress / 7));
            weeklyBehind += Math.max(0, expectedByNow - doneCount);
        } else {
            dailyPlanned += 1;
            if (window.isCompletionDone(completions[todayKey])) dailyDone += 1;
        }
    });

    const dailyRemaining = Math.max(0, dailyPlanned - dailyDone);
    const weeklyRemaining = Math.max(0, weeklyTarget - weeklyDone);
    const dailyMissPct = dailyPlanned > 0 ? (dailyRemaining / dailyPlanned) * 100 : 0;
    const weeklyMissPct = weeklyTarget > 0 ? (weeklyRemaining / weeklyTarget) * 100 : 0;
    const weeklyBehindPct = weeklyTarget > 0 ? (weeklyBehind / weeklyTarget) * 100 : 0;

    const pendingTodos = (window.appData.todos || []).filter(todo => !todo?.completed).length;
    const todoRiskPct = pendingTodos >= 10 ? 90 : pendingTodos >= 7 ? 70 : pendingTodos >= 4 ? 45 : 0;

    const goalMinutes = Math.max(0, Math.floor(Number(window.appData.settings?.focusWeeklyGoalMinutes) || 0));
    const focusStats = window.FocusTimer.getWeekStats(0);
    const focusDoneMinutes = Math.max(0, Math.round((Number(focusStats?.totalWorkSec) || 0) / 60));
    const focusRemainingMinutes = Math.max(0, goalMinutes - focusDoneMinutes);
    const focusNeedPerDay = daysLeft > 0 ? (focusRemainingMinutes / daysLeft) : focusRemainingMinutes;
    const focusRiskPct = goalMinutes > 0
        ? Math.max(
            0,
            Math.min(
                100,
                ((focusRemainingMinutes / Math.max(goalMinutes, 1)) * 100 * 0.72)
                + (focusNeedPerDay > 90 ? 22 : focusNeedPerDay > 60 ? 14 : focusNeedPerDay > 35 ? 8 : 0)
            )
        )
        : 0;

    const eveningPressure = now.getHours() >= 19 ? 12 : now.getHours() >= 15 ? 6 : 0;
    const score = window.clampPercent(
        (dailyMissPct * 0.42)
        + (Math.max(weeklyMissPct, weeklyBehindPct) * 0.27)
        + (focusRiskPct * 0.21)
        + (todoRiskPct * 0.07)
        + eveningPressure,
        0,
        100
    );

    let reason = 'Günlük ritim korunuyor.';
    if (dailyRemaining > 0 && dailyMissPct >= weeklyMissPct) {
        reason = `Bugün ${dailyRemaining} günlük alışkanlık adımı kaldı.`;
    } else if (weeklyRemaining > 0) {
        reason = `Haftalık hedefte ${weeklyRemaining} adım açık var.`;
    } else if (focusRemainingMinutes > 0) {
        reason = `Haftalık odak hedefi için ${focusRemainingMinutes} dk daha gerekiyor.`;
    } else if (pendingTodos > 0) {
        reason = `Bekleyen ${pendingTodos} görev birikimi var.`;
    }

    const suggestion = suggestSmartReminderTime(now);
    const urgency = score >= 80 ? 'yüksek' : score >= 60 ? 'orta' : 'düşük';
    const message = `Kaçırma riski %${score} (${urgency}). ${reason} Şimdi 1 küçük adım at.`;

    return {
        score,
        reason,
        message,
        suggestedTime: suggestion,
        dailyRemaining,
        weeklyRemaining,
        focusRemainingMinutes,
        pendingTodos
    };
}

window.setTheme = setTheme;
window.loadTheme = loadTheme;
window.requestNotificationPermission = requestNotificationPermission;
window.scheduleReminder = scheduleReminder;
window.refreshReminderSchedule = refreshReminderSchedule;
window.ensurePushSubscription = ensurePushSubscription;
window.checkReminder = checkReminder;
window.showLocalNotification = showLocalNotification;
window.computeMissRiskSnapshot = computeMissRiskSnapshot;
