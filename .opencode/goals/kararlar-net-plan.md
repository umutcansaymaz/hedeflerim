# GOAL
Kararlar net. Plan:
# Refactor Planı: functions/index.js Karmaşıklık Azaltma (CLEAN-007)

## Hedef
`functions/index.js` (443 satır, CC ~60+, derinlik 5) → GR-SP01 (max 80 satır / derinlik 2), GR-SP02 (DRY), GR-SP03 (single responsibility) uyumlu yapı. **Sıfır davranış değişikliği** — golden testlerle garanti.

## 1. Yeni dosya yapısı

**`functions/logic.js`** (yeni, saf — hiçbir firebase/web-push import'u yok, sadece Intl/Node built-in):
- Sabitler: `FALLBACK_TIMEZONE`, `STREAK_MILESTONES`, `WEEKDAY_INDEX`, `WINDOWS` tablosu (id, start, end, stateKey, keySuffix, build fns) — morning/urgency/night'ı tek tabloya indirir
- `asMap`, `isCompletionDone` (+ `isCompletionObjectDone` helper ile 8 dal → iki küçük fonksiyon)
- `normalizeTimeZone`, `getTimeZoneParts`, `toDateKey`
- `getHabitProgressForDate`, `calculateStreak`, `getMilestoneHabits`
- `buildMorningPayload`, `buildUrgencyPayload`, `buildNightPayload`, `buildStreakMilestonePayload` (sabit)
- `getActiveWindows(currentMinutes)` — sınır dahil eşleşme (`>= START && <= END`)
- `isWindowDue(window, todayKey, pushState)` — dedupe key kontrolü

**`functions/index.js`** (incelir ~150 satıra):
- `configureWebPush`, `normalizeSubscriptionData`, `sendPushToSubscriptions` (sabit, zaten iyi)
- `loadUserContext(userRef)` → tek `Promise.all` 4 okuma
- `getActiveSubscriptions(subsSnap)` → enabled filtre
- `sendWindowNotification({window, progress, todayKey, pushState, subscriptions})` → 3 özdeş bloğu (satır 370-424) tek fonksiyona indirir; `sentX` sayacı + pushState key'i sadece `successCount > 0` ise yazar
- `sendStreakMilestoneNotifications(...)` → milestone bloğu (morning penceresine bağlı kalır)
- `processUser(userDoc, now)` → orkestrasyon (~45 satır, derinlik ≤ 2)
- `exports.sendScheduledReminders = onSchedule(...)` → ince döngü + `logger.info` özeti (key'ler aynı)

## 2. Korunacak davranışlar (golden kriterler)
- Window sınırları dahil, dedupe key formatları (`todayKey|morning` vb., `streakMilestones[id_streak]`)
- Gate'ler: morning/night `totalHabits > 0`, urgency `remainingHabits > 0`
- Milestone `streak === milestone` (eşitlik, büyüktür değil); yalnızca bugün tamamlananlar
- pushState: merge:true, `serverTimestamp`, `timezone`, `updatedAt` — yalnız update varsa yazılır
- 404/410 → batch delete; timezone sırası: sub.timezone → settings.notificationTimezone → fallback
- **Deploy güvenliği**: index.js'te tek export `sendScheduledReminders` (helper'lar export edilmez — trigger olarak deploy edilirdi)

## 3. Testler
- `functions/package.json`: `vitest` devDependency + `"test": "vitest run"` script
- **`functions/test/logic.test.js`**: tablo bazlı golden testler — `isCompletionDone` (11 giriş tipi), payload'lar (1/≤3/>3 habit; night 4 oran), window boundary değerleri, streak 7/30/100, dedupe key'ler, timezone fallback. Rastgele selamlama dizilerinde üyelik assert'i (tam metin değil)
- **`functions/test/index.test.js`** (smoke): `vi.mock` firebase-admin/firebase-functions/web-push ile index.js yüklenir, export'ta tek trigger olduğu assert edilir

## 4. Dokümantasyon & Kayıt
- `docs/architecture/adr/0006-cloud-functions-module-split.md` — trigger/logic ayrımı (deploy gotcha + test edilebilirlik gerekçesi)
- `task.md` → `CLEAN-007` kaydı (guardrails: GR-SP01/02/03, yüksek öncelik)
- Oturum sonu: `docs/memory/progress.md` + `context.md` güncelleme

## 5. Doğrulama
1. `npm test --prefix functions` → yeni testler yeşil
2. `npm test` (kök) → mevcut 178 test etkilenmemiş
3. Manuel: `firebase deploy --only functions` (kullanıcı, kredi gerektirir)

## Dosya listesi
- Değişen: `functions/index.js`, `functions/package.json`, `task.md`, `docs/memory/*`
- Yeni: `functions/logic.js`, `functions/test/logic.test.js`, `functions/test/index.test.js`, `docs/architecture/adr/0006-cloud-functions-module-split.md`

**Riskler**: rastgele mesajlar → üyelik assert'i; deploy export sızıntısı → smoke test; davranış kayması → golden testler. Onay verirsen uygulamaya geçerim.

## STATUS
done

## DONE_WHEN
- `functions/logic.js` oluşturuldu; firebase/web-push import'u İÇERMEZ (saf)
- `functions/index.js`'teki morning/urgency/night blokları tek `sendWindowNotification` ile değişti; her fonksiyon ≤ 80 satır, nesting ≤ 2
- `functions/index.js` tek export: `sendScheduledReminders` (helper export edilmez)
- `npm test --prefix functions` → logic.test.js + index.test.js yeşil
- Kök `npm test` (178 test) hâlâ yeşil
- `docs/architecture/adr/0006-cloud-functions-module-split.md` yazıldı
- `task.md`'ye CLEAN-007 kaydı eklendi
- `docs/memory/progress.md` + `docs/memory/context.md` güncellendi

## CONSTRAINTS
- Sıfır davranış değişikliği: golden davranışlar (dedupe key'ler, gate'ler, pushState yazma koşulları, 404/410 batch delete, timezone sırası) birebir korunur
- Deploy güvenliği: helper'lar `module.exports`'tan kesinlikle dışarı sızar
- Repo dil politikası: kod yorumları ve dokümantasyon TÜRKÇE
- GR-SP01 (≤80 satır, derinlik ≤2), GR-SP02 (DRY), GR-SP03 (tek sorumluluk) uyumu
- Otomatik commit YOK (kullanıcı isterse commit)
- `firebase-functions` v2 API ve mevcut sabitler (window dakikaları, milestone değerleri) DEĞİŞMEZ

## PLAN
1. **Altyapı**: functions/package.json'a `vitest` devDependency + `"test": "vitest run"` script
2. **logic.js**: Saf fonksiyonlar + WINDOWS tablosu (fonksiyon bazlı taşıma, davranış aynı)
3. **index.js refactor**: loadUserContext, getActiveSubscriptions, sendWindowNotification, sendStreakMilestoneNotifications, processUser çıkarımı; tek export
4. **Testler**: test/logic.test.js (golden) + test/index.test.js (smoke)
5. **Doğrulama**: `npm test --prefix functions` + kök `npm test`
6. **Dokümantasyon**: ADR-0006, task.md CLEAN-007, memory bank

## NEXT
1. ✅ functions/package.json'a vitest + test script eklendi (vitest ^3.2.7)
2. ✅ functions/logic.js oluşturuldu (WINDOWS tablosu + 19 export, saf)
3. ✅ functions/index.js refactor edildi (443→260 satır, tek export, derinlik ≤2, 80 satır sınırı)
4. ✅ functions/test/logic.test.js yazıldı (58 golden test)
5. ✅ functions/test/index.test.js yazıldı (2 smoke test — tek export doğrulaması)
6. ✅ Doğrulama: functions 60/60 + kök 178/178 yeşil
7. ✅ ADR-0006 yazıldı (docs/architecture/adr/0006-cloud-functions-module-split.md)
8. ✅ task.md'ye CLEAN-007 eklendi (completed)
9. ✅ docs/memory/progress.md + context.md güncellendi

## PROGRESS
- DONE 2026-08-04 — functions/package.json: vitest devDependency + test script; functions/vitest.config.js (kök config include ezmesi)
- DONE 2026-08-04 — functions/logic.js: saf mantık taşındı (pencere sabitleri, WINDOWS tablosu, isCompletionDone ikiye bölündü, 4 payload üreticisi, pencere/dedupe yardımcıları); firebase/web-push import'u yok
- DONE 2026-08-04 — functions/index.js refactor: loadUserContext/getActiveSubscriptions/sendWindowNotification/sendStreakMilestoneNotifications/processUser çıkarıldı; 3 özdeş window bloğu WINDOWS tablosuna indirildi; sendOnePush + collectStaleRef ile derinlik ≤2; export yüzeyi tek isim (deploy güvenliği)
- DONE 2026-08-04 — Golden testler yazıldı; 2 test beklentisi düzeltildi (kod hatası değil, orijinal davranışın doğrulanması)
- DONE 2026-08-04 — Doğrulama: functions 60/60, kök 178/178 yeşil; GR-SP01/02/03 uyumlu
- DONE 2026-08-04 — ADR-0006, task.md CLEAN-007, memory bank (progress.md, context.md) güncellendi

## RUNS
- started: 2026-08-04T19:50:00.503Z
