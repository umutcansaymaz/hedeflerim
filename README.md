# Hedeflerim

**Hedeflerim** is a privacy-conscious personal productivity PWA for tracking habits, goals, books, notes, focus sessions, and long-term progress in one place.

The app is built with vanilla JavaScript, Firebase, and a modular client-side architecture. It started as a personal operating system for sustainable routines: daily habits, reading progress, tasks, journaling, focus work, weekly reviews, progress insights, and gamification.

---

## English

### Highlights

- Habit and goal tracking with streaks, categories, daily/weekly targets, and progress history
- Todo, book, note, and focus timer modules in a single PWA
- Pomodoro, stopwatch, countdown, focus history, and weekly focus statistics
- Offline-friendly local persistence with optional Firebase Auth and Firestore cloud sync
- Web push notification infrastructure for scheduled reminders
- Progress dashboard, mood tracking, weekly review, heatmap, achievements, XP, and levels
- Multiple visual themes, including light and dark variants
- Unit and E2E test setup with Vitest and Playwright

### Tech Stack

- Vanilla JavaScript (ES modules)
- Firebase Auth, Firestore, Hosting, and Cloud Functions
- Progressive Web App with service worker and manifest
- Vitest for unit tests
- Playwright for browser smoke/visual tests

### Project Structure

```text
src/
  components/      UI modules and feature workflows
  services/        Firebase, sync, storage, and data layer
  state/           Shared client-side state
  utils/           Constants and helper functions
  config/          Public-safe Firebase config placeholders
functions/         Firebase Cloud Functions for scheduled push notifications
test/e2e/          Playwright tests
specs/             Project context, architecture notes, and guardrails
```

### Getting Started

Install dependencies and run the unit test suite:

```bash
npm install
npm test
```

Run the static app locally:

```bash
npx serve .
```

Then open the local URL printed by `serve`.

### Firebase Configuration

This public repository intentionally does **not** include production Firebase project credentials or personal allowlists.

To connect your own Firebase project:

1. Use `src/config/firebase-config.example.js` as a template.
2. Fill `src/config/firebase-config.js` with your Firebase Web App config.
3. Set `window.HDEFLERIM_ALLOWED_EMAILS` to the email addresses allowed to sign in.
4. Replace the placeholder email in `firestore.rules` before deploying rules.
5. If you use web push, set `window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY`.

Firebase Functions read VAPID keys from environment variables:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

Never commit private keys, service account JSON files, access tokens, auth exports, debug logs, or local deployment files.

### Security

See [SECURITY.md](SECURITY.md) before deploying or making a fork public. The repository is prepared as an open-source snapshot with placeholder configuration by default.

---

## Türkçe

### Proje Özeti

**Hedeflerim**, alışkanlık, hedef, kitap, not, odak seansı ve uzun vadeli ilerleme takibini tek ekranda birleştiren kişisel üretkenlik PWA’sıdır.

Amaç; günlük işleri sadece listelemek değil, kullanıcının sürdürülebilir rutinler kurmasına yardımcı olmaktır. Bu yüzden uygulamada alışkanlık serileri, odak geçmişi, haftalık değerlendirme, ruh hâli takibi, ilerleme haritası, başarımlar, XP/seviye sistemi ve kişiselleştirilebilir temalar birlikte çalışır.

### Özellikler

- Alışkanlık ve hedef takibi
- Günlük/haftalık hedefler, seri takibi ve kategori bazlı ilerleme
- Görev, kitap, not ve odak zamanlayıcı modülleri
- Pomodoro, kronometre, geri sayım ve odak istatistikleri
- Yerel kayıt ve isteğe bağlı Firebase bulut senkronizasyonu
- PWA, service worker ve web push bildirim altyapısı
- Haftalık değerlendirme, ruh hâli takibi, heatmap, başarımlar, XP ve seviye sistemi
- Açık/koyu tema seçenekleri ve responsive arayüz
- Vitest ve Playwright test altyapısı

### Kurulum

```bash
npm install
npm test
```

Yerelde çalıştırmak için:

```bash
npx serve .
```

### Firebase Ayarları

Bu public repo gerçek Firebase proje bilgileriyle gelmez. Kendi Firebase projenizi bağlamak için:

1. `src/config/firebase-config.example.js` dosyasını örnek alın.
2. `src/config/firebase-config.js` dosyasındaki placeholder değerleri kendi Firebase Web App config değerlerinizle değiştirin.
3. `window.HDEFLERIM_ALLOWED_EMAILS` listesini izinli e-posta adreslerinizle güncelleyin.
4. `firestore.rules` içindeki `you@example.com` placeholder adresini kendi izinli adresinizle değiştirin.
5. Web push kullanacaksanız `window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY` değerini public VAPID key ile doldurun.

Firebase Functions için private VAPID key kaynak koda yazılmaz. Deploy ortamında şu environment değerleri tanımlanmalıdır:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

### Güvenlik Notu

Bu repo açık kaynak kullanıma uygun olacak şekilde placeholder config ile hazırlanmıştır. Canlı proje bilgileri, private key’ler, auth export dosyaları, debug logları ve local deploy dosyaları repoya dahil edilmemelidir.

Detaylı kontrol listesi için [SECURITY.md](SECURITY.md) dosyasına bakın.

---

## License

No license has been selected yet. Until a license is added, all rights are reserved by the project owner.
