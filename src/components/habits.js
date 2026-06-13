// ===== Habits Component =====
// Hedeflerim — Alışkanlık CRUD, haftalık takvim

// ----- Date Helpers -----

function getWeekDates(offset = 0) {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + (offset * 7));

    const week = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        week.push(date);
    }
    return week;
}

function getWeekTitle(offset) {
    if (offset === 0) return 'Bu Hafta';
    if (offset === -1) return 'Geçen Hafta';
    if (offset === 1) return 'Gelecek Hafta';

    const weekDates = getWeekDates(offset);
    const start = weekDates[0];
    const end = weekDates[6];

    const startStr = `${start.getDate()} ${getMonthName(start.getMonth())} `;
    const endStr = `${end.getDate()} ${getMonthName(end.getMonth())} `;

    return `${startStr} - ${endStr} `;
}

function getMonthName(month) {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return months[month];
}

function getDayName(day) {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return days[day];
}

function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = getMonthName(date.getMonth());
    return `${day} ${month} `;
}

// ----- Confetti Animation -----

function triggerConfetti() {
    if (window.PERFORMANCE_MODE) return;
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140'];
    const confettiCount = 100;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 4000);
    }
}

// ----- Personal Records & Animation -----

function renderPersonalRecords() {
    // Calculate records
    let longestStreak = 0;
    let totalDays = 0;
    let booksCompleted = window.appData.books?.filter(b => b.status === 'completed').length || 0;

    // Calculate reading stats (pages this month)
    let pagesThisMonth = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    window.appData.habits.forEach(habit => {
        const days = Object.keys(habit.completions || {});
        totalDays += days.filter(dateStr => window.isCompletionDone(habit.completions?.[dateStr])).length;

        // Calculate max streak
        const streak = window.calculateLongestStreak(habit.completions);
        if (streak > longestStreak) longestStreak = streak;

        // Sum pages for reading habits this month
        if (habit.goal?.unit === 'sayfa') {
            days.forEach(dateStr => {
                const date = new Date(dateStr);
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    const val = habit.completions[dateStr];
                    pagesThisMonth += window.getCompletionNumericValue(val, habit.goal?.value || 1);
                }
            });
        }
    });

    const container = document.getElementById('recordsContainer');
    container.innerHTML = `
        <div class="record-card">
            <div class="record-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg></div>
            <div class="record-value" data-target="${longestStreak}">0</div>
            <div class="record-label">En Uzun Seri</div>
        </div>
        <div class="record-card">
            <div class="record-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div class="record-value" data-target="${totalDays}">0</div>
            <div class="record-label">Toplam Gün</div>
        </div>
        <div class="record-card">
            <div class="record-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <div class="record-value" data-target="${pagesThisMonth}">0</div>
            <div class="record-label">Bu Ay Sayfa</div>
        </div>
        <div class="record-card">
            <div class="record-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg></div>
            <div class="record-value" data-target="${booksCompleted}">0</div>
            <div class="record-label">Kitap Bitti</div>
        </div>
    `;

    // Animate all record values
    container.querySelectorAll('.record-value[data-target]').forEach(el => {
        animateCountUp(el, parseInt(el.dataset.target) || 0);
    });
}

function animateCountUp(element, target, duration = 1000) {
    if (window.PERFORMANCE_MODE || target <= 0) {
        element.textContent = target;
        return;
    }

    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }

    requestAnimationFrame(update);
}

// ----- Entity Helpers -----

function getEntityBucketByType(type) {
    if (type === 'habit') return 'habits';
    if (type === 'todo') return 'todos';
    if (type === 'book') return 'books';
    if (type === 'note') return 'notes';
    return null;
}

function getEntityTypeLabel(type) {
    if (type === 'habit') return 'Alışkanlık';
    if (type === 'todo') return 'Görev';
    if (type === 'book') return 'Kitap';
    if (type === 'note') return 'Not';
    return 'Kayıt';
}

function softDeleteItem(type, id, options = {}) {
    const bucket = getEntityBucketByType(type);
    if (!bucket || !Array.isArray(window.appData[bucket])) return false;

    const index = window.appData[bucket].findIndex(item => item && item.id === id);
    if (index === -1) return false;

    const [removed] = window.appData[bucket].splice(index, 1);
    const trashEntry = window.addToTrash(type, removed);
    window.saveData(false, { immediate: true });
    window.renderActiveTab();

    const itemLabel = options.itemLabel || getEntityTypeLabel(type);
    const undoCallback = trashEntry
        ? () => {
            if (window.restoreTrashEntryById(trashEntry.trashId)) {
                window.showToast(`${itemLabel} geri alındı`);
            }
        }
        : null;

    window.showToast(`${itemLabel} silindi`, undoCallback ? {
        actionLabel: 'Geri Al',
        onAction: undoCallback,
        duration: 5200
    } : {});

    return true;
}

// ----- Habit CRUD -----

function createHabit(name, color, goal, category) {
    const nowIso = new Date().toISOString();
    const habit = {
        id: window.generateId(),
        name,
        color,
        goal: goal || null,
        category: category || null,
        createdAt: nowIso,
        updatedAt: nowIso,
        completions: {}
    };
    window.appData.habits.push(habit);
    window.saveData();
    window.renderActiveTab();
    window.showToast('Alışkanlık eklendi');
}

function updateHabit(id, name, color, goal, category) {
    const habit = window.appData.habits.find(h => h.id === id);
    if (habit) {
        habit.name = name;
        habit.color = color;
        habit.goal = goal || null;
        habit.category = category || null;
        habit.updatedAt = new Date().toISOString();
        window.saveData();
        window.renderActiveTab();
        window.showToast('Alışkanlık güncellendi');
    }
}

function deleteHabit(id) {
    softDeleteItem('habit', id, { itemLabel: 'Alışkanlık' });
}

// ----- Habit Quick Toggle -----

function quickToggleHabit(habitId) {
    const today = window.formatDate(new Date());
    toggleHabitCompletion(habitId, today);
}

function toggleHabitCompletion(habitId, dateStr) {
    const habit = window.appData.habits.find(h => h.id === habitId);
    if (!habit) return;

    const nowIso = new Date().toISOString();
    if (!habit.completions || typeof habit.completions !== 'object') habit.completions = {};

    const completionData = habit.completions[dateStr];
    const alreadyDone = window.isCompletionDone(completionData);
    const isWeeklyGoal = habit.goal && habit.goal.frequency === 'weekly';
    const isDailyGoal = habit.goal && habit.goal.frequency === 'daily';

    const setCompletionValue = (value) => {
        habit.completions[dateStr] = {
            value: Math.max(0, Number(value) || 0),
            time: nowIso
        };
    };

    if (isWeeklyGoal) {
        if (alreadyDone) {
            setCompletionValue(0);
        } else {
            setCompletionValue(1);
            const weekDates = window.getWeekDates(window.currentWeekOffset);
            const weekDone = weekDates.filter(d => window.isCompletionDone(habit.completions[window.formatDate(d)])).length;
            const target = Math.max(1, Math.floor(Number(habit.goal?.value) || 1));
            if (weekDone >= target) {
                window.showCelebrationModal(habit.name, target);
            }
        }
    } else if (isDailyGoal) {
        if (alreadyDone) {
            setCompletionValue(0);
        } else {
            const goalValue = Math.max(0, Number(habit.goal?.value) || 0);
            setCompletionValue(goalValue);
            triggerConfetti();
            window.showToast('Hedef tamamlandı! +20 XP');
            window.addXP(20);
        }
    } else {
        if (alreadyDone) {
            setCompletionValue(0);
        } else {
            setCompletionValue(1);
        }
    }

    habit.updatedAt = nowIso;
    window.saveData();
    window.renderActiveTab();
}

// ----- Long Press / Day Interaction Handlers -----

let longPressTimer = null;
let touchStartPos = null;
let touchMoved = false;

function handleDayMouseDown(habitId, dateStr, event) {
    const habit = window.appData.habits.find(h => h.id === habitId);
    touchMoved = false;

    // ALWAYS clean up any existing listener first to prevent accumulation
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);

    // Track touch start position to detect scrolling
    if (event && event.touches) {
        touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        // Add touchmove listener to detect scroll
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        // Add touchend listener as backup cleanup
        document.addEventListener('touchend', handleTouchEnd, { once: true });
    }

    // ALWAYS start timer to handle non-daily long presses (ignore) and daily modal
    longPressTimer = setTimeout(() => {
        if (!touchMoved) {
            // Only show value modal for daily goals (not weekly)
            if (habit && habit.goal && habit.goal.frequency === 'daily') {
                openValueInputModal(habitId, dateStr, habit);
                longPressTimer = 'triggered';
            }
            // For others, timer just expires, allowing handled click on release
        }
    }, 500);
}

function handleTouchMove(event) {
    if (touchStartPos && event.touches) {
        const dx = Math.abs(event.touches[0].clientX - touchStartPos.x);
        const dy = Math.abs(event.touches[0].clientY - touchStartPos.y);
        // If moved more than 10px, consider it a scroll
        if (dx > 10 || dy > 10) {
            touchMoved = true;
            if (longPressTimer && longPressTimer !== 'triggered') {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
    }
}

function handleDayMouseUp(habitId, dateStr) {
    document.removeEventListener('touchmove', handleTouchMove);

    if (touchMoved) {
        // User was scrolling, don't toggle
        longPressTimer = null;
        touchMoved = false;
        touchStartPos = null;
        return;
    }

    if (longPressTimer && longPressTimer !== 'triggered') {
        clearTimeout(longPressTimer);
        toggleHabitCompletion(habitId, dateStr);
    }
    longPressTimer = null;
    touchStartPos = null;
}

function handleDayMouseLeave() {
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    if (longPressTimer && longPressTimer !== 'triggered') {
        clearTimeout(longPressTimer);
    }
    longPressTimer = null;
    touchStartPos = null;
}

// Backup cleanup function - ensures listeners are always removed
function handleTouchEnd() {
    document.removeEventListener('touchmove', handleTouchMove);
    if (longPressTimer && longPressTimer !== 'triggered') {
        clearTimeout(longPressTimer);
    }
    touchMoved = false;
    touchStartPos = null;
}

// ----- Value Input Modal -----

function openValueInputModal(habitId, dateStr, habit) {
    const existingValue = habit.completions[dateStr];
    const modal = document.getElementById('valueInputModal');
    const input = document.getElementById('valueInput');
    const label = document.getElementById('valueInputLabel');
    const unitLabel = document.getElementById('valueInputUnit');

    label.textContent = `${habit.name} - ${formatDateDisplay(dateStr)} `;
    unitLabel.textContent = habit.goal.unit;
    const rawNumeric = existingValue && typeof existingValue === 'object' ? existingValue.value : existingValue;
    const numeric = Number(rawNumeric);
    input.value = Number.isFinite(numeric) && numeric > 0 ? String(numeric) : '';
    input.placeholder = habit.goal.value;
    input.max = habit.goal.value * 2; // Allow up to 2x the goal

    modal.dataset.habitId = habitId;
    modal.dataset.dateStr = dateStr;
    openModal('valueInputModal');

    setTimeout(() => input.focus(), 100);
}

function saveHabitValue() {
    const modal = document.getElementById('valueInputModal');
    const input = document.getElementById('valueInput');
    const habitId = modal.dataset.habitId;
    const dateStr = modal.dataset.dateStr;
    const value = parseInt(input.value) || 0;

    const habit = window.appData.habits.find(h => h.id === habitId);
    if (habit) {
        const nowIso = new Date().toISOString();
        const previousValue = window.getCompletionNumericValue(habit.completions[dateStr], habit.goal?.value || 1);

        if (value > 0) {
            // Store value with timestamp for time analysis
            habit.completions[dateStr] = {
                value: value,
                time: nowIso
            };

            // Trigger confetti if goal is met for the first time
            if (habit.goal && value >= habit.goal.value && previousValue < habit.goal.value) {
                triggerConfetti();
                window.showToast('Hedef tamamlandı');
            }
        } else {
            // Keep a tombstone entry so multi-device sync can resolve clears.
            habit.completions[dateStr] = { value: 0, time: nowIso };
        }
        habit.updatedAt = nowIso;
        window.saveData();
        window.renderActiveTab();
    }

    closeModal('valueInputModal');
}

function clearHabitValue() {
    const modal = document.getElementById('valueInputModal');
    const habitId = modal.dataset.habitId;
    const dateStr = modal.dataset.dateStr;

    const habit = window.appData.habits.find(h => h.id === habitId);
    if (habit) {
        const nowIso = new Date().toISOString();
        if (!habit.completions || typeof habit.completions !== 'object') habit.completions = {};
        habit.completions[dateStr] = { value: 0, time: nowIso };
        habit.updatedAt = nowIso;
        window.saveData();
        window.renderActiveTab();
    }

    closeModal('valueInputModal');
}

// ----- Summary Stats (Habits Tab) -----

function renderSummaryStats() {
    const container = document.getElementById('summaryStats');
    if (!container) return;

    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const lastWeekDates = window.getWeekDates(window.currentWeekOffset - 1);
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Only show stats for habits with goals
    const habitsWithGoals = window.appData.habits.filter(h => h.goal);

    if (habitsWithGoals.length === 0) {
        container.innerHTML = '';
        return;
    }

    const statsHtml = habitsWithGoals.map(habit => {
        const fallbackGoalValue = habit.goal && habit.goal.frequency === 'weekly'
            ? 1
            : Math.max(1, Math.floor(Number(habit.goal?.value) || 1));

        // This week total
        let thisWeekTotal = 0;
        weekDates.forEach(date => {
            const val = habit.completions[window.formatDate(date)];
            thisWeekTotal += window.getCompletionNumericValue(val, fallbackGoalValue);
        });

        // Last week total
        let lastWeekTotal = 0;
        lastWeekDates.forEach(date => {
            const val = habit.completions[window.formatDate(date)];
            lastWeekTotal += window.getCompletionNumericValue(val, fallbackGoalValue);
        });

        // This month total
        let monthTotal = 0;
        Object.keys(habit.completions).forEach(dateStr => {
            const date = new Date(dateStr);
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                const val = habit.completions[dateStr];
                monthTotal += window.getCompletionNumericValue(val, fallbackGoalValue);
            }
        });

        // Comparison indicator
        const diff = thisWeekTotal - lastWeekTotal;
        let comparisonHtml = '';
        if (lastWeekTotal > 0) {
            if (diff > 0) {
                comparisonHtml = `<span class="stat-trend up">+${diff}</span>`;
            } else if (diff < 0) {
                comparisonHtml = `<span class="stat-trend down">${diff}</span>`;
            } else {
                comparisonHtml = `<span class="stat-trend same">= 0</span>`;
            }
        }

        const safeStatHabitName = safeText(habit.name);
        const safeStatUnit = safeText(habit.goal.unit);
        const safeStatColor = window.sanitizeColor(habit.color);

        return `
            <div class="stat-card" style="border-left: 4px solid ${safeStatColor}">
                <div class="stat-header">
                    <span class="stat-habit-name">${safeStatHabitName}</span>
                    ${comparisonHtml}
                </div>
                <div class="stat-values">
                    <div class="stat-value-item">
                        <span class="stat-number">${thisWeekTotal}</span>
                        <span class="stat-label">${safeStatUnit} bu hafta</span>
                    </div>
                    <div class="stat-value-item">
                        <span class="stat-number">${monthTotal}</span>
                        <span class="stat-label">${safeStatUnit} bu ay</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = statsHtml;
}

// ----- Render Habits (Main Habits Tab) -----

function renderHabits() {
    const container = document.getElementById('habitsContainer');
    const weekDates = window.getWeekDates(window.currentWeekOffset);
    const today = window.formatDate(new Date());

    if (window.appData.habits.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="animated-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-svg-target"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                </div>
                <h3>Henüz alışkanlık yok</h3>
                <p>+ butonuna basarak ilk alışkanlığını ekle.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = window.appData.habits.map(habit => {
        const weekCompletions = weekDates.filter(d => window.isCompletionDone(habit.completions[window.formatDate(d)])).length;
        const safeHabitId = window.escapeJsSingleQuote(habit.id || '');
        const safeHabitName = safeText(habit.name);
        const safeHabitColor = window.sanitizeColor(habit.color);
        const goalHtml = habit.goal ? `
            <div class="habit-goal">
                <span class="habit-goal-icon">Hedef</span>
                <span class="habit-goal-text">${habit.goal.value} ${safeText(habit.goal.unit)} / ${habit.goal.frequency === 'daily' ? 'gün' : 'hafta'}</span>
                <span class="habit-goal-progress">${weekCompletions}/7 gün</span>
            </div>
        ` : '';

        return `
        <div class="habit-card" data-id="${safeText(habit.id)}">
            <div class="habit-header">
                <div class="habit-info">
                    <div class="habit-color" style="background: ${safeHabitColor}"></div>
                    <span class="habit-name">${safeHabitName}</span>
                </div>
                <div class="habit-actions">
                    <button class="habit-action-btn edit" onclick="window.openEditHabit(window.decodeJsSingleQuote('${safeHabitId}'))" aria-label="Düzenle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="habit-action-btn delete" onclick="window.deleteHabit(window.decodeJsSingleQuote('${safeHabitId}'))" aria-label="Sil">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            ${goalHtml}
            <div class="week-calendar">
                ${weekDates.map(date => {
            const dateStr = window.formatDate(date);
            const completionData = habit.completions[dateStr];
            const isChecked = window.isCompletionDone(completionData);
            const isToday = dateStr === today;
            const hasGoal = habit.goal !== null;
            const isWeeklyGoal = habit.goal && habit.goal.frequency === 'weekly';
            const fallbackGoalValue = hasGoal && habit.goal.frequency === 'weekly'
                ? 1
                : Math.max(1, Math.floor(Number(habit.goal?.value) || 1));
            const numericValue = window.getCompletionNumericValue(completionData, fallbackGoalValue);
            const goalMet = hasGoal && !isWeeklyGoal && numericValue >= habit.goal.value;
            // User request: Green tick if goal met, yellow indicator if not
            const displayValue = isChecked ? (isWeeklyGoal ? '✅' : (goalMet ? '✅' : '🔸')) : '';
            return `
                        <div class="day-cell">
                            <span class="day-name">${getDayName(date.getDay())}</span>
                            <div class="day-checkbox ${isChecked ? 'checked' : ''} ${goalMet ? 'goal-met' : ''} ${isToday ? 'today' : ''} ${hasGoal ? 'has-goal' : ''}" 
                                 onmousedown="window.handleDayMouseDown(window.decodeJsSingleQuote('${safeHabitId}'), '${dateStr}')"
                                 onmouseup="window.handleDayMouseUp(window.decodeJsSingleQuote('${safeHabitId}'), '${dateStr}')"
                                 onmouseleave="window.handleDayMouseLeave()"
                                 ontouchstart="window.handleDayMouseDown(window.decodeJsSingleQuote('${safeHabitId}'), '${dateStr}', event)"
                                 ontouchend="window.handleDayMouseUp(window.decodeJsSingleQuote('${safeHabitId}'), '${dateStr}')">
                                ${hasGoal && displayValue ? `<span class="day-value">${displayValue}</span>` : ''}
                            </div>
                            <span class="day-date">${date.getDate()}</span>
                        </div>
                    `;
        }).join('')}
            </div>
        </div>
    `}).join('');
}

// ----- Edit / Create Habit Modals -----

function openEditHabit(id) {
    const habit = window.appData.habits.find(h => h.id === id);
    if (habit) {
        editingHabitId = id;
        document.getElementById('modalTitle').textContent = 'Alışkanlığı Düzenle';
        document.getElementById('habitName').value = habit.name;

        // Populate goal fields
        if (habit.goal) {
            document.getElementById('habitGoalValue').value = habit.goal.value;
            document.getElementById('habitGoalUnit').value = habit.goal.unit;
            document.getElementById('habitGoalFrequency').value = habit.goal.frequency;
        } else {
            document.getElementById('habitGoalValue').value = '';
            document.getElementById('habitGoalUnit').value = '';
            document.getElementById('habitGoalFrequency').value = 'daily';
        }

        // Populate category field
        document.getElementById('habitCategory').value = habit.category || '';
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === habit.color);
        });

        openModal('habitModal');
    }
}

function openHabitCreateModal() {
    editingHabitId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Alışkanlık';
    document.getElementById('habitName').value = '';
    document.getElementById('habitGoalValue').value = '';
    document.getElementById('habitGoalUnit').value = '';
    document.getElementById('habitGoalFrequency').value = 'daily';
    document.getElementById('habitCategory').value = '';
    document.querySelectorAll('.color-option').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
    openModal('habitModal');
}

// ===== Motivational Quotes =====

const motivationalQuotes = [
    { text: "Küçük adımlar büyük değişim başlatır.", author: "Anonim" },
    { text: "Bugün başla, yarın teşekkür edeceksin.", author: "Anonim" },
    { text: "Disiplin özgürlüğe giden köprüdür.", author: "Jocko Willink" },
    { text: "Her gün %1 daha iyi ol.", author: "James Clear" },
    { text: "Başarı, tekrar edilen doğru davranışların toplamıdır.", author: "Robert Collier" },
    { text: "Alışkanlıklar kaderi belirler.", author: "Mike Murdock" },
    { text: "Zor zamanda minimum hedefle bile devam et.", author: "Anonim" },
    { text: "Zaman bulmazsın, zaman yaratırsın.", author: "Sanom" },
    { text: "Eğer başlamazsan, asla bitiremezsin.", author: "Ovidius" },
    { text: "Mükemmeli arama, ilerlemeyi ara.", author: "Anonim" },
    { text: "Motivasyon başlatır, alışkanlık sürdürür.", author: "Jim Ryun" },
    { text: "Hayallerinin peşinden gitmeyenler, başkalarının hayallerine çalışır.", author: "Farrah Gray" },
    { text: "Yapabileceğine inan, zaten yolun yarısındasın.", author: "Theodore Roosevelt" },
    { text: "Pes etmek her zaman en erken ulaşılan sondur.", author: "Anonim" },
    { text: "Bugünün mazereti, yarının pişmanlığıdır.", author: "Anonim" },
    { text: "Ne kadar yavaş gittiğin önemli değil, yeter ki durma.", author: "Konfüçyüs" },
    { text: "Engeller, gözünü hedeften ayırdığında gördüğün o korkunç şeylerdir.", author: "Henry Ford" },
    { text: "Yapamazsın diyenlere inat yap.", author: "Anonim" },
    { text: "Ertelemek, başarının en büyük düşmanıdır.", author: "Victor Hugo" },
    { text: "Şimdi başlamak için asla geç değil.", author: "Anonim" },
    { text: "İstikrar, yeteneği yener.", author: "Anonim" },
    { text: "Düşüncelerin neyse, hayatın da odur.", author: "Marcus Aurelius" },
    { text: "Eğer her şey yolunda görünüyorsa, yeterince hızlı gitmiyorsun demektir.", author: "Mario Andretti" },
    { text: "Sınırlarını ancak onları aşmaya çalışırsan öğrenebilirsin.", author: "Anonim" },
    { text: "Dün zekiydim dünyayı değiştirmek istedim, bugün bilgeyim kendimi değiştiriyorum.", author: "Mevlana" },
    { text: "Tembellik ustalık gerektirmez ama bedeli çok ağır olur.", author: "Anonim" },
    { text: "En iyi yatırım, kendine yaptığın yatırımdır.", author: "Warren Buffett" },
    { text: "Bir şeyler ters gittiğinde vazgeçmek en kolayıdır; kazananlar pes etmeyenlerdir.", author: "Anonim" },
    { text: "Başarısızlık yeniden başlamak için bir fırsattır, sadece bu sefer daha akıllıca.", author: "Henry Ford" },
    { text: "Konfor alanı güzel bir yerdir, ama orada hiçbir şey yetişmez.", author: "Anonim" },
    { text: "Hiç kimse başarı merdivenlerini elleri cebinde tırmanmamıştır.", author: "J. Keth Moorhead" },
    { text: "Hayat, sen başka planlar yaparken başına gelenlerdir.", author: "John Lennon" },
    { text: "Hata yapmaktan korkma, asıl hiçbir şey yapmamaktan kork.", author: "Anonim" },
    { text: "Hayalleri hedeflere dönüştüren şey, onlara bir tarih eklemektir.", author: "Anonim" },
    { text: "Başarı, hazırlık ve fırsatın buluştuğu yerdir.", author: "Seneca" },
    { text: "Başla, yolda öğrenirsin.", author: "Anonim" },
    { text: "Sıradan şeyleri sıra dışı bir disiplinle yap.", author: "Anonim" },
    { text: "Geleceğini tahmin etmenin en iyi yolu, onu yaratmaktır.", author: "Peter Drucker" },
    { text: "Kendi ışığına güvenen, başkasının parlamasından rahatsız olmaz.", author: "Victor Hugo" },
    { text: "Bugün yapacağın seçimler, yarınki hayatını inşa eder.", author: "Anonim" },
    { text: "Yarın dünden daha iyi olmak için bugün bir adım at.", author: "Anonim" },
    { text: "Korkularını yenmeden gerçek özgürlüğü tadamazsın.", author: "Nelson Mandela" },
    { text: "Sorunları değil, çözümleri konuş.", author: "Anonim" },
    { text: "Yetenek yetmez, ter dökmen gerekir.", author: "Anonim" },
    { text: "Nereye gideceğini bilmiyorsan, hangi yoldan gittiğinin bir önemi yoktur.", author: "Lewis Carroll" },
    { text: "Karanlığı lanetleyeceğine bir mum yak.", author: "Konfüçyüs" },
    { text: "Büyük başarılar, pes etmeden önce bir kez daha deneyenlere aittir.", author: "Thomas Edison" },
    { text: "Kendini dünden başkasıyla kıyaslama.", author: "Jordan Peterson" },
    { text: "Bahane üretmek yerine sonuç üret.", author: "Anonim" },
    { text: "Her büyük iş, tek bir adımla başlar.", author: "Laozi" },
    { text: "Bir şeyin imkansız olduğuna inanırsan, aklın bunun neden imkansız olduğunu sana ispatlamak üzere çalışmaya başlar.", author: "David Schwartz" },
    { text: "Farkı yaratan, yapmaya üşendiğin o küçük işlerdir.", author: "Anonim" },
    { text: "Çok çalışmak yetenekten daha önemlidir, özellikle yetenek çok çalışmadığında.", author: "Tim Notke" },
    { text: "Cesaret, korkuya direnmek ve korkuyu alt etmektir; korkusuzluk demek değildir.", author: "Mark Twain" },
    { text: "Hayal edebiliyorsan, yapabilirsin.", author: "Walt Disney" },
    { text: "Kazanmak her şey değildir, ancak kazanmayı istemek her şeydir.", author: "Vince Lombardi" },
    { text: "Zorluklar, yaşamı ilginç kılan şeylerdir.", author: "Joshua J. Marine" },
    { text: "Kendine güven, başarının ilk kuralıdır.", author: "Ralph Waldo Emerson" },
    { text: "Unutma, senin dışında kimse potansiyeline sınır koyamaz.", author: "Anonim" },
    { text: "Fırsatlar her yerdedir, önemli olan gözünü açık tutmaktır.", author: "Anonim" },
    { text: "Sadece eylemler sonuç getirir, niyetler değil.", author: "Anonim" },
    { text: "Yere düşmek değil, düştüğün yerde kalmak yenilgidir.", author: "Sokrates" },
    { text: "Bugün ne ektiysen, yarın onu biçeceksin.", author: "R.L. Stevenson" },
    { text: "Asla pişman olma. İyi şeyler tecrübe, kötü şeyler ders olur.", author: "Anonim" },
    { text: "Kimse geriye gidip yeni bir başlangıç yapamaz, ama herkes bugün başlayıp yeni bir son yazabilir.", author: "Maria Robinson" },
    { text: "Hayatının kontrolünü eline al, yoksa bir başkası alır.", author: "Jack Welch" },
    { text: "Sorunlar seni zorlayan fırsatlardır.", author: "Anonim" },
    { text: "Bilgi güçtür ama uygulamadıkça hiçbir işe yaramaz.", author: "Anonim" },
    { text: "Başarısızlık bir olaydır, bir kişi değil.", author: "William D. Brown" },
    { text: "Vazgeçmek kolaydır. Denemeye devam etmek ise cesaret ister.", author: "Anonim" },
    { text: "Önce sen alışkanlıklarını inşa edersin, sonra onlar seni inşa eder.", author: "Charles Noble" },
    { text: "Sıradan insanlarla sıra dışı insanlar arasındaki fark, o küçük ekstra çabadır.", author: "Jimmy Johnson" },
    { text: "Her usta bir zamanlar acemiydi.", author: "Helen Hayes" },
    { text: "Bir hedefin ulaşılmaz olduğunu anladığınızda hedefinizi değil, adımlarınızı değiştirin.", author: "Konfüçyüs" },
    { text: "Gerçek özgürlük öz disiplinle başlar.", author: "Anonim" },
    { text: "Kötü alışkanlıkları yenmenin en iyi yolu, yerine iyi alışkanlıklar koymaktır.", author: "Anonim" },
    { text: "Geçmişin seni tanımlamasına izin verme. Bugün, istediğin kişi olmak için yeni bir şanstır.", author: "Anonim" },
    { text: "Değişim acı verir, ama hayat boyunca aynı yerde kalmaktan daha az acıtır.", author: "Anonim" },
    { text: "Kararsızlık zaman kaybıdır.", author: "Anonim" },
    { text: "Başka yollar aramak yerine, kendi yolunu çiz.", author: "Anonim" },
    { text: "Mükemmellik bir eylem değil, bir alışkanlıktır.", author: "Aristoteles" },
    { text: "Gelecek, bugünden hazırlananlara aittir.", author: "Malcolm X" },
    { text: "Dünyayı değiştirenler, bunu yapabileceklerini düşünecek kadar çılgın olanlardır.", author: "Rob Siltanen" },
    { text: "Zaman nakitten daha değerlidir. Daha çok para kazanabilirsin ama daha çok zaman kazanamazsın.", author: "Jim Rohn" },
    { text: "Büyüme zorlu anlarda gerçekleşir.", author: "Anonim" },
    { text: "Gelişim asla kendiliğinden olmaz, kasıtlı olmalı.", author: "Anonim" },
    { text: "Zorluklar seni bitirmek için değil, seni inşa etmek için var.", author: "Anonim" },
    { text: "Büyük düşün, ama küçük adımlarla başla.", author: "Anonim" },
    { text: "Gerçek potansiyelin konfor alanının dışında saklı.", author: "Anonim" },
    { text: "Odaklanma, 'hayır' deme sanatıdır.", author: "Steve Jobs" },
    { text: "Kırıldığın yerden daha güçlü ayağa kalkarsın.", author: "Ernest Hemingway" },
    { text: "Karşılaştığın her zorluk sende yeni bir yetenek geliştiriyor.", author: "Anonim" },
    { text: "Hiçbir şey imkansız değildir, sadece daha fazla zaman ve çaba gerektirir.", author: "Anonim" },
    { text: "Kendi yarattığın şansa inan.", author: "Anonim" },
    { text: "Bugün dünden daha akıllı, yarın ise bugünden daha güçlü ol.", author: "Anonim" },
    { text: "Hayat bir bisiklet gibidir; dengeyi sağlamak için pedalı çevirmeye devam etmelisin.", author: "Albert Einstein" },
    { text: "Başarısızlık, doğru cevabı bulana dek yanlış yolları elediğin bir testtir.", author: "Anonim" },
    { text: "İlerleme her zaman doğrusaldır ve pes etmeyenler ödüllendirilir.", author: "Anonim" },
    { text: "Rüzgarın yönünü değiştiremiyorsan, yelkenlerini ona göre ayarla.", author: "Jimmy Dean" },
    { text: "Şans, çalışana güler.", author: "Anonim" },
    { text: "Karşı koydukların devam eder. Kabul ettiklerin değişmeye başlar.", author: "Carl Jung" },
    { text: "Kendini her alanda şampiyon gibi gör, ta ki şampiyon oluncaya dek.", author: "Anonim" },
    { text: "Özgüven başarının kapısını açan ilk anahtardır.", author: "Arthur Ashe" },
    { text: "Başkalarının hatalarından ders al, her hatayı kendin yapacak kadar vaktin yok.", author: "Eleanor Roosevelt" },
    { text: "İmkansız sadece bir görüştür.", author: "Paulo Coelho" },
    { text: "İleriye doğru atılan en küçük adım bile geride kalmaktan daha iyidir.", author: "Anonim" },
    { text: "Sıradanla olağanüstü arasındaki o ince çizgi, kararlılıktır.", author: "Anonim" },
    { text: "Yola çık, yolu bulursun.", author: "Anonim" },
    { text: "Daha az şikayet et, daha çok çözüm üret.", author: "Anonim" },
    { text: "Her sabah yeni bir fırsattır. Değerlendirmek senin elinde.", author: "Anonim" },
    { text: "Engeller yolunu kapamaz, yepyeni yollar yaratır.", author: "Anonim" },
    { text: "Ummayı bırak, adını koy ve üstüne git.", author: "Anonim" },
    { text: "Enerjini dünkü hatalar için değil, yarınki başarılar için kullan.", author: "Anonim" },
    { text: "Kendi zirvene sadece kendi ayak izinle ulaşabilirsin.", author: "Anonim" },
    { text: "Kararlı bir insanı hiçbir güç yolundan döndüremez.", author: "Anonim" },
    { text: "Bugün yap, çünkü yarın hiç gelmeyebilir.", author: "Anonim" },
    { text: "Yaşam boyu öğrenci ol.", author: "Anonim" },
    { text: "Her vazgeçiş, kaybedilmiş bir maçtır.", author: "Anonim" },
    { text: "Kendini keşfet, gerisi gelecektir.", author: "Anonim" },
    { text: "Odağını kaybedersen, yönünü şaşırırsın.", author: "Anonim" },
    { text: "Asla başaramayacaksın diyen insanların, seni alkışlaması için çalış.", author: "Anonim" },
    { text: "Bahanelerle bir yere varamazsın, ama eylemlerle her yere gidersin.", author: "Anonim" },
    { text: "Başarı bir varış noktası değil, bir yolculuktur.", author: "Arthur Ashe" },
    { text: "Kimse seyretmiyorken bile doğru olanı yap, işte bu karakterdir.", author: "J.C. Watts" },
    { text: "Eğer daha ileri gitmek istemiyorsan, o zaman bulunduğun yeri hak ediyorsun.", author: "Anonim" },
    { text: "Potansiyelin okyanus kadar derin. Onu yüzeye çıkar.", author: "Anonim" },
    { text: "Önce kendine inan, ondan sonra diğer herkes sana inanacaktır.", author: "Anonim" },
    { text: "Başlamak için mükemmel olmayı beklemeyin; mükemmel olmak için başlayın.", author: "Zig Ziglar" },
    { text: "Ne olursa olsun, denemiş ve başarısız olmuş olmak, hiç denememiş olmaktan iyidir.", author: "Theodore Roosevelt" },
    { text: "Küçük zihinler insanları, orta zihinler olayları, büyük zihinler fikirleri konuşur.", author: "Eleanor Roosevelt" },
    { text: "İçindeki kıvılcımı koru; dünyayı aydınlatan ateş ondan başlar.", author: "Anonim" },
    { text: "Günlerini değerlendir. Harcadığın gün, hayatının günüdür.", author: "Jim Rohn" },
    { text: "Kendine her gün yatırım yap, bu asla iflas etmez.", author: "Anonim" },
    { text: "Giden zaman geri gelmez, olanla yapabileceğine odaklan.", author: "Anonim" },
    { text: "Düzenli ilerleyen kaplumbağa, dinlenen tavşanı her zaman yener.", author: "Ezop" },
    { text: "Başkalarının başarılı olmasına da sevin. Başarı paylaştıkça büyür.", author: "Anonim" },
    { text: "Pes etmeden önceki son an, başarının hemen öncesidir.", author: "Thomas Edison" },
    { text: "Sabret, çünkü her şey başlamadan önce zordur.", author: "Sadi Şirazi" },
    { text: "Zihnini ikna edebiliyorsan, bedenini yapabileceğine de ikna edersin.", author: "Anonim" },
    { text: "En zor anlarında aldığın kararlar, hayatını şekillendirir.", author: "Tony Robbins" },
    { text: "Hedefine odaklan, yol boyunca gördüğün taşlara değil.", author: "Anonim" },
    { text: "Hayatının merkezine üretmeyi koy, tüketmeyi değil.", author: "Anonim" },
    { text: "Önemli olan nereden başladığın değil, nereye vardığındır.", author: "Nelson Mandela" },
    { text: "Sorun üretme, çözümün parçası ol.", author: "Anonim" },
    { text: "Herkesin bir plana ihtiyacı vardır, başarının rotası rastgele çizilmez.", author: "Anonim" },
    { text: "Kendini aş, çünkü en büyük rakibin kendi dünkü versiyonundur.", author: "Anonim" },
    { text: "İyi bir fikir, uygulamaya geçmediğinde sadece bir illüzyondur.", author: "Anonim" },
    { text: "Neyi sık tekrar edersen, o senin karakterin olur.", author: "Will Durant" },
    { text: "Bir hedefin var mı? O yoksa, boşluktasın demektir.", author: "Anonim" },
    { text: "Ertelenen her iş, aslında ertelenen bir ömürdür.", author: "Anonim" },
    { text: "Geç kalmış hissettiğin anlarda bile sadece başla.", author: "Anonim" },
    { text: "Öyle büyük hedefler koy ki ulaştığında sen de şaşır.", author: "Anonim" },
    { text: "Kaygılanmayı bırakırsan, düşünmeye ve plan yapmaya başlarsın.", author: "Anonim" },
    { text: "Vazgeçmeyenler asla yenilmezler.", author: "Babe Ruth" },
    { text: "Bekleme. Asla 'doğru zaman' gelmeyecek.", author: "Napoleon Hill" },
    { text: "Özgürlük, yapman gerekenleri yapabilme disiplinidir.", author: "Anonim" },
    { text: "Bilgelik ne zaman duracağını bilmektir; cesaret ne zaman başlayacağını.", author: "Anonim" },
    { text: "Kendine küçük iyilikler yap: bugün elinden geleni yap.", author: "Anonim" },
    { text: "Öfke veya hayal kırıklığını yakıt olarak kullan.", author: "Anonim" },
    { text: "En değerli varlığın odaklanma becerindir.", author: "Anonim" },
    { text: "Karşılaştırma hırsızdır, odağı dağıtır.", author: "Theodore Roosevelt" },
    { text: "Çabana aşık ol, sonuca değil.", author: "Anonim" },
    { text: "Kendini bulmak yerine kendini yarat.", author: "George Bernard Shaw" },
    { text: "Güzel şeyler sabır, küçük şeyler dikkat ister.", author: "Anonim" },
    { text: "Başarısızlıktan korkma, hiç denememiş olmaktan kork.", author: "Anonim" },
    { text: "Bugün yapacağın en küçük değişiklik, yarınki büyük farkın başlangıcıdır.", author: "Anonim" },
    { text: "Zamanını boşa harcama, çünkü hayat bununla inşa edilir.", author: "Benjamin Franklin" },
    { text: "Her iyi şey bedel ödemeyi gerektirir.", author: "Anonim" },
    { text: "Eğer sen hedefine inanmazsan kimse inanmaz.", author: "Anonim" },
    { text: "Kendini zorlamadıkça sınırlarını asla öğrenemezsin.", author: "Anonim" },
    { text: "Kolay olsaydı herkes yapardı.", author: "Tom Hanks" },
    { text: "Düşlediğin şey başarmak için ilk adımdır.", author: "Anonim" },
    { text: "Tembellik yorgunluk bile vermez, sadece pişmanlık verir.", author: "Anonim" },
    { text: "Zaman, akıp giden bir su gibidir, onu ne için kullandığın önemlidir.", author: "Anonim" },
    { text: "İstemek yetmez, yapmak gerekir.", author: "Leonardo da Vinci" },
    { text: "Kendi gücüne inandığın an yenilmez olursun.", author: "Anonim" },
    { text: "Hayat bir sahnedir, oynamak istediğin rolü seç ve en iyisini yap.", author: "Anonim" },
    { text: "Başlamadan başaramazsın.", author: "Anonim" },
    { text: "Ne kadar çalışırsan o kadar şanslı olursun.", author: "Thomas Jefferson" },
    { text: "Küçük şeyler, büyük işler başarmanı sağlar.", author: "Anonim" },
    { text: "Geçmiş geçmişte kaldı, bugün ise sana aittir.", author: "Anonim" },
    { text: "Kendini her gün 1 derece daha iyiye taşı.", author: "Anonim" },
    { text: "Kendinden şüphe ediyorsan sadece adım farz et.", author: "Anonim" },
    { text: "Gözyaşları yerine ter dökmeyi seç.", author: "Anonim" },
    { text: "Güç, bedeninden değil, yılmaz vizyonundan gelir.", author: "Mahatma Gandhi" },
    { text: "Başarısızlık bir fırsattır, ders çıkar ve devam et.", author: "Anonim" },
    { text: "Sorunları büyütmek yerine çözüm bulmayı alışkanlık edin.", author: "Anonim" },
    { text: "Gelişim her zaman kolay değildir, ancak gereklidir.", author: "Anonim" },
    { text: "Bugün düştün mü? Yarın daha güçlü kalk.", author: "Anonim" },
    { text: "Her deneyim sana yeni bir şeyler öğretir.", author: "Anonim" },
    { text: "Hedefine giden yol düz değildir, ama manzara güzeldir.", author: "Anonim" },
    { text: "İnanç, başarmak için ihtiyacın olan yakıttır.", author: "Anonim" },
    { text: "İyi alışkanlıklar kurasıya kadar seni zorlar, kurulduktan sonra seni taşır.", author: "Anonim" },
    { text: "Kötü alışkanlıklarla geçen bir gün, iyi alışkanlıklarla telafi edilebilir.", author: "Anonim" },
    { text: "Kendine her gün ne kadar harika olduğunu hatırlat.", author: "Anonim" },
    { text: "Hayatının mimarı sensin.", author: "Anonim" },
    { text: "Küçük bir adım atmak, yerinde saymaktan sonsuz kere iyidir.", author: "Anonim" },
    { text: "Daha iyi bir yarın için bugünden çalış.", author: "Anonim" },
    { text: "İçindeki gücü dışarı çıkar, o orda seni bekliyor.", author: "Anonim" },
    { text: "Nereden geldiğine değil, nereye gideceğine odaklan.", author: "Anonim" },
    { text: "Zorluklar seni değil, yeteneklerini test eder.", author: "Anonim" },
    { text: "Başlamak için hazır hissetmeyi bekleme.", author: "Anonim" },
    { text: "Kendini başkalarıyla değil, kendi dününle kıyasla.", author: "Anonim" },
    { text: "Gereksiz şeyleri bırak ki gerekliler parlasın.", author: "Anonim" },
    { text: "Motivasyon gelip geçicidir, disiplin ise kalıcıdır.", author: "Anonim" },
    { text: "Bir amaca sahip ol ve ona adanmış kal.", author: "Anonim" },
    { text: "Hata yapmayan insan hiçbir şey yapmayan insandır.", author: "Theodore Roosevelt" },
    { text: "Fark yaratmak istiyorsan, sıradanlıktan çık.", author: "Anonim" },
    { text: "Düşüncelerin seni durdurmasın, sen onları kontrol et.", author: "Anonim" },
    { text: "Pes etmek için çok erken, başarmak için tam zamanı.", author: "Anonim" },
    { text: "Kendi yarattığın yoldan yürümek, başkasının yolundan gitmekten zordur ama daha tatmin edicidir.", author: "Anonim" },
    { text: "Engeller başarı öykünün en iyi kısımlarıdır.", author: "Anonim" },
    { text: "Korkular seni sınırlar, cesaret özgürleştirir.", author: "Anonim" },
    { text: "Bilgi, onu uygulamadığın sürece sadece potansiyel bir güçtür.", author: "Anonim" },
    { text: "Bugün yapacağın en küçük doğru seçim, yarınki büyük başarılarını hazırlar.", author: "Anonim" },
    { text: "Kimse için değil, kendi geleceğin için çabala.", author: "Anonim" },
    { text: "Hata yapmak sadece bir kez olur, ondan sonrası öğrenmektir.", author: "Anonim" },
    { text: "Bileği bükülemeyen bir irade, her zorluğun üstesinden gelir.", author: "Anonim" },
    { text: "Başarılı bir gün, planlı bir şekilde harcanan andır.", author: "Anonim" },
    { text: "Dene, yanıl, öğren, tekrar dene, başar.", author: "Anonim" },
    { text: "Geleceğin, bugün ne yaptığın üzerine inşa edilir.", author: "Mahatma Gandhi" },
    { text: "Zenginlik bir sayı değil, bir durumdur; aynısı başarı için de geçerlidir.", author: "Anonim" },
    { text: "Güzel şeyler zaman alır, acele etme.", author: "Anonim" },
    { text: "Karşılaştığın her insan sana bir şey öğretir.", author: "Anonim" },
    { text: "En değerli kaynak, kaybettiğinde yerine gelmeyen zamandır.", author: "Anonim" },
    { text: "Odaklanma yeteneği başarının en büyük sırrıdır.", author: "Anonim" },
    { text: "Kendini aşırı analiz etme, sadece yap.", author: "Anonim" },
    { text: "Bir amaç uğruna yaşamak, hayatın ta kendisidir.", author: "Anonim" },
    { text: "Eğer sen istemezsen kimse sana bir şey öğretemez.", author: "Anonim" },
    { text: "Gülümsemek için bir neden ara, her gün en az bir tane vardır.", author: "Anonim" },
    { text: "Düşündüğün gibi olursun.", author: "Anonim" },
    { text: "Enerjini şikayet etmek yerine çözüm üretmeye harca.", author: "Anonim" },
    { text: "Kararlarımız, sadece koşullarımızdan daha fazla, bizi biz yapan şeydir.", author: "J.K. Rowling" },
    { text: "Sen eyleme geçmedikçe hiçbir planın bir anlamı yoktur.", author: "Anonim" },
    { text: "Farklı sonuçlar istiyorsan, farklı şeyler yap.", author: "Albert Einstein" },
    { text: "Başka insanların standartlarına göre yaşamak zorunda değilsin.", author: "Anonim" },
    { text: "Ummak yerine adım atmak, mucizelerin kilidini açar.", author: "Anonim" },
    { text: "En verimli yatırım kendini geliştiğin anlardır.", author: "Anonim" },
    { text: "Bugün, geleceğini inşa etmek için elindeki tek andır.", author: "Anonim" },
    { text: "Gereksiz telaşa kapılma, sabrını koru.", author: "Anonim" },
    { text: "Disiplin, ne istediğini şimdi ne istediğine tercih etmektir.", author: "Anonim" },
    { text: "Hedefsiz bir plan sadece bir hayaldir.", author: "Antoine de Saint-Exupéry" },
    { text: "Küçük başarıları kutla ki büyüklerine yer açılsın.", author: "Anonim" },
    { text: "Özgüven, bilgi ile gelir.", author: "Anonim" },
    { text: "Aynı şeyi yapıp farklı sonuç beklemek deliliktir.", author: "Albert Einstein" },
    { text: "Kendini değiştirebilirsen her şeyi değiştirebilirsin.", author: "Anonim" },
    { text: "Bir şeyler yapmak için mükemmel anı bekleme, anı mükemmel yap.", author: "Anonim" },
    { text: "Hiçbir çaba karşılıksız kalmaz.", author: "Anonim" },
    { text: "Güvenlik bir efsanedir, asıl önemli olan uyum kapasitesidir.", author: "Helen Keller" },
    { text: "Sade yaşa, büyük düşün.", author: "Anonim" },
    { text: "Bir hedef koymak, görünmezi görünür yapmanın ilk adımıdır.", author: "Tony Robbins" },
    { text: "Sorun sende değil, soruna bakış açında.", author: "Anonim" },
    { text: "Dikkatin neredeyse, enerjin oraya akar.", author: "Anonim" },
    { text: "Kendinle yarışmaktan yorulma, zira bu en tatmin edici yarıştır.", author: "Anonim" },
    { text: "Yeni şeyler öğrenmek için beynini açık tut.", author: "Anonim" },
    { text: "Kıskanmak yerine ilham al.", author: "Anonim" },
    { text: "Düşüncelerin pozitifse, eylemlerin de pozitif olur.", author: "Anonim" },
    { text: "Kendini her gün şaşırt.", author: "Anonim" },
    { text: "Gerçek bilgelik sadece ne bildiğini bilmek değil, ne yapacağını bilmektir.", author: "Anonim" },
    { text: "Eğer sen kendine inanmazsan, başkası neden inansın.", author: "Anonim" },
    { text: "Her yeni gün, sana yeni bir şans verir.", author: "Anonim" },
    { text: "Bugün ne yaptığın, yarın ne olacağının teminatıdır.", author: "Anonim" },
    { text: "Hayatının merkezine üretmeyi koyduğunda tüketim azalır.", author: "Anonim" },
    { text: "Bir konuda uzmanlaşmak için sadece başlamak bile bir şeydir.", author: "Anonim" },
    { text: "Yürekten istenen bir şeye hiçbir engel duramaz.", author: "Anonim" },
    { text: "Kendini zorlamadan büyüme bekleyemezsin.", author: "Anonim" },
    { text: "Başkalarını anlamak bilgelik, kendini anlamak ise aydınlanmadır.", author: "Laozi" },
    { text: "Gelecek kendi kendini yazmaz, onu sen yazarsın.", author: "Anonim" },
    { text: "Başarmak için inatçı ol.", author: "Anonim" },
    { text: "Her son, yeni bir başlangıcın habercisidir.", author: "Anonim" },
    { text: "Büyük işler ancak sabırla tamamlanır.", author: "Anonim" },
    { text: "Hayaller büyük ama adımlar küçük olabilir.", author: "Anonim" },
    { text: "Gücünü başkalarıyla kıyaslamak seni sadece üzer, kendini izle.", author: "Anonim" },
    { text: "Sıradanlığı kabul etmezsen, olağanüstü olmaya başlarsın.", author: "Anonim" },
    { text: "Motivasyon seni ayakta tutar, alışkanlıklar seni amaca taşır.", author: "Anonim" },
    { text: "Nereden geldiğin değil, nerede durduğun önemlidir.", author: "Anonim" },
    { text: "Kendine sadece olumlu şeyler fısılda, çünkü bilinçaltı her şeyi duyar.", author: "Anonim" },
    { text: "Karşılaştığın her krizin arkasında bir fırsat gizlidir.", author: "Anonim" },
    { text: "Kaybetmek, asıl deneyimi kazandığın anlardan biridir.", author: "Anonim" },
    { text: "Tutumun her şeydir.", author: "Anonim" },
    { text: "Büyümenin sırrı daima bir öğrenci kalmaktır.", author: "Anonim" },
    { text: "Rutin, yaratıcılığın temel zeminidir.", author: "Anonim" },
    { text: "Zaman en adil yargıçtır.", author: "Anonim" },
    { text: "Yaratıcılık bilginin eğlenmesidir.", author: "Albert Einstein" },
    { text: "Bilgi seni kapıya götürür, disiplin kapıdan geçirir.", author: "Anonim" },
    { text: "Sen değiştiğinde her şey değişir.", author: "Anonim" },
    { text: "Kendine her gün yatırım yap, en iyi geri dönüşü oradan alırsın.", author: "Anonim" },
    { text: "Şimdi neysen, geçmişte ne seçtin odur.", author: "Anonim" },
    { text: "Hiçbir şey için geç değildir, eğer istersen bu gücü elinde tutarsın.", author: "Anonim" },
    { text: "Büyük başarıların sırrı, devamlı hedefe yönelmektir.", author: "Anonim" },
    { text: "Geçmişin yükünü omuzlarında taşıma.", author: "Anonim" },
    { text: "Kararlılık zihinden, eylem ellerden başlar.", author: "Anonim" },
    { text: "Ne olursa olsun gülümse.", author: "Anonim" },
    { text: "Kendin ol, o kadar değerlidir ki kopya edilemezsin.", author: "Anonim" },
    { text: "Küçük zevklerin arkasında büyük acılar olabilir, uzak dur.", author: "Anonim" },
    { text: "Mazeretler sadece hedefini küçültür.", author: "Anonim" },
    { text: "Gereksiz ayrıntılarda boğulma, asıl noktayı kaçırma.", author: "Anonim" },
    { text: "Güvende kalmak, en büyük risktir.", author: "Anonim" },
    { text: "Öfke yerine bilgelik seçimi yap.", author: "Anonim" },
    { text: "Hayat bir deneydir, dene.", author: "Anonim" },
    { text: "En değerli armağan kendine inancındır.", author: "Anonim" },
    { text: "Başkalarına merhamet, kendine dürüstlüktür.", author: "Anonim" },
    { text: "Herkesin yürüdüğü yol, yeni yerlere çıkmaz.", author: "Anonim" },
    { text: "Sonsuz olan sadece olasılıklar.", author: "Anonim" },
    { text: "Çalışana ve düşünene sınır yoktur.", author: "Anonim" },
    { text: "Gözyaşların yola karışsın ama asla seni durdurmasın.", author: "Anonim" },
    { text: "Kararsızlık enerjini tüketir.", author: "Anonim" },
    { text: "Kendi kıymetini bilmek, başarının temeli.", author: "Anonim" },
    { text: "Sen kendine izin vermezsen imkansızlıklar var olmaz.", author: "Anonim" },
    { text: "Güzel olan şeyler çirkin yollardan geçebilir.", author: "Anonim" },
    { text: "Her ne olursa olsun, bir gün aydınlanacaksın.", author: "Anonim" },
    { text: "Deniz dalgalanmadan durulmaz.", author: "Anonim" },
    { text: "Korkaklar kendi içlerindeki sınırlarla yaşar, cesurlar onları yıkar.", author: "Anonim" },
    { text: "Mümkünata odaklanırsan imkansızlıkları aşarsın.", author: "Anonim" },
    { text: "Zorluklar seni eğitmek içindir.", author: "Anonim" },
    { text: "Bilgelik sessizlikten gelir.", author: "Anonim" },
    { text: "Sen ne hissedersen o gerçektir, çünkü hislerin senin deneyimindir.", author: "Anonim" },
    { text: "Eğer sen istemezsen zafer bir anlam ifade etmez.", author: "Anonim" },
    { text: "İstemek ve yapmak arasındaki fark uçurum değildir.", author: "Anonim" },
    { text: "Sürdürülebilirlik anahtardır.", author: "Anonim" },
    { text: "Bilgi ne kadar kıymetliyse, cehalet de o kadar kötüdür.", author: "Anonim" },
    { text: "Mükemmel olmayı değil, her gün yapmayı hedefle.", author: "Anonim" },
    { text: "Gerçek özgürlük kendine dürüst olmaktır.", author: "Anonim" },
    { text: "Başka yollar aramak yerine hedefe nasıl gidilir ona bak.", author: "Anonim" },
    { text: "Sıraya itaat etme, kuralları yeniden yaz.", author: "Anonim" },
    { text: "Şimdi sen başlarsan yarın sen tamamlarsın.", author: "Anonim" },
    { text: "Sen ve kendin tek rakipsiniz.", author: "Anonim" },
    { text: "Kendine nazik ol.", author: "Anonim" },
    { text: "Kendiliğinden olma sadece tembellerin özürüdür.", author: "Anonim" },
    { text: "Gerçek sevgi kendi sınırlarını aşmaktır.", author: "Anonim" },
    { text: "Bugün düne saygı yarın geleceğe umut taşırsın.", author: "Anonim" },
    { text: "Asla korkuyu efendin, kendini köle yapma.", author: "Anonim" },
    { text: "Bütün büyük icatlar basit hayallerle başladı.", author: "Anonim" },
    { text: "Sevdiğin şeyi yaparsan asla yorulmazsın.", author: "Anonim" },
    { text: "Başlangıçsız son olmaz.", author: "Anonim" },
    { text: "Hedefinin ağırlığı, ne kadar derin olduğuna bağlıdır.", author: "Anonim" },
    { text: "Gece en karanlık olduğu an, daha çok yıldız görürsün.", author: "Anonim" },
    { text: "Gerçek mucize kendiliğinden oluşmaz, seninle oluşur.", author: "Anonim" },
    { text: "Tasarım ruhudur başarının.", author: "Anonim" },
    { text: "Bilimsel ilerle, sanatsal yaşa.", author: "Anonim" },
    { text: "Ufuk çizgisi yürümeyenler için sadece bir sınırdır.", author: "Anonim" },
    { text: "Başkasına zarar vermeyen her hayal gerçeğe dönüşür.", author: "Anonim" },
    { text: "Anla ki anlatasın, anlat ki anlaşılasın.", author: "Anonim" },
    { text: "Aynı yerde dönüp durma.", author: "Anonim" },
    { text: "Bilgi derya ise sen bir damla ol.", author: "Anonim" },
    { text: "Rutin, sıkıcı gözükse de, büyükleri sıradan yapan şeydir.", author: "Anonim" },
    { text: "Hırsını disiplinle birleştir.", author: "Anonim" },
    { text: "Gideni geri alma, yeniye kucak aç.", author: "Anonim" },
    { text: "Aydınlık ancak kendi gölgeni aştığında sana yol gösterir.", author: "Anonim" },
    { text: "Huzursuzluk senin uyanıp ayağa kalkman demek.", author: "Anonim" },
    { text: "Geçmiş senin pusulan, gelecek senin amacındır.", author: "Anonim" },
    { text: "Sen yoksan dünya da yoktur senin için.", author: "Anonim" },
    { text: "Ayağına dolanan çakıl taşı, büyük hedefe olan odaklanmanın önündeki son sınav olabilir.", author: "Anonim" },
    { text: "Yürekli bir kalpte korkuya yer kalmaz.", author: "Anonim" },
    { text: "Nüanslarda boğulma, vizyonda genişle.", author: "Anonim" },
    { text: "Bilimi kılavuz al, sezgiyi dinle.", author: "Anonim" },
    { text: "Günün yorgunluğu başarının şarkısıdır.", author: "Anonim" },
    { text: "Herkes için aynı güneş olmaz, ama herkes güneşi kullanabilir.", author: "Anonim" },
    { text: "Gelecek senin bugün yapacağına bağlıdır.", author: "Anonim" },
    { text: "Sonuçtan değil süreçten keyif al.", author: "Anonim" },
    { text: "Ummadığın kadar güçlüsün.", author: "Anonim" },
    { text: "Deniz derinleştikçe dalgaları hissetmezsin.", author: "Anonim" },
    { text: "Bağışlayıcılık en büyük erdemlerden biridir.", author: "Anonim" },
    { text: "Ruhunu neşeyle doldur.", author: "Anonim" },
    { text: "Bilmek yapmaktır.", author: "Anonim" }
];

function getDailyQuote() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    return motivationalQuotes[dayOfYear % motivationalQuotes.length];
}

function renderDailyQuote() {
    const quote = getDailyQuote();
    document.getElementById('quoteText').textContent = `"${quote.text}"`;
    document.getElementById('quoteAuthor').textContent = `- ${quote.author}`;
}

window.getWeekDates = getWeekDates;
window.getWeekTitle = getWeekTitle;
window.getMonthName = getMonthName;
window.getDayName = getDayName;
window.formatDateDisplay = formatDateDisplay;
window.triggerConfetti = triggerConfetti;
window.renderPersonalRecords = renderPersonalRecords;
window.getEntityBucketByType = getEntityBucketByType;
window.getEntityTypeLabel = getEntityTypeLabel;
window.softDeleteItem = softDeleteItem;
window.createHabit = createHabit;
window.updateHabit = updateHabit;
window.deleteHabit = deleteHabit;
window.quickToggleHabit = quickToggleHabit;
window.toggleHabitCompletion = toggleHabitCompletion;
window.handleDayMouseDown = handleDayMouseDown;
window.handleDayMouseUp = handleDayMouseUp;
window.handleDayMouseLeave = handleDayMouseLeave;
window.saveHabitValue = saveHabitValue;
window.clearHabitValue = clearHabitValue;
window.renderSummaryStats = renderSummaryStats;
window.renderHabits = renderHabits;
window.openEditHabit = openEditHabit;
window.openHabitCreateModal = openHabitCreateModal;
window.renderDailyQuote = renderDailyQuote;
