# Hedeflerim — Task List
# Guardrail ID'leri için AGENTS.md'ye bak: her task'taki guardrails alanı
# hangi kuralların uygulanacağını belirtir.

version: "1.2"
last_updated: "2026-07-16"

project:
  name: "Hedeflerim"
  type: "PWA + Firebase"
  version: "5.3.0"
  architecture: "modular"  # monolith → modular (CLEAN-001 Faz 0-3 tamam)
  stack:
    - "Vanilla JS (ES6+)"
    - "Firebase Auth (Google)"
    - "Firestore (bulut senkronizasyon)"
    - "PWA (service-worker, manifest)"
    - "Firebase Cloud Functions"
    file_tree: |
    src/
      utils/
        constants.js          # Sabitler, yapılandırma
        helpers.js            # Helper fonksiyonlar (truncateText, escapeHtml, vs.)
      services/
        firebase.js           # Firebase init & auth state
        auth.js               # login/logout/authUI
        dataLayer.js          # normalizeAppData + merge/diff/write ops
        sync.js               # Cloud sync, error logging, diagnostics
        storage.js            # localStorage yönetimi
      state/
        store.js              # Merkezi state yönetimi (global vars)
      components/
        app.js                # App entry, DOMContentLoaded init, routing, event delegation
        focus.js              # Pomodoro / Stopwatch / Countdown
        modals.js             # Modal aç/kapa, toast, onboarding, search, quick capture, UI repair
        dashboard.js          # Dashboard render, daily recap, sections
        habits.js             # Alışkanlık CRUD, haftalık takvim, confetti, records, quotes, time analysis
        settings.js           # Tema, bildirim/push, reminder, notification
        todos.js              # Todo CRUD, bucket, filtreleme
        books.js              # Kitap CRUD, sayfa takibi, helpers
        notes.js              # Not CRUD, sesli giriş, filtre
        stats.js              # İstatistikler, SmartCoach, ruh hali, XP/Level/Achievement
        progress.js           # İlerleme, heatmap, başarımlar, weekly planner
      __tests__/
        setup.js              # Vitest setup
        utils.test.js         # Util fonksiyon testleri
        dataLayer.test.js     # DataLayer testleri
    firestore.rules
    index.html
    style.css
    sw.js
    manifest.json

# ===== Çalışma Fazları =====
# Phase 0: GENESIS (governance bootstrap)
# Phase 1: CLEAN  (temizlik / spagetti önleme)
# Phase 2: MAINT  (bakım)
# Phase 3: FEAT   (yeni özellik)
# CLEAN tamamlanmadan FEAT başlatılmaz.

tasks:

  # ============================================================
  # CLEAN: Kod Temizleme
  # ============================================================

  - id: "CLEAN-001"
    title: "Kod yapısını modülerleştir"
    description: >
      app-v5.js (9.934 satır → ~2.190 satır) monolith yapısını
      component bazlı parçalara böl. Hedef: src/components/,
      src/services/, src/utils/ dizin yapısı.
      TAMAMLANAN: Faz 0, 1, 2, 3 — SIRADAKI: Faz 4 (App Entry + State Management)
    priority: "high"
    status: "completed"
    phase: 1
    dependencies: []
    guardrails:
      - GR-SP01   # fonksiyon max 80 satır
      - GR-SP02   # DRY
      - GR-SP03   # single responsibility
      - GR-SP06   # global değişken < 10
    affected_files:
      - "app-v5.js"
      - "src/utils/constants.js"
      - "src/utils/helpers.js"
      - "src/services/firebase.js"
      - "src/services/auth.js"
      - "src/services/dataLayer.js"
      - "src/services/sync.js"
      - "src/services/storage.js"
      - "src/components/focus.js"
      - "src/components/modals.js"
      - "src/components/dashboard.js"
      - "src/components/habits.js"
      - "src/components/settings.js"
      - "src/components/todos.js"
      - "src/components/books.js"
      - "src/components/notes.js"
      - "src/components/stats.js"
      - "src/components/progress.js"
      - "src/state/store.js"
      - "src/__tests__/setup.js"
      - "src/__tests__/utils.test.js"
      - "src/__tests__/dataLayer.test.js"
    notes: >
      === TAMAMLANAN FAZLAR ===
      
      Faz 0 (Utils + Constants) tamamlandı:
      - src/utils/constants.js — Tüm sabitler, yapılandırma, storage key'leri
      - src/utils/helpers.js — truncateText, escapeHtml, sanitizeColor,
        normalizeDateValue, sanitizeImageUrl, parseTimestamp
      
      Faz 1 (Services) tamamlandı:
      - src/services/firebase.js — Firebase init & auth state
      - src/services/auth.js — login/logout/authUI
      - src/services/dataLayer.js — normalizeAppData + merge/diff/write ops
      - src/services/sync.js — cloud sync, error logging, diagnostics
      - src/services/storage.js — localStorage yönetimi
      
      Faz 2 (Component'ler 1/2) tamamlandı:
      - src/components/focus.js — Pomodoro / Stopwatch / Countdown timer
      - src/components/modals.js — Modal aç/kapa, toast, trash, onboarding, search, quick capture
      - src/components/dashboard.js — Dashboard render, daily recap, sections
      - src/components/habits.js — Alışkanlık CRUD, haftalık takvim, confetti, records, quotes
      - src/components/settings.js — Tema, bildirim/push, reminder, notification
      
      Faz 3 (Component'ler 2/2) tamamlandı:
      - src/components/todos.js — Todo CRUD, bucket, filtreleme
      - src/components/books.js — Kitap CRUD, sayfa takibi, helper functions
      - src/components/notes.js — Not CRUD, sesli giriş, filtre
      - src/components/stats.js — İstatistikler, SmartCoach, ruh hali, XP/Level/Achievement
      - src/components/progress.js — İlerleme, heatmap, başarımlar, weekly planner
      
      Faz 4 (App Entry + State Management) TAMAMLANDI:
      - src/state/store.js — Merkezi state yönetimi, tüm global değişkenler taşındı
      - src/components/app.js — DOMContentLoaded init, routing, event delegation
      - app-v5.js tamamen boşaltıldı ve silindi
      - index.html'den script referansı kaldırıldı
      - setup.js'den app-v5.js referansı kaldırıldı
      - WEB_PUSH_PUBLIC_KEY → constants.js
      - Global state vars (appData, localSaveTimer, etc.) → store.js
      - Book helpers → books.js
      - XP/Level/Achievement → stats.js
      - Mojibake/UI repair → modals.js
      - Motivational quotes, time analysis → habits.js
      - Notification functions → settings.js
      - Weekly planner → progress.js
      
      app-v5.js 9934 → 0 satır (%100 küçülme) — DOSYA SİLİNDİ"""

  - id: "CLEAN-002"
    title: "DRY — tekrar eden kodları refactor"
    description: >
      Mevcut kodda 3+ kez tekrar eden patternleri tespit et, helper
      fonksiyona çıkar. Mevcut util fonksiyonları (truncateText,
      escapeHtml, sanitizeColor, normalizeDateValue) referans al.
    priority: "high"
    status: "completed"
    phase: 1
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-SP02   # DRY
      - GR-SP03   # single responsibility
    affected_files:
      - "app-v5.js"
    notes: >
      === TAMAMLANDI ===
      
      **Pattern 1: `escapeHtml(value || '')` → `safeText(value, fallback)`** (~50 occurrences)
      - Added `safeText()` to src/utils/helpers.js (wraps escapeHtml with optional fallback)
      - Refactored in: habits.js, todos.js, dashboard.js, books.js, notes.js, 
        progress.js, modals.js, focus.js, stats.js, sync.js, app.js
      
      **Pattern 2: `document.getElementById('xxx').classList.add/remove('active')` → `openModal(id)`/`closeModal(id)`** (~15 occurrences)
      - Added `openModal()` to src/components/modals.js (complements existing `closeModal()`)
      - Updated: openTrashModal, openOnboardingModal, closeOnboardingModal,
        showCelebrationModal, openGlobalSearch, sync modal ops,
        habit modal ops, note modal ops, book modal ops, settings modal ops
      
      All refactored code is functionally identical — safeText delegates to
      escapeHtml internally, openModal simply adds the 'active' class.

  - id: "CLEAN-003"
    title: "Global değişken sayısını 10 altına indir"
    description: >
      app-v5.js içindeki 328 adet window.X global değişken kapsüllendi.
      Tüm değişkenler 4 namespace'te toplandı: window.C (constants, 30),
      window.Utils (helpers, 39), window.Services (services+state, ~61),
      window.Components (components, ~194). Ayrıca 3 config global kaldı:
      HDEFLERIM_FIREBASE_CONFIG, HDEFLERIM_ALLOWED_EMAILS,
      HDEFLERIM_WEB_PUSH_PUBLIC_KEY. 1 var appData store.js'de (geçici
      uyum). store.js'deki _exposeToGlobal 27 state path'ini getter/setter
      olarak yansıtır. focus-engine.js'deki FocusTimer Components'e taşındı.
      remaining window.* atamaları temizlendi: currentTodoFilter,
      currentBookFilter → Services, addBookFromSearch, FocusTimer →
      Components, focusGoalPersistTimer → Services. 178/178 test geçiyor.
    priority: "medium"
    status: "completed"
    phase: 1
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-SP06   # global değişken < 10
    affected_files:
      - "src/utils/constants.js"
      - "src/utils/helpers.js"
      - "src/services/*.js"
      - "src/state/store.js"
      - "src/components/*.js"
      - "src/__tests__/setup.js"
      - "src/__tests__/*.test.js"

  - id: "CLEAN-004"
    title: "Ölü kod ve debug kalıntılarını temizle"
    description: >
      Tarama sonuçları: (1) console.log/warn — sadece DEBUG_MODE korumalı,
      bulgu yok. (2) TODO/FIXME/HACK yorumu — hiçbiri yok. (3) Yorum satırına
      alınmış kod — yok. (4) Kullanılmayan fonksiyon — hepsi ya Components
      namespace'inde export edilmiş ya da addEventListener/callback ile
      kullanılıyor. (5) Magic number — tümü constants.js'de. (6) Tek fix:
      app.js'de window.openTrashModal → Components.openTrashModal dönüştürüldü.
      Mevcut kod GR-SP05'e zaten uyumlu.
    priority: "medium"
    status: "completed"
    phase: 1
    dependencies: []
    guardrails:
      - GR-SP05   # temiz kod
    affected_files:
      - "src/components/app.js"

  - id: "CLEAN-005"
    title: "Fonksiyon boyutlarını 80 satır altına düşür"
    description: >
      80 satırı geçen tüm fonksiyonları tespit et, daha küçük
      parçalara böl. Nested derinliği max 2 ile sınırla.
      TAMAMLANDI:
      - progress.js renderWeeklyPlanner (~112 satır) → 3 fonksiyon (max 67 satır)
      - progress.js renderProgress (~102 satır) → 2 fonksiyon (max 74 satır)
      - app.js DOMContentLoaded (~701 satır) → 23 init fonksiyonu (max ~50 satır)
      - focus.js renderFocusTimerCard ~513 satır → zaten parçalanmış (19 satır)
    priority: "medium"
    status: "completed"
    phase: 1
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-SP01   # fonksiyon boyutu
    affected_files:
      - "src/components/progress.js"
      - "src/components/app.js"

  - id: "CLEAN-006a"
    title: "Naming Convention uygula"
    description: >
      GR-SP04 kurallarına göre tüm kod taranmıştır.
      camelCase (fonksiyon), PascalCase (component), UPPER_SNAKE (sabit),
      _prefix (private), is/has/can prefix (boolean) — tümü uyumlu.
      Önceki refactor'lardan zaten temiz, ek müdahale gerekmedi.
    priority: "medium"
    status: "completed"
    phase: 1
    dependencies: []
    guardrails:
      - GR-SP04   # naming convention
    affected_files:
      - "src/"

  - id: "CLEAN-007"
    title: "Cloud Functions karmaşıklık azaltma (trigger/logic ayrımı)"
    description: >
      functions/index.js (443 satır, CC ~60+, derinlik 5) refactor edildi.
      Yapılan: (1) Saf mantık functions/logic.js'ye taşındı (zaman/pencere
      hesapları, ilerleme/seri, payload üreticileri, WINDOWS tablosu) —
      firebase/web-push import'u yok. (2) morning/urgency/night'ın 3 özdeş
      bloğu tek sendWindowNotification + WINDOWS tablosuna indirildi (DRY).
      (3) loadUserContext, getActiveSubscriptions, sendStreakMilestoneNotifications,
      processUser çıkarıldı; tüm fonksiyonlar ≤80 satır, nesting ≤2.
      (4) Deploy güvenliği: index.js export yüzeyi tek isim
      (sendScheduledReminders) — helper'lar trigger olarak sızmaz (ADR-0006).
      (5) functions'da Vitest kuruldu: test/logic.test.js (58 golden test) +
      test/index.test.js (2 smoke test) = 60/60 yeşil. (6) Davranış değişmedi;
      kök 178/178 test hâlâ yeşil.
    priority: "high"
    status: "completed"
    phase: 1
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-SP01   # fonksiyon boyutu & derinlik
      - GR-SP02   # DRY
      - GR-SP03   # single responsibility
    affected_files:
      - "functions/index.js"
      - "functions/logic.js"
      - "functions/package.json"
      - "functions/vitest.config.js"
      - "functions/test/logic.test.js"
      - "functions/test/index.test.js"
      - "docs/architecture/adr/0006-cloud-functions-module-split.md"

  # ============================================================
  # MAINT: Bakım
  # ============================================================

  - id: "MAINT-001"
    title: "Firebase SDK güncelle"
    description: >
      Firebase Compat SDK'ları (şu an 10.7.1) son stabil sürüme güncelle.
      Breaking change kontrolü yap.
    priority: "low"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-GV01   # güvenlik
    affected_files:
      - "index.html"   # <script> tag'leri (10.7.1 → 12.13.0)

  - id: "MAINT-002"
    title: "PWA icon ve manifest güncelle"
    description: >
      Kontrol: (1) manifest.json geçerli JSON, theme_color=background_color=#0F1638. ✅
      (2) icon-192.png (1385 bytes) ve icon-512.png (4891 bytes) mevcut ve geçerli. ✅
      (3) index.html theme-color meta #0F1638. ✅ (4) sw.js v10, her iki icon STATIC_ASSETS'te. ✅
      (5) icon-192.png.png ve icon-512.png.png hatalı kopyaları temizlendi.
      Tüm GR-PW01 kontrollerinden geçti.
    priority: "low"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-PW01   # PWA kontrolü
    affected_files:
      - "manifest.json"
      - "icon-192.png"
      - "icon-512.png"
      - "index.html"

  - id: "MAINT-003"
    title: "Firestore rules optimizasyonu"
    description: >
      firestore.rules içindeki validasyon fonksiyonlarını gözden geçir,
      gereksiz kısıtlamaları kaldır, performans için optimize et.
      Yapılan: (1) Tüm validasyon fonksiyonları (10 adet) app verisiyle
      karşılaştırıldı — tam uyum, hiçbir alan eksik/fazla değil.
      (2) 10 koleksiyonun tümünde yazılan alanlar rules'daki validasyonla
      birebir örtüşüyor. (3) isOwner() placeholder email düzeltmesi
      GUVENLIK-002'de yapıldı. (4) Gereksiz kısıtlama bulunamadı —
      mevcut validasyonlar anlamlı ve yeterli.
    priority: "medium"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-FB01   # firestore rules
      - GR-FB02   # auth whitelist
    affected_files:
      - "firestore.rules"

  - id: "MAINT-004"
    title: "Error logging iyileştirmesi"
    description: >
      Hata loglarının Firestore'a yazılması mekanizması iyileştirildi.
      Yapılan: (1) pendingErrorUploads kuyruğu max 100 ile sınırlandı
      (PENDING_ERROR_UPLOAD_MAX). (2) Batch yazma hatasında 3 kez
      exponential backoff ile tekrar deneme eklendi (ERROR_UPLOAD_RETRY_DELAYS:
      2s/4s/8s). (3) Hata oluştuğunda syncStatus elemanında hata sayısı
      gösteren alarm/badge eklendi (10sn rate-limited, var(--danger) rengi).
      (4) Rate limit aşıldığında sessizce düşmek yerine kalan süre kadar
      bekleyip yeniden dener. 178/178 test geçiyor.
    priority: "low"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-GV01   # veri sızıntısı kontrolü
      - GR-SP01   # fonksiyon boyutu
    affected_files:
      - "src/services/sync.js"

  - id: "MAINT-005"
    title: "Performans optimizasyonu"
    description: >
      Render performansını iyileştir: sanal kaydırma (virtual scroll),
      requestAnimationFrame kullanımı, DOM batch güncellemeleri.
      Mobil cihazlarda PERFORMANCE_MODE optimizasyonunu genişlet.
      PERFORMANCE_MODE confetti, heatmap ve CSS'e yaygınlaştırıldı.
      transition:all spesifik property'lere daraltıldı.
      bg-shapes animasyonlarına will-change eklendi.
    priority: "medium"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-SP01   # fonksiyon boyutu
      - GR-SP05   # temiz kod
    affected_files:
      - "app-v5.js"
      - "style.css"

  # ============================================================
  # FEAT: Yeni Özellik
  # ============================================================

  - id: "FEAT-001"
    title: "Smart bildirim sistemi iyileştirmesi"
    description: >
      Web push bildirimlerini iyileştir: akıllı hatırlatma algoritması,
      haftalık özet push, özel hedef bildirimleri.
      Cloud Functions tarafını güncelle.
    priority: "medium"
    status: "pending"
    phase: 3
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-FB01   # firestore'a yeni field
      - GR-GV01   # input sanitization
      - GR-SP03   # single responsibility
    affected_files:
      - "app-v5.js"
      - "functions/index.js"

  - id: "FEAT-002"
    title: "Focus timer geliştirmeleri"
    description: >
      Focus timer'a yeni özellikler: ambient ses, istatistik
      grafikleri, hedef link sistemi iyileştirmesi.
    priority: "medium"
    status: "pending"
    phase: 3
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-SP01   # fonksiyon boyutu
      - GR-SP02   # DRY
      - GR-SP03   # single responsibility
    affected_files:
      - "app-v5.js"

  - id: "FEAT-003"
    title: "Raporlama / Analytics sekmesi"
    description: >
      Kullanıcıya haftalık/aylık/yıllık ilerleme raporları sunan
      yeni bir sekme. Grafikler, istatistikler, trend analizi.
    priority: "low"
    status: "pending"
    phase: 3
    dependencies:
      - "CLEAN-001"
    guardrails:
      - GR-SP01   # fonksiyon boyutu
      - GR-SP02   # DRY
      - GR-SP03   # single responsibility
      - GR-SP05   # temiz kod
    affected_files:
      - "app-v5.js"
      - "index.html"
      - "style.css"

  # ============================================================
  # GUVENLIK: Güvenlik
  # ============================================================

  - id: "GUVENLIK-001"
    title: "Auth whitelist yönetim mekanizması"
    description: >
      ALLOWED_EMAILS artık Firestore'dan dinamik okunuyor.
      Yapılan: (1) firestore.rules — config/whitelist okuma kuralı eklendi
      (isSignedIn() okuyabilir, whitelist üyeleri yazabilir). (2) firebase.js —
      _loadDynamicWhitelist() Firestore'dan config/whitelist.emails dizisini
      okuyup STATIC_ALLOWED_EMAILS ile birleştirir. (3) onAuthStateChanged
      callback'inde whitelist önce yüklenir, sonra kontrol edilir. (4) Admin
      paneli gerekmez — Firebase Console'dan config/whitelist doc'una emails[]
      eklenerek yeni kullanıcı eklenir. (5) Testler güncellendi (async callback).
      178/178 test geçiyor.
    priority: "medium"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-FB01   # firestore rules güncelleme
      - GR-FB02   # auth whitelist (2 dosya)
      - GR-GV01   # güvenlik
    affected_files:
      - "src/services/firebase.js"
      - "firestore.rules"
      - "src/__tests__/firebase.test.js"

  - id: "GUVENLIK-002"
    title: "API key güvenlik denetimi"
    description: >
      Firebase config dışında hardcoded API key var mı kontrol et.
      Hassas verilerin loglanmadığından emin ol. XSS vektörlerini tara.
      Yapılan: (1) Tüm JS tarandı — hardcoded API key yok. (2) console.log/warn
      sadece DEBUG_MODE korumalı. (3) innerHTML kullanımı safeText/escapeHtml
      ile sanitize edilmiş. (4) firestore.rules isOwner()'daki placeholder email
      kaldırıldı (uid bazlı kontrol). (5) README.md güncellendi.
    priority: "high"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-GV01   # güvenlik
      - GR-SP05   # temiz kod
    affected_files:
      - "app-v5.js"
      - "index.html"
      - "sw.js"

  - id: "GUVENLIK-003"
    title: "Public repo guvenlik temizligi"
    description: >
      Open-source yayina hazirlik icin hardcoded VAPID private key kaldirildi,
      Firebase proje config'i placeholder yapildi, whitelist e-postalari
      anonimlestirildi, cache/output/auth export dosyalari Git takibinden
      cikarildi ve public guvenlik dokumantasyonu eklendi.
    priority: "critical"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-GV01
      - GR-FB02
      - GR-SP05
    affected_files:
      - "src/services/firebase.js"
      - "src/services/auth.js"
      - "src/utils/constants.js"
      - "src/components/settings.js"
      - "src/config/firebase-config.js"
      - "src/config/firebase-config.example.js"
      - "functions/index.js"
      - "firestore.rules"
      - ".gitignore"
      - "functions/.gitignore"
      - ".firebaserc.example"
      - "README.md"
      - "SECURITY.md"

  # ============================================================
  # BUG: Bug Fix'ler
  # ============================================================

  - id: "BUG-001"
    title: "Voice recognition tekrar eden kelime bug'ı"
    description: >
      Sesli not alırnda onresult event'i birden fazla kez tetikleniyor
      ve önceki final sonuçlar tekrar ekleniyor. lastProcessedResultIndex
      takibi ile sadece yeni sonuçlar eklenmeli.
    priority: "high"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-SP05   # temiz kod
    affected_files:
      - "app-v5.js"

  - id: "BUG-002"
    title: "Dashboard'dan todo tamamlanamıyor"
    description: >
      Dashboard'daki bekleyen görevler sadece görüntülenebiliyor,
      tik atılamıyor. Checkbox'a onclick handler eklenmeli.
    priority: "high"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-SP03   # single responsibility
    affected_files:
      - "app-v5.js"

  - id: "BUG-003"
    title: "renderMoodHistory fonksiyonu kaybolmuş"
    description: >
      CLEAN-001 (modülerleştirme) sırasında renderMoodHistory fonksiyonu
      component'lere taşınırken kayboldu. progress.js:380'de çağrılıyordu
      ama hiçbir dosyada tanımlı değildi.
      Fonksiyon CSS class'ları (mood-history-*) ve mevcut helper'lar
      (getMoodEntriesForYear, getMoodMeta) kullanılarak yeniden inşa
      edildi ve src/components/progress.js'e eklendi.
    priority: "high"
    status: "completed"
    phase: 1
    dependencies: []
    guardrails:
      - GR-SP01   # fonksiyon max 80 satır (78 satır)
      - GR-SP03   # single responsibility
      - GR-SP04   # naming convention
      - GR-SP05   # temiz kod (escapeHtml kullanıldı)
    affected_files:
      - "src/components/progress.js"
      - "src/components/stats.js"   # yorum güncellendi

  - id: "BUG-004"
    title: "Todo tamamlama senkronizasyon fix - debounce, auth churn, cross-tab"
    description: >
      Tamamlanan todolar debounce+auth churn+sayfa kapanma senaryolarında
      kaybolup completed=false olarak geri geliyordu.
      Fix: (1) toggleTodo artık immediate save yapar (250ms beklemek yerine
      direkt localStorage'a yazar). (2) LOCAL_SAVE_DEBOUNCE_MS 250→100ms
      düşürüldü. (3) Firebase onAuthStateChanged(null) branşı artık
      bekleyen cloudSaveTimer'ı iptal etmiyor (null user'da save sessizce
      döner, veri kaybolmaz). (4) Cross-tab koruması için storage event
      listener eklendi (başka tab yazınca lastPersistedPayload güncellenir).
    priority: "high"
    status: "completed"
    phase: 2
    dependencies: []
    guardrails:
      - GR-SP03   # single responsibility
      - GR-SP05   # temiz kod
    affected_files:
      - "src/components/todos.js"
      - "src/utils/constants.js"
      - "src/services/firebase.js"
      - "src/services/storage.js"

  - id: "BUG-005"
    title: "Todo silme senkronizasyon kaliciligi"
    description: >
      Silinen gorevlerin Firebase load/save yarisi, debounce veya cross-tab stale
      state nedeniyle geri gelmesini engelle. Fix: soft delete ve trash restore
      aksiyonlari immediate save kullanir; auth null state pending cloud save'i
      sifirlamaz; storage event diger tabdan gelen payload'i appData'ya uygular;
      cloud merge yerel cop kutusunda daha yeni silinmis item'lari tekrar listeye
      eklemez.
    priority: "high"
    status: "completed"
    phase: 2
    dependencies:
      - "BUG-004"
    guardrails:
      - GR-SP03   # single responsibility
      - GR-SP05   # temiz kod
    affected_files:
      - "src/components/habits.js"
      - "src/services/dataLayer.js"
      - "src/services/firebase.js"
      - "src/services/storage.js"
      - "src/__tests__/dataLayer.test.js"

  # ============================================================
  # FEAT-004: İleri Tarihli Todo'lar
  # ============================================================

  - id: "FEAT-004"
    title: "İleri tarihli todo'lar ve dashboard yarın bölümü"
    description: >
      Todo'lara dueDate (son tarih) alanı ekle. Todo ekleme UI'ına
      tarih seçici ekle. Dashboard'da yarınki görevleri gösteren
      bölüm ekle. Firestore rules validasyonu güncelle.
    priority: "high"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-FB01   # firestore rules
      - GR-SP03   # single responsibility
      - GR-SP04   # naming
    affected_files:
      - "app-v5.js"
      - "index.html"
      - "firestore.rules"
      - "sw.js"

  # ============================================================
  # CLEAN-006: Test Altyapısı (Vitest + Playwright + CI)
  # ============================================================

  - id: "CLEAN-006"
    title: "Test altyapısı kurulumu"
    description: >
      Projeye test altyapısı kuruldu. Vitest ile birim testleri
      (escapeHtml, truncateText, sanitizeColor, normalizeDateValue,
      normalizeAppData, mergeAppDataForSync, buildCloudWriteOperations,
      saveToCloud), Playwright ile E2E smoke testleri yazıldı.
      GitHub Actions CI workflow eklendi.
    priority: "critical"
    status: "completed"
    phase: 1
    dependencies: []
    guardrails:
      - GR-SP05
      - GR-SP04
    affected_files:
      - "package.json"
      - "vitest.config.js"
      - "playwright.config.js"
      - "src/__tests__/setup.js"
      - "src/__tests__/utils.test.js"
      - "src/__tests__/dataLayer.test.js"
      - "test/e2e/smoke.spec.js"
      - ".github/workflows/test.yml"
      - ".gitignore"

  - id: "FEAT-005"
    title: "Yeni tema seçenekleri"
    description: >
      Ayarlar modalındaki 'Tema Seç' alanına yeni hazır temalar
      (aurora, coral, amber, slate, pearl) ekle.
    priority: "medium"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-SP02
      - GR-SP03
      - GR-SP04
      - GR-SP05
      - GR-GV01
    affected_files:
      - "index.html"
      - "style.css"

  - id: "FEAT-006"
    title: "Glassmorphism Efektlerinin Derinleştirilmesi"
    description: >
      Koyu arka planlı temalarda (dark, aurora, slate, midnight) kartlara
      saydamlık, backdrop-filter ve gradyan border özellikleri ekleyerek
      premium cam efektini uygula.
    priority: "medium"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-SP02
      - GR-SP03
      - GR-SP05
    affected_files:
      - "style.css"

  - id: "FEAT-007"
    title: "Oyunlaştırma Efektlerinin Canlandırılması"
    description: >
      XP kazanımlarında tıklama yerinden süzülen +XP metin efekti, level up
      anlarında parlama/nabız animasyonu ve XP progress bar üzerinde sürekli
      akan shimmer dalga efekti ekle.
    priority: "medium"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-SP02
      - GR-SP03
      - GR-SP05
    affected_files:
      - "src/components/stats.js"
      - "style.css"

  - id: "FEAT-008"
    title: "SVG İkon Standardizasyonu"
    description: >
      Arayüzdeki tüm emojileri (bell, gear, book, memo, streak, target, calendar, check)
      minimalist, ince çizgilere sahip SVG ikonlarla değiştirerek görsel tutarlılığı sağla.
    priority: "medium"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-SP02
      - GR-SP03
      - GR-SP05
    affected_files:
      - "index.html"
      - "src/components/dashboard.js"
      - "src/components/habits.js"
      - "style.css"

  - id: "FEAT-009"
    title: "Dinamik ve Yumuşatılmış Aktivite Heatmap'i"
    description: >
      Aktivite haritası (heatmap) hücrelerinin köşelerini yuvarlat (border-radius: 3px),
      hover durumunda transform-scale, gölge ve z-index ekle,
      aktivite seviyesi renklerini CSS color-mix ile seçili temanın primary rengine bağla.
    priority: "medium"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-SP05
    affected_files:
      - "style.css"

  - id: "GENESIS-001"
    title: "Genesis governance bootstrap"
    description: >
      Projeye Genesis yönetişim çerçevesini entegre et:
      - AGENTS.md Genesis formatına yükselt (guardrail ID'leri koru)
      - docs/memory/ (context, progress, decisions) oluştur
      - skills/ sistemini ekle (ponytail, caveman, clean-code, wrap-session, write-adr, write-tests, review-own-diff)
      - docs/process/ (workflow, ai-session-protocol, conventions, definition-of-done, security, automation) oluştur
      - docs/architecture/adr/ (ADR-0001 ila ADR-0004) oluştur
      - docs/product/ (vision, roadmap) oluştur
      - genesis-master/ referans klasörünü kaldır
    priority: "high"
    status: "completed"
    phase: 0
    dependencies: []
    guardrails:
      - GR-SP05
    affected_files:
      - "AGENTS.md"
      - "docs/memory/context.md"
      - "docs/memory/progress.md"
      - "docs/memory/decisions.md"
      - "docs/process/*"
      - "docs/architecture/adr/*"
      - "docs/product/*"
      - "docs/design/design-system.md"
      - "docs/features/_template.md"
      - "skills/*"
      - "task.md"

  - id: "FEAT-010"
    title: "Dinamik Yükleme Skeleton Ekranları ve Animasyonlu Boş Durumlar"
    description: >
      Google Kitaplar API araması sırasında 3'lü pulsing skeleton loader kartları ekle.
      Alışkanlıklar, Kitaplar, Görevler ve Notlar sekmelerindeki düz emoji boş durum ikonlarını
      CSS keyframe animasyonları ile hareketlendirilen inline SVG'lerle değiştir.
    priority: "medium"
    status: "completed"
    phase: 3
    dependencies: []
    guardrails:
      - GR-SP01
      - GR-SP02
      - GR-SP03
      - GR-SP05
    affected_files:
      - "style.css"
      - "src/components/app.js"
      - "src/components/habits.js"
      - "src/components/books.js"
      - "src/components/todos.js"
      - "src/components/notes.js"

# ===== Bağımlılık Zinciri =====
# CLEAN-001 → CLEAN-002, CLEAN-003, CLEAN-005, CLEAN-006
# CLEAN-001 → FEAT-001, FEAT-002, FEAT-003
# MaINT tasks: bağımsız, paralel çalışabilir
