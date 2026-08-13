import { describe, it, expect, beforeEach, vi } from 'vitest';

// İkinci dalga refactor regresyon testleri (Ağu 2026):
// - notes.js: noteMatchesDateFilter → matchesDateFilter/getNoteFilterRange/normalizeCustomRange
// - books.js: render'daki 4'lü ternary → getBookDailyGoalState
// - focus-ui.js: _updateTimerDisplay (CCN 32) → compute*View + applyTimerView
// - sync.js: saveToCloud guard'ları → shouldQueueCloudSave (race guard saf fonksiyon)

describe('notes: tarih filtresi (refactor koruması)', () => {
  it('getNoteFilterRange: today [bugün 00:00, yarın 00:00) aralığını verir', () => {
    const range = window.getNoteFilterRange('today');
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    expect(range.start.getTime()).toBe(todayStart.getTime());
    expect(range.end.getTime()).toBe(tomorrowStart.getTime());
  });

  it('getNoteFilterRange: all/custom için null döner', () => {
    expect(window.getNoteFilterRange('all')).toBeNull();
    expect(window.getNoteFilterRange('custom')).toBeNull();
    expect(window.getNoteFilterRange('bilinmeyen')).toBeNull();
  });

  it('matchesDateFilter: all filtresi her tarihi geçirir', () => {
    expect(window.matchesDateFilter(new Date(), 'all', '', '')).toBe(true);
    expect(window.matchesDateFilter(new Date('1999-01-01'), 'all', '', '')).toBe(true);
  });

  it('matchesDateFilter: geçersiz tarih her zaman false (all hariç)', () => {
    expect(window.matchesDateFilter(new Date('invalid'), 'today', '', '')).toBe(false);
  });

  it('matchesDateFilter: today filtresi bugünü geçirir, dünü reddeder', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    expect(window.matchesDateFilter(now, 'today', '', '')).toBe(true);
    expect(window.matchesDateFilter(yesterday, 'today', '', '')).toBe(false);
  });

  it('normalizeCustomRange: başlangıç > bitiş ise takas eder (gizli davranış korunuyor)', () => {
    const r = window.normalizeCustomRange('2026-08-10', '2026-08-01');
    expect(r.start.toISOString().startsWith('2026-08-01')).toBe(true);
    expect(r.end.toISOString().startsWith('2026-08-10')).toBe(true);
    expect(r.hasValidStart).toBe(true);
    expect(r.hasValidEnd).toBe(true);
  });

  it('normalizeCustomRange: boş tarihler valid değildir ve filtre esnek kalır', () => {
    const r = window.normalizeCustomRange('', '');
    expect(r.hasValidStart).toBe(false);
    expect(r.hasValidEnd).toBe(false);
    // Sadece başlangıç varsa: ondan öncekiler reddedilir, sonrası geçer
    const onlyStart = window.normalizeCustomRange('2026-08-01', '');
    expect(onlyStart.hasValidStart).toBe(true);
    expect(onlyStart.hasValidEnd).toBe(false);
    expect(window.matchesDateFilter(new Date('2026-08-05T12:00:00'), 'custom', '2026-08-01', '')).toBe(true);
    expect(window.matchesDateFilter(new Date('2026-07-20T12:00:00'), 'custom', '2026-08-01', '')).toBe(false);
  });
});

describe('books: günlük hedef durumu (refactor koruması)', () => {
  it('hedef yoksa neutral + bilgilendirme metni', () => {
    const s = window.getBookDailyGoalState(0, { isBehind: true, todayRead: 0 });
    expect(s.stateClass).toBe('neutral');
    expect(s.text).toContain('hedef yok');
  });

  it('gerideyse warn + fark metni', () => {
    const s = window.getBookDailyGoalState(20, { isBehind: true, isAhead: false, absDiff: 5, todayRead: 3 });
    expect(s.stateClass).toBe('warn');
    expect(s.text).toContain('5 sayfa gerisindesin');
  });

  it('ilerideyse good + fark metni', () => {
    const s = window.getBookDailyGoalState(20, { isBehind: false, isAhead: true, absDiff: 7, todayRead: 12 });
    expect(s.stateClass).toBe('good');
    expect(s.text).toContain('7 sayfa üstündesin');
  });

  it('tam tutturursa ok', () => {
    const s = window.getBookDailyGoalState(20, { isBehind: false, isAhead: false, absDiff: 0, todayRead: 20 });
    expect(s.stateClass).toBe('ok');
    expect(s.text).toContain('hedefi tutturdun');
  });
});

describe('focus-ui: zamanlayıcı view hesapları (refactor koruması)', () => {
  beforeEach(() => {
    // formatFocusClock: saniye → metin stub'ı (gerçek biçimlendirmeyi test etmiyoruz)
    window.formatFocusClock = (sec, opts = {}) => {
      const h = opts.showHours ? String(Math.floor(sec / 3600)).padStart(2, '0') : '';
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      return h ? `${h}:${m}:${s}` : `${m}:${s}`;
    };
    window.getPresetForFocus = () => ({ workMs: 25 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 15 * 60 * 1000 });
    window.getPomodoroPhaseLabel = (phase) => (phase === 'shortBreak' ? 'Kısa mola' : phase === 'longBreak' ? 'Uzun mola' : 'Odak');
    window.FOCUS_POMODORO_CYCLES_BEFORE_LONG_BREAK = 4;
  });

  it('computeStopwatchView: duraklatılmış süreyi workAccMs üzerinden verir', () => {
    const v = window.computeStopwatchView({ workAccMs: 65000, lastTickAtMs: 0 }, 'paused', Date.now());
    expect(v.phaseLabel).toBe('Çalışma');
    expect(v.timeText).toBe('01:05');
    expect(v.showProgress).toBe(false);
  });

  it('computeStopwatchView: çalışırken son tickten bu yana geçen süreyi ekler', () => {
    const now = 1_000_000_000_000;
    const v = window.computeStopwatchView({ workAccMs: 10000, lastTickAtMs: now - 5000 }, 'running', now);
    expect(v.timeText).toBe('00:15');
  });

  it('computeCountdownView: duraklatılmış kalan süreyi phaseRemainingMs üzerinden verir', () => {
    const v = window.computeCountdownView({ countdownSec: 600 }, {}, 'paused', Date.now());
    // phaseRemainingMs yok → toplam süre (600s)
    expect(v.timeText).toBe('10:00');
    expect(v.progressRatio).toBe(0);
    expect(v.showProgress).toBe(true);
  });

  it('computeCountdownView: çalışırken kalan = bitiş - şimdi', () => {
    const now = 1_000_000_000_000;
    const v = window.computeCountdownView({ countdownSec: 600 }, { phaseEndsAtMs: now + 90_000 }, 'running', now);
    expect(v.timeText).toBe('01:30');
    expect(v.progressRatio).toBeCloseTo(1 - 90 / 600, 3);
  });

  it('computePomodoroView: odak fazında workMs üzerinden kalan süre + döngü sayacı', () => {
    const now = 1_000_000_000_000;
    const v = window.computePomodoroView(
      { pomodoroPresetId: 'p1' },
      { phaseType: 'work', phaseEndsAtMs: now + 300_000, cyclesCompleted: 3 },
      'running',
      now
    );
    expect(v.phaseLabel).toBe('Odak');
    expect(v.timeText).toBe('05:00');
    expect(v.progressText).toContain('3');
    expect(v.progressText).toContain('Uzun mola');
    expect(v.showProgress).toBe(true);
  });

  it('computePomodoroView: kısa molada shortBreakMs + farklı etiket', () => {
    const now = 1_000_000_000_000;
    const v = window.computePomodoroView(
      { pomodoroPresetId: 'p1' },
      { phaseType: 'shortBreak', phaseEndsAtMs: now + 60_000, cyclesCompleted: 1 },
      'running',
      now
    );
    expect(v.phaseLabel).toBe('Kısa mola');
    expect(v.timeText).toBe('01:00');
  });

  it('computePomodoroView: phaseEnded durumunda süre 0 olur', () => {
    const v = window.computePomodoroView({ pomodoroPresetId: 'p1' }, { phaseType: 'work', cyclesCompleted: 0 }, 'phaseEnded', Date.now());
    expect(v.timeText).toBe('00:00');
  });

  it('computePomodoroView: bilinmeyen faz tipi odak gibi işlenir', () => {
    const now = 1_000_000_000_000;
    const v = window.computePomodoroView(
      { pomodoroPresetId: 'p1' },
      { phaseType: 'garipFaz', phaseEndsAtMs: now + 60_000, cyclesCompleted: 0 },
      'running',
      now
    );
    expect(v.phaseLabel).toBe('Odak');
    expect(v.timeText).toBe('01:00');
  });
});

describe('sync: bulut kayıt guard\'ları (refactor koruması)', () => {
  it('çevrimdışıysa her zaman kuyruğa alır (force dahil)', () => {
    window.isNetworkOnline = () => false;
    expect(window.shouldQueueCloudSave({ cloudLoadInFlight: false, cloudSaveInFlight: false }, true)).toBe(true);
    expect(window.shouldQueueCloudSave({ cloudLoadInFlight: true, cloudSaveInFlight: true }, false)).toBe(true);
  });

  it('online + meşgul değilse kayıt serbesttir', () => {
    window.isNetworkOnline = () => true;
    expect(window.shouldQueueCloudSave({ cloudLoadInFlight: false, cloudSaveInFlight: false }, false)).toBe(false);
  });

  it('online + yükleme sürüyorsa (force yok) kuyruğa alır', () => {
    window.isNetworkOnline = () => true;
    expect(window.shouldQueueCloudSave({ cloudLoadInFlight: true, cloudSaveInFlight: false }, false)).toBe(true);
  });

  it('online + kayıt sürüyorsa (force yok) kuyruğa alır', () => {
    window.isNetworkOnline = () => true;
    expect(window.shouldQueueCloudSave({ cloudLoadInFlight: false, cloudSaveInFlight: true }, false)).toBe(true);
  });

  it('meşgul olsa bile force ile devam eder', () => {
    window.isNetworkOnline = () => true;
    expect(window.shouldQueueCloudSave({ cloudLoadInFlight: true, cloudSaveInFlight: true }, true)).toBe(false);
  });
});
