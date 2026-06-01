// ===== Focus Timer Engine (Pomodoro / Stopwatch / Countdown) =====
// Hedeflerim — Core timer closure, constants, audio, and helper functions

// ----- Constants -----
const FOCUS_SESSION_MIN_SAVE_SEC = 120;
const FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK = 4;
const FOCUS_WEEKLY_HISTORY_WEEKS = 8;
const FOCUS_SOUND_MAX_LAG_MS_VISIBLE = 10000;
const FOCUS_SOUND_MAX_LAG_MS_HIDDEN = 2 * 60 * 1000;
const FOCUS_ALARM_LOOP_INTERVAL_MS = 2200;
const FOCUS_AUTO_ADVANCE_ALARM_MS = 9000;
const FOCUS_POMODORO_PRESETS = {
    p25: { id: 'p25', label: '25/5', workMs: 25 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 15 * 60 * 1000 },
    p30: { id: 'p30', label: '30/5', workMs: 30 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 15 * 60 * 1000 },
    p50: { id: 'p50', label: '50/10', workMs: 50 * 60 * 1000, shortBreakMs: 10 * 60 * 1000, longBreakMs: 20 * 60 * 1000 }
};

// ----- Audio -----
let focusAudioCtx = null;
let focusAudioUnlockedAt = 0;

function ensureFocusAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!focusAudioCtx) {
        try {
            focusAudioCtx = new Ctx();
        } catch {
            focusAudioCtx = null;
        }
    }
    return focusAudioCtx;
}

function unlockFocusAudio() {
    if (!window.appData.settings?.focusSoundEnabled) return;
    const ctx = ensureFocusAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { /* ignore */ });
    }

    const now = Date.now();
    if (now - focusAudioUnlockedAt < 15000) return;
    focusAudioUnlockedAt = now;

    try {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.00001, ctx.currentTime);
        gain.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
        osc.onended = () => {
            try { osc.disconnect(); } catch { /* ignore */ }
            try { gain.disconnect(); } catch { /* ignore */ }
        };
    } catch {
        // ignore
    }
}

function shouldPlayFocusSound(endedAtMs, nowMs) {
    if (!window.appData.settings?.focusSoundEnabled) return false;
    const endedAt = Number(endedAtMs);
    const now = Number(nowMs);
    if (!Number.isFinite(endedAt) || !Number.isFinite(now)) return false;
    if (now < endedAt) return false;

    const maxLag = document.hidden ? FOCUS_SOUND_MAX_LAG_MS_HIDDEN : FOCUS_SOUND_MAX_LAG_MS_VISIBLE;
    return (now - endedAt) <= maxLag;
}

function playFocusChime(kind = 'default', canRetryResume = true) {
    if (!window.appData.settings?.focusSoundEnabled) return;
    const ctx = ensureFocusAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
        if (canRetryResume) {
            ctx.resume()
                .then(() => {
                    if (ctx.state === 'running') playFocusChime(kind, false);
                })
                .catch(() => { /* ignore */ });
        }
        return;
    }

    const contour = kind === 'workEnd'
        ? [{ f: 740, d: 0.10 }, { f: 988, d: 0.14 }]
        : kind === 'breakEnd'
            ? [{ f: 988, d: 0.10 }, { f: 740, d: 0.12 }]
            : [{ f: 880, d: 0.12 }, { f: 660, d: 0.14 }];

    const t0 = ctx.currentTime + 0.01;
    try {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
        gain.connect(ctx.destination);

        let cursor = t0;
        contour.forEach((step, idx) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(step.f, cursor);
            osc.connect(gain);

            const end = cursor + step.d;
            osc.start(cursor);
            osc.stop(end);
            osc.onended = () => {
                try { osc.disconnect(); } catch { /* ignore */ }
            };

            cursor = end + (idx === contour.length - 1 ? 0 : 0.04);
        });

        gain.gain.setValueAtTime(0.18, cursor);
        gain.gain.exponentialRampToValueAtTime(0.0001, cursor + 0.06);
        setTimeout(() => {
            try { gain.disconnect(); } catch { /* ignore */ }
        }, 800);
    } catch {
        // ignore
    }
}

// ----- Helper Functions -----
function normalizePomodoroPresetId(presetId) {
    return Object.prototype.hasOwnProperty.call(FOCUS_POMODORO_PRESETS, presetId)
        ? presetId
        : 'p25';
}

function getPresetForFocus(presetId) {
    return FOCUS_POMODORO_PRESETS[normalizePomodoroPresetId(presetId)];
}

function getPomodoroPhaseLabel(phaseType) {
    if (phaseType === 'shortBreak') return 'Kısa mola';
    if (phaseType === 'longBreak') return 'Uzun mola';
    return 'Çalışma';
}

function getFocusLinkChoices() {
    const choices = [];
    const seen = new Set();

    (window.appData.habits || []).forEach((habit) => {
        if (!habit || typeof habit.id !== 'string' || !habit.id) return;
        if (seen.has(`habit:${habit.id}`)) return;
        seen.add(`habit:${habit.id}`);
        choices.push({
            ref: `habit:${habit.id}`,
            type: 'habit',
            id: habit.id,
            label: `Alışkanlık: ${window.truncateText(habit.name || 'İsimsiz', 64)}`
        });
    });

    (window.appData.todos || []).forEach((todo) => {
        if (!todo || typeof todo.id !== 'string' || !todo.id) return;
        if (seen.has(`todo:${todo.id}`)) return;
        seen.add(`todo:${todo.id}`);
        const statusPrefix = todo.completed ? '[Tamam]' : '[Açık]';
        choices.push({
            ref: `todo:${todo.id}`,
            type: 'todo',
            id: todo.id,
            label: `Görev ${statusPrefix}: ${window.truncateText(todo.text || 'İsimsiz', 64)}`
        });
    });

    return choices;
}

function getFocusLinkMeta(linkRef) {
    const parsed = window.parseFocusLinkRef(linkRef);
    if (!parsed.type || !parsed.id) return { ref: '', type: '', id: '', label: '' };

    if (parsed.type === 'habit') {
        const habit = (window.appData.habits || []).find(item => item && item.id === parsed.id);
        return {
            ref: `${parsed.type}:${parsed.id}`,
            type: 'habit',
            id: parsed.id,
            label: window.truncateText(habit?.name || 'Silinmiş alışkanlık', 160)
        };
    }

    const todo = (window.appData.todos || []).find(item => item && item.id === parsed.id);
    return {
        ref: `${parsed.type}:${parsed.id}`,
        type: 'todo',
        id: parsed.id,
        label: window.truncateText(todo?.text || 'Silinmiş görev', 160)
    };
}

function getFocusLinkBadgeText(session) {
    const linkedType = session?.linkedType === 'habit' || session?.linkedType === 'todo' ? session.linkedType : '';
    const linkedLabel = window.truncateText(typeof session?.linkedLabel === 'string' ? session.linkedLabel : '', 120);
    if (!linkedType || !linkedLabel) return '';
    return linkedType === 'habit' ? `Alışkanlık: ${linkedLabel}` : `Görev: ${linkedLabel}`;
}

function normalizeGoalUnitForFocusBridge(unit) {
    return String(unit || '').trim().toLocaleLowerCase('tr-TR');
}

function convertFocusWorkSecToHabitValue(workSec, habit) {
    const safeWorkSec = Math.max(0, Number(workSec) || 0);
    if (safeWorkSec <= 0) return 0;
    const goal = habit?.goal && typeof habit.goal === 'object' ? habit.goal : null;
    if (!goal || goal.frequency !== 'daily') return 1;

    const unit = normalizeGoalUnitForFocusBridge(goal.unit);
    if (unit === 'saat' || unit === 'hour' || unit === 'hours' || unit === 'h') {
        return safeWorkSec / 3600;
    }
    if (unit === 'dakika' || unit === 'dk' || unit === 'minute' || unit === 'minutes' || unit === 'min') {
        return safeWorkSec / 60;
    }
    if (unit === 'gün' || unit === 'gun' || unit === 'day' || unit === 'days') {
        return safeWorkSec / 86400;
    }
    return 1;
}

function applyFocusSessionLinkProgress(linkMeta, workSec, endedAtMs) {
    if (!linkMeta || linkMeta.type !== 'habit' || !linkMeta.id) return false;
    const habits = Array.isArray(window.appData.habits) ? window.appData.habits : [];
    const habit = habits.find(item => item && item.id === linkMeta.id);
    if (!habit) return false;

    if (!habit.completions || typeof habit.completions !== 'object') habit.completions = {};

    const safeEndedAtMs = Number.isFinite(Number(endedAtMs)) ? Number(endedAtMs) : Date.now();
    const dateKey = window.formatLocalDateKey(new Date(safeEndedAtMs));
    const nowIso = new Date(safeEndedAtMs).toISOString();
    const previousValue = window.getCompletionNumericValue(habit.completions[dateKey], habit.goal?.value || 1);
    const deltaRaw = convertFocusWorkSecToHabitValue(workSec, habit);
    const delta = Math.max(0, Math.round(deltaRaw * 1000) / 1000);
    if (delta <= 0) return false;

    const nextValue = Math.round((previousValue + delta) * 1000) / 1000;
    habit.completions[dateKey] = { value: nextValue, time: nowIso };
    habit.updatedAt = nowIso;

    if (habit.goal && habit.goal.frequency === 'daily') {
        const target = Math.max(0, Number(habit.goal.value) || 0);
        if (target > 0 && previousValue < target && nextValue >= target) {
            window.triggerConfetti();
            window.showToast(`"${habit.name || 'Alışkanlık'}" hedefi tamamlandı`);
        }
    }

    return true;
}

function computeFocusCompletionPct(workSec, plannedWorkSec) {
    const work = Math.max(0, Number(workSec) || 0);
    const planned = Math.max(0, Number(plannedWorkSec) || 0);
    if (planned <= 0) return work > 0 ? 100 : 0;
    return window.clampPercent((work / planned) * 100, 0, 200);
}

function computeFocusDeepWorkScore(workSec, interruptions, completionPct, mode) {
    const durationScore = window.clampPercent((Math.max(0, Number(workSec) || 0) / (50 * 60)) * 100, 0, 100);
    const completionScore = window.clampPercent(completionPct, 0, 100);
    const interruptionPenalty = Math.max(0, Math.floor(Number(interruptions) || 0)) * 14;
    const flowBase = mode === 'stopwatch' ? 92 : 100;
    const flowScore = window.clampPercent(flowBase - interruptionPenalty, 0, 100);
    const score = (durationScore * 0.38) + (completionScore * 0.36) + (flowScore * 0.26);
    return window.clampPercent(score, 0, 100);
}

function buildFocusSessionNoteTemplate(snapshot) {
    const prefs = snapshot?.prefs || {};
    const rt = snapshot?.runtime || {};
    const mode = rt.mode === 'stopwatch' || rt.mode === 'countdown' ? rt.mode : 'pomodoro';
    const label = window.truncateText(typeof rt.label === 'string' ? rt.label : (prefs.label || 'Odak seansı'), 80) || 'Odak seansı';
    const workSec = Math.max(0, Math.floor((Number(rt.workAccMs) || 0) / 1000));
    const breakSec = Math.max(0, Math.floor((Number(rt.breakAccMs) || 0) / 1000));
    const cycles = Math.max(0, Math.floor(Number(rt.cyclesCompleted) || 0));
    const interruptions = Math.max(0, Math.floor(Number(rt.interruptions) || 0));
    const plannedWorkSec = mode === 'countdown'
        ? Math.max(workSec, Math.floor(Number(rt.countdownSec) || 0))
        : workSec;
    const completionPct = computeFocusCompletionPct(workSec, plannedWorkSec);
    const deepScore = computeFocusDeepWorkScore(workSec, interruptions, completionPct, mode);
    const linkMeta = getFocusLinkMeta(rt.linkRef || prefs.linkRef);
    const modeLabel = mode === 'countdown' ? 'Geri sayım' : mode === 'stopwatch' ? 'Kronometre' : 'Pomodoro';
    const linkLine = linkMeta.type
        ? (linkMeta.type === 'habit' ? `Bağlı alışkanlık: ${linkMeta.label}` : `Bağlı görev: ${linkMeta.label}`)
        : 'Bağlı hedef: yok';

    const title = `Odak Notu - ${label}`;
    const content = [
        `${new Date().toLocaleString('tr-TR')} odak özeti`,
        `Etiket: ${label}`,
        `Mod: ${modeLabel}`,
        `Çalışma: ${window.formatFocusDuration(workSec)}`,
        `Mola: ${window.formatFocusDuration(breakSec)}`,
        `Pomodoro döngüsü: ${cycles}`,
        `Kesinti: ${interruptions}`,
        `Tamamlama: %${completionPct}`,
        `Derin çalışma skoru: ${deepScore}/100`,
        linkLine,
        '',
        'Kısa not:',
        '- Ne iyi gitti?',
        '- Nerede zorlandım?',
        '- Bir sonraki adımım:'
    ].join('\n');

    return {
        category: 'learning',
        title,
        content
    };
}

// ----- Cache Variables (module-level, var for global cross-script access) -----
window.focusWeekTotalCache = { at: 0, count: -1, weekKey: '', workSec: 0, text: '0 dk' };
window.focusHistoryPreviewCache = { at: 0, count: -1, html: '' };
window.focusGoalPersistTimer = null;
window.weeklyPlannerPersistTimer = null;

// ----- FocusTimer IIFE -----
const FocusTimer = (() => {
    const DEFAULT_PREFS = {
        mode: 'pomodoro',
        label: 'Ders',
        pomodoroPresetId: 'p25',
        autoAdvance: true,
        countdownSec: 25 * 60,
        linkRef: ''
    };

    let prefs = { ...DEFAULT_PREFS };
    let rt = null;
    let tickTimer = null;
    let persistThrottleAt = 0;
    let alarmLoopTimer = null;
    let alarmLoopKind = 'default';
    let alarmAutoStopTimer = null;

    function stopAlarmLoop() {
        if (alarmAutoStopTimer) {
            clearTimeout(alarmAutoStopTimer);
            alarmAutoStopTimer = null;
        }
        if (!alarmLoopTimer) return;
        clearInterval(alarmLoopTimer);
        alarmLoopTimer = null;
    }

    function startAlarmLoop(kind = 'default', options = {}) {
        if (!window.appData.settings?.focusSoundEnabled) return;
        const autoStopAfterMs = Math.max(0, Math.floor(Number(options.autoStopAfterMs) || 0));
        alarmLoopKind = kind === 'workEnd' || kind === 'breakEnd' ? kind : 'default';
        stopAlarmLoop();
        unlockFocusAudio();
        playFocusChime(alarmLoopKind);
        alarmLoopTimer = setInterval(() => {
            if (!window.appData.settings?.focusSoundEnabled) {
                stopAlarmLoop();
                return;
            }
            playFocusChime(alarmLoopKind);
        }, FOCUS_ALARM_LOOP_INTERVAL_MS);
        if (autoStopAfterMs > 0) {
            alarmAutoStopTimer = setTimeout(() => {
                stopAlarmLoop();
            }, autoStopAfterMs);
        }

        window.showToast('Süre doldu. Alarm çalıyor.', {
            actionLabel: 'Sustur',
            onAction: () => stopAlarmLoop(),
            duration: 10 * 60 * 1000
        });
    }

    const readJson = (key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    };

    const writeJson = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // ignore
        }
    };

    const removeKey = (key) => {
        try {
            localStorage.removeItem(key);
        } catch {
            // ignore
        }
    };

    function loadPrefs() {
        const stored = readJson(window.FOCUS_TIMER_PREFS_STORAGE_KEY);
        if (!stored) return;
        prefs.mode = stored.mode === 'stopwatch' || stored.mode === 'countdown' ? stored.mode : 'pomodoro';
        prefs.label = window.truncateText(typeof stored.label === 'string' ? stored.label : DEFAULT_PREFS.label, 80) || DEFAULT_PREFS.label;
        prefs.pomodoroPresetId = normalizePomodoroPresetId(stored.pomodoroPresetId);
        prefs.autoAdvance = stored.autoAdvance !== false;
        const cd = Math.floor(Number(stored.countdownSec) || DEFAULT_PREFS.countdownSec);
        prefs.countdownSec = Math.max(0, Math.min(24 * 60 * 60, cd));
        prefs.linkRef = window.normalizeFocusLinkRef(stored.linkRef);
    }

    function savePrefs() {
        writeJson(window.FOCUS_TIMER_PREFS_STORAGE_KEY, prefs);
    }

    function idleState() {
        return {
            version: 1,
            status: 'idle',
            mode: prefs.mode,
            label: prefs.label,
            pomodoroPresetId: prefs.pomodoroPresetId,
            autoAdvance: prefs.autoAdvance,
            countdownSec: prefs.countdownSec,
            sessionId: null,
            startedAtMs: null,
            lastTickAtMs: null,
            workAccMs: 0,
            breakAccMs: 0,
            cyclesCompleted: 0,
            phaseType: 'work',
            phaseEndsAtMs: null,
            phaseRemainingMs: null,
            interruptions: 0,
            linkRef: prefs.linkRef
        };
    }

    function normState(input) {
        const base = idleState();
        const s = input && typeof input === 'object' ? { ...base, ...input } : base;
        s.status = s.status === 'running' || s.status === 'paused' || s.status === 'phaseEnded' ? s.status : 'idle';
        s.mode = s.mode === 'stopwatch' || s.mode === 'countdown' ? s.mode : 'pomodoro';
        s.label = window.truncateText(typeof s.label === 'string' ? s.label : prefs.label, 80) || prefs.label;
        s.pomodoroPresetId = normalizePomodoroPresetId(s.pomodoroPresetId);
        s.autoAdvance = s.autoAdvance !== false;
        s.countdownSec = Math.max(0, Math.min(24 * 60 * 60, Math.floor(Number(s.countdownSec) || prefs.countdownSec)));

        s.sessionId = typeof s.sessionId === 'string' && s.sessionId ? s.sessionId : null;
        s.startedAtMs = Number.isFinite(Number(s.startedAtMs)) ? Number(s.startedAtMs) : null;
        s.lastTickAtMs = Number.isFinite(Number(s.lastTickAtMs)) ? Number(s.lastTickAtMs) : null;
        s.workAccMs = Math.max(0, Math.floor(Number(s.workAccMs) || 0));
        s.breakAccMs = Math.max(0, Math.floor(Number(s.breakAccMs) || 0));
        s.cyclesCompleted = Math.max(0, Math.floor(Number(s.cyclesCompleted) || 0));
        s.phaseType = s.phaseType === 'shortBreak' || s.phaseType === 'longBreak' ? s.phaseType : 'work';
        s.phaseEndsAtMs = Number.isFinite(Number(s.phaseEndsAtMs)) ? Number(s.phaseEndsAtMs) : null;
        s.phaseRemainingMs = Number.isFinite(Number(s.phaseRemainingMs)) ? Math.max(0, Number(s.phaseRemainingMs)) : null;
        s.interruptions = Math.max(0, Math.floor(Number(s.interruptions) || 0));
        s.linkRef = window.normalizeFocusLinkRef(s.linkRef);

        if (s.status === 'idle') {
            s.sessionId = null;
            s.startedAtMs = null;
            s.lastTickAtMs = null;
            s.workAccMs = 0;
            s.breakAccMs = 0;
            s.cyclesCompleted = 0;
            s.phaseType = 'work';
            s.phaseEndsAtMs = null;
            s.phaseRemainingMs = null;
            s.interruptions = 0;
            s.linkRef = prefs.linkRef;
        }

        if (s.status === 'running' && !s.lastTickAtMs) {
            s.lastTickAtMs = Date.now();
        }
        return s;
    }

    function loadRuntime() {
        const stored = readJson(window.FOCUS_TIMER_STATE_STORAGE_KEY);
        return stored ? normState(stored) : null;
    }

    function persistRuntime(force = false) {
        if (!rt) return;
        const now = Date.now();
        if (!force && rt.status === 'running' && now - persistThrottleAt < 2500) return;
        persistThrottleAt = now;
        if (rt.status === 'idle') {
            removeKey(window.FOCUS_TIMER_STATE_STORAGE_KEY);
            return;
        }
        writeJson(window.FOCUS_TIMER_STATE_STORAGE_KEY, rt);
    }

    function stopTicker() {
        if (!tickTimer) return;
        clearInterval(tickTimer);
        tickTimer = null;
    }

    function startTicker() {
        if (tickTimer) return;
        tickTimer = setInterval(() => tick(false), window.PERFORMANCE_MODE ? 1000 : 500);
    }

    function pomodoroPhaseTotalMs(state) {
        const preset = getPresetForFocus(state.pomodoroPresetId);
        if (state.phaseType === 'shortBreak') return preset.shortBreakMs;
        if (state.phaseType === 'longBreak') return preset.longBreakMs;
        return preset.workMs;
    }

    function advancePomodoro(atMs) {
        const preset = getPresetForFocus(rt.pomodoroPresetId);
        if (rt.phaseType === 'work') {
            rt.cyclesCompleted += 1;
            const needsLong = rt.cyclesCompleted > 0 && rt.cyclesCompleted % FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK === 0;
            rt.phaseType = needsLong ? 'longBreak' : 'shortBreak';
            rt.phaseEndsAtMs = atMs + (needsLong ? preset.longBreakMs : preset.shortBreakMs);
            rt.phaseRemainingMs = null;
            return;
        }
        rt.phaseType = 'work';
        rt.phaseEndsAtMs = atMs + preset.workMs;
        rt.phaseRemainingMs = null;
    }

    function resolveCurrentPlannedWorkSec(state, mode, workSec, cycles) {
        const currentWorkSec = Math.max(0, Math.floor(Number(workSec) || 0));
        if (mode === 'countdown') {
            const planned = Math.max(0, Math.floor(Number(state?.countdownSec) || 0));
            return Math.max(currentWorkSec, planned);
        }
        if (mode === 'pomodoro') {
            const preset = getPresetForFocus(state?.pomodoroPresetId || prefs.pomodoroPresetId);
            const workCycleSec = Math.max(60, Math.floor(Number(preset.workMs) / 1000));
            const completedCycles = Math.max(0, Math.floor(Number(cycles) || 0));
            const inWorkPhase = state?.phaseType === 'work';
            const targetCycles = completedCycles + (inWorkPhase ? 1 : 0);
            const planned = Math.max(0, targetCycles * workCycleSec);
            return Math.max(currentWorkSec, planned || currentWorkSec);
        }
        return currentWorkSec;
    }

    function finalizeAndReset(endedAtMs, reason = 'stop', options = {}) {
        if (reason !== 'auto') stopAlarmLoop();
        const endedAt = Number.isFinite(Number(endedAtMs)) ? Number(endedAtMs) : Date.now();
        const startedAt = Number.isFinite(Number(rt?.startedAtMs)) ? Number(rt.startedAtMs) : endedAt;
        const workSec = Math.floor((rt?.workAccMs || 0) / 1000);
        const breakSec = Math.floor((rt?.breakAccMs || 0) / 1000);
        const cycles = Math.max(0, Math.floor(Number(rt?.cyclesCompleted) || 0));
        const playAlarm = options?.playAlarm !== false;

        const mode = rt?.mode === 'stopwatch' || rt?.mode === 'countdown' ? rt.mode : 'pomodoro';
        const label = window.truncateText(typeof rt?.label === 'string' ? rt.label : prefs.label, 80) || prefs.label;
        const sessionId = typeof rt?.sessionId === 'string' && rt.sessionId ? rt.sessionId : `focus_${window.generateId()}`;
        const interruptions = Math.max(0, Math.floor(Number(rt?.interruptions) || 0));
        const plannedWorkSec = resolveCurrentPlannedWorkSec(rt, mode, workSec, cycles);
        const completionPct = computeFocusCompletionPct(workSec, plannedWorkSec);
        const deepWorkScore = computeFocusDeepWorkScore(workSec, interruptions, completionPct, mode);
        const linkMeta = getFocusLinkMeta(rt?.linkRef || prefs.linkRef);

        let preset = '';
        if (mode === 'pomodoro') preset = getPresetForFocus(rt.pomodoroPresetId).label;
        else if (mode === 'countdown') preset = window.formatFocusClock(prefs.countdownSec, { showHours: prefs.countdownSec >= 3600 });
        else preset = 'Kronometre';

        if (reason === 'auto' && playAlarm) {
            const kind = rt?.mode === 'countdown' ? 'workEnd' : 'default';
            startAlarmLoop(kind);
        }

        if (workSec >= FOCUS_SESSION_MIN_SAVE_SEC && reason !== 'discard') {
            const session = {
                id: sessionId,
                label,
                mode,
                preset,
                startedAt: new Date(startedAt).toISOString(),
                endedAt: new Date(endedAt).toISOString(),
                workSec,
                breakSec,
                cycles,
                interruptions,
                plannedWorkSec,
                completionPct,
                deepWorkScore,
                linkedType: linkMeta.type || '',
                linkedId: linkMeta.id || '',
                linkedLabel: linkMeta.label || '',
                createdAt: new Date(startedAt).toISOString(),
                updatedAt: new Date(endedAt).toISOString()
            };

            window.appData.focusSessions = Array.isArray(window.appData.focusSessions) ? window.appData.focusSessions : [];
            const idx = window.appData.focusSessions.findIndex(item => item && item.id === session.id);
            if (idx === -1) {
                window.appData.focusSessions.unshift(session);
            } else {
                const old = window.appData.focusSessions[idx];
                const oldTime = Date.parse(old?.updatedAt || old?.endedAt || old?.createdAt || '');
                const newTime = Date.parse(session.updatedAt);
                if (!Number.isFinite(oldTime) || newTime >= oldTime) window.appData.focusSessions[idx] = session;
            }
            const linkedProgressUpdated = applyFocusSessionLinkProgress(linkMeta, workSec, endedAt);
            window.saveData();
            window.showToast(`Odak seansı kaydedildi: ${window.formatFocusDuration(workSec)}`);
            if (linkedProgressUpdated) {
                const activeTab = window.getActiveTabId();
                if (activeTab === 'dashboard' || activeTab === 'habits') {
                    window.renderActiveTab();
                }
            }
        } else if (reason !== 'auto') {
            window.showToast('2 dakikanın altındaki seanslar kaydedilmedi');
        }

        rt = normState(idleState());
        stopTicker();
        persistRuntime(true);
        window.updateFocusTimerUi();
        window.refreshFocusWeeklySummaryIfVisible();
    }

    function tick(isRestore = false) {
        if (!rt || rt.status !== 'running') return;
        const now = Date.now();
        const last = Number.isFinite(Number(rt.lastTickAtMs)) ? Number(rt.lastTickAtMs) : now;
        if (now <= last) return;

        if (rt.mode === 'stopwatch') {
            rt.workAccMs += now - last;
            rt.lastTickAtMs = now;
            persistRuntime(false);
            window.updateFocusTimerUi();
            return;
        }

        if (rt.mode === 'countdown') {
            if (!Number.isFinite(Number(rt.phaseEndsAtMs))) {
                rt.phaseEndsAtMs = last + Math.max(0, Math.floor(rt.countdownSec) * 1000);
            }
            const endAt = Number(rt.phaseEndsAtMs);
            const segmentEnd = Math.min(now, endAt);
            if (segmentEnd > last) {
                rt.workAccMs += segmentEnd - last;
                rt.lastTickAtMs = segmentEnd;
            }
            if (now >= endAt) {
                const shouldAlert = isRestore ? shouldPlayFocusSound(endAt, now) : true;
                finalizeAndReset(endAt, 'auto', { playAlarm: shouldAlert });
                return;
            }
            persistRuntime(false);
            window.updateFocusTimerUi();
            return;
        }

        // Pomodoro
        while (rt.status === 'running' && rt.lastTickAtMs < now) {
            if (!Number.isFinite(Number(rt.phaseEndsAtMs))) {
                rt.phaseEndsAtMs = rt.lastTickAtMs + pomodoroPhaseTotalMs(rt);
            }
            const endAt = Number(rt.phaseEndsAtMs);
            const segmentEnd = Math.min(now, endAt);
            const delta = segmentEnd - rt.lastTickAtMs;
            if (delta > 0) {
                if (rt.phaseType === 'work') rt.workAccMs += delta;
                else rt.breakAccMs += delta;
                rt.lastTickAtMs = segmentEnd;
            }
            if (segmentEnd >= endAt) {
                const shouldAlert = isRestore ? shouldPlayFocusSound(endAt, now) : true;
                if (shouldAlert) {
                    const kind = rt.phaseType === 'work' ? 'workEnd' : 'breakEnd';
                    if (rt.autoAdvance) startAlarmLoop(kind, { autoStopAfterMs: FOCUS_AUTO_ADVANCE_ALARM_MS });
                    else startAlarmLoop(kind);
                }
                if (rt.autoAdvance) {
                    advancePomodoro(endAt);
                    rt.lastTickAtMs = endAt;
                    continue;
                }
                rt.status = 'phaseEnded';
                rt.phaseRemainingMs = 0;
                rt.phaseEndsAtMs = endAt;
                stopTicker();
                persistRuntime(true);
                window.updateFocusTimerUi();
                return;
            }
            break;
        }

        persistRuntime(false);
        window.updateFocusTimerUi();
    }

    function ensureIdleForSettings() {
        if (rt?.status === 'idle') return true;
        window.showToast('Modu değiştirmek için önce seansı bitir');
        return false;
    }

    function setMode(mode) {
        if (!ensureIdleForSettings()) return;
        stopAlarmLoop();
        prefs.mode = mode === 'stopwatch' || mode === 'countdown' ? mode : 'pomodoro';
        savePrefs();
        rt = normState({ ...idleState(), mode: prefs.mode });
        persistRuntime(true);
        window.updateFocusTimerUi();
    }

    function setPomodoroPreset(presetId) {
        if (!ensureIdleForSettings()) return;
        stopAlarmLoop();
        prefs.pomodoroPresetId = normalizePomodoroPresetId(presetId);
        savePrefs();
        rt = normState({ ...idleState(), mode: 'pomodoro', pomodoroPresetId: prefs.pomodoroPresetId });
        persistRuntime(true);
        window.updateFocusTimerUi();
    }

    function setCountdownSeconds(totalSec) {
        if (!ensureIdleForSettings()) return;
        stopAlarmLoop();
        prefs.countdownSec = Math.max(0, Math.min(24 * 60 * 60, Math.floor(Number(totalSec) || 0)));
        savePrefs();
        rt = normState({ ...idleState(), mode: 'countdown', countdownSec: prefs.countdownSec });
        persistRuntime(true);
        window.updateFocusTimerUi();
    }

    function setLabel(label) {
        prefs.label = window.truncateText(typeof label === 'string' ? label : '', 80) || DEFAULT_PREFS.label;
        savePrefs();
        if (rt && rt.status === 'idle') {
            rt.label = prefs.label;
            persistRuntime(true);
            window.updateFocusTimerUi();
        }
    }

    function setAutoAdvance(enabled) {
        prefs.autoAdvance = enabled === true;
        savePrefs();
        if (rt && rt.status === 'idle') {
            rt.autoAdvance = prefs.autoAdvance;
            persistRuntime(true);
            window.updateFocusTimerUi();
        }
    }

    function setLinkRef(linkRef) {
        if (!ensureIdleForSettings()) return;
        prefs.linkRef = window.normalizeFocusLinkRef(linkRef);
        savePrefs();
        if (rt && rt.status === 'idle') {
            rt.linkRef = prefs.linkRef;
            persistRuntime(true);
            window.updateFocusTimerUi();
        }
    }

    function start() {
        stopAlarmLoop();
        if (!rt) rt = normState(idleState());
        if (rt.status === 'running') return;
        if (rt.status === 'paused') return resume();
        if (rt.status === 'phaseEnded') return nextPhase();
        unlockFocusAudio();

        rt = normState({ ...idleState(), mode: prefs.mode });
        rt.sessionId = `focus_${window.generateId()}`;
        rt.startedAtMs = Date.now();
        rt.lastTickAtMs = rt.startedAtMs;
        rt.status = 'running';
        rt.workAccMs = 0;
        rt.breakAccMs = 0;
        rt.cyclesCompleted = 0;
        rt.label = prefs.label;
        rt.pomodoroPresetId = prefs.pomodoroPresetId;
        rt.autoAdvance = prefs.autoAdvance;
        rt.countdownSec = prefs.countdownSec;
        rt.linkRef = prefs.linkRef;
        rt.interruptions = 0;

        if (rt.mode === 'pomodoro') {
            const preset = getPresetForFocus(rt.pomodoroPresetId);
            rt.phaseType = 'work';
            rt.phaseEndsAtMs = rt.lastTickAtMs + preset.workMs;
        } else if (rt.mode === 'countdown') {
            rt.phaseType = 'work';
            rt.phaseEndsAtMs = rt.lastTickAtMs + Math.max(0, Math.floor(prefs.countdownSec) * 1000);
        }

        persistRuntime(true);
        startTicker();
        window.updateFocusTimerUi();
    }

    function pause() {
        stopAlarmLoop();
        if (!rt || rt.status !== 'running') return;
        tick();
        if (!rt || rt.status !== 'running') return;
        const now = Date.now();
        if (rt.mode === 'pomodoro' || rt.mode === 'countdown') {
            rt.phaseRemainingMs = Math.max(0, Number(rt.phaseEndsAtMs || now) - now);
            rt.phaseEndsAtMs = null;
        }
        rt.interruptions = Math.max(0, Math.floor(Number(rt.interruptions) || 0)) + 1;
        rt.status = 'paused';
        rt.lastTickAtMs = null;
        stopTicker();
        persistRuntime(true);
        window.updateFocusTimerUi();
    }

    function resume() {
        stopAlarmLoop();
        if (!rt || rt.status !== 'paused') return;
        unlockFocusAudio();
        const now = Date.now();
        rt.status = 'running';
        rt.lastTickAtMs = now;
        if (rt.mode === 'pomodoro') {
            const total = pomodoroPhaseTotalMs(rt);
            const remaining = Number.isFinite(Number(rt.phaseRemainingMs)) ? Math.max(0, Number(rt.phaseRemainingMs)) : total;
            rt.phaseEndsAtMs = now + remaining;
            rt.phaseRemainingMs = null;
        } else if (rt.mode === 'countdown') {
            const remaining = Number.isFinite(Number(rt.phaseRemainingMs))
                ? Math.max(0, Number(rt.phaseRemainingMs))
                : Math.max(0, Math.floor(rt.countdownSec) * 1000);
            rt.phaseEndsAtMs = now + remaining;
            rt.phaseRemainingMs = null;
        }
        persistRuntime(true);
        startTicker();
        window.updateFocusTimerUi();
    }

    function nextPhase() {
        if (!rt || rt.mode !== 'pomodoro' || rt.status !== 'phaseEnded') return;
        stopAlarmLoop();
        unlockFocusAudio();
        const now = Date.now();
        rt.status = 'running';
        rt.lastTickAtMs = now;
        advancePomodoro(now);
        persistRuntime(true);
        startTicker();
        window.updateFocusTimerUi();
    }

    function takeBreak() {
        if (!rt || rt.mode !== 'pomodoro' || rt.status !== 'phaseEnded') return;
        stopAlarmLoop();
        unlockFocusAudio();
        const now = Date.now();
        const preset = getPresetForFocus(rt.pomodoroPresetId);

        if (rt.phaseType === 'work') {
            rt.cyclesCompleted += 1;
            const needsLong = rt.cyclesCompleted > 0 && rt.cyclesCompleted % FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK === 0;
            rt.phaseType = needsLong ? 'longBreak' : 'shortBreak';
        } else {
            rt.phaseType = 'shortBreak';
        }

        rt.status = 'running';
        rt.lastTickAtMs = now;
        rt.phaseRemainingMs = null;
        rt.phaseEndsAtMs = now + (rt.phaseType === 'longBreak' ? preset.longBreakMs : preset.shortBreakMs);
        persistRuntime(true);
        startTicker();
        window.updateFocusTimerUi();
    }

    function stop() {
        stopAlarmLoop();
        if (!rt || rt.status === 'idle') return;
        if (rt.status === 'running') tick();
        if (!rt || rt.status === 'idle') return;
        finalizeAndReset(Date.now(), 'stop');
    }

    function init() {
        loadPrefs();
        rt = loadRuntime() || normState(idleState());
        if (rt.status === 'idle') {
            rt.mode = prefs.mode;
            rt.label = prefs.label;
            rt.pomodoroPresetId = prefs.pomodoroPresetId;
            rt.autoAdvance = prefs.autoAdvance;
            rt.countdownSec = prefs.countdownSec;
            rt.linkRef = prefs.linkRef;
        }
        tick(true);
        if (rt.status === 'running') startTicker();
        if (rt.status === 'phaseEnded' && shouldPlayFocusSound(rt.phaseEndsAtMs, Date.now())) {
            const phaseKind = rt.phaseType === 'work' ? 'workEnd' : 'breakEnd';
            startAlarmLoop(phaseKind);
        }
        window.updateFocusTimerUi();
        window.refreshFocusWeeklySummaryIfVisible();
    }

    function getWeekStats(weekOffset = 0) {
        const sessions = Array.isArray(window.appData.focusSessions) ? window.appData.focusSessions : [];
        const weekDates = window.getWeekDates(weekOffset);
        const start = new Date(weekDates[0]);
        start.setHours(0, 0, 0, 0);
        const end = new Date(weekDates[6]);
        end.setHours(23, 59, 59, 999);
        const startMs = start.getTime();
        const endMs = end.getTime();

        const dayKeys = weekDates.map(d => {
            const x = new Date(d);
            x.setHours(0, 0, 0, 0);
            return window.formatLocalDateKey(x);
        });
        const dayIndexByKey = new Map(dayKeys.map((key, idx) => [key, idx]));

        const dayWorkSec = Array(7).fill(0);
        let totalWorkSec = 0;
        let totalInterruptions = 0;
        let totalPlannedWorkSec = 0;
        let totalCompletedEquivalentSec = 0;
        let deepWorkWeightedScore = 0;
        let deepWorkWeightSec = 0;

        sessions.forEach(session => {
            const workSec = Math.max(0, Math.floor(Number(session?.workSec) || 0));
            if (workSec < FOCUS_SESSION_MIN_SAVE_SEC) return;

            const sMs = Date.parse(session?.startedAt || '');
            const eMs = Date.parse(session?.endedAt || '');
            if (!Number.isFinite(sMs) || !Number.isFinite(eMs) || eMs <= sMs) return;

            const overlapStart = Math.max(sMs, startMs);
            const overlapEnd = Math.min(eMs, endMs);
            if (overlapEnd <= overlapStart) return;

            const totalDurationMs = eMs - sMs;
            if (totalDurationMs <= 0) return;
            const overlapDurationMs = overlapEnd - overlapStart;
            const overlapRatio = overlapDurationMs / totalDurationMs;
            const overlapWorkSec = workSec * overlapRatio;

            totalWorkSec += overlapWorkSec;
            const plannedWorkSec = Math.max(workSec, Math.floor(Number(session?.plannedWorkSec) || 0));
            const interruptions = Math.max(0, Math.floor(Number(session?.interruptions) || 0));
            const deepWorkScore = window.clampPercent(Number(session?.deepWorkScore) || 0, 0, 100);
            totalPlannedWorkSec += plannedWorkSec * overlapRatio;
            totalCompletedEquivalentSec += Math.min(workSec, plannedWorkSec) * overlapRatio;
            totalInterruptions += interruptions * overlapRatio;
            if (overlapWorkSec > 0) {
                deepWorkWeightedScore += deepWorkScore * overlapWorkSec;
                deepWorkWeightSec += overlapWorkSec;
            }

            let cursor = overlapStart;
            while (cursor < overlapEnd) {
                const dayStart = new Date(cursor);
                dayStart.setHours(0, 0, 0, 0);
                const nextDayStart = new Date(dayStart);
                nextDayStart.setDate(dayStart.getDate() + 1);
                const sliceEnd = Math.min(overlapEnd, nextDayStart.getTime());
                const sliceMs = Math.max(0, sliceEnd - cursor);
                const key = window.formatLocalDateKey(dayStart);
                const idx = dayIndexByKey.get(key);
                if (idx != null) {
                    dayWorkSec[idx] += workSec * (sliceMs / totalDurationMs);
                }
                cursor = sliceEnd;
            }
        });

        const completionRatePct = totalPlannedWorkSec > 0
            ? window.clampPercent((totalCompletedEquivalentSec / totalPlannedWorkSec) * 100, 0, 100)
            : 0;
        const deepWorkScore = deepWorkWeightSec > 0
            ? window.clampPercent(deepWorkWeightedScore / deepWorkWeightSec, 0, 100)
            : 0;

        return {
            weekDates,
            start,
            end,
            totalWorkSec,
            dayWorkSec,
            interruptions: Math.max(0, Math.round(totalInterruptions)),
            completionRatePct,
            deepWorkScore
        };
    }

    function getSnapshot() {
        return { prefs: { ...prefs }, runtime: rt ? { ...rt } : null };
    }

    return {
        init,
        start,
        pause,
        resume,
        nextPhase,
        takeBreak,
        stop,
        setMode,
        setPomodoroPreset,
        setCountdownSeconds,
        setLabel,
        setAutoAdvance,
        setLinkRef,
        stopAlarm: stopAlarmLoop,
        getWeekStats,
        getSnapshot
    };
})();

window.FocusTimer = FocusTimer;

// ----- Window Exports (for cross-module access) -----
window.FOCUS_POMODORO_PRESETS = FOCUS_POMODORO_PRESETS;
window.FOCUS_SESSION_MIN_SAVE_SEC = FOCUS_SESSION_MIN_SAVE_SEC;
window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK = FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK;
window.FOCUS_WEEKLY_HISTORY_WEEKS = FOCUS_WEEKLY_HISTORY_WEEKS;
window.ensureFocusAudioContext = ensureFocusAudioContext;
window.unlockFocusAudio = unlockFocusAudio;
window.shouldPlayFocusSound = shouldPlayFocusSound;
window.playFocusChime = playFocusChime;
window.normalizePomodoroPresetId = normalizePomodoroPresetId;
window.getPresetForFocus = getPresetForFocus;
window.getPomodoroPhaseLabel = getPomodoroPhaseLabel;
window.getFocusLinkChoices = getFocusLinkChoices;
window.getFocusLinkMeta = getFocusLinkMeta;
window.getFocusLinkBadgeText = getFocusLinkBadgeText;
window.applyFocusSessionLinkProgress = applyFocusSessionLinkProgress;
window.computeFocusCompletionPct = computeFocusCompletionPct;
window.computeFocusDeepWorkScore = computeFocusDeepWorkScore;
window.buildFocusSessionNoteTemplate = buildFocusSessionNoteTemplate;
