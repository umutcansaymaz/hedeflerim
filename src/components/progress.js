// ===== Progress Component =====
// Hedeflerim — Ilerleme, heatmap, basarimlar
// Extracted from app-v5.js

// ===== Collapsible Card Helpers =====
function isProgressSingleExpandMode() {
    return window.matchMedia?.('(max-width: 768px)')?.matches === true;
}

function getProgressCardBodyId(cardKey) {
    const safeKey = String(cardKey || '').replace(/[^a-zA-Z0-9_-]/g, '');
    return 'progressCardBody_' + safeKey;
}

function getProgressCardExpanded(cardKey, fallbackExpanded = false) {
    if (!PROGRESS_COLLAPSIBLE_CARD_KEYS.includes(cardKey)) return fallbackExpanded;
    return progressCardCollapseState[cardKey] === true;
}

function updateProgressCardCollapseDom(root = document) {
    if (!root) return;
    PROGRESS_COLLAPSIBLE_CARD_KEYS.forEach((cardKey) => {
        const card = root.querySelector?.('[data-progress-card="' + cardKey + '"]');
        if (!card) return;
        const expanded = getProgressCardExpanded(cardKey, false);
        card.classList.toggle('is-expanded', expanded);
        card.classList.toggle('is-collapsed', !expanded);

        const toggle = card.querySelector?.('[data-progress-card-toggle]');
        if (toggle) toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        const body = card.querySelector?.('.progress-collapsible-body');
        if (body) {
            body.setAttribute('aria-hidden', expanded ? 'false' : 'true');
            body.id = getProgressCardBodyId(cardKey);
        }
    });
}

function setProgressCardExpanded(cardKey, expanded, options = {}) {
    if (!PROGRESS_COLLAPSIBLE_CARD_KEYS.includes(cardKey)) return;
    const shouldExpand = Boolean(expanded);
    const singleExpand = options.singleExpand === true || (options.singleExpand !== false && isProgressSingleExpandMode());

    if (shouldExpand && singleExpand) {
        PROGRESS_COLLAPSIBLE_CARD_KEYS.forEach((key) => {
            progressCardCollapseState[key] = key === cardKey;
        });
    } else {
        progressCardCollapseState[cardKey] = shouldExpand;
    }

    persistProgressCardCollapseState();
    updateProgressCardCollapseDom(document.getElementById('progressContainer') || document);
}

function enforceProgressCardCollapsePolicy() {
    if (!isProgressSingleExpandMode()) return;
    const expanded = PROGRESS_COLLAPSIBLE_CARD_KEYS.filter((key) => progressCardCollapseState[key] === true);
    if (expanded.length <= 1) return;
    const keep = expanded[0];
    PROGRESS_COLLAPSIBLE_CARD_KEYS.forEach((key) => {
        progressCardCollapseState[key] = key === keep;
    });
    persistProgressCardCollapseState();
    updateProgressCardCollapseDom(document.getElementById('progressContainer') || document);
}

function renderProgressCollapsibleToggle(cardKey, title, summary, expanded = false) {
    const safeKey = safeText(cardKey);
    const safeTitle = safeText(title);
    const safeSummary = safeText(summary);
    const bodyId = getProgressCardBodyId(cardKey);
    return '<button class="progress-collapsible-toggle" ' +
        'data-progress-card-toggle="' + safeKey + '" ' +
        'aria-expanded="' + (expanded ? 'true' : 'false') + '" ' +
        'aria-controls="' + bodyId + '">' +
        '<span class="progress-collapsible-text">' +
        '<span class="progress-collapsible-title">' + safeTitle + '</span>' +
        '<span class="progress-collapsible-summary">' + safeSummary + '</span>' +
        '</span>' +
        '<span class="progress-collapsible-chevron" aria-hidden="true">&#9662;</span>' +
        '</button>';
}

// ===== Heatmap =====
function _buildActivityMap(year, startDate, endDate, today) {
    const activityMap = {};
    let totalActiveDays = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let d = new Date(startDate); d <= endDate && d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = window.formatDate(d);
        let completedCount = 0;

        window.appData.habits.forEach(habit => {
            if (window.isCompletionDone(habit.completions?.[dateStr])) {
                completedCount++;
            }
        });

        activityMap[dateStr] = completedCount;

        if (completedCount > 0) {
            totalActiveDays++;
            tempStreak++;
            if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else {
            tempStreak = 0;
        }
    }

    let checkDate = new Date(today);
    while (true) {
        const dateStr = window.formatDate(checkDate);
        if (activityMap[dateStr] && activityMap[dateStr] > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return { activityMap, totalActiveDays, currentStreak, longestStreak };
}

function _renderHeatmapGrid(activityMap, startDate, year, today) {
    const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const endDate = new Date(year, 11, 31);

    let gridStart = new Date(year, 0, 1);
    const dayOfWeek = gridStart.getDay();
    if (dayOfWeek !== 1) {
        gridStart.setDate(gridStart.getDate() - ((dayOfWeek + 6) % 7));
    }

    let cellsHtml = '';
    let currentMonth = -1;
    let monthPositions = [];
    let weekCount = 0;

    for (let d = new Date(gridStart); d <= endDate || d.getDay() !== 1; d.setDate(d.getDate() + 1)) {
        const dateStr = window.formatDate(d);
        const activity = activityMap[dateStr] || 0;
        const habitCount = appData.habits.length || 1;
        const percentage = activity / habitCount;

        let level = 0;
        if (activity > 0) {
            if (percentage >= 0.75) level = 4;
            else if (percentage >= 0.5) level = 3;
            else if (percentage >= 0.25) level = 2;
            else level = 1;
        }

        if (d.getMonth() !== currentMonth && d.getFullYear() === year) {
            currentMonth = d.getMonth();
            monthPositions.push({ month: currentMonth, week: weekCount });
        }

        const isOutOfRange = d < startDate || d > today;
        const title = isOutOfRange ? '' : d.toLocaleDateString('tr-TR') + ' - ' + activity + ' aliskanlik';

        cellsHtml += '<div class="heatmap-cell level-' + (isOutOfRange ? 0 : level) + '"' + (title ? ' title="' + title + '"' : '') + '></div>';

        if (d.getDay() === 0) weekCount++;
    }

    let monthsHtml = '<div class="heatmap-months">';
    monthPositions.forEach((pos, i) => {
        const nextPos = monthPositions[i + 1]?.week || weekCount;
        const width = (nextPos - pos.week) * 13;
        monthsHtml += '<span class="heatmap-month" style="min-width:' + width + 'px">' + months[pos.month] + '</span>';
    });
    monthsHtml += '</div>';

    return { monthsHtml, cellsHtml };
}

function _renderHeatmapStats(totalActiveDays, currentStreak, longestStreak) {
    return '<div class="heatmap-stats">' +
        '<div class="heatmap-stat"><div class="heatmap-stat-value">' + totalActiveDays + '</div><div class="heatmap-stat-label">Aktif Gun</div></div>' +
        '<div class="heatmap-stat"><div class="heatmap-stat-value">' + currentStreak + '</div><div class="heatmap-stat-label">Guncel Seri</div></div>' +
        '<div class="heatmap-stat"><div class="heatmap-stat-value">' + longestStreak + '</div><div class="heatmap-stat-label">En Uzun Seri</div></div>' +
        '</div>';
}

function renderHeatmap(year) {
    const today = new Date();
    const startDate = window.PERFORMANCE_MODE
        ? new Date(today.getFullYear(), Math.max(0, today.getMonth() - 5), 1)
        : new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const days = ['Pzt', '', 'Car', '', 'Cum', '', 'Paz'];

    const { activityMap, totalActiveDays, currentStreak, longestStreak } = _buildActivityMap(year, startDate, endDate, today);
    const { monthsHtml, cellsHtml } = _renderHeatmapGrid(activityMap, startDate, year, today);
    const statsHtml = _renderHeatmapStats(totalActiveDays, currentStreak, longestStreak);

    return '<div class="heatmap-section">' +
        '<div class="heatmap-title">' + year + ' Aktivite Haritasi</div>' +
        '<div class="heatmap-scroll">' +
        '<div style="min-width: max-content">' +
        monthsHtml +
        '<div class="heatmap-wrapper">' +
        '<div class="heatmap-days-label">' + days.map(d => '<span>' + d + '</span>').join('') + '</div>' +
        '<div class="heatmap-grid">' + cellsHtml + '</div>' +
        '</div></div></div>' +
        '<div class="heatmap-legend">' +
        '<span>Az</span>' +
        '<div class="heatmap-legend-cells">' +
        '<div class="heatmap-cell level-0"></div>' +
        '<div class="heatmap-cell level-1"></div>' +
        '<div class="heatmap-cell level-2"></div>' +
        '<div class="heatmap-cell level-3"></div>' +
        '<div class="heatmap-cell level-4"></div>' +
        '</div><span>Cok</span></div>' +
        statsHtml + '</div>';
}

// ===== Life Balance =====
function renderLifeBalance() {
    const categoryLabels = {
        health: { name: 'Saglik', color: '#10B981' },
        career: { name: 'Kariyer', color: '#3B82F6' },
        education: { name: 'Egitim', color: '#8B5CF6' },
        spiritual: { name: 'Maneviyat', color: '#F59E0B' },
        social: { name: 'Sosyal', color: '#EC4899' },
        creativity: { name: 'Yaraticilik', color: '#06B6D4' },
        finance: { name: 'Finans', color: '#EF4444' }
    };

    const categoryCounts = {};
    let totalCategorized = 0;

    window.appData.habits.forEach(habit => {
        if (habit.category && categoryLabels[habit.category]) {
            categoryCounts[habit.category] = (categoryCounts[habit.category] || 0) + 1;
            totalCategorized++;
        }
    });

    if (totalCategorized === 0) {
        return '<div class="life-balance-section">' +
            '<div class="life-balance-title">Hayat Dengesi</div>' +
            '<div class="life-balance-empty">Henuz kategorize edilmis aliskanlik yok.<br>Aliskanliklarina kategori ekleyerek denge dairesini olustur.</div>' +
            '</div>';
    }

    let gradientParts = [];
    let currentAngle = 0;
    let legendHtml = '';
    const categoryEntries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    const totalCategoryCount = categoryEntries.length;
    const maxCount = Math.max(0, ...categoryEntries.map(([, count]) => count));
    const dominanceRatio = totalCategorized > 0 ? (maxCount / totalCategorized) : 1;
    const spreadRatio = totalCategoryCount / Object.keys(categoryLabels).length;
    const balanceScore = Math.max(0, Math.min(100, Math.round((spreadRatio * 70) + ((1 - dominanceRatio) * 30))));

    categoryEntries.forEach(([cat, count]) => {
        const percentage = (count / totalCategorized) * 100;
        const startAngle = currentAngle;
        const endAngle = currentAngle + (percentage * 3.6);
        const catInfo = categoryLabels[cat];

        gradientParts.push(catInfo.color + ' ' + startAngle + 'deg ' + endAngle + 'deg');
        currentAngle = endAngle;

        legendHtml += '<div class="life-balance-item">' +
            '<div class="life-balance-dot" style="background: ' + catInfo.color + '"></div>' +
            '<span class="life-balance-label">' + catInfo.name + '</span>' +
            '<span class="life-balance-value">' + count + ' (%' + Math.round(percentage) + ')</span>' +
            '</div>';
    });

    const gradient = 'conic-gradient(' + gradientParts.join(', ') + ')';

    return '<div class="life-balance-section">' +
        '<div class="life-balance-title">Hayat Dengesi</div>' +
        '<div class="life-balance-content">' +
        '<div class="life-balance-chart-panel">' +
        '<div class="life-balance-chart" style="background: ' + gradient + '">' +
        '<div class="life-balance-chart-inner"><strong>' + totalCategorized + '</strong><span>Aliskanlik</span></div>' +
        '</div>' +
        '<div class="life-balance-meta">' +
        '<span>' + totalCategoryCount + ' kategori aktif</span>' +
        '<strong>Denge skoru ' + balanceScore + '/100</strong>' +
        '</div></div>' +
        '<div class="life-balance-legend">' + legendHtml + '</div>' +
        '</div></div>';
}

// ===== Achievements =====
function renderAchievements() {
    if (!window.appData.achievements) window.appData.achievements = [];

    const earnedBadgeIds = new Set(window.appData.achievements.map(a => a.id));

    let badgesHtml = window.ACHIEVEMENT_DEFINITIONS.map(def => {
        const isUnlocked = earnedBadgeIds.has(def.id);
        const earnedDate = isUnlocked ? window.appData.achievements.find(a => a.id === def.id).date : null;
        const dateStr = earnedDate ? new Date(earnedDate).toLocaleDateString('tr-TR') : '';
        const title = isUnlocked ? def.title + '\n' + def.description + '\nKazanildi: ' + dateStr : '???\nBu rozet icin gorevi tamamla.';

        return '<div class="achievement-card' + (isUnlocked ? ' unlocked' : '') + '" title="' + title + '">' +
            '<div class="achievement-icon">' + def.icon + '</div>' +
            '<div class="achievement-name">' + def.title + '</div>' +
            '</div>';
    }).join('');

    return '<div class="achievements-section">' +
        '<div class="achievements-title">Basari Muzesi <span style="font-size:0.8rem; color:var(--text-secondary); margin-left:auto;">' + earnedBadgeIds.size + '/' + window.ACHIEVEMENT_DEFINITIONS.length + '</span></div>' +
        '<div class="achievements-grid">' + badgesHtml + '</div>' +
        '</div>';
}

// ===== Numeric Helpers =====
function getCompletionNumericValue(completionData, fallbackValue = 1) {
    if (!completionData) return 0;
    if (completionData === true) return 1;
    if (typeof completionData === 'number') return completionData;
    if (typeof completionData === 'object' && !Array.isArray(completionData)) {
        if ('value' in completionData) {
            const numeric = Number(completionData.value);
            return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
        }
        return window.isCompletionDone(completionData) ? 1 : 0;
    }
    return window.isCompletionDone(completionData) ? 1 : 0;
}

// ===== Streak Calculations =====
function calculateStreak(completions) {
    if (!completions) return 0;
    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);

    while (true) {
        const dateStr = window.formatDate(currentDate);
        if (window.isCompletionDone(completions[dateStr])) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function calculateLongestStreak(completions) {
    if (!completions) {
        if (!window.appData.habits || window.appData.habits.length === 0) return 0;
        return Math.max(0, ...window.appData.habits.map(h => calculateLongestStreak(h.completions)));
    }

    const dates = Object.keys(completions).filter(dateStr => window.isCompletionDone(completions[dateStr])).sort();
    if (dates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diff = (curr - prev) / (1000 * 60 * 60 * 24);

        if (diff === 1) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }
    return Math.max(longest, current);
}

// ===== getWeekDates is defined in src/components/habits.js =====

// ===== Year Select =====
function populateYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    yearSelect.innerHTML = years.map(year =>
        '<option value="' + year + '"' + (year === currentYear ? ' selected' : '') + '>' + year + '</option>'
    ).join('');
}

// ===== Mood History =====
function renderMoodHistory(year) {
    const entries = window.getMoodEntriesForYear(year);
    const cardKey = 'moodHistory';
    const expanded = getProgressCardExpanded(cardKey, false);
    const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const isCurrentYear = year === new Date().getFullYear();
    const maxListItems = 10;

    if (entries.length === 0) {
        return '<div class="progress-card progress-collapsible-card ' + (expanded ? 'is-expanded' : 'is-collapsed') + '" data-progress-card="' + cardKey + '">' +
            renderProgressCollapsibleToggle(cardKey, 'Ruh Hali Gecmisi', '0 kayit', expanded) +
            '<div class="progress-collapsible-body" id="' + getProgressCardBodyId(cardKey) + '" aria-hidden="' + !expanded + '">' +
            '<div class="mood-history-section"><div class="mood-history-empty">' +
            '<div class="mood-history-empty-icon">📊</div>' +
            '<h4>Henuz ruh hali kaydi yok</h4>' +
            '<p>Her gun ruh halini kaydederek yil boyunca duygusal durumunu takip edebilirsin.</p>' +
            '</div></div></div></div>';
    }

    const values = entries.map(e => e.value);
    const total = entries.length;
    const average = (values.reduce((sum, v) => sum + v, 0) / total).toFixed(1);
    const freq = {};
    values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const topVal = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
    const topMeta = window.getMoodMeta(topVal);

    const monthAvg = Array(12).fill(0);
    const monthCount = Array(12).fill(0);
    entries.forEach(e => { monthAvg[e.date.getMonth()] += e.value; monthCount[e.date.getMonth()]++; });
    for (let i = 0; i < 12; i++) { if (monthCount[i] > 0) monthAvg[i] /= monthCount[i]; }
    const maxAvg = Math.max(1, ...monthAvg);

    const currentMonth = new Date().getMonth();
    const barHtml = monthAvg.map((avg, i) => {
        const pct = (avg / maxAvg) * 100;
        const cur = i === currentMonth && isCurrentYear;
        const empty = monthCount[i] === 0;
        return '<div class="mood-history-bar-item' + (cur ? ' current' : '') + '">' +
            '<div class="mood-history-bar-track"><div class="mood-history-bar-fill' + (empty ? ' empty' : '') + '" style="height:' + (empty ? 0 : pct) + '%"></div></div>' +
            '<span class="mood-history-bar-label">' + months[i] + '</span></div>';
    }).join('');

    const show = entries.slice(0, maxListItems);
    const remaining = total - maxListItems;
    const listHtml = show.map(e => {
        const meta = window.getMoodMeta(e.value);
        const dateStr = e.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
        const noteHtml = e.note ? '<div class="mood-history-note">' + safeText(e.note) + '</div>' : '';
        return '<li class="mood-history-item"><div class="mood-history-item-head"><div class="mood-history-item-main">' +
            '<span class="mood-history-emoji">' + meta.icon + '</span>' +
            '<div class="mood-history-item-text"><div class="mood-history-item-date">' + safeText(dateStr) + '</div>' +
            '<div class="mood-history-item-level">' + safeText(meta.title) + '</div></div></div></div>' +
            noteHtml + '</li>';
    }).join('');

    const summary = total + ' kayit • Ortalama ' + average + '/5';

    return '<div class="progress-card progress-collapsible-card ' + (expanded ? 'is-expanded' : 'is-collapsed') + '" data-progress-card="' + cardKey + '">' +
        renderProgressCollapsibleToggle(cardKey, 'Ruh Hali Gecmisi', summary, expanded) +
        '<div class="progress-collapsible-body" id="' + getProgressCardBodyId(cardKey) + '" aria-hidden="' + !expanded + '">' +
        '<div class="mood-history-section">' +
        '<div class="mood-history-header"><div>' +
        '<h3 class="mood-history-title">Ruh Hali Gecmisi</h3>' +
        '<p class="mood-history-subtitle">' + year + ' yili ruh hali takibi</p></div>' +
        '<span class="mood-history-count">' + total + ' kayit</span></div>' +
        '<div class="mood-history-stats">' +
        '<div class="mood-history-stat-card"><div class="mood-history-stat-label">Ortalama Mod</div><div class="mood-history-stat-value">' + average + '/5</div></div>' +
        '<div class="mood-history-stat-card"><div class="mood-history-stat-label">En Sik Ruh Hali</div><div class="mood-history-stat-value">' + topMeta.icon + ' ' + safeText(topMeta.title) + '</div></div>' +
        '<div class="mood-history-stat-card"><div class="mood-history-stat-label">Toplam Kayit</div><div class="mood-history-stat-value">' + total + ' gun</div></div>' +
        '</div>' +
        '<div class="mood-history-chart"><div class="mood-history-chart-title">Aylik Ortalama Ruh Hali</div>' +
        '<div class="mood-history-bars">' + barHtml + '</div></div>' +
        '<div class="mood-history-list-wrap"><div class="mood-history-list-title">Son Kayitlar</div>' +
        '<ul class="mood-history-list">' + listHtml + '</ul>' +
        (remaining > 0 ? '<div class="mood-history-more">+' + remaining + ' daha eski kayit</div>' : '') +
        '</div></div></div></div>';
}

// ===== Habit Progress Cards =====
function _buildHabitProgressCards(selectedYear) {
    return window.appData.habits.map(habit => {
        const yearPrefix = selectedYear.toString();
        const yearCompletions = Object.keys(habit.completions || {}).filter(date =>
            date.startsWith(yearPrefix) && window.isCompletionDone(habit.completions?.[date])
        );
        const safeHabitName = safeText(habit.name);
        const safeHabitColor = window.sanitizeColor(habit.color);

        const monthlyData = Array(12).fill(0);
        yearCompletions.forEach(date => {
            const month = parseInt(date.split('-')[1]) - 1;
            monthlyData[month]++;
        });

        const totalDays = yearCompletions.length;
        const currentStreakVal = calculateStreak(habit.completions);
        const longestStreakVal = calculateLongestStreak(habit.completions);
        const maxMonthly = Math.max(...monthlyData, 1);

        const badges = [];
        if (longestStreakVal >= 7) badges.push({ icon: '\uD83D\uDD25', title: '7 Gun', desc: 'Ilk hafta' });
        if (longestStreakVal >= 30) badges.push({ icon: '\u26A1', title: '30 Gun', desc: 'Bir ay' });
        if (longestStreakVal >= 100) badges.push({ icon: '\uD83C\uDFC6', title: '100 Gun', desc: 'Efsanevi' });
        if (totalDays >= 50) badges.push({ icon: '\uD83D\uDCC5', title: '50 Gun', desc: 'Iyi tempo' });
        if (totalDays >= 100) badges.push({ icon: '\uD83D\uDCAF', title: '100 Gun+', desc: 'Harika' });

const badgesHtml = badges.length > 0
            ? '<div class="badges-container">' + badges.map(b => '<div class="badge" title="' + safeText(b.desc) + '"><span class="badge-icon">' + b.icon + '</span><span class="badge-title">' + safeText(b.title) + '</span></div>').join('') + '</div>'
            : '';

        const thisWeekDates = window.getWeekDates(0);
        const lastWeekDates = window.getWeekDates(-1);
        let thisWeekCount = 0, lastWeekCount = 0;
        thisWeekDates.forEach(d => { if (window.isCompletionDone(habit.completions?.[window.formatDate(d)])) thisWeekCount++; });
        lastWeekDates.forEach(d => { if (window.isCompletionDone(habit.completions?.[window.formatDate(d)])) lastWeekCount++; });
        const weekDiff = thisWeekCount - lastWeekCount;
        const weekCompareHtml = '<div class="week-compare">' +
            '<span class="week-compare-label">Bu hafta vs gecen hafta:</span>' +
            '<span class="week-compare-value ' + (weekDiff > 0 ? 'up' : weekDiff < 0 ? 'down' : '') + '">' +
            thisWeekCount + ' vs ' + lastWeekCount +
            (weekDiff > 0 ? ' (+' + weekDiff + ')' : weekDiff < 0 ? ' (-' + Math.abs(weekDiff) + ')' : '') +
            '</span></div>';

        const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        const monthBars = monthlyData.map((count, i) => {
            const height = (count / maxMonthly) * 100;
            const isCurrent = i === new Date().getMonth() && selectedYear === new Date().getFullYear();
            return '<div class="bar-item' + (isCurrent ? ' current' : '') + '">' +
                '<div class="bar" style="height: ' + height + '%; background: ' + safeHabitColor + '">' +
                (count > 0 ? '<span class="bar-value">' + count + '</span>' : '') +
                '</div>' +
                '<span class="bar-label">' + months[i] + '</span>' +
                '</div>';
        }).join('');

        return '<div class="progress-card">' +
            '<div class="progress-habit-name">' +
            '<div class="habit-color" style="background: ' + safeHabitColor + '"></div>' +
            safeHabitName +
            '</div>' +
            badgesHtml +
            '<div class="progress-stats">' +
            '<div class="stat-item"><div class="stat-value">' + totalDays + '</div><div class="stat-label">Toplam Gun</div></div>' +
            '<div class="stat-item streak"><div class="stat-value">' + currentStreakVal + ' \uD83D\uDD25</div><div class="stat-label">Guncel Seri</div></div>' +
            '<div class="stat-item"><div class="stat-value">' + longestStreakVal + '</div><div class="stat-label">En Uzun Seri</div></div>' +
            '</div>' +
            weekCompareHtml +
            '<div class="progress-chart">' +
            '<div class="chart-title">Aylik Ilerleme</div>' +
            '<div class="bar-chart">' + monthBars + '</div>' +
            '</div></div>';
    }).join('');
}

// ===== Main Progress Render =====
function renderProgress() {
    const container = document.getElementById('progressContainer');
    const yearSelect = document.getElementById('yearSelect');
    const selectedYear = parseInt(yearSelect.value) || new Date().getFullYear();
    const moodHistoryHtml = renderMoodHistory(selectedYear);
    const weeklyPlannerHtml = renderWeeklyPlanner();
    const focusWeeklyHtml = window.renderFocusWeeklySummary();
    const focusPastWeeksHtml = window.renderFocusPastWeeksSummary(window.FOCUS_WEEKLY_HISTORY_WEEKS);

    if (window.appData.habits.length === 0) {
        container.innerHTML = weeklyPlannerHtml + focusWeeklyHtml + focusPastWeeksHtml + moodHistoryHtml +
            '<div class="empty-state">' +
            '<div class="empty-state-icon">DATA</div>' +
            '<h3>Henuz veri yok</h3>' +
            '<p>Aliskanlik ekleyip takibe basla</p></div>';
        updateProgressCardCollapseDom(container);
        return;
    }

    let progressHtml = weeklyPlannerHtml;
    progressHtml += focusWeeklyHtml;
    progressHtml += focusPastWeeksHtml;
    progressHtml += moodHistoryHtml;
    progressHtml += renderHeatmap(selectedYear);
    progressHtml += renderLifeBalance();
    progressHtml += renderAchievements();
    progressHtml += _buildHabitProgressCards(selectedYear);

    container.innerHTML = progressHtml;
    updateProgressCardCollapseDom(container);
}

// ===== Weekly Planner Functions =====

function _computeHabitStats(habits, weekDateKeys) {
    let completedHabitSteps = 0;
    const activeDays = new Set();
    let plannedGoalSteps = 0;
    let doneGoalSteps = 0;
    let bestHabitName = '';
    let bestHabitDays = 0;

    habits.forEach(habit => {
        const completions = habit.completions && typeof habit.completions === 'object' ? habit.completions : {};
        let doneDays = 0;
        let dailyGoalMetDays = 0;

        weekDateKeys.forEach(dateKey => {
            const completionData = completions[dateKey];
            if (!window.isCompletionDone(completionData)) return;
            doneDays += 1;
            completedHabitSteps += 1;
            activeDays.add(dateKey);

            if (habit.goal && habit.goal.frequency === 'daily') {
                const dailyValue = window.getCompletionNumericValue(completionData, habit.goal.value);
                if (dailyValue >= habit.goal.value) {
                    dailyGoalMetDays += 1;
                }
            }
        });

        if (doneDays > bestHabitDays) {
            bestHabitDays = doneDays;
            bestHabitName = habit.name || '';
        }

        if (!habit.goal) return;

        if (habit.goal.frequency === 'weekly') {
            const target = Math.max(1, Math.floor(Number(habit.goal.value) || 1));
            plannedGoalSteps += target;
            doneGoalSteps += Math.min(target, doneDays);
        } else {
            plannedGoalSteps += 7;
            doneGoalSteps += dailyGoalMetDays;
        }
    });

    return { completedHabitSteps, activeDays, plannedGoalSteps, doneGoalSteps, bestHabitName, bestHabitDays };
}

function _computeMoodStats(weekDateKeys) {
    const moodValues = weekDateKeys
        .map(dateKey => {
            const moodData = appData.moods?.[dateKey];
            const rawValue = moodData && typeof moodData === 'object' ? moodData.value : moodData;
            const numericValue = Math.round(Number(rawValue));
            if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 5) return null;
            return numericValue;
        })
        .filter(value => value !== null);

    const moodAverage = moodValues.length > 0
        ? Number((moodValues.reduce((sum, value) => sum + value, 0) / moodValues.length).toFixed(1))
        : null;

    return { moodAverage, moodValues };
}

function _computeNotesCount(notes, weekStart, weekEnd) {
    return notes.filter(note => {
        const createdAt = new Date(note.createdAt);
        if (!Number.isFinite(createdAt.getTime())) return false;
        return createdAt >= weekStart && createdAt <= weekEnd;
    }).length;
}

function _buildWeeklySummaryText(params) {
    const { weekStartLabel, weekEndLabel, completedHabitSteps, activeDays, plannedGoalSteps, doneGoalSteps, bestHabitName, bestHabitDays, moodAverage, moodValues, notesThisWeek } = params;

    const lines = [];
    lines.push(`${weekStartLabel} - ${weekEndLabel} haftasında ${completedHabitSteps} alışkanlık adımı tamamladım.`);
    lines.push(`${activeDays.size}/7 gün aktif kaldım.`);

    if (plannedGoalSteps > 0) {
        const goalRate = Math.round((doneGoalSteps / plannedGoalSteps) * 100);
        lines.push(`Hedef gerçekleşme oranım %${goalRate} (${doneGoalSteps}/${plannedGoalSteps} hedef adımı).`);
    }

    if (bestHabitName && bestHabitDays > 0) {
        lines.push(`En istikrarlı alışkanlığım: ${bestHabitName} (${bestHabitDays} gün).`);
    }

    if (moodAverage !== null) {
        const moodMeta = window.getMoodMeta(Math.round(moodAverage));
        lines.push(`Ruh hali ortalamam ${moodAverage}/5 (${moodMeta.title.toLowerCase()}).`);
    }

    if (notesThisWeek > 0) {
        lines.push(`Bu hafta ${notesThisWeek} not/günlük girdisi ekledim.`);
    }

    if (completedHabitSteps === 0 && moodValues.length === 0 && notesThisWeek === 0) {
        lines.length = 0;
        lines.push(`${weekStartLabel} - ${weekEndLabel} haftasında ölçülebilir kayıt az.`);
        lines.push('İlk küçük adımı attığında kazanımlar burada otomatik görünecek.');
    }

    const text = lines.map(function (line) { return '\u2022 ' + line; }).join('\n');
    const sourceLabel = completedHabitSteps === 0 && moodValues.length === 0 && notesThisWeek === 0
        ? 'Otomatik özet veri az olduğu için kısa tutuldu.'
        : 'Otomatik özet, bu haftaki gerçek verilerden üretildi.';

    return { text, sourceLabel };
}

function computeWeeklyWinsSuggestion(weekDates = window.getWeekDates(0)) {
    const weekDateKeys = weekDates.map(function (date) { return window.formatDate(date); });
    const weekStartLabel = weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const weekEndLabel = weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const habits = Array.isArray(appData.habits) ? appData.habits : [];
    const notes = Array.isArray(appData.notes) ? appData.notes : [];

    const habitStats = _computeHabitStats(habits, weekDateKeys);
    const { moodAverage, moodValues } = _computeMoodStats(weekDateKeys);

    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const notesThisWeek = _computeNotesCount(notes, weekStart, weekEnd);

    return _buildWeeklySummaryText({
        weekStartLabel: weekStartLabel,
        weekEndLabel: weekEndLabel,
        completedHabitSteps: habitStats.completedHabitSteps,
        activeDays: habitStats.activeDays,
        plannedGoalSteps: habitStats.plannedGoalSteps,
        doneGoalSteps: habitStats.doneGoalSteps,
        bestHabitName: habitStats.bestHabitName,
        bestHabitDays: habitStats.bestHabitDays,
        moodAverage: moodAverage,
        moodValues: moodValues,
        notesThisWeek: notesThisWeek
    });
}

function fillWeeklyWinsSuggestionFromUi() {
    const winsInput = document.getElementById('weeklyWinsInput');
    if (!winsInput) return;

    const suggestion = computeWeeklyWinsSuggestion();
    const currentValue = (winsInput.value || '').trim();

    if (currentValue && currentValue !== suggestion.text) {
        const shouldOverwrite = confirm('Mevcut kazanım notu akıllı özet ile güncellensin mi?');
        if (!shouldOverwrite) return;
    }

    winsInput.value = suggestion.text;
    winsInput.focus();
    winsInput.setSelectionRange(winsInput.value.length, winsInput.value.length);
    saveWeeklyPlannerFromUi({ silent: true, refresh: false });
    const sourceMeta = document.getElementById('weeklyWinsSourceMeta');
    if (sourceMeta) sourceMeta.textContent = suggestion.sourceLabel;
    window.showToast('Haftanın kazanımları akıllı özet ile güncellendi');
}

function clampAnnualGoalValue(value) {
    return Math.max(0, Math.min(100000000, Math.floor(Number(value) || 0)));
}

function normalizeAnnualGoalUnit(value) {
    return window.truncateText(typeof value === 'string' ? value : '', 24) || 'adım';
}

function distributeAnnualGoalAcross12Weeks(annualGoalValue) {
    const annual = clampAnnualGoalValue(annualGoalValue);
    if (annual <= 0) return Array.from({ length: 12 }, () => 0);
    const twelveWeekTotal = Math.max(1, Math.round((annual * 12) / 52));
    const base = Math.floor(twelveWeekTotal / 12);
    const remainder = twelveWeekTotal % 12;
    return Array.from({ length: 12 }, (_, idx) => base + (idx < remainder ? 1 : 0));
}

function getTwelveWeekPlanRows(now = new Date()) {
    const annualGoalValue = clampAnnualGoalValue(appData.settings?.annualGoalValue);
    const annualGoalUnit = normalizeAnnualGoalUnit(appData.settings?.annualGoalUnit);
    const distributedTargets = distributeAnnualGoalAcross12Weeks(annualGoalValue);
    const rows = [];

    for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
        const weekDates = window.getWeekDates(weekOffset);
        const weekStart = weekDates[0];
        const weekEnd = weekDates[6];
        const weekKey = window.getIsoWeekKey(weekStart);
        const reviewEntry = window.getWeeklyReviewEntry(weekKey);
        const target = Math.max(0, Math.floor(Number(reviewEntry.goalTarget) || distributedTargets[weekOffset] || 0));
        const actual = Math.max(0, Math.floor(Number(reviewEntry.goalActual) || 0));
        rows.push({
            weekOffset,
            weekKey,
            range: window.formatFocusWeekRange(weekStart, weekEnd),
            target,
            actual
        });
    }

    const totalTarget = rows.reduce((sum, row) => sum + row.target, 0);
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
    const progressPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

    return {
        annualGoalValue,
        annualGoalUnit,
        rows,
        totalTarget,
        totalActual,
        progressPct
    };
}

function updateAnnualGoalSettings(value, unit) {
    if (!window.appData.settings) window.appData.settings = {};
    window.appData.settings.annualGoalValue = clampAnnualGoalValue(value);
    window.appData.settings.annualGoalUnit = normalizeAnnualGoalUnit(unit);
    window.saveData();
}

function updateTwelveWeekEntry(weekKey, patch) {
    const currentEntry = window.normalizeWeeklyReviewEntry(window.getWeeklyReviewEntry(weekKey));
    weeklyReviewStore[weekKey] = {
        ...currentEntry,
        ...patch,
        updatedAt: new Date().toISOString()
    };
}

function update12WeekGoalTarget(weekKey, value) {
    updateTwelveWeekEntry(weekKey, { goalTarget: Math.max(0, Math.floor(Number(value) || 0)) });
    window.persistWeeklyReviewStore();
    window.renderTabContent('progress');
}
window.update12WeekGoalTarget = update12WeekGoalTarget;

function update12WeekGoalActual(weekKey, value) {
    updateTwelveWeekEntry(weekKey, { goalActual: Math.max(0, Math.floor(Number(value) || 0)) });
    window.persistWeeklyReviewStore();
    window.renderTabContent('progress');
}
window.update12WeekGoalActual = update12WeekGoalActual;

function applyAnnualGoalTo12Weeks() {
    const plan = getTwelveWeekPlanRows(new Date());
    const distributedTargets = distributeAnnualGoalAcross12Weeks(plan.annualGoalValue);
    plan.rows.forEach((row, idx) => {
        updateTwelveWeekEntry(row.weekKey, { goalTarget: distributedTargets[idx] });
    });
    window.persistWeeklyReviewStore();
    window.renderTabContent('progress');
    window.showToast('12 haftalık plan yıllık hedeften güncellendi');
}
window.applyAnnualGoalTo12Weeks = applyAnnualGoalTo12Weeks;

function _getWeeklyPlannerData() {
    const now = new Date();
    const currentWeekKey = window.getIsoWeekKey(now);
    const prevDate = new Date(now);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevWeekKey = window.getIsoWeekKey(prevDate);
    const current = window.getWeeklyReviewEntry(currentWeekKey);
    const prev = window.getWeeklyReviewEntry(prevWeekKey);
    const suggestion = computeWeeklyWinsSuggestion(window.getWeekDates(0));
    const hasManualWins = Boolean((current.wins || '').trim());
    const winsText = hasManualWins ? current.wins : suggestion.text;
    const winsSource = hasManualWins
        ? 'Manuel düzenleme aktif. İstersen Akıllı Doldur ile yeniden üretebilirsin.'
        : suggestion.sourceLabel;
    const lastWeekSummaryParts = [];
    if (prev.wins) lastWeekSummaryParts.push('Geçen hafta kazanım: ' + prev.wins.slice(0, 90));
    if (prev.blockers) lastWeekSummaryParts.push('Tıkanan nokta: ' + prev.blockers.slice(0, 90));
    const lastWeekSummary = lastWeekSummaryParts.length > 0
        ? lastWeekSummaryParts.join(' • ')
        : 'Geçen haftadan kayıt yok.';
    const filledFieldCount = [current.focus, current.wins, current.blockers, current.nextWeekFocus]
        .filter(value => String(value || '').trim()).length;
    const cardKey = 'weeklyPlanner';
    const expanded = getProgressCardExpanded(cardKey, false);
    const summaryText = currentWeekKey + ' • ' + filledFieldCount + '/4 alan dolu';
    const goalPlan = getTwelveWeekPlanRows(now);
    const annualGoalUnit = safeText(goalPlan.annualGoalUnit);
    return { now, currentWeekKey, current, prev, winsText, winsSource, lastWeekSummary, cardKey, expanded, summaryText, goalPlan, annualGoalUnit };
}

function _buildWeeklyPlanRowsHTML(goalPlan, annualGoalUnit) {
    const planRowsHtml = goalPlan.rows.map(function(row) {
        var safeWeekKey = window.escapeJsSingleQuote(row.weekKey || '');
        var weekLabel = row.weekOffset === 0 ? 'Bu hafta • ' + row.range : row.range;
        return '<div class="goal12-row">' +
            '<div class="goal12-week">' + safeText(weekLabel) + '</div>' +
            '<label class="goal12-input-wrap">' +
            '<span>Hedef</span>' +
            '<input type="number" min="0" max="1000000" step="1" value="' + row.target + '"' +
            ' onchange="update12WeekGoalTarget(decodeJsSingleQuote(\'' + safeWeekKey + '\'), this.value)">' +
            '</label>' +
            '<label class="goal12-input-wrap">' +
            '<span>Gerçek</span>' +
            '<input type="number" min="0" max="1000000" step="1" value="' + row.actual + '"' +
            ' onchange="update12WeekGoalActual(decodeJsSingleQuote(\'' + safeWeekKey + '\'), this.value)">' +
            '</label>' +
            '</div>';
    }).join('');
    var planProgressText = goalPlan.totalActual + '/' + goalPlan.totalTarget + ' ' + annualGoalUnit + ' • %' + goalPlan.progressPct;
    return { planRowsHtml: planRowsHtml, planProgressText: planProgressText };
}

function renderWeeklyPlanner() {
    var data = _getWeeklyPlannerData();
    var plan = _buildWeeklyPlanRowsHTML(data.goalPlan, data.annualGoalUnit);
    var expandedClass = data.expanded ? 'is-expanded' : 'is-collapsed';
    var ariaHidden = data.expanded ? 'false' : 'true';

    return '<section class="weekly-planner-section progress-collapsible-card ' + expandedClass + '"' +
        ' id="weeklyPlannerCard"' +
        ' data-progress-card="' + data.cardKey + '">' +
        renderProgressCollapsibleToggle(data.cardKey, 'Haftalık Plan & Review', data.summaryText, data.expanded) +
        '<div class="progress-collapsible-body" id="' + getProgressCardBodyId(data.cardKey) + '" aria-hidden="' + ariaHidden + '">' +
        '<p class="weekly-planner-subtitle">' + data.currentWeekKey + ' • ' + safeText(data.lastWeekSummary) + '</p>' +

        '<div class="weekly-planner-grid">' +
        '<div class="weekly-planner-field">' +
        '<label>Bu haftanın odak noktası</label>' +
        '<textarea id="weeklyFocusInput">' + safeText(data.current.focus) + '</textarea>' +
        '</div>' +
        '<div class="weekly-planner-field">' +
        '<div class="weekly-planner-field-head">' +
        '<label>Haftanın kazanımları</label>' +
        '<button type="button" class="weekly-fill-btn" id="fillWeeklyWinsBtn">Akıllı Doldur</button>' +
        '</div>' +
        '<textarea id="weeklyWinsInput">' + safeText(data.winsText) + '</textarea>' +
        '<p class="weekly-planner-hint" id="weeklyWinsSourceMeta">' + safeText(data.winsSource) + '</p>' +
        '</div>' +
        '<div class="weekly-planner-field">' +
        '<label>Zorlandığım konular</label>' +
        '<textarea id="weeklyBlockersInput">' + safeText(data.current.blockers) + '</textarea>' +
        '</div>' +
        '<div class="weekly-planner-field">' +
        '<label>Gelecek hafta için net hedef</label>' +
        '<textarea id="nextWeekFocusInput">' + safeText(data.current.nextWeekFocus) + '</textarea>' +
        '</div>' +
        '</div>' +

        '<div class="goal12-section">' +
        '<div class="goal12-head">' +
        '<div>' +
        '<h4>12 Haftalık Hedef Planı</h4>' +
        '<p>Yıllık hedefi 12 haftaya kır, haftalık hedef/gerçek takibini sürdür.</p>' +
        '</div>' +
        '<button type="button" class="weekly-fill-btn" onclick="applyAnnualGoalTo12Weeks()">12 Haftaya Dağıt</button>' +
        '</div>' +
        '<div class="goal12-annual">' +
        '<label class="goal12-annual-field">' +
        '<span>Yıllık hedef</span>' +
        '<input type="number" id="annualGoalValueInput" min="0" max="100000000" step="1" value="' + data.goalPlan.annualGoalValue + '">' +
        '</label>' +
        '<label class="goal12-annual-field">' +
        '<span>Birim</span>' +
        '<input type="text" id="annualGoalUnitInput" maxlength="24" value="' + data.annualGoalUnit + '">' +
        '</label>' +
        '<button type="button" class="btn btn-secondary goal12-annual-save" id="saveAnnualGoalBtn">Yıllık Hedefi Kaydet</button>' +
        '</div>' +
        '<div class="goal12-meta">' + plan.planProgressText + '</div>' +
        '<div class="goal12-grid">' +
        plan.planRowsHtml +
        '</div>' +
        '</div>' +

        '<div class="weekly-planner-actions">' +
        '<button class="btn btn-primary" id="saveWeeklyPlannerBtn" data-week-key="' + data.currentWeekKey + '">Review Kaydet</button>' +
        '</div>' +
        '</div>' +
        '</section>';
}

function isWeeklyPlannerField(targetId) {
    return targetId === 'weeklyFocusInput'
        || targetId === 'weeklyWinsInput'
        || targetId === 'weeklyBlockersInput'
        || targetId === 'nextWeekFocusInput';
}

function captureWeeklyPlannerFromUi() {
    const saveBtn = document.getElementById('saveWeeklyPlannerBtn');
    if (!saveBtn) return false;
    const weekKey = saveBtn.dataset.weekKey || window.getIsoWeekKey(new Date());
    const currentEntry = window.normalizeWeeklyReviewEntry(window.getWeeklyReviewEntry(weekKey));
    weeklyReviewStore[weekKey] = {
        ...currentEntry,
        focus: (document.getElementById('weeklyFocusInput')?.value || '').trim(),
        wins: (document.getElementById('weeklyWinsInput')?.value || '').trim(),
        blockers: (document.getElementById('weeklyBlockersInput')?.value || '').trim(),
        nextWeekFocus: (document.getElementById('nextWeekFocusInput')?.value || '').trim(),
        updatedAt: new Date().toISOString()
    };
    return true;
}

function flushWeeklyPlannerAutosave(options = {}) {
    if (window.weeklyPlannerPersistTimer) {
        clearTimeout(window.weeklyPlannerPersistTimer);
        window.weeklyPlannerPersistTimer = null;
    }
    window.persistWeeklyReviewStore(options);
}

function queueWeeklyPlannerAutosave() {
    if (!captureWeeklyPlannerFromUi()) return;
    if (window.weeklyPlannerPersistTimer) clearTimeout(window.weeklyPlannerPersistTimer);
    window.weeklyPlannerPersistTimer = setTimeout(() => {
        window.weeklyPlannerPersistTimer = null;
        window.persistWeeklyReviewStore();
    }, 350);
}

function saveWeeklyPlannerFromUi(options = {}) {
    if (!captureWeeklyPlannerFromUi()) return;
    flushWeeklyPlannerAutosave();
    if (options.silent !== true) {
        window.showToast('Haftalık review kaydedildi');
    }
    if (options.refresh !== false) {
        window.renderTabContent('progress');
    }
}

window.isProgressSingleExpandMode = isProgressSingleExpandMode;
window.getProgressCardBodyId = getProgressCardBodyId;
window.getProgressCardExpanded = getProgressCardExpanded;
window.updateProgressCardCollapseDom = updateProgressCardCollapseDom;
window.setProgressCardExpanded = setProgressCardExpanded;
window.enforceProgressCardCollapsePolicy = enforceProgressCardCollapsePolicy;
window.renderProgressCollapsibleToggle = renderProgressCollapsibleToggle;
window.renderHeatmap = renderHeatmap;
window.renderLifeBalance = renderLifeBalance;
window.renderAchievements = renderAchievements;
window.getCompletionNumericValue = getCompletionNumericValue;
window.calculateStreak = calculateStreak;
window.calculateLongestStreak = calculateLongestStreak;
window.populateYearSelect = populateYearSelect;
window.renderMoodHistory = renderMoodHistory;
window.renderProgress = renderProgress;
window.renderWeeklyPlanner = renderWeeklyPlanner;
window.fillWeeklyWinsSuggestionFromUi = fillWeeklyWinsSuggestionFromUi;
window.saveWeeklyPlannerFromUi = saveWeeklyPlannerFromUi;
window.isWeeklyPlannerField = isWeeklyPlannerField;
window.updateAnnualGoalSettings = updateAnnualGoalSettings;
window.update12WeekGoalTarget = update12WeekGoalTarget;
window.update12WeekGoalActual = update12WeekGoalActual;
window.applyAnnualGoalTo12Weeks = applyAnnualGoalTo12Weeks;
window.computeWeeklyWinsSuggestion = computeWeeklyWinsSuggestion;
window.flushWeeklyPlannerAutosave = flushWeeklyPlannerAutosave;
window.queueWeeklyPlannerAutosave = queueWeeklyPlannerAutosave;
window.captureWeeklyPlannerFromUi = captureWeeklyPlannerFromUi;
