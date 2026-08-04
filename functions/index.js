// ============================================================
// Cloud Functions trigger katmanı (I/O).
// Saf iş mantığı ./logic içindedir (ADR-0006).
// DİKKAT: Bu dosyadan yalnızca sendScheduledReminders export
// edilir — helper'lar export edilirse firebase deploy onları da
// trigger olarak yüklemeye çalışır.
// ============================================================

const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const webpush = require("web-push");

const {
  FALLBACK_TIMEZONE,
  WINDOWS,
  asMap,
  normalizeTimeZone,
  getTimeZoneParts,
  toDateKey,
  getHabitProgressForDate,
  getMilestoneHabits,
  buildStreakMilestonePayload,
  isWindowDue,
  getWindowKey,
  getActiveWindows
} = require("./logic");

admin.initializeApp();
const db = admin.firestore();

const VAPID_SUBJECT = "mailto:no-reply@hedeflerim.app";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

// ===== Push Yardımcıları =====

function configureWebPush() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("web-push-vapid-missing");
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return true;
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

async function sendOnePush(sub, payloadStr) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      payloadStr,
      { TTL: 3600, urgency: "high" }
    );
    return { success: true, stale: false };
  } catch (err) {
    const status = Number(err?.statusCode || err?.status || 0);
    if (status === 404 || status === 410) return { success: false, stale: true };
    logger.warn("push-send-failed", {
      status,
      message: String(err?.message || err || "push send error")
    });
    return { success: false, stale: false };
  }
}

function collectStaleRef(ref, staleRefs) {
  if (ref) staleRefs.push(ref);
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
      collectStaleRef(sub.ref, staleRefs);
      continue;
    }
    const result = await sendOnePush(sub, payloadStr);
    if (result.success) {
      successCount += 1;
    } else if (result.stale) {
      collectStaleRef(sub.ref, staleRefs);
    }
  }

  if (staleRefs.length > 0) {
    const batch = db.batch();
    for (const ref of staleRefs) batch.delete(ref);
    await batch.commit();
  }

  return { successCount, staleCount: staleRefs.length };
}

// ===== Kullanıcı Bağlamı =====

function emptyCounts() {
  return { scannedUsers: 0, sentMorning: 0, sentUrgency: 0, sentNight: 0, removedSubscriptions: 0 };
}

async function loadUserContext(userRef) {
  const stateRef = userRef.collection("meta").doc("state");
  const pushStateRef = userRef.collection("meta").doc("pushState");
  const [stateDoc, pushStateDoc, habitsSnap, subsSnap] = await Promise.all([
    stateRef.get(),
    pushStateRef.get(),
    userRef.collection("habits").get(),
    userRef.collection("pushSubscriptions").get()
  ]);
  return { stateDoc, pushStateDoc, habitsSnap, subsSnap, pushStateRef };
}

function getActiveSubscriptions(subsSnap) {
  const subscriptions = [];
  for (const doc of subsSnap.docs) {
    const sub = normalizeSubscriptionData(doc.data());
    sub.ref = doc.ref;
    if (!sub.enabled) continue;
    subscriptions.push(sub);
  }
  return subscriptions;
}

// ===== Bildirim Gönderimleri =====

async function sendWindowNotification({ window, progress, todayKey, pushState, subscriptions }) {
  const payload = window.build(progress);
  const result = await sendPushToSubscriptions(subscriptions, payload);
  const updates = {};
  if (result.successCount > 0) {
    updates[window.stateKey] = getWindowKey(window, todayKey);
  }
  return { updates, sent: result.successCount > 0, staleCount: result.staleCount };
}

async function sendStreakMilestoneNotifications({ habits, todayKey, pushState, subscriptions }) {
  const milestoneHabits = getMilestoneHabits(habits, todayKey);
  const milestoneState = { ...asMap(pushState.streakMilestones) };
  let staleCount = 0;
  let sentAny = false;
  for (const item of milestoneHabits) {
    const milestoneKey = `${todayKey}|${item.id}|${item.streak}`;
    if (String(milestoneState[`${item.id}_${item.streak}`] || "") === milestoneKey) continue;
    const payload = buildStreakMilestonePayload(item.name, item.streak);
    const result = await sendPushToSubscriptions(subscriptions, payload);
    staleCount += result.staleCount;
    if (result.successCount > 0) {
      milestoneState[`${item.id}_${item.streak}`] = milestoneKey;
      sentAny = true;
    }
  }
  return { updates: sentAny ? { streakMilestones: milestoneState } : {}, staleCount };
}

// ===== Kullanıcı İşleme =====

async function processUser(userDoc, now) {
  const userRef = userDoc.ref;
  const { stateDoc, pushStateDoc, habitsSnap, subsSnap, pushStateRef } = await loadUserContext(userRef);

  if (!stateDoc.exists) return emptyCounts();
  const state = asMap(stateDoc.data());
  const settings = asMap(state.settings);
  if (settings.notificationsEnabled !== true) return emptyCounts();

  const subscriptions = getActiveSubscriptions(subsSnap);
  if (subscriptions.length === 0) return emptyCounts();

  const timezone = normalizeTimeZone(subscriptions[0].timezone || settings.notificationTimezone || FALLBACK_TIMEZONE);
  const nowLocal = getTimeZoneParts(now, timezone);
  const todayKey = toDateKey(nowLocal);
  const currentMinutes = (nowLocal.hour * 60) + nowLocal.minute;
  const habits = habitsSnap.docs.map(doc => asMap(doc.data()));
  const progress = getHabitProgressForDate(habits, todayKey);
  const pushState = asMap(pushStateDoc.exists ? pushStateDoc.data() : {});

  const pushStateUpdates = {};
  const counts = emptyCounts();
  const activeWindows = getActiveWindows(currentMinutes);
  const WINDOW_COUNTERS = { morning: "sentMorning", urgency: "sentUrgency", night: "sentNight" };

  for (const window of activeWindows) {
    if (!isWindowDue(window, todayKey, pushState)) continue;
    if (!window.gate(progress)) continue;
    const result = await sendWindowNotification({ window, progress, todayKey, pushState, subscriptions });
    counts.removedSubscriptions += result.staleCount;
    if (result.sent) {
      Object.assign(pushStateUpdates, result.updates);
      counts[WINDOW_COUNTERS[window.id]] += 1;
    }
  }

  // Streak milestone bildirimleri yalnızca sabah penceresinde tetiklenir
  if (activeWindows.some(window => window.id === "morning")) {
    const result = await sendStreakMilestoneNotifications({ habits, todayKey, pushState, subscriptions });
    counts.removedSubscriptions += result.staleCount;
    Object.assign(pushStateUpdates, result.updates);
  }

  // Bildirim gönderildiyse push state kaydedilir
  if (Object.keys(pushStateUpdates).length > 0) {
    pushStateUpdates.lastNotifiedAt = admin.firestore.FieldValue.serverTimestamp();
    pushStateUpdates.timezone = timezone;
    pushStateUpdates.updatedAt = now.toISOString();
    await pushStateRef.set(pushStateUpdates, { merge: true });
  }

  return counts;
}

// ===== Ana Zamanlanmış Fonksiyon =====

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
    const totals = emptyCounts();

    for (const userDoc of usersSnap.docs) {
      const counts = await processUser(userDoc, now);
      totals.scannedUsers += 1;
      totals.sentMorning += counts.sentMorning;
      totals.sentUrgency += counts.sentUrgency;
      totals.sentNight += counts.sentNight;
      totals.removedSubscriptions += counts.removedSubscriptions;
    }

    logger.info("scheduled-reminder-summary", totals);
  }
);
