// ===== Notes Component =====
// Hedeflerim — Not CRUD, sesli giris, filtre
// Extracted from app-v5.js

// ===== Notes State =====
let currentNoteFilter = 'all';
window.currentNoteFilter = currentNoteFilter;
let currentNoteSort = 'newest';
window.currentNoteSort = currentNoteSort;
let currentNoteDateFilter = 'all';
window.currentNoteDateFilter = currentNoteDateFilter;
let noteSearchQuery = '';
window.noteSearchQuery = noteSearchQuery;
let noteCustomStartDate = '';
window.noteCustomStartDate = noteCustomStartDate;
let noteCustomEndDate = '';
window.noteCustomEndDate = noteCustomEndDate;
let notesControlsInitialized = false;
let editingNoteId = null;
let recognition = null;
let isRecording = false;
let notesRenderLimit = window.NOTES_PAGE_SIZE;
let notesFilterSignature = '';
let notesLastFilteredCount = 0;
let notesJumpFabInitialized = false;
let notesJumpFabRaf = null;

function getNotesFilterSignature() {
    return [
        currentNoteFilter,
        currentNoteSort,
        currentNoteDateFilter,
        noteSearchQuery,
        noteCustomStartDate,
        noteCustomEndDate
    ].join('|');
}

function updateNotesJumpFab() {
    const btn = document.getElementById('notesJumpBtn');
    if (!btn) return;
    if (window.getActiveTabId() !== 'notes') {
        btn.classList.add('hidden');
        return;
    }

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll < 260) {
        btn.classList.add('hidden');
        return;
    }

    btn.classList.remove('hidden');
    const current = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    const dir = current > (maxScroll * 0.55) ? 'top' : 'bottom';
    btn.dataset.dir = dir;
    const label = dir === 'top' ? 'En basa git' : 'En sona git';
    btn.setAttribute('aria-label', label);
    btn.title = label;
}

function initNotesJumpFab() {
    if (notesJumpFabInitialized) return;
    notesJumpFabInitialized = true;

    const btn = document.getElementById('notesJumpBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (window.getActiveTabId() !== 'notes') return;
        const dir = btn.dataset.dir === 'top' ? 'top' : 'bottom';
        if (dir === 'bottom' && notesLastFilteredCount > 0 && notesRenderLimit < notesLastFilteredCount) {
            const target = Math.min(notesLastFilteredCount, NOTES_JUMP_AUTOLOAD_CAP);
            if (notesRenderLimit < target) {
                notesRenderLimit = target;
                renderNotes();
            }
        }

        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const targetTop = dir === 'top' ? 0 : maxScroll;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });

    const schedule = () => {
        if (notesJumpFabRaf) return;
        notesJumpFabRaf = requestAnimationFrame(() => {
            notesJumpFabRaf = null;
            updateNotesJumpFab();
        });
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
}

function getNoteDateObject(note) {
    const value = note?.updatedAt || note?.createdAt || '';
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
    return null;
}

function getNoteTimestamp(note) {
    return getNoteDateObject(note)?.getTime() || 0;
}

function noteMatchesDateFilter(noteDate) {
    if (currentNoteDateFilter === 'all') return true;
    if (!(noteDate instanceof Date) || !Number.isFinite(noteDate.getTime())) return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    if (currentNoteDateFilter === 'today') {
        return noteDate >= todayStart && noteDate < tomorrowStart;
    }

    if (currentNoteDateFilter === '7d') {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 6);
        return noteDate >= start && noteDate < tomorrowStart;
    }

    if (currentNoteDateFilter === '30d') {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 29);
        return noteDate >= start && noteDate < tomorrowStart;
    }

    if (currentNoteDateFilter === 'custom') {
        let start = noteCustomStartDate ? new Date(noteCustomStartDate + 'T00:00:00') : null;
        let end = noteCustomEndDate ? new Date(noteCustomEndDate + 'T23:59:59.999') : null;
        const hasValidStart = !!(start && Number.isFinite(start.getTime()));
        const hasValidEnd = !!(end && Number.isFinite(end.getTime()));

        if (hasValidStart && hasValidEnd && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        if (hasValidStart && noteDate < start) return false;
        if (hasValidEnd && noteDate > end) return false;
        return true;
    }

    return true;
}

function noteMatchesSearch(note) {
    const query = window.normalizeSearchText(window.noteSearchQuery);
    if (!query) return true;

    const categoryLabel = window.NOTE_CATEGORY_LABELS[note.category] || 'Genel';
    const haystack = window.normalizeSearchText((note.title || '') + ' ' + (note.content || '') + ' ' + categoryLabel);
    return haystack.includes(query);
}

function getFilteredNotes(allNotes) {
    return (allNotes || []).filter(note => {
        if (!note || typeof note !== 'object') return false;
        const isArchived = Boolean(note.archived);
        const isPinned = Boolean(note.pinned);

        if (currentNoteFilter === 'archived') {
            if (!isArchived) return false;
        } else {
            if (isArchived) return false;
            if (currentNoteFilter === 'pinned') {
                if (!isPinned) return false;
            } else if (currentNoteFilter !== 'all' && note.category !== currentNoteFilter) {
                return false;
            }
        }

        if (!noteMatchesSearch(note)) {
            return false;
        }

        const noteDate = getNoteDateObject(note);
        if (!noteMatchesDateFilter(noteDate)) {
            return false;
        }

        return true;
    });
}

function syncNotesControlsUI(shownCount, filteredCount, totalCount) {
    const searchInput = document.getElementById('notesSearchInput');
    const sortSelect = document.getElementById('notesSortSelect');
    const dateSelect = document.getElementById('notesDateFilterSelect');
    const dateStartInput = document.getElementById('notesDateStart');
    const dateEndInput = document.getElementById('notesDateEnd');
    const customRange = document.getElementById('notesCustomDateRange');
    const resultMeta = document.getElementById('notesResultMeta');

    if (searchInput && searchInput.value !== noteSearchQuery) searchInput.value = noteSearchQuery;
    if (sortSelect && sortSelect.value !== currentNoteSort) sortSelect.value = currentNoteSort;
    if (dateSelect && dateSelect.value !== currentNoteDateFilter) dateSelect.value = currentNoteDateFilter;
    if (dateStartInput && dateStartInput.value !== noteCustomStartDate) dateStartInput.value = noteCustomStartDate;
    if (dateEndInput && dateEndInput.value !== noteCustomEndDate) dateEndInput.value = noteCustomEndDate;
    if (customRange) customRange.classList.toggle('hidden', currentNoteDateFilter !== 'custom');

    if (resultMeta) {
        const parts = [];
        if (noteSearchQuery) parts.push('arama aktif');
        if (currentNoteDateFilter !== 'all') parts.push('tarih filtresi aktif');
        if (currentNoteFilter !== 'all') parts.push('kategori filtresi aktif');
        const suffix = parts.length > 0 ? ' (' + parts.join(', ') + ')' : '';
        const base = shownCount + '/' + Math.max(shownCount, filteredCount) + ' not gosteriliyor';
        const extra = filteredCount !== totalCount ? ' (toplam ' + totalCount + ')' : '';
        resultMeta.textContent = base + extra + suffix;
    }
}

function renderNotes() {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;

    notesGrid.innerHTML = '';
    const allNotes = Array.isArray(window.appData.notes) ? window.appData.notes : [];
    const notesToRender = getFilteredNotes(allNotes);

    const sig = getNotesFilterSignature();
    if (sig !== notesFilterSignature) {
        notesFilterSignature = sig;
        notesRenderLimit = window.NOTES_PAGE_SIZE;
    }

    notesToRender.sort((a, b) => {
        const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
        if (pinDiff !== 0) return pinDiff;
        const aTime = getNoteTimestamp(a);
        const bTime = getNoteTimestamp(b);
        return window.currentNoteSort === 'oldest' ? aTime - bTime : bTime - aTime;
    });

    const shownNotes = notesToRender.slice(0, Math.max(window.NOTES_PAGE_SIZE, notesRenderLimit));
    notesLastFilteredCount = notesToRender.length;
    syncNotesControlsUI(shownNotes.length, notesToRender.length, allNotes.length);

    if (notesToRender.length === 0) {
        const emptyReason = (window.noteSearchQuery || window.currentNoteDateFilter !== 'all' || window.currentNoteFilter !== 'all')
            ? 'Arama veya filtreleri degistirerek tekrar dene.'
            : 'Henuz not eklenmedi. Sag alttaki + ile ilk notunu olustur.';
        notesGrid.innerHTML = `
             <div class="empty-state">
                 <div class="animated-empty-icon">
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-svg-note"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                 </div>
                 <h3>Not bulunamadi</h3>
                 <p>${window.escapeHtml(emptyReason)}</p>
             </div>
         `;
    } else {
        const fragment = document.createDocumentFragment();
        shownNotes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card ' + (note.archived ? 'note-archived' : '');
            card.onclick = () => openNoteModal(note);

            if (note.color && note.color !== '#ffffff') {
                card.style.background = window.sanitizeColor(note.color, '#ffffff');
            }

            const safeNoteId = window.escapeJsSingleQuote(note.id || '');
            const catLabel = window.NOTE_CATEGORY_LABELS[note.category] || 'Genel';
            const safeTitle = safeText(note.title, '(Basliksiz)');
            const safeContent = safeText(note.content);
            const safeCategory = safeText(catLabel);
            const noteDate = getNoteDateObject(note);
            const safeDate = noteDate ? noteDate.toLocaleDateString('tr-TR') : 'Tarih yok';
            const pinClass = note.pinned ? 'note-action-btn active' : 'note-action-btn';
            const archiveClass = note.archived ? 'note-action-btn active' : 'note-action-btn';

            card.innerHTML = `
                <div class="note-card-header">
                    <div class="note-title">${safeTitle}</div>
                    <div class="note-card-actions">
                        <button class="${pinClass}" onclick="event.stopPropagation(); window.toggleNotePinned(window.decodeJsSingleQuote('${safeNoteId}'));" title="Sabitle">\uD83D\uDCCC</button>
                        <button class="${archiveClass}" onclick="event.stopPropagation(); window.toggleNoteArchived(window.decodeJsSingleQuote('${safeNoteId}'));" title="Arsiv">\uD83D\uDCC4</button>
                    </div>
                </div>
                <div class="note-preview">${safeContent}</div>
                <div style="flex:1"></div>
                <div style="display:flex; justify-content:space-between; align-items:flex-end; width:100%;">
                    <div class="note-category-tag">${safeCategory}</div>
                    <div class="note-date">${safeDate}</div>
                </div>
            `;
            fragment.appendChild(card);
        });
        notesGrid.appendChild(fragment);

        if (shownNotes.length < notesToRender.length) {
            const loadWrap = document.createElement('div');
            loadWrap.className = 'notes-load-more';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary';
            btn.textContent = 'Daha fazla goster';
            btn.addEventListener('click', () => {
                notesRenderLimit = Math.min(notesToRender.length, Math.max(window.NOTES_PAGE_SIZE, notesRenderLimit) + window.NOTES_PAGE_SIZE);
                renderNotes();
                updateNotesJumpFab();
            });

            const meta = document.createElement('div');
            meta.className = 'notes-load-more-meta';
            meta.textContent = shownNotes.length + '/' + notesToRender.length + ' gosteriliyor';

            loadWrap.appendChild(btn);
            loadWrap.appendChild(meta);
            notesGrid.appendChild(loadWrap);
        }
    }

    document.querySelectorAll('#notesFilterContainer .filter-chip').forEach(chip => {
        const chipFilter = chip.dataset.noteFilter || '';
        chip.classList.toggle('active', chipFilter === currentNoteFilter);
    });

    updateTodayJournalPreview();
    updateNotesJumpFab();
}

function filterNotes(category) {
    currentNoteFilter = typeof category === 'string' && category ? category : 'all';
    window.currentNoteFilter = currentNoteFilter;
    renderNotes();
}

function resetNoteFilters() {
    currentNoteFilter = 'all';
    window.currentNoteFilter = currentNoteFilter;
    currentNoteSort = 'newest';
    window.currentNoteSort = currentNoteSort;
    currentNoteDateFilter = 'all';
    window.currentNoteDateFilter = currentNoteDateFilter;
    noteSearchQuery = '';
    window.noteSearchQuery = noteSearchQuery;
    noteCustomStartDate = '';
    window.noteCustomStartDate = noteCustomStartDate;
    noteCustomEndDate = '';
    window.noteCustomEndDate = noteCustomEndDate;
    renderNotes();
}

function toggleNotePinned(noteId) {
    const note = (window.appData.notes || []).find(n => n.id === noteId);
    if (!note) return;
    note.pinned = !Boolean(note.pinned);
    note.updatedAt = new Date().toISOString();
    window.saveData();
    renderNotes();
}

function toggleNoteArchived(noteId) {
    const note = (window.appData.notes || []).find(n => n.id === noteId);
    if (!note) return;
    note.archived = !Boolean(note.archived);
    if (note.archived) {
        note.pinned = false;
    }
    note.updatedAt = new Date().toISOString();
    window.saveData();
    renderNotes();
}

function initNotesControls() {
    if (notesControlsInitialized) return;
    notesControlsInitialized = true;

    document.querySelectorAll('#notesFilterContainer .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            filterNotes(chip.dataset.noteFilter || 'all');
        });
    });

    const notesSearchInput = document.getElementById('notesSearchInput');
    if (notesSearchInput) {
        let debounceTimer = null;
        notesSearchInput.addEventListener('input', () => {
            noteSearchQuery = notesSearchInput.value || '';
            window.noteSearchQuery = noteSearchQuery;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                renderNotes();
                updateNotesJumpFab();
            }, 180);
        });
        notesSearchInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            noteSearchQuery = notesSearchInput.value || '';
            window.noteSearchQuery = noteSearchQuery;
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            renderNotes();
            updateNotesJumpFab();
        });
    }

    const notesSortSelect = document.getElementById('notesSortSelect');
    if (notesSortSelect) {
        notesSortSelect.addEventListener('change', () => {
            currentNoteSort = notesSortSelect.value === 'oldest' ? 'oldest' : 'newest';
            window.currentNoteSort = currentNoteSort;
            renderNotes();
            updateNotesJumpFab();
        });
    }

    const notesDateFilterSelect = document.getElementById('notesDateFilterSelect');
    if (notesDateFilterSelect) {
        notesDateFilterSelect.addEventListener('change', () => {
            const allowed = new Set(['all', 'today', '7d', '30d', 'custom']);
            currentNoteDateFilter = allowed.has(notesDateFilterSelect.value) ? notesDateFilterSelect.value : 'all';
            window.currentNoteDateFilter = currentNoteDateFilter;
            renderNotes();
            updateNotesJumpFab();
        });
    }

    const notesDateStart = document.getElementById('notesDateStart');
    if (notesDateStart) {
        notesDateStart.addEventListener('change', () => {
            noteCustomStartDate = notesDateStart.value || '';
            window.noteCustomStartDate = noteCustomStartDate;
            if (currentNoteDateFilter !== 'custom') {
                currentNoteDateFilter = 'custom';
                window.currentNoteDateFilter = currentNoteDateFilter;
            }
            renderNotes();
            updateNotesJumpFab();
        });
    }

    const notesDateEnd = document.getElementById('notesDateEnd');
    if (notesDateEnd) {
        notesDateEnd.addEventListener('change', () => {
            noteCustomEndDate = notesDateEnd.value || '';
            window.noteCustomEndDate = noteCustomEndDate;
            if (currentNoteDateFilter !== 'custom') {
                currentNoteDateFilter = 'custom';
                window.currentNoteDateFilter = currentNoteDateFilter;
            }
            renderNotes();
            updateNotesJumpFab();
        });
    }

    const notesResetFilters = document.getElementById('notesResetFilters');
    if (notesResetFilters) {
        notesResetFilters.addEventListener('click', resetNoteFilters);
    }
}

function updateTodayJournalPreview() {
    const today = new Date().toLocaleDateString('tr-TR');
    const todayJournal = (window.appData.notes || []).find(n =>
        n.category === 'journal' && !n.archived && new Date(n.createdAt).toLocaleDateString('tr-TR') === today
    );

    const previewEl = document.getElementById('todayJournalPreview');
    if (previewEl) {
        if (todayJournal) {
            previewEl.textContent = todayJournal.title || todayJournal.content.substring(0, 30) + '...';
        } else {
            previewEl.textContent = 'Henuz yazilmadi...';
        }
    }
}

function openTodayJournal() {
    const today = new Date().toLocaleDateString('tr-TR');
    const todayJournal = (window.appData.notes || []).find(n =>
        n.category === 'journal' && !n.archived && new Date(n.createdAt).toLocaleDateString('tr-TR') === today
    );

    if (todayJournal) {
        window.openNoteModal(todayJournal);
    } else {
        window.openNoteModal(null, 'journal');
    }
}

function openNoteModal(note = null, preSelectedCategory = 'general', prefill = null) {
    editingNoteId = note ? note.id : null;

    const modalTitle = document.getElementById('noteModalTitle');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const categoryInput = document.getElementById('noteCategory');
    const deleteBtn = document.getElementById('deleteNoteBtn');

    if (note) {
        modalTitle.textContent = 'Notu Duzenle';
        titleInput.value = note.title || '';
        contentInput.value = note.content || '';
        categoryInput.value = note.category || 'general';
        selectNoteColor(null, note.color || '#ffffff');
        deleteBtn.classList.remove('hidden');
    } else {
        const prefillObj = prefill && typeof prefill === 'object' ? prefill : {};
        modalTitle.textContent = 'Yeni Not';
        titleInput.value = window.truncateText(typeof prefillObj.title === 'string' ? prefillObj.title : '', 240);
        contentInput.value = window.truncateText(typeof prefillObj.content === 'string' ? prefillObj.content : '', 50000);
        categoryInput.value = typeof prefillObj.category === 'string' && prefillObj.category ? prefillObj.category : preSelectedCategory;
        selectNoteColor(null, '#ffffff');
        deleteBtn.classList.add('hidden');
    }

    openModal('noteModal');
}

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const category = document.getElementById('noteCategory').value;

    const colorOption = document.querySelector('.color-option.active') || document.querySelector('.color-option[data-color="#ffffff"]');
    const color = colorOption ? colorOption.dataset.color : '#ffffff';

    if (!content) {
        window.showToast('Lutfen bir seyler yazin');
        return;
    }

    if (!window.appData.notes) window.appData.notes = [];

    if (editingNoteId) {
        const index = window.appData.notes.findIndex(n => n.id === editingNoteId);
        if (index !== -1) {
            window.appData.notes[index] = {
                ...window.appData.notes[index],
                title,
                content,
                category,
                color,
                updatedAt: new Date().toISOString()
            };
            window.showToast('Not guncellendi');
        }
    } else {
        const newNote = {
            id: window.generateId(),
            title,
            content,
            category,
            color,
            pinned: false,
            archived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        window.appData.notes.push(newNote);
        window.showToast('Not kaydedildi');
        window.addXP(5);
    }

    window.saveData();
    window.renderActiveTab();
    window.closeModal('noteModal');
}

function confirmDeleteNote() {
    if (confirm('Bu notu silmek istedigine emin misin?')) {
        window.softDeleteItem('note', editingNoteId, { itemLabel: 'Not' });
        window.closeModal('noteModal');
    }
}

function selectNoteColor(element, color) {
    document.querySelectorAll('.color-option').forEach(el => {
        el.classList.remove('active');
        el.style.border = '3px solid transparent';
        if (el.dataset.color === '#ffffff') el.style.border = '1px solid #ddd';
    });

    let target = element;
    if (!target) {
        target = document.querySelector('.color-option[data-color="' + color + '"]');
    }

    if (target) {
        target.classList.add('active');
        target.style.borderColor = 'var(--text-primary)';
    }
}

function toggleVoiceInput() {
    if (isRecording) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Sesli not ozelligi bu tarayicida desteklenmiyor. Chrome veya Android kullanin.');
        return;
    }

    const btn = document.getElementById('startVoiceBtn');
    const btnText = document.getElementById('voiceBtnText');
    const textarea = document.getElementById('noteContent');

    recognition = new webkitSpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = function () {
        isRecording = true;
        btn.classList.add('recording');
        btnText.textContent = 'Dinliyorum... (Durdurmak icin bas)';
    };

    recognition.onerror = function () {
        stopVoiceRecognition();
        window.showToast('Ses algilanamadi');
    };

    recognition.onend = function () {
        if (isRecording) {
            stopVoiceRecognition();
        }
    };

    let lastProcessedResultIndex = -1;

    recognition.onresult = function (event) {
        let finalTranscripts = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal && i > lastProcessedResultIndex) {
                finalTranscripts += event.results[i][0].transcript;
                lastProcessedResultIndex = i;
            }
        }

        if (finalTranscripts) {
            const currentVal = textarea.value;
            textarea.value = currentVal + (currentVal ? ' ' : '') + finalTranscripts;
        }
    };

    recognition.start();
}

function stopVoiceRecognition() {
    isRecording = false;
    if (recognition) {
        recognition.stop();
    }

    const btn = document.getElementById('startVoiceBtn');
    const btnText = document.getElementById('voiceBtnText');

    if (btn) btn.classList.remove('recording');
    if (btnText) btnText.textContent = 'Konusarak Yaz';
}

window.openTodayJournal = openTodayJournal;
window.openNoteModal = openNoteModal;
window.saveNote = saveNote;
window.confirmDeleteNote = confirmDeleteNote;
window.selectNoteColor = selectNoteColor;
window.toggleVoiceInput = toggleVoiceInput;
window.renderNotes = renderNotes;
window.filterNotes = filterNotes;
window.resetNoteFilters = resetNoteFilters;
window.toggleNotePinned = toggleNotePinned;
window.toggleNoteArchived = toggleNoteArchived;
window.initNotesControls = initNotesControls;
window.initNotesJumpFab = initNotesJumpFab;
window.stopVoiceRecognition = stopVoiceRecognition;
window.startVoiceRecognition = startVoiceRecognition;
window.updateTodayJournalPreview = updateTodayJournalPreview;
