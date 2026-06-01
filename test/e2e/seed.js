/**
 * ============================================================
 *  Hedeflerim PWA — Test Verisi Hazırlama Helper
 * ============================================================
 *
 *  Bu modül Playwright E2E testleri için localStorage'a
 *  test verisi yazar. Visual.spec.js'de beforeEach hook'unda
 *  çağrılır.
 *
 *  Kullanım:
 *    import { seedTestData, clearTestData } from './seed.js';
 *    await seedTestData(page);
 * ============================================================
 */

const TEST_HABITS = [
  {
    id: 'test-habit-1',
    name: 'Kitap Oku',
    emoji: '📚',
    color: '#4A90D9',
    type: 'boolean',
    weeklyGoal: 5,
    archived: false,
    createdAt: new Date('2026-01-01').toISOString(),
    streak: 3,
    totalCompletions: 15,
    dailyLogs: {}
  },
  {
    id: 'test-habit-2',
    name: 'Meditasyon Yap',
    emoji: '🧘',
    color: '#7B68EE',
    type: 'boolean',
    weeklyGoal: 7,
    archived: false,
    createdAt: new Date('2026-01-15').toISOString(),
    streak: 5,
    totalCompletions: 20,
    dailyLogs: {}
  }
];

const TEST_TODOS = [
  {
    id: 'test-todo-1',
    text: 'Proje raporunu bitir',
    completed: false,
    priority: 'high',
    createdAt: new Date('2026-05-01').toISOString()
  },
  {
    id: 'test-todo-2',
    text: 'Spor salonuna git',
    completed: true,
    priority: 'medium',
    createdAt: new Date('2026-05-02').toISOString()
  },
  {
    id: 'test-todo-3',
    text: 'Ekmek al',
    completed: false,
    priority: 'low',
    createdAt: new Date('2026-05-03').toISOString()
  }
];

const TEST_BOOKS = [
  {
    id: 'test-book-1',
    title: 'Savaş ve Barış',
    author: 'Tolstoy',
    pages: 1225,
    currentPage: 340,
    status: 'reading',
    color: '#E74C3C',
    createdAt: new Date('2026-02-01').toISOString()
  }
];

const TEST_SETTINGS = {
  theme: 'light',
  reminderTime: '20:00',
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  soundEnabled: false,
  dailyGoal: 1
};

/**
 * Test verisini page context'inin localStorage'ına yazar.
 * @param {import('@playwright/test').Page} page
 */
export async function seedTestData(page) {
  await page.evaluate((data) => {
    const { habits, todos, books, settings } = data;

    localStorage.setItem('hedeflerim_habits', JSON.stringify(habits));
    localStorage.setItem('hedeflerim_todos', JSON.stringify(todos));
    localStorage.setItem('hedeflerim_books', JSON.stringify(books));
    localStorage.setItem('hedeflerim_settings', JSON.stringify(settings));
    localStorage.setItem('hedeflerim_xp', '250');
    localStorage.setItem('hedeflerim_level', '3');

    // Focus session kaydı
    const focusSessions = [
      {
        id: 'test-focus-1',
        date: '2026-05-08',
        duration: 25,
        completed: true
      },
      {
        id: 'test-focus-2',
        date: '2026-05-09',
        duration: 25,
        completed: true
      }
    ];
    localStorage.setItem('hedeflerim_focusSessions', JSON.stringify(focusSessions));
  }, {
    habits: TEST_HABITS,
    todos: TEST_TODOS,
    books: TEST_BOOKS,
    settings: TEST_SETTINGS
  });
}

/**
 * localStorage'daki tüm test verisini temizler.
 * @param {import('@playwright/test').Page} page
 */
export async function clearTestData(page) {
  await page.evaluate(() => {
    const keys = [
      'hedeflerim_habits',
      'hedeflerim_todos',
      'hedeflerim_books',
      'hedeflerim_settings',
      'hedeflerim_xp',
      'hedeflerim_level',
      'hedeflerim_focusSessions',
      'hedeflerim_notes',
      'hedeflerim_moodEntries'
    ];
    keys.forEach(key => localStorage.removeItem(key));
  });
}
