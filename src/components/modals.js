// ===== Modal / Toast / Trash / Onboarding / Search / Quick Capture =====
// Hedeflerim — Extracted from app-v5.js
// GR-SP01: Functions broken into single-responsibility sub-functions where possible.

// ----- Toast System -----
// showToast uses globals: toastHideTimer, toastActionHandler, scheduleUiTextRepair, decodeMojibakeText

function showToast(message, options = {}) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const actionBtn = document.getElementById('toastActionBtn');
    if (!toast || !toastMessage) return;

    if (toastHideTimer) {
        clearTimeout(toastHideTimer);
        toastHideTimer = null;
    }
    toast.classList.remove('show');

    toastMessage.textContent = window.decodeMojibakeText(message);
    toastActionHandler = null;

    const actionLabel = typeof options.actionLabel === 'string' ? options.actionLabel.trim() : '';
    const onAction = typeof options.onAction === 'function' ? options.onAction : null;
    if (actionBtn) {
        if (actionLabel && onAction) {
            toastActionHandler = onAction;
            actionBtn.textContent = window.decodeMojibakeText(actionLabel);
            actionBtn.classList.remove('hidden');
            actionBtn.onclick = () => {
                const action = toastActionHandler;
                toastActionHandler = null;
                actionBtn.classList.add('hidden');
                if (action) action();
                toast.classList.remove('show');
            };
        } else {
            actionBtn.classList.add('hidden');
            actionBtn.onclick = null;
        }
    }

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    scheduleUiTextRepair();
    const duration = Number.isFinite(Number(options.duration)) ? Math.max(1200, Number(options.duration)) : 3200;
    toastHideTimer = setTimeout(() => {
        toast.classList.remove('show');
        if (actionBtn) {
            actionBtn.classList.add('hidden');
            actionBtn.onclick = null;
        }
        toastActionHandler = null;
        toastHideTimer = null;
    }, duration);
}

// ----- Modal System -----

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
    // Specific logic for note modal cleanup
    if (modalId === 'noteModal') {
        window.stopVoiceRecognition();
    }
    if (modalId === 'globalSearchModal') {
        const input = document.getElementById('globalSearchInput');
        if (input) input.value = '';
        renderGlobalSearchResults('');
    }
    if (modalId === 'onboardingModal') {
        window.setOnboardingSeen();
    }
}

// ----- Trash Modal -----

function renderTrashList() {
    const trashList = document.getElementById('trashList');
    if (!trashList) return;
    window.pruneTrashBin();

    if (!window.trashBin.length) {
        trashList.innerHTML = '<div class="trash-empty">Çöp kutun boş. Silinen kayıtlar burada görünür.</div>';
        return;
    }

    trashList.innerHTML = window.trashBin.map(entry => {
        const title = window.escapeHtml(entry.label || window.getEntityTypeLabel(entry.type));
        const typeLabel = window.escapeHtml(window.getEntityTypeLabel(entry.type));
        const dateLabel = new Date(entry.deletedAt || Date.now()).toLocaleString('tr-TR');
        const safeTrashId = window.escapeJsSingleQuote(entry.trashId || '');
        return `
            <div class="trash-item">
                <div class="trash-item-title">${title}</div>
                <div class="trash-item-meta">${typeLabel} • Silinme: ${dateLabel}</div>
                <div class="trash-item-actions">
                    <button class="trash-action-btn" onclick="window.restoreTrashEntryAction(window.decodeJsSingleQuote('${safeTrashId}'))">Geri Yükle</button>
                    <button class="trash-action-btn danger" onclick="window.deleteTrashEntryAction(window.decodeJsSingleQuote('${safeTrashId}'))">Kalıcı Sil</button>
                </div>
            </div>
        `;
    }).join('');
}

function openTrashModal() {
    closeModal('settingsModal');
    renderTrashList();
    openModal('trashModal');
}

function restoreTrashEntryAction(trashId) {
    const restored = window.restoreTrashEntryById(trashId);
    if (restored) {
        showToast('Kayıt geri yüklendi');
        renderTrashList();
    }
}
window.restoreTrashEntryAction = restoreTrashEntryAction;

function deleteTrashEntryAction(trashId) {
    const deleted = window.permanentlyDeleteTrashEntry(trashId);
    if (deleted) {
        showToast('Çöp kaydı kalıcı silindi');
        renderTrashList();
    }
}
window.deleteTrashEntryAction = deleteTrashEntryAction;

// ----- Onboarding Modal -----

function openOnboardingModal() {
    closeModal('settingsModal');
    openModal('onboardingModal');
}

function closeOnboardingModal(markSeen = true) {
    closeModal('onboardingModal');
    if (markSeen) setOnboardingSeen();
}

// ----- Celebration Modal -----

function showCelebrationModal(habitName, goalValue) {
    const modal = document.getElementById('celebrationModal');
    const message = document.getElementById('celebrationMessage');
    if (!modal || !message) return;

    const safeHabitName = safeText(habitName);
    const safeGoalValue = Number.isFinite(Number(goalValue)) ? Number(goalValue) : 0;
    message.innerHTML = `<strong>${safeHabitName}</strong> için haftalık hedefine ulaştın!<br>(${safeGoalValue}/${safeGoalValue} tamamlandı)`;
    openModal('celebrationModal');
    window.triggerConfetti();
}

// ----- Global Search -----

function buildGlobalSearchResults(query) {
    const normalizedQuery = window.normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const results = [];

    (window.appData.habits || []).forEach(habit => {
        if (window.normalizeSearchText(habit.name).includes(normalizedQuery)) {
            results.push({
                type: 'habit',
                id: habit.id,
                meta: 'Alışkanlık',
                title: habit.name || 'Alışkanlık',
                subtitle: habit.goal ? `${habit.goal.value} ${habit.goal.unit} / ${habit.goal.frequency === 'weekly' ? 'hafta' : 'gün'}` : 'Hedef tanımsız'
            });
        }
    });

    (window.appData.todos || []).forEach(todo => {
        if (window.normalizeSearchText(todo.text).includes(normalizedQuery)) {
            results.push({
                type: 'todo',
                id: todo.id,
                meta: 'Görev',
                title: todo.text || 'Görev',
                subtitle: todo.completed ? 'Tamamlandı' : 'Bekliyor'
            });
        }
    });

    (window.appData.books || []).forEach(book => {
        const bookText = `${book.title || ''} ${book.author || ''}`;
        if (window.normalizeSearchText(bookText).includes(normalizedQuery)) {
            results.push({
                type: 'book',
                id: book.id,
                meta: 'Kitap',
                title: book.title || 'Kitap',
                subtitle: book.author || 'Yazar bilgisi yok'
            });
        }
    });

    (window.appData.notes || []).forEach(note => {
        const noteText = `${note.title || ''} ${note.content || ''} ${window.NOTE_CATEGORY_LABELS[note.category] || ''}`;
        if (window.normalizeSearchText(noteText).includes(normalizedQuery)) {
            results.push({
                type: 'note',
                id: note.id,
                meta: note.archived ? 'Not • Arşiv' : 'Not',
                title: note.title || '(Başlıksız)',
                subtitle: (note.content || '').slice(0, 96)
            });
        }
    });

    return results.slice(0, 50);
}

function renderGlobalSearchResults(query) {
    const container = document.getElementById('globalSearchResults');
    if (!container) return;

    const trimmed = (query || '').trim();
    if (!trimmed) {
        container.innerHTML = '<div class="global-search-empty">Yazmaya başla, tüm içerikte arayayım.</div>';
        return;
    }

    const results = buildGlobalSearchResults(trimmed);
    if (results.length === 0) {
        container.innerHTML = '<div class="global-search-empty">Sonuç bulunamadı.</div>';
        return;
    }

    container.innerHTML = results.map(item => `
        <button class="global-search-item" data-search-type="${safeText(item.type)}" data-search-id="${safeText(item.id)}">
            <div class="global-search-meta">${safeText(item.meta)}</div>
            <div class="global-search-title">${safeText(item.title)}</div>
            <div class="global-search-sub">${safeText(item.subtitle)}</div>
        </button>
    `).join('');
}

function openSearchResult(type, id) {
    closeModal('globalSearchModal');
    if (type === 'habit') {
        window.switchTab?.('habits');
        setTimeout(() => window.openEditHabit(id), 80);
        return;
    }
    if (type === 'todo') {
        window.switchTab?.('todos');
        return;
    }
    if (type === 'book') {
        window.switchTab?.('books');
        return;
    }
    if (type === 'note') {
        const note = (window.appData.notes || []).find(n => n.id === id);
        window.switchTab?.('notes');
        if (note) {
            setTimeout(() => window.openNoteModal(note), 80);
        }
    }
}

function openGlobalSearch() {
    const modal = document.getElementById('globalSearchModal');
    const input = document.getElementById('globalSearchInput');
    toggleQuickCaptureMenu(false);
    renderGlobalSearchResults('');
    openModal('globalSearchModal');
    setTimeout(() => input?.focus(), 100);
}
window.openGlobalSearch = openGlobalSearch;

// ----- Quick Capture Menu -----

function toggleQuickCaptureMenu(forceOpen = null) {
    const menu = document.getElementById('quickCaptureMenu');
    if (!menu) return;
    quickCaptureOpen = forceOpen == null ? !quickCaptureOpen : Boolean(forceOpen);
    menu.classList.toggle('hidden', !quickCaptureOpen);
}

function runQuickCapture(action) {
    toggleQuickCaptureMenu(false);

    if (action === 'habit') {
        window.switchTab?.('habits');
        setTimeout(() => window.openHabitCreateModal(), 90);
        return;
    }
    if (action === 'todo') {
        window.switchTab?.('todos');
        setTimeout(() => document.getElementById('todoInput')?.focus(), 90);
        return;
    }
    if (action === 'note') {
        window.switchTab?.('notes');
        setTimeout(() => window.openNoteModal(), 90);
        return;
    }
    if (action === 'mood') {
        window.switchTab?.('dashboard');
        setTimeout(() => {
            const moodBtn = document.querySelector('#moodTracker .mood-btn:nth-child(4)');
            if (moodBtn) moodBtn.focus();
        }, 120);
    }
}

// ===== Mojibake / UI Text Repair =====

function repairMojibakeInNode(rootNode) {
    if (!rootNode) return;

    const textWalker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null);
    let textNode;
    while ((textNode = textWalker.nextNode())) {
        const original = textNode.nodeValue;
        const fixed = window.decodeMojibakeText(original);
        if (fixed !== original) {
            textNode.nodeValue = fixed;
        }
    }

    if (rootNode.nodeType === Node.ELEMENT_NODE) {
        const rootElement = rootNode;
        const attributesToFix = ['placeholder', 'title', 'aria-label'];
        attributesToFix.forEach(attr => {
            if (rootElement.hasAttribute(attr)) {
                const original = rootElement.getAttribute(attr);
                const fixed = window.decodeMojibakeText(original);
                if (fixed !== original) rootElement.setAttribute(attr, fixed);
            }
        });
    }

    rootNode.querySelectorAll?.('[placeholder], [title], [aria-label]').forEach(el => {
        ['placeholder', 'title', 'aria-label'].forEach(attr => {
            const original = el.getAttribute(attr);
            if (!original) return;
            const fixed = window.decodeMojibakeText(original);
            if (fixed !== original) {
                el.setAttribute(attr, fixed);
            }
        });
    });
}

function repairVisibleUiText() {
    repairMojibakeInNode(document.querySelector('.app-header'));
    repairMojibakeInNode(document.querySelector('.tab-nav'));
    repairMojibakeInNode(document.querySelector('.tab-content.active'));
    repairMojibakeInNode(document.getElementById('toast'));
}

function scheduleUiTextRepair() {
    const now = Date.now();
    if (now - uiTextRepairLastRunAt < 220) return;
    if (uiTextRepairScheduled) return;

    uiTextRepairScheduled = true;
    const runRepair = () => {
        uiTextRepairScheduled = false;
        uiTextRepairLastRunAt = Date.now();
        repairVisibleUiText();
    };

    if (window.PERFORMANCE_MODE && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(runRepair, { timeout: 180 });
    } else {
        requestAnimationFrame(runRepair);
    }
}

function initUiTextRepairObserver() {
    if (!document.body || window.uiTextRepairObserver) return;

    window.uiTextRepairObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'characterData') {
                const original = mutation.target.nodeValue;
                const fixed = window.decodeMojibakeText(original);
                if (fixed !== original) {
                    mutation.target.nodeValue = fixed;
                }
                continue;
            }

            if (mutation.type === 'attributes') {
                const target = mutation.target;
                const attr = mutation.attributeName;
                const original = target.getAttribute(attr);
                if (!original) continue;
                const fixed = window.decodeMojibakeText(original);
                if (fixed !== original) {
                    target.setAttribute(attr, fixed);
                }
                continue;
            }

            mutation.addedNodes.forEach(node => {
                repairMojibakeInNode(node);
            });
        }
    });

    window.uiTextRepairObserver.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: false,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label']
    });
}

// Export all functions globally for module scripts
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.renderTrashList = renderTrashList;
window.openTrashModal = openTrashModal;
window.restoreTrashEntryAction = restoreTrashEntryAction;
window.deleteTrashEntryAction = deleteTrashEntryAction;
window.openOnboardingModal = openOnboardingModal;
window.closeOnboardingModal = closeOnboardingModal;
window.showCelebrationModal = showCelebrationModal;
window.openGlobalSearch = openGlobalSearch;
window.toggleQuickCaptureMenu = toggleQuickCaptureMenu;
window.runQuickCapture = runQuickCapture;
window.scheduleUiTextRepair = scheduleUiTextRepair;
window.initUiTextRepairObserver = initUiTextRepairObserver;
