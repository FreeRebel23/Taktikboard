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
  assert.ok(errors.some((e) => e.includes("Ball ist zu diesem Zeitpunkt bei")));
});

test("Löschen einer Aktion", () => {
  let p = addAction(fresh(), {}, 0, { type: "move", player: "o4", to: { x: 100, y: 50 } });
  p = removeAction(p, {}, 0, 0);
  assert.equal(p.beats[0].actions.length, 0);
});

import { setTeamDefense, setDefenseRule, addPrinciple, patchPrinciple, removePrinciple, toggleBeatPrinciple } from "../src/studio/builderModel.js";
import { validatePlayTree as vTree } from "../src/play/index.js";
import { compilePlay as cPlay, sampleFrame as sFrame } from "../src/play/engine.js";
import { TEMPLATES, templatePositions } from "../src/play/templates.js";

const teamDefBase = () => {
  const t = TEMPLATES.find((x) => x.id === "five_out") ?? TEMPLATES[0];
  return newPlayFrom({ id: "my_def", court: t.court, positions: templatePositions(t), ball: t.ball });
};

test("Builder: ganze Verteidigung als Mann-Mann – jede Verteidigerin bekommt genau eine Angreiferin", () => {
  const p0 = teamDefBase();
  const p = setTeamDefense(p0, {}, 0, "man", p0.start.positions);
  const acts = p.beats[0].actions.filter((a) => a.type === "man");
  assert.equal(acts.length, 5);
  assert.equal(new Set(acts.map((a) => a.target)).size, 5);
  assert.deepEqual(vTree(p).errors, []);
  const f = sFrame(cPlay(p), 1.4);
  assert.ok(Object.values(f.players).filter((x) => x.defense).length === 5);
});

test("Builder: Zone 2-3 und 3-2 – Räume nach Nähe verteilt, Regeln änderbar", () => {
  const p0 = teamDefBase();
  for (const tpl of ["2-3", "3-2"]) {
    const p = setTeamDefense(p0, {}, 0, "zone", p0.start.positions, tpl);
    const zones = p.beats[0].actions.filter((a) => a.type === "zone").map((a) => a.zone);
    assert.equal(new Set(zones).size, 5, tpl);
    assert.equal(p.defense.template, tpl);
    assert.deepEqual(vTree(p).errors, [], tpl);
  }
  const r = setDefenseRule(p0, "help.who", "low");
  assert.equal(r.defense.rules.help.who, "low");
  assert.equal(p0.defense, undefined, "Original unverändert");
});

test("Builder: Prinzipien anlegen, Beat zuordnen, löschen entfernt auch Verweise", () => {
  let p = addPrinciple(teamDefBase());
  const id = p.principles[0].id;
  p = patchPrinciple(p, id, { title: "Ball sehen", rule: "Immer Ball und Gegnerin sehen." });
  p = toggleBeatPrinciple(p, {}, 0, id);
  assert.deepEqual(p.beats[0].principles, [id]);
  assert.deepEqual(vTree(p).warnings.filter((w) => w.includes("Prinzip")), []);
  p = removePrinciple(p, id);
  assert.deepEqual(p.beats[0].principles, []);
  assert.equal(p.principles.length, 0);
});
