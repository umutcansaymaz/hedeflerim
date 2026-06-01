// ===== App Entry Point =====
// Hedeflerim — DOMContentLoaded init, routing, tab switching, event delegation

// ===== Top-Level Init (runs immediately on script load) =====
window.loadData();
if (typeof lastPersistedPayload !== 'undefined') lastPersistedPayload = JSON.stringify(window.appData);
window.loadTrashBin();
window.loadWeeklyReviewStore();
window.loadProgressCardCollapseState();

// ===== Celebration modal close (runs on DOMContentLoaded) =====
document.addEventListener('DOMContentLoaded', () => {
    const closeCelebBtn = document.getElementById('closeCelebration');
    if (closeCelebBtn) {
        closeCelebBtn.addEventListener('click', () => {
            closeModal('celebrationModal');
        });
    }
});

// ===== Service Worker Registration =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => window.debugLog('SW registered'))
            .catch(err => window.debugWarn('SW registration failed:', err));
    });
}

// Uygulama açıldığında hatırlatıcıyı başlat (izin verildiyse)
if (window.appData.settings?.notificationsEnabled) {
    window.refreshReminderSchedule();
}

// ===== Mobile Keyboard Awareness =====
function initMobileKeyboardAwareness() {
    if (keyboardAwarenessInitialized) return;
    keyboardAwarenessInitialized = true;

    const vv = window.visualViewport;
    if (!vv) return;

    let baselineHeight = vv.height;
    const isTypingElement = () => {
        const el = document.activeElement;
        if (!el) return false;
        if (el.isContentEditable) return true;
        const tag = String(el.tagName || '').toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const updateKeyboardState = () => {
        const shrink = Math.max(0, baselineHeight - vv.height);
        const keyboardOpen = shrink > 120 && isTypingElement();
        document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
    };

    const handleViewportChange = () => {
        if (!isTypingElement()) {
            baselineHeight = Math.max(baselineHeight, vv.height);
        }
        updateKeyboardState();
    };

    vv.addEventListener('resize', handleViewportChange, { passive: true });
    vv.addEventListener('scroll', handleViewportChange, { passive: true });
    window.addEventListener('orientationchange', () => {
        baselineHeight = vv.height;
        updateKeyboardState();
    }, { passive: true });
    document.addEventListener('focusin', updateKeyboardState);
    document.addEventListener('focusout', () => {
        setTimeout(() => {
            baselineHeight = Math.max(baselineHeight, vv.height);
            updateKeyboardState();
        }, 80);
    });

    updateKeyboardState();
}

// ===== Tab Routing =====
function updateHeader(tabId) {
    const headerTitle = document.getElementById('headerTitle');
    const headerSubtitle = document.getElementById('headerSubtitle');

    const headers = {
        dashboard: { title: 'Bugün', subtitle: 'Günlük özet' },
        habits: { title: 'Alışkanlıklar', subtitle: 'Haftalık takip' },
        books: { title: 'Kitaplarım', subtitle: 'Okuma listesi' },
        todos: { title: 'Listelerim', subtitle: 'Yapılacaklar' },
        notes: { title: 'Notlar', subtitle: 'Günlük ve fikirler' },
        progress: { title: 'İlerleme', subtitle: 'Yıllık analiz' }
    };

    const header = headers[tabId] || headers.dashboard;
    headerTitle.textContent = window.decodeMojibakeText(header.title);
    headerSubtitle.textContent = window.decodeMojibakeText(header.subtitle);
}

function getActiveTabId() {
    return document.querySelector('.tab-btn.active')?.dataset.tab || 'dashboard';
}

function renderTabContent(tabId) {
    updateHeader(tabId);

    switch (tabId) {
        case 'habits':
            window.renderHabits();
            window.renderSummaryStats();
            window.renderDailyQuote();
            window.renderPersonalRecords();
            break;
        case 'books':
            window.renderBooks();
            break;
        case 'todos':
            window.renderTodos();
            break;
        case 'notes':
            window.renderNotes();
            break;
        case 'progress':
            if (document.getElementById('yearSelect')?.options.length === 0) {
                window.populateYearSelect();
            }
            window.renderProgress();
            break;
        default:
            window.renderDashboard();
            break;
    }

    window.scheduleUiTextRepair();
}

function renderActiveTab(extraTabs = []) {
    const tabs = new Set([getActiveTabId(), ...extraTabs]);
    tabs.forEach(tabId => window.renderTabContent(tabId));
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const content = document.getElementById(tabId) || document.getElementById(tabId + 'Tab');
    if (content) content.classList.add('active');

    const navBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (navBtn) navBtn.classList.add('active');

    renderTabContent(tabId);
}

window.getActiveTabId = getActiveTabId;
window.switchTab = switchTab;
window.renderActiveTab = renderActiveTab;
window.renderTabContent = renderTabContent;
window.updateWeekAndRender = updateWeekAndRender;

// ===== Beforeunload / Pagehide / Visibility Change =====
window.addEventListener('beforeunload', () => {
    window.flushPendingLocalSave();
    if (!window.weeklyPlannerPersistTimer) return;
    if (!window.captureWeeklyPlannerFromUi()) return;
    window.flushWeeklyPlannerAutosave({ pushToCloud: false });
});

window.addEventListener('pagehide', () => {
    window.flushPendingLocalSave();
    if (!window.captureWeeklyPlannerFromUi()) return;
    window.flushWeeklyPlannerAutosave({ pushToCloud: false });
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    flushPendingLocalSave();
});

// ===== Init Helper Functions =====

function _initCoreFeatures() {
    document.documentElement.classList.toggle('perf-mode', window.PERFORMANCE_MODE);
    window.loadTheme();
    window.FocusTimer.init();
    window.loadErrorLog();
    window.initGlobalErrorCapture();
}

function _initFocusOverlayControls() {
    var toggleBtn = document.getElementById('focusTimerToggleBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', function() { window.openFocusOverlay(); });
    var closeBtn = document.getElementById('focusOverlayCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', function() { window.closeFocusOverlay(); });
    var backdrop = document.getElementById('focusOverlayBackdrop');
    if (backdrop) backdrop.addEventListener('click', function() { window.closeFocusOverlay(); });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var overlay = document.getElementById('focusOverlay');
            if (overlay && overlay.classList.contains('active')) window.closeFocusOverlay();
        }
    });
    window.updateFocusTimerHeaderIndicator();
}

function _initConnectivityListeners() {
    window.addEventListener('online', function() {
        window.pushSyncEvent('net', 'Online');
        var syncStatus = document.getElementById('syncStatus');
        if (syncStatus && window.currentUser) {
            syncStatus.textContent = 'Bulut bağlantısı aktif';
            syncStatus.style.color = 'var(--success)';
        }
        if (window.currentUser && window.pendingCloudLoad) { window.pendingCloudLoad = false; window.loadFromCloud(); }
        if (window.currentUser && window.pendingCloudSave) { window.queueCloudSave(250); }
        if (document.getElementById('syncStatusModal')?.classList.contains('active')) window.renderSyncStatusModal();
    });
    window.addEventListener('offline', function() {
        window.pushSyncEvent('net', 'Offline');
        if (window.cloudSaveTimer) { clearTimeout(window.cloudSaveTimer); window.cloudSaveTimer = null; }
        var syncStatus = document.getElementById('syncStatus');
        if (syncStatus && window.currentUser) {
            syncStatus.textContent = 'Çevrimdışı (yerel kayıt aktif)';
            syncStatus.style.color = '#F59E0B';
        }
        if (document.getElementById('syncStatusModal')?.classList.contains('active')) window.renderSyncStatusModal();
    });
}

function _initSplashAndInitialRender() {
    setTimeout(function() {
        var splash = document.getElementById('splashScreen');
        if (splash) splash.classList.add('hidden');
    }, 1500);
    window.enforceProgressCardCollapsePolicy();
    window.populateYearSelect();
    var weekTitle = document.getElementById('weekTitle');
    if (weekTitle) weekTitle.textContent = window.getWeekTitle(window.currentWeekOffset);
    window.renderTabContent(getActiveTabId());
    window.initUiTextRepairObserver();
    window.addEventListener('resize', window.enforceProgressCardCollapsePolicy, { passive: true });
    window.initNotesControls();
    window.initNotesJumpFab();
    initMobileKeyboardAwareness();
}

function _initThemePicker() {
    var savedTheme = window.appData.settings?.theme || '';
    document.querySelectorAll('.theme-option').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.theme === savedTheme);
    });
    document.querySelectorAll('.theme-option').forEach(function(btn) {
        btn.addEventListener('click', function() {
            window.setTheme(btn.dataset.theme);
            window.showToast('Tema değiştirildi');
        });
    });
}

function _initTabNavigation() {
    var tabNav = document.querySelector('.tab-nav');
    if (tabNav) {
        tabNav.addEventListener('click', function(e) {
            var btn = e.target.closest('.tab-btn');
            if (!btn) return;
            var tabId = btn.dataset.tab;
            if (!tabId || tabId === getActiveTabId()) return;
            window.switchTab(tabId);
        });
    }
    var prevBtn = document.getElementById('prevWeek');
    if (prevBtn) prevBtn.addEventListener('click', function() { window.currentWeekOffset--; updateWeekAndRender(); });
    var nextBtn = document.getElementById('nextWeek');
    if (nextBtn) nextBtn.addEventListener('click', function() { window.currentWeekOffset++; updateWeekAndRender(); });
}

function updateWeekAndRender() {
    var weekTitle = document.getElementById('weekTitle');
    if (weekTitle) weekTitle.textContent = window.getWeekTitle(window.currentWeekOffset);
    window.renderTabContent('habits');
}

function _initHabitModalHandlers() {
    var addBtn = document.getElementById('addHabitBtn');
    if (addBtn) addBtn.addEventListener('click', window.openHabitCreateModal);
    var closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.addEventListener('click', function() { closeModal('habitModal'); });
    var cancelBtn = document.getElementById('cancelHabit');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { closeModal('habitModal'); });
    document.querySelectorAll('.modal-backdrop').forEach(function(backdrop) {
        backdrop.addEventListener('click', function() { backdrop.closest('.modal').classList.remove('active'); });
    });
    document.querySelectorAll('.color-option').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
        });
    });
    document.querySelectorAll('.template-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var data = btn.dataset;
            document.getElementById('habitName').value = data.name;
            document.getElementById('habitGoalValue').value = data.value;
            document.getElementById('habitGoalUnit').value = data.unit;
            document.getElementById('habitGoalFrequency').value = data.freq;
            document.querySelectorAll('.color-option').forEach(function(cb) {
                cb.classList.toggle('active', cb.dataset.color === data.color);
            });
            document.querySelectorAll('.template-btn').forEach(function(t) { t.classList.remove('selected'); });
            btn.classList.add('selected');
        });
    });
    var habitForm = document.getElementById('habitForm');
    if (habitForm) {
        habitForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var name = document.getElementById('habitName').value.trim();
            var color = document.querySelector('.color-option.active')?.dataset.color || '#3B82F6';
            var goalValue = document.getElementById('habitGoalValue').value;
            var goalUnit = document.getElementById('habitGoalUnit').value;
            var goalFrequency = document.getElementById('habitGoalFrequency').value;
            var category = document.getElementById('habitCategory').value;
            var goal = goalValue && goalUnit ? { value: parseInt(goalValue), unit: goalUnit, frequency: goalFrequency } : null;
            if (name) {
                if (window.editingHabitId) window.updateHabit(window.editingHabitId, name, color, goal, category);
                else window.createHabit(name, color, goal, category);
                closeModal('habitModal');
            }
        });
    }
}

function _initTodoSection() {
    var addTodo = function() {
        var input = document.getElementById('todoInput');
        var bucketSelect = document.getElementById('todoBucketSelect');
        var dueDateInput = document.getElementById('todoDueDate');
        var text = input?.value.trim();
        var bucket = window.normalizeTodoBucket(bucketSelect?.value || 'today');
        var dueDate = dueDateInput?.value || '';
        if (text) {
            window.currentTodoFilter = bucket;
            window.createTodo(text, bucket, dueDate);
            if (input) input.value = '';
            if (dueDateInput) dueDateInput.value = '';
        }
    };
    var addBtn = document.getElementById('addTodoBtn');
    if (addBtn) addBtn.addEventListener('click', addTodo);
    var todoInput = document.getElementById('todoInput');
    if (todoInput) todoInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') addTodo(); });
    document.querySelectorAll('[data-todo-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            window.currentTodoFilter = window.normalizeTodoBucket(btn.dataset.todoFilter || 'today');
            window.renderTabContent('todos');
        });
    });
}

function _initBookSection() {
    var addBook = function(title, author, totalPages, coverUrl) {
        if (!coverUrl) coverUrl = null;
        if (title) {
            window.createBook(title, author, totalPages, coverUrl);
            var searchInput = document.getElementById('bookSearchInput');
            if (searchInput) searchInput.value = '';
            var resultsDiv = document.getElementById('searchResults');
            if (resultsDiv) { resultsDiv.innerHTML = ''; resultsDiv.classList.remove('active'); }
            window.addXP(20);
        }
    };
    window.addBookFromSearch = function(title, author, pages, cover) { addBook(title, author, pages, cover); };
    var searchInput = document.getElementById('bookSearchInput');
    if (searchInput) {
        var debounceTimer;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(debounceTimer);
            var query = (e.target.value || '').trim();
            debounceTimer = setTimeout(function() { _searchBooksAPI(query); }, 500);
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); window.openManualBookModal(String(e.target.value || '').trim()); }
        });
    }
    var addBookBtn = document.getElementById('addBookBtn');
    if (addBookBtn) addBookBtn.addEventListener('click', function() {
        var val = document.getElementById('bookSearchInput')?.value?.trim() || '';
        window.openManualBookModal(val);
    });
    var cancelManualBtn = document.getElementById('cancelManualBookBtn');
    if (cancelManualBtn) cancelManualBtn.addEventListener('click', function() { window.closeModal('manualBookModal'); });
    var saveManualBtn = document.getElementById('saveManualBookBtn');
    if (saveManualBtn) saveManualBtn.addEventListener('click', function() { window.saveManualBookFromModal(); });
    var manualModal = document.getElementById('manualBookModal');
    if (manualModal) manualModal.addEventListener('keydown', function(e) {
        var target = e.target;
        if (!target) return;
        var tag = (target.tagName || '').toUpperCase();
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
        if (e.key !== 'Enter') return;
        e.preventDefault();
        window.saveManualBookFromModal();
    });
    document.querySelectorAll('.books-filter [data-filter]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.books-filter [data-filter]').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            window.currentBookFilter = btn.dataset.filter;
            window.renderTabContent('books');
        });
    });
    var yearSelect = document.getElementById('yearSelect');
    if (yearSelect) yearSelect.addEventListener('change', function() { window.renderTabContent('progress'); });
}

function _searchBooksAPI(query) {
    var resultsDiv = document.getElementById('searchResults');
    if (!resultsDiv) return;
    if (!query || query.length < 3) { resultsDiv.innerHTML = ''; resultsDiv.classList.remove('active'); return; }
    resultsDiv.innerHTML = `
        <div class="skeleton-book-item">
            <div class="skeleton-book-cover skeleton-shimmer"></div>
            <div class="skeleton-book-info">
                <div class="skeleton-book-title skeleton-shimmer"></div>
                <div class="skeleton-book-author skeleton-shimmer"></div>
                <div class="skeleton-book-pages skeleton-shimmer"></div>
            </div>
        </div>
        <div class="skeleton-book-item">
            <div class="skeleton-book-cover skeleton-shimmer"></div>
            <div class="skeleton-book-info">
                <div class="skeleton-book-title skeleton-shimmer"></div>
                <div class="skeleton-book-author skeleton-shimmer"></div>
                <div class="skeleton-book-pages skeleton-shimmer"></div>
            </div>
        </div>
        <div class="skeleton-book-item">
            <div class="skeleton-book-cover skeleton-shimmer"></div>
            <div class="skeleton-book-info">
                <div class="skeleton-book-title skeleton-shimmer"></div>
                <div class="skeleton-book-author skeleton-shimmer"></div>
                <div class="skeleton-book-pages skeleton-shimmer"></div>
            </div>
        </div>
    `;
    resultsDiv.classList.add('active');
    fetch('https://www.googleapis.com/books/v1/volumes?q=' + encodeURIComponent(query) + '&maxResults=5')
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (!data.items) { resultsDiv.innerHTML = ''; resultsDiv.classList.remove('active'); return; }
            resultsDiv.innerHTML = data.items.map(function(item) {
                var info = item.volumeInfo;
                var cover = window.sanitizeImageUrl(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail);
                var title = info.title || 'Bilinmeyen Kitap';
                var author = info.authors ? info.authors.join(', ') : 'Bilinmeyen Yazar';
                var pages = Math.max(0, Math.floor(Number(info.pageCount) || 0));
                var encodedTitle = window.escapeJsSingleQuote(title);
                var encodedAuthor = window.escapeJsSingleQuote(author);
                var encodedCover = window.escapeJsSingleQuote(cover);
                return '<div class="search-book-item" onclick="window.addBookFromSearch(window.decodeJsSingleQuote(\'' + encodedTitle + '\'), window.decodeJsSingleQuote(\'' + encodedAuthor + '\'), ' + pages + ', window.decodeJsSingleQuote(\'' + encodedCover + '\'))">' +
                    '<img src="' + cover + '" class="search-book-cover" alt="' + safeText(title) + '">' +
                    '<div class="search-book-info">' +
                    '<div class="search-book-title">' + safeText(title) + '</div>' +
                    '<div class="search-book-author">' + safeText(author) + '</div>' +
                    '<div class="search-book-pages">' + pages + ' sayfa</div>' +
                    '</div>' +
                    '<div class="search-book-add">+</div>' +
                    '</div>';
            }).join('');
            resultsDiv.classList.add('active');
        })
        .catch(function(err) { console.error('Book search error:', err); });
}

function _initGlobalSearch() {
    var searchBtn = document.getElementById('globalSearchBtn');
    if (searchBtn) searchBtn.addEventListener('click', window.openGlobalSearch);
    var searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.addEventListener('input', function(e) { window.renderGlobalSearchResults(e.target.value || ''); });
    var resultsEl = document.getElementById('globalSearchResults');
    if (resultsEl) resultsEl.addEventListener('click', function(e) {
        var btn = e.target.closest('.global-search-item');
        if (!btn) return;
        window.openSearchResult(btn.dataset.searchType, btn.dataset.searchId);
    });
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); window.openGlobalSearch(); }
        if (e.key === 'Escape') window.toggleQuickCaptureMenu(false);
    });
}

function _initQuickCapture() {
    var captureBtn = document.getElementById('quickCaptureBtn');
    if (captureBtn) captureBtn.addEventListener('click', function(e) { e.stopPropagation(); window.toggleQuickCaptureMenu(); });
    document.querySelectorAll('.quick-capture-item').forEach(function(item) {
        item.addEventListener('click', function() { window.runQuickCapture(item.dataset.capture); });
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#quickCaptureMenu') && !e.target.closest('#quickCaptureBtn')) window.toggleQuickCaptureMenu(false);
    });
}

function _initSettingsAndSync() {
    var settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', function() { openModal('settingsModal'); });
    var closeBtn = document.getElementById('closeSettings');
    if (closeBtn) closeBtn.addEventListener('click', function() { closeModal('settingsModal'); });
    var openSyncBtn = document.getElementById('openSyncStatusBtn');
    if (openSyncBtn) openSyncBtn.addEventListener('click', window.openSyncStatusModal);
    var closeSyncBtn = document.getElementById('closeSyncStatusBtn');
    if (closeSyncBtn) closeSyncBtn.addEventListener('click', window.closeSyncStatusModal);
    var copyBtn = document.getElementById('copyDebugReportBtn');
    if (copyBtn) copyBtn.addEventListener('click', async function() {
        try { await window.copyTextToClipboard(JSON.stringify(window.buildSyncDebugReport(), null, 2)); window.showToast('Rapor kopyalandı'); }
        catch (err) { window.showToast('Rapor kopyalanamadı'); window.logAppError(err, { kind: 'debug_report' }); }
    });
    var clearErrorBtn = document.getElementById('clearErrorLogBtn');
    if (clearErrorBtn) clearErrorBtn.addEventListener('click', function() { window.clearErrorLog(); window.renderSyncStatusModal(); window.showToast('Hatalar temizlendi'); });
    var forceSyncBtn = document.getElementById('forceSyncBtn');
    if (forceSyncBtn) forceSyncBtn.addEventListener('click', async function() {
        if (!window.currentUser) { window.showToast('Önce giriş yapmalısın'); return; }
        window.pushSyncEvent('action', 'Manuel senkron başlatıldı');
        window.renderSyncStatusModal();
        try { await window.loadFromCloud(); await window.saveToCloud(true); } finally { window.renderSyncStatusModal(); }
    });
}

function _initOnboarding() {
    var openBtn = document.getElementById('openOnboardingBtn');
    if (openBtn) openBtn.addEventListener('click', window.openOnboardingModal);
    var laterBtn = document.getElementById('onboardingLaterBtn');
    if (laterBtn) laterBtn.addEventListener('click', function() { window.closeOnboardingModal(true); });
    var skipBtn = document.getElementById('skipOnboardingBtn');
    if (skipBtn) skipBtn.addEventListener('click', function() { window.closeOnboardingModal(true); });
    var backdrop = document.querySelector('#onboardingModal .modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', function() { window.setOnboardingSeen(); });
    var startBtn = document.getElementById('startOnboardingBtn');
    if (startBtn) startBtn.addEventListener('click', function() {
        window.closeOnboardingModal(true);
        if (window.switchTab) window.switchTab('habits');
        setTimeout(function() { window.openHabitCreateModal(); }, 120);
    });
    setTimeout(function() { if (window.shouldShowOnboarding()) window.openOnboardingModal(); }, 1700);
}

function _initDashboardOrder() {
    var select = document.getElementById('dashboardOrderSelect');
    if (!select) return;
    select.value = window.appData.settings?.dashboardOrder || 'default';
    select.addEventListener('change', function() {
        if (!window.appData.settings) window.appData.settings = {};
        window.appData.settings.dashboardOrder = select.value;
        window.saveData();
        window.renderDashboard();
        window.showToast('Dashboard düzeni güncellendi');
    });
}

function _initTrash() {
    var openBtn = document.getElementById('openTrashBtn');
    if (openBtn) openBtn.addEventListener('click', window.openTrashModal);
    var emptyBtn = document.getElementById('emptyTrashBtn');
    if (emptyBtn) emptyBtn.addEventListener('click', function() {
        if (!window.trashBin.length) { window.showToast('Çöp kutusu zaten boş'); return; }
        if (confirm('Çöp kutusunu kalıcı olarak boşaltmak istiyor musun?')) { window.clearTrashBin(); window.renderTrashList(); window.showToast('Çöp kutusu temizlendi'); }
    });
}

function _initNotifications() {
    var enableBtn = document.getElementById('enableNotifications');
    if (enableBtn) enableBtn.addEventListener('click', async function() {
        var timeInput = document.getElementById('reminderTime');
        if (!timeInput) return;
        window.appData.settings.reminderTime = timeInput.value;
        var granted = await window.requestNotificationPermission();
        if (granted) {
            window.scheduleReminder();
            await window.ensurePushSubscription({ silent: true });
            enableBtn.textContent = 'Aktif';
        }
    });
    if (window.appData.settings?.reminderTime) {
        var reminderInput = document.getElementById('reminderTime');
        if (reminderInput) reminderInput.value = window.appData.settings.reminderTime;
    }
    if (window.appData.settings?.notificationsEnabled) {
        var notifBtn = document.getElementById('enableNotifications');
        if (notifBtn) notifBtn.textContent = 'Aktif';
        window.refreshReminderSchedule();
        if (window.currentUser && Notification.permission === 'granted') window.ensurePushSubscription({ silent: true });
    }
}

function _initSwipeToClose() {
    document.querySelectorAll('.modal-content').forEach(function(content) {
        var startY = 0;
        var currentY = 0;
        content.addEventListener('touchstart', function(e) {
            if (content.scrollTop === 0) startY = e.touches[0].clientY;
        }, { passive: true });
        content.addEventListener('touchmove', function(e) {
            if (startY && content.scrollTop === 0) {
                currentY = e.touches[0].clientY;
                var diff = currentY - startY;
                if (diff > 0) content.style.transform = 'translateY(' + diff + 'px)';
            }
        }, { passive: true });
        content.addEventListener('touchend', function() {
            var diff = currentY - startY;
            if (diff > 100) content.closest('.modal').classList.remove('active');
            content.style.transform = '';
            startY = 0;
            currentY = 0;
        });
    });
}

function _initEventDelegation() {
    document.addEventListener('click', function(e) {
        var cardToggle = e.target.closest('[data-progress-card-toggle]');
        if (cardToggle) {
            e.preventDefault();
            var card = cardToggle.closest('[data-progress-card]');
            var cardKey = cardToggle.dataset.progressCardToggle || card?.dataset.progressCard;
            if (!cardKey) return;
            var isExpanded = card?.classList.contains('is-expanded') === true;
            window.setProgressCardExpanded(cardKey, !isExpanded);
            return;
        }
        var focusAction = e.target.closest('[data-focus-action]');
        if (focusAction) {
            e.preventDefault();
            var action = focusAction.dataset.focusAction;
            if (action === 'start') window.FocusTimer.start();
            else if (action === 'pause') window.FocusTimer.pause();
            else if (action === 'resume') window.FocusTimer.resume();
            else if (action === 'next') window.FocusTimer.nextPhase();
            else if (action === 'continueEnd') window.FocusTimer.nextPhase();
            else if (action === 'breakEnd') window.FocusTimer.takeBreak();
            else if (action === 'stopNote') window.stopFocusWithNote();
            else if (action === 'stop') window.FocusTimer.stop();
            else if (action === 'history') {
                if (window.switchTab) window.switchTab('progress');
                setTimeout(function() {
                    var card = document.getElementById('focusWeeklySummaryCard');
                    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 120);
            }
            return;
        }
        var focusMode = e.target.closest('[data-focus-mode]');
        if (focusMode) { e.preventDefault(); window.FocusTimer.setMode(focusMode.dataset.focusMode); return; }
        var focusPreset = e.target.closest('[data-focus-preset]');
        if (focusPreset) { e.preventDefault(); window.FocusTimer.setPomodoroPreset(focusPreset.dataset.focusPreset); return; }
        var focusCountdown = e.target.closest('[data-focus-countdown]');
        if (focusCountdown) {
            e.preventDefault();
            window.FocusTimer.setCountdownSeconds(Math.max(0, Math.floor(Number(focusCountdown.dataset.focusCountdown) || 0)));
            return;
        }
        var focusGoalPreset = e.target.closest('[data-focus-goal-minutes]');
        if (focusGoalPreset) {
            e.preventDefault();
            window.setFocusWeeklyGoalMinutes(Math.max(0, Math.floor(Number(focusGoalPreset.dataset.focusGoalMinutes) || 0)));
            return;
        }
        var fillBtn = e.target.closest('#fillWeeklyWinsBtn');
        if (fillBtn) { window.fillWeeklyWinsSuggestionFromUi(); return; }
        var annualGoalBtn = e.target.closest('#saveAnnualGoalBtn');
        if (annualGoalBtn) {
            var value = document.getElementById('annualGoalValueInput')?.value;
            var unit = document.getElementById('annualGoalUnitInput')?.value;
            window.updateAnnualGoalSettings(value, unit);
            window.showToast('Yıllık hedef kaydedildi');
            window.renderTabContent('progress');
            return;
        }
        if (e.target && e.target.id === 'saveWeeklyPlannerBtn') window.saveWeeklyPlannerFromUi();
    });
}

function _initInputDelegation() {
    document.addEventListener('input', function(e) {
        var target = e.target;
        if (!target) return;
        if (window.isWeeklyPlannerField(target.id)) { window.queueWeeklyPlannerAutosave(); }
        if (target.id === 'focusLabelInput') window.FocusTimer.setLabel(target.value || '');
        if (target.id === 'focusGoalHoursInput') {
            var raw = String(target.value || '').trim().replace(',', '.');
            var hours = Number(raw);
            var minutes = Number.isFinite(hours) ? Math.round(hours * 60) : 0;
            window.setFocusWeeklyGoalMinutes(minutes, { persist: false, silent: true, refreshProgress: false });
            window.queuePersistFocusWeeklyGoal();
        }
    });
    document.addEventListener('change', function(e) {
        var target = e.target;
        if (!target) return;
        if (window.isWeeklyPlannerField(target.id) && window.captureWeeklyPlannerFromUi()) window.flushWeeklyPlannerAutosave();
        if (target.id === 'focusAutoAdvanceToggle') window.FocusTimer.setAutoAdvance(Boolean(target.checked));
        if (target.id === 'focusLinkSelect') window.FocusTimer.setLinkRef(target.value || '');
        if (target.id === 'focusSoundToggle') {
            if (!window.appData.settings) window.appData.settings = {};
            window.appData.settings.focusSoundEnabled = Boolean(target.checked);
            if (window.appData.settings.focusSoundEnabled) window.unlockFocusAudio();
            else if (window.FocusTimer.stopAlarm) window.FocusTimer.stopAlarm();
            window.saveData();
            window.showToast(window.appData.settings.focusSoundEnabled ? 'Sesli uyarı açıldı' : 'Sesli uyarı kapatıldı');
        }
        if (target.id === 'focusCountdownMinutes') window.FocusTimer.setCountdownSeconds(Math.max(0, Math.floor(Number(target.value) || 0)) * 60);
        if (target.id === 'focusGoalHoursInput') {
            if (window.focusGoalPersistTimer) { clearTimeout(window.focusGoalPersistTimer); window.focusGoalPersistTimer = null; }
            var raw = String(target.value || '').trim().replace(',', '.');
            window.setFocusWeeklyGoalMinutes(Number.isFinite(Number(raw)) ? Math.round(Number(raw) * 60) : 0, { persist: true, silent: true });
        }
    });
}

function _initExportImport() {
    var exportBtn = document.getElementById('exportData');
    if (exportBtn) exportBtn.addEventListener('click', function() {
        var dataStr = JSON.stringify(window.appData, null, 2);
        var blob = new Blob([dataStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'habit-tracker-backup-' + window.formatDate(new Date()) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        window.showToast('Veriler dışa aktarıldı');
    });
    var importEl = document.getElementById('importData');
    if (importEl) importEl.addEventListener('change', function(e) {
        var file = e.target.files?.[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(event) {
            try {
                var imported = JSON.parse(event.target.result);
                if (!imported || typeof imported !== 'object') throw new Error('invalid import');
                if (Array.isArray(imported.habits) && Array.isArray(imported.todos)) {
                    window.appData = window.normalizeAppData(imported);
                    window.syncWeeklyReviewStoreFromAppData();
                    window.loadTheme();
                    window.refreshReminderSchedule();
                    window.saveData(false, { immediate: true });
                    window.renderActiveTab();
                    window.showToast('Veriler içe aktarıldı');
                } else window.showToast('Geçersiz dosya formatı');
            } catch (err) { window.showToast('Dosya okunamadı'); }
        };
        reader.readAsText(file);
    });
}

function _initAuthButtons() {
    var loginBtn = document.getElementById('googleLoginBtn');
    if (loginBtn) loginBtn.addEventListener('click', window.loginWithGoogle);
    var logoutBtn = document.getElementById('googleLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', window.logout);
}

function _initClearData() {
    var clearBtn = document.getElementById('clearData');
    if (clearBtn) clearBtn.addEventListener('click', function() {
        if (confirm('Tüm veriler silinecek. Emin misiniz?')) {
            window.appData = window.normalizeAppData(window.defaultData);
            window.clearTrashBin();
            window.weeklyReviewStore = {};
            window.persistWeeklyReviewStore({ pushToCloud: false });
            window.loadTheme();
            window.refreshReminderSchedule();
            window.saveData(false, { immediate: true });
            renderActiveTab();
            closeModal('settingsModal');
            window.showToast('Tüm veriler silindi');
        }
    });
}

// ===== DOMContentLoaded Init =====
document.addEventListener('DOMContentLoaded', () => {
    _initCoreFeatures();
    _initFocusOverlayControls();
    _initConnectivityListeners();
    _initSplashAndInitialRender();
    _initThemePicker();
    _initTabNavigation();
    _initHabitModalHandlers();
    _initTodoSection();
    _initBookSection();
    _initGlobalSearch();
    _initQuickCapture();
    _initSettingsAndSync();
    _initOnboarding();
    _initDashboardOrder();
    _initTrash();
    _initNotifications();
    _initSwipeToClose();
    _initEventDelegation();
    _initInputDelegation();
    _initExportImport();
    _initAuthButtons();
    _initClearData();
});
