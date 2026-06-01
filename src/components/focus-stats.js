// ===== Focus Timer Statistics =====
// Hedeflerim — Weekly summary and session helpers

// ----- Session Helpers -----
function getFocusSessionSortTime(session) {
    const ms = Date.parse(session?.endedAt || session?.updatedAt || session?.createdAt || '');
    return Number.isFinite(ms) ? ms : 0;
}

function focusSessionOverlapsRange(session, startMs, endMs) {
    const s = Date.parse(session?.startedAt || '');
    const e = Date.parse(session?.endedAt || session?.updatedAt || '');
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return false;
    return e >= startMs && s <= endMs;
}

function pickMostRecentFocusSessions(limit, predicate) {
    const sessions = Array.isArray(window.appData.focusSessions) ? window.appData.focusSessions : [];
    const maxItems = Math.max(0, Math.floor(Number(limit) || 0));
    const top = [];
    let matchCount = 0;

    const insert = (entry) => {
        if (!maxItems) return;
        let i = 0;
        while (i < top.length && entry.t <= top[i].t) i += 1;
        top.splice(i, 0, entry);
        if (top.length > maxItems) top.length = maxItems;
    };

    for (const session of sessions) {
        if (!session || typeof session !== 'object') continue;
        const workSec = Math.max(0, Math.floor(Number(session.workSec) || 0));
        if (workSec < window.FOCUS_SESSION_MIN_SAVE_SEC) continue;
        if (typeof predicate === 'function' && !predicate(session)) continue;

        matchCount += 1;
        const t = getFocusSessionSortTime(session);
        if (!t) continue;

        if (top.length < maxItems) {
            insert({ t, session });
            continue;
        }
        if (t > top[top.length - 1].t) {
            insert({ t, session });
        }
    }

    return { items: top.map(entry => entry.session), total: matchCount };
}

function formatFocusSessionWhen(isoString) {
    const ms = Date.parse(isoString || '');
    if (!Number.isFinite(ms)) return '';
    const d = new Date(ms);
    return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getFocusSessionBadgeText(session) {
    const mode = session?.mode === 'stopwatch' || session?.mode === 'countdown' ? session.mode : 'pomodoro';
    if (mode === 'stopwatch') return 'Kronometre';
    if (mode === 'countdown') {
        const preset = typeof session?.preset === 'string' ? session.preset.trim() : '';
        return preset ? `Geri sayım ${preset}` : 'Geri sayım';
    }
    const preset = typeof session?.preset === 'string' ? session.preset.trim() : '';
    return preset ? `Pomodoro ${preset}` : 'Pomodoro';
}

function renderFocusSessionRow(session) {
    const safeLabel = window.safeText(session?.label, 'Ders');
    const badge = getFocusSessionBadgeText(session);
    const safeBadge = window.safeText(badge);
    const linkBadge = window.getFocusLinkBadgeText(session);
    const safeLinkBadge = window.safeText(linkBadge);
    const duration = window.formatFocusDuration(session?.workSec || 0);
    const when = formatFocusSessionWhen(session?.endedAt || session?.updatedAt || session?.createdAt);
    const safeWhen = window.safeText(when);
    return `
        <div class="focus-history-item">
            <div class="focus-history-main">
                <div class="focus-history-label">${safeLabel}</div>
                <div class="focus-history-meta">
                    <span class="focus-history-badge">${safeBadge}</span>
                    ${safeLinkBadge ? `<span class="focus-history-badge focus-history-link-badge">${safeLinkBadge}</span>` : ''}
                </div>
            </div>
            <div class="focus-history-right">
                <div class="focus-history-duration">${window.safeText(duration)}</div>
                <div class="focus-history-when">${safeWhen}</div>
            </div>
        </div>
    `;
}

function refreshFocusHistoryPreview(force = false) {
    const listEl = document.getElementById('focusHistoryList');
    if (!listEl) return;

    const sessionsCount = Array.isArray(window.appData.focusSessions) ? window.appData.focusSessions.length : 0;
    if (!force && sessionsCount === window.focusHistoryPreviewCache.count) return;

    const picked = pickMostRecentFocusSessions(4);
    const items = picked.items || [];

    let html = '';
    if (items.length === 0) {
        html = `<div class="focus-history-empty">Henüz odak seansı yok. Başlatınca burada görünecek.</div>`;
    } else {
        html = items.map(session => renderFocusSessionRow(session)).join('');
    }

    if (force || html !== window.focusHistoryPreviewCache.html) {
        listEl.innerHTML = html;
        window.focusHistoryPreviewCache.html = html;
    }
    window.focusHistoryPreviewCache = { at: Date.now(), count: sessionsCount, html: window.focusHistoryPreviewCache.html };
}

// ----- Weekly Summary -----
function renderFocusWeeklySummary() {
    const stats = window.FocusTimer.getWeekStats(0);
    const total = stats.totalWorkSec;
    const dayValues = stats.dayWorkSec.map(v => Math.max(0, Number(v) || 0));
    const max = Math.max(1, ...dayValues);

    const start = stats.start;
    const end = stats.end;
    const range = formatFocusWeekRange(start, end);
    const labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    const goalMinutes = Math.max(0, Math.floor(Number(window.appData.settings?.focusWeeklyGoalMinutes) || 0));
    const goalSec = goalMinutes * 60;
    const goalRatio = goalSec > 0 ? (Number(total) || 0) / goalSec : 0;
    const goalPct = Math.max(0, Math.round(goalRatio * 100));
    const goalBarPct = Math.max(0, Math.min(100, goalPct));
    const goalText = goalSec > 0 ? window.formatFocusDuration(goalSec) : 'Yok';
    const goalMetaText = goalSec > 0
        ? `${window.formatFocusDuration(total)} / ${window.formatFocusDuration(goalSec)} (%${goalPct})`
        : 'Hedef yok. Bugün sekmesinden haftalık hedef belirleyebilirsin.';
    const qualityInterruptions = Math.max(0, Math.floor(Number(stats?.interruptions) || 0));
    const qualityCompletionPct = window.clampPercent(Number(stats?.completionRatePct) || 0, 0, 100);
    const qualityDeepScore = window.clampPercent(Number(stats?.deepWorkScore) || 0, 0, 100);

    const rangeStartMs = start.getTime();
    const rangeEndMs = end.getTime();
    const weekPick = pickMostRecentFocusSessions(10, session => focusSessionOverlapsRange(session, rangeStartMs, rangeEndMs));
    const weekItems = weekPick.items || [];
    const weekTotalCount = Math.max(0, Math.floor(Number(weekPick.total) || 0));
    const weekCountLabel = weekTotalCount > weekItems.length
        ? `Son ${weekItems.length} / ${weekTotalCount}`
        : `${weekTotalCount} seans`;
    const weekListHtml = weekItems.length > 0
        ? weekItems.map(session => renderFocusSessionRow(session)).join('')
        : `<div class="focus-history-empty">Bu hafta kaydedilen seans yok.</div>`;
    const cardKey = 'focusWeekly';
    const expanded = window.getProgressCardExpanded(cardKey, false);
    const summaryText = `${range} • ${window.formatFocusDuration(total)} • Derin skor ${qualityDeepScore}/100`;

    return `
        <div class="progress-card focus-weekly-summary progress-collapsible-card ${expanded ? 'is-expanded' : 'is-collapsed'}"
             id="focusWeeklySummaryCard"
             data-progress-card="${cardKey}">
            ${window.renderProgressCollapsibleToggle(cardKey, 'Odak Süresi', summaryText, expanded)}
            <div class="progress-collapsible-body" id="${window.getProgressCardBodyId(cardKey)}" aria-hidden="${expanded ? 'false' : 'true'}">
                <div class="focus-weekly-total">
                    <span>Toplam</span>
                    <strong>${window.escapeHtml(window.formatFocusDuration(total))}</strong>
                </div>
                <div class="focus-weekly-range">${window.escapeHtml(range)}</div>
                <div class="focus-weekly-goalbox">
                    <div class="focus-weekly-goalrow">
                        <span>Hedef</span>
                        <strong>${window.escapeHtml(goalText)}</strong>
                    </div>
                    <div class="focus-weekly-goal-track" aria-hidden="true">
                        <div class="focus-weekly-goal-bar" style="width:${goalBarPct}%;"></div>
                    </div>
                    <div class="focus-weekly-goal-meta">${window.escapeHtml(goalMetaText)}</div>
                </div>
                <div class="focus-weekly-quality">
                    <div class="focus-weekly-quality-item">
                        <span>Kesinti</span>
                        <strong>${qualityInterruptions}</strong>
                    </div>
                    <div class="focus-weekly-quality-item">
                        <span>Tamamlama</span>
                        <strong>%${qualityCompletionPct}</strong>
                    </div>
                    <div class="focus-weekly-quality-item">
                        <span>Derin Skor</span>
                        <strong>${qualityDeepScore}/100</strong>
                    </div>
                </div>
                <div class="focus-weekly-chart" role="img" aria-label="Bu haftanın günlük odak süresi">
                    ${dayValues.map((v, i) => {
        const pct = Math.round((v / max) * 100);
        const height = v > 0 ? Math.max(2, pct) : 0;
        const title = `${labels[i]}: ${window.formatFocusDuration(v)}`;
        return `
                        <div class="focus-weekly-col" title="${window.escapeHtml(title)}">
                            <div class="focus-weekly-bar">
                                <div class="focus-weekly-fill" style="height:${height}%;"></div>
                            </div>
                            <div class="focus-weekly-label">${labels[i]}</div>
                        </div>
                    `;
    }).join('')}
                </div>
                <div class="focus-weekly-sessions">
                    <div class="focus-weekly-sessions-head">
                        <div class="focus-weekly-sessions-title">Bu haftaki seanslar</div>
                        <div class="focus-weekly-sessions-count">${window.escapeHtml(weekCountLabel)}</div>
                    </div>
                    <div class="focus-history-list">
                        ${weekListHtml}
                    </div>
                </div>
                <div class="focus-weekly-hint">Not: 2 dakikanın altındaki seanslar dahil değildir.</div>
            </div>
        </div>
    `;
}

function formatFocusWeekRange(startDate, endDate) {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    const end = endDate instanceof Date ? endDate : new Date(endDate);
    return `${start.getDate()} ${window.getMonthName(start.getMonth())} - ${end.getDate()} ${window.getMonthName(end.getMonth())}`;
}

function renderFocusPastWeeksSummary(weeksToShow) {
    const totalWeeks = Math.max(2, Math.min(24, Math.floor(Number(weeksToShow) || window.FOCUS_WEEKLY_HISTORY_WEEKS)));
    const rows = [];

    for (let offset = -1; offset >= -totalWeeks; offset -= 1) {
        const stats = window.FocusTimer.getWeekStats(offset);
        const start = stats.start;
        const end = stats.end;
        const startMs = start.getTime();
        const endMs = end.getTime();
        const pick = pickMostRecentFocusSessions(1, session => focusSessionOverlapsRange(session, startMs, endMs));
        rows.push({
            offset,
            start,
            end,
            range: formatFocusWeekRange(start, end),
            weekKey: window.getIsoWeekKey(start),
            totalSec: Math.max(0, Math.round(Number(stats?.totalWorkSec) || 0)),
            sessionsCount: Math.max(0, Math.floor(Number(pick?.total) || 0))
        });
    }

    const totalSec = rows.reduce((sum, row) => sum + row.totalSec, 0);
    const averageSec = rows.length > 0 ? Math.round(totalSec / rows.length) : 0;
    const totalSessions = rows.reduce((sum, row) => sum + row.sessionsCount, 0);
    const maxSec = Math.max(1, ...rows.map(row => row.totalSec));
    const bestWeek = rows.reduce((best, row) => {
        if (!best || row.totalSec > best.totalSec) return row;
        return best;
    }, null);

    const bestWeekText = bestWeek && bestWeek.totalSec > 0
        ? `${bestWeek.range} • ${window.formatFocusDuration(bestWeek.totalSec)}`
        : 'Yeterli veri yok';
    const cardKey = 'focusPastWeeks';
    const expanded = window.getProgressCardExpanded(cardKey, false);
    const summaryText = `Son ${rows.length} hafta • Ort. ${window.formatFocusDuration(averageSec)} • ${totalSessions} seans`;

    const listHtml = rows.map((row, idx) => {
        const older = rows[idx + 1] || null;
        const diffSec = older ? row.totalSec - older.totalSec : 0;
        let trendText = 'Karşılaştırma yok';
        let trendClass = '';
        if (older) {
            if (diffSec > 0) {
                trendText = `+${window.formatFocusDuration(diffSec)} vs önceki hafta`;
                trendClass = 'up';
            } else if (diffSec < 0) {
                trendText = `-${window.formatFocusDuration(Math.abs(diffSec))} vs önceki hafta`;
                trendClass = 'down';
            } else {
                trendText = 'Önceki hafta ile aynı';
            }
        }

        const rowLabel = idx === 0 ? 'Geçen hafta' : `${Math.abs(row.offset)} hafta önce`;
        const widthPct = row.totalSec > 0 ? Math.max(4, Math.round((row.totalSec / maxSec) * 100)) : 0;

        return `
            <div class="focus-history-item" title="${window.escapeHtml(`${row.range} (${row.weekKey})`)}">
                <div class="focus-history-main">
                    <div class="focus-history-label">${window.escapeHtml(rowLabel)}</div>
                    <div class="focus-history-meta">
                        <span>${window.escapeHtml(row.range)}</span>
                        <span class="focus-history-badge">${row.sessionsCount} seans</span>
                    </div>
                    <div class="focus-weekly-goal-track" aria-hidden="true">
                        <div class="focus-weekly-goal-bar" style="width:${widthPct}%;"></div>
                    </div>
                </div>
                <div class="focus-history-right">
                    <div class="focus-history-duration">${window.escapeHtml(window.formatFocusDuration(row.totalSec))}</div>
                    <div class="focus-history-when week-compare-value ${trendClass}">${window.escapeHtml(trendText)}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="progress-card focus-weekly-summary progress-collapsible-card ${expanded ? 'is-expanded' : 'is-collapsed'}"
             id="focusPastWeeksSummaryCard"
             data-progress-card="${cardKey}">
            ${window.renderProgressCollapsibleToggle(cardKey, 'Geçmiş Haftalar', summaryText, expanded)}
            <div class="progress-collapsible-body" id="${window.getProgressCardBodyId(cardKey)}" aria-hidden="${expanded ? 'false' : 'true'}">
                <div class="focus-weekly-total">
                    <span>Toplam odak</span>
                    <strong>${window.escapeHtml(window.formatFocusDuration(totalSec))}</strong>
                </div>
                <div class="focus-weekly-range">Son ${rows.length} hafta</div>
                <div class="focus-weekly-goalbox">
                    <div class="focus-weekly-goalrow">
                        <span>Haftalık ortalama</span>
                        <strong>${window.escapeHtml(window.formatFocusDuration(averageSec))}</strong>
                    </div>
                    <div class="focus-weekly-goal-meta">En iyi hafta: ${window.escapeHtml(bestWeekText)} • ${totalSessions} seans</div>
                </div>
                <div class="focus-weekly-sessions">
                    <div class="focus-weekly-sessions-head">
                        <div class="focus-weekly-sessions-title">Haftalara göre detay</div>
                        <div class="focus-weekly-sessions-count">${rows.length} kayıt</div>
                    </div>
                    <div class="focus-history-list">
                        ${listHtml}
                    </div>
                </div>
                <div class="focus-weekly-hint">İpucu: Düzenli artış için her hafta en az bir ek seans hedefle.</div>
            </div>
        </div>
    `;
}

function refreshFocusWeeklySummaryIfVisible() {
    const replaceCardIfVisible = (cardId, renderFn) => {
        const card = document.getElementById(cardId);
        if (!card) return;
        const wrapper = card.parentElement;
        if (!wrapper) return;
        const fresh = renderFn();
        const tmp = document.createElement('div');
        tmp.innerHTML = String(fresh || '').trim();
        const next = tmp.firstElementChild;
        if (!next) return;
        wrapper.replaceChild(next, card);
    };
    replaceCardIfVisible('focusWeeklySummaryCard', () => renderFocusWeeklySummary());
    replaceCardIfVisible('focusPastWeeksSummaryCard', () => renderFocusPastWeeksSummary(window.FOCUS_WEEKLY_HISTORY_WEEKS));
    window.updateProgressCardCollapseDom(document.getElementById('progressContainer') || document);
}

// ----- Window Exports -----
window.getFocusSessionSortTime = getFocusSessionSortTime;
window.focusSessionOverlapsRange = focusSessionOverlapsRange;
window.pickMostRecentFocusSessions = pickMostRecentFocusSessions;
window.formatFocusSessionWhen = formatFocusSessionWhen;
window.getFocusSessionBadgeText = getFocusSessionBadgeText;
window.renderFocusSessionRow = renderFocusSessionRow;
window.refreshFocusHistoryPreview = refreshFocusHistoryPreview;
window.renderFocusWeeklySummary = renderFocusWeeklySummary;
window.formatFocusWeekRange = formatFocusWeekRange;
window.renderFocusPastWeeksSummary = renderFocusPastWeeksSummary;
window.refreshFocusWeeklySummaryIfVisible = refreshFocusWeeklySummaryIfVisible;
