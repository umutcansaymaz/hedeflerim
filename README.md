# Hedeflerim

Kisisel hedef, aliskanlik, kitap, not ve odak zamani takibi icin vanilla JS + Firebase tabanli PWA.

## Ozellikler

- Aliskanlik ve gunluk hedef takibi
- Todo, kitap, not ve odak zamanlayici modulleri
- Firebase Auth ve Firestore ile bulut senkronizasyonu
- PWA, service worker ve web push bildirim altyapisi
- Tema secenekleri, ilerleme raporlari ve oyunlastirma

## Kurulum

```bash
npm install
npm test
```

Statik olarak calistirmak icin herhangi bir local server kullanabilirsin:

```bash
npx serve .
```

## Firebase Yapilandirmasi

Public repo gercek proje bilgileriyle gelmez. Kendi Firebase projen icin:

1. `src/config/firebase-config.example.js` dosyasini referans al.
2. `src/config/firebase-config.js` icindeki placeholder degerleri kendi Firebase Web App config degerlerinle doldur.
3. `window.HDEFLERIM_ALLOWED_EMAILS` listesini kendi izinli e-postalarinla guncelle.
4. `firestore.rules` icindeki `you@example.com` placeholder adresini kendi izinli adresinle degistir.

Web push kullanacaksan `window.HDEFLERIM_WEB_PUSH_PUBLIC_KEY` degerini public VAPID key ile doldur.

## Firebase Functions Secrets

`functions/index.js` VAPID private key'i kaynak koddan okumaz. Deploy ortamina su environment degerlerini ekle:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Eski veya public olmus VAPID key'leri kullanma; yeni key uretip deploy et.

## Test

```bash
npm test
npm run test:e2e
```

## Guvenlik

Public repo'ya acmadan once `SECURITY.md` dosyasindaki kontrol listesini uygula.
