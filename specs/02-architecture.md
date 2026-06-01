# 02-architecture.md

## Klasör Yapısı (Mevcut)

```
Hedeflerim/
├── app-v5.js          ~9700 satır — TÜM uygulama logic'i (monolith)
├── index.html         ~944 satır — TÜM HTML markup (5-tab SPA)
├── style.css          — Tüm stiller
├── sw.js              ~123 satır — Service Worker
├── manifest.json      — PWA manifest
├── firestore.rules    ~374 satır — DB güvenlik + validasyon
├── firebase.json      — Hosting + Functions + Firestore config
├── .firebaserc        — Project: hedeflerim-2026
├── task.md            — Görev listesi
├── AGENTS.md          — Guardiallar
├── specs/             — AI bağlam dosyaları (bu klasör)
└── functions/
    ├── index.js       ~432 satır — Cloud Functions
    └── package.json   — Node 20, firebase-admin, firebase-functions, web-push
```

**Not:** Kök dizinde `package.json` yok. Bu bir vanilla JS projesidir; build tool, test runner veya bundler kullanılmaz.

## Mimari Karakteristikler

| Özellik | Değer |
|---------|-------|
| Pattern | SPA (Single Page Application) |
| Rendering | Client-side, full JS-driven DOM manipulation |
| State | Global `appData` objesi + `localStorage` + Firestore |
| Framework | Yok (Vanilla JS) |
| Styling | CSS dosyası, class-based, responsive |
| Build | Yok — CDN script tag'leri + statik dosyalar |
| Deploy | Firebase Hosting (manuel `firebase deploy`) |

## Veri Modeli (appData)

```javascript
appData = {
  habits: [{
    id, name, color, completions: { 'YYYY-MM-DD': { done, value, time } },
    category, goal: { value, unit, frequency }, createdAt, updatedAt
  }],
  todos: [{
    id, text, completed, bucket: 'today'|'week'|'someday',
    createdAt, updatedAt
  }],
  books: [{
    id, title, author, coverUrl, totalPages, currentPage,
    dailyGoalPages, dailyReadLog: { 'YYYY-MM-DD': pages },
    status: 'pending'|'reading'|'completed', createdAt, updatedAt
  }],
  notes: [{
    id, title, content, category, color, pinned, archived,
    createdAt, updatedAt
  }],
  focusSessions: [{
    id, label, mode: 'pomodoro'|'stopwatch'|'countdown',
    workSec, breakSec, interruptions, completionPct, deepWorkScore,
    linkedType, linkedId, startedAt, endedAt
  }],
  weeklyReview: {
    'YYYY-Www': { focus, wins, blockers, nextWeekFocus, goalTarget, goalActual, updatedAt }
  },
  moods: { 'YYYY-MM-DD': 1|2|3|4|5 },
  xp: number,
  level: number,
  achievements: [{ id, date }],
  settings: {
    theme, notificationsEnabled, reminderTime,
    smartReminderEnabled, focusWeeklyGoalMinutes,
    focusSoundEnabled, annualGoalValue, annualGoalUnit
  }
}
```

## Firestore v2 Schema

Her kullanıcı için: `users/{userId}/`

| Subcollection | Doküman | Validasyon |
|---------------|---------|------------|
| (root) | `users/{userId}` | `validCloudRoot()` — schemaVersion, counters, app meta |
| `meta` | `state` | `validStateDoc()` — settings, weeklyReview, moods, xp, level, achievements |
| `meta` | `migration` | `validMigrationDoc()` — legacy migration flag |
| `habits` | `{habitId}` | `validHabitDoc()` — name, color, completions, category, goal |
| `todos` | `{todoId}` | `validTodoDoc()` — text, completed, bucket |
| `books` | `{bookId}` | `validBookDoc()` — title, author, pages, status |
| `notes` | `{noteId}` | `validNoteDoc()` — title, content, category, color, pinned, archived |
| `focusSessions` | `{sessionId}` | `validFocusSessionDoc()` — label, mode, times, scores |
| `errors` | `{errorId}` | `validErrorDoc()` — hata logları, sadece create, update/delete yasak |
| `pushSubscriptions` | `{subId}` | `validPushSubscriptionDoc()` — endpoint, keys, timezone |

## Cloud Sync Mimarisi

- **V2 yapı:** Her entity ayrı subcollection. V1'de (legacy) tüm veri tek root dokümandaydı.
- **Diff & Merge:** `diffCollectionItemsByUpdatedAt()` ile sadece değişen öğeler gönderilir. Conflict çözümü: `updatedAt` karşılaştırması + merge.
- **Offline:** Firestore persistence + `localStorage` fallback. `isNetworkOnline()` kontrolü.
- **Retry:** Exponential backoff + jitter ile otomatik retry.
- **Batch:** `commitCloudOperations()` 450'luk batch'lerle yazma yapar.

## State Yönetimi

- **Global state:** `appData` objesi (mutable).
- **Local state:** `localStorage` (çeşitli key'ler: `habitTrackerData`, `habitTrackerTrashV1`, vb.).
- **Cloud state:** Firestore.
- **Render:** Direkt DOM manipulation. React/Vue yok. `renderXxx()` fonksiyonları `appData`'yı okur, DOM'u günceller.
- **Event binding:** `addEventListener` + inline `onclick="..."` (mevcut kodda her ikisi de var).

## Önemli Entegrasyonlar

| Servis | Kullanım | Not |
|--------|----------|-----|
| Firebase Auth | Google ile giriş, whitelist | 2 kullanıcı, hardcoded email listesi |
| Firestore | Bulut senkronizasyon, hata logları | Strict rules, offline persistence |
| Firebase Functions | Scheduled push notifications | `onSchedule`, web-push, VAPID keys |
| Google Books API | Kitap arama | Public endpoint, API key yok |
| Web Push API | Browser push bildirimleri | Service Worker üzerinden |
| Google Fonts | Typography | CDN'den yüklü |

## Kritik Alanlar (Değişirken Dikkat)

1. **`normalizeAppData()`** — Tüm veri validasyonu burada. Bu fonksiyona dokunmak → Firestore rules da güncellenmeli.
2. **Cloud sync loop** — `saveToCloud()` ↔ `loadFromCloud()`. Deadlock veya race condition riski. `cloudSaveInFlight` / `cloudLoadInFlight` flag'leri kontrol edilmeli.
3. **`firestore.rules`** — 374 satır, her field ayrı validasyonlu. Yeni field = yeni `validXxxDoc()` fonksiyonu + yeni `match` rule.
4. **`functions/index.js`** — Push notification scheduler. Timezone (`Europe/Istanbul`) ve timing sabitleri hassas. Değişiklik etkisi global (tüm kullanıcılar).
5. **`sw.js`** — Cache-first strateji. `CACHE_NAME` versiyonu değişiklikte artırılmalı. Aksi halde kullanıcı eski versiyonu görebilir.
6. **Auth whitelist** — Yeni kullanıcı ekleme = 3 dosya güncelleme: `app-v5.js`, `firestore.rules`, `functions/index.js` (varsa kontrol).
