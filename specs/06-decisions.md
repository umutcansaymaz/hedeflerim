# 06-decisions.md

## Doğrulanmış Kararlar

Aşağıdaki kararlar repo dosyalarından doğrulanmıştır.

### Monolith (tek JS dosyası)

- **Gerekçe:** Basitlik, build tool gerektirmez, hızlı deploy
- **Kanıt:** `app-v5.js` ~9700 satır. Kök dizinde `package.json` yok.
- **Durum:** Aktif. `task.md` CLEAN-001'de modülerleştirme planlanıyor.

### Firestore v2 Schema (subcollection)

- **Gerekçe:** V1'de tüm veri tek root dokümandaydı (limit ve okuma maliyeti riski). V2'de her entity ayrı subcollection.
- **Kanıt:**
  - `firestore.rules` v2 validasyon fonksiyonları (`validHabitDoc`, `validTodoDoc`, vb.)
  - `app-v5.js` `buildCloudV2DataFromDocs()` fonksiyonu
  - `app-v5.js` `fetchCloudBundle()` — habits/todos/books/notes/focusSessions ayrı `get()`
- **Durum:** Aktif. Legacy migration desteği var (`migrateLegacyCloudDataIfNeeded`).

### Vanilla JS (no framework)

- **Gerekçe:** Basitlik, küçük proje, PWA uyumluluğu
- **Kanıt:**
  - `index.html`'de `<script src="app-v5.js">` (tek script)
  - React/Vue/Svelte import yok
  - DOM manipulation direkt (`document.getElementById`, `innerHTML`)
- **Durum:** Aktif.

### No Build Tool / No Test

- **Gerekçe:** Tek geliştirici, basitlik
- **Kanıt:**
  - Kök dizinde `package.json` yok
  - `__tests__`, `*.test.js`, `*.spec.js` dosyası yok
  - `functions/package.json`'de `scripts` alanı yok, test dependency yok
- **Durum:** Aktif.

### Google Books API (public, no key)

- **Gerekçe:** Basitlik, rate limit yeterli (5 sonuç, manuel arama)
- **Kanıt:** `app-v5.js` satır 8728: `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5` — URL'de `key` parametresi yok.
- **Durum:** Aktif.

### Firebase Auth + Whitelist (2 kullanıcı)

- **Gerekçe:** Kişisel kullanım, küçük ölçek
- **Kanıt:**
  - `app-v5.js` `ALLOWED_EMAILS` array (2 email)
  - `firestore.rules` `isOwner()` function (2 email kontrolü)
  - Unauthorized girişte `auth.signOut()` + toast
- **Durum:** Aktif.

## Açık Kararlar (Henüz Karar Verilmemiş)

| Konu | Mevcut Durum | Gelecek Değerlendirmesi |
|------|--------------|------------------------|
| Modülerleştirme zamanlaması | `task.md` CLEAN-001'de planlı, henüz başlanmadı | CLEAN taskları tamamlanınca başlanmalı |
| Test altyapısı | Hiç yok | Playwright smoke test değerlendirilebilir |
| Lint/formatter (ESLint/Prettier) | Hiç yok | Düşük öncelik, CLEAN sonrası değerlendirilebilir |
| TypeScript | Hiç yok | Düşük öncelik, modülerleştirme sonrası değerlendirilebilir |
| CI/CD (GitHub Actions) | Hiç yok | `.github/workflows` yok, manuel deploy aktif |
| Admin paneli / kullanıcı yönetimi | Manuel whitelist güncelleme | Auth mekanizması değişikliği gerekebilir |
| Daha fazla kullanıcı | Şu an 2 whitelist | Scale-up planı yok |
