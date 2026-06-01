// ===== Constants =====
// Hedeflerim — Uygulama Sabitleri (app-v5.js'den çıkarılmıştır)

// Storage Keys
const STORAGE_KEY = 'habitTrackerData';
const TRASH_STORAGE_KEY = 'habitTrackerTrashV1';
const WEEKLY_REVIEW_STORAGE_KEY = 'habitTrackerWeeklyReviewV1';
const PROGRESS_CARD_COLLAPSE_STORAGE_KEY = 'habitTrackerProgressCardCollapseV1';
const ONBOARDING_STORAGE_KEY = 'habitTrackerOnboardingDoneV1';
const FOCUS_TIMER_STATE_STORAGE_KEY = 'habitTrackerFocusTimerStateV1';
const FOCUS_TIMER_PREFS_STORAGE_KEY = 'habitTrackerFocusTimerPrefsV1';
const ERROR_LOG_STORAGE_KEY = 'habitTrackerErrorLogV1';
const PUSH_DEVICE_ID_STORAGE_KEY = 'habitTrackerPushDeviceIdV1';

const TRASH_RETENTION_DAYS = 30;
const APP_VERSION = '5.3.0';

// Debounce / Sync Constants
const LOCAL_SAVE_DEBOUNCE_MS = 250;
const CLOUD_SAVE_DEBOUNCE_MS = 1200;
const CLOUD_SCHEMA_VERSION = 2;
const CLOUD_BATCH_LIMIT = 450;
const CLOUD_META_STATE_DOC_ID = 'state';
const CLOUD_META_MIGRATION_DOC_ID = 'migration';

// Device / Performance Constants
const IS_MOBILE_DEVICE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
const LOW_POWER_DEVICE = (Number(navigator.hardwareConcurrency) > 0 && Number(navigator.hardwareConcurrency) <= 4)
    || (Number(navigator.deviceMemory) > 0 && Number(navigator.deviceMemory) <= 4);
const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
const PERFORMANCE_MODE = IS_MOBILE_DEVICE || LOW_POWER_DEVICE || REDUCED_MOTION;

const PROGRESS_COLLAPSIBLE_CARD_KEYS = ['weeklyPlanner', 'focusWeekly', 'focusPastWeeks', 'moodHistory'];

// Achievement Definitions
const ACHIEVEMENT_DEFINITIONS = [
    { id: 'early_bird', title: 'Erkenci Kuş', icon: '\u{1F426}', description: 'Sabah 04:00 - 08:00 arasında görev tamamla.' },
    { id: 'night_owl', title: 'Gece Kuşu', icon: '\u{1F989}', description: 'Gece 00:00 - 03:00 arasında görev tamamla.' },
    { id: 'streak_7', title: 'Haftalık Seri', icon: '\u{1F525}', description: '7 günlük seri yap.' },
    { id: 'streak_30', title: 'Aylık Seri', icon: '\u26A1', description: '30 günlük seri yap.' },
    { id: 'streak_100', title: 'Efsane Seri', icon: '\u{1F3C6}', description: '100 günlük seri yap.' },
    { id: 'bookworm', title: 'Kitap Kurdu', icon: '\u{1F4DA}', description: 'İlk kitabını bitir.' },
    { id: 'library', title: 'Kütüphane', icon: '\u{1F3DB}\uFE0F', description: '10 kitap bitir.' },
    { id: 'multi_tasker', title: 'Çok Yönlü', icon: '\u{1F3AF}', description: '5 farklı alışkanlık oluştur.' },
    { id: 'planner', title: 'Planlayıcı', icon: '\u{1F4CB}', description: '5 yapılacak görev ekle.' },
    { id: 'balanced_life', title: 'Dengeli Yaşam', icon: '\u2696\uFE0F', description: '3 farklı kategoride alışkanlık tamamla.' }
];

// Note Category Labels
const NOTE_CATEGORY_LABELS = {
    'general': 'Genel',
    'journal': 'Günlük',
    'ideas': 'Fikir',
    'work': 'İş',
    'personal': 'Kişisel',
    'books': 'Kitap Notu',
    'health': 'Sağlık',
    'finance': 'Finans',
    'goals': 'Hedefler',
    'learning': 'Öğrenme',
    'travel': 'Seyahat'
};

const NOTES_PAGE_SIZE = 48;
const NOTES_JUMP_AUTOLOAD_CAP = 600;

// Mojibake Decoding Constants
const SINGLE_BYTE_REVERSE_MAP = new Map([
    [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87],
    [0x02C6, 0x88], [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91],
    [0x2019, 0x92], [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02DC, 0x98],
    [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B], [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
    [0x011E, 0xD0], [0x0130, 0xDD], [0x015E, 0xDE], [0x011F, 0xF0], [0x0131, 0xFD], [0x015F, 0xFE]
]);

const MOJIBAKE_SIGNAL_REGEX = /(Ã.|Â.|â.|Å.|Ä.|Ð.|Ñ.|ðŸ|�)/g;

// Web Push Public Key
const WEB_PUSH_PUBLIC_KEY = typeof window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY === 'string'
    ? window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY.trim()
    : '';

// Debug Mode
const DEBUG_MODE = false;

// Export all constants globally for module scripts
window.DEBUG_MODE = DEBUG_MODE;
window.STORAGE_KEY = STORAGE_KEY;
window.TRASH_STORAGE_KEY = TRASH_STORAGE_KEY;
window.WEEKLY_REVIEW_STORAGE_KEY = WEEKLY_REVIEW_STORAGE_KEY;
window.PROGRESS_CARD_COLLAPSE_STORAGE_KEY = PROGRESS_CARD_COLLAPSE_STORAGE_KEY;
window.ONBOARDING_STORAGE_KEY = ONBOARDING_STORAGE_KEY;
window.FOCUS_TIMER_STATE_STORAGE_KEY = FOCUS_TIMER_STATE_STORAGE_KEY;
window.FOCUS_TIMER_PREFS_STORAGE_KEY = FOCUS_TIMER_PREFS_STORAGE_KEY;
window.ERROR_LOG_STORAGE_KEY = ERROR_LOG_STORAGE_KEY;
window.PUSH_DEVICE_ID_STORAGE_KEY = PUSH_DEVICE_ID_STORAGE_KEY;
window.TRASH_RETENTION_DAYS = TRASH_RETENTION_DAYS;
window.APP_VERSION = APP_VERSION;
window.WEB_PUSH_PUBLIC_KEY = WEB_PUSH_PUBLIC_KEY;
window.LOCAL_SAVE_DEBOUNCE_MS = LOCAL_SAVE_DEBOUNCE_MS;
window.CLOUD_SAVE_DEBOUNCE_MS = CLOUD_SAVE_DEBOUNCE_MS;
window.CLOUD_SCHEMA_VERSION = CLOUD_SCHEMA_VERSION;
window.CLOUD_BATCH_LIMIT = CLOUD_BATCH_LIMIT;
window.CLOUD_META_STATE_DOC_ID = CLOUD_META_STATE_DOC_ID;
window.CLOUD_META_MIGRATION_DOC_ID = CLOUD_META_MIGRATION_DOC_ID;
window.IS_MOBILE_DEVICE = IS_MOBILE_DEVICE;
window.LOW_POWER_DEVICE = LOW_POWER_DEVICE;
window.REDUCED_MOTION = REDUCED_MOTION;
window.PERFORMANCE_MODE = PERFORMANCE_MODE;
window.NOTES_PAGE_SIZE = NOTES_PAGE_SIZE;
window.NOTES_JUMP_AUTOLOAD_CAP = NOTES_JUMP_AUTOLOAD_CAP;
window.PROGRESS_COLLAPSIBLE_CARD_KEYS = PROGRESS_COLLAPSIBLE_CARD_KEYS;
window.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;
window.NOTE_CATEGORY_LABELS = NOTE_CATEGORY_LABELS;
window.SINGLE_BYTE_REVERSE_MAP = SINGLE_BYTE_REVERSE_MAP;
window.MOJIBAKE_SIGNAL_REGEX = MOJIBAKE_SIGNAL_REGEX;
