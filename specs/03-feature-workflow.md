# 03-feature-workflow.md

## Yeni Feature Ekleme Akışı

1. `task.md`'ye yeni task ekle (ID, başlık, açıklama, guardrails, affected_files)
2. `AGENTS.md` guardrail ID'lerini kontrol et
3. `specs/02-architecture.md` oku (veri modeli ve entegrasyonları anlamak için)
4. `specs/04-coding-standards.md` oku (kod stili için)
5. Etkilenen dosyaları oku
6. Değişiklik yap
7. Doğrulama (aşağıya bak)
8. `task.md`'de status'u `completed` yap

## Bug Fix Akışı

1. `task.md`'de ilgili task'ı bul veya yeni ekle
2. Hatanın konumunu tespit et (hangi fonksiyon, hangi satır)
3. Root cause analizi yap
4. **Minimal fix** — sadece hatayı çöz, başka şeyi değiştirme
5. Doğrulama
6. `task.md`'de status güncelle

> Küçük bug fix'lerde `04-coding-standards.md` zorunlu değildir. İlgili kod dosyasındaki mevcut pattern'i takip et.

## Refactor Akışı

1. `task.md`'de refactor task'ını kontrol et (varsa)
2. `specs/06-decisions.md` oku (mimari kararları hatırla)
3. `specs/02-architecture.md` oku (etki analizi için)
4. **Küçük adımlarla** yap. 500+ satır tek seferde değişiklik yapma.
5. Her adımda doğrulama
6. `task.md`'de status güncelle

## UI Değişikliği Akışı

1. Değişiklik `index.html`'de mi, `style.css`'de mi, yoksa `app-v5.js`'teki render fonksiyonunda mı?
2. İlgili dosyayı oku
3. Değişiklik yap
4. Doğrulama
5. `task.md`'de status güncelle

## Doğrulama Adımları

### Agent Tarayıcı Çalıştırabiliyorsa
- Sayfayı aç (index.html'i serve et veya Firebase Hosting önizlemesi)
- F12 Console'u kontrol et
- Hata (error, exception) var mı?
- Uyarı (warning) var mı? (Gereksiz uyarıları temizle)

### Agent Tarayıcı Çalıştıramıyorsa
- Kullanıcıya şu talimatları ver:
  1. `firebase serve` veya statik sunucu ile çalıştır
  2. F12 → Console sekmesini aç
  3. Her tab'ı (Bugün, Alışkanlıklar, Kitaplar, Listeler, Notlar, İlerleme) ziyaret et
  4. Hata olup olmadığını kontrol et
  5. Etkilenen özelliği manuel test et

### Genel Kontrol Listesi (Test Altyapısı Olmadığı İçin)
- [ ] Console'da `TypeError`, `ReferenceError`, `SyntaxError` yok
- [ ] Etkilenen özellik manuel olarak çalışıyor
- [ ] Firebase rules deploy edilmedi (eğer değişiklik yapılmadıysa)
- [ ] `task.md`'de status güncellendi

## Büyük Değişiklik / Riskli Alan Kuralı

Aşağıdaki durumlarda **önce plan çıkar**, kullanıcıdan **onay al**, sonra uygula:

| Durum | Örnek |
|-------|-------|
| Büyük refactor | `app-v5.js`'i modülerleştirme (CLEAN-001) |
| Schema değişikliği | Firestore'a yeni koleksiyon/field ekleme |
| Auth alanı | Whitelist'e kullanıcı ekleme, auth akışı değiştirme |
| Deploy / Hosting | `firebase.json`, `sw.js`, `manifest.json` değişikliği |
| Security | API key rotasyonu, CORS, CSP değişikliği |
| Çok dosyalı riskli değişiklik | 3+ dosyayı aynı anda değiştiren task |

Plan formatı:
1. Değişikliğin amacı
2. Etkilenen dosyalar
3. Riskler ve geri alma stratejisi
4. Adım adım uygulama planı
5. Doğrulama adımları
