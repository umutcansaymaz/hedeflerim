// ===== Global State Store =====
// Hedeflerim — Merkezi State Yönetimi
// GR-SP06: Global değişken sayısı < 10 (sadece appData var olarak kalır)

// Internal state — single source of truth (kapsüllenmiş global'ler)
const _state = {
  appData: null,
  localSaveTimer: null,
  cloudSaveTimer: null,
  cloudSaveInFlight: false,
  cloudLoadInFlight: false,
  pendingCloudSave: false,
  pendingCloudLoad: false,
  cloudRetryTimer: null,
  cloudRetryCount: 0,
  lastOfflineSaveNoticeAt: 0,
  lastPersistedPayload: '',
  lastCloudSnapshot: null,
  lastCloudRootUpdatedAtMs: 0,
  lastCloudRootCheckAtMs: 0,
  toastHideTimer: null,
  toastActionHandler: null,
  trashBin: [],
  weeklyReviewStore: {},
  progressCardCollapseState: {},
  quickCaptureOpen: false,
  keyboardAwarenessInitialized: false,
  currentWeekOffset: 0,
  editingHabitId: null,
  currentBookFilter: 'all',
  currentTodoFilter: 'today',
  currentNoteFilter: 'all',
  noteSearchQuery: '',
  uiTextRepairScheduled: false,
  uiTextRepairLastRunAt: 0,
  cloudSyncStats: {
    lastCloudSaveAt: null,
    lastCloudWriteOps: 0,
    lastCloudWriteMs: 0,
    lastCloudErrorAt: null,
    lastCloudError: null
  }
};

const _listeners = {};

// ===== Store API =====
function getState(key) {
  return key ? _state[key] : _state;
}

function setState(key, value) {
  _state[key] = value;
  _notify(key, value);
}

function updateState(updates) {
  Object.keys(updates).forEach(key => {
    _state[key] = updates[key];
    _notify(key, updates[key]);
  });
}

function subscribe(key, fn) {
  if (!_listeners[key]) _listeners[key] = [];
  _listeners[key].push(fn);
  return () => {
    _listeners[key] = _listeners[key].filter(f => f !== fn);
  };
}

function _notify(key, value) {
  if (_listeners[key]) {
    _listeners[key].forEach(fn => fn(value));
  }
  if (_listeners['*']) {
    _listeners['*'].forEach(fn => fn(key, value));
  }
}

// ===== Live Global Sync =====
// Object.defineProperty ile her bir encapsulated değişken globalThis'e
// canlı getter/setter olarak yansıtılır:
//   - okuma (trashBin.length) => _state'den okur
//   - yazma (trashBin = [])   => _state'e yazar
// İki yönlü senkronizasyon otomatiktir, ayrı var tanımı gerekmez.
function _exposeToGlobal(key) {
  Object.defineProperty(globalThis, key, {
    get() { return _state[key]; },
    set(v) { _state[key] = v; },
    configurable: true,
    enumerable: true
  });
}

if (typeof globalThis !== 'undefined') {
  // Store API
  globalThis.__store = {
    getState,
    setState,
    updateState,
    subscribe
  };

  // Kapsüllenen değişkenleri canlı getter/setter ile global'e yansıt
  // (inline array — ek global oluşturmamak için)
  [
    'appData',
    'localSaveTimer', 'cloudSaveTimer', 'cloudSaveInFlight',
    'cloudLoadInFlight', 'pendingCloudSave', 'pendingCloudLoad',
    'cloudRetryTimer', 'cloudRetryCount', 'lastOfflineSaveNoticeAt',
    'lastPersistedPayload', 'lastCloudSnapshot', 'lastCloudRootUpdatedAtMs',
    'lastCloudRootCheckAtMs', 'toastHideTimer', 'toastActionHandler',
    'trashBin', 'weeklyReviewStore', 'progressCardCollapseState',
    'quickCaptureOpen', 'keyboardAwarenessInitialized', 'currentWeekOffset',
    'editingHabitId', 'currentBookFilter', 'currentTodoFilter',
    'uiTextRepairScheduled', 'uiTextRepairLastRunAt'
  ].forEach(_exposeToGlobal);
}

// ===== Geçici Global Uyum Katmanı =====
// Sadece zorunlu olan global değişken var olarak kalır.
// Faz 4 sonrası temizlenecek: component'ler store API'sine geçtiğinde.
var appData = null;
