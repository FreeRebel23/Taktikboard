import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* Simulierter localStorage mit steuerbaren Fehlern */
class FakeStorage {
  constructor() { this.m = new Map(); this.mode = "ok"; this.quota = Infinity; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    if (this.mode === "throw") { const e = new Error("SecurityError"); e.name = "SecurityError"; throw e; }
    if (this.mode === "quota" || v.length > this.quota) { const e = new Error("quota exceeded"); e.name = "QuotaExceededError"; throw e; }
    if (this.mode === "drop") return; // Schreiben "verschluckt" (z. B. Browser-Bug/Sperre)
    this.m.set(k, String(v));
  }
  removeItem(k) { this.m.delete(k); }
}
const fake = new FakeStorage();
globalThis.localStorage = fake;

const S = await import("../src/store/playStore.js");
const { pressBreak } = await import("../src/play/plays/pressBreak.js");
const mine = (id = "my_a", name = "Test") => ({ ...structuredClone(pressBreak), id, name });

beforeEach(() => { fake.m.clear(); fake.mode = "ok"; fake.quota = Infinity; });

test("Speichern wird durch Zurücklesen bestätigt", () => {
  const r = S.saveMyPlay(mine());
  assert.equal(r.ok, true);
  assert.equal(S.loadMyPlays().length, 1);
  assert.equal(S.findMyPlay("my_a").play.name, "Test");
  assert.equal(S.findMyPlay("my_a").play.schema, S.SCHEMA);
});

test("Speicher voll → Fehler mit verständlicher Meldung, alter Stand bleibt", () => {
  S.saveMyPlay(mine("my_a", "Alt"));
  fake.mode = "quota";
  const r = S.saveMyPlay(mine("my_b", "Neu"));
  assert.equal(r.ok, false);
  assert.match(r.error, /Speicher des Browsers ist voll/);
  fake.mode = "ok";
  assert.deepEqual(S.loadMyPlays().map((x) => x.play.name), ["Alt"]);
});

test("Speichern gesperrt (privater Modus) → Fehler, nie Erfolg", () => {
  fake.mode = "throw";
  const r = S.saveMyPlay(mine());
  assert.equal(r.ok, false);
  assert.match(r.error, /nicht möglich/);
});

test("Schreiben kommt nicht an → wird als Fehler erkannt (nicht bestätigt)", () => {
  fake.mode = "drop";
  const r = S.saveMyPlay(mine());
  assert.equal(r.ok, false);
  assert.match(r.error, /nicht bestätigt/);
});

test("Aktualisieren ersetzt nur denselben Spielzug, andere bleiben", () => {
  S.saveMyPlay(mine("my_a", "A")); S.saveMyPlay(mine("my_b", "B"));
  S.saveMyPlay(mine("my_a", "A2"));
  const names = S.loadMyPlays().map((x) => x.play.name).sort();
  assert.deepEqual(names, ["A2", "B"]);
});

test("Entwürfe: automatisch gesichert, nach dem Speichern entfernt", () => {
  const p = mine("my_d", "Entwurf");
  assert.equal(S.saveDraft(p).ok, true);
  assert.equal(S.pendingDrafts().length, 1, "nie gespeichert → offen");
  S.saveMyPlay(p);
  assert.equal(S.pendingDrafts().length, 0);
});

test("Entwurf neuer als gespeicherter Stand → als ungesichert gemeldet", async () => {
  S.saveMyPlay(mine("my_e", "Stand 1"));
  await new Promise((r) => setTimeout(r, 5));
  S.saveDraft(mine("my_e", "Stand 2"));
  const pend = S.pendingDrafts();
  assert.equal(pend.length, 1);
  assert.equal(pend[0].play.name, "Stand 2");
});

test("Sicherung → Import: identische werden übersprungen, abweichende als Kopie", () => {
  S.saveMyPlay(mine("my_a", "A"));
  const backup = S.backupObject();
  assert.equal(backup.format, "taktikboard-backup");
  let n = 0;
  const r1 = S.importPlays(backup.plays, () => `my_new${n++}`);
  assert.equal(r1.added, 0); assert.equal(r1.skipped, 1);
  const r2 = S.importPlays([{ ...backup.plays[0], name: "A geändert" }], () => `my_new${n++}`);
  assert.equal(r2.added, 1);
  assert.equal(S.loadMyPlays().length, 2, "Original bleibt erhalten");
});

test("beschädigte Daten im Speicher führen nicht zum Absturz", () => {
  fake.m.set("taktikboard.plays.v1", "{kaputt");
  assert.deepEqual(S.loadMyPlays(), []);
  fake.m.set("taktikboard.plays.v1", JSON.stringify([{ foo: 1 }, { play: mine("my_ok") }]));
  assert.equal(S.loadMyPlays().length, 1);
});

test("Löschen schlägt sauber fehl, wenn der Speicher gesperrt ist", () => {
  S.saveMyPlay(mine("my_a"));
  fake.mode = "throw";
  const r = S.deleteMyPlay("my_a");
  assert.equal(r.ok, false);
  fake.mode = "ok";
  assert.equal(S.loadMyPlays().length, 1);
});
