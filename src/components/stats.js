// ===== Stats Component =====
// Hedeflerim — İstatistikler, SmartCoach, ruh hali, XP/Level/Achievement
// Extracted from app-v5.js

let pendingMoodValue = null;

// Track mouse/touch clicks for XP floating animation coordinates
let lastClickX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
let lastClickY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;

if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (e.clientX || e.clientY) {
            lastClickX = e.clientX;
            lastClickY = e.clientY;
        }
    }, true);
}

function showXPFloatingText(amount) {
    if (typeof document === 'undefined') return;
    const floatEl = document.createElement('div');
    floatEl.className = 'xp-floating-text';
    floatEl.textContent = `+${amount} XP`;
    floatEl.style.left = `${lastClickX}px`;
    floatEl.style.top = `${lastClickY}px`;
    document.body.appendChild(floatEl);

    setTimeout(() => floatEl.remove(), 1200);
}

function triggerLevelUpEffects() {
    if (typeof document === 'undefined') return;
    const xpTrack = document.querySelector('.xp-track');
    const levelBadge = document.getElementById('userLevel');
    if (xpTrack) {
        xpTrack.classList.add('level-up-pulse');
        setTimeout(() => xpTrack.classList.remove('level-up-pulse'), 1500);
    }
    if (levelBadge) {
        levelBadge.classList.add('level-up-badge-pulse');
        setTimeout(() => levelBadge.classList.remove('level-up-badge-pulse'), 1500);
    }
}

// ===== XP & Level System =====

function addXP(amount) {
    if (typeof window.appData.xp === 'undefined') window.appData.xp = 0;
    if (typeof window.appData.level === 'undefined') window.appData.level = 1;

    window.appData.xp += amount;
    showXPFloatingText(amount);

    const nextLevelXP = calculateNextLevelXP(window.appData.level);
    if (window.appData.xp >= nextLevelXP) {
        window.appData.xp -= nextLevelXP;
        window.appData.level++;
        window.showToast(`Seviye atladın: ${window.appData.level}`);
        window.triggerConfetti();
        triggerLevelUpEffects();
    }

    window.saveData();
    // XP widgets live on dashboard; avoid rendering hidden tabs.
    if (document.getElementById('dashboardGreeting') && window.getActiveTabId() === 'dashboard') {
        window.renderDashboard();
    }
}

function getLevelTitle(level) {
    if (level >= 50) return 'Efsane';
    if (level >= 30) return 'Usta';
    if (level >= 20) return 'Uzman';
    if (level >= 10) return 'Deneyimli';
    if (level >= 5) return 'Çırak';
    return 'Acemi';
}

function calculateNextLevelXP(level) {
    return level * 100 * 1.5;
}

function calculateXPPercent() {
    const next = calculateNextLevelXP(window.appData.level || 1);
    const text = window.appData.xp || 0;
    return Math.min((text / next) * 100, 100);
}

// ===== Achievement Logic =====

function checkAchievements() {
    if (!window.appData.achievements) window.appData.achievements = [];
    let newBadgeEarned = false;

    // Helper to award badge
    const awardBadge = (badgeId) => {
        if (!window.appData.achievements.find(a => a.id === badgeId)) {
            const badge = window.ACHIEVEMENT_DEFINITIONS.find(d => d.id === badgeId);
            if (badge) {
                window.appData.achievements.push({
                    id: badgeId,
                    date: new Date().toISOString()
                });
                newBadgeEarned = true;
                window.showToast(`Rozet kazanıldı: ${badge.title}`);
                window.triggerConfetti();
            }
        }
    };

    // 1. Time-based Badges (Early Bird / Night Owl)
    window.appData.habits.forEach(habit => {
        if (habit.completions) {
            Object.values(habit.completions).forEach(completion => {
                if (!window.isCompletionDone(completion)) return;
                // Handle both old format (value only) and new format (object with time)
                const time = completion.time || (typeof completion === 'string' ? completion : null);
                if (time) {
                    const date = new Date(time);
                    const hour = date.getHours();

                    // Early Bird: 04:00 - 08:00
                    if (hour >= 4 && hour < 8) awardBadge('early_bird');

                    // Night Owl: 00:00 - 03:00
                    if (hour >= 0 && hour < 3) awardBadge('night_owl');
                }
            });

            // 2. Streaks
            const streak = window.calculateStreak(habit.completions);
            if (streak >= 7) awardBadge('streak_7');
            if (streak >= 30) awardBadge('streak_30');
            if (streak >= 100) awardBadge('streak_100');
        }
    });

    // 3. Books
    if (window.appData.books) {
        const finishedBooks = window.appData.books.filter(b => b.status === 'completed').length;
        if (finishedBooks >= 1) awardBadge('bookworm');
        if (finishedBooks >= 10) awardBadge('library');
    }

    // 4. Counts
    if (window.appData.habits.length >= 5) awardBadge('multi_tasker');
    if (window.appData.todos && window.appData.todos.length >= 5) awardBadge('planner');

    // 5. Balanced Life
    const categories = new Set();
    window.appData.habits.forEach(h => {
        if (h.category) categories.add(h.category);
    });
    if (categories.size >= 3) awardBadge('balanced_life');

    return newBadgeEarned;
}

// ===== Mood Icons (custom SVG) =====

const MOOD_CONFIGS = {
    1: { bg: '#e74c3c', label: 'Zor bir gün' },
    2: { bg: '#e67e22', label: 'Düşük enerji' },
    3: { bg: '#facc15', label: 'Normal' },
    4: { bg: '#4ade80', label: 'İyi' },
    5: { bg: '#22c55e', label: 'Harika' }
};

function getMoodEyesSvg(type) {
    if (type === 'closed') {
        return '<path d="M17 27 Q21 30 25 27 M39 27 Q43 30 47 27" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    }
    if (type === 'sparkle') {
        return '<circle cx="21" cy="27" r="2.6" fill="#fff"/><circle cx="43" cy="27" r="2.6" fill="#fff"/>' +
            '<path d="M21 19v3 M21 32v3 M13 27h3 M26 27h3 M43 19v3 M43 32v3 M35 27h3 M48 27h3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
    }
    return '<circle cx="21" cy="27" r="3.2" fill="#fff"/><circle cx="43" cy="27" r="3.2" fill="#fff"/>';
}

function getMoodMouthSvg(type) {
    if (type === 'down') return '<path d="M20 46 Q32 39 44 46" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    if (type === 'flat') return '<path d="M23 44 H41" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>';
    if (type === 'smile') {
        return '<path d="M20 42 Q32 50 44 42" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
            '<circle cx="15" cy="36" r="3" fill="rgba(255,255,255,0.35)"/><circle cx="49" cy="36" r="3" fill="rgba(255,255,255,0.35)"/>';
    }
    return '<path d="M18 42 Q32 55 46 42" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
        '<circle cx="15" cy="36" r="3.4" fill="rgba(255,255,255,0.35)"/><circle cx="49" cy="36" r="3.4" fill="rgba(255,255,255,0.35)"/>';
}

function getMoodIconSvg(value) {
    const v = Number(value) || 3;
    const cfg = MOOD_CONFIGS[v] || MOOD_CONFIGS[3];
    const eyesType = v <= 2 ? 'closed' : (v === 5 ? 'sparkle' : 'dot');
    const mouthType = v <= 1 ? 'down' : (v === 2 ? 'flat' : (v === 3 ? 'flat' : (v === 4 ? 'smile' : 'big')));
    return '<svg class="mood-icon" viewBox="0 0 64 64" role="img" aria-label="' + cfg.label + '">' +
        '<circle cx="32" cy="32" r="30" fill="' + cfg.bg + '"/>' +
        '<circle cx="32" cy="32" r="28.5" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/>' +
        getMoodEyesSvg(eyesType) +
        getMoodMouthSvg(mouthType) +
        '</svg>';
}

function getMoodMeta(value) {
    const safeValue = Number(value);
    if (safeValue <= 1) return { icon: getMoodIconSvg(1), title: 'Zor bir gün' };
    if (safeValue === 2) return { icon: getMoodIconSvg(2), title: 'Düşük enerji' };
    if (safeValue === 3) return { icon: getMoodIconSvg(3), title: 'Normal' };
    if (safeValue === 4) return { icon: getMoodIconSvg(4), title: 'İyi' };
    return { icon: getMoodIconSvg(5), title: 'Harika' };
}

function getMoodEntriesForYear(year) {
    const moods = window.appData.moods && typeof window.appData.moods === 'object' ? window.appData.moods : {};
    const yearNumber = Number(year) || new Date().getFullYear();

    return Object.entries(moods)
        .map(([dateKey, mood]) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

            const date = new Date(dateKey + 'T12:00:00');
            if (!Number.isFinite(date.getTime())) return null;
            if (date.getFullYear() !== yearNumber) return null;

            const rawValue = mood && typeof mood === 'object' ? mood.value : mood;
            const numericValue = Math.round(Number(rawValue));
            if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 5) return null;

            const rawNote = mood && typeof mood === 'object' ? mood.note : '';
            const note = typeof rawNote === 'string' ? rawNote.trim() : '';

            return { dateKey, date, value: numericValue, note };
        })
        .filter(Boolean)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// renderMoodHistory is defined in src/components/progress.js

function renderMoodTracker() {
    const container = document.getElementById('moodTracker');
    if (!container) return;

    const today = window.formatDate(new Date());
    if (!window.appData.moods) window.appData.moods = {};
    const currentMood = window.appData.moods[today];

    if (currentMood) {
        const info = getMoodMeta(currentMood.value);
        const noteHtml = currentMood.note
            ? '<div class="mood-note-display">"' + safeText(currentMood.note) + '"</div>'
            : '';

        container.innerHTML = '<div class="mood-summary">' +
            '<div class="mood-summary-icon">' + info.icon + '</div>' +
            '<div>' + info.title + '</div>' +
            noteHtml +
            '<button class="btn-text" onclick="window.resetMood(\'' + today + '\')">Değiştir</button>' +
            '</div>';
    } else {
        container.innerHTML = '<div class="mood-title">Bugün nasıl hissediyorsun?</div>' +
            '<div class="mood-options">' +
            '<button class="mood-btn" onclick="window.selectMood(1)" title="Zor bir gün">' + getMoodIconSvg(1) + '</button>' +
            '<button class="mood-btn" onclick="window.selectMood(2)" title="Düşük enerji">' + getMoodIconSvg(2) + '</button>' +
            '<button class="mood-btn" onclick="window.selectMood(3)" title="Normal">' + getMoodIconSvg(3) + '</button>' +
            '<button class="mood-btn" onclick="window.selectMood(4)" title="İyi">' + getMoodIconSvg(4) + '</button>' +
            '<button class="mood-btn" onclick="window.selectMood(5)" title="Harika">' + getMoodIconSvg(5) + '</button>' +
            '</div>' +
            '<div id="moodNoteContainer" class="mood-note-container" style="display:none;">' +
            '<textarea id="moodNoteInput" class="mood-note-input" placeholder="Bugün neden böyle hissediyorsun? (opsiyonel)"></textarea>' +
            '<button class="btn btn-primary" style="margin-top:8px;" onclick="window.confirmMood()">Kaydet</button>' +
            '</div>';
    }
}

function selectMood(val) {
    pendingMoodValue = val;
    document.querySelectorAll('.mood-btn').forEach((btn, i) => {
        btn.style.opacity = (i + 1 === val) ? '1' : '0.4';
        btn.style.transform = (i + 1 === val) ? 'scale(1.2)' : 'scale(1)';
    });
    document.getElementById('moodNoteContainer').style.display = 'block';
}

function confirmMood() {
    if (!pendingMoodValue) return;
    const note = (document.getElementById('moodNoteInput')?.value?.trim()) || '';
    saveMoodWithNote(pendingMoodValue, note);
    pendingMoodValue = null;
}

function saveMoodWithNote(val, note) {
    if (!window.appData.moods) window.appData.moods = {};
    window.appData.moods[window.formatDate(new Date())] = {
        value: val,
        note: note,
        timestamp: new Date().toISOString()
    };
    window.saveData();
    renderMoodTracker();
    window.addXP(10);
    window.showToast('Ruh hali kaydedildi! +10 XP');
    window.triggerConfetti();
}

function resetMood(date) {
    if (window.appData.moods) delete window.appData.moods[date];
    window.saveData();
    renderMoodTracker();
}

// ===== SmartCoach AI Logic =====
function collectHabitTrends(habits, recent14, todayStr) {
    const weekdayStats = Array.from({ length: 7 }, () => ({ planned: 0, done: 0 }));
    let planned14 = 0;
    let done14 = 0;
    let todayPlanned = 0;
    let todayDone = 0;
    let mostBehindWeeklyHabit = null;
    let mostBehindWeeklyRemaining = 0;

    habits.forEach(h => {
        const completions = h.completions || {};
        const hasDailyGoal = !h.goal || h.goal.frequency === 'daily';
        const hasWeeklyGoal = h.goal && h.goal.frequency === 'weekly';

        if (hasDailyGoal) {
            recent14.forEach(date => {
                const dateStr = window.formatDate(date);
                const dayIndex = date.getDay();
                const completed = window.isCompletionDone(completions[dateStr]);
                weekdayStats[dayIndex].planned++;
                weekdayStats[dayIndex].done += completed ? 1 : 0;
                planned14++;
                if (completed) done14++;
                if (dateStr === todayStr) {
                    todayPlanned++;
                    if (completed) todayDone++;
                }
            });
        }

        if (hasWeeklyGoal) {
            const target = Math.max(1, Math.floor(Number(h.goal.value) || 1));
            const weekDates = window.getWeekDates(0).map(d => window.formatDate(d));
            const weekDone = weekDates.filter(d => window.isCompletionDone(completions[d])).length;
            const remaining = Math.max(0, target - weekDone);
            if (remaining > mostBehindWeeklyRemaining) {
                mostBehindWeeklyRemaining = remaining;
                mostBehindWeeklyHabit = h;
            }
        }
    });

    return { weekdayStats, planned14, done14, todayPlanned, todayDone, mostBehindWeeklyHabit, mostBehindWeeklyRemaining };
}

function findWeakestDay(weekdayStats) {
    let weakestDayIndex = -1;
    let weakestDayRate = 101;
    weekdayStats.forEach((stat, idx) => {
        if (stat.planned >= 3) {
            const rate = Math.round((stat.done / stat.planned) * 100);
            if (rate < weakestDayRate) {
                weakestDayRate = rate;
                weakestDayIndex = idx;
            }
        }
    });
    return { weakestDayIndex, weakestDayRate };
}

// Dünden itibaren seri sayar (bugün henüz yapılmadıysa seri "beklemede"dir).
// calculateStreak bugünden başladığı için streak>=3 && !doneToday hiç oluşamıyordu (ölü kod);
// riskli alışkanlık uyarısının gerçek niyeti bu fonksiyonla sağlanır.
function calculateStreakBeforeToday(completions) {
    if (!completions) return 0;
    let streak = 0;
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 1);
    while (true) {
        if (window.isCompletionDone(completions[window.formatDate(cursor)])) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function findRiskyHabit(habits, todayStr) {
    return habits
        .map(h => ({
            name: (h.name || 'Alışkanlık').trim(),
            streak: calculateStreakBeforeToday(h.completions || {}),
            doneToday: window.isCompletionDone((h.completions || {})[todayStr])
        }))
        .filter(item => item.streak >= 3 && !item.doneToday)
        .sort((a, b) => b.streak - a.streak)[0];
}

function analyzeMoodTrend(moods, recent7, habits) {
    let moodAverage = null;
    let lowMoodMissRate = null;
    const moodValues = [];
    let lowMoodPlanned = 0;
    let lowMoodMisses = 0;

    recent7.forEach(date => {
        const dateStr = window.formatDate(date);
        const mood = moods[dateStr];
        if (!mood || !Number.isFinite(Number(mood.value))) return;

        const value = Number(mood.value);
        moodValues.push(value);
        if (value <= 2) {
            habits.forEach(h => {
                if (h.goal && h.goal.frequency === 'weekly') return;
                lowMoodPlanned++;
                if (!window.isCompletionDone((h.completions || {})[dateStr])) {
                    lowMoodMisses++;
                }
            });
        }
    });

    if (moodValues.length > 0) {
        moodAverage = Number((moodValues.reduce((sum, v) => sum + v, 0) / moodValues.length).toFixed(1));
    }
    if (lowMoodPlanned > 0) {
        lowMoodMissRate = Math.round((lowMoodMisses / lowMoodPlanned) * 100);
    }
    return { moodAverage, lowMoodMissRate };
}

function buildCoachInsights(c) {
    const insights = [];

    if (c.todayPlanned > 0 && c.todayDone < c.todayPlanned) {
        const remaining = c.todayPlanned - c.todayDone;
        insights.push({ priority: 100, text: 'Bugün ' + c.todayDone + '/' + c.todayPlanned + ' alışkanlık tamamlandı. Kalan ' + remaining + ' adımı bitirirsen günü güçlü kapatırsın.' });
    }

    if (c.riskSnapshot.score >= 60) {
        insights.push({ priority: 92, text: 'Kaçırma riski %' + c.riskSnapshot.score + '. ' + c.riskSnapshot.reason + ' Akıllı hatırlatma saati: ' + c.riskSnapshot.suggestedTime + '.' });
    }

    if (c.riskyHabit) {
        insights.push({ priority: 95, text: '"' + c.riskyHabit.name + '" için ' + c.riskyHabit.streak + ' günlük seri var. Bugün tek bir tekrar seriyi korur.' });
    }

    if (c.completionRate14 > 0) {
        if (c.completionRate14 < 45) {
            insights.push({ priority: 90, text: 'Son 14 gün başarı oranın %' + c.completionRate14 + '. Hedefleri geçici olarak küçültmek sürdürülebilirliği artırır.' });
        } else if (c.completionRate14 < 70) {
            insights.push({ priority: 78, text: 'Son 14 gün başarı oranın %' + c.completionRate14 + '. Düzen var; bugün tek bir ekstra tamamlamayla ivmeyi artırabilirsin.' });
        } else if (c.completionRate14 >= 85) {
            insights.push({ priority: 65, text: 'Son 14 gün başarı oranın %' + c.completionRate14 + '. Ritim çok iyi, aynı düzeni koru.' });
        }
    }

    if (c.weakestDayIndex !== -1 && c.weakestDayRate < 60) {
        insights.push({ priority: 74, text: c.dayNames[c.weakestDayIndex] + ' günleri başarı oranın %' + c.weakestDayRate + '. O gün için daha kısa bir minimum plan tanımla.' });
    }

    if (c.moodAverage !== null && c.moodAverage <= 2.6 && c.lowMoodMissRate !== null && c.lowMoodMissRate >= 55) {
        insights.push({ priority: 72, text: 'Son 7 gün ruh hali ortalaman ' + c.moodAverage + '. Düşük enerjili günlerde kaçırma oranı %' + c.lowMoodMissRate + '; bu günler için mini hedef kullan.' });
    }

    if (c.mostBehindWeeklyHabit && c.mostBehindWeeklyRemaining > 0) {
        const habitName = (c.mostBehindWeeklyHabit.name || 'Haftalık alışkanlık').trim();
        insights.push({ priority: 70, text: '"' + habitName + '" haftalık hedefinde ' + c.mostBehindWeeklyRemaining + ' adım kaldı. Haftayı kapatmak için bugün bir adım ekle.' });
    }

    if (c.pendingTodos >= 5) {
        insights.push({ priority: 60, text: 'Bekleyen ' + c.pendingTodos + ' görev var. Önce 10 dakikada bitecek 1 görevi tamamla.' });
    }

    if (c.readingBooks > 0) {
        insights.push({ priority: 45, text: 'Okumakta olduğun ' + c.readingBooks + ' kitap var. Bugün kısa bir okuma seansı ivmeni korur.' });
    }

    return insights;
}

function buildActionPlan(riskyHabit, todayPlanned, todayDone, pendingTodos, readingBooks) {
    let actionPlan = 'Bugün için plan: ';
    if (riskyHabit) {
        actionPlan += '"' + riskyHabit.name + '" alışkanlığını şimdi tamamla.';
    } else if (todayPlanned > todayDone) {
        actionPlan += 'kalan ' + (todayPlanned - todayDone) + ' adımdan en kolay olanla başla.';
    } else if (pendingTodos > 0) {
        actionPlan += 'listeden en kısa görevi şimdi bitir.';
    } else if (readingBooks > 0) {
        actionPlan += 'okuduğun kitaptan 10 dakika ilerle.';
    } else {
        actionPlan += 'yarın için tek net hedef yaz.';
    }
    return actionPlan;
}

const SmartCoach = {
    _typingTimer: null,
    _renderVersion: 0,
    _lastRenderedText: '',

    getRecentDates(days) {
        const dates = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date);
        }
        return dates;
    },

    analyze: function () {
        const habits = window.appData.habits || [];
        const todos = window.appData.todos || [];
        const books = window.appData.books || [];
        const moods = window.appData.moods || {};
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

        if (habits.length === 0) {
            return 'Analiz için önce birkaç alışkanlık ekle. İlk küçük adım, en güçlü başlangıçtır.';
        }

        const today = new Date();
        const todayStr = window.formatDate(today);
        const recent14 = this.getRecentDates(14);
        const recent7 = this.getRecentDates(7);
        const riskSnapshot = window.computeMissRiskSnapshot(today);

        const trends = collectHabitTrends(habits, recent14, todayStr);
        const weakestDay = findWeakestDay(trends.weekdayStats);
        const riskyHabit = findRiskyHabit(habits, todayStr);
        const moodTrend = analyzeMoodTrend(moods, recent7, habits);
        const completionRate14 = trends.planned14 > 0 ? Math.round((trends.done14 / trends.planned14) * 100) : 0;

        const pendingTodos = todos.filter(t => !t.completed).length;
        const readingBooks = books.filter(b => window.normalizeBookStatus(b) === 'reading').length;

        const insights = buildCoachInsights({
            todayPlanned: trends.todayPlanned,
            todayDone: trends.todayDone,
            riskSnapshot,
            riskyHabit,
            completionRate14,
            weakestDayIndex: weakestDay.weakestDayIndex,
            weakestDayRate: weakestDay.weakestDayRate,
            moodAverage: moodTrend.moodAverage,
            lowMoodMissRate: moodTrend.lowMoodMissRate,
            mostBehindWeeklyHabit: trends.mostBehindWeeklyHabit,
            mostBehindWeeklyRemaining: trends.mostBehindWeeklyRemaining,
            pendingTodos,
            readingBooks,
            dayNames
        });

        insights.sort((a, b) => b.priority - a.priority);
        const primary = insights[0]?.text || 'Bugün düzenini koruman için tek bir küçük adım yeterli.';
        const secondary = insights[1]?.text;

        const actionPlan = buildActionPlan(riskyHabit, trends.todayPlanned, trends.todayDone, pendingTodos, readingBooks);
        return secondary ? (primary + ' ' + secondary + ' ' + actionPlan) : (primary + ' ' + actionPlan);
    },

    render: function () {
        const container = document.getElementById('aiCoachContainer');
        const messageEl = document.getElementById('aiMessage');
        if (!container || !messageEl) return;

        const text = this.analyze();

        container.style.display = 'block';
        if (this._typingTimer) {
            clearTimeout(this._typingTimer);
            this._typingTimer = null;
        }

        if (this._lastRenderedText === text) {
            messageEl.textContent = text;
            return;
        }

        this._lastRenderedText = text;
        if (window.PERFORMANCE_MODE) {
            messageEl.textContent = text;
            this._typingTimer = null;
            return;
        }
        this._renderVersion += 1;
        const currentVersion = this._renderVersion;
        messageEl.textContent = '';

        let i = 0;
        const speed = 18;
        const typeWriter = () => {
            if (currentVersion !== this._renderVersion) return;
            if (i < text.length) {
                messageEl.textContent += text.charAt(i);
                i++;
                this._typingTimer = setTimeout(typeWriter, speed);
            } else {
                this._typingTimer = null;
            }
        };
        typeWriter();
    }
};

// ===== Weekly Summary =====
function computeWeeklyPerformanceInsights(now = new Date()) {
    const thresholdMs = now.getTime() - (56 * 24 * 60 * 60 * 1000);
    const dayCounts = Array(7).fill(0);
    const hourCounts = Array(24).fill(0);

    (window.appData.habits || []).forEach(habit => {
        const completions = habit?.completions && typeof habit.completions === 'object' ? habit.completions : {};
        Object.entries(completions).forEach(([dateKey, completion]) => {
            if (!window.isCompletionDone(completion)) return;
            const dayDate = new Date(dateKey + 'T12:00:00');
            const dayMs = dayDate.getTime();
            if (!Number.isFinite(dayMs) || dayMs < thresholdMs) return;
            dayCounts[dayDate.getDay()] += 1;

            if (completion && typeof completion === 'object' && completion.time) {
                const timeMs = Date.parse(completion.time);
                if (!Number.isFinite(timeMs) || timeMs < thresholdMs) return;
                const hour = new Date(timeMs).getHours();
                if (hour >= 0 && hour < 24) hourCounts[hour] += 1;
            }
        });
    });

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const rankedDays = dayCounts
        .map((count, index) => ({ index, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 2)
        .map(item => dayNames[item.index]);

    const rankedHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(item => String(item.hour).padStart(2, '0') + ':00');

    return {
        bestDaysText: rankedDays.length > 0 ? rankedDays.join(', ') : 'Yeterli veri yok',
        bestHoursText: rankedHours.length > 0 ? rankedHours.join(', ') : 'Yeterli veri yok'
    };
}

function renderWeeklySummary() {
    const container = document.getElementById('weeklySummaryCard');
    const statsEl = document.getElementById('weeklyStats');
    if (!container || !statsEl) return;

    const today = window.formatDate(new Date());
    if (window.appData.settings?.lastWeeklySummaryDismissed === today) return;

    const habits = window.appData.habits || [];
    if (habits.length === 0) return;

    let totalTasks = 0;
    let completedTasks = 0;
    const dayHits = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayTotal = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = window.formatDate(d);
        const dayIndex = d.getDay();

        habits.forEach(h => {
            if (h.goal && h.goal.frequency === 'daily') {
                totalTasks++;
                dayTotal[dayIndex]++;
                if (window.isCompletionDone(h.completions[dateStr])) {
                    completedTasks++;
                    dayHits[dayIndex]++;
                }
            }
        });
    }

    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    let bestDay = 'Pazartesi';
    let bestRate = 0;
    for (let i = 0; i < 7; i++) {
        if (dayTotal[i] > 0) {
            const rate = dayHits[i] / dayTotal[i];
            if (rate > bestRate) {
                bestRate = rate;
                bestDay = days[i];
            }
        }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const perfInsights = computeWeeklyPerformanceInsights(new Date());

    statsEl.innerHTML = '<div class="weekly-stat-item"><span class="weekly-stat-value">' + completedTasks + '</span><span class="weekly-stat-label">Görev Tamamlandı</span></div>' +
        '<div class="weekly-stat-item"><span class="weekly-stat-value">%' + completionRate + '</span><span class="weekly-stat-label">Başarı Oranı</span></div>' +
        '<div class="weekly-best-day">Haftanın en iyi günü: <strong>' + bestDay + '</strong><br>' +
        '<span class="weekly-insights-meta">En verimli günler: ' + safeText(perfInsights.bestDaysText) + ' • En iyi saatler: ' + safeText(perfInsights.bestHoursText) + '</span></div>';

    container.style.display = 'block';
}

function dismissWeeklySummary() {
    const container = document.getElementById('weeklySummaryCard');
    if (container) container.style.display = 'none';

    if (!window.appData.settings) window.appData.settings = {};
    window.appData.settings.lastWeeklySummaryDismissed = window.formatDate(new Date());
    window.saveData();
}

window.getLevelTitle = getLevelTitle;
window.calculateNextLevelXP = calculateNextLevelXP;
window.calculateXPPercent = calculateXPPercent;
window.dismissWeeklySummary = dismissWeeklySummary;
window.addXP = addXP;
window.checkAchievements = checkAchievements;
window.selectMood = selectMood;
window.confirmMood = confirmMood;
window.resetMood = resetMood;
window.renderMoodTracker = renderMoodTracker;
window.saveMoodWithNote = saveMoodWithNote;
window.getMoodMeta = getMoodMeta;
window.getMoodEntriesForYear = getMoodEntriesForYear;
window.SmartCoach = SmartCoach;
window.renderWeeklySummary = renderWeeklySummary;
window.computeWeeklyPerformanceInsights = computeWeeklyPerformanceInsights;
