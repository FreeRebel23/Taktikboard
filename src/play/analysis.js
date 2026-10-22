/* Taktische Analyse (Modell-Einschätzung, keine Vorhersage).
 *
 * Geometrische Heuristiken auf Basis der Engine-Positionen:
 *   - Passkorridore: Breite des freien Raums entlang einer Passlinie
 *   - Reichweite: Hände/Arme der Verteidigerinnen
 *   - Freiraumkarte: Wo wäre eine Mitspielerin anspielbar?
 *   - Passfenster: Wann ist welche Anspielstation offen?
 * Alle Werte sind Modellannahmen (Armreichweite 0,8 m, Deckung 1 m, max. 10 m Pass).
 */

import { passLanes, sampleFrame, LANE_REACH, LANE_NEAR_RADIUS, LANE_MAX_LENGTH } from "./engine.js";
import { dist, distToSegment } from "./vec.js";

export const MODEL_NOTE =
  "Modell-Einschätzung aus Abständen (Armreichweite 0,8 m, Deckung 1 m, Pässe bis 10 m). Keine Vorhersage des echten Spiels.";

const opponents = (C, players, team) => C.ids.filter((id) => C.entity[id].team !== team).map((id) => players[id]);

/** Passkorridore von der Ballführerin: Linie + freie Halbbreite (Court-Einheiten) */
export function corridors(C, players, holder) {
  const team = C.entity[holder].team;
  const hp = players[holder];
  const opp = opponents(C, players, team);
  return passLanes(C, players, holder).map((l) => {
    const mp = players[l.to];
    const L2 = Math.max(l.length * l.length, 1e-9);
    // Raum bis zur nächsten Hand einer Verteidigerin vor der Empfängerin
    const relevant = opp.filter((o) => ((o.x - hp.x) * (mp.x - hp.x) + (o.y - hp.y) * (mp.y - hp.y)) / L2 < 1 && dist(o, hp) > LANE_NEAR_RADIUS);
    const free = relevant.length ? Math.min(...relevant.map((o) => distToSegment(o, hp, mp))) - LANE_REACH : 14;
    return { ...l, halfWidth: Math.max(0, Math.min(14, free)) };
  });
}

/** Reichweite der Verteidigerinnen (Hände) – Mittelpunkt + Radius */
export function reachZones(C, players, team = "defense") {
  return C.ids.filter((id) => C.entity[id].team === team).map((id) => ({ id, x: players[id].x, y: players[id].y, r: LANE_REACH }));
}

/**
 * Freiraumkarte: Rasterpunkte, an denen eine Mitspielerin anspielbar wäre
 * (freie Linie vom Ball, keine Verteidigerin auf der Passseite in 1 m, Pass ≤ 10 m).
 * kind "open":  direkter Pass möglich
 * kind "hands": nur über/unter den Händen der Verteidigerinnen an der Passgeberin
 *               (Lob oder Bodenpass), dahinter frei
 * score ∈ (0,1]: je größer der Abstand zu Händen und Gegenspielerinnen, desto höher.
 */
export function freeSpace(C, players, holder, step = 6) {
  const team = C.entity[holder].team;
  const hp = players[holder];
  const opp = opponents(C, players, team);
  const out = [];
  for (let y = step / 2; y < C.courtH; y += step) {
    for (let x = step / 2; x < 150; x += step) {
      const P = { x, y };
      const L = dist(hp, P);
      if (L < 14 || L > LANE_MAX_LENGTH) continue;
      let lane = Infinity, mark = Infinity, ok = true, hands = false;
      for (const o of opp) {
        const dP = dist(o, P);
        const toPasser = { x: hp.x - P.x, y: hp.y - P.y };
        const cos = ((o.x - P.x) * toPasser.x + (o.y - P.y) * toPasser.y) / (Math.max(dP, 1e-6) * L);
        if (dP <= 5 || (cos > -0.17 && dP <= 10)) { ok = false; break; }
        if (cos > -0.17) mark = Math.min(mark, dP);
        const near = dist(o, hp) <= LANE_NEAR_RADIUS;
        const ds = distToSegment(o, hp, P);
        if (near && ds < LANE_REACH) { hands = true; continue; }
        if (!near && ds <= 8) { ok = false; break; }
        if (!near) lane = Math.min(lane, ds);
      }
      if (!ok) continue;
      const score = Math.max(0.05, Math.min(1, (lane - 8) / 14, (mark - 10) / 16));
      out.push({ x, y, score, kind: hands ? "hands" : "open" });
    }
  }
  return out;
}

/**
 * Passfenster über das ganze Play: pro Mitspielerin der Ballführerin Zeitabschnitte
 * mit Linienstatus. Grundlage für die Fenster-Zeitleiste.
 * @returns {{ step, rows: { [receiverId]: [{ t0, t1, status, holder }] } }}
 */
export function passWindows(C, step = 0.1) {
  const rows = {};
  const push = (id, t, status, holder) => {
    const list = (rows[id] ??= []);
    const last = list[list.length - 1];
    if (last && last.status === status && last.holder === holder && Math.abs(last.t1 - t) < step * 1.5) last.t1 = t + step;
    else list.push({ t0: t, t1: t + step, status, holder });
  };
  for (let t = 0; t < C.total; t += step) {
    const f = sampleFrame(C, t);
    if (f.ball.state !== "held") continue;
    for (const l of passLanes(C, f.players, f.ball.holder)) push(l.to, t, l.status, f.ball.holder);
  }
  return { step, rows };
}
