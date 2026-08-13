// ===== SmartCoach analyze() regression tests =====
// analyze, 130 satırlık tek fonksiyondan 6 küçük fonksiyona bölündü (Ağu 2026).
// Bu testler bölme sonrası davranışın aynı kaldığını garanti eder.
import { describe, it, expect, beforeEach } from 'vitest';

const dateKey = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => dateKey(new Date(Date.now() - n * 86400000));

describe('SmartCoach.analyze()', () => {
  beforeEach(() => {
    window.formatDate = (d) => d.toISOString().slice(0, 10);
    window.isCompletionDone = (v) => Boolean(v && Number(v.value) > 0);
    window.getWeekDates = () => {
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - (6 - i) * 86400000);
        dates.push(d);
      }
      return dates;
    };
    window.computeMissRiskSnapshot = () => ({ score: 0, reason: '', suggestedTime: '' });
    window.normalizeBookStatus = () => 'none';
  });

  it('alışkanlık yokken yönlendirme mesajı döner', () => {
    window.appData = { habits: [], todos: [], books: [], moods: {} };
    expect(window.SmartCoach.analyze()).toContain('birkaç alışkanlık ekle');
  });

  it('kısmen tamamlanan günde kalan adım + plan döner', () => {
    window.appData = {
      habits: [
        { name: 'Koşu', completions: { [daysAgo(0)]: { value: 1, time: 'x' } }, goal: null },
        { name: 'Kitap', completions: {}, goal: null }
      ],
      todos: [],
      books: [],
      moods: {}
    };
    const result = window.SmartCoach.analyze();
    expect(typeof result).toBe('string');
    expect(result).toContain('Bugün için plan:');
    expect(result).toContain('kalan 1 adım');
  });

  it('serisi risk altındaki alışkanlığı uyarır', () => {
    window.appData = {
      habits: [
        {
          name: 'Koşu',
          completions: {
            [daysAgo(1)]: { value: 1, time: 'x' },
            [daysAgo(2)]: { value: 1, time: 'x' },
            [daysAgo(3)]: { value: 1, time: 'x' }
          },
          goal: null
        }
      ],
      todos: [],
      books: [],
      moods: {}
    };
    const result = window.SmartCoach.analyze();
    expect(result).toContain('seriyi korur');
    expect(result).toContain('Bugün için plan:');
  });

  it('haftalık hedefi eksik alışkanlığı raporlar', () => {
    window.appData = {
      habits: [
        {
          name: 'Yüzme',
          completions: {},
          goal: { frequency: 'weekly', value: 3 }
        }
      ],
      todos: [],
      books: [],
      moods: {}
    };
    const result = window.SmartCoach.analyze();
    expect(result).toContain('haftalık hedefinde');
  });
});
