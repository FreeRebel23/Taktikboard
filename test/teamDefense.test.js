import { test } from "node:test";
import assert from "node:assert/strict";
import { compilePlay, sampleFrame } from "../src/play/engine.js";
import { validatePlayTree } from "../src/play/index.js";
import { stateSequence, rulesFor, DEFAULT_RULES, zoneGeometry } from "../src/play/teamDefense.js";
import { manHelp } from "../src/play/plays/manHelp.js";
import { zone23 } from "../src/play/plays/zone23.js";

const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const states = (C, beat, id) => stateSequence(C.beats[beat].cache.get("sim"), id).map((r) => r.state);
const withRules = (play, rules) => ({ ...structuredClone(play), defense: { ...play.defense, rules } });
const endOf = (C, beat) => sampleFrame(C, C.beats[beat].t1).players;

test("Referenzfälle sind gültig und ohne Warnungen", () => {
  for (const p of [manHelp, zone23]) assert.deepEqual(validatePlayTree(p), { errors: [], warnings: [] }, p.id);
});

test("Mann-Mann: Ball oben → Druck, Deny eine Passlänge entfernt, Help-Seite tief", () => {
  const C = compilePlay(manHelp);
  const f = endOf(C, 0);
  assert.equal(f.d1.defense.state, "ball");
  assert.equal(f.d2.defense.state, "deny");
  assert.equal(f.d3.defense.state, "deny");
  assert.equal(f.d4.defense.state, "helpside");
  assert.equal(f.d5.defense.state, "helpside");
  // Grundregel: immer näher am Korb als die eigene Gegenspielerin
  for (const [def, att] of [["d1", "o1"], ["d2", "o2"], ["d3", "o3"], ["d4", "o4"], ["d5", "o5"]]) {
    assert.ok(d(f[def], C.hoop) < d(f[att], C.hoop), `${def} steht zwischen ${att} und Korb`);
  }
  // Help-Seite sinkt Richtung Ball/Korb ab: deutlich weiter weg von der Gegenspielerin als Deny
  assert.ok(d(f.d4, f.o4) > d(f.d2, f.o2) + 10);
});

test("Mit dem Pass bewegen sich alle fünf – schon bevor der Ball gefangen ist", () => {
  const C = compilePlay(manHelp);
  const b = C.beats[1];
  const pass = b.beat.actions.find((a) => a.type === "pass");
  const tRelease = b.t0 + pass.start * b.dur, tCatch = b.t0 + pass.end * b.dur;
  const f0 = sampleFrame(C, tRelease).players, f1 = sampleFrame(C, tCatch).players;
  for (const id of ["d1", "d2", "d3", "d4", "d5"]) assert.ok(d(f0[id], f1[id]) > 2, `${id} bewegt sich während des Passes`);
});

test("Help & Recover entstehen aus den Regeln: Helferin, danach Recover/Closeout", () => {
  const C = compilePlay(manHelp);
  assert.ok(states(C, 2, "d5").includes("help"), "X5 hilft beim Drive");
  const after = states(C, 3, "d5");
  assert.ok(after.includes("recover") && after.includes("closeout"), `Recover und Closeout: ${after}`);
  assert.ok(states(C, 4, "d3").includes("closeout"), "X3 Closeout nach dem Pass über Kopf");
});

test("Regeln der Trainerin ändern das Verhalten der ganzen Mannschaft", () => {
  const gap = compilePlay(withRules(manHelp, { ...manHelp.defense.rules, ballSide: { mode: "gap" } }));
  const fGap = endOf(gap, 0), fDeny = endOf(compilePlay(manHelp), 0);
  assert.equal(fGap.d2.defense.state, "gap");
  assert.ok(d(fGap.d2, fGap.o2) > d(fDeny.d2, fDeny.o2), "Lücke steht weiter weg als Deny");
  const noHelp = compilePlay(withRules(manHelp, { ...manHelp.defense.rules, help: { enabled: false } }));
  assert.ok(!states(noHelp, 2, "d5").includes("help"), "ohne Help-Regel hilft niemand");
  const rot = compilePlay(withRules(manHelp, { ...manHelp.defense.rules, help: { enabled: true, rotate: true } }));
  assert.ok(["d1", "d2", "d3", "d4"].some((id) => states(rot, 2, id).includes("rotate")), "mit Rotation rotiert eine Mitspielerin");
});

test("Regeln: Voreinstellung ← Spielzug ← Beat", () => {
  const r = rulesFor({ defense: { rules: { onBall: { distance: 4 } } } }, { defenseRules: { help: { who: "low" } } });
  assert.equal(r.onBall.distance, 4);
  assert.equal(r.onBall.farDistance, DEFAULT_RULES.onBall.farDistance);
  assert.equal(r.help.who, "low");
  assert.equal(r.help.radius, DEFAULT_RULES.help.radius);
});

test("Verteidigung bewegt sich mit begrenzter Geschwindigkeit (keine Sprünge, auch über Beat-Grenzen)", () => {
  for (const play of [manHelp, zone23]) {
    const C = compilePlay(play);
    const vmax = C.beats[0].rules.speed.sprint * 1.05 + 1;
    const dt = 1 / 30;
    let prev = sampleFrame(C, 0).players;
    for (let t = dt; t <= C.total; t += dt) {
      const cur = sampleFrame(C, t).players;
      for (const id of ["d1", "d2", "d3", "d4", "d5"]) {
        if (!cur[id].defense && !prev[id].defense) continue;
        assert.ok(d(cur[id], prev[id]) / dt <= vmax, `${play.id} ${id} bei t=${t.toFixed(2)}: ${(d(cur[id], prev[id]) / dt).toFixed(0)} > ${vmax}`);
      }
      prev = cur;
    }
  }
});

test("Deterministisch: gleicher Spielzug → gleiche Verteidigung", () => {
  const a = sampleFrame(compilePlay(zone23), 7.3).players, b = sampleFrame(compilePlay(zone23), 7.3).players;
  for (const id of Object.keys(a)) assert.equal(d(a[id], b[id]), 0);
});

test("Zone: Ballführerin hat genau eine Verteidigerin am Ball; Übergabe beim Cut; Druck nach Pass", () => {
  const C = compilePlay(zone23);
  for (let t = 0.3; t < C.total; t += 0.25) {
    const f = sampleFrame(C, t);
    const holder = f.ball.holder;
    if (!holder) continue;
    const onBall = Object.values(f.players).filter((p) => p.defense && ["ball", "closeout"].includes(p.defense.state) && p.defense.resp === holder);
    assert.equal(onBall.length, 1, `t=${t.toFixed(2)}: genau eine am Ball`);
  }
  const cut = C.beats[3].cache.get("sim");
  assert.ok(cut.handovers.some((h) => h.attacker === "o5" && h.from === "d4" && h.to === "d5"), "5 wird von X4 an X5 übergeben");
  assert.ok(states(C, 2, "d3").includes("ball"), "Ecke: X3 macht Druck");
  assert.ok(states(C, 4, "d2").includes("closeout"), "Ballverlagerung: X2 Closeout");
});

test("Zone: Übergaben erscheinen im Frame und verschwinden wieder", () => {
  const C = compilePlay(zone23);
  const b = C.beats[3];
  const h = b.cache.get("sim").handovers[0];
  const tH = b.t0 + h.u * b.dur;
  assert.ok(sampleFrame(C, tH + 0.2).handovers.length > 0);
  assert.equal(sampleFrame(C, tH + 2).handovers.filter((x) => x.attacker === h.attacker && x.u === h.u).length, 0);
  assert.equal(sampleFrame(C, tH + 0.2).zones.length, 5);
});

test("Zone wird bei Angriff nach unten gespiegelt", () => {
  const C = compilePlay({ ...zone23, attack: "down" });
  const g = zoneGeometry(C, "mid");
  assert.equal(g.home.y, C.courtH - zone23.defense.zones.mid.home.y);
  assert.ok(g.area.y0 < g.area.y1);
});

test("System-Verteidigung läuft im nächsten Beat weiter; Validierung prüft Ziel und Raum", () => {
  const C = compilePlay(manHelp);
  assert.ok(C.beats[1].byPlayer.get("d1")[0].carried, "X1 behält Mann-Mann ohne neue Aktion");
  const bad = structuredClone(zone23);
  bad.beats[0].actions[0] = { type: "zone", player: "d1", zone: "gibtsnicht" };
  assert.ok(validatePlayTree(bad).errors.some((e) => e.includes("gibtsnicht")));
  const bad2 = structuredClone(manHelp);
  bad2.beats[0].actions[0] = { type: "man", player: "d1", target: "d2" };
  assert.ok(validatePlayTree(bad2).errors.some((e) => e.includes("Angreiferin")));
});
