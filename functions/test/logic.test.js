// ============================================================
// Saf mantık golden testleri (logic.js).
// Davranışı orijinal functions/index.js'e birebir korumak
// için yazılmıştır — refactor'da davranış kayması olursa
// bu testler kırmızı yanar.
// ============================================================

import { describe, it, expect } from "vitest";

import {
  STREAK_MILESTONES,
  WINDOWS,
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
} from "../logic.js";

// ===== Yardımcılar =====

function dateKeyForOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function completionsForStreak(days) {
  const completions = {};
  for (let i = 0; i < days; i++) {
    completions[dateKeyForOffset(i)] = true;
  }
  return completions;
}

// ===== isCompletionDone (11 giriş tipi) =====

describe("isCompletionDone", () => {
  it.each([
    [true, true],
    [false, false],
    [null, false],
    [undefined, false],
    [0, false],
    [5, true],
    [-1, false],
    ["", false],
    ["   ", false],
    ["tamamlandı", true],
    [{ done: true }, true],
    [{ value: true }, true],
    [{ value: "3" }, true],
    [{ value: "0" }, false],
    [{ value: "abc" }, false],
    [{ time: "12:00" }, true],
    [{ time: "  " }, false],
    [{}, false]
  ])("giriş %j → %s", (input, expected) => {
    expect(isCompletionDone(input)).toBe(expected);
  });
});

// ===== Zaman / Zaman Dilimi =====

describe("normalizeTimeZone", () => {
  it("geçerli dilim olduğu gibi döner", () => {
    expect(normalizeTimeZone("Europe/Istanbul")).toBe("Europe/Istanbul");
  });

  it("geçersiz dilim fallback'e düşer", () => {
    expect(normalizeTimeZone("Bogus/Zone")).toBe("Europe/Istanbul");
  });

  it("boş/değil değeri fallback'e düşer", () => {
    expect(normalizeTimeZone("")).toBe("Europe/Istanbul");
    expect(normalizeTimeZone(null)).toBe("Europe/Istanbul");
    expect(normalizeTimeZone(undefined)).toBe("Europe/Istanbul");
  });
});

describe("getTimeZoneParts + toDateKey", () => {
  // 2026-08-04T04:30:00Z → İstanbul (UTC+3) yerel 07:30, Salı
  const fixed = new Date("2026-08-04T04:30:00Z");

  it("İstanbul'da 07:30 Salı olarak çözümlenir", () => {
    const parts = getTimeZoneParts(fixed, "Europe/Istanbul");
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(8);
    expect(parts.day).toBe(4);
    expect(parts.hour).toBe(7);
    expect(parts.minute).toBe(30);
    expect(parts.weekdayIndex).toBe(2); // Salı
  });

  it("toDateKey doğru anahtarı üretir", () => {
    const parts = getTimeZoneParts(fixed, "Europe/Istanbul");
    expect(toDateKey(parts)).toBe("2026-08-04");
  });

  it("UTC'de farklı güne taşır", () => {
    const parts = getTimeZoneParts(fixed, "Etc/UTC");
    expect(parts.hour).toBe(4);
    expect(toDateKey(parts)).toBe("2026-08-04");
  });
});

// ===== Alışkanlık İlerlemesi =====

describe("getHabitProgressForDate", () => {
  const today = dateKeyForOffset(0);

  it("alışkanlık yoksa sıfır ilerleme", () => {
    const progress = getHabitProgressForDate([], today);
    expect(progress).toEqual({
      totalHabits: 0,
      doneHabits: 0,
      remainingHabits: 0,
      habitNames: [],
      doneNames: [],
      remainingNames: []
    });
  });

  it("1 alışkanlık tamamlandı", () => {
    const progress = getHabitProgressForDate(
      [{ name: "Kitap", completions: { [today]: true } }],
      today
    );
    expect(progress.totalHabits).toBe(1);
    expect(progress.doneHabits).toBe(1);
    expect(progress.remainingHabits).toBe(0);
    expect(progress.doneNames).toEqual(["Kitap"]);
    expect(progress.remainingNames).toEqual([]);
  });

  it("3 alışkanlıktan 1'i tamam", () => {
    const progress = getHabitProgressForDate(
      [
        { name: "Koşu", completions: { [today]: true } },
        { name: "Meditasyon", completions: {} },
        { name: "Okuma", completions: { [today]: { value: 5 } } }
      ],
      today
    );
    expect(progress.totalHabits).toBe(3);
    expect(progress.doneHabits).toBe(2);
    expect(progress.remainingHabits).toBe(1);
    expect(progress.doneNames).toEqual(["Koşu", "Okuma"]);
    expect(progress.remainingNames).toEqual(["Meditasyon"]);
  });

  it("isim yoksa Aliskanlik varsayılanı kullanılır", () => {
    const progress = getHabitProgressForDate([{ completions: {} }], today);
    expect(progress.habitNames).toEqual(["Aliskanlik"]);
  });
});

describe("calculateStreak", () => {
  it("boş tamamlamada seri 0", () => {
    expect(calculateStreak({}, dateKeyForOffset(0))).toBe(0);
  });

  it("bugün + önceki 6 gün → 7 günlük seri", () => {
    expect(calculateStreak(completionsForStreak(7), dateKeyForOffset(0))).toBe(7);
  });

  it("dün boşsa seri kırılır", () => {
    const completions = completionsForStreak(1);
    completions[dateKeyForOffset(2)] = true;
    expect(calculateStreak(completions, dateKeyForOffset(0))).toBe(1);
  });

  it("dateKey sunucu saatinden değil, verilen günden geriye sayar (timezone kayması)", () => {
    // bugünkü tamamlamalar var ama dateKey dünü işaret ediyor → seri 0
    expect(calculateStreak(completionsForStreak(1), dateKeyForOffset(1))).toBe(0);
    // bugün + dün tamamlandı, dateKey dün → seri yalnızca 1 (bugün sayılmaz)
    expect(calculateStreak(completionsForStreak(2), dateKeyForOffset(1))).toBe(1);
  });

  it("geçersiz dateKey güvenli şekilde 0 döner", () => {
    expect(calculateStreak(completionsForStreak(1), undefined)).toBe(0);
    expect(calculateStreak(completionsForStreak(1), "")).toBe(0);
    expect(calculateStreak(completionsForStreak(1), "13-08-2026")).toBe(0);
  });
});

describe("getMilestoneHabits", () => {
  const today = dateKeyForOffset(0);

  it("tam 7 günlük seri → 7 kilometre taşı", () => {
    const habits = [{ id: "h1", name: "Koşu", completions: completionsForStreak(7) }];
    const results = getMilestoneHabits(habits, today);
    expect(results).toEqual([{ name: "Koşu", id: "h1", streak: 7 }]);
  });

  it("seri 8 veya 6 ise kilometre taşı YOK (eşitlik şartı)", () => {
    expect(getMilestoneHabits([{ id: "h1", name: "Koşu", completions: completionsForStreak(8) }], today)).toEqual([]);
    expect(getMilestoneHabits([{ id: "h1", name: "Koşu", completions: completionsForStreak(6) }], today)).toEqual([]);
  });

  it("bugün tamamlanmamışsa kilometre taşı yok", () => {
    const completions = completionsForStreak(7);
    completions[today] = false;
    const habits = [{ id: "h1", name: "Koşu", completions }];
    expect(getMilestoneHabits(habits, today)).toEqual([]);
  });

  it("30 ve 100 de eşleşir, id yoksa isim kullanılır", () => {
    const habits = [{ name: "Meditasyon", completions: completionsForStreak(30) }];
    expect(getMilestoneHabits(habits, today)).toEqual([{ name: "Meditasyon", id: "Meditasyon", streak: 30 }]);
  });
});

// ===== Bildirim İçerikleri =====

describe("buildMorningPayload", () => {
  it("1 alışkanlık → isimle kişisel mesaj", () => {
    const payload = buildMorningPayload({ totalHabits: 1, habitNames: ["Koşu"] });
    expect(payload.body).toBe("Bugün seni 1 alışkanlık bekliyor: Koşu. Haydi başlayalım!");
    expect(payload.tag).toBe("morning-briefing");
    expect(payload.source).toBe("morning");
  });

  it("3 alışkanlık → isimler listelenir", () => {
    const payload = buildMorningPayload({ totalHabits: 3, habitNames: ["A", "B", "C"] });
    expect(payload.body).toBe("Bugün seni 3 alışkanlık bekliyor: A, B, C. İlk adımı at!");
  });

  it("4+ alışkanlık → genel mesaj", () => {
    const payload = buildMorningPayload({ totalHabits: 5, habitNames: [] });
    expect(payload.body).toBe("Bugün seni 5 alışkanlık bekliyor. Harika bir gün için ilk adımı at!");
  });

  it("başlık selamlama dizisinin bir üyesi", () => {
    const greetings = ["Günaydın! ☀️", "Yeni bir gün, yeni bir fırsat! 🌅", "Günaydın! Harika bir gün seni bekliyor ✨", "Günaydın! Bugün senin günün 💪"];
    const payload = buildMorningPayload({ totalHabits: 1, habitNames: ["Koşu"] });
    expect(greetings).toContain(payload.title);
  });
});

describe("buildUrgencyPayload", () => {
  it("1 kalan → isimle mesaj", () => {
    const payload = buildUrgencyPayload({ remainingHabits: 1, remainingNames: ["Koşu"] });
    expect(payload.body).toBe("Sadece 1 alışkanlık kaldı: Koşu. Gece yarısına az kaldı, hâlâ yapabilirsin!");
  });

  it("3 kalan → isimler listelenir", () => {
    const payload = buildUrgencyPayload({ remainingHabits: 3, remainingNames: ["A", "B", "C"] });
    expect(payload.body).toBe("3 alışkanlık eksik: A, B, C. Gece yarısına az kaldı, hâlâ yapabilirsin!");
  });

  it("4+ kalan → genel mesaj", () => {
    const payload = buildUrgencyPayload({ remainingHabits: 4, remainingNames: [] });
    expect(payload.body).toBe("Henüz 4 alışkanlık eksik, gece yarısına 3 saat kaldı. Hâlâ yapabilirsin, haydi!");
    expect(payload.tag).toBe("urgency-alert");
  });
});

describe("buildNightPayload", () => {
  it("tam puan (oran 1) → kutlama mesajı", () => {
    const payload = buildNightPayload({ doneHabits: 3, totalHabits: 3 });
    const celebrations = [
      "Bugün 3/3 alışkanlığın hepsini tamamladın, harika iş çıkardın! Yarın da böyle devam 💪",
      "Tam puan! 3/3 alışkanlık tamam. Kendini tebrik et, bunu hak ettin! 🏆",
      "Mükemmel bir gün! Tüm 3 hedefe ulaştın. Bu disiplin seni çok ileriye taşıyacak ⭐"
    ];
    expect(payload.title).toBe("İyi geceler! 🌟");
    expect(celebrations).toContain(payload.body);
  });

  it("oran 0.5 → kısmi başarı", () => {
    const payload = buildNightPayload({ doneHabits: 2, totalHabits: 4 });
    expect(payload.title).toBe("İyi geceler! 🌙");
    expect(payload.body).toBe("Bugün 2/4 adım attın, bu da güzel bir ilerleme. Yarın kaldığın yerden devam!");
  });

  it("oran 0.25 → düşük ama sıfır değil", () => {
    const payload = buildNightPayload({ doneHabits: 1, totalHabits: 4 });
    expect(payload.title).toBe("İyi geceler! 🌙");
    expect(payload.body).toBe("Bugün 1/4 adım attın. Her adım önemli, yarın biraz daha fazlasını hedefle!");
  });

  it("sıfır → teşvik mesajı", () => {
    const payload = buildNightPayload({ doneHabits: 0, totalHabits: 3 });
    expect(payload.title).toBe("İyi geceler 🌙");
    expect(payload.body).toBe("Bugün biraz ara verdik, olur böyle günler. Yarın yeni bir başlangıç seni bekliyor!");
  });
});

describe("buildStreakMilestonePayload", () => {
  it("100+ → kupa", () => {
    const payload = buildStreakMilestonePayload("Koşu", 100);
    expect(payload.title).toBe("100 Günlük Seri! 🏆");
    expect(payload.body).toContain("efsanesin");
  });

  it("30+ → şimşek", () => {
    const payload = buildStreakMilestonePayload("Koşu", 30);
    expect(payload.title).toBe("30 Günlük Seri! ⚡");
    expect(payload.body).toContain("gururlandırıcı");
  });

  it("7 → ateş", () => {
    const payload = buildStreakMilestonePayload("Koşu", 7);
    expect(payload.title).toBe("7 Günlük Seri! 🔥");
    expect(payload.body).toContain("Harika gidiyor");
    expect(payload.source).toBe("streak_milestone");
  });
});

// ===== Pencere Eşleştirme & Dedupe =====

describe("getActiveWindows", () => {
  it("morning penceresi 07:30-08:00 dahil", () => {
    expect(getActiveWindows(7 * 60 + 30).map(w => w.id)).toEqual(["morning"]);
    expect(getActiveWindows(8 * 60).map(w => w.id)).toEqual(["morning"]);
    expect(getActiveWindows(8 * 60 + 1)).toEqual([]);
  });

  it("urgency penceresi 21:00-21:15 dahil", () => {
    expect(getActiveWindows(21 * 60).map(w => w.id)).toEqual(["urgency"]);
    expect(getActiveWindows(21 * 60 + 15).map(w => w.id)).toEqual(["urgency"]);
    expect(getActiveWindows(21 * 60 + 16)).toEqual([]);
  });

  it("night penceresi 22:30-23:00 dahil", () => {
    expect(getActiveWindows(22 * 60 + 30).map(w => w.id)).toEqual(["night"]);
    expect(getActiveWindows(23 * 60).map(w => w.id)).toEqual(["night"]);
    expect(getActiveWindows(23 * 60 + 1)).toEqual([]);
  });

  it("pencere dışı ve çakışma davranışı", () => {
    expect(getActiveWindows(0)).toEqual([]);
    expect(getActiveWindows(9 * 60)).toEqual([]);
    expect(getActiveWindows(20 * 60 + 59)).toEqual([]);
  });

  it("WINDOWS tablosu beklenen 3 pencereyi içerir", () => {
    expect(WINDOWS.map(w => w.id)).toEqual(["morning", "urgency", "night"]);
    expect(STREAK_MILESTONES).toEqual([7, 30, 100]);
  });
});

describe("isWindowDue / getWindowKey", () => {
  const morning = WINDOWS[0];
  const todayKey = "2026-08-04";

  it("anahtar formatı todayKey|keySuffix", () => {
    expect(getWindowKey(morning, todayKey)).toBe("2026-08-04|morning");
  });

  it("aynı gün gönderilmişse due değil", () => {
    const pushState = { lastMorningKey: "2026-08-04|morning" };
    expect(isWindowDue(morning, todayKey, pushState)).toBe(false);
  });

  it("önceki gün gönderilmişse due", () => {
    const pushState = { lastMorningKey: "2026-08-03|morning" };
    expect(isWindowDue(morning, todayKey, pushState)).toBe(true);
  });

  it("hiç gönderilmemişse due", () => {
    expect(isWindowDue(morning, todayKey, {})).toBe(true);
  });
});
