// ===== Book Component =====
// Hedeflerim — Kitap CRUD, sayfa takibi, Google Books API
// Extracted from app-v5.js

// ===== Book Helper Functions =====

function getBookTodayReadPages(book, date = new Date()) {
    const key = window.formatDate(date);
    const log = window.normalizeBookDailyReadLog(book?.dailyReadLog);
    return Math.max(0, Math.floor(Number(log[key]) || 0));
}

function getBookDailyDeviation(book, date = new Date()) {
    const goal = Math.max(0, Math.floor(Number(book?.dailyGoalPages) || 0));
    const todayRead = getBookTodayReadPages(book, date);
    const diff = todayRead - goal;
    return {
        goal,
        todayRead,
        diff,
        absDiff: Math.abs(diff),
        isBehind: goal > 0 && diff < 0,
        isAhead: goal > 0 && diff > 0,
        isOnTrack: goal > 0 && diff === 0
    };
}

function isBookCompleted(book) {
    return window.normalizeBookStatus(book) === 'completed';
}

function createBook(title, author, totalPages = 0, coverUrl = null) {
    if (!window.appData.books) window.appData.books = [];
    const nowIso = new Date().toISOString();
    const book = {
        id: window.generateId(),
        title,
        author: author || '',
        coverUrl: window.sanitizeImageUrl(coverUrl),
        totalPages: totalPages || 0,
        currentPage: 0,
        dailyGoalPages: 0,
        dailyReadLog: {},
        status: 'pending',
        createdAt: nowIso,
        updatedAt: nowIso
    };
    window.appData.books.push(book);
    window.saveData();
    window.renderActiveTab();
    window.showToast('Kitap eklendi');
}

function openManualBookModal(prefillTitle = '') {
    const modal = document.getElementById('manualBookModal');
    if (!modal) return;

    const titleEl = document.getElementById('manualBookTitle');
    const authorEl = document.getElementById('manualBookAuthor');
    const pagesEl = document.getElementById('manualBookTotalPages');

    if (titleEl) titleEl.value = window.truncateText(String(prefillTitle || '').trim(), 240);
    if (authorEl) authorEl.value = '';
    if (pagesEl) pagesEl.value = '';

    openModal('manualBookModal');
    setTimeout(() => titleEl?.focus(), 0);
}

function saveManualBookFromModal() {
    const titleEl = document.getElementById('manualBookTitle');
    const authorEl = document.getElementById('manualBookAuthor');
    const pagesEl = document.getElementById('manualBookTotalPages');

    const title = window.truncateText(String(titleEl?.value || '').trim(), 240);
    const author = window.truncateText(String(authorEl?.value || '').trim(), 160);
    const pages = Math.max(0, Math.min(500000, Math.floor(Number(pagesEl?.value) || 0)));

    if (!title) {
        window.showToast('Kitap adi gerekli');
        titleEl?.focus();
        return;
    }

    createBook(title, author, pages, null);

    const searchInput = document.getElementById('bookSearchInput');
    const resultsDiv = document.getElementById('searchResults');
    if (searchInput) searchInput.value = '';
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.classList.remove('active');
    }

    window.addXP(20);
    window.closeModal('manualBookModal');
}

function updateBookPages(id, currentPage) {
    const book = window.appData.books?.find(b => b.id === id);
    if (book) {
        const nowIso = new Date().toISOString();
        const prevPage = Math.max(0, Math.floor(Number(book.currentPage) || 0));
        const maxPage = Math.max(0, Math.floor(Number(book.totalPages) || 0));
        let nextPage = Math.max(0, Math.floor(parseInt(currentPage, 10) || 0));
        if (maxPage > 0) nextPage = Math.min(nextPage, maxPage);
        const delta = nextPage - prevPage;
        book.currentPage = nextPage;
        book.dailyReadLog = window.normalizeBookDailyReadLog(book.dailyReadLog);

        if (delta !== 0) {
            const todayKey = window.formatDate(new Date());
            const currentToday = Math.max(0, Math.floor(Number(book.dailyReadLog[todayKey]) || 0));
            const nextToday = Math.max(0, currentToday + delta);
            if (nextToday > 0) book.dailyReadLog[todayKey] = nextToday;
            else delete book.dailyReadLog[todayKey];
            book.dailyReadLog = window.normalizeBookDailyReadLog(book.dailyReadLog);
        }

        if (book.totalPages > 0 && book.currentPage >= book.totalPages) {
            book.status = 'completed';
            book.completed = true;
            window.showToast('Kitap tamamlandi!');
        } else if (book.currentPage > 0) {
            book.status = 'reading';
            book.completed = false;
        } else {
            book.status = 'pending';
            book.completed = false;
        }
        book.updatedAt = nowIso;
        window.saveData();
        window.renderActiveTab();
    }
}

function updateBookDailyGoal(id, goalPages) {
    const book = window.appData.books?.find(b => b.id === id);
    if (!book) return;
    const nextGoal = Math.max(0, Math.min(5000, Math.floor(Number(goalPages) || 0)));
    const prevGoal = Math.max(0, Math.floor(Number(book.dailyGoalPages) || 0));
    book.dailyGoalPages = nextGoal;
    book.updatedAt = new Date().toISOString();
    window.saveData();
    renderBooks();
    if (nextGoal !== prevGoal) {
        if (nextGoal > 0) window.showToast('Gunluk okuma hedefi: ' + nextGoal + ' sayfa');
        else window.showToast('Gunluk okuma hedefi kaldirildi');
    }
}

function updateBookStatus(id, status) {
    const book = window.appData.books?.find(b => b.id === id);
    if (book) {
        const nowIso = new Date().toISOString();
        book.status = status === 'completed' ? 'completed' : 'reading';
        book.completed = book.status === 'completed';
        if (book.completed && book.totalPages > 0) {
            book.currentPage = Math.max(book.currentPage, book.totalPages);
        }
        book.updatedAt = nowIso;
        window.saveData();
        window.renderActiveTab();
    }
}

function deleteBook(id) {
    window.softDeleteItem('book', id, { itemLabel: 'Kitap' });
}

function renderBooks() {
    const container = document.getElementById('booksContainer');
    const stats = document.getElementById('bookStats');

    if (!window.appData.books) window.appData.books = [];

    let filteredBooks = window.appData.books;
    if (window.currentBookFilter === 'reading') {
        filteredBooks = window.appData.books.filter(b => !isBookCompleted(b));
    } else if (window.currentBookFilter === 'completed') {
        filteredBooks = window.appData.books.filter(b => isBookCompleted(b));
    }

    const completedCount = window.appData.books.filter(b => isBookCompleted(b)).length;
    stats.textContent = completedCount + '/' + window.appData.books.length + ' okundu';

    if (filteredBooks.length === 0) {
        const emptyMsg = window.currentBookFilter === 'all'
            ? 'Henuz kitap eklenmedi'
            : window.currentBookFilter === 'reading'
                ? 'Su an okudugun kitap yok'
                : 'Henuz bitirilen kitap yok';
        container.innerHTML = `
            <div class="empty-state">
                <div class="animated-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-svg-book"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                </div>
                <h3>${emptyMsg}</h3>
                <p>Yukaridan yeni kitap ekleyebilirsin</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredBooks.map(book => {
        const hasPages = book.totalPages > 0;
        const currentPage = book.currentPage || 0;
        const progress = hasPages ? Math.min((currentPage / book.totalPages) * 100, 100) : 0;
        const remaining = hasPages ? book.totalPages - currentPage : 0;
        const dailyGoal = Math.max(0, Math.floor(Number(book.dailyGoalPages) || 0));
        const dailyDeviation = getBookDailyDeviation(book);
        const dailyGoalStateClass = dailyGoal <= 0
            ? 'neutral'
            : dailyDeviation.isBehind
                ? 'warn'
                : dailyDeviation.isAhead
                    ? 'good'
                    : 'ok';
        const dailyGoalText = dailyGoal <= 0
            ? 'Gunluk hedef yok. Istersen sayfa hedefi belirle.'
            : dailyDeviation.isBehind
                ? 'Bugun hedefin ' + dailyDeviation.absDiff + ' sayfa gerisindesin.'
                : dailyDeviation.isAhead
                    ? 'Bugun hedefin ' + dailyDeviation.absDiff + ' sayfa ustundesin.'
                    : 'Bugun hedefi tutturdun.';
        const safeBookId = window.escapeJsSingleQuote(book.id || '');
        const safeBookDataId = safeText(book.id);
        const safeBookTitle = safeText(book.title);
        const safeBookAuthor = safeText(book.author);
        const safeStatus = window.normalizeBookStatus(book);

        const avgPagesPerDay = 50;
        const daysRemaining = hasPages ? Math.ceil(remaining / avgPagesPerDay) : 0;
        const estimateHtml = hasPages && remaining > 0 ? `
            <div class="book-estimate">~${daysRemaining} gunde bitir</div>
        ` : '';

        const progressHtml = hasPages ? `
            <div class="book-progress">
                <div class="book-progress-bar">
                    <div class="book-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="book-progress-text">
                    <input type="number" class="book-page-input" value="${currentPage}" 
                           onchange="window.updateBookPages(window.decodeJsSingleQuote('${safeBookId}'), this.value)" 
                           onclick="event.stopPropagation()" min="0" max="${book.totalPages}">
                    <span>/ ${book.totalPages} sayfa</span>
                </div>
                ${estimateHtml}
            </div>
        ` : '';

        const goalHtml = `
            <div class="book-daily-goal-card">
                <div class="book-daily-goal-head">
                    <span class="book-daily-goal-title">Gunluk hedef</span>
                    <div class="book-daily-goal-inputwrap">
                        <input type="number" class="book-daily-goal-input" value="${dailyGoal > 0 ? dailyGoal : ''}"
                               min="0" max="5000" step="1" placeholder="20"
                               onchange="window.updateBookDailyGoal(window.decodeJsSingleQuote('${safeBookId}'), this.value)"
                               onclick="event.stopPropagation()">
                        <span>sayfa</span>
                    </div>
                </div>
                <div class="book-daily-goal-meta ${dailyGoalStateClass}">
                    <strong>Bugun: ${dailyDeviation.todayRead}</strong>
                    <span>${safeText(dailyGoalText)}</span>
                </div>
            </div>
        `;

        const safeCoverUrl = book.coverUrl && book.coverUrl !== 'https://via.placeholder.com/40x60?text=No+Cover' ? window.escapeHtml(book.coverUrl) : '';
        const coverHtml = safeCoverUrl
            ? '<img src="' + safeCoverUrl + '" class="book-cover-img" alt="Kapak" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
              '<span class="book-icon book-icon-fallback" style="display:none">' + (safeStatus === 'completed' ? '\uD83D\uDCD7' : safeStatus === 'reading' ? '\uD83D\uDCD6' : '\uD83D\uDCD8') + '</span>'
            : '<span class="book-icon">' + (safeStatus === 'completed' ? '\uD83D\uDCD7' : safeStatus === 'reading' ? '\uD83D\uDCD6' : '\uD83D\uDCD8') + '</span>';

        return `
        <div class="book-card" data-id="${safeBookDataId}">
            <div class="book-info">
                ${coverHtml}
                <div class="book-details">
                    <div class="book-title">${safeBookTitle}</div>
                    ${book.author ? '<div class="book-author-text">' + safeBookAuthor + '</div>' : ''}
                </div>
                <button class="book-delete" onclick="window.deleteBook(window.decodeJsSingleQuote('${safeBookId}'))" aria-label="Sil">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            ${progressHtml}
            ${goalHtml}
            <div class="book-status">
                <button class="book-status-btn ${safeStatus === 'reading' ? 'active' : ''}" onclick="window.updateBookStatus(window.decodeJsSingleQuote('${safeBookId}'), 'reading')">
                    Okuyorum
                </button>
                <button class="book-status-btn ${safeStatus === 'completed' ? 'active' : ''}" onclick="window.updateBookStatus(window.decodeJsSingleQuote('${safeBookId}'), 'completed')">
                    Okudum
                </button>
            </div>
        </div>
    `}).join('');
}

window.getBookTodayReadPages = getBookTodayReadPages;
window.getBookDailyDeviation = getBookDailyDeviation;
window.isBookCompleted = isBookCompleted;
window.createBook = createBook;
window.openManualBookModal = openManualBookModal;
window.saveManualBookFromModal = saveManualBookFromModal;
window.updateBookPages = updateBookPages;
window.updateBookDailyGoal = updateBookDailyGoal;
window.updateBookStatus = updateBookStatus;
window.deleteBook = deleteBook;
window.renderBooks = renderBooks;
