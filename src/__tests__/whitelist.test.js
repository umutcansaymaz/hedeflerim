import { describe, it, expect } from 'vitest';

// Bulut kayıt hatası (permission-denied) düzeltmesi regresyon testleri (Ağu 2026):
// Kurallar hasOnly ile sıkılaştırıldığında eski/yabancı alanlar yazımı reddediyordu.
// Fix: normalizer'lar whitelist'e çevrildi (kural alanlarıyla birebir) + kök merge:false.
// Bu testler, kural dışı alanın HİÇBİR payload'a giremeyeceğini sabitler.

// firestore.rules'daki hasOnly listeleriyle birebir (senkron tutulmalı!)
const RULES = {
  settings: ['theme', 'notificationsEnabled', 'reminderTime', 'smartReminderEnabled', 'lastFixedReminderKey', 'lastSmartReminderDate', 'lastWeeklySummaryDismissed', 'focusWeeklyGoalMinutes', 'focusSoundEnabled', 'annualGoalValue', 'annualGoalUnit', 'dashboardOrder'],
  habit: ['id', 'name', 'color', 'completions', 'category', 'goal', 'createdAt', 'updatedAt'],
  todo: ['id', 'text', 'completed', 'bucket', 'dueDate', 'createdAt', 'updatedAt'],
  book: ['id', 'title', 'author', 'coverUrl', 'totalPages', 'currentPage', 'dailyGoalPages', 'dailyReadLog', 'status', 'completed', 'createdAt', 'updatedAt'],
  note: ['id', 'title', 'content', 'category', 'color', 'pinned', 'archived', 'createdAt', 'updatedAt'],
  focus: ['id', 'label', 'mode', 'preset', 'startedAt', 'endedAt', 'workSec', 'breakSec', 'interruptions', 'plannedWorkSec', 'completionPct', 'deepWorkScore', 'linkedType', 'linkedId', 'linkedLabel', 'cycles', 'createdAt', 'updatedAt'],
  state: ['settings', 'weeklyReview', 'moods', 'xp', 'level', 'achievements', 'updatedAt'],
  root: ['schemaVersion', 'lastClientSyncAt', 'counters', 'app', 'updatedAt']
};

const keysOf = obj => Object.keys(obj).sort();

describe('whitelist: normalizer kural dışı alanları payload\'a geçirmez', () => {
  it('settings: eski sürüm alanları (weeklySummaryDay, vibration vb.) düşer, kural alanları korunur', () => {
    const out = window.normalizeAppData({
      settings: {
        theme: 'ocean',
        notificationsEnabled: true,
        reminderTime: '20:00',
        smartReminderEnabled: true,
        lastFixedReminderKey: 'k1',
        lastSmartReminderDate: '2026-06-07',
        lastWeeklySummaryDismissed: '2026-02-20',
        focusWeeklyGoalMinutes: 900,
        focusSoundEnabled: true,
        annualGoalValue: 0,
        annualGoalUnit: 'adım',
        dashboardOrder: 'default',
        weeklySummaryDay: 1,
        vibration: true,
        hideCompleted: false,
        soundEnabled: 'eski-alan'
      }
    });
    expect(keysOf(out.settings)).toEqual(keysOf(Object.fromEntries(RULES.settings.map(k => [k, 1]))));
    expect(out.settings.weeklySummaryDay).toBeUndefined();
    expect(out.settings.vibration).toBeUndefined();
  });

  it('habit: archived/pinned/sortOrder/streak gibi eski alanlar düşer, 8 kural alanı kalır', () => {
    const out = window.normalizeAppData({
      habits: [{
        id: 'h1', name: 'Kitap Okuma', color: '#06B6D4', category: 'creativity',
        completions: { '2026-08-13': { time: '2026-08-13T10:00:00.000Z', value: 30 } },
        goal: { value: 30, unit: 'sayfa', frequency: 'daily' },
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z',
        archived: true, pinned: true, sortOrder: 3, streak: 12, weekCompletions: { '2026-W33': 4 }
      }]
    });
    const habit = out.habits[0];
    expect(keysOf(habit)).toEqual(keysOf(Object.fromEntries(RULES.habit.map(k => [k, 1]))));
    expect(habit.archived).toBeUndefined();
    expect(habit.pinned).toBeUndefined();
    expect(habit.sortOrder).toBeUndefined();
    expect(habit.streak).toBeUndefined();
    // goal içi whitelist: yabancı goal alanı da düşer
    expect(keysOf(habit.goal)).toEqual(['frequency', 'unit', 'value'].sort());
  });

  it('todo: priority/tags/order düşer, 7 kural alanı kalır', () => {
    const out = window.normalizeAppData({
      todos: [{
        id: 't1', text: 'Görev', completed: false, bucket: 'week', dueDate: '',
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
        priority: 'high', tags: ['x'], order: 5
      }]
    });
    const todo = out.todos[0];
    expect(keysOf(todo)).toEqual(keysOf(Object.fromEntries(RULES.todo.map(k => [k, 1]))));
    expect(todo.priority).toBeUndefined();
    expect(todo.tags).toBeUndefined();
  });

  it('book: rating/notes/favorite düşer, 12 kural alanı kalır', () => {
    const out = window.normalizeAppData({
      books: [{
        id: 'b1', title: 'Oblomov', author: 'Gonçarov', coverUrl: 'https://x', totalPages: 624,
        currentPage: 0, dailyGoalPages: 0, dailyReadLog: {}, status: 'pending', completed: false,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
        rating: 5, notes: 'okunuyor', favorite: true
      }]
    });
    const book = out.books[0];
    expect(keysOf(book)).toEqual(keysOf(Object.fromEntries(RULES.book.map(k => [k, 1]))));
    expect(book.rating).toBeUndefined();
    expect(book.favorite).toBeUndefined();
  });

  it('note: trash/reminder düşer, 9 kural alanı kalır', () => {
    const out = window.normalizeAppData({
      notes: [{
        id: 'n1', title: '', content: 'içerik', category: 'general', color: '#ffffff',
        pinned: false, archived: false,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
        trash: true, reminder: '2026-09-01'
      }]
    });
    const note = out.notes[0];
    expect(keysOf(note)).toEqual(keysOf(Object.fromEntries(RULES.note.map(k => [k, 1]))));
    expect(note.trash).toBeUndefined();
    expect(note.reminder).toBeUndefined();
  });

  it('focusSession: pausedAt/note/flowScore düşer, 18 kural alanı kalır', () => {
    const out = window.normalizeAppData({
      focusSessions: [{
        id: 'f1', label: 'Ders', mode: 'pomodoro', preset: '30/5',
        startedAt: '2026-06-13T08:00:00.000Z', endedAt: '2026-06-13T09:00:00.000Z',
        workSec: 3600, breakSec: 300, interruptions: 0, plannedWorkSec: 3600,
        completionPct: 100, deepWorkScore: 80, linkedType: '', linkedId: '', linkedLabel: '',
        cycles: 3, createdAt: '2026-06-13T08:00:00.000Z', updatedAt: '2026-06-13T09:00:00.000Z',
        pausedAt: '2026-06-13T08:30:00.000Z', note: 'not', flowScore: 99
      }]
    });
    const session = out.focusSessions[0];
    expect(keysOf(session)).toEqual(keysOf(Object.fromEntries(RULES.focus.map(k => [k, 1]))));
    expect(session.pausedAt).toBeUndefined();
    expect(session.note).toBeUndefined();
  });

  it('appData üst seviye: legacy kök alanları (email, name, plan) düşer', () => {
    const out = window.normalizeAppData({
      email: 'kullanici@example.com',
      name: 'Eski İsim',
      plan: 'pro',
      joinedAt: '2025-01-01T00:00:00.000Z',
      habits: [], todos: [], books: [], notes: [], focusSessions: [], weeklyReview: {}, moods: {},
      xp: 10, level: 2, achievements: []
    });
    expect(out.email).toBeUndefined();
    expect(out.name).toBeUndefined();
    expect(out.plan).toBeUndefined();
    expect(out.joinedAt).toBeUndefined();
  });
});

describe('whitelist: cloud payload\'ları kural alanlarıyla sınırlı', () => {
  function getOps(userId, local, base) {
    return window.buildCloudWriteOperations(userId, local, base);
  }

  it('kök ops: merge:false + payload yalnızca 5 kural alanı', () => {
    const base = window.normalizeAppData(window.defaultData);
    const local = window.cloneNormalizedDataSnapshot(base);
    local.habits.push({ id: 'h1', name: 'X', color: '#fff', completions: {}, category: '', goal: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z' });
    const ops = getOps('u1', local, base);
    const rootOp = ops.find(op => op.data && 'counters' in op.data);
    expect(rootOp).toBeTruthy();
    expect(rootOp.options.merge).toBe(false);
    expect(keysOf(rootOp.data)).toEqual(RULES.root.slice().sort());
    expect(keysOf(rootOp.data.counters)).toEqual(['books', 'focusSessions', 'habits', 'notes', 'todos'].sort());
    expect(keysOf(rootOp.data.app)).toEqual(['source', 'version'].sort());
  });

  it('state ops: merge:false + payload yalnızca 7 kural alanı', () => {
    const base = window.normalizeAppData(window.defaultData);
    const local = window.cloneNormalizedDataSnapshot(base);
    local.xp = 355;
    local.level = 3;
    local.settings.theme = 'ocean';
    const ops = getOps('u1', local, base);
    const stateOp = ops.find(op => op.data && 'settings' in op.data && 'xp' in op.data);
    expect(stateOp).toBeTruthy();
    expect(stateOp.options.merge).toBe(false);
    expect(keysOf(stateOp.data)).toEqual(RULES.state.slice().sort());
  });

  it('koleksiyon upsert payload\'ları kural whitelist\'leriyle sınırlı (merge:false)', () => {
    const base = window.normalizeAppData(window.defaultData);
    const local = window.cloneNormalizedDataSnapshot(base);
    local.todos.push({ id: 't1', text: 'X', completed: false, bucket: 'today', dueDate: '', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z', priority: 'yüksek' });
    const ops = getOps('u1', local, base);
    const todoOp = ops.find(op => op.data && op.data.id === 't1');
    expect(todoOp).toBeTruthy();
    expect(todoOp.options.merge).toBe(false);
    expect(todoOp.data.priority).toBeUndefined();
    expect(keysOf(todoOp.data)).toEqual(RULES.todo.slice().sort());
  });
});
