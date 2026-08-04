# Context — Mevcut Çalışma Durumu

> Son güncelleme: 2026-08-04 — CLEAN-007 tamam, Phase 3 bekliyor

## Aşama

**Phase 3 — Yeni Özellik** (CLEAN + MAINT + GUVENLIK Phase 1-2 + CLEAN-007 tamam)

## Cloud Functions Durumu

| Öğe | Durum | Detay |
|-----|-------|-------|
| Trigger/logic ayrımı | ✅ | Saf mantık `functions/logic.js`, I/O `functions/index.js` (ADR-0006) |
| Export yüzeyi | ✅ | Tek isim `sendScheduledReminders` (helper sızmaz) |
| Fonksiyon boyutu | ✅ | ≤80 satır, nesting ≤2 (GR-SP01) |
| DRY | ✅ | 3 pencere bloğu → WINDOWS tablosu + sendWindowNotification |
| Testler | ✅ | functions 60/60, kök 178/178 yeşil |

## Global Değişken Durumu

328 `window.X =` export → 4 namespace'te toplandı:
- `window.C` (constants, 30)
- `window.Utils` (helpers, 39)
- `window.Services` (services+state, ~61)
- `window.Components` (components, ~194)
- 3 config global (HDEFLERIM_*) + 1 var appData (store.js geçici)
- 27 store path _exposeToGlobal (Object.defineProperty)

## Aktif Kısıtlamalar

- Proje **Türkçe** repo dilindedir (kod, yorum, doküman, commit)
- ~2 kullanıcı (email whitelist ile)
- Vanilla JS, bundler yok, ES6+ modüller yok (script tag ile yükleme)
- Firebase Auth, Firestore, Cloud Functions
- PWA (Service Worker v10, Manifest)
- Vitest + Playwright test altyapısı mevcut

## Güvenlik Durumu

| Öğe | Durum | Detay |
|-----|-------|-------|
| Hardcoded API key | ✅ | Yok (placeholder pattern) |
| XSS (innerHTML) | ✅ | safeText/escapeHtml sanitizasyonu |
| console.log leak | ✅ | DEBUG_MODE korumalı |
| Firestore rules email | ✅ | isOwner() artık uid bazlı |
| VAPID keys | ✅ | process.env'den (functions) |

## PWA Durumu

| Özellik | Durum | Detay |
|---------|-------|-------|
| Service Worker | ✅ | v10, 23 JS dosyası cache'li, Cache-First strateji |
| Install Prompt | ✅ | beforeinstallprompt + ayarlarda buton |
| Offline | ✅ | JS/CSS cache'li, offline splash error mesajlı |
| Icon'lar | ✅ | 192x192 ve 512x512 ayrı dosyalar |
| Splash Screen | ✅ | 8sn timeout + hata mesajı |
| iOS | ✅ | apple-touch-icon, black status bar |
| Push Notification | ✅ | Firebase Cloud Functions (15 dk) |
| Background Sync | ❌ | Manuel sync mevcut, otomatik yok |

## Mevcut Varlıklar

- `task.md` — görev listesi (CLEAN/MAINT/FEAT/BUG/GUVENLIK)
- `docs/memory/` — Genesis memory bank
- `skills/` — Genesis yetenek sistemi
- `docs/process/` — süreç dokümanları
- `src/` — modüler kod yapısı

## Açık Sorular

- Background Sync API eklenmeli mi? (şu an manuel sync çalışıyor)
- specs/ klasörü docs/ altına taşınmalı mı?

## Sonraki Agent İçin İpucu

Phase 1-2 tamam (CLEAN-001→006, MAINT-001→005, GUVENLIK-001→003) + CLEAN-007
(functions refactor). Sıradaki: FEAT-001 (akıllı bildirim) veya FEAT-002
(focus timer geliştirme). FEAT-001 daha yüksek öncelik — not: FEAT-001
kapsamında functions/index.js'e özellik eklenirse logic.js'ye saf fonksiyon,
index.js'e I/O olarak yazılmalı (ADR-0006).
