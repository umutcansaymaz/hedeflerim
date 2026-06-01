# 07-backlog-and-risks.md

## Teknik Borç

| Borç | Etki | Öncelik | Not |
|------|------|---------|-----|
| `app-v5.js` ~9700 satır monolith | Bakım zorluğu, okunabilirlik, code review zorluğu | Yüksek | `task.md` CLEAN-001'de planlı |
| `index.html` ~944 satır inline markup | Component yapısı yok, HTML okunabilirliği | Orta | Modülerleştirmeyle çözülebilir |
| Inline `onclick="..."` handler'lar | Event delegation'a geçiş gerekiyor | Orta | Mevcutları bozmadan yavaşça |
| No tests | Regresyon riski, güvenli refactor imkansız | Yüksek | Playwright smoke test değerlendirilebilir |
| No lint/formatter | Kod stili tutarsızlığı | Düşük | CLEAN sonrası değerlendirilebilir |
| No CI/CD | Manuel deploy hata riski | Orta | GitHub Actions değerlendirilebilir |

## Riskli Alanlar

| Alan | Risk | Mevcut Önlem |
|------|------|-------------|
| Cloud sync conflict | İki cihazda aynı anda değişiklik → overwrite | `updatedAt` merge, `lastCloudRootUpdatedAtMs` kontrolü |
| Offline mode | localStorage + Firestore persistence çakışma | `isNetworkOnline()` kontrolü, queue mekanizması |
| `app-v5.js` boyutu | Parse süresi, mobil performans | `PERFORMANCE_MODE` flag'i, animasyon kısıtlaması |
| Hardcoded API keys | Firebase config client-side (kabul edilebilir), VAPID keys functions'ta | VAPID keys `functions/index.js`'te — başka yere taşıma riskli değil (Firebase Functions ortamı güvenli) |
| Auth whitelist | Manuel güncelleme, 3 dosya sync gerektirir | Mevcutta çalışıyor, ölçeklenme planı yok |
| Firestore rules karmaşıklığı | 374 satır, yeni field eklemek zor | Strict validasyon güvenliği artırır ama geliştirme sürtünmesi yaratır |
| No test → regresyon | Her değişiklik manuel test gerektirir | Console kontrolü + manuel tab ziyareti |

## Eksik Doğrulama Noktaları

- Firestore rules unit testi yok
- Firebase Functions local testi yok (emulator kullanımı yok)
- PWA offline senaryoları otomatize test edilmiyor
- Cross-browser testi yok (sadece Chrome/Firefox varsayımı)
- Mobil cihaz testi yok (sadece responsive design varsayımı)
- Accessibility (a11y) denetimi yok

## İyileştirme Önerileri (Değerlendirilebilir)

1. **Modülerleştirme** (`task.md` CLEAN-001) — öncelikli, zaten planlı
2. **Smoke test** (Playwright) — yeni feature/bug fix sonrası temel akışları doğrulamak için değerlendirilebilir
3. **ESLint + Prettier** — kod stili tutarlılığı için değerlendirilebilir, düşük öncelik
4. **GitHub Actions** — deploy öncesi lint + smoke test çalıştırmak için değerlendirilebilir, orta öncelik
5. **TypeScript** — type safety için değerlendirilebilir, düşük öncelik, modülerleştirme sonrası
6. **Code splitting** — `app-v5.js`'i tab bazlı parçalara bölmek için değerlendirilebilir, yüksek öncelik

> **Not:** Yukarıdaki öneriler "zorunlu" değil, "değerlendirilebilir" olarak konumlandırılmıştır. Mevcut proje basitlik ilkesiyle çalışmaktadır.
