import { test } from "node:test";
import assert from "node:assert/strict";
import { pressBreak } from "../src/play/plays/pressBreak.js";
import { resolveVariant, allChoicePaths, validateTree } from "../src/play/variants.js";
import { compileVariant, validatePlayTree, sampleFrame } from "../src/play/index.js";
import { dist } from "../src/play/vec.js";

const A = { x3: "x3_zu" };
const B = { x3: "x3_mitte" };

test("Press Break: Baum ist gültig, jede Variante ohne Fehler und ohne Pass-Warnungen", () => {
  const { errors, warnings } = validatePlayTree(pressBreak);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.equal(allChoicePaths(pressBreak).length, 2);
});

test("ohne Auswahl wird die erste Option gespielt, unbekannte Auswahl fällt auf die erste zurück", () => {
  assert.equal(resolveVariant(pressBreak).variant.key, "x3=x3_zu");
  assert.equal(resolveVariant(pressBreak, { x3: "gibt_es_nicht" }).variant.key, "x3=x3_zu");
  assert.equal(resolveVariant(pressBreak, B).variant.key, "x3=x3_mitte");
});

test("gemeinsamer Stamm ist in beiden Varianten identisch (gleicher Ausgangszustand)", () => {
  const CA = compileVariant(pressBreak, A), CB = compileVariant(pressBreak, B);
  const split = CA.beats[1].t1; // Ende der Ballannahme
  assert.ok(Math.abs(split - CB.beats[1].t1) < 1e-9);
  for (const t of [0, 0.7, 1.9, split - 0.01, split]) {
    const fa = sampleFrame(CA, t), fb = sampleFrame(CB, t);
    for (const id of CA.ids) assert.ok(dist(fa.players[id], fb.players[id]) < 1e-9, `${id} @${t}`);
  }
});

test("nach dem Read verzweigt die Verteidigung: X3 geht zur 4 (A) oder bleibt in der Mitte (B)", () => {
  const CA = compileVariant(pressBreak, A), CB = compileVariant(pressBreak, B);
  const endTrapA = CA.beats.find((b) => b.beat.id === "trap").t1 - 0.01;
  const endTrapB = CB.beats.find((b) => b.beat.id === "trap_b").t1 - 0.01;
  const fa = sampleFrame(CA, endTrapA), fb = sampleFrame(CB, endTrapB);
  assert.ok(dist(fa.players.d3, fa.players.o4) < 12, "A: X3 bei der 4");
  assert.ok(dist(fb.players.d3, { x: 74, y: 206 }) < 1, "B: X3 bleibt in der Mitte");
  const lane = (f, id) => f.lanes.find((l) => l.to === id).status;
  assert.equal(lane(fa, "o4"), "closed");
  assert.equal(lane(fa, "o5"), "hands");
  assert.equal(lane(fb, "o4"), "open", "B: Rückpass frei");
  assert.notEqual(lane(fb, "o5"), "open", "B: Mitte zu");
});

test("Variante B: Rückpass, Lücke angreifen, X3 muss stoppen → 5 frei, Ballweg 4 → 1 → 4 → 5", () => {
  const C = compileVariant(pressBreak, B);
  const end = (id) => C.beats.find((b) => b.beat.id === id).t1;
  assert.equal(sampleFrame(C, end("reversal")).ball.holder, "o4");
  const f = sampleFrame(C, end("attack_gap") - 0.01);
  assert.ok(dist(f.players.d3, f.players.o4) < 12, "X3 stoppt den Ball");
  assert.equal(f.lanes.length, 0); // Passwege nur in Beats mit showLanes – Analyse separat geprüft
  assert.equal(sampleFrame(C, C.total).ball.holder, "o5");
  const line = sampleFrame(C, C.total).lines.find((l) => l.id === "press1_b");
  assert.ok(line.beaten);
});

test("Varianten sind reproduzierbar – Wechsel und Rückwechsel liefern denselben Zustand", () => {
  const a1 = sampleFrame(compileVariant(pressBreak, B), 6.2);
  sampleFrame(compileVariant(pressBreak, A), 6.2);
  const a2 = sampleFrame(compileVariant(pressBreak, B), 6.2);
  assert.deepEqual(a1, a2);
});

test("Baumprüfung: doppelte Beat-IDs und Entscheidungen mit nur einer Option werden erkannt", () => {
  const bad = {
    beats: [{ id: "a" }],
    decision: { id: "d", options: [{ id: "x", beats: [{ id: "a" }] }] },
  };
  const errors = validateTree(bad);
  assert.ok(errors.some((e) => e.includes("doppelt")));
  assert.ok(errors.some((e) => e.includes("mindestens zwei")));
});

test("Coaching-Rollen: unbekannte Spielerin wird als Fehler gemeldet", () => {
  const lin = resolveVariant(pressBreak, A);
  lin.beats[0] = { ...lin.beats[0], roles: { o9: { task: "x" } } };
  assert.throws(() => compileVariant({ ...lin, decision: undefined }), /unbekannte Spielerin "o9"/);
});
