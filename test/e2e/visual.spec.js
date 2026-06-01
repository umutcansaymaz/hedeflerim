/**
 * Hedeflerim PWA — Görsel Regresyon Testleri
 *
 * Playwright görsel snapshot testleri. Her test sayfanın ekran
 * görüntüsünü alır ve test/e2e/screenshots/ klasöründeki
 * referansla karşılaştırır.
 *
 * Kullanım:
 *   npx playwright test --update-snapshots   (referans güncelleme)
 */

import { test, expect } from '@playwright/test';
import { seedTestData, clearTestData } from './seed.js';

// ── Sabitler ─────────────────────────────────────────────────
const VIEWPORT_DESKTOP = { width: 1280, height: 800 };
const VIEWPORT_MOBILE = { width: 375, height: 812 };
const BASE_URL = 'http://localhost:5000';

// ── Test Setup ───────────────────────────────────────────────
test.beforeEach(async ({ page }) => {
  await clearTestData(page);
  await seedTestData(page);
});

// ── PWA Varlık Kontrolü (GR-PW01) ────────────────────────────
test.describe('PWA Varlık Kontrolleri (GR-PW01)', () => {
  test('manifest.json mevcut ve geçerli', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/manifest.json`);
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json.name).toBe('Hedeflerim');
    expect(json.display).toBe('standalone');
    expect(json.background_color).toBe(json.theme_color); // tutarlılık
    expect(json.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('icon-192.png ve icon-512.png erişilebilir', async ({ page }) => {
    const icon192 = await page.goto(`${BASE_URL}/icon-192.png`);
    expect(icon192.ok()).toBeTruthy();
    const icon512 = await page.goto(`${BASE_URL}/icon-512.png`);
    expect(icon512.ok()).toBeTruthy();
  });
});

// ── Anasayfa — Boş State ─────────────────────────────────────
test.describe('Anasayfa — Boş State', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('anasayfa bos state desktop', async ({ page }) => {
    await clearTestData(page);
    await page.goto(BASE_URL);

    // Splash screen'in geçmesini bekle
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Dashboard "henüz alışkanlık eklenmedi" mesajını doğrula
    await expect(page.locator('#dashboardHabits')).toContainText(
      /henüz alışkanlık eklenmedi/i
    );

    // Görsel snapshot
    await expect(page).toHaveScreenshot('anasayfa-bos.png');
  });
});

// ── Anasayfa — Dolu State ────────────────────────────────────
test.describe('Anasayfa — Dolu State', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('anasayfa dolu state desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    const hasHabits = await page.locator('#dashboardHabits').count();
    if (hasHabits > 0) {
      await expect(page).toHaveScreenshot('anasayfa-dolu.png');
    }
  });
});

// ── Hedef (Alışkanlık) Ekleme Modalı ─────────────────────────
test.describe('Hedef Ekleme Modalı', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('hedef ekleme modali acik', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Alışkanlıklar sekmesine git ve FAB'a tıkla
    await page.click('[data-tab="habits"]');
    await page.waitForTimeout(500);
    await page.click('#addHabitBtn'); // FAB butonu

    // Modal açılana kadar bekle
    await expect(page.locator('#habitModal')).toHaveClass(/active/);

    // Şablon butonlarının göründüğünü doğrula
    await expect(page.locator('.habit-templates')).toBeVisible();

    await expect(page).toHaveScreenshot('hedef-ekleme-modali.png');
  });
});

// ── Focus Timer Overlay ──────────────────────────────────────
test.describe('Focus Timer', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('focus timer calisirken', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Focus timer toggle butonuna tıkla
    await page.click('#focusTimerToggleBtn');

    // Overlay açılana kadar bekle
    await expect(page.locator('#focusOverlay')).toHaveClass(/active/);

    // Timer card görünür olmalı
    await expect(page.locator('#focusTimerCard')).toBeVisible();

    await expect(page).toHaveScreenshot('focus-timer-overlay.png');
  });
});

// ── İstatistikler (İlerleme) Sekmesi ─────────────────────────
test.describe('İstatistikler Sekmesi', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('istatistikler sekmesi desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // İlerleme sekmesine git
    await page.click('[data-tab="progress"]');
    await page.waitForTimeout(500);

    // Progress container görünür olmalı
    await expect(page.locator('#progressContainer')).toBeVisible();

    // Header doğru metni gösteriyor
    await expect(page.locator('.progress-header h2')).toContainText(
      /yıllık ilerleme/i
    );

    await expect(page).toHaveScreenshot('istatistikler-sekmesi.png');
  });
});

// ── Karanlık Tema ────────────────────────────────────────────
test.describe('Karanlık Tema', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('karanlik tema acik desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Ayarlar modalını aç
    await page.click('#settingsBtn');
    await expect(page.locator('#settingsModal')).toHaveClass(/active/);

    // Karanlık tema seçeneğine tıkla
    const darkThemeBtn = page.locator('.theme-option[data-theme="dark"]');
    await darkThemeBtn.click();

    // Tema değişikliğinin uygulanmasını bekle
    await page.waitForTimeout(500);

    // Ayarlar modalını kapat
    await page.click('#closeSettings');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('karanlik-tema.png');
  });
});

// ── Ayar Modalı ──────────────────────────────────────────────
test.describe('Ayar Modalı', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('ayar modali acik desktop', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Ayarlar butonuna tıkla
    await page.click('#settingsBtn');

    // Modal açılana kadar bekle
    await expect(page.locator('#settingsModal')).toHaveClass(/active/);

    // Tema seçici görünür olmalı
    await expect(page.locator('#themePicker')).toBeVisible();

    // Cloud sync bölümü görünür olmalı
    await expect(page.locator('#googleLoginBtn')).toBeVisible();

    await expect(page).toHaveScreenshot('ayar-modali.png');
  });
});

// ── Mobil Görünüm ────────────────────────────────────────────
test.describe('Mobil Görünüm (375px)', () => {
  test.use({ viewport: VIEWPORT_MOBILE });

  test('anasayfa mobil', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Mobil görünüm kontrolü
    await expect(page.locator('.tab-nav')).toBeVisible();

    await expect(page).toHaveScreenshot('anasayfa-mobil.png');
  });

  test('hedef ekleme modali mobil', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Mobilde habits FAB'ına tıkla
    await page.click('[data-tab="habits"]');
    await page.waitForTimeout(500);
    await page.click('#addHabitBtn');

    await expect(page.locator('#habitModal')).toHaveClass(/active/);
    await expect(page).toHaveScreenshot('hedef-ekleme-modali-mobil.png');
  });

  test('focus timer mobil', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    await page.click('#focusTimerToggleBtn');
    await expect(page.locator('#focusOverlay')).toHaveClass(/active/);
    await expect(page).toHaveScreenshot('focus-timer-mobil.png');
  });

  test('ayar modali mobil', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    await page.click('#settingsBtn');
    await expect(page.locator('#settingsModal')).toHaveClass(/active/);
    await expect(page).toHaveScreenshot('ayar-modali-mobil.png');
  });
});

// ── Smoke Test (Hızlı Sağlık Kontrolü) ───────────────────────
test.describe('Smoke Test — Hızlı Sağlık Kontrolü', () => {
  test('tum sekmeler goruntulenebilir', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('.app-container', { state: 'visible' });

    // Tüm sekmeleri sırayla dolaş
    const tabs = ['dashboard', 'habits', 'books', 'todos', 'notes', 'progress'];

    for (const tab of tabs) {
      await page.click(`[data-tab="${tab}"]`);
      await page.waitForTimeout(400);

      // İlgili tab content'in görünür olduğunu doğrula
      const tabContent = page.locator(`#${tab}Tab`);
      await expect(tabContent).toBeVisible();
    }

    // Splash screen kaybolmuş olmalı (PWA)
    await expect(page.locator('#splashScreen')).toBeHidden();
  });
});
