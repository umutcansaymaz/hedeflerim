# ADR-0006: Cloud Functions Trigger/Logic Ayrımı

**Status:** Accepted

## Context
`functions/index.js` ~443 satırlık tek dosyaydı; zamanlanmış push bildirim
fonksiyonu içinde karmaşıklık yüksekti (cyclomatic ~60+, nesting derinliği 5,
morning/urgency/night blokları 3 kez tekrar ediyordu). GR-SP01 (≤80 satır,
derinlik ≤2) ve GR-SP02 (DRY) ihlalleri mevcuttu.

İki zorunluluk refactor'u şekillendirdi:

1. **Test edilebilirlik**: Davranış değiştiren kod testle gelir (AGENTS.md).
   Firestore/web-push'a bağımlı fonksiyonlar birim testte mock ister; saf
   mantık ise mocksuz test edilir.
2. **Deploy güvenliği (gotcha)**: Cloud Functions'ta `index.js`'ten export
   edilen her isim bir fonksiyon trigger'ı olarak deploy edilmeye çalışılır.
   Test için helper export etmek `firebase deploy --only functions`'ı kırar.

## Decision
- **`functions/logic.js`** — saf iş mantığı: zaman/pencere hesapları,
  ilerleme/seri kilometre taşları, bildirim içerik üreticileri, WINDOWS
  tablosu. Firebase/web-push import'u YOK. `module.exports` ile export edilir
  ama deploy'a trigger olarak sızmaz (yalnızca `index.js`'in export'ları
  trigger sayılır).
- **`functions/index.js`** — yalnızca trigger + I/O: Firestore okuma/yazma,
  web-push gönderimi, orkestrasyon. Export yüzeyi TEK isim:
  `sendScheduledReminders`.
- **`functions/test/`** — Vitest: `logic.test.js` (golden testler) +
  `index.test.js` (export yüzeyi smoke testi, helper sızıntısını yakalar).

## Consequences
- Push bildirim davranışı değişmedi; golden testler (60 test) kaymayı yakalar
- Yeni bildirim penceresi eklemek = WINDOWS tablosuna bir satır (DRY)
- `functions/` içinde yeni dosya eklenirse firebase deploy otomatik yükler
  (dizin bazlı deploy), ek konfigürasyon gerekmez
- Deploy sırasında `logic.js` ayrı fonksiyon olarak görünmez — CLI yalnızca
  export edilen trigger'ları listeler
