import { test } from "node:test";
import assert from "node:assert/strict";
import { compilePlay, sampleFrame, trapSlots, passLanes, TRAP_RADIUS } from "../src/play/engine.js";
import { dist } from "../src/play/vec.js";

const base = (beats) => ({
  id: "t", court: "half", attack: "up",
  entities: [
    { id: "o1", team: "offense" }, { id: "o2", team: "offense" },
    { id: "d1", team: "defense" }, { id: "d2", team: "defense" },
  ],
  start: { ball: "o1", positions: { o1: { x: 110, y: 90 }, o2: { x: 40, y: 70 }, d1: { x: 105, y: 80 }, d2: { x: 60, y: 70 } } },
  beats,
});

test("Aktionen im selben Beat laufen gleichzeitig", () => {
  const C = compilePlay(base([{ duration: 1000, actions: [
    { type: "move", player: "o2", to: { x: 40, y: 40 } },
    { type: "sprint", player: "d2", to: { x: 60, y: 40 } },
  ] }]));
  const f = sampleFrame(C, 0.5);
  assert.ok(f.players.o2.y < 65 && f.players.d2.y < 65);
});

test("Bewegung beschleunigt und bremst (nicht linear)", () => {
  const C = compilePlay(base([{ duration: 1000, actions: [{ type: "move", player: "o2", to: { x: 40, y: 30 } }] }]));
  const y = (t) => sampleFrame(C, t).players.o2.y;
  const early = y(0) - y(0.1), mid = y(0.45) - y(0.55), late = y(0.9) - y(1);
  assert.ok(early < mid * 0.5 && late < mid * 0.5, `${early} ${mid} ${late}`);
});

test("Positionen sind an Beat-Grenzen stetig", () => {
  const C = compilePlay(base([
    { duration: 800, actions: [{ type: "sprint", player: "o2", to: { x: 40, y: 30 } }] },
    { duration: 800, actions: [{ type: "move", player: "o2", to: { x: 80, y: 30 } }, { type: "guard", player: "d2", target: "o2" }] },
  ]));
  const a = sampleFrame(C, 0.8 - 1e-6).players, b = sampleFrame(C, 0.8 + 1e-6).players;
  for (const id of C.ids) assert.ok(dist(a[id], b[id]) < 0.01, id);
});

test("Guard folgt der Gegenspielerin auf der Korbseite", () => {
  const C = compilePlay(base([{ duration: 1000, actions: [
    { type: "move", player: "o2", to: { x: 30, y: 100 } },
    { type: "guard", player: "d2", target: "o2" },
  ] }]));
  const f = sampleFrame(C, 1);
  assert.ok(Math.abs(dist(f.players.d2, f.players.o2) - 8) < 0.5);
  assert.ok(f.players.d2.y < f.players.o2.y, "zwischen Gegenspielerin und Korb");
});

test("Trap bildet sich um die Ballführerin – Stärke steigt mit der Annäherung", () => {
  const C = compilePlay(base([{ duration: 1000, actions: [{ type: "trap", players: ["d1", "d2"], target: "o1" }] }]));
  const s0 = sampleFrame(C, 0.2).traps[0]?.strength ?? 0;
  const f = sampleFrame(C, 1);
  assert.ok(f.traps[0].strength > s0);
  for (const id of ["d1", "d2"]) assert.ok(Math.abs(dist(f.players[id], f.players.o1) - TRAP_RADIUS) < 0.01);
  const [ahead, middle] = trapSlots(C, f.players.o1);
  assert.ok(ahead.y < f.players.o1.y && middle.x < f.players.o1.x);
});

test("Pass wechselt den Ballbesitz, Ball fliegt mit Bogen", () => {
  const C = compilePlay(base([{ duration: 1000, actions: [{ type: "pass", from: "o1", to: "o2", start: 0.2, end: 0.8 }] }]));
  assert.equal(sampleFrame(C, 0.1).ball.holder, "o1");
  const mid = sampleFrame(C, 0.5).ball;
  assert.equal(mid.state, "flight");
  assert.ok(mid.z > sampleFrame(C, 0.1).ball.z);
  assert.equal(sampleFrame(C, 0.9).ball.holder, "o2");
});

test("Dribbling: Ball springt, Ballführerin bewegt sich", () => {
  const C = compilePlay(base([{ duration: 1000, actions: [{ type: "dribble", player: "o1", to: { x: 110, y: 50 } }] }]));
  const zs = [0.1, 0.2, 0.3, 0.4, 0.5].map((t) => sampleFrame(C, t).ball.z);
  assert.equal(sampleFrame(C, 0.3).ball.state, "dribble");
  assert.ok(Math.max(...zs) - Math.min(...zs) > 2);
});

test("ungültige Plays werden beim Kompilieren abgewiesen", () => {
  assert.throws(() => compilePlay(base([{ duration: 1000, actions: [{ type: "pass", from: "o2", to: "o1" }] }])), /ungültig/);
});

/* ---- Passlinien: nahe Verteidigerinnen dürfen nicht einfach ignoriert werden ---- */

const laneSetup = (d1, extra = {}) => compilePlay({
  id: "lanes", court: "half", attack: "up",
  entities: [
    { id: "o1", team: "offense" }, { id: "o2", team: "offense" },
    { id: "d1", team: "defense" }, { id: "d2", team: "defense" },
  ],
  start: { ball: "o1", positions: { o1: { x: 75, y: 100 }, o2: { x: 75, y: 45 }, d1, d2: extra.d2 ?? { x: 140, y: 10 } } },
  beats: [{ duration: 1000, showLanes: true, actions: extra.actions ?? [{ type: "hold", player: "d1" }] }],
});
const laneTo = (C, id) => sampleFrame(C, 0.5).lanes.find((l) => l.to === id);

test("Verteidigerin direkt vor der Passgeberin in der Passrichtung → Linie ist nicht frei (auch ohne Trap)", () => {
  // Regression: früher wurden alle Verteidigerinnen < 1,2 m an der Passgeberin ignoriert → "open"
  const lane = laneTo(laneSetup({ x: 75, y: 92 }), "o2");
  assert.notEqual(lane.status, "open");
  assert.equal(lane.status, "lob");
  assert.deepEqual(lane.blockedBy, ["d1"]);
});

test("nahe Verteidigerin seitlich der Passrichtung blockiert nicht", () => {
  const lane = laneTo(laneSetup({ x: 85, y: 102 }), "o2");
  assert.equal(lane.status, "open");
  assert.deepEqual(lane.blockedBy, []);
});

test("nahe Verteidigerin + weitere Verteidigerin in der Linie → geschlossen", () => {
  const lane = laneTo(laneSetup({ x: 75, y: 92 }, { d2: { x: 76, y: 70 } }), "o2");
  assert.equal(lane.status, "closed");
});

test("Trapperinnen zählen bei jedem Pass mit – nicht nur beim modellierten Lob", () => {
  const C = compilePlay(base([{ duration: 1000, showLanes: true, actions: [{ type: "trap", players: ["d1", "d2"], target: "o1" }] }]));
  const f = sampleFrame(C, 1);
  const lanes = passLanes(C, f.players, "o1");
  const toO2 = lanes.find((l) => l.to === "o2");
  // o2 steht in Richtung Mitte – genau dort steht eine Trapperin
  assert.notEqual(toO2.status, "open");
  assert.ok(toO2.blockedBy.length > 0);
});

test("direkter Pass durch die Arme einer Verteidigerin erzeugt eine Warnung, als Lob nicht", () => {
  const pass = (lob) => laneSetup({ x: 75, y: 92 }, { actions: [
    { type: "hold", player: "d1" },
    { type: "pass", from: "o1", to: "o2", start: 0.2, end: 0.6, lob },
  ] });
  assert.ok(pass(false).warnings.some((w) => w.includes("nur als Lob")));
  assert.deepEqual(pass(true).warnings, []);
});
