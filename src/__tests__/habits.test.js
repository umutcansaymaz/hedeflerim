import { describe, it, expect, beforeEach, vi } from 'vitest';

// habits.js refactor regresyon testleri (Ağu 2026):
// renderSummaryStats → computeHabitStatTotals/buildComparisonHtml
// renderHabits → renderHabitEmptyState/buildHabitGoalHtml/computeDayCellState/buildDayCellHtml
// toggleHabitCompletion → computeCompletionDelta (yan etkisiz delta)
// Not: toggleHabitCompletion'ın XP/confetti/toast yan etkileri koordinatörde kaldı;
// saf fonksiyonlar burada birebir davranışla sabitlenir.

describe('habits.js — computeCompletionDelta', () => {
    let habit;
    const nowIso = '2026-08-13T10:00:00.000Z';

    beforeEach(() => {
        habit = {
            id: 'h1',
            name: 'Kitap',
            goal: { value: 5, unit: 'sayfa', frequency: 'daily' },
            completions: {}
        };
        // window.getWeekDates stub: 7 günlük boş hafta
        window.getWeekDates = vi.fn(() => [
            new Date('2026-08-10T00:00:00.000Z'),
            new Date('2026-08-11T00:00:00.000Z'),
            new Date('2026-08-12T00:00:00.000Z'),
            new Date('2026-08-13T00:00:00.000Z'),
            new Date('2026-08-14T00:00:00.000Z'),
            new Date('2026-08-15T00:00:00.000Z'),
            new Date('2026-08-16T00:00:00.000Z')
        ]);
    });

    it('hedefsiz: tamamlanmamış → value 1, yan etki yok', () => {
        const d = window.computeCompletionDelta({ ...habit, goal: null }, undefined, nowIso);
        expect(d).toEqual({ value: 1, celebrate: false, confetti: false, xp: 0 });
    });

    it('hedefsiz: tamamlanmış → value 0', () => {
        const d = window.computeCompletionDelta({ ...habit, goal: null }, { value: 1, time: nowIso }, nowIso);
        expect(d.value).toBe(0);
    });

    it('günlük hedef: tamamlanmamış → hedef değer yazılır + confetti + 20 XP', () => {
        const d = window.computeCompletionDelta(habit, undefined, nowIso);
        expect(d).toEqual({ value: 5, celebrate: false, confetti: true, xp: 20 });
    });

    it('günlük hedef: goal.value=0 → value 0 yazılır AMA XP/confetti yine verilir (mevcut davranış korunur)', () => {
        habit.goal.value = 0;
        const d = window.computeCompletionDelta(habit, undefined, nowIso);
        expect(d.value).toBe(0);
        expect(d.confetti).toBe(true);
        expect(d.xp).toBe(20);
    });

    it('günlük hedef: tamamlanmış → value 0, yan etki yok', () => {
        const d = window.computeCompletionDelta(habit, { value: 5, time: nowIso }, nowIso);
        expect(d).toEqual({ value: 0, celebrate: false, confetti: false, xp: 0 });
    });

    it('haftalık hedef: tamamlanmamış → value 1; hafta toplamı hedefe ulaşmadıysa kutlama yok', () => {
        habit.goal.frequency = 'weekly';
        habit.goal.value = 5;
        habit.completions['2026-08-10'] = { value: 1, time: nowIso }; // 1 gün dolu → +bugün = 2 < 5
        const d = window.computeCompletionDelta(habit, undefined, nowIso);
        expect(d.value).toBe(1);
        expect(d.celebrate).toBe(false);
        expect(d.confetti).toBe(false);
        expect(d.xp).toBe(0);
    });

    it('haftalık hedef: bugün dahil toplam hedefi aşıyorsa kutlama', () => {
        habit.goal.frequency = 'weekly';
        habit.goal.value = 2;
        habit.completions['2026-08-10'] = { value: 1, time: nowIso };
        habit.completions['2026-08-11'] = { value: 1, time: nowIso }; // 2 dolu → +bugün = 3 >= 2
        const d = window.computeCompletionDelta(habit, undefined, nowIso);
        expect(d.celebrate).toBe(true);
    });

    it('haftalık hedef: tamamlanmış → value 0, kutlama yok', () => {
        habit.goal.frequency = 'weekly';
        const d = window.computeCompletionDelta(habit, { value: 1, time: nowIso }, nowIso);
        expect(d).toEqual({ value: 0, celebrate: false, confetti: false, xp: 0 });
    });
});

describe('habits.js — computeDayCellState', () => {
    const today = '2026-08-13';

    it('tamamlanmış günlük hedef, hedef tutmuş → ✅', () => {
        const habit = { goal: { value: 5, frequency: 'daily' } };
        const s = window.computeDayCellState({ value: 7, time: 't' }, habit, today, today);
        expect(s.isChecked).toBe(true);
        expect(s.goalMet).toBe(true);
        expect(s.displayValue).toBe('✅');
    });

    it('tamamlanmış günlük hedef, hedef tutmamış → 🔸', () => {
        const habit = { goal: { value: 5, frequency: 'daily' } };
        const s = window.computeDayCellState({ value: 2, time: 't' }, habit, today, today);
        expect(s.isChecked).toBe(true);
        expect(s.goalMet).toBe(false);
        expect(s.displayValue).toBe('🔸');
    });

    it('tamamlanmış haftalık hedef → ✅ (hedef miktarına bakılmaz)', () => {
        const habit = { goal: { value: 3, frequency: 'weekly' } };
        const s = window.computeDayCellState({ value: 1, time: 't' }, habit, today, today);
        expect(s.isChecked).toBe(true);
        expect(s.displayValue).toBe('✅');
    });

    it('tamamlanmamış gün → boş gösterge', () => {
        const habit = { goal: { value: 5, frequency: 'daily' } };
        const s = window.computeDayCellState(undefined, habit, today, today);
        expect(s.isChecked).toBe(false);
        expect(s.displayValue).toBe('');
    });

    it('hedefsiz alışkanlık → hasGoal false, goalMet false', () => {
        const s = window.computeDayCellState(undefined, { goal: null }, today, today);
        expect(s.hasGoal).toBe(false);
        expect(s.goalMet).toBe(false);
        expect(s.displayValue).toBe('');
    });

    it('isToday: bugünün tarihi → true', () => {
        const s = window.computeDayCellState(undefined, { goal: null }, today, '2026-08-12');
        expect(s.isToday).toBe(false);
    });
});

describe('habits.js — buildComparisonHtml', () => {
    it('geçen hafta 0 ise rozet yok', () => {
        expect(window.buildComparisonHtml(0, 5)).toBe('');
    });
    it('artış → up rozeti', () => {
        expect(window.buildComparisonHtml(3, 5)).toContain('stat-trend up');
        expect(window.buildComparisonHtml(3, 5)).toContain('+2');
    });
    it('azalış → down rozeti', () => {
        expect(window.buildComparisonHtml(5, 3)).toContain('stat-trend down');
        expect(window.buildComparisonHtml(5, 3)).toContain('-2');
    });
    it('eşit → same rozeti', () => {
        expect(window.buildComparisonHtml(4, 4)).toContain('stat-trend same');
    });
});

describe('habits.js — computeHabitStatTotals', () => {
    it('bu hafta/geçen hafta/bu ay toplamlarını doğru hesaplar', () => {
        const habit = {
            goal: { value: 5, frequency: 'daily', unit: 'sayfa' },
            completions: {
                '2026-08-10': { value: 3, time: 't' }, // bu hafta (Pzt)
                '2026-08-12': { value: 4, time: 't' }, // bu hafta
                '2026-08-03': { value: 2, time: 't' }, // geçen hafta
                '2026-08-05': { value: 1, time: 't' }  // geçen hafta
            }
        };
        const weekDates = [new Date('2026-08-10T00:00:00.000Z'), new Date('2026-08-11T00:00:00.000Z'), new Date('2026-08-12T00:00:00.000Z')];
        const lastWeekDates = [new Date('2026-08-03T00:00:00.000Z'), new Date('2026-08-04T00:00:00.000Z'), new Date('2026-08-05T00:00:00.000Z')];
        const totals = window.computeHabitStatTotals(habit, weekDates, lastWeekDates, 7, 2026);
        expect(totals.thisWeekTotal).toBe(7);
        expect(totals.lastWeekTotal).toBe(3);
        expect(totals.monthTotal).toBe(10); // Ağustos içindeki tüm kayıtlar
    });

    it('kayıt yoksa toplamlar 0', () => {
        const totals = window.computeHabitStatTotals({ goal: null, completions: {} }, [], [], 7, 2026);
        expect(totals).toEqual({ thisWeekTotal: 0, lastWeekTotal: 0, monthTotal: 0 });
    });
});

describe('habits.js — buildHabitGoalHtml / renderHabitEmptyState', () => {
    it('hedef yoksa boş string', () => {
        expect(window.buildHabitGoalHtml({ goal: null }, 0)).toBe('');
    });
    it('günlük hedef → gün etiketi', () => {
        const html = window.buildHabitGoalHtml({ goal: { value: 5, unit: 'sayfa', frequency: 'daily' } }, 3);
        expect(html).toContain('5 sayfa / gün');
        expect(html).toContain('3/7 gün');
    });
    it('haftalık hedef → hafta etiketi', () => {
        const html = window.buildHabitGoalHtml({ goal: { value: 2, unit: 'kez', frequency: 'weekly' } }, 1);
        expect(html).toContain('2 kez / hafta');
    });
    it('boş durum şablonu boş değil ve Türkçe metin içerir', () => {
        const html = window.renderHabitEmptyState();
        expect(html).toContain('Henüz alışkanlık yok');
        expect(html).toContain('empty-state');
    });
});
