// ===== Data Layer Tests =====
// Tests for normalizeAppData, mergeAppDataForSync, buildCloudWriteOperations, saveToCloud
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- normalizeAppData ----
describe('normalizeAppData()', () => {
  it('should return default data when input is null', () => {
    const result = globalThis.normalizeAppData(null);
    expect(result).toBeDefined();
    expect(Array.isArray(result.habits)).toBe(true);
    expect(result.habits).toHaveLength(0);
    expect(result.settings.theme).toBe('');
    expect(result.xp).toBe(0);
    expect(result.level).toBe(1);
  });

  it('should return default data when input is undefined', () => {
    const result = globalThis.normalizeAppData(undefined);
    expect(result).toBeDefined();
    expect(result.settings.reminderTime).toBe('20:00');
    expect(result.settings.smartReminderEnabled).toBe(true);
  });

  it('should return default data when input is not an object', () => {
    expect(globalThis.normalizeAppData('string').habits).toHaveLength(0);
    expect(globalThis.normalizeAppData(123).habits).toHaveLength(0);
  });

  it('should return default data when input is an empty object', () => {
    const result = globalThis.normalizeAppData({});
    expect(result.habits).toHaveLength(0);
    expect(result.todos).toHaveLength(0);
    expect(result.books).toHaveLength(0);
    expect(result.notes).toHaveLength(0);
    expect(result.focusSessions).toHaveLength(0);
    expect(result.settings.reminderTime).toBe('20:00');
  });

  describe('habits normalization', () => {
    it('should normalize a valid habit', () => {
      const input = {
        habits: [{
          name: 'Test Habit',
          color: '#FF0000',
          category: 'health'
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits).toHaveLength(1);
      expect(result.habits[0].name).toBe('Test Habit');
      expect(result.habits[0].color).toBe('#FF0000');
      expect(result.habits[0].id).toBeDefined();
      expect(result.habits[0].id).toContain('habit_');
      expect(result.habits[0].completions).toEqual({});
      expect(result.habits[0].goal).toBeNull();
    });

    it('should truncate habit name to 120 chars', () => {
      const longName = 'a'.repeat(200);
      const input = { habits: [{ name: longName }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].name.length).toBe(120);
    });

    it('should sanitize invalid habit color', () => {
      const input = { habits: [{ name: 'test', color: 'red' }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].color).toBe('#8B5CF6');
    });

    it('should normalize habit goal when valid', () => {
      const input = {
        habits: [{
          name: 'Run',
          goal: { value: 5, unit: 'km', frequency: 'daily' }
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].goal).not.toBeNull();
      expect(result.habits[0].goal.value).toBe(5);
      expect(result.habits[0].goal.unit).toBe('km');
      expect(result.habits[0].goal.frequency).toBe('daily');
    });

    it('should remove goal when value is 0', () => {
      const input = {
        habits: [{
          name: 'Test',
          goal: { value: 0, unit: 'km', frequency: 'daily' }
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].goal).toBeNull();
    });

    it('should remove goal when unit is empty', () => {
      const input = {
        habits: [{
          name: 'Test',
          goal: { value: 5, unit: '', frequency: 'daily' }
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].goal).toBeNull();
    });

    it('should default goal frequency to daily when invalid', () => {
      const input = {
        habits: [{
          name: 'Test',
          goal: { value: 5, unit: 'km', frequency: 'monthly' }
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].goal.frequency).toBe('daily');
    });

    it('should set weekly frequency when specified', () => {
      const input = {
        habits: [{
          name: 'Test',
          goal: { value: 3, unit: 'times', frequency: 'weekly' }
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].goal.frequency).toBe('weekly');
    });

    it('should convert non-array habits to empty array', () => {
      expect(globalThis.normalizeAppData({ habits: 'not-array' }).habits).toHaveLength(0);
      expect(globalThis.normalizeAppData({ habits: null }).habits).toHaveLength(0);
      expect(globalThis.normalizeAppData({ habits: {} }).habits).toHaveLength(0);
    });
  });

  describe('todos normalization', () => {
    it('should normalize a valid todo', () => {
      const input = {
        todos: [{ text: 'Test todo', bucket: 'today', completed: false }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.todos).toHaveLength(1);
      expect(result.todos[0].text).toBe('Test todo');
      expect(result.todos[0].bucket).toBe('today');
      expect(result.todos[0].completed).toBe(false);
    });

    it('should default invalid bucket to today', () => {
      const input = { todos: [{ text: 'test', bucket: 'invalid' }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.todos[0].bucket).toBe('today');
    });

    it('should accept week and someday buckets', () => {
      const input = { todos: [{ text: 'a', bucket: 'week' }, { text: 'b', bucket: 'someday' }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.todos[0].bucket).toBe('week');
      expect(result.todos[1].bucket).toBe('someday');
    });

    it('should truncate todo text to 500 chars', () => {
      const longText = 'x'.repeat(600);
      const input = { todos: [{ text: longText }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.todos[0].text.length).toBe(500);
    });

    it('should normalize dueDate to YYYY-MM-DD or empty', () => {
      const input = { todos: [{ text: 'a', dueDate: '2024-12-25' }, { text: 'b', dueDate: 'invalid' }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.todos[0].dueDate).toBe('2024-12-25');
      expect(result.todos[1].dueDate).toBe('');
    });

    it('should create id for todo without one', () => {
      const result = globalThis.normalizeAppData({ todos: [{ text: 'test' }] });
      expect(result.todos[0].id).toBeDefined();
      expect(result.todos[0].id).toContain('todo_');
    });
  });

  describe('books normalization', () => {
    it('should normalize a valid book', () => {
      const input = {
        books: [{
          title: 'Test Book',
          author: 'Author',
          totalPages: 300,
          currentPage: 50
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.books).toHaveLength(1);
      expect(result.books[0].title).toBe('Test Book');
      expect(result.books[0].totalPages).toBe(300);
      expect(result.books[0].currentPage).toBe(50);
    });

    it('should set status to pending for new book', () => {
      const result = globalThis.normalizeAppData({ books: [{ title: 'New Book' }] });
      expect(result.books[0].status).toBe('pending');
      expect(result.books[0].completed).toBe(false);
    });

    it('should set status to reading when currentPage > 0', () => {
      const result = globalThis.normalizeAppData({ books: [{ title: 'Reading', currentPage: 1 }] });
      expect(result.books[0].status).toBe('reading');
    });

    it('should set status to completed when explicitly set', () => {
      const result = globalThis.normalizeAppData({ books: [{ title: 'Done', status: 'completed' }] });
      expect(result.books[0].status).toBe('completed');
      expect(result.books[0].completed).toBe(true);
    });

    it('should ensure currentPage >= totalPages when completed', () => {
      const result = globalThis.normalizeAppData({
        books: [{ title: 'Done', status: 'completed', totalPages: 300, currentPage: 100 }]
      });
      expect(result.books[0].currentPage).toBe(300);
    });

    it('should cap dailyGoalPages at 5000', () => {
      const result = globalThis.normalizeAppData({ books: [{ title: 'Test', dailyGoalPages: 9999 }] });
      expect(result.books[0].dailyGoalPages).toBe(5000);
    });

    it('should sanitize invalid coverUrl', () => {
      const result = globalThis.normalizeAppData({ books: [{ title: 'Test', coverUrl: 'invalid' }] });
      expect(result.books[0].coverUrl).toBe('https://via.placeholder.com/40x60?text=No+Cover');
    });
  });

  describe('notes normalization', () => {
    it('should normalize a valid note', () => {
      const input = { notes: [{ title: 'Test Note', content: 'Content', category: 'general' }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].title).toBe('Test Note');
      expect(result.notes[0].category).toBe('general');
    });

    it('should default category to general', () => {
      const result = globalThis.normalizeAppData({ notes: [{ title: 'Test' }] });
      expect(result.notes[0].category).toBe('general');
    });

    it('should sanitize note color with white fallback', () => {
      const result = globalThis.normalizeAppData({ notes: [{ title: 'Test', color: 'bad' }] });
      expect(result.notes[0].color).toBe('#ffffff');
    });

    it('should keep valid note color', () => {
      const result = globalThis.normalizeAppData({ notes: [{ title: 'Test', color: '#FF0000' }] });
      expect(result.notes[0].color).toBe('#FF0000');
    });

    it('should set pinned and archived as booleans', () => {
      const result = globalThis.normalizeAppData({
        notes: [{ title: 'Test', pinned: true, archived: false }]
      });
      expect(result.notes[0].pinned).toBe(true);
      expect(result.notes[0].archived).toBe(false);
    });
  });

  describe('focusSessions normalization', () => {
    it('should normalize a valid focus session', () => {
      const input = {
        focusSessions: [{
          label: 'Study',
          mode: 'pomodoro',
          workSec: 1500,
          breakSec: 300
        }]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.focusSessions).toHaveLength(1);
      expect(result.focusSessions[0].label).toBe('Study');
      expect(result.focusSessions[0].mode).toBe('pomodoro');
    });

    it('should default to pomodoro mode for invalid mode', () => {
      const result = globalThis.normalizeAppData({ focusSessions: [{ mode: 'invalid' }] });
      expect(result.focusSessions[0].mode).toBe('pomodoro');
    });

    it('should accept stopwatch and countdown modes', () => {
      const result = globalThis.normalizeAppData({
        focusSessions: [{ mode: 'stopwatch' }, { mode: 'countdown' }]
      });
      expect(result.focusSessions[0].mode).toBe('stopwatch');
      expect(result.focusSessions[1].mode).toBe('countdown');
    });
  });

  describe('settings normalization', () => {
    it('should preserve valid settings', () => {
      const input = {
        settings: {
          theme: 'dark',
          notificationsEnabled: true,
          reminderTime: '08:00',
          smartReminderEnabled: true,
          focusWeeklyGoalMinutes: 300,
          annualGoalValue: 100000,
          annualGoalUnit: 'adım'
        }
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.settings.theme).toBe('dark');
      expect(result.settings.notificationsEnabled).toBe(true);
      expect(result.settings.reminderTime).toBe('08:00');
      expect(result.settings.focusWeeklyGoalMinutes).toBe(300);
    });

    it('should cap focusWeeklyGoalMinutes at 12000 (200h)', () => {
      const result = globalThis.normalizeAppData({ settings: { focusWeeklyGoalMinutes: 999999 } });
      expect(result.settings.focusWeeklyGoalMinutes).toBe(12000);
    });

    it('should cap annualGoalValue at 100000000', () => {
      const result = globalThis.normalizeAppData({ settings: { annualGoalValue: 999999999 } });
      expect(result.settings.annualGoalValue).toBe(100000000);
    });

    it('should default annualGoalUnit to adım when empty', () => {
      const result = globalThis.normalizeAppData({ settings: { annualGoalUnit: '' } });
      expect(result.settings.annualGoalUnit).toBe('adım');
    });

    it('should validate dashboardOrder', () => {
      const valid = globalThis.normalizeAppData({ settings: { dashboardOrder: 'motivation' } });
      expect(valid.settings.dashboardOrder).toBe('motivation');

      const invalid = globalThis.normalizeAppData({ settings: { dashboardOrder: 'bad' } });
      expect(invalid.settings.dashboardOrder).toBe('default');
    });

    it('should validate lastSmartReminderDate format', () => {
      const valid = globalThis.normalizeAppData({ settings: { lastSmartReminderDate: '2024-01-15' } });
      expect(valid.settings.lastSmartReminderDate).toBe('2024-01-15');

      const invalid = globalThis.normalizeAppData({ settings: { lastSmartReminderDate: '15-01-2024' } });
      expect(invalid.settings.lastSmartReminderDate).toBe('');
    });
  });

  describe('gamification normalization', () => {
    it('should normalize xp and level', () => {
      const result = globalThis.normalizeAppData({ xp: 150, level: 3 });
      expect(result.xp).toBe(150);
      expect(result.level).toBe(3);
    });

    it('should ensure non-negative xp', () => {
      const result = globalThis.normalizeAppData({ xp: -10 });
      expect(result.xp).toBe(0);
    });

    it('should ensure level >= 1', () => {
      const result = globalThis.normalizeAppData({ level: 0 });
      expect(result.level).toBe(1);
    });

    it('should filter invalid achievements', () => {
      const input = {
        achievements: [
          { id: 'early_bird', date: '2024-01-01' },
          { id: 'streak_7', date: '2024-01-02' },
          { noId: true }
        ]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.achievements).toHaveLength(2);
    });

    it('should deduplicate achievements by id', () => {
      const input = {
        achievements: [
          { id: 'early_bird', date: '2024-01-01' },
          { id: 'early_bird', date: '2024-01-02' }
        ]
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.achievements).toHaveLength(1);
    });
  });

  describe('moods normalization', () => {
    it('should preserve moods object', () => {
      const input = { moods: { '2024-01-15': 4, '2024-01-16': 3 } };
      const result = globalThis.normalizeAppData(input);
      expect(result.moods['2024-01-15']).toBe(4);
      expect(result.moods['2024-01-16']).toBe(3);
    });

    it('should default to empty object for non-object moods', () => {
      expect(globalThis.normalizeAppData({ moods: null }).moods).toEqual({});
      expect(globalThis.normalizeAppData({ moods: 'bad' }).moods).toEqual({});
      expect(globalThis.normalizeAppData({ moods: [] }).moods).toEqual({});
    });
  });

  describe('weeklyReview normalization', () => {
    it('should normalize weekly review map', () => {
      const input = {
        weeklyReview: {
          '2024-W03': { focus: 'Work', wins: 'Done', blockers: '', updatedAt: '2024-01-20T10:00:00.000Z' }
        }
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.weeklyReview['2024-W03']).toBeDefined();
      expect(result.weeklyReview['2024-W03'].focus).toBe('Work');
    });

    it('should skip invalid week keys', () => {
      const input = {
        weeklyReview: {
          'invalid': { focus: 'test', updatedAt: '2024-01-20T10:00:00.000Z' }
        }
      };
      const result = globalThis.normalizeAppData(input);
      expect(result.weeklyReview['invalid']).toBeUndefined();
    });
  });

  describe('createdAt and updatedAt normalization', () => {
    it('should generate createdAt if missing', () => {
      const result = globalThis.normalizeAppData({ habits: [{ name: 'test' }] });
      expect(result.habits[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should default updatedAt to createdAt if missing', () => {
      const result = globalThis.normalizeAppData({ habits: [{ name: 'test' }] });
      expect(result.habits[0].updatedAt).toBe(result.habits[0].createdAt);
    });

    it('should preserve valid ISO dates', () => {
      const input = { habits: [{ name: 'test', createdAt: '2024-01-01T00:00:00.000Z' }] };
      const result = globalThis.normalizeAppData(input);
      expect(result.habits[0].createdAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });
});

// ---- mergeAppDataForSync ----
describe('mergeAppDataForSync()', () => {
  it('should merge two empty data objects', () => {
    const local = globalThis.normalizeAppData({});
    const cloud = globalThis.normalizeAppData({});
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.habits).toHaveLength(0);
    expect(result.todos).toHaveLength(0);
    expect(result.settings.reminderTime).toBe('20:00');
  });

  it('should prefer cloud settings when they differ from local', () => {
    const local = globalThis.normalizeAppData({ settings: { theme: 'dark' } });
    const cloud = globalThis.normalizeAppData({ settings: { theme: 'light' } });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    // settings use spread merge: local first, then cloud, so cloud wins
    expect(result.settings.theme).toBe('light');
  });

  it('should merge unique items from both sides', () => {
    const local = globalThis.normalizeAppData({
      habits: [{ id: 'h1', name: 'Local Habit', updatedAt: '2024-01-01T00:00:00.000Z' }]
    });
    const cloud = globalThis.normalizeAppData({
      habits: [{ id: 'h2', name: 'Cloud Habit', updatedAt: '2024-01-02T00:00:00.000Z' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.habits).toHaveLength(2);
    const names = result.habits.map(h => h.name);
    expect(names).toContain('Local Habit');
    expect(names).toContain('Cloud Habit');
  });

  it('should resolve conflict with latest timestamp wins for habits', () => {
    const local = globalThis.normalizeAppData({
      habits: [{ id: 'h1', name: 'Local', updatedAt: '2024-01-01T00:00:00.000Z' }]
    });
    const cloud = globalThis.normalizeAppData({
      habits: [{ id: 'h1', name: 'Cloud', updatedAt: '2024-01-02T00:00:00.000Z' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.habits).toHaveLength(1);
    expect(result.habits[0].name).toBe('Cloud');
  });

  it('should merge completion maps from both sides for same habit', () => {
    const local = globalThis.normalizeAppData({
      habits: [{
        id: 'h1', name: 'Habit',
        completions: { '2024-01-01': true },
        updatedAt: '2024-01-01T00:00:00.000Z'
      }]
    });
    const cloud = globalThis.normalizeAppData({
      habits: [{
        id: 'h1', name: 'Habit',
        completions: { '2024-01-02': true },
        updatedAt: '2024-01-02T00:00:00.000Z'
      }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.habits).toHaveLength(1);
    const keys = Object.keys(result.habits[0].completions);
    expect(keys).toContain('2024-01-01');
    expect(keys).toContain('2024-01-02');
  });

  it('should merge todos by latest timestamp', () => {
    const local = globalThis.normalizeAppData({
      todos: [{ id: 't1', text: 'Local', updatedAt: '2024-01-01T00:00:00.000Z' }]
    });
    const cloud = globalThis.normalizeAppData({
      todos: [{ id: 't1', text: 'Cloud', updatedAt: '2024-01-02T00:00:00.000Z' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.todos[0].text).toBe('Cloud');
  });

  it('should not restore a cloud todo deleted locally after its last update', () => {
    globalThis.window.trashBin = [{
      trashId: 'trash-t1',
      type: 'todo',
      deletedAt: '2024-01-03T00:00:00.000Z',
      payload: { id: 't1', text: 'Deleted local todo' }
    }];
    const local = globalThis.normalizeAppData({ todos: [] });
    const cloud = globalThis.normalizeAppData({
      todos: [{ id: 't1', text: 'Stale cloud todo', updatedAt: '2024-01-02T00:00:00.000Z' }]
    });

    const result = globalThis.mergeAppDataForSync(local, cloud);

    expect(result.todos).toHaveLength(0);
    globalThis.window.trashBin = [];
  });

  it('should merge books with latest timestamp wins', () => {
    const local = globalThis.normalizeAppData({
      books: [{ id: 'b1', title: 'Local', currentPage: 10, updatedAt: '2024-01-01T00:00:00.000Z' }]
    });
    const cloud = globalThis.normalizeAppData({
      books: [{ id: 'b1', title: 'Cloud', currentPage: 50, updatedAt: '2024-01-02T00:00:00.000Z' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.books[0].title).toBe('Cloud');
    expect(result.books[0].currentPage).toBe(50);
  });

  it('should merge notes by latest timestamp', () => {
    const local = globalThis.normalizeAppData({
      notes: [{ id: 'n1', title: 'Local', updatedAt: '2024-01-01T00:00:00.000Z' }]
    });
    const cloud = globalThis.normalizeAppData({
      notes: [{ id: 'n1', title: 'Cloud', updatedAt: '2024-01-02T00:00:00.000Z' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.notes[0].title).toBe('Cloud');
  });

  it('should merge focus sessions by latest timestamp', () => {
    const local = globalThis.normalizeAppData({
      focusSessions: [{ id: 'f1', label: 'Local', workSec: 100, updatedAt: '2024-01-01T00:00:00.000Z' }]
    });
    const cloud = globalThis.normalizeAppData({
      focusSessions: [{ id: 'f1', label: 'Cloud', workSec: 200, updatedAt: '2024-01-02T00:00:00.000Z' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.focusSessions[0].label).toBe('Cloud');
  });

  it('should merge weekly review maps', () => {
    const local = globalThis.normalizeAppData({
      weeklyReview: { '2024-W01': { focus: 'Local focus', updatedAt: '2024-01-01T00:00:00.000Z' } }
    });
    const cloud = globalThis.normalizeAppData({
      weeklyReview: { '2024-W01': { focus: 'Cloud focus', updatedAt: '2024-01-02T00:00:00.000Z' } }
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.weeklyReview['2024-W01'].focus).toBe('Cloud focus');
  });

  it('should merge moods with cloud overwriting local', () => {
    const local = globalThis.normalizeAppData({ moods: { '2024-01-01': 3 } });
    const cloud = globalThis.normalizeAppData({ moods: { '2024-01-01': 5, '2024-01-02': 4 } });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.moods['2024-01-01']).toBe(5);
    expect(result.moods['2024-01-02']).toBe(4);
  });

  it('should merge achievements with deduplication', () => {
    const local = globalThis.normalizeAppData({
      achievements: [{ id: 'early_bird', date: '2024-01-01' }]
    });
    const cloud = globalThis.normalizeAppData({
      achievements: [{ id: 'streak_7', date: '2024-01-02' }]
    });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.achievements).toHaveLength(2);
  });

  it('should take max xp and level', () => {
    const local = globalThis.normalizeAppData({ xp: 100, level: 2 });
    const cloud = globalThis.normalizeAppData({ xp: 200, level: 3 });
    const result = globalThis.mergeAppDataForSync(local, cloud);
    expect(result.xp).toBe(200);
    expect(result.level).toBe(3);
  });

  it('should handle null/undefined local data', () => {
    const cloud = globalThis.normalizeAppData({ habits: [{ id: 'h1', name: 'Cloud', updatedAt: new Date().toISOString() }] });
    const result = globalThis.mergeAppDataForSync(null, cloud);
    expect(result.habits).toHaveLength(1);
  });

  it('should handle null/undefined cloud data', () => {
    const local = globalThis.normalizeAppData({ habits: [{ id: 'h1', name: 'Local', updatedAt: new Date().toISOString() }] });
    const result = globalThis.mergeAppDataForSync(local, null);
    expect(result.habits).toHaveLength(1);
  });
});

// ---- buildCloudWriteOperations ----
describe('buildCloudWriteOperations()', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an array of operations for identical empty data', () => {
    const local = globalThis.normalizeAppData({});
    const base = globalThis.normalizeAppData({});
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    expect(Array.isArray(ops)).toBe(true);
    // When both are empty, only the metadata operation is pushed
    expect(ops.length).toBe(1);
    expect(ops[0].type).toBe('set');
    expect(ops[0].data).toBeDefined();
    expect(ops[0].data.schemaVersion).toBe(2);
  });

  it('should push a state operation when data differs from base', () => {
    const local = globalThis.normalizeAppData({ settings: { theme: 'dark' } });
    const base = globalThis.normalizeAppData({ settings: { theme: 'light' } });
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    // Find operations that carry state-like payload (has settings field)
    const stateOps = ops.filter(op =>
      op.type === 'set' && op.data && typeof op.data.settings === 'object'
    );
    // The first such op is the state op, the metadata op also has state but no settings
    expect(stateOps.length).toBeGreaterThanOrEqual(1);
  });

  it('should produce upsert operations for new items', () => {
    const local = globalThis.normalizeAppData({ habits: [{ id: 'h1', name: 'New Habit', updatedAt: new Date().toISOString() }] });
    const base = globalThis.normalizeAppData({});
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    const habitOps = ops.filter(op =>
      op.type === 'set' &&
      op.data &&
      op.data.id === 'h1'
    );
    expect(habitOps.length).toBeGreaterThanOrEqual(1);
  });

  it('should produce delete operations for removed items', () => {
    const local = globalThis.normalizeAppData({});
    const base = globalThis.normalizeAppData({ habits: [{ id: 'h_old', name: 'Old', updatedAt: '2024-01-01T00:00:00.000Z' }] });
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    const deleteOps = ops.filter(op => op.type === 'delete');
    expect(deleteOps.length).toBeGreaterThanOrEqual(1);
  });

  it('should include set operations for all entity types when new', () => {
    const now = new Date().toISOString();
    const local = globalThis.normalizeAppData({
      habits: [{ id: 'h1', name: 'H1', updatedAt: now }],
      todos: [{ id: 't1', text: 'T1', updatedAt: now }],
      books: [{ id: 'b1', title: 'B1', updatedAt: now }],
      notes: [{ id: 'n1', title: 'N1', updatedAt: now }],
      focusSessions: [{ id: 'f1', label: 'F1', updatedAt: now }]
    });
    const base = globalThis.normalizeAppData({});
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    const setOps = ops.filter(op => op.type === 'set' && op.data);
    const entityIds = setOps.map(op => op.data?.id).filter(Boolean);
    expect(entityIds).toContain('h1');
    expect(entityIds).toContain('t1');
    expect(entityIds).toContain('b1');
    expect(entityIds).toContain('n1');
    expect(entityIds).toContain('f1');
  });

  it('should not push same-item upserts when data is unchanged', () => {
    const now = new Date().toISOString();
    const item = { id: 'h1', name: 'Stable', updatedAt: now };
    const local = globalThis.normalizeAppData({ habits: [item] });
    const base = globalThis.normalizeAppData({ habits: [item] });
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    const habitOps = ops.filter(op =>
      op.type === 'set' &&
      op.data &&
      op.data.id === 'h1'
    );
    // Should NOT upsert items that haven't changed
    expect(habitOps).toHaveLength(0);
  });

  it('should produce operations array in correct order: state, collections, metadata', () => {
    const local = globalThis.normalizeAppData({ habits: [{ id: 'h1', name: 'New', updatedAt: new Date().toISOString() }] });
    const base = globalThis.normalizeAppData({});
    const ops = globalThis.buildCloudWriteOperations(userId, local, base);
    expect(ops.length).toBeGreaterThanOrEqual(2);
    // Last operation should always be metadata (user doc set)
    const lastOp = ops[ops.length - 1];
    expect(lastOp.type).toBe('set');
    expect(lastOp.data).toBeDefined();
    expect(lastOp.data.schemaVersion).toBeDefined();
    expect(lastOp.options).toBeDefined();
    expect(lastOp.options.merge).toBe(true);
  });
});

// ---- saveToCloud ----
/**
 * Helper: simulate Firebase auth state to set the lexical `currentUser` variable.
 * The app-v5.js registers an onAuthStateChanged callback during setup.
 * We retrieve that callback (stored persistently via setup.js) and fire it
 * to set `currentUser` in the eval scope.
 */
function simulateAuthState(user) {
  const ref = globalThis.__getAuthCallbackRef();
  if (ref && typeof ref.current === 'function') {
    ref.current(user);
  }
}

/**
 * Helper: fully login and wait for the async auth chain (loadFromCloud) to settle.
 * Returns a promise that resolves when the chain is done.
 */
const SETTLE_ITERATIONS = 5;

async function loginAndSettle() {
  const testUser = {
    uid: 'test-uid-123',
    email: 'testuser@example.com',
    displayName: 'Test User',
    photoURL: ''
  };
  simulateAuthState(testUser);
  globalThis.currentUser = testUser;
  globalThis.window.currentUser = testUser;
  // Wait for async auth chain (loadFromCloud -> fetchCloudBundle -> saveToCloud etc.) to settle
  for (let i = 0; i < SETTLE_ITERATIONS; i++) {
    await new Promise(r => setTimeout(r, 20));
  }
}

/**
 * Helper: logout (simulateAuthState(null)) and wait for chain to settle.
 */
async function logoutAndSettle() {
  simulateAuthState(null);
  globalThis.currentUser = null;
  globalThis.window.currentUser = null;
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 20));
  }
}

describe('saveToCloud()', () => {
  beforeEach(async () => {
    // Start each test in a "logged out" state with online=true
    globalThis.navigator.onLine = true;
    await logoutAndSettle();
  });

  it('should return false when currentUser is null (never logged in)', async () => {
    const result = await globalThis.saveToCloud();
    expect(result).toBe(false);
  });

  it('should return false when offline', async () => {
    await loginAndSettle();
    globalThis.navigator.onLine = false;

    try {
      const result = await globalThis.saveToCloud();
      expect(result).toBe(false);
    } finally {
      globalThis.navigator.onLine = true;
    }
  });

  it('should return false on Firestore error', async () => {
    await loginAndSettle();
    const originalBuildOps = globalThis.window.buildCloudWriteOperations;
    globalThis.window.buildCloudWriteOperations = vi.fn(() => {
      throw new Error('Simulated cloud write error');
    });
    try {
      const result = await globalThis.saveToCloud(true);
      expect(result).toBe(false);
    } finally {
      globalThis.window.buildCloudWriteOperations = originalBuildOps;
    }
  });

  it('should handle transient errors', async () => {
    await loginAndSettle();
    const originalIsTransient = globalThis.isTransientCloudError;
    const originalBuildOps = globalThis.window.buildCloudWriteOperations;
    globalThis.isTransientCloudError = vi.fn(() => true);
    globalThis.window.buildCloudWriteOperations = vi.fn(() => {
      throw { code: 'unavailable', message: 'Service unavailable' };
    });
    try {
      const result = await globalThis.saveToCloud(true);
      expect(result).toBe(false);
    } finally {
      globalThis.window.buildCloudWriteOperations = originalBuildOps;
      globalThis.isTransientCloudError = originalIsTransient;
    }
  });

  it('should return true on successful save', async () => {
    await loginAndSettle();
    const result = await globalThis.saveToCloud(true);
    expect(result).toBe(true);
  });
});
