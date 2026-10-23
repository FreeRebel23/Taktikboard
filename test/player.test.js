import { test } from "node:test";
import assert from "node:assert/strict";
import { pressBreak } from "../src/play/plays/pressBreak.js";
import { pickRoll } from "../src/play/plays/pickRoll.js";
import { compileVariant } from "../src/play/index.js";
import { describeRole, myMoments, zoneName } from "../src/play/describe.js";
import { playerCamera, actionCamera, relatedIds, boxToViewBox } from "../src/play/camera.js";
import { sampleFrame } from "../src/play/engine.js";

const B = compileVariant(pressBreak, { x3: "x3_mitte" });
const idx = (C, id) => C.beats.findIndex((b) => b.beat.id === id);

test("Trainer-Coaching hat Vorrang vor der automatischen Beschreibung", () => {
  const r = describeRole(B, idx(B, "trap_b"), "o4");
  assert.equal(r.auto.task, false);
  assert.match(r.task, /Hinter den Ball/);
  assert.equal(r.stance, "open");
  assert.ok(r.stanceText.startsWith("Offen"));
});

test("ohne Trainer-Text: Aufgabe aus den Aktionen mit Ort und Auslöser, als automatisch markiert", () => {
  const play = structuredClone(pressBreak);
  const lin = compileVariant({ ...play, decision: undefined, beats: play.beats.map((b) => ({ ...b, roles: undefined })) });
  const r = describeRole(lin, 0, "o4");
  assert.equal(r.auto.task, true);
  assert.match(r.task, /Pass zu 1 über Kopf/);
  const r1 = describeRole(lin, 0, "o1");
  assert.match(r1.task, /^Cut: rechts/);
  assert.equal(r1.cue, null, "kein erfundenes Signal");
  assert.equal(r1.why, null, "kein erfundenes Warum");
});

test("Auslöser: Bewegung nach einem Pass wird als 'nach dem Pass von …' beschrieben", () => {
  const r = describeRole(B, idx(B, "reversal"), "o5");
  const step = r.steps.find((s) => s.type === "move");
  assert.equal(step.trigger, "nach dem Pass von 1 zu 4");
});

test("Verteidigerin beobachtet automatisch ihre Gegenspielerin", () => {
  const C = compileVariant(pickRoll, { x5: "show" });
  const r = describeRole(C, idx(C, "show_roll"), "d2");
  assert.equal(r.watch, "o2");
  assert.equal(r.auto.watch, true);
});

test("Eigene Momente: Zeitpunkte, an denen die Spielerin aktiv wird", () => {
  const m = myMoments(B, "o5");
  assert.deepEqual(m.map((x) => x.type), ["move", "catch", "sprint"]);
  for (let i = 1; i < m.length; i++) assert.ok(m[i].t >= m[i - 1].t);
});

test("Zonen aus Sicht der Angreiferinnen", () => {
  const C = compileVariant(pickRoll);
  assert.equal(zoneName(C, { x: 140, y: 16 }), "rechte Ecke");
  assert.equal(zoneName(C, { x: 75, y: 40 }), "in der Zone");
  assert.equal(zoneName(C, { x: 75, y: 100 }), "Mitte, vor der Dreierlinie");
  assert.match(zoneName(B, { x: 104, y: 285 }), /rechts, nahe der eigenen Grundlinie/);
});

test("Spielerinnen-Kamera hält eigene Figur, Signal und Ball über den ganzen Beat im Bild", () => {
  const k = idx(B, "trap_b");
  const box = playerCamera(B, k, "o5");
  const b = B.beats[k];
  const inside = (p) => p.x >= box.x0 && p.x <= box.x1 && p.y >= box.y0 && p.y <= box.y1;
  for (let i = 0; i <= 10; i++) {
    const f = sampleFrame(B, b.t0 + (b.dur * i) / 10);
    assert.ok(inside(f.players.o5) && inside(f.players.d3) && inside(f.ball), `t=${i}`);
  }
  assert.ok(box.x1 - box.x0 < 150 || box.y1 - box.y0 < 280, "zoomt hinein");
  assert.ok(relatedIds(B, k, "o5").includes("d3"));
});

test("Aktions-Kamera umfasst alle bewegten Spielerinnen; viewBox füllt das Seitenverhältnis", () => {
  const box = actionCamera(B, 0);
  const full = { x: -12, y: -12, w: 174, h: 304 };
  const vb = boxToViewBox(box, { landscape: false, aspect: 0.5, full });
  assert.ok(Math.abs(vb.w / vb.h - 0.5) < 1e-6 || (vb.w === full.w && vb.h === full.h));
  assert.ok(vb.x >= full.x - 1e-6 && vb.y >= full.y - 1e-6);
});
