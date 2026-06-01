const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const webpush = require("web-push");

admin.initializeApp();
const db = admin.firestore();

const VAPID_SUBJECT = "mailto:no-reply@hedeflerim.app";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const FALLBACK_TIMEZONE = "Europe/Istanbul";
const STREAK_MILESTONES = [7, 30, 100];

// Notification time windows (user's local time, in minutes from midnight)
const MORNING_START = 7 * 60 + 30;   // 07:30
const MORNING_END = 8 * 60;          // 08:00
const URGENCY_START = 21 * 60;       // 21:00
const URGENCY_END = 21 * 60 + 15;    // 21:15
const NIGHT_START = 22 * 60 + 30;    // 22:30
const NIGHT_END = 23 * 60;           // 23:00

// ===== Utility Functions =====

function configureWebPush() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("web-push-vapid-missing");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
}

function asMap(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function isCompletionDone(entry) {
  if (entry === true) return true;
  if (entry === false || entry == null) return false;
  if (typeof entry === "number") return entry > 0;
  if (typeof entry === "string") return entry.trim().length > 0;
  if (typeof entry === "object") {
    if (entry.done === true) return true;
    if (entry.value === true) return true;
    if (Number.isFinite(Number(entry.value))) return Number(entry.value) > 0;
    if (typeof entry.time === "string" && entry.time.trim()) return true;
  }
  return false;
}

const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

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

function calculateStreak(completions) {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 1000; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (isCompletionDone(completions[key])) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getMilestoneHabits(habits, todayKey) {
  const results = [];
  for (const habit of habits) {
    const completions = asMap(habit?.completions);
    // Only consider habits done today
    if (!isCompletionDone(completions[todayKey])) continue;
    const streak = calculateStreak(completions);
    for (const milestone of STREAK_MILESTONES) {
      if (streak === milestone) {
        results.push({ name: (habit.name || "Aliskanlik").trim(), id: habit.id || habit.name, streak });
      }
    }
  }
  return results;
}

function normalizeSubscriptionData(raw) {
  const item = asMap(raw);
  const keys = asMap(item.keys);
  const endpoint = String(item.endpoint || "").trim();
  const p256dh = String(keys.p256dh || "").trim();
  const auth = String(keys.auth || "").trim();
  return {
    endpoint,
    keys: { p256dh, auth },
    enabled: item.enabled !== false,
    timezone: String(item.timezone || "").trim() || "",
    ref: null
  };
}

async function sendPushToSubscriptions(subscriptions, payload) {
  let successCount = 0;
  const staleRefs = [];
  const payloadStr = JSON.stringify(payload);

  for (const sub of subscriptions) {
    const endpoint = sub?.endpoint || "";
    const p256dh = sub?.keys?.p256dh || "";
    const auth = sub?.keys?.auth || "";
    if (!endpoint || !p256dh || !auth) {
      if (sub.ref) staleRefs.push(sub.ref);
      continue;
    }
    try {
      await webpush.sendNotification(
        { endpoint, keys: { p256dh, auth } },
        payloadStr,
        { TTL: 3600, urgency: "high" }
      );
      successCount += 1;
    } catch (err) {
      const status = Number(err?.statusCode || err?.status || 0);
      if (status === 404 || status === 410) {
        if (sub.ref) staleRefs.push(sub.ref);
      } else {
        logger.warn("push-send-failed", {
          status,
          message: String(err?.message || err || "push send error")
        });
      }
    }
  }

  if (staleRefs.length > 0) {
    const batch = db.batch();
    for (const ref of staleRefs) batch.delete(ref);
    await batch.commit();
  }

  return { successCount, staleCount: staleRefs.length };
}

// ===== Notification Content Builders =====

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
    // Perfect day
    const celebrations = [
      `Bugün ${done}/${total} alışkanlığın hepsini tamamladın, harika iş çıkardın! Yarın da böyle devam 💪`,
      `Tam puan! ${done}/${total} alışkanlık tamam. Kendini tebrik et, bunu hak ettin! 🏆`,
      `Mükemmel bir gün! Tüm ${total} hedefe ulaştın. Bu disiplin seni çok ileriye taşıyacak ⭐`
    ];
    title = "İyi geceler! 🌟";
    body = celebrations[Math.floor(Math.random() * celebrations.length)];
  } else if (ratio >= 0.5) {
    // Partial success
    title = "İyi geceler! 🌙";
    body = `Bugün ${done}/${total} adım attın, bu da güzel bir ilerleme. Yarın kaldığın yerden devam!`;
  } else if (done > 0) {
    // Low but not zero
    title = "İyi geceler! 🌙";
    body = `Bugün ${done}/${total} adım attın. Her adım önemli, yarın biraz daha fazlasını hedefle!`;
  } else {
    // Zero
    title = "İyi geceler 🌙";
    body = "Bugün biraz ara verdik, olur böyle günler. Yarın yeni bir başlangıç seni bekliyor!";
  }

  return { title, body, tag: "night-summary", url: "/", source: "night" };
}

// ===== Main Scheduled Function =====

exports.sendScheduledReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Etc/UTC",
    timeoutSeconds: 540,
    memory: "256MiB"
  },
  async () => {
    if (!configureWebPush()) {
      return null;
    }

    const now = new Date();
    const usersSnap = await db.collection("users").get();

    let scannedUsers = 0;
    let sentMorning = 0;
    let sentUrgency = 0;
    let sentNight = 0;
    let removedSubscriptions = 0;

    for (const userDoc of usersSnap.docs) {
      scannedUsers += 1;
      const userRef = userDoc.ref;
      const stateRef = userRef.collection("meta").doc("state");
      const pushStateRef = userRef.collection("meta").doc("pushState");

      const [stateDoc, pushStateDoc, habitsSnap, subsSnap] = await Promise.all([
        stateRef.get(),
        pushStateRef.get(),
        userRef.collection("habits").get(),
        userRef.collection("pushSubscriptions").get()
      ]);

      if (!stateDoc.exists) continue;
      const state = asMap(stateDoc.data());
      const settings = asMap(state.settings);
      if (settings.notificationsEnabled !== true) continue;

      const subscriptions = [];
      for (const doc of subsSnap.docs) {
        const sub = normalizeSubscriptionData(doc.data());
        sub.ref = doc.ref;
        if (!sub.enabled) continue;
        subscriptions.push(sub);
      }
      if (subscriptions.length === 0) continue;

      const timezone = normalizeTimeZone(subscriptions[0].timezone || settings.notificationTimezone || FALLBACK_TIMEZONE);
      const nowLocal = getTimeZoneParts(now, timezone);
      const todayKey = toDateKey(nowLocal);
      const currentMinutes = (nowLocal.hour * 60) + nowLocal.minute;
      const habits = habitsSnap.docs.map(doc => asMap(doc.data()));
      const progress = getHabitProgressForDate(habits, todayKey);
      const pushState = asMap(pushStateDoc.exists ? pushStateDoc.data() : {});

      const pushStateUpdates = {};

      // --- 1. MORNING NOTIFICATION + STREAK MILESTONES ---
      if (currentMinutes >= MORNING_START && currentMinutes <= MORNING_END) {
        const morningKey = `${todayKey}|morning`;
        if (String(pushState.lastMorningKey || "") !== morningKey && progress.totalHabits > 0) {
          const payload = buildMorningPayload(progress);
          const result = await sendPushToSubscriptions(subscriptions, payload);
          removedSubscriptions += result.staleCount;
          if (result.successCount > 0) {
            sentMorning += 1;
            pushStateUpdates.lastMorningKey = morningKey;
          }
        }

        // Streak milestone sub-notifications (fire during morning window)
        const milestoneHabits = getMilestoneHabits(habits, todayKey);
        const streakMilestones = asMap(pushState.streakMilestones);
        for (const item of milestoneHabits) {
          const milestoneKey = `${todayKey}|${item.id}|${item.streak}`;
          if (String(streakMilestones[`${item.id}_${item.streak}`] || "") === milestoneKey) continue;
          const payload = buildStreakMilestonePayload(item.name, item.streak);
          const result = await sendPushToSubscriptions(subscriptions, payload);
          removedSubscriptions += result.staleCount;
          if (result.successCount > 0) {
            if (!pushStateUpdates.streakMilestones) pushStateUpdates.streakMilestones = { ...streakMilestones };
            pushStateUpdates.streakMilestones[`${item.id}_${item.streak}`] = milestoneKey;
          }
        }
      }

      // --- 2. URGENCY NOTIFICATION ---
      if (currentMinutes >= URGENCY_START && currentMinutes <= URGENCY_END) {
        const urgencyKey = `${todayKey}|urgency`;
        if (String(pushState.lastUrgencyKey || "") !== urgencyKey && progress.remainingHabits > 0) {
          const payload = buildUrgencyPayload(progress);
          const result = await sendPushToSubscriptions(subscriptions, payload);
          removedSubscriptions += result.staleCount;
          if (result.successCount > 0) {
            sentUrgency += 1;
            pushStateUpdates.lastUrgencyKey = urgencyKey;
          }
        }
      }

      // --- 3. GOOD NIGHT NOTIFICATION ---
      if (currentMinutes >= NIGHT_START && currentMinutes <= NIGHT_END) {
        const nightKey = `${todayKey}|night`;
        if (String(pushState.lastNightKey || "") !== nightKey && progress.totalHabits > 0) {
          const payload = buildNightPayload(progress);
          const result = await sendPushToSubscriptions(subscriptions, payload);
          removedSubscriptions += result.staleCount;
          if (result.successCount > 0) {
            sentNight += 1;
            pushStateUpdates.lastNightKey = nightKey;
          }
        }
      }

      // Save push state if any notification was sent
      if (Object.keys(pushStateUpdates).length > 0) {
        pushStateUpdates.lastNotifiedAt = admin.firestore.FieldValue.serverTimestamp();
        pushStateUpdates.timezone = timezone;
        pushStateUpdates.updatedAt = now.toISOString();
        await pushStateRef.set(pushStateUpdates, { merge: true });
      }
    }

    logger.info("scheduled-reminder-summary", {
      scannedUsers,
      sentMorning,
      sentUrgency,
      sentNight,
      removedSubscriptions
    });
  }
);
