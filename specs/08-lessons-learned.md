# 08-lessons-learned.md — Öğrenilen Dersler

> Bu dosya her task tamamlandıktan sonra @dokumantasyon tarafından güncellenir.
> Amaç: Aynı hataları tekrarlamamak, iyi uygulamaları kayıt altına almak.

## Nasıl Çalışır

1. Bir task tamamlanır
2. @kalite pattern tespiti yapar
3. @dokumantasyon bu dosyaya ekler
4. @fikir iyileştirme önerisi ekler
5. @manager periyodik olarak gözden geçirir

## Kategoriler

| Etiket | Anlamı |
|--------|--------|
| `bug` | Daha önce yaşanmış bir hata |
| `guardrail` | Yeni eklenmesi gereken kural |
| `optimization` | Performans iyileştirmesi |
| `ux` | Kullanıcı deneyimi dersi |
| `process` | İş akışı iyileştirmesi |

---

## Kayıtlar

### 2026-05-09 — UX: Daily Recap Bar Tasarımı

- **Event**: Daily recap bar tasarımı zayıftı, kullanıcı "sekmelerle uyumlu değil" dedi
- **Cause**: Düz flex satırı, `var(--card-bg)` ve `backdrop-filter: blur()` kullanılmamıştı
- **Fix**: 4 sütunlu grid, `var(--card-bg)` + `var(--radius-md)` + hover efekti
- **Lesson**: Yeni UI component'i eklerken mevcut tasarım dilini kullan (`--card-bg`, `--glass-bg`, `backdrop-filter`)
- **Prevent**: Tasarım kontrol listesine eklendi: "CSS variable mı kullanıldı?"

### 2026-05-09 — UX: Header Timer İkonu

- **Event**: ⏱️ emojisi hoş karşılanmadı
- **Cause**: Emoji stillerle uyumlu değil, diğer butonlar SVG ikon kullanıyor
- **Fix**: ⏱️ emoji yerine SVG kronometre ikonu
- **Lesson**: Header butonlarında emoji yerine SVG kullan

### 2026-05-09 — UX: Focus Timer Header Süre Gösterimi

- **Event**: Header'da timer'ın çalıştığı görülüyor ama kalan süre görünmüyordu
- **Fix**: `updateFocusTimerHeaderIndicator()` fonksiyonuna `mm:ss` süre metni eklendi
- **Lesson**: Timer durumu gösterirken sadece "çalışıyor/çalışmıyor" değil, süre bilgisi de ver

---

### 2026-05-10 — CLEAN-001 Faz 3: Fonksiyon Envanteri Zorunluluğu

- **Event**: renderMoodHistory fonksiyonu component'lere taşınırken kayboldu. progress.js:380'de çağrılıyordu ama hiçbir dosyada tanımlı değildi.
- **Cause**: Paralel çalışan 5 component birden çıkarılırken hangi fonksiyonun hangi dosyaya gittiği takip edilmedi. Fonksiyonlar "taşındı" sanıldı ama aslında kopyalanmadı/silinecek listeden düştü.
- **Fix**: Fonksiyon yeniden yazıldı (src/components/progress.js) + BUG-003 oluşturuldu.
- **Lesson**: Paralel component çıkarma işlemlerinde mutlaka bir **Fonksiyon Envanteri** tutulmalı. Her fonksiyonun kaynak dosyası, hedef dosyası ve kopyalanma durumu takip edilmeli.
- **Prevent**: CLEAN-001 Faz 4'te envanter tablosu zorunlu kılınmalı. `task.md`'de affected_files tek başına yeterli değil, fonksiyon seviyesinde takip şart.
- **Etiket**: `process`, `guardrail`

---

### 2026-05-10 — CLEAN-001 Faz 2/3: npm Test SyntaxError Kontrolü

- **Event**: Component taşımaları sırasında bazı dosyalarda SyntaxError oluştu (eksik parantez, kırık import).
- **Cause**: Her taşıma sonrası test koşulmadı. Hatalar ancak browser'da F12 ile fark edildi.
- **Fix**: Testler çalıştırılıp hatalar giderildi.
- **Lesson**: Her taşıma/refactor işlemi sonrası **kesinlikle** `npm test` çalıştırılmalı. SyntaxError'lar otomatik testlerde anında yakalanıyor, browser'da geç fark ediliyor.
- **Prevent**: Task tamamlama kontrol listesine "npm test geçiyor mu?" maddesi eklensin. AGENTS.md'deki Task Tamamlama Kontrol Listesi güncellenebilir.
- **Etiket**: `process`, `optimization`

---

### 2026-05-10 — CLEAN-001: eval ile Birleştirmede return Statement

- **Event**: eval ile birleştirilen modüler dosyalarda return statement'ları fonksiyon dışında kalarak SyntaxError'a yol açtı.
- **Cause**: Her modül dosyası kendi scope'unda çalışırken bazı fonksiyonlar `return` ile bitiyordu. eval içinde bu return'ler global scope'da kaldığı için geçersizdi.
- **Fix**: Her modül dosyasındaki son return'ler kaldırıldı, fonksiyon içi return'ler korundu.
- **Lesson**: eval/import ile birleştirilen dosyalarda **dosya seviyesinde return statement** olmamalı. Sadece fonksiyon içi return'ler güvenli. Modüler dosyalar birer expression olarak değerlendirilmeli.
- **Prevent**: Kod inceleme kontrol listesine "dosya seviyesinde return var mı?" kontrolü eklenebilir.
- **Etiket**: `bug`, `guardrail`

---

### 2026-05-10 — CLEAN-001 Faz 4: QA Atlama Hatası (KRİTİK)

- **Event**: CLEAN-001 Faz 4 tamamlandığında @kalite'ye kontrol ettirilmedi. CEO Umutcan Bey "kalite kontrol yaptırdın mı?" diye sordu. @kalite incelediğinde store.js script sıralama hatası buldu (RED). Düzeltildi.
- **Cause**: CTO işi bitirmeye odaklandı, kalite kontrol adımını atladı. İş teslim öncesi kontrol listesi uygulanmadı.
- **Fix**: store.js sıralaması index.html ve setup.js'de düzeltildi. renderDashboard 92→26 satıra indirildi.
- **Lesson**: Her iş tamamlandığında CEO'ya rapor sunmadan ÖNCE @kalite'ye review ettirilmeli. CTO kendi işini kendi kontrol etmez, bağımsız QA şart.
- **Prevent**: 
  1. Manager iş akışına "CEO'ya rapor ver" adımından önce "Kalite kontrol yapıldı mı?" kontrol noktası eklenecek.
  2. AGENTS.md'deki Task Tamamlama Kontrol Listesi genişletilecek: `[ ] @kalite review yaptı mı?`
  3. Her task bitiminde otomatik QA çağrısı yapılacak, atlanamayacak.
- **Etiket**: `process`, `guardrail`
- **Sorumlu**: CTO (@manager)

---

### 2026-05-24 — UX: Skeleton Screen ve Animasyonlu SVG Boş Durumlar (FEAT-010)

- **Event**: Kitap arama ve boş durumlarda (Alışkanlıklar, Kitaplar, Görevler, Notlar) emoji/düz metin kullanımı kullanıcı arayüzünü zayıf gösteriyordu.
- **Cause**: Yükleme esnasında ekranın boş kalması ve boş durumların cansız durması premium hissi engelliyordu.
- **Fix**: Kitap aramaya 3'lü pulsing skeleton ekran yerleştirildi. Dört sekmedeki boş durum emojileri, dikey salınım, dönme ve sarkaç hareketi yapan CSS animasyonlu inline SVG'lerle değiştirildi.
- **Lesson**: Yükleme durumlarında ve boş sekmelerde animasyonlu SVG/Skeleton kullanarak arayüzü sürekli aktif ve responsive hissettir.
- **Etiket**: `ux`, `optimization`

---

### 2026-05-24 — UX: Karanlık Temalarda Alt Kart ve Input Okunabilirliği (Böcek/İyileştirme)

- **Event**: Grafit (slate), midnight ve aurora gibi alternatif karanlık temalarda kitap ilerleme çubukları, günlük hedef kartları, giriş (input) alanları, seçiciler, completed todo/kitap butonları, dashboard kartları (bugün nasil hissediyorsun, bugünkü alışkanlıklar, devam eden kitap, bekleyen görevler), alışkanlık rekor kartları (en uzun seri, toplam gün, bu ay sayfa, kitap bitti) ve ilerleme sayfası alışkanlık detay stat/karşılaştırma alanlarının (stat-item, week-compare) renkleri aydınlık (beyaz/açık gri) kalarak görünümü bozuyor ve okunabilirliği engelliyordu.
- **Cause**: Bu alt bileşenler, form kontrolleri ve dashboard kartları için yazılmış olan koyu tema ezici stillerinin (dark theme overrides) sadece `[data-theme="dark"]` seçici prefix'i ile sınırlı tutulması ya da bazılarının hiç ezilmemiş olması, diğer karanlık temalarda aydınlık varsayılan değerlerin sızmasına yol açmıştı.
- **Fix**: `style.css` sonuna tüm karanlık temaları (`dark`, `aurora`, `slate`, `midnight`) hedefleyen kapsamlı alt kart, form kontrolleri (`.book-progress`, `.book-daily-goal-card`, `.todo-bucket-btn`, input/select/textarea), dashboard elemanları (`.mood-tracker-container`, `.dashboard-habit-item`, `.dashboard-book`, `.dashboard-todo-item`), alışkanlık rekor kartları (`.record-card`), ve ilerleme detay alanları (`.stat-item`, `.week-compare`) ezme stilleri (`!important` ile) eklendi.
- **Lesson**: Birden fazla karanlık veya aydınlık temaya sahip sistemlerde, form kontrolleri ve iç kart bileşenleri gibi alt elemanlar için stil yazarken seçici gruplamalarını eksiksiz yap ve aydınlık/karanlık mod sızıntılarını önlemek için birleşik sınıflar/değişkenler kullan.
- **Etiket**: `bug`, `ux`

---

### 2026-06-01 - Security: Public Repo Temizligi

- **Event**: Open-source basvuru hazirligi sirasinda repo icinde hardcoded VAPID private key, gercek Firebase proje config'i, whitelist e-postalari ve izlenen cache/output dosyalari bulundu.
- **Cause**: Kisisel/prod deployment icin kullanilan degerler ve uretilmis dosyalar ayni Git takibinde kalmisti.
- **Fix**: VAPID private key env'e tasindi, Firebase config placeholder yapildi, whitelist degerleri anonimlestirildi, `.firebaserc` ve artifact dosyalari Git takibinden cikarildi, `README.md` ve `SECURITY.md` eklendi.
- **Lesson**: Public repo karari verilmeden once secret taramasi, Git history taramasi ve artifact takibi mutlaka ayri bir guvenlik task'i olarak yapilmali.
- **Etiket**: `security`, `open-source`

---

*Her task sonrası @dokumantasyon tarafından güncellenir.*
