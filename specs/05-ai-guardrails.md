# 05-ai-guardrails.md

> `AGENTS.md` genel guardrail kaynağıdır (GR-SP01–GR-SP06, GR-FB01–GR-FB02, GR-PW01, GR-GV01). Bu dosya sadece Hedeflerim projesine özel riskli alanları ve projeye özel çalışma kurallarını belirtir.

## Firestore Rules — En Sık Atlanan Risk

- Yeni field eklemek = `firestore.rules`'ta **validasyon fonksiyonu** yazmak zorunludur
- Mevcut pattern: `validXxxDoc()` fonksiyonu + `match` rule
- Yeni koleksiyon = yeni `validXxxDoc()` + yeni `match /users/{userId}/xxx/{id}`
- `request.resource.data.keys().hasOnly([...])` kullan — beklenmeyen field'leri engelle
- `isShortString(value, maxLen)` helper'ı mevcut — kullan
- Rules deploy: `firebase deploy --only firestore:rules`

## Auth Whitelist — 3 Dosya Kuralı

Yeni kullanıcı ekleme = **üç dosya** güncellenmeli:

1. `app-v5.js` — `ALLOWED_EMAILS` array (satır ~59-62)
2. `firestore.rules` — `isOwner()` function (satır ~8-13)
3. `functions/index.js` — (varsa whitelist kontrolü)

> **Kullanıcıdan onay al.** Bu değişiklik canlı auth akışını etkiler.

## Firebase Functions v2 — Hassas Zamanlama

- `functions/index.js`: Scheduled function (`onSchedule`)
- Timezone sabit: `Europe/Istanbul`
- VAPID keys hardcoded (`functions/index.js` satır 10-11)
- Push notification timing sabitleri (satır 16-21): sabah 07:30, aciliyet 21:00, gece 22:30
- **Değişiklik etkisi:** Tüm kullanıcıların bildirim zamanlarını etkiler
- Deploy: `firebase deploy --only functions`

## Service Worker / PWA Cache — Versiyon Kuralı

- `sw.js` içinde `CACHE_NAME` sabiti var (`habit-tracker-vX.Y-frontend-prod`)
- **Her önemli değişiklikte** versiyonu artır
- Aksi halde kullanıcı eski cache'i görmeye devam eder
- `manifest.json` değişikliği varsa da cache bust gerekir
- Offline-first strateji: network fail → cache fallback → navigate → `index.html`

## Hard Delete — Çöp Kutusu Kuralı

- Uygulamada **soft delete** mekanizması var (`trashBin`, 30 gün saklama)
- Kullanıcı "Sil" dediğinde çöp kutusuna gider
- Hard delete (kalıcı silme) sadece:
  - Çöp kutusu "Tamamen Sil" butonu ile
  - Veya 30 gün otomatik prune
- **Kural:** Hard delete yapacak kod yazacaksan kullanıcıdan `confirm()` ile onay al
- Çöp kutusu dışında kalıcı silme **yapma**

## Schema Değişikliği — Geriye Dönük Uyumluluk

- `normalizeAppData()` güncelle (yeni field default değeri)
- `firestore.rules` güncelle (validasyon)
- `defaultData` objesini güncelle (satır ~1047)
- Geriye dönük uyumluluk koru:
  - Eski veride yeni field yoksa default kullan
  - `schemaVersion` kontrolü mevcut (v1 → v2 migration desteği var)
- **Kullanıcıdan onay al.** Schema değişikliği veri kaybı riski taşır.

## Diğer Riskli Alanlar

| Alan | Risk | Önlem |
|------|------|-------|
| `app-v5.js` boyutu (~9700 satır) | Parse süresi, mobil performans | Büyük değişiklikleri küçük adımlarla yap |
| Cloud sync race condition | İki cihazda aynı anda write | `cloudSaveInFlight` / `cloudLoadInFlight` flag'lerine dokunma |
| `localStorage` limiti (~5MB) | Veri büyüklüğü | `appData`'yı komple localStorage'a yazma — sadece persist gerektiğinde |
| Hardcoded API keys | Firebase config zaten client-side | VAPID keys (`functions/index.js`) daha hassas — başka yere taşıma |
| Inline `onclick` XSS | `escapeHtml()` kullanılmalı | Mevcut kodda `escapeHtml()` + `escapeJsSingleQuote()` kullanılıyor — yeni kodda da kullan |

## Kullanıcı Onayı Gereken Durumlar

- Auth whitelist değişikliği
- Firestore schema değişikliği
- Functions deploy zamanlama değişikliği
- `sw.js` cache stratejisi değişikliği
- Hard delete (trash dışı kalıcı silme)
- Yeni CDN dependency ekleme
- 3+ dosyayı aynı anda değiştiren refactor
