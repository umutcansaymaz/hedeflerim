# AGENTS.md — Agent Guardialları

> **Kural**: Her task başlangıcında bu dosya okunur. Task'ın `guardrails` alanındaki ID'lere göre ilgili kurallar uygulanır.
>
> **Ayrıca `specs/00-ai-context.md` dosyasını da oku.** Bu dosya; proje bağlamını, token tasarrufu kurallarını ve görev türüne göre hangi specs dosyalarının okunacağını belirtir. Tüm `/specs` klasörünü otomatik okuma.
>
> **Öğrenen Şirket:** Her task sonrası `specs/08-lessons-learned.md` güncellenir. Aynı hata 3+ kez tekrarlarsa AGENTS.md'ye yeni guardrail eklenir.

---

## Hızlı İndeks

| ID | Kategori | Kural |
|----|----------|-------|
| GR-SP01 | Spagetti | Fonksiyon max 80 satır, nested max 2 |
| GR-SP02 | Spagetti | DRY — aynı kod 3+ kez tekrar etmez |
| GR-SP03 | Spagetti | Single Responsibility — her fonksiyon tek iş |
| GR-SP04 | Spagetti | Naming Convention — camelCase / PascalCase |
| GR-SP05 | Spagetti | Temiz Kod — console.log, TODO, ölü kod yasak |
| GR-SP06 | Spagetti | Global değişken < 10 |
| GR-FB01 | Firebase | Firestore rules güncelleme + validasyon |
| GR-FB02 | Firebase | Auth whitelist — 2 dosya birden güncelle |
| GR-PW01 | PWA | Manifest + icon + service worker kontrolü |
| GR-GV01 | Güvenlik | API key, XSS, input sanitization |
| GR-TH01 | Tema | Koyu modlarda aydınlık sızıntılarını ve okunabilirliği engelle |

---

## 🎯 Genel Kurallar (Her task için)

1. `task.md` dosyasını oku, hedef task'ı bul
2. İlgili dosyaları oku (`affected_files` alanına bak)
3. Sadece gerekli dosyaları değiştir
4. Kod çalışıyor mu? (F12 → Console temiz olmalı)
5. `task.md`'de task status'unu güncelle

---

## 🛡️ Spagetti Kod Önleme (GR-SP01 — GR-SP06)

---

### GR-SP01: Fonksiyon Boyutu & Derinlik

**Limit:** Max 80 satır, nested derinlik max 2

```javascript
// ❌ 100+ satır, çok sorumluluk
function processUserData() { /* 100 satır */ }

// ✅ Parçala
function processUserData() {
  const data = validateInput();
  const normalized = normalizeData(data);
  return saveToStorage(normalized);
}
```

---

### GR-SP02: DRY (Don't Repeat Yourself)

**Limit:** Aynı kod yapısı 3+ kez tekrar edemez → helper fonksiyona çıkar

```javascript
// ❌ Tekrar
if (user.role === 'admin') { ... }
if (user.role === 'moderator') { ... }

// ✅
function hasPermission(user, action) {
  const perms = { admin: ['*'], moderator: ['edit'] };
  return perms[user.role]?.includes(action) || false;
}
```

**Kontrol:** `app-v5.js` içinde `utils/` benzeri bir yapı yoksa önce mevcut helper fonksiyonları (`truncateText`, `escapeHtml`, `sanitizeColor`, `normalizeDateValue`) kullan.

---

### GR-SP03: Single Responsibility

Her fonksiyon **tek** iş yapar. UI + logic + save aynı fonksiyonda olamaz.

```javascript
// ❌
function saveAndNotify() { saveToDB(); sendEmail(); updateUI(); }

// ✅
function saveToDB() { ... }
function sendEmail() { ... }
function updateUI() { ... }
```

---

### GR-SP04: Naming Convention

| Tip | Kural | Örnek |
|-----|-------|-------|
| Fonksiyon | camelCase | `getUserData()` |
| Component/Class | PascalCase | `HabitCard` |
| Sabit | UPPER_SNAKE | `MAX_RETRY` |
| Private | _prefix | `_internalMethod()` |
| Boolean | is/has/can prefix | `isValid`, `hasPermission` |

---

### GR-SP05: Temiz Kod

**Yasak:**
- `console.log` / `console.warn` (debug amaçlı)
- `TODO` / `FIXME` yorumları → `task.md`'ye task olarak ekle
- Ölü kod (kullanılmayan fonksiyon/değişken)
- Magic numbers → sabit kullan

**İzinli:**
- `console.error` (gerçek hatalar için)
- `if (DEBUG_MODE) console.log(...)`

**Örnek:**
```javascript
// ❌ Magic number
if (age > 18) { ... }

// ✅ Sabit
const MIN_AGE = 18;
if (age > MIN_AGE) { ... }
```

---

### GR-SP06: Global Değişken Minimizasyonu

**Limit:** Global değişken sayısı < 10

**İzinliler:** Firebase instance (`db`, `auth`), app state (`appData`, `currentUser`), constantlar (`APP_VERSION`, `STORAGE_KEY`)

**Yasak:** Geçici global, global helper fonksiyon

---

## 🔥 Firebase (GR-FB01 — GR-FB02)

---

### GR-FB01: Firestore Rules

- Yeni field eklemede `firestore.rules` güncellenmeli
- `validXxxDoc()` fonksiyonları mevcut pattern'i takip etmeli
- Whitelist email değişikliği → hem `app-v5.js` (`ALLOWED_EMAILS`) hem `firestore.rules` (`isOwner()`) güncellenmeli
- Deployment öncesi: `firebase deploy --only firestore:rules`

---

### GR-FB02: Auth Whitelist

- Yeni kullanıcı ekleme = **2 dosya birden** güncelle:
  1. `app-v5.js:59-62` → `ALLOWED_EMAILS` array
  2. `firestore.rules:9-12` → `isOwner()` function
- Unauthorized access → `auth.signOut()` tetiklenir, toast gösterilir

---

## 🎨 PWA (GR-PW01)

---

### GR-PW01: Manifest & Service Worker

- `manifest.json` geçerli JSON olmalı
- `icon-192.png` ve `icon-512.png` mevcut olmalı
- `theme_color` = `background_color` = `#0F1638` (tutarlı)
- `sw.js` değişirse cache version artırılmalı
- Offline senaryo test edilmeli

---

## 🔒 Güvenlik (GR-GV01)

---

### GR-GV01: Güvenlik Kontrolleri

- API key'ler hardcoded → sadece `firebaseConfig` içinde, başka yerde olmamalı
- `innerHTML` kullanımı → `escapeHtml()` ile sanitize et
- User input → `truncateText()` / `sanitizeColor()` toolları ile temizle
- Gizli veri → sadece Firebase config, başka yerde secret olmamalı

---

## 🎨 Tema Okunabilirliği (GR-TH01)

---

### GR-TH01: Koyu Modlarda Aydınlık Sızıntılarını ve Okunabilirliği Engelle

**Kural:**
Uygulamadaki tüm koyu arka planlı temalarda (`dark`, `aurora`, Kutup Işığı, `slate`, Grafit, `midnight`, Geceyarısı):
1. **İç Kart ve Alt Elemanlar:** Kartların içinde yer alan alt kartlar (`.book-progress`, `.book-daily-goal-card`), istatistik kutuları (`.stat-item`, `.weekly-stat-item`), karşılaştırma alanları (`.week-compare`) ve duygu durum gibi dashboard kartları (`.mood-tracker-container`, `.dashboard-habit-item`, `.dashboard-book`, `.dashboard-todo-item`) aydınlık varsayılan renklerde kalamaz. Koyu arka plan ve sınır çizgisi ile güncellenmelidir.
2. **Form Kontrolleri:** Giriş alanları (`input`, `textarea`, `select`) ve butonların (`.todo-bucket-btn`, `.book-status-btn`) aydınlık (beyaz/açık gri) arka planları ezilmeli, arka planları koyu ve metinleri/kontrastları yüksek olmalıdır.
3. **Muted Metinler:** Tamamlanmış veya okundu olarak işaretlenmiş ögelerin metinleri (`.todo-item.completed .todo-text`) koyu temada da okunabilir kalması için `var(--text-light)` ile dengelenmelidir.

**Kontrol:** Yeni bir UI veya tema eklendiğinde/düzenlendiğinde, form elemanlarının ve iç bölümlerin diğer karanlık temalarda aydınlık sızıntısı yapıp yapmadığını tüm koyu mod seçeneklerinde test et.

---

## ✅ Task Tamamlama Kontrol Listesi

```markdown
- [ ] Kod değişiklikleri tamamlandı
- [ ] Task'ın guardrail ID'leri kontrol edildi
- [ ] Browser console hatası yok (F12 → Console)
- [ ] **@kalite review yaptı mı?** (CEO'ya rapor vermeden ÖNCE)
- [ ] task.md'de status güncellendi
- [ ] specs/08-lessons-learned.md güncellendi
```

---

## 📋 Hızlı Referans

### Proje Dosyaları

#### Kök Seviye
```
app-v5.js          Ana uygulama (monolith → ~2.190 satır, hedef ~500)
firestore.rules    DB güvenlik kuralları
index.html         Entry point + tüm HTML
style.css          Stil dosyası
sw.js              Service Worker
manifest.json      PWA konfigürasyonu
functions/         Firebase Cloud Functions
```

#### Modüler Yapı (src/)
```
src/
  utils/
    constants.js       Sabitler, yapılandırma
    helpers.js         Helper fonksiyonlar
  services/
    firebase.js        Firebase init & auth state
    auth.js            login/logout/authUI
    dataLayer.js       normalizeAppData + merge/diff/write
    sync.js            Cloud sync, error logging
    storage.js         localStorage yönetimi
  components/
    focus.js           Pomodoro/Stopwatch/Countdown timer (~1.941 satır)
    modals.js          Modal aç/kapa, toast, onboarding, search
    dashboard.js       Dashboard render, daily recap, sections
    habits.js          Alışkanlık CRUD, haftalık takvim, confetti
    settings.js        Tema, bildirim/push, reminder sistemi
    todos.js           Todo CRUD, bucket, filtreleme
    books.js           Kitap CRUD, sayfa takibi
    notes.js           Not CRUD, sesli giriş, filtre
    stats.js           İstatistikler, SmartCoach, ruh hali
    progress.js        İlerleme, heatmap, başarımlar
  __tests__/
    setup.js           Vitest setup
    utils.test.js      Util fonksiyon testleri
    dataLayer.test.js  DataLayer testleri
```

### Mevcut Helper Fonksiyonlar (src/utils/helpers.js içinde)
| Fonksiyon | İşlev |
|-----------|-------|
| `truncateText()` | Metin kısaltma |
| `escapeHtml()` | HTML sanitize |
| `normalizeDateValue()` | Tarih normalizasyonu |
| `sanitizeColor()` | Renk validasyonu |
| `sanitizeImageUrl()` | URL validasyonu |
| `parseTimestamp()` | Timestamp parse |

---

> **Her task başlangıcında**: `task.md` → task'ın `guardrails` ID'leri → bu dosyadaki ilgili bölümü oku → uygula.
