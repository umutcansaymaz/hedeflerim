# 00-ai-context.md — AI Agent Bağlamı

> Token tasarrufu için tüm `/specs` klasörünü otomatik okuma. Her görevde yalnızca `task.md`, `AGENTS.md` ve `specs/00-ai-context.md` okunur. Diğer specs dosyaları sadece görev türü gerektiriyorsa okunur.

## Proje Özeti

Hedeflerim — Kişisel alışkanlık/hedef takip uygulaması. Türkçe, ~2 kullanıcı (email whitelist).

- **Stack:** Vanilla JS + Firebase (Auth / Firestore / Functions) + PWA
- **Build:** Yok (vanilla, no bundler, no package.json kökte)
- **Test:** Yok
- **Deploy:** `firebase deploy` (manuel, CI/CD yok)

## Kritik Dosyalar

| Dosya | Görev |
|-------|-------|
| `app-v5.js` (~9700 satır) | Tüm uygulama logic'i (monolith) |
| `index.html` (~944 satır) | Tüm UI markup'ı (5-tab SPA) |
| `style.css` | Tüm stiller |
| `firestore.rules` (~374 satır) | DB güvenlik + validasyon kuralları |
| `functions/index.js` (~432 satır) | Cloud Functions (push scheduler) |
| `sw.js` (~123 satır) | Service Worker (cache-first + push) |
| `task.md` | Görev listesi (her görevde oku) |
| `AGENTS.md` | Guardiallar (her görevde oku) |

## Görev Türüne Göre Ek Specs

| Görev Türü | Ek Okunacak Specs |
|------------|-------------------|
| Küçük bug fix | İlgili kod dosyasını oku, specs gerekmez |
| Yeni feature / Refactor / UI | `03-feature-workflow.md`, `04-coding-standards.md` |
| Auth / DB / PWA / Security | `02-architecture.md`, `05-ai-guardrails.md` |
| Mimari karar | `02-architecture.md`, `06-decisions.md` |
| Teknik borç / planlama | `07-backlog-and-risks.md` |
| **Sürekli öğrenme / retrospektif** | `08-lessons-learned.md` |

## Hızlı Kurallar

- `app-v5.js` monolith — yeni kod eklemeden önce mevcut pattern'i oku
- Firebase config hardcoded (`firebaseConfig` objesi) — başka yere taşıma
- `onclick="..."` inline handler'lar mevcut — yeni kodda `addEventListener` tercih et, mevcutları bozma
- Google Books API key yok (public endpoint, rate limit düşük)
- Firestore rules strict validasyonlu — yeni field = yeni rule
- Her değişiklik sonrası: F12 Console temiz olmalı (agent çalıştırabiliyorsa kontrol et, yoksa kullanıcıya talimat ver)
