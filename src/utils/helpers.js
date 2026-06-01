// ===== Helper Functions =====
// Hedeflerim — Yardımcı Fonksiyonlar (app-v5.js'den çıkarılmıştır)

// ----- Debug -----

function debugLog(...args) {
    if (window.DEBUG_MODE) console.log(...args);
}

function debugWarn(...args) {
    if (window.DEBUG_MODE) console.warn(...args);
}

// ----- Formatting -----

function formatTime(date) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatLocalDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatFocusDuration(totalSec) {
    const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours <= 0) return `${minutes} dk`;
    if (minutes <= 0) return `${hours} sa`;
    return `${hours} sa ${minutes} dk`;
}

function formatFocusClock(totalSec, options = {}) {
    const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
    const showHours = options.showHours === true || sec >= 3600;
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    if (!showHours) return `${mm}:${ss}`;
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function formatShortDateTime(value) {
    const ts = Date.parse(value || '');
    if (!Number.isFinite(ts)) return '-';
    return new Date(ts).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatMinutesAsClock(totalMinutes) {
    const minutes = Math.max(0, Math.min((23 * 60) + 59, Math.floor(Number(totalMinutes) || 0)));
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function parseClockToMinutes(timeValue, fallbackMinutes = 20 * 60) {
    const normalized = normalizeReminderTime(timeValue || '');
    const [h, m] = normalized.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return fallbackMinutes;
    return (h * 60) + m;
}

// ----- Sanitization & Validation -----

function safeText(value, fallback = '') {
    return escapeHtml(value || fallback);
}

function escapeHtml(value) {
    const input = value == null ? '' : String(value);
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeJsSingleQuote(value) {
    return encodeURIComponent(value == null ? '' : String(value));
}

function decodeJsSingleQuote(value) {
    try {
        return decodeURIComponent(value || '');
    } catch {
        return '';
    }
}

function sanitizeColor(color, fallback = '#8B5CF6') {
    const value = typeof color === 'string' ? color.trim() : '';
    if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
    if (/^#[0-9a-fA-F]{3}$/.test(value)) return value;
    return fallback;
}

function truncateText(value, maxLength) {
    const text = value == null ? '' : String(value);
    if (!Number.isFinite(maxLength) || maxLength <= 0) return '';
    return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizeImageUrl(url, fallback = 'https://via.placeholder.com/40x60?text=No+Cover') {
    const value = typeof url === 'string' ? url.trim() : '';
    if (/^https?:\/\//i.test(value) && value.length <= 2048) return value;
    return fallback;
}

function normalizeReminderTime(timeValue) {
    const raw = typeof timeValue === 'string' ? timeValue.trim() : '';
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(raw)) return raw;
    return '20:00';
}

function normalizeDateValue(value, fallback = new Date().toISOString()) {
    // null / undefined / empty
    if (value == null || value === '') return fallback;

    // Number (timestamp)
    if (typeof value === 'number' && Number.isFinite(value)) {
        const d = new Date(value);
        return Number.isFinite(d.getTime()) ? d.toISOString() : fallback;
    }

    // Date object
    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return value.toISOString();
    }

    // Firestore Timestamp-like object
    if (value && typeof value.toDate === 'function') {
        const date = value.toDate();
        if (date instanceof Date && Number.isFinite(date.getTime())) {
            return date.toISOString();
        }
    }

    // String — trim and validate
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        const d = new Date(trimmed);
        return Number.isFinite(d.getTime()) ? d.toISOString() : fallback;
    }

    return fallback;
}

function normalizeFocusLinkRef(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';
    const match = raw.match(/^(habit|todo):([A-Za-z0-9_-]{1,120})$/);
    if (!match) return '';
    return `${match[1]}:${match[2]}`;
}

function parseFocusLinkRef(value) {
    const normalized = normalizeFocusLinkRef(value);
    if (!normalized) return { type: '', id: '' };
    const [type, id] = normalized.split(':');
    return { type, id };
}

function isNetworkOnline() {
    return navigator.onLine !== false;
}

// ----- ID Generation -----

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ----- Timestamp & Date Helpers -----

function parseTimestamp(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
}

function getFirestoreTimestampMs(value) {
    if (!value) return 0;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
    if (value && typeof value.toDate === 'function') {
        const d = value.toDate();
        if (d instanceof Date && Number.isFinite(d.getTime())) return d.getTime();
    }
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
}

function getIsoWeekKey(date = new Date()) {
    const target = new Date(date);
    const day = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - day + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
    const diffMs = target - firstThursday;
    const week = 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ----- Search -----

function normalizeSearchText(value) {
    return (value || '').toString().toLocaleLowerCase('tr-TR').trim();
}

// ----- Mojibake Decoding -----

function countMojibakeSignals(text) {
    if (typeof text !== 'string' || text.length === 0) return 0;
    const matches = text.match(window.MOJIBAKE_SIGNAL_REGEX);
    return matches ? matches.length : 0;
}

function looksLikeMojibake(text) {
    if (typeof text !== 'string' || text.length === 0) return false;
    return countMojibakeSignals(text) > 0;
}

function _decodeChar(ch, bytes) {
    const code = ch.charCodeAt(0);
    if (code <= 0x7F || (code >= 0xA0 && code <= 0xFF)) {
        bytes.push(code);
        return true;
    }
    if (window.SINGLE_BYTE_REVERSE_MAP.has(code)) {
        bytes.push(window.SINGLE_BYTE_REVERSE_MAP.get(code));
        return true;
    }
    return false;
}

function decodeMojibakeText(input) {
    if (typeof input !== 'string' || input.length === 0) return input;
    if (!looksLikeMojibake(input)) return input;

    let output = input;
    for (let pass = 0; pass < 4; pass++) {
        if (!looksLikeMojibake(output)) break;

        const beforeSignalCount = countMojibakeSignals(output);
        const bytes = [];

        const isSingleByteCompatible = Array.from(output).every(ch => _decodeChar(ch, bytes));
        if (!isSingleByteCompatible) break;

        let decoded;
        try {
            decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
        } catch (error) {
            break;
        }

        if (decoded === output) break;
        if (countMojibakeSignals(decoded) > beforeSignalCount) break;
        output = decoded;
    }

    return output;
}

// ----- Math -----

function clampPercent(value, min = 0, max = 100) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, Math.round(num)));
}

// ----- Data Normalization (Entity-level, Pure) -----

function normalizeWeeklyReviewEntry(entry) {
    const source = entry && typeof entry === 'object' ? entry : {};
    const updatedMs = Date.parse(source.updatedAt || '');
    return {
        focus: truncateText(typeof source.focus === 'string' ? source.focus : '', 4000),
        wins: truncateText(typeof source.wins === 'string' ? source.wins : '', 6000),
        blockers: truncateText(typeof source.blockers === 'string' ? source.blockers : '', 4000),
        nextWeekFocus: truncateText(typeof source.nextWeekFocus === 'string' ? source.nextWeekFocus : '', 4000),
        goalTarget: Math.max(0, Math.floor(Number(source.goalTarget) || 0)),
        goalActual: Math.max(0, Math.floor(Number(source.goalActual) || 0)),
        updatedAt: Number.isFinite(updatedMs) ? new Date(updatedMs).toISOString() : ''
    };
}

function normalizeWeeklyReviewMap(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const normalized = {};
    Object.entries(source).forEach(([rawWeekKey, rawEntry]) => {
        const weekKey = typeof rawWeekKey === 'string' ? rawWeekKey.trim() : '';
        if (!/^\d{4}-W\d{2}$/.test(weekKey)) return;
        const entry = normalizeWeeklyReviewEntry(rawEntry);
        if (!entry.focus && !entry.wins && !entry.blockers && !entry.nextWeekFocus && !entry.goalTarget && !entry.goalActual && !entry.updatedAt) return;
        normalized[weekKey] = entry;
    });
    return normalized;
}

function normalizeTodoBucket(value) {
    if (value === 'week' || value === 'someday') return value;
    return 'today';
}

function getTodoBucketLabel(bucket) {
    if (bucket === 'week') return 'Bu Hafta';
    if (bucket === 'someday') return 'Bir Ara';
    return 'Bugün';
}

function normalizeDueDate(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return '';
}

function getNextTodoBucket(bucket) {
    if (bucket === 'today') return 'week';
    if (bucket === 'week') return 'someday';
    return 'today';
}

function normalizeBookStatus(book) {
    if (!book || typeof book !== 'object') return 'pending';
    if (book.status === 'completed') return 'completed';
    if (book.status === 'reading') return 'reading';
    if (book.completed === true) return 'completed';
    if ((Number(book.currentPage) || 0) > 0) return 'reading';
    return 'pending';
}

function normalizeBookDailyReadLog(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const normalized = {};
    const thresholdMs = Date.now() - (180 * 24 * 60 * 60 * 1000);
    Object.entries(source).forEach(([dateKey, pagesValue]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
        const dateMs = Date.parse(`${dateKey}T00:00:00`);
        if (!Number.isFinite(dateMs) || dateMs < thresholdMs) return;
        const pages = Math.max(0, Math.floor(Number(pagesValue) || 0));
        if (pages <= 0) return;
        normalized[dateKey] = pages;
    });
    return normalized;
}

// Export all functions globally for module scripts
window.debugLog = debugLog;
window.debugWarn = debugWarn;
window.formatTime = formatTime;
window.formatDate = formatDate;
window.formatLocalDateKey = formatLocalDateKey;
window.formatFocusDuration = formatFocusDuration;
window.formatFocusClock = formatFocusClock;
window.formatShortDateTime = formatShortDateTime;
window.formatMinutesAsClock = formatMinutesAsClock;
window.parseClockToMinutes = parseClockToMinutes;
window.safeText = safeText;
window.escapeHtml = escapeHtml;
window.escapeJsSingleQuote = escapeJsSingleQuote;
window.decodeJsSingleQuote = decodeJsSingleQuote;
window.sanitizeColor = sanitizeColor;
window.truncateText = truncateText;
window.sanitizeImageUrl = sanitizeImageUrl;
window.normalizeReminderTime = normalizeReminderTime;
window.normalizeDateValue = normalizeDateValue;
window.normalizeFocusLinkRef = normalizeFocusLinkRef;
window.parseFocusLinkRef = parseFocusLinkRef;
window.isNetworkOnline = isNetworkOnline;
window.generateId = generateId;
window.parseTimestamp = parseTimestamp;
window.getFirestoreTimestampMs = getFirestoreTimestampMs;
window.getIsoWeekKey = getIsoWeekKey;
window.normalizeSearchText = normalizeSearchText;
window.countMojibakeSignals = countMojibakeSignals;
window.looksLikeMojibake = looksLikeMojibake;
window.decodeMojibakeText = decodeMojibakeText;
window.clampPercent = clampPercent;
window.normalizeWeeklyReviewEntry = normalizeWeeklyReviewEntry;
window.normalizeWeeklyReviewMap = normalizeWeeklyReviewMap;
window.normalizeTodoBucket = normalizeTodoBucket;
window.getTodoBucketLabel = getTodoBucketLabel;
window.normalizeDueDate = normalizeDueDate;
window.getNextTodoBucket = getNextTodoBucket;
window.normalizeBookStatus = normalizeBookStatus;
window.normalizeBookDailyReadLog = normalizeBookDailyReadLog;
