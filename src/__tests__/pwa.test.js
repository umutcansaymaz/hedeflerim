// ===== PWA Katmanı Statik Doğrulama Testleri =====
// sw.js / manifest.json / index.html / firebase.json / push yapılandırması
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('sw.js (Service Worker)', () => {
  const sw = read('sw.js');

  it('CACHE_NAME sürümü v11.0 (eski cache isimlerinden farklı)', () => {
    expect(sw).toContain("const CACHE_NAME = 'habit-tracker-v11.0-frontend-prod'");
  });

  it('network-first stratejisi (fetch event + cache fallback)', () => {
    expect(sw).toContain("self.addEventListener('fetch'");
    expect(sw).toContain('caches.open');
    expect(sw).toContain('fetch(event.request)');
  });

  it('/__/auth/ istekleri network-first muafiyetine sahip (auth fix korundu)', () => {
    expect(sw).toContain('/__/auth/');
  });

  it('push + notificationclick handlerları mevcut', () => {
    expect(sw).toContain("self.addEventListener('push'");
    expect(sw).toContain("self.addEventListener('notificationclick'");
  });

  it('install sırasında skipWaiting (hızlı güncelleme)', () => {
    expect(sw).toContain('self.skipWaiting()');
  });

  it('eski cache isimlerini temizleyen temizlik mantığı var', () => {
    expect(sw).toMatch(/caches\.delete|keys\(\).*forEach/s);
  });
});

describe('manifest.json', () => {
  const manifest = JSON.parse(read('manifest.json'));

  it('id ve scope kökten tanımlı', () => {
    expect(manifest.id).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('start_url / ve display standalone', () => {
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('ikon dosyaları repo kökünde mevcut', () => {
    expect(fs.existsSync(path.join(ROOT, 'icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'icon-512.png'))).toBe(true);
    const icons = manifest.icons || [];
    expect(icons.some(i => i.sizes === '192x192')).toBe(true);
    expect(icons.some(i => i.sizes === '512x512')).toBe(true);
  });
});

describe('index.html (PWA giriş noktası)', () => {
  const html = read('index.html');

  it('manifest linki ve apple-touch-icon geri geldi', () => {
    expect(html).toContain('<link rel="manifest" href="manifest.json">');
    expect(html).toContain('<link rel="apple-touch-icon" href="icon-192.png">');
  });

  it('unregister script kaldırıldı (yerini yeni SW aldı)', () => {
    expect(html).not.toContain('getRegistrations');
    expect(html).not.toContain('PWA kaldirildi');
  });

  it('PWA meta etiketleri mevcut', () => {
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('mobile-web-app-capable');
    expect(html).toContain('theme-color');
  });
});

describe('firebase.json (hosting headerları)', () => {
  const config = JSON.parse(read('firebase.json'));
  const headers = config.hosting.headers || [];

  it('sw.js no-cache kuralı (bayat sürüm sorununun kök çözümü)', () => {
    const rule = headers.find(h => h.source === '/sw.js');
    expect(rule).toBeTruthy();
    const cacheControl = (rule.headers || []).find(h => h.key === 'Cache-Control');
    expect(cacheControl.value).toContain('no-cache');
  });

  it('manifest.json cache kuralı mevcut', () => {
    const rule = headers.find(h => h.source === '/manifest.json');
    expect(rule).toBeTruthy();
  });
});

describe('Push yapılandırması', () => {
  it('firebase-config.js: public key dolu', () => {
    const cfg = read('src/config/firebase-config.js');
    const match = cfg.match(/HDEFLERIM_WEB_PUSH_PUBLIC_KEY = "([^"]*)"/);
    expect(match).toBeTruthy();
    expect(match[1].length).toBeGreaterThan(20);
  });

  it('constants.js: WEB_PUSH_PUBLIC_KEY köprüsü korunuyor', () => {
    const constants = read('src/utils/constants.js');
    expect(constants).toContain('window.WEB_PUSH_PUBLIC_KEY');
    expect(constants).toContain('window.PUSH_DEVICE_ID_STORAGE_KEY');
  });

  it('functions/.env: VAPID anahtar çifti tanımlı (değerler loglanmaz)', () => {
    const env = read('functions/.env');
    const publicLine = env.split('\n').find(l => l.startsWith('VAPID_PUBLIC_KEY='));
    const privateLine = env.split('\n').find(l => l.startsWith('VAPID_PRIVATE_KEY='));
    expect(publicLine).toBeTruthy();
    expect(privateLine).toBeTruthy();
    expect(publicLine.replace('VAPID_PUBLIC_KEY=', '').trim().length).toBeGreaterThan(20);
    expect(privateLine.replace('VAPID_PRIVATE_KEY=', '').trim().length).toBeGreaterThan(20);
  });
});
