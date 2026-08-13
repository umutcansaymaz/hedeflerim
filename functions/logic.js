// ============================================================
// Saf iş mantığı (Pure Logic) — firebase/web-push import'u YOK.
// Trigger I/O (index.js) ile ayrılma gerekçesi: ADR-0006.
// Test edilebilirlik: tüm fonksiyonlar yan etkisizdir.
// ============================================================

// Notification time windows (kullanıcının yerel saati, gece yarısından dakika)
const MORNING_START = 7 * 60 + 30;   // 07:30
const MORNING_END = 8 * 60;          // 08:00
const URGENCY_START = 21 * 60;       // 21:00
const URGENCY_END = 21 * 60 + 15;    // 21:15
const NIGHT_START = 22 * 60 + 30;    // 22:30
const NIGHT_END = 23 * 60;           // 23:00

const FALLBACK_TIMEZONE = "Europe/Istanbul";
const STREAK_MILESTONES = [7, 30, 100];
const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

// Pencere tablosu: morning/urgency/night bloklarını tek yapıya indirir (GR-SP02).
const WINDOWS = [
  {
    id: "morning",
    start: MORNING_START,
    end: MORNING_END,
    stateKey: "lastMorningKey",
    keySuffix: "morning",
    gate: (progress) => progress.totalHabits > 0,
    build: buildMorningPayload
  },
  {
    id: "urgency",
    start: URGENCY_START,
    end: URGENCY_END,
    stateKey: "lastUrgencyKey",
    keySuffix: "urgency",
    gate: (progress) => progress.remainingHabits > 0,
    build: buildUrgencyPayload
  },
  {
    id: "night",
    start: NIGHT_START,
    end: NIGHT_END,
    stateKey: "lastNightKey",
    keySuffix: "night",
    gate: (progress) => progress.totalHabits > 0,
    build: buildNightPayload
  }
];

// ===== Genel Yardımcılar =====

function asMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isCompletionDone(entry) {
  if (entry === true) return true;
  if (entry === false || entry == null) return false;
  if (typeof entry === "number") return entry > 0;
  if (typeof entry === "string") return entry.trim().length > 0;
  if (typeof entry === "object") return isCompletionObjectDone(entry);
  return false;
}

function isCompletionObjectDone(entry) {
  if (entry.done === true) return true;
  if (entry.value === true) return true;
  if (Number.isFinite(Number(entry.value))) return Number(entry.value) > 0;
  if (typeof entry.time === "string" && entry.time.trim()) return true;
  return false;
}

// ===== Zaman / Zaman Dilimi =====

function normalizeTimeZone(value) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : FALLBACK_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

function getTimeZoneParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  });
  const parts = fmt.formatToParts(date);
  const out = {};
  for (const part of parts) out[part.type] = part.value;
  const weekdayRaw = String(out.weekday || "").slice(0, 3).toLowerCase();
  return {
    year: Number(out.year || 0),
    month: Number(out.month || 0),
    day: Number(out.day || 0),
    hour: Number(out.hour || 0),
    minute: Number(out.minute || 0),
    weekdayIndex: Number.isFinite(WEEKDAY_INDEX[weekdayRaw]) ? WEEKDAY_INDEX[weekdayRaw] : 0
  };
}

function toDateKey(parts) {
  const y = String(parts.year || 0).padStart(4, "0");
  const m = String(parts.month || 0).padStart(2, "0");
  const d = String(parts.day || 0).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ===== Alışkanlık İlerlemesi =====

function getHabitProgressForDate(habits, dateKey) {
  let totalHabits = 0;
  let doneHabits = 0;
  const habitNames = [];
  const doneNames = [];
  const remainingNames = [];

  for (const habit of habits) {
    const name = (habit.name || "Aliskanlik").trim();
    totalHabits += 1;
    habitNames.push(name);
    const completions = asMap(habit?.completions);
    if (isCompletionDone(completions[dateKey])) {
      doneHabits += 1;
      doneNames.push(name);
    } else {
      remainingNames.push(name);
    }
  }
  return {
    totalHabits,
    doneHabits,
    remainingHabits: Math.max(0, totalHabits - doneHabits),
    habitNames,
    doneNames,
    remainingNames
  };
}

function calculateStreak(completions, dateKey) {
  if (!dateKey || typeof dateKey !== "string") return 0;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return 0;
  const baseMs = Date.UTC(year, month - 1, day);
  let streak = 0;
  for (let i = 0; i < 1000; i++) {
    const d = new Date(baseMs - i * 86400000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    if (isCompletionDone(completions[key])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getHabitMilestones(habit, todayKey) {
  const results = [];
  const completions = asMap(habit?.completions);
  if (!isCompletionDone(completions[todayKey])) return results;
  const streak = calculateStreak(completions, todayKey);
  for (const milestone of STREAK_MILESTONES) {
    if (streak === milestone) {
      results.push({ name: (habit.name || "Aliskanlik").trim(), id: habit.id || habit.name, streak });
    }
  }
  return results;
}

function getMilestoneHabits(habits, todayKey) {
  const results = [];
  for (const habit of habits) {
    results.push(...getHabitMilestones(habit, todayKey));
  }
  return results;
}

// ===== Bildirim İçerik Üreticileri =====

function buildMorningPayload(progress) {
  const greetings = [
    "Günaydın! ☀️",
    "Yeni bir gün, yeni bir fırsat! 🌅",
    "Günaydın! Harika bir gün seni bekliyor ✨",
    "Günaydın! Bugün senin günün 💪"
  ];
  const title = greetings[Math.floor(Math.random() * greetings.length)];

  let body;
  if (progress.totalHabits === 1) {
    body = `Bugün seni 1 alışkanlık bekliyor: ${progress.habitNames[0]}. Haydi başlayalım!`;
  } else if (progress.totalHabits <= 3) {
    body = `Bugün seni ${progress.totalHabits} alışkanlık bekliyor: ${progress.habitNames.join(", ")}. İlk adımı at!`;
  } else {
    body = `Bugün seni ${progress.totalHabits} alışkanlık bekliyor. Harika bir gün için ilk adımı at!`;
  }

  return { title, body, tag: "morning-briefing", url: "/", source: "morning" };
}

function buildUrgencyPayload(progress) {
  const remaining = progress.remainingHabits;
  const names = progress.remainingNames;

  const title = "Gün bitmeden yakala! ⏰";
  let body;
  if (remaining === 1) {
    body = `Sadece 1 alışkanlık kaldı: ${names[0]}. Gece yarısına az kaldı, hâlâ yapabilirsin!`;
  } else if (remaining <= 3) {
    body = `${remaining} alışkanlık eksik: ${names.join(", ")}. Gece yarısına az kaldı, hâlâ yapabilirsin!`;
  } else {
    body = `Henüz ${remaining} alışkanlık eksik, gece yarısına 3 saat kaldı. Hâlâ yapabilirsin, haydi!`;
  }

  return { title, body, tag: "urgency-alert", url: "/", source: "urgency" };
}

function buildStreakMilestonePayload(habitName, streak) {
  let emoji = "🔥";
  let encouragement = "";
  if (streak >= 100) {
    emoji = "🏆";
    encouragement = "Bu inanılmaz bir başarı! Sen gerçekten bir efsanesin.";
  } else if (streak >= 30) {
    emoji = "⚡";
    encouragement = "Bu seviyeye ulaşmak büyük bir disiplin ister. Çok gururlandırıcı!";
  } else {
    encouragement = "Harika gidiyor! Zinciri kırmamak için devam et.";
  }

  return {
    title: `${streak} Günlük Seri! ${emoji}`,
    body: `Tebrikler! "${habitName}" alışkanlığında ${streak} günlük seriye ulaştın! ${encouragement}`,
    tag: `streak-milestone-${habitName}-${streak}`,
    url: "/",
    source: "streak_milestone"
  };
}

function buildNightPayload(progress) {
  const done = progress.doneHabits;
  const total = progress.totalHabits;
  const ratio = total > 0 ? done / total : 0;

  let title, body;

  if (ratio >= 1) {
    // Kusursuz gün
    const celebrations = [
      `Bugün ${done}/${total} alışkanlığın hepsini tamamladın, harika iş çıkardın! Yarın da böyle devam 💪`,
      `Tam puan! ${done}/${total} alışkanlık tamam. Kendini tebrik et, bunu hak ettin! 🏆`,
      `Mükemmel bir gün! Tüm ${total} hedefe ulaştın. Bu disiplin seni çok ileriye taşıyacak ⭐`
    ];
    title = "İyi geceler! 🌟";
    body = celebrations[Math.floor(Math.random() * celebrations.length)];
  } else if (ratio >= 0.5) {
    // Kısmi başarı
    title = "İyi geceler! 🌙";
    body = `Bugün ${done}/${total} adım attın, bu da güzel bir ilerleme. Yarın kaldığın yerden devam!`;
  } else if (done > 0) {
    // Düşük ama sıfır değil
    title = "İyi geceler! 🌙";
    body = `Bugün ${done}/${total} adım attın. Her adım önemli, yarın biraz daha fazlasını hedefle!`;
  } else {
    // Sıfır
    title = "İyi geceler 🌙";
    body = "Bugün biraz ara verdik, olur böyle günler. Yarın yeni bir başlangıç seni bekliyor!";
  }

  return { title, body, tag: "night-summary", url: "/", source: "night" };
}

// ===== Pencere Eşleştirme & Dedupe =====

function getActiveWindows(currentMinutes) {
  return WINDOWS.filter((window) => currentMinutes >= window.start && currentMinutes <= window.end);
}

function getWindowKey(window, todayKey) {
  return `${todayKey}|${window.keySuffix}`;
}

function isWindowDue(window, todayKey, pushState) {
  return String(pushState[window.stateKey] || "") !== getWindowKey(window, todayKey);
}

module.exports = {
  FALLBACK_TIMEZONE,
  STREAK_MILESTONES,
  WEEKDAY_INDEX,
  WINDOWS,
  asMap,
  isCompletionDone,
  normalizeTimeZone,
  getTimeZoneParts,
  toDateKey,
  getHabitProgressForDate,
  calculateStreak,
  getMilestoneHabits,
  buildMorningPayload,
  buildUrgencyPayload,
  buildNightPayload,
  buildStreakMilestonePayload,
  getActiveWindows,
  getWindowKey,
  isWindowDue
};
