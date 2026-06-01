# 01-project-overview.md

## Proje Amacı

"Hedeflerim", kişisel alışkanlık kazanımı, kitap okuma takibi, günlük görev yönetimi, odaklanma seansları ve not tutma özelliklerini tek bir uygulamada birleştiren bir PWA'dır. "Ömürlük hedefler" için tasarlanmıştır; yani kullanıcı uzun vadeli, sürdürülebilir alışkanlıklar oluşturmayı hedefler.

## Hedef Kullanıcı ve Senaryo

- **Kullanıcı:** Bireysel kullanım. Public kurulumlarda izinli kullanıcı e-postaları proje sahibinin kendi Firebase konfigürasyonunda tanımlanır.
- **Dil:** Türkçe arayüz, Türkçe içerik.
- **Senaryo:** Kullanıcı günlük alışkanlıklarını işaretler, okuduğu kitapların sayfasını kaydeder, yapılacakları kovalama sistemiyle yönetir, odaklanma seansları yapar, notlar/günlük yazar. Uygulama gamification (XP, seviye, rozetler) ile motivasyon sağlar.

## Ana Özellikler

Uygulama 5 sekmeden oluşan tek sayfalık (SPA) bir yapıdadır:

### 1. Bugün (Dashboard)
- XP ve seviye göstergesi
- Mood tracker (1–5 arası günlük ruh hali)
- Akıllı koç (client-side analiz, AI değil)
- Odak zamanlayıcısı (Pomodoro / kronometre / geri sayım)
- Haftalık özet kartı (Pazar günleri)
- Bugünkü alışkanlıklar, devam eden kitap, bekleyen görevler

### 2. Alışkanlıklar
- Haftalık takvim görünümü (7 gün)
- Günlük tamamlama işaretleme (tik veya sayısal hedef)
- Seri (streak) takibi
- Kişisel rekorlar
- Kategoriler ve renkler
- Motivasyon alıntıları

### 3. Kitaplar
- Google Books API ile arama (API key yok, public endpoint)
- Okuma ilerlemesi (sayfa bazlı)
- Günlük sayfa hedefi ve sapma takibi
- Durum: Bekliyor / Okuyorum / Okudum
- Günlük okuma logu

### 4. Listeler (Todos)
- 3 kovalama: Bugün / Bu Hafta / Bir Ara
- Tamamlama / taşıma / silme
- İstatistikler

### 5. Notlar
- Kategorili notlar (Genel, Günlük, Fikirler, İş, vb.)
- Renkli kartlar
- Sabitleme ve arşivleme
- Arama, sıralama, tarih filtreleme
- Sesli giriş desteği
- Günlük (journal) özelliği

### 6. İlerleme
- Yıllık aktivite haritası (GitHub-style)
- Haftalık değerlendirme formu
- Rozetler ve başarımlar
- Odaklanma istatistikleri

## Ek Özellikler

- **Cloud Senkronizasyon:** Firebase Firestore v2 (subcollection bazlı). Offline çalışma desteği (Firestore persistence + localStorage fallback).
- **Push Bildirimler:** FCM + Web Push. Akıllı hatırlatma algoritması (sabah, akşam aciliyet, gece). Firebase Functions v2 scheduler ile gönderilir.
- **Gamification:** XP puanı, seviye sistemi, rozetler (Erkenci Kuş, Gece Kuşu, Seri, Kitap Kurdu, vb.)
- **Odak Zamanlayıcısı:** Pomodoro, kronometre, geri sayım modları. Alışkanlık/görev ile ilişkilendirme.
- **Çöp Kutusu:** Silinen öğeler 30 gün saklanır, geri yüklenebilir.
- **Hata Loglama:** Client-side hatalar Firestore `errors/` koleksiyonuna yazılır.

## Kapsam İçinde Olanlar

- Kişisel kullanım (tek kullanıcı, cihazlar arası sync)
- PWA olarak mobil ve masaüstü tarayıcıda çalışma
- Offline-first yaklaşım
- Firebase Auth ile Google girişi
- Web Push bildirimleri

## Kapsam Dışında Olanlar

- Çok kullanıcılı sosyal özellikler (arkadaşlık, paylaşım, leaderboard)
- Harici API entegrasyonu (Google Books hariç)
- Native mobil uygulama (iOS/Android)
- Admin paneli veya kullanıcı yönetimi arayüzü
- Ödeme sistemi / abonelik

## Belirsiz / Doğrulanması Gereken Noktalar

1. **Admin paneli:** Kullanıcı whitelist yönetimi şu an manuel (3 dosya güncelleme). Admin arayüzü planlanmamış.
2. **Kullanıcı sayısı büyüme planı:** Şu an 2 kullanıcı. Daha fazla kullanıcı eklenirse auth mekanizması değişmeli mi?
3. **Yedekleme:** Firestore'dan dışa aktarma / yedekleme stratejisi var mı?
