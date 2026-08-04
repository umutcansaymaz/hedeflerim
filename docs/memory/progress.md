# Progress — Oturum Geçmişi

> Yeni en üste. 10+ entry olunca, son 5 hariç `progress-archive.md`'ye taşı.

---

## [2026-08-04] CLEAN-007 — Cloud Functions Karmaşıklık Azaltma

**Yapılan (`functions/`):**
- **functions/logic.js** (yeni): Saf iş mantığı taşındı — pencere sabitleri, WINDOWS tablosu, asMap, isCompletionDone(+isCompletionObjectDone), normalizeTimeZone, getTimeZoneParts, toDateKey, getHabitProgressForDate, calculateStreak, getHabitMilestones, getMilestoneHabits, 4 payload üreticisi, getActiveWindows, getWindowKey, isWindowDue. Firebase/web-push import'u YOK.
- **functions/index.js**: 443 → ~250 satır. morning/urgency/night'ın 3 özdeş bloğu tek `sendWindowNotification` + WINDOWS tablosuna indirildi (GR-SP02). sendOnePush ile push hata yönetimi ayrıldı (derinlik ≤2). loadUserContext, getActiveSubscriptions, sendStreakMilestoneNotifications, processUser çıkarıldı — tüm fonksiyonlar ≤80 satır, nesting ≤2 (GR-SP01). **Export yüzeyi tek isim: sendScheduledReminders** (helper sızıntısı yok — deploy güvenliği, ADR-0006).
- **functions/package.json**: vitest devDependency + `"test": "vitest run"` script
- **functions/vitest.config.js**: kök config'in include desenini ezer (test/**/*.test.js)
- **functions/test/logic.test.js**: 58 golden test (isCompletionDone 18 giriş tipi, zaman/tz, ilerleme, seri, kilometre taşı eşitlik şartı, 4 payload üreticisi, pencere boundary'leri, dedupe key'leri)
- **functions/test/index.test.js**: 2 smoke test (modül mock'larla yüklenir, export'ta yalnızca sendScheduledReminders)
- Testler: **functions 60/60 yeşil**, kök **178/178 yeşil** (davranış değişmedi)
- docs/architecture/adr/0006-cloud-functions-module-split.md yazıldı
- task.md'ye CLEAN-007 (completed) kaydı eklendi

**Sıradaki:** FEAT-001 (akıllı bildirim) veya FEAT-002 (focus timer geliştirme)

---

## [2026-07-15] Genesis Bootstrap — Governance Foundation

**Yapılan:**
- AGENTS.md Genesis formatına yükseltildi (guardrail ID'leri korundu)
- docs/memory/ (context.md, progress.md, decisions.md) oluşturuldu
- skills/ sistemi (ponytail, caveman, clean-code, wrap-session, write-adr, write-tests, review-own-diff) eklendi
- docs/process/ (workflow, ai-session-protocol, conventions, definition-of-done, security, automation) eklendi
- docs/architecture/adr/ (ADR-0001 ila ADR-0004) oluşturuldu
- docs/product/ (vision.md, roadmap.md) oluşturuldu
- genesis-master/ referans klasörü kaldırıldı
- task.md güncellendi (GENESIS-001 task'ı eklendi)

**Sıradaki:** task.md'deki pending task'leri ilerlet (CLEAN-003, CLEAN-004, CLEAN-006)

---

## [2026-07-16] GUVENLIK-002 — API Key Güvenlik Denetimi

**Yapılan:**
- Tüm JS kaynak kodu hardcoded API key için tarandı — bulgu yok
- console.log/warn kullanımı denetlendi — sadece DEBUG_MODE korumalı (helpers.js)
- console.error kullanımı denetlendi — 10 adet, gerçek hatalar (GR-SP05 izinli)
- innerHTML XSS vektörleri tarandı — safeText/escapeHtml yaygın kullanılıyor
- functions/index.js denetlendi — VAPID key'ler process.env'den okunuyor
- **Kritik bulgu:** firestore.rules isOwner() fonksiyonunda `you@example.com` placeholder email kontrolü tüm Firestore yazmalarını bloke ediyordu → kaldırıldı, artık sadece `request.auth.uid == userId` kontrolü yapılıyor
- README.md güncellendi (adım 4: email placeholder talimatı kaldırıldı)
- task.md güncellendi (GUVENLIK-002 → completed)

**Sıradaki:** MAINT-003 (Firestore rules optimizasyonu) veya CLEAN-003 (global değişken < 10)

---

## [2026-07-15] PWA Sorunları Düzeltme

**Yapılan:**
- sw.js: STATIC_ASSETS'e 23 JS dosyası eklendi (önceden sadece HTML/CSS/icons vardı)
- sw.js: Strateji değişikliği — JS/CSS/fonts için Cache-First, navigation için Network-First
- sw.js: navigationPreload eklendi
- sw.js: Firebase CDN ve Google Fonts için network-first stratejisi eklendi
- app.js: beforeinstallprompt handler eklendi (A2HS / PWA kurulum desteği)
- index.html: Ayarlar'a "Uygulamayı Yükle" butonu eklendi
- Icon'lar düzeltildi (192x192 ve 512x512 artık farklı dosyalar)
- index.html: Splash screen'e 8sn timeout + hata mesajı + "Tekrar Dene" butonu eklendi
- index.html: `<noscript>` mesajı eklendi (JS kapalıyken uyarı)
- index.html: iOS meta iyileştirmeleri (apple-touch-icon, status-bar: black)
- style.css: splash-error animasyonları eklendi

**Sıradaki:** CLEAN-003 (global değişken < 10), CLEAN-004 (ölü kod temizliği)

---

## [2026-07-16] MAINT-002 — PWA Icon/Manifest Doğrulaması

**Yapılan:**
- manifest.json geçerli JSON ✅ (theme=background=#0F1638)
- icon-192.png / icon-512.png mevcut ve geçerli ✅
- index.html theme-color meta #0F1638 ✅
- sw.js v10, her iki icon STATIC_ASSETS'te ✅
- `icon-192.png.png` ve `icon-512.png.png` hatalı kopyaları temizlendi
- Tüm GR-PW01 kontrolleri geçti

**Sıradaki:** GUVENLIK-001, MAINT-004, veya FEAT-001/002

---

## [2026-07-16] CLEAN-004 — Ölü Kod Temizliği

**Yapılan:**
- Tarama: console.log/warn → 0 bulgu (hepsi DEBUG_MODE korumalı)
- Tarama: TODO/FIXME/HACK → 0 bulgu
- Tarama: Yorum satırına alınmış kod → 0 bulgu
- Tarama: Kullanılmayan fonksiyon → 0 bulgu (hepsi Components export'u veya callback)
- Tarama: Magic number → 0 bulgu (hepsi constants.js'de)
- 1 fix: app.js:611 `window.openTrashModal` → `Components.openTrashModal`
- Test: 178/178 geçiyor

**Not:** Mevcut kod GR-SP05'e zaten uyumlu. CLEAN-004 esasen zaten tamamdı.

**Sıradaki:** CLEAN-006 (naming convention) veya FEAT-001/002

---

## [2026-07-16] MAINT-004 — Error Logging İyileştirmesi

**Yapılan (`src/services/sync.js`):**
1. **pendingErrorUploads kuyruk sınırı**: Max 100 entry (`PENDING_ERROR_UPLOAD_MAX`), eski kayıtlar otomatik atılır
2. **Exponential backoff retry**: Batch yazma hatasında 3 kez tekrar deneme (2s/4s/8s), önceki gibi sessizce düşmek yerine
3. **Error alarm badge**: Hata oluştuğunda `syncStatus` elemanında hata sayısı gösterilir, `var(--danger)` renginde, 10sn rate-limited
4. **Akıllı rate-limit**: Rate limit aşıldığında sessizce düşmek yerine kalan süre kadar bekleyip yeniden dener
- 178/178 test geçiyor
- Firestore cleanup planı güvenlik nedeniyle iptal (rules delete forbidden)

**Sıradaki:** FEAT-001 (akıllı bildirim) veya FEAT-002 (focus timer geliştirme)

---

**Yapılan:**
- `firestore.rules`: config/whitelist okuma kuralı eklendi (isSignedIn() okuyabilir, whitelist üyeleri yazabilir)
- `firebase.js`: `_loadDynamicWhitelist()` eklendi — Firestore'dan config/whitelist.emails dizisini okuyup STATIC_ALLOWED_EMAILS ile birleştirir
- `onAuthStateChanged` callback'i artık async — whitelist önce yüklenir, sonra email kontrolü yapılır
- Admin paneline gerek yok: Firebase Console'dan `config/whitelist` doc'una `emails[]` eklenerek yeni kullanıcı eklenir
- Testler güncellendi: async callback destekli, microtask flush ile signOut().then(toast) beklendi
- 178/178 test geçiyor

**Sıradaki:** FEAT-001 (akıllı bildirim) veya FEAT-002 (focus timer geliştirme)

---



**Yapılan:**
- 328 adet `window.X = X` global export tarandı, 4 namespace'te toplandı:
  - `window.C` (constants, 30 öğe)
  - `window.Utils` (helpers, 39 öğe)
  - `window.Services` (services+state, ~61 öğe)
  - `window.Components` (components, ~194 öğe)
- Kalan 5 window global temizlendi:
  - `currentTodoFilter`, `currentBookFilter`, `focusGoalPersistTimer` → Services
  - `addBookFromSearch`, `FocusTimer` → Components
- store.js `_exposeToGlobal` listesinden `currentBookFilter`, `currentTodoFilter` çıkarıldı (artık Services üzerinden)
- Tüm bileşenlerdeki `window.FocusTimer` → `Components.FocusTimer` referansları güncellendi (6 dosya, ~30 ref)
- `window.focusGoalPersistTimer` → `Services.focusGoalPersistTimer` güncellendi
- Test proxy katmanı (setup.js) Components/Services function proxy'leri ile güncellendi
- 178/178 test geçiyor (7 test file, 1.2s)

**Kalan global'ler:**
- 4 namespace (C, Utils, Services, Components) — beklenen
- 3 config (HDEFLERIM_FIREBASE_CONFIG, HDEFLERIM_ALLOWED_EMAILS, HDEFLERIM_WEB_PUSH_PUBLIC_KEY)
- 1 var appData (store.js geçici uyum, Faz 4'te kaldırılacak)
- 27 store state path (_exposeToGlobal getter/setter)

**Sıradaki:** CLEAN-004 (ölü kod), CLEAN-006 (naming), veya MAINT tasks

---

## Önceki Oturumlar (proje geçmişi)

Projenin task.md'de kayıtlı tamamlanmış task'ları:
- CLEAN-001: Modülerleştirme (Faz 0-4)
- CLEAN-002: DRY refactor
- CLEAN-005: Fonksiyon boyutları
- CLEAN-006: Test altyapısı
- MAINT-001: Firebase SDK güncelle
- MAINT-005: Performans optimizasyonu
- GUVENLIK-003: Public repo güvenlik
- FEAT-004: İleri tarihli todolar
- FEAT-005~010: Tema, efekt, ikon, heatmap, skeleton
- BUG-001~005: Çeşitli bug fix'ler
