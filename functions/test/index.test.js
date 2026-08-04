// ============================================================
// Trigger katmanı smoke testi (index.js).
// Amaç: (1) modül mock'larla yüklenebilir, (2) export'ta yalnızca
// sendScheduledReminders var (helper'lar deploy'a sızmaz).
// ============================================================

import { describe, it, expect, vi } from "vitest";

vi.mock("firebase-admin", () => ({
  initializeApp: () => ({ firestore: () => ({ collection: vi.fn() }) }),
  firestore: { FieldValue: { serverTimestamp: () => ({}) } }
}));

vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_options, handler) => handler
}));

vi.mock("firebase-functions/logger", () => ({
  info: vi.fn(),
  warn: vi.fn()
}));

vi.mock("web-push", () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn()
}));

import mod from "../index.js";

describe("index.js export yüzeyi", () => {
  it("sendScheduledReminders bir fonksiyondur (trigger)", () => {
    expect(typeof mod.sendScheduledReminders).toBe("function");
  });

  it("export'ta yalnızca sendScheduledReminders var — helper sızıntısı yok", () => {
    expect(Object.keys(mod)).toEqual(["sendScheduledReminders"]);
  });
});
