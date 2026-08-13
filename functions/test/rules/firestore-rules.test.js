// Firestore rules güvenlik testleri.
// Emulator gerektirir: emulator ayaktayken (FIREBASE_FIRESTORE_EMULATOR_HOST set)
// gerçekten koşar; aksi halde skip edilir (normal `npx vitest run` bozulmaz).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, test, beforeAll, afterAll, beforeEach } from "vitest";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { Timestamp } from "@firebase/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = "hedeflerim-2026";
const RULES_PATH = path.resolve(__dirname, "../../../firestore.rules");
const RULES = fs.readFileSync(RULES_PATH, "utf8");

// Whitelist'teki gerçek e-posta (firestore.rules isOwner listesinden)
const OWNER_EMAIL = "umutcansaymaz@gmail.com";
const STRANGER_EMAIL = "saldirgan@example.com";
const UID = "testuser1";

const emulatorUp = !!process.env.FIREBASE_FIRESTORE_EMULATOR_HOST;
(emulatorUp ? describe : describe.skip)("Firestore rules güvenlik", () => {
  let env;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: RULES,
        host: "localhost",
        port: 8080
      }
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  beforeEach(async () => {
    await env.clearFirestore();
  });

  function owner() {
    return env.authenticatedContext(UID, { email: OWNER_EMAIL, email_verified: true });
  }

// ---------- AUTH KATMANI (isOwner) ----------

test("whitelist + email_verified + kendi uid -> users okuma IZINLI", async () => {
  const db = owner().firestore();
  await assertSucceeds(db.doc(`users/${UID}`).get());
});

test("whitelist disi eposta -> RED", async () => {
  const db = env.authenticatedContext(UID, { email: STRANGER_EMAIL, email_verified: true }).firestore();
  await assertFails(db.doc(`users/${UID}`).get());
});

test("whitelist eposta ama email_verified=false -> RED (guvenlik fix kaniti)", async () => {
  const db = env.authenticatedContext(UID, { email: OWNER_EMAIL, email_verified: false }).firestore();
  await assertFails(db.doc(`users/${UID}`).get());
});

test("whitelist + verified ama BASKASININ uid -> RED", async () => {
  const db = owner().firestore();
  await assertFails(db.doc("users/baska-kullanici").get());
});

test("giris yapmamis (unauthenticated) -> RED", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(db.doc(`users/${UID}`).get());
});

// ---------- SCHEMA KATMANI ----------

test("users/{uid} gecerli cloud root create -> IZINLI", async () => {
  const db = owner().firestore();
  await assertSucceeds(db.doc(`users/${UID}`).set({ schemaVersion: 2 }));
});

test("users/{uid} schema ihlali (ekstra alan) -> RED", async () => {
  const db = owner().firestore();
  await assertFails(db.doc(`users/${UID}`).set({ schemaVersion: 2, hack: "x" }));
});

test("users/{uid} schemaVersion sinir disi -> RED", async () => {
  const db = owner().firestore();
  await assertFails(db.doc(`users/${UID}`).set({ schemaVersion: 99 }));
});

test("users/{uid} client gercek payload (updatedAt serverTimestamp) -> IZINLI", async () => {
  const db = owner().firestore();
  await assertSucceeds(
    db.doc(`users/${UID}`).set({
      schemaVersion: 2,
      lastClientSyncAt: "2026-08-13T10:00:00.000Z",
      counters: { habits: 3, todos: 2, books: 1, notes: 0, focusSessions: 0 },
      app: { source: "web", version: "11.0.0" },
      updatedAt: Timestamp.now()
    })
  );
});

test("habits/{h} gecerli habit create -> IZINLI", async () => {
  const db = owner().firestore();
  await assertSucceeds(
    db.doc(`users/${UID}/habits/h1`).set({ id: "h1", name: "Su ic", color: "#4a90d9", completions: {} })
  );
});

test("habits/{h} id != habitId -> RED", async () => {
  const db = owner().firestore();
  await assertFails(
    db.doc(`users/${UID}/habits/h1`).set({ id: "h2", name: "Su ic", color: "#4a90d9", completions: {} })
  );
});

test("meta/state gecerli -> IZINLI", async () => {
  const db = owner().firestore();
  await assertSucceeds(
    db.doc(`users/${UID}/meta/state`).set({
      settings: { theme: "dark" },
      moods: {},
      xp: 10,
      level: 2,
      achievements: [],
      updatedAt: "2026-08-13T10:00:00.000Z"
    })
  );
});

test("meta/state zorunlu alan eksik (xp yok) -> RED", async () => {
  const db = owner().firestore();
  await assertFails(
    db.doc(`users/${UID}/meta/state`).set({
      settings: { theme: "dark" },
      moods: {},
      achievements: [],
      updatedAt: "2026-08-13T10:00:00.000Z"
    })
  );
});

test("meta/state settings schema ihlali -> RED", async () => {
  const db = owner().firestore();
  await assertFails(
    db.doc(`users/${UID}/meta/state`).set({
      settings: { hack: true },
      moods: {},
      xp: 10,
      level: 2,
      achievements: [],
      updatedAt: "2026-08-13T10:00:00.000Z"
    })
  );
});

test("errors gecerli create -> IZINLI", async () => {
  const db = owner().firestore();
  await assertSucceeds(
    db.doc(`users/${UID}/errors/e1`).set({
      id: "e1", userId: UID, kind: "js", message: "hata",
      extra: {}, createdAt: "t", updatedAt: "t"
    })
  );
});

// ---------- KILITLER (delete/update yasaklari) ----------

test("users/{uid} delete -> RED (silme kilitli)", async () => {
  const db = owner().firestore();
  await db.doc(`users/${UID}`).set({ schemaVersion: 2 }); // once olustur
  await assertFails(db.doc(`users/${UID}`).delete());
});

test("meta/{doc} delete -> RED", async () => {
  const db = owner().firestore();
  await db.doc(`users/${UID}/meta/state`).set({
    settings: {}, moods: {}, xp: 0, level: 1, achievements: [], updatedAt: "t"
  });
  await assertFails(db.doc(`users/${UID}/meta/state`).delete());
});

test("errors/{id} update -> RED (append-only)", async () => {
  const db = owner().firestore();
  await db.doc(`users/${UID}/errors/e1`).set({
    id: "e1", userId: UID, kind: "js", message: "hata",
    extra: {}, createdAt: "t", updatedAt: "t"
  });
  await assertFails(db.doc(`users/${UID}/errors/e1`).update({ message: "degisti" }));
});

// ---------- CATCH-ALL ----------

test("users/{uid}/secrets/{x} -> RED (catch-all)", async () => {
  const db = owner().firestore();
  await assertFails(db.doc(`users/${UID}/secrets/anahtar`).set({ v: 1 }));
  await assertFails(db.doc(`users/${UID}/secrets/anahtar`).get());
});

test("kok koleksiyon /admin/{x} -> RED (global deny)", async () => {
  const db = owner().firestore();
  await assertFails(db.doc("admin/duyuru").set({ v: 1 }));
  await assertFails(db.doc("admin/duyuru").get());
});
});
