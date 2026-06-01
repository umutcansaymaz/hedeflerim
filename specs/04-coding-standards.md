# 04-coding-standards.md

> Bu dosya yalnızca şu görevlerde okunur: yeni feature, refactor, UI değişikliği veya kod stili belirsizse. Küçük bug fix'lerde zorunlu değildir.

## Dosya ve Klasör İsimlendirme

- **JS/HTML/CSS dosyaları:** kebab-case (`app-v5.js`, `index.html`, `style.css`)
- **Yeni dosya eklenecekse:** mevcut konvansiyonu takip et
- **Klasör isimleri:** kebab-case (henüz klasör yapısı yok)

## Fonksiyon ve Değişken Kuralları

| Tip | Kural | Örnek |
|-----|-------|-------|
| Fonksiyon | camelCase, max 80 satır | `getUserData()`, `formatDate()` |
| Boolean | is/has/can prefix | `isValid`, `hasPermission`, `canEdit` |
| Sabit | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `APP_VERSION` |
| Private (internal) | _prefix | `_internalMethod()` |
| Component/Class | PascalCase (varsa) | `HabitCard` (mevcut kodda class yok) |

## HTML Kuralları

- **Inline `onclick="..."` mevcut** — yeni kodda `addEventListener` tercih et
- **Mevcut inline handler'ları bozma** — refactor task'ı dışında değiştirme
- **Semantik HTML** kullan (`<button>`, `<section>`, `<nav>` vb.)
- **Accessibility:** `aria-label` eklenmiş butonlara uygun (`index.html`'de mevcut)

## JavaScript Pattern

Mevcut kodun standart akışı:

```javascript
// 1. Veri validasyonu
const normalized = normalizeAppData(rawData);

// 2. State güncelleme
appData = normalized;

// 3. Persist (local + cloud)
saveData();           // localStorage
queueCloudSave(400);  // Firestore (debounced)

// 4. Render
renderTabContent('dashboard');
```

**Kurallar:**
- Yeni fonksiyon eklenecekse mevcut akışa uygun olmalı
- DOM manipulation direkt yapılır (`document.getElementById`, `innerHTML`)
- `innerHTML` kullanımında `escapeHtml()` ile sanitize et (GR-GV01)
- Global fonksiyon tanımları mevcut pattern'de (`function foo() {}`)
- Modül sistemi (`import`/`export`) yok — `<script>` tag sırası önemli

## API Çağrısı Standartları

- **Google Books API:** `fetch()` ile, key yok, public endpoint
- **Firebase SDK:** `firebase.auth()`, `firebase.firestore()` compat API
- **Error handling:** `try/catch` + `showToast()` + `logAppError()`
- **Response parse:** `response.json()` önce kontrol et

## Error / Loading / Empty State

- **Error:** `showToast(message)` kullan. Kritik hatalar `logAppError()` ile Firestore'a yazılır.
- **Loading:** DOM'a `loading-spinner` class'lı element ekle.
- **Empty state:** Container `innerHTML = ''` + bilgilendirici mesaj.

## Import / Export Düzeni

- **Yok.** Tüm kod global namespace'te.
- Yeni dosya eklenirse `<script src="...">` tag'i `index.html`'e eklenmeli.
- Sıralama: Firebase SDK'lar → app.js → diğer script'ler.

## Mevcut Kod Stiline Uyma

- `app-v5.js`'teki benzer fonksiyonları incele, aynı stili takip et
- Yorumlar: `//` kullan, Türkçe veya İngilizce (mevcut kodda her ikisi de var)
- String: single quote (`'...'`) tercih et (mevcut kod çoğunlukla öyle)
- Indent: 4 space (mevcut kodda gözlemlenen)

## Yeni Dependency Ekleme

- Kök dizinde `package.json` yok — NPM paketi doğrudan eklenemez
- Yeni kütüphane **CDN script tag** ile eklenebilir
- Örnek: `<script src="https://cdn.jsdelivr.net/npm/xxx"></script>`
- NPM paketi şartsa (build tool gerektirir) → kullanıcıdan onay al
- **Kural:** Yeni dependency eklemeden önce mevcut kodda çözüm var mı kontrol et
