import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlay, holderTimeline } from "../src/play/model.js";

const tiny = (beats, extra = {}) => ({
  id: "t", court: "half", attack: "up",
  entities: [
    { id: "o1", team: "offense" }, { id: "o2", team: "offense" },
    { id: "d1", team: "defense" }, { id: "d2", team: "defense" },
  ],
  start: { ball: "o1", positions: { o1: { x: 75, y: 100 }, o2: { x: 120, y: 70 }, d1: { x: 75, y: 90 }, d2: { x: 110, y: 60 } } },
  beats, ...extra,
});

test("unbekannte Aktion und unbekannte Spielerin sind Fehler", () => {
  const { errors } = validatePlay(tiny([{ duration: 1000, actions: [
    { type: "teleport", player: "o1" },
    { type: "move", player: "o9", to: { x: 0, y: 0 } },
  ] }]));
  assert.ok(errors.some((e) => e.includes("teleport")));
  assert.ok(errors.some((e) => e.includes("o9")));
});

test("überlappende Aktionen derselben Spielerin sind Fehler, sequenzielle nicht", () => {
  const overlap = validatePlay(tiny([{ duration: 1000, actions: [
    { type: "move", player: "o2", to: { x: 100, y: 50 }, end: 0.6 },
    { type: "sprint", player: "o2", to: { x: 60, y: 30 }, start: 0.5 },
  ] }]));
  assert.ok(overlap.errors.some((e) => e.includes("überlappende")));
  const seq = validatePlay(tiny([{ duration: 1000, actions: [
    { type: "move", player: "o2", to: { x: 100, y: 50 }, end: 0.5 },
    { type: "sprint", player: "o2", to: { x: 60, y: 30 }, start: 0.5 },
  ] }]));
  assert.deepEqual(seq.errors, []);
});

test("Pass nur vom aktuellen Ballbesitz", () => {
  const { errors } = validatePlay(tiny([{ duration: 1000, actions: [{ type: "pass", from: "o2", to: "o1" }] }]));
  assert.ok(errors.some((e) => e.includes("Ball ist bei")));
});

test("Dribbling ohne Ball ist Fehler – nach Ballannahme im selben Beat erlaubt", () => {
  const bad = validatePlay(tiny([{ duration: 1000, actions: [{ type: "dribble", player: "o2", to: { x: 90, y: 40 } }] }]));
  assert.ok(bad.errors.some((e) => e.includes("dribbelt ohne Ball")));
  const ok = validatePlay(tiny([{ duration: 1000, actions: [
    { type: "pass", from: "o1", to: "o2", end: 0.4 },
    { type: "dribble", player: "o2", to: { x: 90, y: 40 }, start: 0.4 },
  ] }]));
  assert.deepEqual(ok.errors, []);
});

test("Trap braucht zwei Defense-Spielerinnen und ein Offense-Ziel", () => {
  const { errors } = validatePlay(tiny([{ duration: 1000, actions: [
    { type: "trap", players: ["d1"], target: "o1" },
    { type: "deny", player: "o2", target: "d2" },
  ] }]));
  assert.ok(errors.some((e) => e.includes("genau zwei")));
  assert.ok(errors.some((e) => e.includes("muss Offense")));
  assert.ok(errors.some((e) => e.includes("nur für Defense")));
});

test("geplante Aktionen erzeugen eine Warnung, keinen Fehler", () => {
  const { errors, warnings } = validatePlay(tiny([{ duration: 1000, actions: [{ type: "switch", player: "d1", target: "o2" }] }]));
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes("switch")));
});
