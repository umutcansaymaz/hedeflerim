// ===== Stats Component =====
// Hedeflerim — Istatistikler, SmartCoach, ruh hali, XP/Level/Achievement
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

function getMoodMeta(value) {
    const safeValue = Number(value);
    if (safeValue <= 1) return { icon: '\uD83D\uDE1E', title: 'Zor bir gun' };
    if (safeValue === 2) return { icon: '\uD83D\uDE14', title: 'Dusuk enerji' };
    if (safeValue === 3) return { icon: '\uD83D\uDE10', title: 'Normal' };
    if (safeValue === 4) return { icon: '\uD83D\uDE0A', title: 'Iyi' };
    return { icon: '\uD83E\uDD29', title: 'Harika' };
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
        const moods = [
            { val: 1, icon: '\uD83D\uDE1E', title: 'Zor bir gun' },
            { val: 2, icon: '\uD83D\uDE14', title: 'Dusuk enerji' },
            { val: 3, icon: '\uD83D\uDE10', title: 'Normal' },
            { val: 4, icon: '\uD83D\uDE0A', title: 'Iyi' },
            { val: 5, icon: '\uD83E\uDD29', title: 'Harika' }
        ];
        const info = moods.find(m => m.val === currentMood.value) || moods[2];
        const noteHtml = currentMood.note
            ? '<div class="mood-note-display">"' + safeText(currentMood.note) + '"</div>'
            : '';

        container.innerHTML = '<div class="mood-summary">' +
            '<div style="font-size: 3rem;">' + info.icon + '</div>' +
            '<div>' + info.title + '</div>' +
            noteHtml +
            '<button class="btn-text" onclick="window.resetMood(\'' + today + '\')">Degistir</button>' +
            '</div>';
    } else {
        container.innerHTML = '<div class="mood-title">Bugun nasil hissediyorsun?</div>' +
            '<div class="mood-options">' +
            '<button class="mood-btn" onclick="window.selectMood(1)">\uD83D\uDE1E</button>' +
            '<button class="mood-btn" onclick="window.selectMood(2)">\uD83D\uDE14</button>' +
            '<button class="mood-btn" onclick="window.selectMood(3)">\uD83D\uDE10</button>' +
            '<button class="mood-btn" onclick="window.selectMood(4)">\uD83D\uDE0A</button>' +
            '<button class="mood-btn" onclick="window.selectMood(5)">\uD83E\uDD29</button>' +
            '</div>' +
            '<div id="moodNoteContainer" class="mood-note-container" style="display:none;">' +
            '<textarea id="moodNoteInput" class="mood-note-input" placeholder="Bugun neden boyle hissediyorsun? (opsiyonel)"></textarea>' +
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
    window.showToast('Mod kaydedildi! +10 XP');
    window.triggerConfetti();
}

function resetMood(date) {
    if (window.appData.moods) delete window.appData.moods[date];
    window.saveData();
    renderMoodTracker();
}

// ===== SmartCoach AI Logic =====
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
        const insights = [];
        const dayNames = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];

        if (habits.length === 0) {
            return 'Analiz icin once birkac aliskanlik ekle. Ilk kucuk adim, en guclu baslangictir.';
        }

        const today = new Date();
        const todayStr = window.formatDate(today);
        const recent14 = this.getRecentDates(14);
        const recent7 = this.getRecentDates(7);
        const riskSnapshot = window.computeMissRiskSnapshot(today);

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

        const completionRate14 = planned14 > 0 ? Math.round((done14 / planned14) * 100) : 0;

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

        const riskyHabit = habits
            .map(h => ({
                name: (h.name || 'Aliskanlik').trim(),
                streak: window.calculateStreak(h.completions || {}),
                doneToday: window.isCompletionDone((h.completions || {})[todayStr])
            }))
            .filter(item => item.streak >= 3 && !item.doneToday)
            .sort((a, b) => b.streak - a.streak)[0];

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

        const pendingTodos = todos.filter(t => !t.completed).length;
        const readingBooks = books.filter(b => window.normalizeBookStatus(b) === 'reading').length;

        if (todayPlanned > 0 && todayDone < todayPlanned) {
            const remaining = todayPlanned - todayDone;
            insights.push({
                priority: 100,
                text: 'Bugun ' + todayDone + '/' + todayPlanned + ' aliskanlik tamamlandi. Kalan ' + remaining + ' adimi bitirirsen gunu guclu kapatirsin.'
            });
        }

        if (riskSnapshot.score >= 60) {
            insights.push({
                priority: 92,
                text: 'Kacirma riski %' + riskSnapshot.score + '. ' + riskSnapshot.reason + ' Akilli hatirlatma saati: ' + riskSnapshot.suggestedTime + '.'
            });
        }

        if (riskyHabit) {
            insights.push({
                priority: 95,
                text: '"' + riskyHabit.name + '" icin ' + riskyHabit.streak + ' gunluk seri var. Bugun tek bir tekrar seriyi korur.'
            });
        }

        if (completionRate14 > 0) {
            if (completionRate14 < 45) {
                insights.push({
                    priority: 90,
                    text: 'Son 14 gun basari oranin %' + completionRate14 + '. Hedefleri gecici olarak kucultmek surdurulebilirligi artirir.'
                });
            } else if (completionRate14 < 70) {
                insights.push({
                    priority: 78,
                    text: 'Son 14 gun basari oranin %' + completionRate14 + '. Duzen var; bugun tek bir ekstra tamamlamayla ivmeyi artirabilirsin.'
                });
            } else if (completionRate14 >= 85) {
                insights.push({
                    priority: 65,
                    text: 'Son 14 gun basari oranin %' + completionRate14 + '. Ritim cok iyi, ayni duzeni koru.'
                });
            }
        }

        if (weakestDayIndex !== -1 && weakestDayRate < 60) {
            insights.push({
                priority: 74,
                text: dayNames[weakestDayIndex] + ' gunleri basari oranin %' + weakestDayRate + '. O gun icin daha kisa bir minimum plan tanimla.'
            });
        }

        if (moodAverage !== null && moodAverage <= 2.6 && lowMoodMissRate !== null && lowMoodMissRate >= 55) {
            insights.push({
                priority: 72,
                text: 'Son 7 gun ruh hali ortalaman ' + moodAverage + '. Dusuk enerjili gunlerde kacirma orani %' + lowMoodMissRate + '; bu gunler icin mini hedef kullan.'
            });
        }

        if (mostBehindWeeklyHabit && mostBehindWeeklyRemaining > 0) {
            const habitName = (mostBehindWeeklyHabit.name || 'Haftalik aliskanlik').trim();
            insights.push({
                priority: 70,
                text: '"' + habitName + '" haftalik hedefinde ' + mostBehindWeeklyRemaining + ' adim kaldi. Haftayi kapatmak icin bugun bir adim ekle.'
            });
        }

        if (pendingTodos >= 5) {
            insights.push({
                priority: 60,
                text: 'Bekleyen ' + pendingTodos + ' gorev var. Once 10 dakikada bitecek 1 gorevi tamamla.'
            });
        }

        if (readingBooks > 0) {
            insights.push({
                priority: 45,
                text: 'Okumakta oldugun ' + readingBooks + ' kitap var. Bugun kisa bir okuma seansi ivmeni korur.'
            });
        }

        insights.sort((a, b) => b.priority - a.priority);
        const primary = insights[0]?.text || 'Bugun duzenini koruman icin tek bir kucuk adim yeterli.';
        const secondary = insights[1]?.text;

        let actionPlan = 'Bugun icin plan: ';
        if (riskyHabit) {
            actionPlan += '"' + riskyHabit.name + '" aliskanligini simdi tamamla.';
        } else if (todayPlanned > todayDone) {
            actionPlan += 'kalan ' + (todayPlanned - todayDone) + ' adimdan en kolay olanla basla.';
        } else if (pendingTodos > 0) {
            actionPlan += 'listeden en kisa gorevi simdi bitir.';
        } else if (readingBooks > 0) {
            actionPlan += 'okudugun kitaptan 10 dakika ilerle.';
        } else {
            actionPlan += 'yarin icin tek net hedef yaz.';
        }

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

    const dayNames = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
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

    const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
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

    statsEl.innerHTML = '<div class="weekly-stat-item"><span class="weekly-stat-value">' + completedTasks + '</span><span class="weekly-stat-label">Gorev Tamamlandi</span></div>' +
        '<div class="weekly-stat-item"><span class="weekly-stat-value">%' + completionRate + '</span><span class="weekly-stat-label">Basari Orani</span></div>' +
        '<div class="weekly-best-day">Haftanin en iyi gunu: <strong>' + bestDay + '</strong><br>' +
        '<span class="weekly-insights-meta">En verimli gunler: ' + safeText(perfInsights.bestDaysText) + ' • En iyi saatler: ' + safeText(perfInsights.bestHoursText) + '</span></div>';

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
