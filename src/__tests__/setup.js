// ===== Test Setup — Browser & Firebase mocks =====
// Loads app-v5.js in a mocked global environment so pure functions are testable.
import { vi, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---- Browser Globals ----
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      userAgent: 'node-test',
      hardwareConcurrency: 8,
      deviceMemory: 8
    },
    writable: true,
    configurable: true
  });
} catch {
  // Bazı eski Node sürümlerinde defineProperty de çalışmayabilir
  globalThis.navigator = { onLine: true, userAgent: 'node-test', hardwareConcurrency: 8, deviceMemory: 8 };
}

globalThis.window = {
  matchMedia: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  location: { href: '', reload: vi.fn() },
  innerWidth: 1024,
  innerHeight: 768,
  HDEFLERIM_FIREBASE_CONFIG: {
    apiKey: 'test-api-key',
    authDomain: 'test.firebaseapp.com',
    projectId: 'test-project',
    storageBucket: 'test.appspot.com',
    messagingSenderId: '123',
    appId: 'test-app-id',
    measurementId: ''
  },
  HDEFLERIM_ALLOWED_EMAILS: ['test@test.com', 'testuser@example.com'],
  HDEFLERIM_WEB_PUSH_PUBLIC_KEY: 'test-public-key'
};

const storage = {};
globalThis.localStorage = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = String(value); }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
  get length() { return Object.keys(storage).length; },
  key: vi.fn((i) => Object.keys(storage)[i] ?? null)
};

globalThis.document = {
  getElementById: vi.fn(() => null),
  createElement: vi.fn(() => ({})),
  body: { appendChild: vi.fn(), classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() } },
  head: { appendChild: vi.fn() },
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  title: '',
  documentElement: { style: {}, classList: { add: vi.fn(), remove: vi.fn() } },
  createTextNode: vi.fn(() => ({})),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  cookie: ''
};

globalThis.Notification = { permission: 'granted', requestPermission: vi.fn(() => Promise.resolve('granted')) };
globalThis.AudioContext = vi.fn(() => ({ resume: vi.fn(), close: vi.fn() }));
globalThis.setTimeout = globalThis.setTimeout;
globalThis.clearTimeout = globalThis.clearTimeout;
globalThis.setInterval = globalThis.setInterval;
globalThis.clearInterval = globalThis.clearInterval;
globalThis.location = { pathname: '/', href: '', reload: vi.fn() };

// ---- Firebase Mock ----
const mockFirestoreDoc = {
  get: vi.fn(() => Promise.resolve({ exists: false, data: () => null, id: 'mock-doc' })),
  set: vi.fn(() => Promise.resolve()),
  delete: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  collection: vi.fn(() => mockFirestoreCollection)
};

const mockFirestoreCollection = {
  doc: vi.fn(() => mockFirestoreDoc),
  get: vi.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
  add: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  where: vi.fn(() => mockFirestoreCollection),
  orderBy: vi.fn(() => mockFirestoreCollection),
  limit: vi.fn(() => mockFirestoreCollection),
  onSnapshot: vi.fn(() => vi.fn())
};

const mockBatch = {
  set: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve())
};

const mockFirestore = {
  settings: vi.fn(),
  enablePersistence: vi.fn(() => Promise.resolve()),
  batch: vi.fn(() => mockBatch),
  collection: vi.fn(() => mockFirestoreCollection),
  FieldValue: { serverTimestamp: vi.fn(() => new Date().toISOString()), arrayUnion: vi.fn(), arrayRemove: vi.fn() },
  Timestamp: { fromDate: vi.fn((d) => d), now: vi.fn(() => new Date()) }
};

/** Stores the onAuthStateChanged callback so tests can trigger it */
const _authCallbackRef = { current: null };
globalThis.__getAuthCallbackRef = () => _authCallbackRef;

const mockAuth = {
  onAuthStateChanged: vi.fn((cb) => { _authCallbackRef.current = cb; }),
  signOut: vi.fn(() => Promise.resolve()),
  signInWithPopup: vi.fn(() => Promise.resolve({ user: { uid: 'test-uid', email: 'test@test.com', displayName: 'Test', photoURL: '' } })),
  signInWithRedirect: vi.fn(() => Promise.resolve()),
  getRedirectResult: vi.fn(() => Promise.resolve({ user: null })),
  setPersistence: vi.fn(() => Promise.resolve()),
  currentUser: { uid: 'test-uid', email: 'test@test.com', displayName: 'Test', photoURL: '' },
  GoogleAuthProvider: vi.fn(() => ({}))
};

const mockAuthFn = vi.fn(() => mockAuth);
mockAuthFn.Auth = { Persistence: { LOCAL: 'LOCAL' } };

// In Firebase v8 namespaced API, FieldValue is a static property on firebase.firestore,
// not just on the instance returned by firebase.firestore(). Add it to the function.
const firestoreFn = vi.fn(() => mockFirestore);
firestoreFn.FieldValue = {
  serverTimestamp: vi.fn(() => ({ _timestamp: 'server' })),
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  delete: vi.fn(() => ({ _delete: true }))
};

globalThis.firebase = {
  initializeApp: vi.fn(),
  firestore: firestoreFn,
  auth: mockAuthFn
};

// ---- Register Modular Firebase Mocks Globally ----
globalThis.initializeApp = vi.fn();
globalThis.getAuth = vi.fn(() => mockAuth);
globalThis.onAuthStateChanged = mockAuth.onAuthStateChanged;
globalThis.getRedirectResult = mockAuth.getRedirectResult;
globalThis.setPersistence = mockAuth.setPersistence;
globalThis.browserLocalPersistence = 'LOCAL';
globalThis.signOut = mockAuth.signOut;
globalThis.GoogleAuthProvider = mockAuth.GoogleAuthProvider;
globalThis.signInWithPopup = mockAuth.signInWithPopup;
globalThis.signInWithRedirect = mockAuth.signInWithRedirect;

globalThis.initializeFirestore = vi.fn(() => mockFirestore);
globalThis.enableMultiTabIndexedDbPersistence = vi.fn(() => Promise.resolve());
globalThis.doc = vi.fn((db, col, id) => mockFirestoreDoc);
globalThis.getDoc = vi.fn(() => Promise.resolve({ exists: false, data: () => null, id: 'mock-doc' }));
globalThis.setDoc = vi.fn(() => Promise.resolve());
globalThis.collection = vi.fn(() => mockFirestoreCollection);
globalThis.serverTimestamp = vi.fn(() => ({ _timestamp: 'server' }));
globalThis.getDocs = vi.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 }));
globalThis.writeBatch = vi.fn(() => mockBatch);
globalThis.deleteDoc = vi.fn(() => Promise.resolve());

// ---- Load app-v5.js with all utility dependencies ----
let appLoaded = false;

const cleanSource = (src) => {
  const code = src.replace(/^\s*import\s+[\s\S]*?from\s+['"].*?['"];?/gm, '');
  return `(function(){\n${code}\n})();`;
};

beforeAll(() => {
  if (appLoaded) return;
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Load utility modules first (they declare globals that app-v5.js depends on).
  // Using a single concatenated eval so const/let bindings persist in the same lexical scope.
  const constantsPath = path.resolve(__dirname, '../../src/utils/constants.js');
  const helpersPath = path.resolve(__dirname, '../../src/utils/helpers.js');
  const firebasePath = path.resolve(__dirname, '../../src/services/firebase.js');
  const authPath = path.resolve(__dirname, '../../src/services/auth.js');
  const dataLayerPath = path.resolve(__dirname, '../../src/services/dataLayer.js');
  const syncPath = path.resolve(__dirname, '../../src/services/sync.js');
  const storagePath = path.resolve(__dirname, '../../src/services/storage.js');
  const storePath = path.resolve(__dirname, '../../src/state/store.js');
  const focusPath = path.resolve(__dirname, '../../src/components/focus.js');
  const modalsPath = path.resolve(__dirname, '../../src/components/modals.js');
  const dashboardPath = path.resolve(__dirname, '../../src/components/dashboard.js');
  const habitsPath = path.resolve(__dirname, '../../src/components/habits.js');
  const settingsPath = path.resolve(__dirname, '../../src/components/settings.js');
  const todosPath = path.resolve(__dirname, '../../src/components/todos.js');
  const booksPath = path.resolve(__dirname, '../../src/components/books.js');
  const notesPath = path.resolve(__dirname, '../../src/components/notes.js');
  const statsPath = path.resolve(__dirname, '../../src/components/stats.js');
  const progressPath = path.resolve(__dirname, '../../src/components/progress.js');
  const appPath = path.resolve(__dirname, '../../src/components/app.js');

  // Test whitelist: ALLOWED_EMAILS array'ini test email'lerini içerecek şekilde genişlet
  // (Gerçek dosyayı DEĞİŞTİRMEDEN, sadece eval öncesi kaynakta düzeltme yapıyoruz)
  const firebaseSource = fs.readFileSync(firebasePath, 'utf-8');

  const combinedSource = [
    fs.readFileSync(constantsPath, 'utf-8'),
    fs.readFileSync(helpersPath, 'utf-8'),
    firebaseSource,
    fs.readFileSync(authPath, 'utf-8'),
    fs.readFileSync(dataLayerPath, 'utf-8'),
    fs.readFileSync(syncPath, 'utf-8'),
    fs.readFileSync(storagePath, 'utf-8'),
    fs.readFileSync(storePath, 'utf-8'),
    fs.readFileSync(focusPath, 'utf-8'),
    fs.readFileSync(modalsPath, 'utf-8'),
    fs.readFileSync(dashboardPath, 'utf-8'),
    fs.readFileSync(habitsPath, 'utf-8'),
    fs.readFileSync(settingsPath, 'utf-8'),
    fs.readFileSync(todosPath, 'utf-8'),
    fs.readFileSync(booksPath, 'utf-8'),
    fs.readFileSync(notesPath, 'utf-8'),
    fs.readFileSync(statsPath, 'utf-8'),
    fs.readFileSync(progressPath, 'utf-8'),
    fs.readFileSync(appPath, 'utf-8')
  ].map(cleanSource).join('\n');

  // Indirect eval executes in global scope so function and const/let declarations
  // become globally accessible across files.
  (0, eval)(combinedSource);

  // Copy window properties to globalThis so globalThis.fn() works in tests
  Object.keys(globalThis.window).forEach(key => {
    if (key !== 'location') { // Avoid overwriting node globals/location
      globalThis[key] = globalThis.window[key];
    }
  });

  // Dynamic window properties should be mapped to globalThis
  ['currentUser', 'db', 'auth'].forEach(key => {
    Object.defineProperty(globalThis, key, {
      get() { return globalThis.window[key]; },
      set(v) { globalThis.window[key] = v; },
      configurable: true,
      enumerable: true
    });
  });

  appLoaded = true;
});
