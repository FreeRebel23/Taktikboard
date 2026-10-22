import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newPlayFrom, addBeat, addAction, removeAction, patchAction, setRole, addDecision, flatBeats,
  duplicateBeat, removeBeat, patchDecision, targetKind,
} from "../src/studio/builderModel.js";
import { validatePlayTree, compileVariant, sampleFrame } from "../src/play/index.js";
import { DEFAULT_HALF } from "../src/legacy/presets.js";
import { pressBreak } from "../src/play/plays/pressBreak.js";

const fresh = () => newPlayFrom({ id: "my_t", court: "half", positions: DEFAULT_HALF, ball: "o1" });

test("neuer Spielzug aus der Board-Aufstellung ist sofort gültig und abspielbar", () => {
  const p = fresh();
  assert.deepEqual(validatePlayTree(p).errors, []);
  assert.equal(p.entities.length, 10);
  assert.deepEqual(p.start.positions.o2, { x: 122, y: 72 });
});

test("Trainer-Workflow: Cut + Pass + Coaching → gültig, Ball wechselt, Text wird übernommen", () => {
  let p = fresh();
  p = addAction(p, {}, 0, { type: "cut", player: "o2", to: { x: 100, y: 30 } });
  p = addAction(p, {}, 0, { type: "pass", from: "o1", to: "o2", start: 0.4, end: 0.8, kind: "bounce" });
  p = setRole(p, {}, 0, "o2", { task: "Backdoor zum Korb", cue: "X2 verweigert den Pass" });
  assert.deepEqual(validatePlayTree(p).errors, []);
  const C = compileVariant(p);
  assert.equal(sampleFrame(C, C.total).ball.holder, "o2");
  assert.equal(p.beats[0].roles.o2.cue, "X2 verweigert den Pass");
});

test("neue Aktion ersetzt die bisherige der Spielerin – 'danach' hängt sie an", () => {
  let p = fresh();
  p = addAction(p, {}, 0, { type: "move", player: "o3", to: { x: 20, y: 40 } });
  p = addAction(p, {}, 0, { type: "sprint", player: "o3", to: { x: 30, y: 20 } });
  assert.equal(p.beats[0].actions.filter((a) => a.player === "o3").length, 1);
  p = patchAction(p, {}, 0, 0, { end: 0.5 });
  p = addAction(p, {}, 0, { type: "cut", player: "o3", to: { x: 60, y: 30 } }, { after: true });
  const acts = p.beats[0].actions.filter((a) => a.player === "o3");
  assert.equal(acts.length, 2);
  assert.equal(acts[1].start, 0.5);
  assert.deepEqual(validatePlayTree(p).errors, []);
});

test("Read anlegen: zwei Optionen, beide Varianten abspielbar; Beschriftung änderbar", () => {
  let p = addDecision(fresh(), {});
  assert.equal(p.decision.options.length, 2);
  p = patchDecision(p, p.decision.id, { label: "X2 switcht" }, "b");
  assert.equal(p.decision.options[1].label, "X2 switcht");
  assert.deepEqual(validatePlayTree(p).errors, []);
  assert.equal(flatBeats(p, { [p.decision.id]: "b" }).length, 2);
});

test("Beats hinzufügen, duplizieren (ohne Pässe), löschen – letzter Beat bleibt", () => {
  let p = addAction(fresh(), {}, 0, { type: "pass", from: "o1", to: "o2", start: 0.2, end: 0.6 });
  p = duplicateBeat(p, {}, 0);
  assert.equal(p.beats.length, 2);
  assert.equal(p.beats[1].actions.filter((a) => a.type === "pass").length, 0);
  p = addBeat(p, {});
  assert.equal(new Set(p.beats.map((b) => b.id)).size, 3, "eindeutige IDs");
  p = removeBeat(p, {}, 2); p = removeBeat(p, {}, 1);
  assert.equal(removeBeat(p, {}, 0).beats.length, 1);
});

test("Bearbeiten verändert eingebaute Plays nie (Kopie)", () => {
  const before = JSON.stringify(pressBreak);
  addAction(pressBreak, {}, 0, { type: "hold", player: "o3" });
  setRole(pressBreak, {}, 0, "o3", { task: "x" });
  assert.equal(JSON.stringify(pressBreak), before);
});

test("Zielart je Aktion", () => {
  assert.equal(targetKind("cut"), "point");
  assert.equal(targetKind("deny"), "opponent");
  assert.equal(targetKind("pass"), "teammate");
  assert.equal(targetKind("trap"), "partner");
  assert.equal(targetKind("hold"), "none");
});

test("Fehler werden verständlich gemeldet statt abzustürzen (Pass ohne Ball)", () => {
  const p = addAction(fresh(), {}, 0, { type: "pass", from: "o3", to: "o2" });
  const { errors } = validatePlayTree(p);
  assert.ok(errors.some((e) => e.includes("Ball ist bei")));
});

test("Löschen einer Aktion", () => {
  let p = addAction(fresh(), {}, 0, { type: "move", player: "o4", to: { x: 100, y: 50 } });
  p = removeAction(p, {}, 0, 0);
  assert.equal(p.beats[0].actions.length, 0);
});
