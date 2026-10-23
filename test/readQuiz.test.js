import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAYS, compileVariant, sampleFrame } from "../src/play/index.js";
import { readQuizPlay, compileReadQuiz } from "../src/play/readQuiz.js";

for (const play of PLAYS) {
  if (!play.decision) continue;
  const d = play.decision;
  for (const o of d.options) {
    test(`${play.id}: Read-Quiz ${d.id}=${o.id} kompiliert, Angriff bleibt in der Reaktion stehen`, () => {
      const q = readQuizPlay(play, {}, d.id, o.id);
      const last = q.beats[q.beats.length - 1];
      const team = Object.fromEntries(play.entities.map((e) => [e.id, e.team]));
      for (const a of last.actions) {
        assert.notEqual(a.type, "pass");
        if (a.type !== "hold") for (const p of a.players ?? [a.player]) assert.equal(team[p], "defense");
      }
      assert.equal(last.focus, undefined, "keine Hinweise, die die Lösung verraten");
      assert.equal(last.roles, undefined);
      const { C, t0, t1 } = compileReadQuiz(play, {}, d.id, o.id);
      assert.ok(t1 > t0);
      // Bis zum Entscheidungszeitpunkt identisch mit dem echten Ablauf
      const real = compileVariant(play, { [d.id]: o.id });
      const a = sampleFrame(C, t0).players, b = sampleFrame(real, t0).players;
      for (const id of Object.keys(b)) {
        assert.ok(Math.hypot(a[id].x - b[id].x, a[id].y - b[id].y) < 0.01, `${id} springt beim Übergang`);
      }
      // Angreiferinnen bewegen sich in der Reaktion nicht
      const end = sampleFrame(C, t1).players;
      for (const id of Object.keys(end).filter((x) => team[x] === "offense")) {
        assert.ok(Math.hypot(end[id].x - a[id].x, end[id].y - a[id].y) < 0.5, `${id} bewegt sich im Quiz`);
      }
    });
  }
}

for (const play of PLAYS.filter((p) => p.decision)) {
  test(`${play.id}: die Reaktionen der Verteidigung unterscheiden sich je Option`, () => {
    const d = play.decision;
    const ends = d.options.map((o) => {
      const { C, t1 } = compileReadQuiz(play, {}, d.id, o.id);
      return sampleFrame(C, t1).players;
    });
    const moved = Object.keys(ends[0]).some((id) => Math.hypot(ends[0][id].x - ends[1][id].x, ends[0][id].y - ends[1][id].y) > 3);
    assert.ok(moved, "Optionen müssen am Feld unterscheidbar sein");
  });
}

test("Read-Protokoll als CSV: Semikolon, Anführungszeichen maskiert", async () => {
  const { readLogCsv } = await import("../src/store/readLog.js");
  const csv = readLogCsv([{ at: "t", play: 'Zug "A"', me: "5", read: "X3", shown: "zu", answer: "Lob; hoch", correct: true }]);
  const [head, row] = csv.split("\r\n");
  assert.equal(head, "Zeit;Spielzug;Position;Read;Gezeigt;Antwort;Richtig");
  assert.equal(row, '"t";"Zug ""A""";"5";"X3";"zu";"Lob; hoch";"ja"');
});
