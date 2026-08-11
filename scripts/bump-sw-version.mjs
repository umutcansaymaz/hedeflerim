// Hedeflerim — Deploy öncesi sw.js sürüm damgası
// firebase.json hosting.predeploy üzerinden her `firebase deploy` çağrısında otomatik çalışır.
// sw.js içeriğini her deployda değiştirerek tarayıcıların yeni Service Worker'ı görmesini
// garanti eder (skipWaiting -> clients.claim -> controllerchange -> otomatik reload zinciri).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SW_PATH = fileURLToPath(new URL('../sw.js', import.meta.url));
const sw = readFileSync(SW_PATH, 'utf8');

const stamp = Date.now();
const newCacheName = `habit-tracker-v11.0-${stamp}-prod`;

const updated = sw.replace(
    /const CACHE_NAME = 'habit-tracker-v11\.0-[^']*';/,
    `const CACHE_NAME = '${newCacheName}';`
);

if (!updated.includes(newCacheName)) {
    console.error("HATA: sw.js içinde CACHE_NAME deseni bulunamadı (const CACHE_NAME = 'habit-tracker-v11.0-<değer>').");
    process.exit(1);
}

writeFileSync(SW_PATH, updated);
console.log(`SW sürüm damgası vuruldu: ${newCacheName}`);
