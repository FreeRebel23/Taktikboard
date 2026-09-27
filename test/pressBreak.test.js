import { test } from "node:test";
import { validatePlay, holderTimeline } from "../src/play/model.js";
import assert from "node:assert/strict";
import { compilePlay, sampleFrame, beatBoundaries, beatDiagram, trapSlots, TRAP_RADIUS } from "../src/play/engine.js";
import { pressBreak } from "../src/play/plays/pressBreak.js";
import { distToSegment, dist, angleDiff } from "../src/play/vec.js";

const C = compilePlay(pressBreak);
const bounds = beatBoundaries(C);
const endOf = (id) => C.beats.find((b) => b.beat.id === id).t1;
const deg = (r) => (r * 180) / Math.PI;

test("Press Break ist gültig", () => {
  const { errors, warnings } = validatePlay(pressBreak);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("Ballbesitz folgt den Pässen über die Beats", () => {
  assert.deepEqual(holderTimeline(pressBreak), ["o4", "o1", "o1", "o1", "o1", "o5", "o2"]);
});

test("Gesamtdauer = Summe der Beats", () => {
  const sum = pressBreak.beats.reduce((s, b) => s + b.duration, 0) / 1000;
  assert.ok(Math.abs(C.total - sum) < 1e-9);
  assert.equal(bounds.length, pressBreak.beats.length + 1);
});

test("Startframe entspricht der Ausgangssituation", () => {
  const f = sampleFrame(C, 0);
  for (const [id, p] of Object.entries(pressBreak.start.positions)) {
    assert.ok(dist(f.players[id], p) < 1e-6, id);
  }
  assert.equal(f.ball.holder, "o4");
});

test("keine Sprünge – weder an Beat-Grenzen noch dazwischen", () => {
  const dt = 1 / 60;
  let prev = sampleFrame(C, 0);
  for (let t = dt; t <= C.total; t += dt) {
    const f = sampleFrame(C, t);
    for (const id of C.ids) {
      const d = dist(prev.players[id], f.players[id]);
      assert.ok(d < 1.6, `${id} springt bei t=${t.toFixed(2)} (${d.toFixed(2)})`); // < 9,6 m/s
    }
    prev = f;
  }
});

test("mehrere Spielerinnen handeln gleichzeitig in einem Beat", () => {
  const f0 = sampleFrame(C, 0);
  const f1 = sampleFrame(C, 0.5);
  const moved = C.ids.filter((id) => dist(f0.players[id], f1.players[id]) > 1);
  assert.ok(moved.includes("o1") && moved.includes("d1"), moved.join());
});

test("Ballbesitz und Pässe: Einwurf → 1 → 5 → 2", () => {
  const at = (t) => sampleFrame(C, t).ball;
  assert.equal(at(0.5).holder, "o4");
  const flight = at(C.beats[0].t0 + 0.65 * C.beats[0].dur);
  assert.equal(flight.state, "flight");
  assert.equal(flight.from, "o4");
  assert.ok(flight.z > 3.5, "Ball fliegt über Hüfthöhe");
  assert.equal(at(endOf("inbound")).holder, "o1");
  assert.equal(at(endOf("outlet")).holder, "o5");
  assert.equal(at(C.total).holder, "o2");
});

test("Pass aus dem Trap ist ein Lob und schneller als jede Spielerin", () => {
  const b = C.beats.find((x) => x.beat.id === "outlet");
  const t = b.t0 + 0.3 * b.dur;
  const a = sampleFrame(C, t).ball, c = sampleFrame(C, t + 0.05).ball;
  assert.equal(a.state, "flight");
  assert.ok(a.lob);
  const ballSpeed = dist(a, c) / 0.05;
  const maxPlayer = Math.max(...Object.values(sampleFrame(C, t).players).map((p) => p.speed));
  assert.ok(ballSpeed > 2 * maxPlayer, `${ballSpeed} vs ${maxPlayer}`);
});

test("Trap: zwei Verteidigerinnen schließen die Ballführerin von zwei Seiten ein", () => {
  const f = sampleFrame(C, endOf("trap") - 0.01);
  const T = f.players.o1;
  const [a, b] = [f.players.d1, f.players.d4];
  assert.ok(Math.abs(dist(a, T) - TRAP_RADIUS) < 1.2);
  assert.ok(Math.abs(dist(b, T) - TRAP_RADIUS) < 1.2);
  const sep = Math.abs(deg(angleDiff(Math.atan2(a.y - T.y, a.x - T.x), Math.atan2(b.y - T.y, b.x - T.x))));
  assert.ok(sep > 60 && sep < 130, `Winkel ${sep}`);
  assert.equal(f.traps.length, 1);
  assert.ok(f.traps[0].strength > 0.95);
  assert.equal(a.stance, "trap");
  assert.ok(f.players.o1.trapped);
  assert.ok(f.ball.protected, "Ball wird im Trap geschützt");
  // Trapperinnen schauen zur Ballführerin
  for (const d of [a, b]) {
    const toT = Math.atan2(T.y - d.y, T.x - d.x);
    assert.ok(Math.abs(deg(angleDiff(d.body, toT))) < 25);
  }
});

test("Trap-Slots nehmen den Weg nach vorne und die Mitte weg", () => {
  const T = { x: 122, y: 244 };
  const [ahead, middle] = trapSlots(C, T);
  assert.ok(ahead.y < T.y, "ein Slot zum angegriffenen Korb");
  assert.ok(middle.x < T.x, "ein Slot zur Feldmitte");
});

test("Trap endet, sobald der Ball gespielt ist", () => {
  const f = sampleFrame(C, endOf("outlet") - 0.01);
  assert.equal(f.traps.length, 0);
});

test("Deny: X3 steht in der Passlinie zum Rückpass", () => {
  const f = sampleFrame(C, endOf("trap") - 0.01);
  assert.ok(distToSegment(f.players.d3, f.players.o1, f.players.o4) < 4);
});

test("Passwege: 5 ist frei, 2 und 4 sind zu", () => {
  const f = sampleFrame(C, endOf("second_row") - 0.01);
  const lane = (id) => f.lanes.find((l) => l.to === id);
  assert.equal(lane("o5").status, "open");
  assert.equal(lane("o2").status, "closed");
  assert.equal(lane("o4").status, "closed");
});

test("1. Presslinie wird erst durch den Pass aus dem Trap überwunden", () => {
  const before = sampleFrame(C, endOf("second_row") - 0.01).lines.find((l) => l.id === "press1");
  const after = sampleFrame(C, endOf("outlet") - 0.01).lines.find((l) => l.id === "press1");
  assert.equal(before.beaten, false);
  assert.equal(after.beaten, true);
  assert.equal(sampleFrame(C, 0.5).lines.length, 0, "Linie erscheint erst ab dem Trap");
});

test("Ausrichtung: Ballführerin schaut nach vorne, Einwurf-Verteidigerin mit hohen Armen", () => {
  const f = sampleFrame(C, endOf("catch") - 0.01);
  assert.ok(Math.abs(deg(angleDiff(f.players.o1.body, -Math.PI / 2))) < 15);
  assert.equal(sampleFrame(C, 0.2).players.d4.stance, "arms-up");
  // Matchup: X1 verteidigt die Ballführerin
  assert.ok(f.matchups.some((m) => m.defender === "d1" && m.target === "o1" && m.onBall));
});

test("an einer Beat-Grenze gilt der gerade beendete Beat", () => {
  assert.equal(sampleFrame(C, endOf("trap")).beat.id, "trap");
  assert.equal(sampleFrame(C, endOf("trap") + 0.01).beat.id, "second_row");
  assert.equal(sampleFrame(C, 0).beat.id, "inbound");
});

test("deterministisch: Scrubbing liefert denselben Zustand wie Abspielen", () => {
  const a = sampleFrame(C, 5.123);
  sampleFrame(C, 11); sampleFrame(C, 0.2);
  const b = sampleFrame(C, 5.123);
  assert.deepEqual(a, b);
});

test("Diagramm liefert Laufwege und Pässe je Beat", () => {
  const d = beatDiagram(C, 0);
  assert.ok(d.some((x) => x.kind === "cut" && x.player === "o1"));
  assert.ok(d.some((x) => x.kind === "pass" && x.player === "o4" && x.to === "o1"));
  assert.ok(beatDiagram(C, 2).some((x) => x.kind === "relation" && x.player === "d4"));
});

test("nicht implementierte Aktion verhält sich wie Hold", () => {
  const play = structuredClone(pressBreak);
  play.beats[1].actions = play.beats[1].actions.filter((a) => a.player !== "d5");
  play.beats[1].actions.push({ type: "closeout", player: "d5", target: "o3" });
  const C2 = compilePlay(play);
  assert.ok(C2.warnings.length > 0);
  const b = C2.beats[1];
  assert.ok(dist(sampleFrame(C2, b.t0).players.d5, sampleFrame(C2, b.t1 - 0.01).players.d5) < 1e-6);
});
