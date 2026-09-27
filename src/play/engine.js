/* Play-Engine
 *
 * Deterministische, zustandslose Auswertung eines Plays zu jedem Zeitpunkt t.
 * Dadurch funktionieren Abspielen, Schritt-Navigation und Scrubbing identisch.
 *
 * Auswertungsreihenfolge innerhalb eines Beats (lokale Zeit u ∈ [0,1]):
 *   1. Ballphase (gehalten / im Flug / Dribbling) – nur aus Pass-Aktionen
 *   2. Positionen: Wege (path) und Beziehungen (relation) werden rekursiv
 *      aufgelöst. Beziehungen zeigen nur auf Offense → keine Zyklen.
 *   3. Ausrichtung: Körper (Bewegung/Gegnerin) und Blick (Ball/Ziel), zeitlich
 *      geglättet über ein kurzes Rückblickfenster → natürliches Aufdrehen.
 *   4. Abgeleitete Taktik: Traps, Passwege, Presslinien, Matchups.
 */

import { ACTIONS, actionWindow } from "./actions.js";
import { PROFILES, clamp01 } from "./easing.js";
import { buildPath, pointOnPath } from "./path.js";
import { validatePlay, holderTimeline, passesOf, beatIndexById, teamOf } from "./model.js";
import {
  add, sub, scale, norm, lerp, dist, len, angleOf, fromAngle, angleDiff,
  clampAngleAround, distToSegment,
} from "./vec.js";

const EPS = 1e-6;
const COURT_W = 150;
const HOOP_OFFSET = 15.75;

const VEL_DT = 0.05;                 // s, Zeitabstand für Geschwindigkeit
const FACE_LOOKBACK = [0, 0.05, 0.1, 0.16, 0.23, 0.3];
const FACE_WEIGHTS = [1, 0.85, 0.7, 0.5, 0.35, 0.2];
const TRAIL_STEPS = 8;
const TRAIL_DT = 0.07;

export const TRAP_RADIUS = 11;
const LANE_IGNORE_RADIUS = 12;       // Einheiten um die Passgeberin
const LANE_MAX_LENGTH = 100;         // > 10 m gegen Presse: riskanter langer Pass
const HAND_RADIUS = 5.2;

/* ------------------------------------------------------------------ */
/* Kompilieren                                                          */
/* ------------------------------------------------------------------ */

export function compilePlay(play) {
  const { errors, warnings } = validatePlay(play);
  if (errors.length) throw new Error(`Play "${play.id}" ungültig:\n- ${errors.join("\n- ")}`);

  const courtH = play.court === "half" ? 140 : 280;
  const attackUp = (play.attack ?? "up") === "up";
  const C = {
    play, warnings, courtH,
    ids: play.entities.map((e) => e.id),
    entity: Object.fromEntries(play.entities.map((e) => [e.id, e])),
    attackDir: { x: 0, y: attackUp ? -1 : 1 },
    // Korb, den die Offense angreift (= den die Defense verteidigt)
    hoop: { x: COURT_W / 2, y: attackUp ? HOOP_OFFSET : courtH - HOOP_OFFSET },
    beats: [],
    total: 0,
  };

  const holders = holderTimeline(play);
  let startPos = structuredClone(play.start.positions);
  let t = 0;
  play.beats.forEach((beat, index) => {
    const dur = beat.duration / 1000;
    const byPlayer = new Map();
    for (const a of beat.actions) {
      if (a.type === "pass" || a.type === "handoff") continue;
      for (const pid of a.players ?? [a.player]) {
        if (!byPlayer.has(pid)) byPlayer.set(pid, []);
        byPlayer.get(pid).push(a);
      }
    }
    for (const list of byPlayer.values()) list.sort((a, b) => actionWindow(a).start - actionWindow(b).start);
    const b = {
      index, beat, t0: t, t1: t + dur, dur,
      startPos, startHolder: holders[index], endHolder: holders[index + 1],
      byPlayer, passes: passesOf(beat),
      cache: new Map(), // unveränderliche Daten je Aktion (Pfade, Trap-Zuordnung)
    };
    C.beats.push(b);
    const ev = beatEvaluator(C, b);
    startPos = Object.fromEntries(C.ids.map((id) => [id, ev.posAt(id, 1)]));
    b.endPos = startPos;
    t += dur;
  });
  C.total = t;

  C.lines = (play.lines ?? []).map((l) => {
    const anchor = C.beats[beatIndexById(play, l.anchorBeat)];
    const ys = l.members.map((m) => anchor.endPos[m].y);
    return {
      ...l,
      y: ys.reduce((s, y) => s + y, 0) / ys.length,
      fromIdx: l.fromBeat != null ? beatIndexById(play, l.fromBeat) : 0,
      toIdx: l.toBeat != null ? beatIndexById(play, l.toBeat) : Infinity,
    };
  });
  return C;
}

/* ------------------------------------------------------------------ */
/* Beat-Auswertung                                                      */
/* ------------------------------------------------------------------ */

function beatEvaluator(C, b) {
  const memo = new Map();
  const visiting = new Set();

  const local = (a, u) => {
    const { start, end } = actionWindow(a);
    return clamp01((u - start) / (end - start));
  };
  const profileOf = (a) => PROFILES[a.profile ?? ACTIONS[a.type]?.profile ?? "move"] ?? PROFILES.move;

  /** Index der Aktion, die bei u die Spielerin steuert (aktiv oder zuletzt beendet) */
  function actionIndexAt(id, u) {
    const acts = b.byPlayer.get(id);
    if (!acts) return -1;
    let k = -1;
    for (let i = 0; i < acts.length; i++) if (actionWindow(acts[i]).start <= u + EPS) k = i;
    return k;
  }

  function posAt(id, u) {
    const k = actionIndexAt(id, u);
    return k < 0 ? b.startPos[id] : evalAction(id, k, u);
  }

  function evalAction(id, k, u) {
    const key = `${id}#${k}@${u}`;
    if (memo.has(key)) return memo.get(key);
    if (visiting.has(key)) return b.startPos[id]; // Schutz gegen zyklische Beziehungen
    visiting.add(key);

    const acts = b.byPlayer.get(id);
    const a = acts[k];
    const def = ACTIONS[a.type];
    const { start } = actionWindow(a);
    const from = k === 0 ? b.startPos[id] : evalAction(id, k - 1, start);
    const s = profileOf(a)(local(a, u));

    let p;
    if (!def?.implemented || def.kind === "static") {
      p = from;
    } else if (def.kind === "path") {
      const ck = `path:${id}#${k}`;
      if (!b.cache.has(ck)) b.cache.set(ck, buildPath([from, ...(a.via ?? []), a.to], a.type !== "cut"));
      p = pointOnPath(b.cache.get(ck), s);
    } else if (def.kind === "relation") {
      p = lerp(from, relationAnchor(a, id, u), s);
    } else {
      p = from;
    }
    visiting.delete(key);
    memo.set(key, p);
    return p;
  }

  function relationAnchor(a, id, u) {
    const T = posAt(a.target, u);
    const H = C.hoop;
    switch (a.type) {
      case "guard":
        return add(T, scale(norm(sub(H, T)), a.distance ?? 8));
      case "deny": {
        const B = ballGround(u);
        return add(add(T, scale(norm(sub(B, T)), a.distance ?? 9)), scale(norm(sub(H, T)), 1.5));
      }
      case "help": {
        const B = ballGround(u);
        const p = lerp(T, B, a.ratio ?? 0.4);
        return add(p, scale(norm(sub(H, p)), a.drop ?? 8));
      }
      case "trap": {
        const slot = trapAssignment(a)[a.players.indexOf(id)];
        return trapSlots(C, T, a.distance ?? TRAP_RADIUS)[slot];
      }
      default:
        return T;
    }
  }

  /** Welche Trapperin nimmt welchen Slot? Kürzeste Gesamtwege ab Aktionsbeginn. */
  function trapAssignment(a) {
    const ck = a;
    if (b.cache.has(ck)) return b.cache.get(ck);
    const { start } = actionWindow(a);
    const [p1, p2] = a.players.map((pid) => fromPosition(pid, a));
    const [s1, s2] = trapSlots(C, posAt(a.target, start), a.distance ?? TRAP_RADIUS);
    const straight = dist(p1, s1) + dist(p2, s2);
    const crossed = dist(p1, s2) + dist(p2, s1);
    const res = straight <= crossed ? [0, 1] : [1, 0];
    b.cache.set(ck, res);
    return res;
  }

  function fromPosition(id, a) {
    const acts = b.byPlayer.get(id);
    const k = acts.indexOf(a);
    return k <= 0 ? b.startPos[id] : evalAction(id, k - 1, actionWindow(a).start);
  }

  /** Ballphase bei u: gehalten, im Flug oder im Dribbling */
  function ballPhase(u) {
    let holder = b.startHolder;
    for (const p of b.passes) {
      const { start, end } = actionWindow(p);
      if (u < start) break;
      if (u < end) return { state: "flight", pass: p, start, end, s: PROFILES.pass((u - start) / (end - start)) };
      holder = p.to;
    }
    if (!holder) return { state: "loose" };
    const k = actionIndexAt(holder, u);
    const a = k >= 0 ? b.byPlayer.get(holder)[k] : null;
    if (a?.type === "dribble" && u <= actionWindow(a).end + EPS) return { state: "dribble", holder, action: a };
    return { state: "held", holder };
  }

  /** Ballposition am Boden – Referenz für Beziehungen und Blickrichtung */
  function ballGround(u) {
    const ph = ballPhase(u);
    if (ph.state === "flight") return lerp(posAt(ph.pass.from, ph.start), posAt(ph.pass.to, ph.end), ph.s);
    if (ph.holder) return posAt(ph.holder, u);
    return { x: COURT_W / 2, y: C.courtH / 2 };
  }

  /** Aktion, die bei u für die Spielerin maßgeblich ist */
  function actionAt(id, u) {
    const k = actionIndexAt(id, u);
    return k < 0 ? null : b.byPlayer.get(id)[k];
  }

  return { posAt, ballPhase, ballGround, actionAt, local, profileOf };
}

/** Zwei Trap-Slots um die Ballführerin: einer nimmt den Weg nach vorne,
 *  einer die Mitte. Offen bleiben nur Seitenlinie und Rücken. */
export function trapSlots(C, T, R = TRAP_RADIUS) {
  const A = C.attackDir;
  const M = { x: T.x <= COURT_W / 2 ? 1 : -1, y: 0 };
  const ahead = norm(add(A, scale(M, 0.55)));
  const middle = norm(sub(M, scale(A, 0.5)));
  return [add(T, scale(ahead, R)), add(T, scale(middle, R))];
}

/* ------------------------------------------------------------------ */
/* Sampling über die Gesamtzeit                                        */
/* ------------------------------------------------------------------ */

/** Beat zum Zeitpunkt t. Intervalle sind (t0, t1]: an einer Beat-Grenze wird der
 *  gerade beendete Beat gezeigt ("Zustand nach Beat N") – passend zur Schritt-Navigation. */
export function beatIndexAt(C, t) {
  if (t <= 0) return 0;
  for (const b of C.beats) if (t <= b.t1 + EPS) return b.index;
  return C.beats.length - 1;
}

/** Sampler mit Evaluator-Cache für die Dauer einer Frame-Berechnung */
function makeSampler(C) {
  const evals = new Map();
  const at = (t) => {
    t = Math.max(0, Math.min(C.total, t));
    const i = beatIndexAt(C, t);
    const b = C.beats[i];
    if (!evals.has(i)) evals.set(i, beatEvaluator(C, b));
    return { b, ev: evals.get(i), u: clamp01((t - b.t0) / b.dur), t };
  };
  const pos = (id, t) => { const s = at(t); return s.ev.posAt(id, s.u); };

  function velocity(id, t) {
    const t0 = t - VEL_DT >= 0 ? t - VEL_DT : t;
    const t1 = t0 === t ? Math.min(C.total, t + VEL_DT) : t;
    if (t1 - t0 < EPS) return { x: 0, y: 0 };
    return scale(sub(pos(id, t1), pos(id, t0)), 1 / (t1 - t0));
  }

  function resolveFace(face, id, s, p) {
    if (face == null) return null;
    if (typeof face === "number") return add(p, fromAngle((face * Math.PI) / 180, 20));
    if (typeof face === "object") return face;
    if (face === "ball") return s.ev.ballGround(s.u);
    if (face === "basket") return C.hoop;
    if (face === "upcourt") return add(p, scale(C.attackDir, 40));
    if (face === "downcourt") return add(p, scale(C.attackDir, -40));
    if (C.entity[face]) return s.ev.posAt(face, s.u);
    return null;
  }

  /** Ungeglättete Ausrichtung: { body, gaze } in Radiant */
  function rawFacing(id, t) {
    const s = at(t);
    const p = s.ev.posAt(id, s.u);
    const v = velocity(id, s.t);
    const speed = len(v);
    const a = s.ev.actionAt(id, s.u);
    const team = C.entity[id].team;
    const ph = s.ev.ballPhase(s.u);
    const hasBall = (ph.state === "held" || ph.state === "dribble") && ph.holder === id;

    let gazeP = resolveFace(a?.face, id, s, p);
    let bodyLocked = false;
    if (!gazeP) {
      if (team === "offense") {
        if (hasBall) {
          const next = s.b.passes.find((q) => q.from === id && actionWindow(q).start >= s.u - EPS);
          gazeP = next ? s.ev.posAt(next.to, actionWindow(next).end) : add(p, scale(C.attackDir, 40));
        } else {
          gazeP = s.ev.ballGround(s.u);
        }
      } else if (a && ACTIONS[a.type]?.kind === "relation" && ACTIONS[a.type].implemented) {
        bodyLocked = true; // defensive Beinarbeit: Körper bleibt zur Gegenspielerin
        gazeP = a.type === "guard" || a.type === "trap" ? s.ev.posAt(a.target, s.u) : s.ev.ballGround(s.u);
      } else {
        gazeP = s.ev.ballGround(s.u);
      }
    }

    const toGaze = sub(gazeP, p);
    let gaze = len(toGaze) > 0.5 ? angleOf(toGaze) : angleOf(C.attackDir);
    let body = gaze;
    if (bodyLocked && a) {
      const tp = s.ev.posAt(a.target, s.u);
      if (dist(tp, p) > 0.5) body = angleOf(sub(tp, p));
    } else if (speed > 12) {
      const w = clamp01((speed - 12) / 25);
      body = gaze + angleDiff(gaze, angleOf(v)) * w;
    }
    gaze = clampAngleAround(body, gaze, 1.9);
    return { body, gaze };
  }

  function facing(id, t) {
    let bx = 0, by = 0, gx = 0, gy = 0;
    FACE_LOOKBACK.forEach((dt, i) => {
      const f = rawFacing(id, Math.max(0, t - dt));
      const w = FACE_WEIGHTS[i];
      bx += Math.cos(f.body) * w; by += Math.sin(f.body) * w;
      gx += Math.cos(f.gaze) * w; gy += Math.sin(f.gaze) * w;
    });
    return { body: Math.atan2(by, bx), gaze: Math.atan2(gy, gx) };
  }

  const handPos = (id, t, f = facing(id, t)) => add(pos(id, t), fromAngle(f.body + 0.4, HAND_RADIUS));

  return { at, pos, velocity, facing, handPos };
}

/* ------------------------------------------------------------------ */
/* Frame                                                                */
/* ------------------------------------------------------------------ */

/**
 * Vollständiger, renderfertiger Zustand zum Zeitpunkt t (Sekunden).
 */
export function sampleFrame(C, t) {
  const S = makeSampler(C);
  const s = S.at(t);
  const { b, ev, u } = s;
  t = s.t;
  const beat = b.beat;
  const ph = ev.ballPhase(u);
  const ballG = ev.ballGround(u);

  /* ---- Traps (aus aktiven Trap-Aktionen, Stärke aus Geometrie) ---- */
  const traps = [];
  for (const a of beat.actions) {
    if (a.type !== "trap" || u < actionWindow(a).start - EPS) continue;
    const T = ev.posAt(a.target, u);
    const ps = a.players.map((pid) => ev.posAt(pid, u));
    const avg = ps.reduce((sum, p) => sum + dist(p, T), 0) / ps.length;
    // Ein Trap existiert nur, solange die Gedoppelte den Ball kontrolliert
    const ballFactor = ph.holder === a.target ? 1 : ph.state === "flight" && ph.pass.from === a.target ? 1 - ph.s : 0;
    const strength = clamp01(1 - (avg - TRAP_RADIUS) / 22) * ballFactor;
    if (strength > 0.02) traps.push({ target: a.target, players: a.players, strength, targetPos: T, playerPos: ps });
  }
  const trappedBy = new Map();
  for (const tr of traps) for (const pid of tr.players) trappedBy.set(pid, tr);

  /* ---- Spielerinnen ---- */
  const players = {};
  for (const id of C.ids) {
    const p = ev.posAt(id, u);
    const v = S.velocity(id, t);
    const f = S.facing(id, t);
    const a = ev.actionAt(id, u);
    const e = C.entity[id];
    const hasBall = (ph.state === "held" || ph.state === "dribble") && ph.holder === id;

    let stance = "normal";
    if (trappedBy.has(id) && trappedBy.get(id).strength > 0.35) stance = "trap";
    else if (a?.type === "guard" && (ph.holder === a.target || ph.pass?.from === a.target)) {
      const tp = ev.posAt(a.target, u);
      stance = tp.y > C.courtH || tp.y < 0 ? "arms-up" : "on-ball";
    } else if (a?.type === "deny") stance = "deny";
    else if (a?.type === "screen" && ev.local(a, u) > 0.75) stance = "screen";

    const trail = [];
    if (len(v) > 8) for (let i = 0; i <= TRAIL_STEPS; i++) trail.push(S.pos(id, t - i * TRAIL_DT));

    players[id] = {
      id, team: e.team, label: e.label ?? id,
      x: p.x, y: p.y, vx: v.x, vy: v.y, speed: len(v),
      body: f.body, gaze: f.gaze,
      action: a && u <= actionWindow(a).end + EPS ? a.type : null,
      stance, hasBall,
      trapped: traps.some((tr) => tr.target === id && tr.strength > 0.35),
      trail,
      screenAngle: stance === "screen" ? (a.angle != null ? (a.angle * Math.PI) / 180 : f.body) : null,
    };
  }

  /* ---- Ball ---- */
  let ball;
  if (ph.state === "flight") {
    const tStart = b.t0 + ph.start * b.dur;
    const tEnd = b.t0 + ph.end * b.dur;
    const from = S.handPos(ph.pass.from, tStart);
    const recv = S.pos(ph.pass.to, tEnd);
    const to = add(recv, scale(norm(sub(S.pos(ph.pass.from, tStart), recv)), 4.5));
    const ground = lerp(from, to, ph.s);
    const d = dist(from, to);
    const arc = ph.pass.lob ? 13 : Math.min(6, d * 0.06);
    ball = {
      state: "flight", x: ground.x, y: ground.y,
      z: 3.5 + arc * 4 * ph.s * (1 - ph.s),
      from: ph.pass.from, to: ph.pass.to, fromPos: from, toPos: to, progress: ph.s, lob: !!ph.pass.lob,
    };
  } else if (ph.state === "dribble") {
    const pl = players[ph.holder];
    const hand = add(pl, fromAngle(pl.body + 0.9, 5.6));
    const bounce = Math.abs(Math.sin(Math.PI * t * 2.8));
    ball = { state: "dribble", holder: ph.holder, x: hand.x, y: hand.y, z: 0.5 + 4.5 * bounce };
  } else if (ph.state === "held") {
    const pl = players[ph.holder];
    // Im Trap: Ball hoch und nah am Körper schützen
    // Im Trap: Ball hoch neben dem Kopf, weg von den Händen der Trapperinnen
    const hand = pl.trapped ? add(pl, fromAngle(pl.body + 1.9, 4.6)) : add(pl, fromAngle(pl.body + 0.4, HAND_RADIUS));
    ball = { state: "held", holder: ph.holder, x: hand.x, y: hand.y, z: pl.trapped ? 6 : 3.5, protected: pl.trapped };
  } else {
    ball = { state: "loose", x: ballG.x, y: ballG.y, z: 0 };
  }

  /* ---- Passwege ---- */
  const lanes = [];
  if (beat.showLanes && ph.state === "held") {
    const holder = ph.holder;
    const team = C.entity[holder].team;
    const hp = players[holder];
    const opp = C.ids.filter((id) => C.entity[id].team !== team).map((id) => players[id]);
    // Verteidigerinnen direkt an der Passgeberin (Trap, On-Ball) werden über-/umspielt –
    // entscheidend ist, ob die Passlinie dahinter frei ist.
    const lineDefs = opp.filter((o) => dist(o, hp) > LANE_IGNORE_RADIUS);
    for (const id of C.ids) {
      if (id === holder || C.entity[id].team !== team) continue;
      const mp = players[id];
      const length = dist(hp, mp);
      const clearance = lineDefs.length ? Math.min(...lineDefs.map((o) => distToSegment(o, hp, mp))) : Infinity;
      const marked = Math.min(...opp.map((o) => dist(o, mp)));
      const status = clearance <= 8 || marked <= 10 ? "closed" : length > LANE_MAX_LENGTH ? "long" : "open";
      lanes.push({ from: holder, to: id, clearance, marked, length, status, open: status === "open" });
    }
  }

  /* ---- Linien (z. B. 1. Presslinie) ---- */
  const lines = C.lines
    .filter((l) => b.index >= l.fromIdx && b.index <= l.toIdx)
    .map((l) => ({
      id: l.id, label: l.label, y: l.y,
      beaten: C.attackDir.y < 0 ? ballG.y < l.y - 3 : ballG.y > l.y + 3,
    }));

  /* ---- Matchups: wer verteidigt wen ---- */
  const matchups = [];
  for (const id of C.ids) {
    const a = ev.actionAt(id, u);
    if (!a || ACTIONS[a.type]?.kind !== "relation" || !a.target || a.type === "trap") continue;
    matchups.push({ defender: id, target: a.target, type: a.type, onBall: ph.holder === a.target });
  }

  /* ---- Fokus-Hervorhebungen ---- */
  const focus = (beat.focus ?? [])
    .filter((f) => u >= (f.from ?? 0) - EPS && u <= (f.to ?? 1) + EPS)
    .map((f) => ({ ...f, fade: clamp01((u - (f.from ?? 0)) / 0.15) }));

  return {
    t, total: C.total, beatIndex: b.index, beatProgress: u,
    beat: { id: beat.id, title: beat.title, text: beat.text },
    players, ball, traps, lanes, lines, matchups, focus,
  };
}

/* ------------------------------------------------------------------ */
/* Diagramm eines Beats (klassische Taktiknotation)                    */
/* ------------------------------------------------------------------ */

const DIAGRAM_SAMPLES = 24;

/**
 * Laufwege und Pässe eines Beats als Linien – für die Vorschau/Notation.
 * kind: "move" | "sprint" | "cut" | "dribble" | "screen" | "relation" | "pass"
 */
export function beatDiagram(C, index) {
  const b = C.beats[index];
  if (!b) return [];
  if (b.diagram) return b.diagram;
  const ev = beatEvaluator(C, b);
  const out = [];
  for (const [id, acts] of b.byPlayer) {
    const moving = acts.filter((a) => ACTIONS[a.type]?.implemented && ACTIONS[a.type].kind !== "static");
    if (!moving.length) continue;
    const u0 = actionWindow(moving[0]).start;
    const u1 = actionWindow(moving[moving.length - 1]).end;
    const pts = [];
    for (let i = 0; i <= DIAGRAM_SAMPLES; i++) pts.push(ev.posAt(id, u0 + ((u1 - u0) * i) / DIAGRAM_SAMPLES));
    let travelled = 0;
    for (let i = 1; i < pts.length; i++) travelled += dist(pts[i - 1], pts[i]);
    if (travelled < 3) continue;
    const main = moving.reduce((m, a) => (ACTIONS[a.type].kind === "path" ? a : m), moving[0]);
    const kind = ACTIONS[main.type].kind === "relation" ? "relation" : main.type;
    out.push({ kind, player: id, team: C.entity[id].team, points: pts });
  }
  for (const p of b.passes) {
    const { start, end } = actionWindow(p);
    out.push({ kind: "pass", player: p.from, to: p.to, team: teamOf(C.play, p.from), points: [ev.posAt(p.from, start), ev.posAt(p.to, end)], lob: !!p.lob });
  }
  b.diagram = out;
  return out;
}

/** Beat-Grenzen in Sekunden (für Schritt-Navigation und Timeline-Marker) */
export const beatBoundaries = (C) => [0, ...C.beats.map((b) => b.t1)];
