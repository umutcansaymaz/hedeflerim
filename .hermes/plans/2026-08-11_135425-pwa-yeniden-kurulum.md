# PWA Yeniden Kurulum Planı — Hedeflerim (hedeflerim-2026)

Tarih: 2026-08-11 · Dal: `clean-public` · Önceki söküm commit: `e9386fe`

## Hedef

PWA'yı sıfırdan, kusursuz ve **kalıcı** kurmak: manifest + ikonlar + service worker + push bildirimleri.
Eski bayatlık (stale SW cache) ve giriş döngüsü sorunlarının tekrarını önleyen iyileştirmelerle.
Auth katmanına DOKUNULMAZ — mevcut popup + `hedeflerim-2026.firebaseapp.com` authDomain (Kas 2026'da doğrulanmış) aynen korunur.

## Keşif sonucu (kanıtlı)

| Parça | Durum |
|---|---|
| Eski sw.js / manifest.json / ikonlar | Git geçmişinde duruyor (`e9386fe~1`) — geri getirilebilir |
| Eski SW tasarımı | Network-first + `/__/auth/` muafiyeti + push handler + skipWaiting/claim — **sağlam, aynen korunur** |
| constants.js köprüsü | `window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY` → `window.WEB_PUSH_PUBLIC_KEY` **mevcut** (satır 79-99) |
| firebase-config.js | `HDEFLERIM_WEB_PUSH_PUBLIC_KEY` alanı var ama **BOS**; authDomain = firebaseapp.com ✓ |
| firestore.rules | `pushSubscriptions` kuralı mevcut (satır 369) ✓ |
| functions/ | Canlıda DEPLOY EDİLMİŞ: `sendScheduledReminders` v2 scheduled, her 15 dk, us-central1, nodejs20 ✓ |
| VAPID env'leri | Boş → fonksiyon şu an no-op (push hiç gönderilmiyor) |
| app.js bildirim butonu | Mevcut: `scheduleReminder()`; eski: izin + schedule + `ensurePushSubscription({silent:true})` |
| functions/.gitignore | `.env` zaten ignore'da ✓ (private key repo'ya girmez) |
| Testler | 123/123 yeşil; push referansı yok |

## Mimari kararlar

1. **Eski PWA tasarımı aynen geri gelir** (kanıtlanmış): network-first SW, Firestore abonelik kaydı, 15 dk'lık zamanlanmış Cloud Function (web-push).
2. **Yenilik 1 — sw.js'e `Cache-Control: no-cache` header** (firebase.json): tarayıcı her açılışta taze sw.js ister → bayat SW devri **kökten biter**. (Eski kurulumda sw.js genel `*.js max-age=3600` kuralına takılıyordu.)
3. **Yenilik 2 — SW sürüm bump `v11.0`**: yeni cache adı → eski kurulu PWA'ların cache'i activate'te silinir → telefonundaki eski kurulum **kendi kendini iyileştirir** (unregister script'e gerek kalmaz, o kalkar).
4. **Yenilik 3 — SW güncelleme akışı**: `controllerchange` → otomatik reload (veri localStorage'da, güvenli; bayatlık hissi biter).
5. **VAPID anahtar çifti sıfırdan üretilir** (eski anahtar SECURITY.md gereği zaten açığa çıkmıştı): public → config'e (public key secret değildir), private → `functions/.env` (gitignore'lu) → functions redeploy.

## Adımlar

### Aşama 1 — PWA dosyaları (repo)
1. **Geri getir:** `git show e9386fe~1:sw.js|manifest.json|icon-192.png|icon-512.png` → çalışma ağacına; `file` + CRLF kontrolü, LF ise normalize.
2. **sw.js düzenle:** `CACHE_NAME = habit-tracker-v11.0-frontend-prod`; `message` handler ekle (`{type:'SKIP_WAITING'}`); mevcut network-first + `/__/auth/` muafiyeti + push/notificationclick handler'ları aynen korunur.
3. **manifest.json düzenle:** `"id": "/"` + `"scope": "/"` ekle (PWA kimliği — yeniden kurulumda aynı uygulama tanınır); gerisi aynen.
4. **index.html:** PWA head bloğu geri — `link[rel=manifest]`, `apple-touch-icon`, `theme-color`, `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`; **unregister script'i ÇIKAR** (yeni SW devralıyor; unregister yeni kaydı da silebilirdi).
5. **app.js:** `serviceWorker.register('sw.js', {scope:'/'})` (load'da) + `controllerchange → location.reload()`; bildirim butonu akışını eski haline çevir: `requestNotificationPermission()` → granted ise `scheduleReminder()` + `ensurePushSubscription({silent:true})`; oturum+izin varsa açılışta `ensurePushSubscription({silent:true})`.
6. **firebase.json:** `"headers"` bölümüne: `"/sw.js" → Cache-Control: no-cache, no-store, must-revalidate`; `"/manifest.json" → max-age=3600`; gerisi aynen.
7. CRLF normalize + `git diff --stat` ile kontrol.

### Aşama 2 — Push zinciri
8. **VAPID çift üret:** `node -e` ile `functions/node_modules/web-push` → `generateVAPIDKeys()`.
9. **Public key** → `src/config/firebase-config.js` → `window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY = "<public>"` (repoya girer, secret değil).
10. **settings.js push bloğu geri** (`git show e9386fe~1:src/components/settings.js` satır 32-172 + `window.requestNotificationPermission` export'u): `requestNotificationPermission`, `getPushDeviceId`, `urlBase64ToUint8Array`, `normalizePushSubscriptionPayload`, `savePushSubscriptionToCloud`, `ensurePushSubscription`; `showLocalNotification`/`scheduleReminder`/`refreshReminderSchedule`/`checkReminder` korunur.
11. **functions/.env** (gitignore'lu, repo'ya gitmez): `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`.

### Aşama 3 — Testler (TDD: önce kırmızı, sonra yeşil)
12. **Yeni `src/__tests__/pwa.test.js`:** manifest JSON geçerli + zorunlu alanlar (name, short_name, start_url, display standalone, icons 192+512 maskable) + ikon dosyaları diskte; sw.js parse edilebilir + `CACHE_NAME` v11 içeriyor + `/__/auth/` muafiyeti var; index.html'de manifest link + apple-touch-icon var, unregister script **YOK**; firebase.json'da sw.js no-cache kuralı var; firebase-config.js push key DOLU.
13. `npm test --silent` → 123 + yeni = hepsi yeşil; `node --check sw.js`.

### Aşama 4 — Deploy & canlı doğrulama (onay kapsamında)
14. Commit + `origin` + `public` remote'larına push (CRLF normalize sonrası; AGENTS.md Türkçe commit).
15. **Hosting deploy:** `XDG_CONFIG_HOME=/root/.hermes/firebase-config firebase deploy --token … --project hedeflerim-2026 --only hosting`.
16. **Functions redeploy (env'lerle):** `firebase deploy --only functions --token …` — kod aynı, `.env` runtime'a gider; scheduler ayarı değişmez.
17. **Canlı doğrulama:**
    - Hash: canlı sw.js/manifest.json/app.js/settings.js/index.html ↔ git HEAD (5 dosya AYNI).
    - `curl -I sw.js` → `cache-control: no-cache` header'ı; manifest.json → 200 gerçek JSON boyutu (63,419 index fallback DEĞİL).
    - Tarayıcı: manifest link var, SW controller aktif, `navigator.serviceWorker.getRegistration` dolu, push subscribe testi (izin + abonelik kaydı Firestore'a düşer), giriş popup akışı bozulmadı.
    - `firebase functions:log --token …` → `web-push-vapid-missing` uyarısı YOK, hata yok.

### Aşama 5 — Kullanıcı talimatı
18. Telefon: eski PWA'yı son uygulamalardan kapat → yeniden aç (yeni SW otomatik kurulur, eski cache silinir). İstersen PWA'yı sil → yeniden kur (en temiz yol).
19. Ayarlar → hatırlatıcı saati + bildirim izni → push aboneliği kaydolur; ertesi gün vadesinde push gelir (fonksiyon log'larından teyit edilebilir).

## Onay kapsamı (bu planın onayı şunları da kapsar)

- VAPID private key'in Firebase functions env'ine yazılması (`functions/.env` + redeploy) — **credential işlemi**
- Firebase Hosting + Functions **deploy**
- Commit + **iki remote'a push**

## Riskler & notlar

- **Eski kurulu PWA:** v11 SW network-first olduğundan ilk açılışta taze sürümü çeker; eski v10.2 cache'i activate'te silinir. Yine de en garantili yol: sil → yeniden kur (talimat 18).
- **iOS:** manifest + apple meta'ları ile kurulabilir; push iOS'ta desteklenmez (Android'de tam çalışır).
- **VAPID private key ASLA repoya girmez** (.env gitignore'lu; SECURITY.md uyumlu).
- **Functions redeploy** mevcut scheduler'ı bozmaz (aynı kod, ek env).
- **Otomatik reload** (controllerchange): veri localStorage'da, kayıp riski yok; eski bayatlık hissini bitirir.
- Kullanıcının cihazındaki eski PWA, deploy sonrası **ilk açılışta** kendini yeniler — "kurulu PWA eski sürümde takılı" sorunu bu planla kalıcı çözülür.

## Tanım-ı tamam (DoD)

- [ ] 4 dosya repo'da, CRLF, sw.js v11.0
- [ ] index.html PWA tag'leri + unregister yok
- [ ] firebase.json sw.js no-cache
- [ ] VAPID üretildi: public config'te, private .env'de
- [ ] Push kodu settings.js + app.js'te geri
- [ ] Tüm testler yeşil (123 + pwa.test.js)
- [ ] Deploy canlı, hash AYNI, sw.js no-cache header canlıda, push subscribe çalışıyor, functions log temiz
