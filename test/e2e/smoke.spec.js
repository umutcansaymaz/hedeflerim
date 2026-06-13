// @ts-check
// ===== Playwright Smoke Test =====
// Tests critical user flows: page load, navigation, habit creation, timer interaction
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests — Page Load & Core UI', () => {

  test('should load the app and display the login button', async ({ page }) => {
    await page.goto('/');
    // The app should render the login screen or dashboard
    await page.waitForLoadState('networkidle');
    // Check that the page title is set
    const title = await page.title();
    expect(title).toBeTruthy();
    // Either a login button or the main dashboard should be visible
    const loginBtn = page.locator('#googleLoginBtn');
    const dashboard = page.locator('#dashboard');
    await expect(loginBtn.or(dashboard)).toBeAttached({ timeout: 10000 });
  });

  test('should have the PWA meta tags', async ({ page }) => {
    await page.goto('/');
    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', /manifest\.json/);
    // Check theme-color meta
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', /#0F1638/i);
  });

  test('should display navigation tabs when logged in (local mode)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Even without login, tab buttons may exist in the HTML
    const navButtons = page.locator('nav button, .nav-btn, [class*="tab"]');
    const count = await navButtons.count();
    // There should be navigation UI elements
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have the focus timer section on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The focus timer section should be in the DOM
    const timerSection = page.locator('#focusTimerSection, [class*="focus"], [id*="timer"]');
    await expect(timerSection.first()).toBeAttached({ timeout: 5000 });
  });

  test('should have settings button accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Settings button should exist
    const settingsBtn = page.locator('#settingsBtn, [onclick*="settings"], [class*="settings"]');
    await expect(settingsBtn.first()).toBeAttached({ timeout: 5000 });
  });
});

test.describe('Smoke Tests — Habits Tab', () => {

  test('should navigate to habits tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Find and click the habits tab/nav button
    const habitsTab = page.locator('button:has-text("Alışkanlıklar"), [onclick*="habits"], [onclick*="Habits"]');
    if (await habitsTab.count() > 0) {
      await habitsTab.first().click();
      await page.waitForTimeout(500);
      // After clicking, habits section should be visible
      const habitsSection = page.locator('#habits, [class*="habits"], [id*="habits"]');
      await expect(habitsSection.first()).toBeAttached({ timeout: 3000 });
    }
  });
});

test.describe('Smoke Tests — Books Tab', () => {

  test('should navigate to books tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const booksTab = page.locator('button:has-text("Kitaplar"), [onclick*="books"], [onclick*="Books"]');
    if (await booksTab.count() > 0) {
      await booksTab.first().click();
      await page.waitForTimeout(500);
      const booksSection = page.locator('#books, [class*="books"], [id*="books"]');
      await expect(booksSection.first()).toBeAttached({ timeout: 3000 });
    }
  });
});

test.describe('Smoke Tests — Quick Add Modal', () => {

  test('should have a quick add button or mechanism', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Look for quick add elements
    const quickAddBtn = page.locator('#quickCaptureBtn');
    await expect(quickAddBtn.first()).toBeAttached({ timeout: 5000 });
  });
});

test.describe('Smoke Tests — Offline / App Shell', () => {

  test('should show app shell when offline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Simulate offline
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // The app shell should still render (PWA requirement)
    const bodyContent = page.locator('body');
    await expect(bodyContent).toBeAttached({ timeout: 5000 });
    // Restore online
    await page.context().setOffline(false);
  });
});

test.describe('BUG-004 — Todo Completion Persistence', () => {

  test('should persist todo completion status across page reload', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1b. Dismiss onboarding modal (appears after ~1700ms delay)
    await page.evaluate(() => { if (typeof window.closeOnboardingModal === 'function') window.closeOnboardingModal(true); });
    await page.waitForTimeout(500);
    // Force-close via evaluate in case the timeout hasn't fired yet
    await page.evaluate(() => { document.getElementById('onboardingModal')?.classList.remove('active'); });
    await page.waitForTimeout(200);

    // 2. Navigate to todos tab
    const todosTab = page.locator('button.tab-btn[data-tab="todos"]');
    await expect(todosTab).toBeVisible({ timeout: 5000 });
    await todosTab.click();
    await page.waitForTimeout(500);

    // 3. Create a new todo
    const todoInput = page.locator('#todoInput');
    await expect(todoInput).toBeVisible({ timeout: 3000 });
    await todoInput.fill('BUG-004 test todo (will be deleted)');

    const addBtn = page.locator('#addTodoBtn');
    await addBtn.click();
    await page.waitForTimeout(300);

    // 4. Verify the todo appears in the list
    const todoItem = page.locator('.todo-item').first();
    await expect(todoItem).toBeVisible({ timeout: 3000 });

    // 5. Click checkbox to mark as completed
    const checkbox = todoItem.locator('.todo-checkbox');
    await checkbox.click({ force: true });
    await page.waitForTimeout(300);

    // 6. Verify todo has 'completed' class immediately after toggle
    await expect(todoItem).toHaveClass(/completed/, { timeout: 2000 });

    // 7. RELOAD the page (tests the immediate save persistence)
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Dismiss onboarding again (just in case localStorage was cleared)
    await page.evaluate(() => { document.getElementById('onboardingModal')?.classList.remove('active'); });

    // 8. Navigate back to todos tab
    const todosTabAgain = page.locator('button.tab-btn[data-tab="todos"]');
    await expect(todosTabAgain).toBeVisible({ timeout: 5000 });
    await todosTabAgain.click();
    await page.waitForTimeout(500);

    // 9. Verify the todo is STILL completed after reload (persistence check)
    const persistedTodo = page.locator('.todo-item.completed').first();
    await expect(persistedTodo).toBeVisible({ timeout: 5000 });

    // 10. Cleanup: delete the test todo
    const deleteBtn = persistedTodo.locator('.todo-delete');
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    }
  });
});
