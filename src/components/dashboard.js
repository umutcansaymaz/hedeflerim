// ===== Dashboard Component =====
// Hedeflerim — Extracted from app-v5.js

// ----- Daily Recap -----

function renderDailyRecap() {
    const container = document.getElementById('dailyRecapBar');
    if (!container) return;

    const today = window.formatDate(new Date());

    const streak = window.calculateLongestStreak();

    const focusStats = window.FocusTimer.getWeekStats(0);
    const focusMinutes = Math.floor((focusStats?.totalWorkSec || 0) / 60);

    const totalHabits = window.appData.habits.length;
    const completedHabits = window.appData.habits.filter(h => window.isCompletionDone(h.completions[today])).length;
    const habitRatio = totalHabits > 0 ? `${completedHabits}/${totalHabits}` : '0/0';

    const activeBooks = window.appData.books.filter(b => window.normalizeBookStatus(b) === 'reading').length;

    container.innerHTML = `
        <div class="daily-recap-badge" title="En uzun seri">
            <span class="daily-recap-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg></span>
            <span class="daily-recap-value">${streak}</span>
            <span class="daily-recap-label">En Uzun Seri</span>
        </div>
        <div class="daily-recap-badge" title="Bu hafta odaklanılan süre">
            <span class="daily-recap-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
            <span class="daily-recap-value">${focusMinutes}</span>
            <span class="daily-recap-label">dk Bu Hafta</span>
        </div>
        <div class="daily-recap-badge" title="Bugünkü alışkanlıklar">
            <span class="daily-recap-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></span>
            <span class="daily-recap-value">${habitRatio}</span>
            <span class="daily-recap-label">Bugün</span>
        </div>
        <div class="daily-recap-badge" title="Aktif kitaplar">
            <span class="daily-recap-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></span>
            <span class="daily-recap-value">${activeBooks}</span>
            <span class="daily-recap-label">Aktif Kitap</span>
        </div>
    `;

    const streakBadge = document.getElementById('streakRiskBadge');
    if (streakBadge) {
        const habits = window.appData.habits || [];
        let hasRisk = false;
        for (let i = 0; i < habits.length; i++) {
            const h = habits[i];
            if (!h || !h.completions) continue;
            const streak = window.calculateStreak(h.completions);
            if (streak >= 3 && !window.isCompletionDone(h.completions[today])) {
                hasRisk = true;
                break;
            }
        }
        streakBadge.classList.toggle('hidden', !hasRisk);
        streakBadge.title = hasRisk ? '🔥 Serin tehlikede! Bugün tamamlamadığın alışkanlıklar var.' : '';
    }
}

// ----- Main Dashboard -----

function _renderWelcomeAndXP() {
    const now = new Date();
    const hour = now.getHours();

    let greeting = 'Merhaba';
    if (hour < 12) greeting = 'Günaydın';
    else if (hour < 18) greeting = 'İyi günler';
    else greeting = 'İyi akşamlar';

    const dateStr = now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    const greetingEl = document.getElementById('dashboardGreeting');
    greetingEl.innerHTML = `
        <h2>${greeting}</h2>
        <p>${dateStr}</p>
        
        <div class="xp-container" style="margin-top: 12px;">
            <div class="level-info" style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.8rem; opacity:0.8;">
                <div>
                    <span id="userLevel" style="font-weight:bold; background:var(--primary); padding:2px 6px; border-radius:4px; color:white;">Lvl ${window.appData.level || 1}</span>
                    <span id="userTitle" style="margin-left:5px;">${window.getLevelTitle(window.appData.level || 1)}</span>
                </div>
                <span id="userXP">${window.appData.xp || 0} / ${window.calculateNextLevelXP(window.appData.level || 1)} XP</span>
            </div>
            <div class="xp-track" style="background:rgba(0,0,0,0.05); height:8px; border-radius:4px; overflow:hidden;">
                <div class="xp-bar" id="xpBar" style="background:var(--primary); width:${window.calculateXPPercent() || 0}%; height:100%; transition:width 0.5s ease;">
                </div>
            </div>
        </div>
    `;
}

function _renderStatCards() {
    const today = window.formatDate(new Date());
    const statsEl = document.getElementById('dashboardStats');
    const completedHabitsToday = window.appData.habits.filter(h => window.isCompletionDone(h.completions[today])).length;
    const totalHabits = window.appData.habits.length;
    const pendingTodos = window.appData.todos.filter(t => !t.completed).length;
    const currentStreak = window.calculateLongestStreak();

    statsEl.innerHTML = `
        <div class="dashboard-stat-card">
            <div class="dashboard-stat-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
            <div class="dashboard-stat-value">${completedHabitsToday}/${totalHabits}</div>
            <div class="dashboard-stat-label">Bugün Tamamlanan</div>
        </div>
        <div class="dashboard-stat-card">
            <div class="dashboard-stat-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg></div>
            <div class="dashboard-stat-value">${currentStreak}</div>
            <div class="dashboard-stat-label">En Uzun Seri</div>
        </div>
        <div class="dashboard-stat-card">
            <div class="dashboard-stat-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <div class="dashboard-stat-value">${pendingTodos}</div>
            <div class="dashboard-stat-label">Bekleyen Görev</div>
        </div>
        <div class="dashboard-stat-card">
            <div class="dashboard-stat-icon"><svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>
            <div class="dashboard-stat-value">${window.appData.books.filter(b => window.normalizeBookStatus(b) === 'reading').length}</div>
            <div class="dashboard-stat-label">Okunan Kitap</div>
        </div>
    `;
}

function renderDashboard() {
    const order = window.appData.settings?.dashboardOrder || 'default';
    const sectionOrder = getDashboardSectionOrder(order);

    _renderWelcomeAndXP();
    renderDailyRecap();
    _renderStatCards();

    for (let i = 0; i < sectionOrder.length; i++) {
        switch (sectionOrder[i]) {
            case 'mood': window.renderMoodTracker(); break;
            case 'habits': renderDashboardHabitsSection(); break;
            case 'book': renderDashboardBookSection(); break;
            case 'todos': renderDashboardTodosSection(); break;
            case 'tomorrow': renderDashboardTomorrowTodosSection(); break;
        }
    }

    window.checkAchievements();

    setTimeout(() => {
        window.SmartCoach.render();
        window.renderWeeklySummary();
        window.scheduleUiTextRepair();
    }, 0);
}

function getDashboardSectionOrder(order) {
    const ORDERS = {
        default: ['mood', 'habits', 'book', 'todos', 'tomorrow'],
        motivation: ['mood', 'habits', 'book', 'todos', 'tomorrow'],
        productivity: ['habits', 'todos', 'tomorrow', 'book', 'mood'],
        minimal: ['habits', 'todos']
    };
    return ORDERS[order] || ORDERS.default;
}

function renderDashboardHabitsSection() {
    const today = window.formatDate(new Date());
    const habitsEl = document.getElementById('dashboardHabits');
    if (!habitsEl) return;

    if (window.appData.habits.length === 0) {
        habitsEl.innerHTML = `<div class="dashboard-empty-enhanced">
            <div class="dashboard-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg></div>
            <div class="dashboard-empty-text">Henüz alışkanlık eklemedin</div>
            <div class="dashboard-empty-sub">Küçük bir hedefle başla, büyük değişim yarat.</div>
            <button class="btn btn-primary btn-sm" onclick="window.switchTab('habits');setTimeout(function(){window.openModal('newHabitModal')},120);">Hemen Ekle</button>
        </div>`;
    } else {
        habitsEl.innerHTML = window.appData.habits.map(habit => {
            const isCompleted = window.isCompletionDone(habit.completions[today]);
            const safeHabitName = safeText(habit.name);
            const safeHabitId = window.escapeJsSingleQuote(habit.id || '');
            const safeHabitColor = window.sanitizeColor(habit.color);
            return `
                <div class="dashboard-habit-item" onclick="window.quickToggleHabit(window.decodeJsSingleQuote('${safeHabitId}'))">
                    <div class="dashboard-habit-color" style="background: ${safeHabitColor}"></div>
                    <span class="dashboard-habit-name">${safeHabitName}</span>
                    <div class="dashboard-habit-status ${isCompleted ? 'completed' : ''}">
                        ${isCompleted ? '✔' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function renderDashboardBookSection() {
    const bookEl = document.getElementById('dashboardBook');
    if (!bookEl) return;

    const currentBook =
        window.appData.books.find(b => window.normalizeBookStatus(b) === 'reading') ||
        window.appData.books.find(b => window.normalizeBookStatus(b) === 'pending');
    if (currentBook) {
        const progress = currentBook.totalPages > 0
            ? Math.min(100, Math.max(0, Math.round((currentBook.currentPage / currentBook.totalPages) * 100)))
            : 0;
        const safeBookTitle = safeText(currentBook.title);
        const safeBookAuthor = safeText(currentBook.author);
        bookEl.innerHTML = `
            <div class="dashboard-book-info">
                <div class="dashboard-book-title">${safeBookTitle}</div>
                ${currentBook.author ? `<div class="dashboard-book-author">${safeBookAuthor}</div>` : ''}
                <div class="dashboard-book-progress">
                    <div class="dashboard-book-bar">
                        <div class="dashboard-book-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    <span class="dashboard-book-percent">${progress}%</span>
                </div>
            </div>
        `;
    } else {
        bookEl.innerHTML = `<div class="dashboard-empty-enhanced">
            <div class="dashboard-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg></div>
            <div class="dashboard-empty-text">Okumaya başladığınız kitap yok</div>
            <div class="dashboard-empty-sub">Bugün yeni bir kitaba başlayın.</div>
            <button class="btn btn-primary btn-sm" onclick="switchTab('books')">Kitap Ekle</button>
        </div>`;
    }
}

function renderDashboardTodosSection() {
    const todosEl = document.getElementById('dashboardTodos');
    if (!todosEl) return;

    const pendingTodosList = window.appData.todos.filter(t => !t.completed).slice(0, 5);
    if (pendingTodosList.length === 0) {
        todosEl.innerHTML = `<div class="dashboard-empty-enhanced">
            <div class="dashboard-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <div class="dashboard-empty-text">Bugün için görev yok</div>
            <div class="dashboard-empty-sub">Yapılacak bir şey ekleyin.</div>
            <button class="btn btn-primary btn-sm" onclick="window.switchTab('todos');setTimeout(function(){var i=document.getElementById('todoInput');if(i)i.focus()},120);">Görev Ekle</button>
        </div>`;
    } else {
        todosEl.innerHTML = pendingTodosList.map(todo => {
            const safeTodoId = window.escapeJsSingleQuote(todo.id);
            return `
                <div class="dashboard-todo-item">
                    <div class="dashboard-todo-checkbox" onclick="window.toggleTodo(window.decodeJsSingleQuote('${safeTodoId}'))"></div>
                    <span class="dashboard-todo-text">${safeText(todo.text)}${todo.dueDate ? `<span class="todo-due-badge">${safeText(todo.dueDate)}</span>` : ''}</span>
                </div>
            `;
        }).join('');
    }
}

function renderDashboardTomorrowTodosSection() {
    const tomorrowTodosEl = document.getElementById('dashboardTomorrowTodos');
    if (!tomorrowTodosEl) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = window.formatDate(tomorrow);
    const tomorrowTodosList = window.appData.todos.filter(t => !t.completed && t.dueDate === tomorrowStr).slice(0, 5);
    if (tomorrowTodosList.length === 0) {
        tomorrowTodosEl.innerHTML = `<div class="dashboard-empty-enhanced">
            <div class="dashboard-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
            <div class="dashboard-empty-text">Yarın için planlanmış görev yok</div>
            <div class="dashboard-empty-sub">Bugünden bir adım planlayın.</div>
        </div>`;
    } else {
        tomorrowTodosEl.innerHTML = tomorrowTodosList.map(todo => {
            const safeTodoId = window.escapeJsSingleQuote(todo.id);
            return `
                <div class="dashboard-todo-item">
                    <div class="dashboard-todo-checkbox" onclick="window.toggleTodo(window.decodeJsSingleQuote('${safeTodoId}'))"></div>
                    <span class="dashboard-todo-text">${safeText(todo.text)}${todo.dueDate ? `<span class="todo-due-badge">${safeText(todo.dueDate)}</span>` : ''}</span>
                </div>
            `;
        }).join('');
    }
}

window.renderDailyRecap = renderDailyRecap;
window.renderDashboard = renderDashboard;
window.renderDashboardHabitsSection = renderDashboardHabitsSection;
window.renderDashboardBookSection = renderDashboardBookSection;
window.renderDashboardTodosSection = renderDashboardTodosSection;
window.renderDashboardTomorrowTodosSection = renderDashboardTomorrowTodosSection;
