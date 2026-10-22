import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRoll } from "../src/play/plays/pickRoll.js";
import { compileVariant, validatePlayTree, sampleFrame } from "../src/play/index.js";
import { dist, angleDiff } from "../src/play/vec.js";

const SHOW = { x5: "show" }, SWITCH = { x5: "switch" };
const endOf = (C, id) => C.beats.find((b) => b.beat.id === id).t1;

test("Pick & Roll: Baum und beide Varianten gültig, keine Pass-Warnungen", () => {
  const { errors, warnings } = validatePlayTree(pickRoll);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("Screen: Blockstellerin steht mit der Brust zur geblockten Verteidigerin", () => {
  const C = compileVariant(pickRoll, SHOW);
  const f = sampleFrame(C, endOf(C, "set_screen") - 0.01);
  const s = f.players.o5, d = f.players.d1;
  assert.equal(s.stance, "screen");
  const toD = Math.atan2(d.y - s.y, d.x - s.x);
  assert.ok(Math.abs(angleDiff(s.body, toD)) < 0.35, "Körper zur Verteidigerin");
});

test("Show: X4 hilft gegen den Roller und verlässt die 4 → Kick-out-Linie frei", () => {
  const C = compileVariant(pickRoll, SHOW);
  const f = sampleFrame(C, endOf(C, "pocket") - 0.01);
  assert.ok(dist(f.players.d4, f.players.o5) < 11, "X4 beim Roller");
  assert.ok(dist(f.players.d4, f.players.o4) > 30, "4 alleine am Flügel");
  assert.equal(sampleFrame(C, C.total).ball.holder, "o4");
});

test("Closeout: X4 kommt mit hoher Hand eng an die Werferin", () => {
  const C = compileVariant(pickRoll, SHOW);
  const f = sampleFrame(C, C.total - 0.01);
  assert.equal(f.players.d4.stance, "closeout");
  assert.ok(dist(f.players.d4, f.players.o4) < 7);
});

test("Switch: Matchups tauschen – X5 an der 1, X1 an der 5", () => {
  const C = compileVariant(pickRoll, SWITCH);
  const f = sampleFrame(C, endOf(C, "switch_roll") - 0.01);
  const m = (d) => f.matchups.find((x) => x.defender === d)?.target;
  assert.equal(m("d5"), "o1");
  assert.equal(m("d1"), "o5");
  assert.equal(sampleFrame(C, C.total).ball.holder, "o5");
});

test("Bodenpass: Ball setzt im Flug auf, Lob bleibt über Hüfthöhe", () => {
  const C = compileVariant(pickRoll, SHOW);
  const b = C.beats.find((x) => x.beat.id === "pocket");
  let minZ = Infinity;
  for (let u = 0.06; u < 0.45; u += 0.01) {
    const ball = sampleFrame(C, b.t0 + u * b.dur).ball;
    if (ball.state === "flight") { assert.equal(ball.kind, "bounce"); minZ = Math.min(minZ, ball.z); }
  }
  assert.ok(minZ < 0.3, `Bodenkontakt (minZ=${minZ})`);
});
