// ===== Focus Timer UI =====
// Hedeflerim — Timer card rendering, overlay, and UI updates

// ----- Overlay -----
function openFocusOverlay() {
    const overlay = document.getElementById('focusOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    renderFocusTimerCard();
    document.body.style.overflow = 'hidden';
}

function closeFocusOverlay() {
    const overlay = document.getElementById('focusOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ----- UI Helpers -----
function updateFocusTimerHeaderIndicator() {
    const badge = document.getElementById('focusTimerBadge');
    const timeText = document.getElementById('focusTimerHeaderTime');
    const snapshot = window.FocusTimer.getSnapshot();
    const rt = snapshot?.runtime;
    const status = rt?.status;
    const isActive = status === 'running' || status === 'paused';

    if (badge) {
        badge.classList.toggle('hidden', !isActive);
    }

    if (timeText) {
        if (isActive) {
            const remainingSec = getFocusTimerRemainingSeconds(rt);
            timeText.textContent = window.formatFocusClock(remainingSec, { showHours: false });
            timeText.classList.remove('hidden');
        } else {
            timeText.classList.add('hidden');
        }
    }
}

function getFocusTimerRemainingSeconds(rt) {
    if (!rt) return 0;
    const now = Date.now();

    if (rt.mode === 'stopwatch') {
        return Math.floor((rt.workAccMs || 0) / 1000);
    }

    if (rt.mode === 'countdown') {
        if (rt.status === 'running' && Number.isFinite(Number(rt.phaseEndsAtMs))) {
            return Math.max(0, Math.floor((Number(rt.phaseEndsAtMs) - now) / 1000));
        }
        if (rt.status === 'paused' && Number.isFinite(Number(rt.phaseRemainingMs))) {
            return Math.max(0, Math.floor(Number(rt.phaseRemainingMs) / 1000));
        }
        return Math.max(0, Math.floor(Number(rt.countdownSec) || 0));
    }

    // Pomodoro
    if (rt.status === 'running' && Number.isFinite(Number(rt.phaseEndsAtMs))) {
        return Math.max(0, Math.floor((Number(rt.phaseEndsAtMs) - now) / 1000));
    }
    if (rt.status === 'paused' && Number.isFinite(Number(rt.phaseRemainingMs))) {
        return Math.max(0, Math.floor(Number(rt.phaseRemainingMs) / 1000));
    }
    return 0;
}

// ===== renderFocusTimerCard — GR-SP01: broken into sub-functions =====

function _buildTimerModeSelectorHTML() {
    return `
        <div class="focus-timer-top">
            <div class="focus-mode-group" role="tablist" aria-label="Odak zamanlayıcı modu">
                <button type="button" class="focus-chip" data-focus-mode="pomodoro">Pomodoro</button>
                <button type="button" class="focus-chip" data-focus-mode="stopwatch">Kronometre</button>
                <button type="button" class="focus-chip" data-focus-mode="countdown">Geri sayım</button>
            </div>
            <div class="focus-weekline" title="Bu haftaki odak süresi">
                <span class="focus-weeklabel">Bu hafta</span>
                <span class="focus-weektotal" id="focusWeekTotal">0 dk</span>
            </div>
        </div>`;
}

function _buildTimerConfigHTML() {
    return `
        <div class="focus-config">
            <div class="focus-goal">
                <div class="focus-goal-head">
                    <div class="focus-goal-title">Haftalık hedef</div>
                    <div class="focus-goal-inputwrap">
                        <input id="focusGoalHoursInput" class="focus-input focus-goal-input" type="number" inputmode="decimal" min="0" max="200" step="0.5" placeholder="10">
                        <span class="focus-goal-unit">sa</span>
                    </div>
                </div>
                <div class="focus-goal-track" aria-hidden="true">
                    <div class="focus-goal-bar" id="focusGoalBar" style="width:0%;"></div>
                </div>
                <div class="focus-goal-meta" id="focusGoalMeta">Hedef yok</div>
                <div class="focus-goal-presets" aria-label="Haftalık hedef presetleri">
                    <button type="button" class="focus-mini-chip" data-focus-goal-minutes="300">5 sa</button>
                    <button type="button" class="focus-mini-chip" data-focus-goal-minutes="600">10 sa</button>
                    <button type="button" class="focus-mini-chip" data-focus-goal-minutes="900">15 sa</button>
                    <button type="button" class="focus-mini-chip" data-focus-goal-minutes="0">Sıfırla</button>
                </div>
            </div>
            <div class="focus-presets" id="focusPresetRow"></div>
            <label class="focus-field">
                <span class="focus-field-label">Seansı Bağla</span>
                <select id="focusLinkSelect" class="focus-input">
                    <option value="">Bağlantı yok</option>
                </select>
            </label>
            <div class="focus-config-row">
                <label class="focus-field">
                    <span class="focus-field-label">Etiket</span>
                    <input id="focusLabelInput" class="focus-input" type="text" maxlength="80" placeholder="Ders, Matematik, İngilizce">
                </label>
                <div class="focus-toggle-stack">
                    <label class="focus-toggle" id="focusAutoAdvanceWrap">
                        <input id="focusAutoAdvanceToggle" type="checkbox">
                        <span>Otomatik geçiş</span>
                    </label>
                    <label class="focus-toggle" id="focusSoundWrap">
                        <input id="focusSoundToggle" type="checkbox">
                        <span>Sesli uyarı</span>
                    </label>
                </div>
            </div>
            <div class="focus-countdown-config hidden" id="focusCountdownWrap">
                <div class="focus-countdown-presets">
                    <button type="button" class="focus-mini-chip" data-focus-countdown="300">5 dk</button>
                    <button type="button" class="focus-mini-chip" data-focus-countdown="600">10 dk</button>
                    <button type="button" class="focus-mini-chip" data-focus-countdown="900">15 dk</button>
                    <button type="button" class="focus-mini-chip" data-focus-countdown="1500">25 dk</button>
                    <button type="button" class="focus-mini-chip" data-focus-countdown="3000">50 dk</button>
                </div>
                <label class="focus-field focus-field-inline">
                    <span class="focus-field-label">Süre (dk)</span>
                    <input id="focusCountdownMinutes" class="focus-input" type="number" inputmode="numeric" min="0" max="1440" step="1" placeholder="25">
                </label>
            </div>
        </div>`;
}

function _buildTimerDisplayHTML() {
    return `
        <div class="focus-display">
            <div class="focus-phase" id="focusPhaseLabel">Çalışma</div>
            <div class="focus-time" id="focusTimeText">25:00</div>
            <div class="focus-progress" id="focusProgressWrap">
                <div class="focus-progress-track">
                    <div class="focus-progress-bar" id="focusProgressBar" style="width:0%;"></div>
                </div>
                <div class="focus-progress-meta" id="focusProgressMeta"></div>
            </div>
        </div>`;
}

function _buildTimerControlsHTML() {
    return `
        <div class="focus-actions">
            <button type="button" class="btn btn-primary" data-focus-action="start" id="focusStartBtn">Başlat</button>
            <button type="button" class="btn btn-secondary hidden" data-focus-action="pause" id="focusPauseBtn">Duraklat</button>
            <button type="button" class="btn btn-secondary hidden" data-focus-action="resume" id="focusResumeBtn">Devam</button>
            <button type="button" class="btn btn-secondary hidden" data-focus-action="next" id="focusNextBtn">Sonraki</button>
            <button type="button" class="btn btn-primary hidden" data-focus-action="continueEnd" id="focusContinueBtn">Devam</button>
            <button type="button" class="btn btn-secondary hidden" data-focus-action="breakEnd" id="focusBreakBtn">Mola</button>
            <button type="button" class="btn btn-secondary hidden" data-focus-action="stopNote" id="focusStopNoteBtn">Bitir + Not</button>
            <button type="button" class="btn btn-danger hidden" data-focus-action="stop" id="focusStopBtn">Bitir</button>
        </div>`;
}

function _buildTimerStatsHTML() {
    return `
        <p class="focus-hint">2 dakikanın altındaki seanslar kaydedilmez.</p>
        <div class="focus-history">
            <div class="focus-history-head">
                <div class="focus-history-title">Son seanslar</div>
                <button type="button" class="btn-text focus-history-link" data-focus-action="history">Tümü</button>
            </div>
            <div class="focus-history-list" id="focusHistoryList"></div>
        </div>`;
}

function renderFocusTimerCard() {
    const container = document.getElementById('focusTimerCard');
    if (!container) return;

    if (!container.dataset.rendered) {
        container.innerHTML = [
            '<div class="focus-timer-shell" id="focusTimerShell" data-status="idle" data-mode="pomodoro">',
            _buildTimerModeSelectorHTML(),
            _buildTimerConfigHTML(),
            _buildTimerDisplayHTML(),
            _buildTimerControlsHTML(),
            _buildTimerStatsHTML(),
            '</div>'
        ].join('\n');
        container.dataset.rendered = '1';
    }

    updateFocusTimerUi();
}

// ===== updateFocusTimerUi — GR-SP01: sub-function breakdown =====

function _updateTimerModeAndPresets(shell, mode, prefs) {
    shell.dataset.mode = mode;
    shell.querySelectorAll('[data-focus-mode]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.focusMode === mode);
    });

    const presetRow = document.getElementById('focusPresetRow');
    if (presetRow) {
        if (mode === 'pomodoro') {
            if (!presetRow.dataset.ready) {
                presetRow.innerHTML = Object.values(window.FOCUS_POMODORO_PRESETS)
                    .map(preset => `<button type="button" class="focus-mini-chip" data-focus-preset="${window.escapeHtml(preset.id)}">${window.escapeHtml(preset.label)}</button>`)
                    .join('');
                presetRow.dataset.ready = '1';
            }
            presetRow.querySelectorAll('[data-focus-preset]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.focusPreset === window.normalizePomodoroPresetId(prefs.pomodoroPresetId));
            });
            presetRow.classList.remove('hidden');
        } else {
            presetRow.classList.add('hidden');
        }
    }
}

function _updateTimerLabels(prefs) {
    const labelInput = document.getElementById('focusLabelInput');
    if (labelInput && document.activeElement !== labelInput) {
        labelInput.value = prefs.label || 'Ders';
    }
}

function _updateTimerLinks(prefs) {
    const linkSelect = document.getElementById('focusLinkSelect');
    if (!linkSelect) return;

    const choices = window.getFocusLinkChoices();
    const currentLinkRef = window.normalizeFocusLinkRef(prefs.linkRef);
    const hasCurrent = currentLinkRef && choices.some(item => item.ref === currentLinkRef);
    if (currentLinkRef && !hasCurrent) {
        const staleMeta = window.getFocusLinkMeta(currentLinkRef);
        choices.unshift({
            ref: currentLinkRef,
            type: staleMeta.type || '',
            id: staleMeta.id || '',
            label: `${staleMeta.type === 'habit' ? 'Alışkanlık' : 'Görev'}: ${staleMeta.label || 'Silinmiş kayıt'}`
        });
    }
    const optionsSig = choices.map(item => `${item.ref}|${item.label}`).join('||');
    if (linkSelect.dataset.optionsSig !== optionsSig) {
        linkSelect.innerHTML = [
            '<option value="">Bağlantı yok</option>',
            ...choices.map(item => `<option value="${window.escapeHtml(item.ref)}">${window.escapeHtml(item.label)}</option>`)
        ].join('');
        linkSelect.dataset.optionsSig = optionsSig;
    }
    if (document.activeElement !== linkSelect && linkSelect.value !== currentLinkRef) {
        linkSelect.value = currentLinkRef;
    }
}

function _updateTimerToggles(mode, prefs) {
    const autoWrap = document.getElementById('focusAutoAdvanceWrap');
    const autoToggle = document.getElementById('focusAutoAdvanceToggle');
    if (autoWrap) autoWrap.classList.toggle('hidden', mode !== 'pomodoro');
    if (autoToggle) autoToggle.checked = prefs.autoAdvance !== false;

    const soundToggle = document.getElementById('focusSoundToggle');
    if (soundToggle) soundToggle.checked = Boolean(window.appData.settings?.focusSoundEnabled);
}

function _updateTimerCountdown(mode, prefs) {
    const countdownWrap = document.getElementById('focusCountdownWrap');
    const countdownMinutes = document.getElementById('focusCountdownMinutes');
    if (countdownWrap) countdownWrap.classList.toggle('hidden', mode !== 'countdown');
    if (countdownMinutes && mode === 'countdown' && document.activeElement !== countdownMinutes) {
        countdownMinutes.value = String(Math.max(0, Math.round((Number(prefs.countdownSec) || 0) / 60)));
    }
}

function _updateTimerWeekTotal() {
    const sessionsCount = Array.isArray(window.appData.focusSessions) ? window.appData.focusSessions.length : 0;
    const weekKey = window.getIsoWeekKey(new Date(Date.now()));
    if (window.focusWeekTotalCache.count !== sessionsCount || window.focusWeekTotalCache.weekKey !== weekKey) {
        const stats = window.FocusTimer.getWeekStats(0);
        const totalWorkSec = Math.max(0, Math.round(Number(stats?.totalWorkSec) || 0));
        window.focusWeekTotalCache = {
            at: Date.now(),
            count: sessionsCount,
            weekKey,
            workSec: totalWorkSec,
            text: window.formatFocusDuration(totalWorkSec)
        };
    }

    const weekTotalEl = document.getElementById('focusWeekTotal');
    if (weekTotalEl) weekTotalEl.textContent = window.focusWeekTotalCache.text;
}

function _updateTimerGoal(now) {
    const goalMinutes = Math.max(0, Math.floor(Number(window.appData.settings?.focusWeeklyGoalMinutes) || 0));
    const goalSec = goalMinutes * 60;
    const weekWorkSec = Math.max(0, Math.floor(Number(window.focusWeekTotalCache.workSec) || 0));
    const goalRatio = goalSec > 0 ? (weekWorkSec / goalSec) : 0;
    const goalPct = Math.max(0, Math.round(goalRatio * 100));
    const goalBarPct = Math.max(0, Math.min(100, goalPct));

    const shell = document.getElementById('focusTimerShell');
    if (shell) {
        shell.querySelectorAll('[data-focus-goal-minutes]').forEach(btn => {
            const minutes = Math.max(0, Math.floor(Number(btn.dataset.focusGoalMinutes) || 0));
            btn.classList.toggle('active', minutes === goalMinutes);
        });
    }

    const goalInput = document.getElementById('focusGoalHoursInput');
    if (goalInput && document.activeElement !== goalInput) {
        const hours = goalMinutes > 0 ? (goalMinutes / 60) : 0;
        goalInput.value = goalMinutes > 0 ? String((Math.round(hours * 10) / 10)) : '';
    }

    const goalBar = document.getElementById('focusGoalBar');
    if (goalBar) goalBar.style.width = `${goalBarPct}%`;

    const goalMeta = document.getElementById('focusGoalMeta');
    if (goalMeta) {
        if (goalSec <= 0) {
            goalMeta.textContent = `Bu hafta: ${window.formatFocusDuration(weekWorkSec)} • Hedef yok`;
        } else if (goalPct >= 100) {
            goalMeta.textContent = `Hedef tamamlandı: ${window.formatFocusDuration(weekWorkSec)} / ${window.formatFocusDuration(goalSec)} (%${goalPct})`;
        } else {
            goalMeta.textContent = `Bu hafta: ${window.formatFocusDuration(weekWorkSec)} / ${window.formatFocusDuration(goalSec)} (%${goalPct})`;
        }
    }
}

function _updateTimerDisplay(mode, prefs, rt, status, now) {
    const phaseEl = document.getElementById('focusPhaseLabel');
    const timeEl = document.getElementById('focusTimeText');
    const progressWrap = document.getElementById('focusProgressWrap');
    const progressBar = document.getElementById('focusProgressBar');
    const progressMeta = document.getElementById('focusProgressMeta');

    let phaseLabel = '';
    let timeText = '';
    let progressRatio = 0;
    let progressText = '';
    let showProgress = true;

    if (mode === 'stopwatch') {
        const baseMs = Math.max(0, Math.floor(Number(rt.workAccMs) || 0));
        const liveMs = status === 'running' && Number.isFinite(Number(rt.lastTickAtMs))
            ? baseMs + Math.max(0, now - Number(rt.lastTickAtMs))
            : baseMs;
        const sec = Math.floor(liveMs / 1000);
        phaseLabel = 'Çalışma';
        timeText = window.formatFocusClock(sec, { showHours: sec >= 3600 });
        showProgress = false;
    } else if (mode === 'countdown') {
        const totalSec = Math.max(0, Math.floor(Number(prefs.countdownSec) || 0));
        let remainingMs = totalSec * 1000;
        if (status === 'running' && Number.isFinite(Number(rt.phaseEndsAtMs))) {
            remainingMs = Math.max(0, Number(rt.phaseEndsAtMs) - now);
        } else if (status === 'paused' && Number.isFinite(Number(rt.phaseRemainingMs))) {
            remainingMs = Math.max(0, Number(rt.phaseRemainingMs));
        }
        const remainingSec = Math.floor(remainingMs / 1000);
        phaseLabel = 'Geri sayım';
        timeText = window.formatFocusClock(remainingSec, { showHours: remainingSec >= 3600 || totalSec >= 3600 });
        progressRatio = totalSec > 0 ? (1 - (remainingSec / totalSec)) : 0;
        progressText = totalSec > 0 ? `Süre: ${window.formatFocusClock(totalSec, { showHours: totalSec >= 3600 })}` : '';
    } else {
        const preset = window.getPresetForFocus(prefs.pomodoroPresetId);
        const phaseType = rt.phaseType === 'shortBreak' || rt.phaseType === 'longBreak' ? rt.phaseType : 'work';
        const totalMs = phaseType === 'shortBreak' ? preset.shortBreakMs : phaseType === 'longBreak' ? preset.longBreakMs : preset.workMs;
        let remainingMs = totalMs;
        if (status === 'running' && Number.isFinite(Number(rt.phaseEndsAtMs))) {
            remainingMs = Math.max(0, Number(rt.phaseEndsAtMs) - now);
        } else if (status === 'paused' && Number.isFinite(Number(rt.phaseRemainingMs))) {
            remainingMs = Math.max(0, Number(rt.phaseRemainingMs));
        } else if (status === 'phaseEnded') {
            remainingMs = 0;
        }
        const remainingSec = Math.floor(remainingMs / 1000);
        phaseLabel = window.getPomodoroPhaseLabel(phaseType);
        timeText = window.formatFocusClock(remainingSec);
        progressRatio = totalMs > 0 ? (1 - (remainingMs / totalMs)) : 0;
        const done = Math.max(0, Math.floor(Number(rt.cyclesCompleted) || 0));
        const remainder = done % window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK;
        const nextLongIn = remainder === 0 ? window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK : (window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK - remainder);
        progressText = done > 0 ? `Tamamlanan: ${done} • Uzun mola: ${nextLongIn} sonra` : `Uzun mola: ${window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK} pomodoro sonra`;
    }

    if (phaseEl) phaseEl.textContent = phaseLabel;
    if (timeEl) timeEl.textContent = timeText;
    if (progressWrap) progressWrap.classList.toggle('hidden', !showProgress);
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(progressRatio * 100)))}%`;
    if (progressMeta) progressMeta.textContent = progressText;
}

function _updateTimerControls(status, mode) {
    const startBtn = document.getElementById('focusStartBtn');
    const pauseBtn = document.getElementById('focusPauseBtn');
    const resumeBtn = document.getElementById('focusResumeBtn');
    const nextBtn = document.getElementById('focusNextBtn');
    const continueBtn = document.getElementById('focusContinueBtn');
    const breakBtn = document.getElementById('focusBreakBtn');
    const stopNoteBtn = document.getElementById('focusStopNoteBtn');
    const stopBtn = document.getElementById('focusStopBtn');

    const setHidden = (el, hidden) => { if (el) el.classList.toggle('hidden', hidden); };
    const phaseDecision = mode === 'pomodoro' && status === 'phaseEnded';
    setHidden(startBtn, status !== 'idle');
    setHidden(pauseBtn, status !== 'running');
    setHidden(resumeBtn, status !== 'paused');
    setHidden(nextBtn, true);
    setHidden(continueBtn, !phaseDecision);
    setHidden(breakBtn, !phaseDecision);
    setHidden(stopNoteBtn, !phaseDecision);
    setHidden(stopBtn, status === 'idle' || phaseDecision);
}

function updateFocusTimerUi() {
    updateFocusTimerHeaderIndicator();
    const shell = document.getElementById('focusTimerShell');
    if (!shell) return;

    const snapshot = window.FocusTimer.getSnapshot();
    const prefs = snapshot.prefs || {};
    const rt = snapshot.runtime || {};
    const now = Date.now();

    const mode = rt.mode === 'stopwatch' || rt.mode === 'countdown' ? rt.mode : 'pomodoro';
    const status = rt.status || 'idle';
    shell.dataset.status = status;

    _updateTimerModeAndPresets(shell, mode, prefs);
    _updateTimerLabels(prefs);
    _updateTimerLinks(prefs);
    _updateTimerToggles(mode, prefs);
    _updateTimerCountdown(mode, prefs);
    _updateTimerWeekTotal();
    _updateTimerGoal(now);
    _updateTimerDisplay(mode, prefs, rt, status, now);
    _updateTimerControls(status, mode);

    window.refreshFocusHistoryPreview(false);
}

// ----- Goal Functions -----
function clampFocusWeeklyGoalMinutes(inputMinutes) {
    const minutes = Math.floor(Number(inputMinutes) || 0);
    if (!Number.isFinite(minutes)) return 0;
    return Math.max(0, Math.min(200 * 60, minutes));
}

function setFocusWeeklyGoalMinutes(inputMinutes, options = {}) {
    const minutes = clampFocusWeeklyGoalMinutes(inputMinutes);
    const persist = options.persist !== false;
    const silent = options.silent === true;
    const refreshProgress = options.refreshProgress === true || persist;

    if (!window.appData.settings) window.appData.settings = {};
    const prev = Math.floor(Number(window.appData.settings.focusWeeklyGoalMinutes) || 0);
    window.appData.settings.focusWeeklyGoalMinutes = minutes;

    updateFocusTimerUi();
    if (refreshProgress) window.refreshFocusWeeklySummaryIfVisible();

    if (persist && minutes !== prev) {
        window.saveData();
        if (!silent) {
            window.showToast(minutes > 0 ? `Haftalık hedef: ${window.formatFocusDuration(minutes * 60)}` : 'Haftalık hedef sıfırlandı');
        }
    }
}

function queuePersistFocusWeeklyGoal() {
    if (window.focusGoalPersistTimer) clearTimeout(window.focusGoalPersistTimer);
    window.focusGoalPersistTimer = setTimeout(() => {
        window.focusGoalPersistTimer = null;
        window.saveData();
        window.refreshFocusWeeklySummaryIfVisible();
    }, 600);
}

function stopFocusWithNote() {
    const snapshot = window.FocusTimer.getSnapshot();
    if (!snapshot?.runtime || snapshot.runtime.status === 'idle') return;
    const noteTemplate = window.buildFocusSessionNoteTemplate(snapshot);
    window.FocusTimer.stop();
    setTimeout(() => {
        window.openNoteModal(null, noteTemplate.category || 'learning', noteTemplate);
        const contentEl = document.getElementById('noteContent');
        if (contentEl) {
            contentEl.focus();
            contentEl.setSelectionRange(contentEl.value.length, contentEl.value.length);
        }
    }, 120);
}

// ----- Window Exports -----
window.openFocusOverlay = openFocusOverlay;
window.closeFocusOverlay = closeFocusOverlay;
window.updateFocusTimerHeaderIndicator = updateFocusTimerHeaderIndicator;
window.getFocusTimerRemainingSeconds = getFocusTimerRemainingSeconds;
window.renderFocusTimerCard = renderFocusTimerCard;
window.updateFocusTimerUi = updateFocusTimerUi;
window.clampFocusWeeklyGoalMinutes = clampFocusWeeklyGoalMinutes;
window.setFocusWeeklyGoalMinutes = setFocusWeeklyGoalMinutes;
window.queuePersistFocusWeeklyGoal = queuePersistFocusWeeklyGoal;
window.stopFocusWithNote = stopFocusWithNote;
