/* Mannschaftsverteidigung als System
 *
 * Zwei System-Aktionen für Verteidigerinnen:
 *   { type: "man",  player, target }  – Mann-Mann nach den Regeln der Trainerin
 *   { type: "zone", player, zone }    – Zone: Verantwortung für einen Raum
 *
 * Die Position ergibt sich NICHT aus einer festen Philosophie, sondern aus Regeln, die die
 * Trainerin pro Spielzug (play.defense.rules) und bei Bedarf pro Beat (beat.defenseRules)
 * festlegt: Abstand zur Ballführerin, Deny oder Lücke, Tiefe auf der Help-Seite, wann und
 * wer hilft, ob rotiert wird, Zonenräume und Verschieben.
 *
 * Bewegung: Je Beat wird die Verteidigung einmal beim Kompilieren simuliert – mit
 * Reaktionszeit und Höchstgeschwindigkeit. So entstehen Help, Recover, Closeout und
 * Übergaben als nachvollziehbare Bewegungen statt als Sprünge. Die Engine bleibt
 * deterministisch: gleiche Daten → gleiche Bewegung, Abfrage zu jedem Zeitpunkt t.
 *
 * Koordinaten der Zonen sind für Angriff nach oben (Korb oben, Grundlinie y = 0)
 * beschrieben und werden bei attack: "down" gespiegelt.
 */

import { add, sub, scale, norm, lerp, dist, len } from "./vec.js";

/* ------------------------------------------------------------------ */
/* Regeln (Voreinstellungen – jede Trainerin kann sie überschreiben)   */
/* ------------------------------------------------------------------ */

export const DEFAULT_RULES = {
  onBall: { distance: 6, farDistance: 10, far: 72 },
  ballSide: { mode: "deny", denyDistance: 7, gapRatio: 0.3, adjacent: 62 },
  helpSide: { ratio: 0.55, drop: 9 },
  help: { enabled: true, radius: 58, stepIn: 9, who: "nearest", rotate: false },
  zone: { shiftX: 0.35, shiftY: 0.25, offBallRatio: 0.3, drop: 4 },
  speed: { slide: 42, sprint: 66, reaction: 0.2 },
};

/** Beschreibung der Regeln für Builder und Anzeige (Einheiten: 10 cm → Anzeige in m) */
export const RULE_FIELDS = [
  { path: "onBall.distance", label: "Abstand zur Ballführerin", unit: "m", min: 3, max: 14, step: 1, systems: ["man", "zone"],
    hint: "Eng verteidigen (klein) oder Abstand halten gegen den Drive (groß)." },
  { path: "onBall.farDistance", label: "Abstand weit vom Korb", unit: "m", min: 3, max: 20, step: 1, systems: ["man"],
    hint: "Weiter als 7 m vom Korb: mehr Platz lassen oder trotzdem Druck machen." },
  { path: "ballSide.mode", label: "Eine Passlänge entfernt", options: { deny: "Deny – Passlinie zustellen", gap: "Lücke – absinken, Drive stoppen" }, systems: ["man"],
    hint: "Ballseitige Verteidigerinnen: Pass verhindern oder in der Lücke helfen." },
  { path: "ballSide.adjacent", label: "„Eine Passlänge“ bis", unit: "m", min: 4, max: 9, step: 0.5, systems: ["man"],
    hint: "Angreiferinnen näher am Ball gelten als eine Passlänge entfernt (Deny/Lücke), weiter weg als Help-Seite." },
  { path: "ballSide.denyDistance", label: "Deny: Abstand zur Gegenspielerin", unit: "m", min: 3, max: 12, step: 1, systems: ["man"] },
  { path: "helpSide.ratio", label: "Help-Seite: Weg zum Ball", unit: "%", min: 0.2, max: 0.8, step: 0.05, systems: ["man"],
    hint: "Wie weit die Help-Seite von der Gegenspielerin Richtung Ball absinkt (Ball–Gegnerin–Korb)." },
  { path: "helpSide.drop", label: "Help-Seite: Tiefe Richtung Korb", unit: "m", min: 0, max: 20, step: 1, systems: ["man"] },
  { path: "help.enabled", label: "Bei Drive helfen", options: { true: "ja", false: "nein (bei der Gegenspielerin bleiben)" }, systems: ["man"] },
  { path: "help.radius", label: "Help ab Abstand Ball–Korb", unit: "m", min: 3, max: 9, step: 0.5, systems: ["man"],
    hint: "Ist die Ballführerin vorbei und näher am Korb als das, kommt Hilfe." },
  { path: "help.who", label: "Wer hilft?", options: { nearest: "die Nächste", low: "die Tiefste der Help-Seite (Low Man)" }, systems: ["man"] },
  { path: "help.rotate", label: "Nach der Hilfe rotieren", options: { false: "nein – Helferin erholt sich (Recover)", true: "ja – Nächste übernimmt die Freie (Rotation)" }, systems: ["man"] },
  { path: "zone.shiftX", label: "Zone: seitliches Verschieben", unit: "%", min: 0, max: 0.8, step: 0.05, systems: ["zone"],
    hint: "Wie stark die Zone mit dem Ball zur Seite wandert." },
  { path: "zone.offBallRatio", label: "Zone: Spielerin im Raum zum Ball hin", unit: "%", min: 0, max: 0.6, step: 0.05, systems: ["zone"] },
  { path: "speed.reaction", label: "Reaktionszeit", unit: "s", min: 0, max: 0.6, step: 0.05, systems: ["man", "zone"] },
];

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
function merge(base, over) {
  if (!isObj(over)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}
const bool = (v) => v === true || v === "true";

/** Wirksame Regeln für einen Beat: Voreinstellung ← Spielzug ← Beat */
export function rulesFor(play, beat) {
  return merge(merge(DEFAULT_RULES, play.defense?.rules), beat?.defenseRules);
}

export const getRule = (rules, path) => path.split(".").reduce((o, k) => o?.[k], rules);
export function setRule(rules, path, value) {
  const keys = path.split(".");
  const out = structuredClone(rules ?? {});
  let o = out;
  for (const k of keys.slice(0, -1)) o = o[k] = isObj(o[k]) ? o[k] : {};
  o[keys[keys.length - 1]] = value;
  return out;
}

/* ------------------------------------------------------------------ */
/* Zonen-Vorlagen (Räume für Angriff nach oben; Halbfeld 150 × 140)    */
/* ------------------------------------------------------------------ */

export const ZONE_TEMPLATES = {
  "2-3": {
    label: "2-3-Zone",
    zones: {
      top_l: { label: "Oben links", area: { x0: 0, y0: 44, x1: 80, y1: 105 }, home: { x: 55, y: 62 } },
      top_r: { label: "Oben rechts", area: { x0: 70, y0: 44, x1: 150, y1: 105 }, home: { x: 95, y: 62 } },
      low_l: { label: "Unten links", area: { x0: 0, y0: 0, x1: 56, y1: 48 }, home: { x: 42, y: 26 } },
      mid: { label: "Mitte", area: { x0: 46, y0: 0, x1: 104, y1: 52 }, home: { x: 75, y: 24 } },
      low_r: { label: "Unten rechts", area: { x0: 94, y0: 0, x1: 150, y1: 48 }, home: { x: 108, y: 26 } },
    },
  },
  "3-2": {
    label: "3-2-Zone",
    zones: {
      top: { label: "Spitze", area: { x0: 48, y0: 56, x1: 102, y1: 110 }, home: { x: 75, y: 70 } },
      wing_l: { label: "Flügel links", area: { x0: 0, y0: 38, x1: 58, y1: 105 }, home: { x: 38, y: 58 } },
      wing_r: { label: "Flügel rechts", area: { x0: 92, y0: 38, x1: 150, y1: 105 }, home: { x: 112, y: 58 } },
      low_l: { label: "Block links", area: { x0: 0, y0: 0, x1: 75, y1: 46 }, home: { x: 56, y: 22 } },
      low_r: { label: "Block rechts", area: { x0: 75, y0: 0, x1: 150, y1: 46 }, home: { x: 94, y: 22 } },
    },
  },
};

/** Zone eines Spielzugs in Court-Koordinaten (gespiegelt bei attack: "down") */
export function zoneGeometry(C, zoneId) {
  const z = C.play.defense?.zones?.[zoneId];
  if (!z) return null;
  if ((C.play.attack ?? "up") === "up") return z;
  const H = C.courtH;
  return {
    ...z,
    area: { x0: z.area.x0, x1: z.area.x1, y0: H - z.area.y1, y1: H - z.area.y0 },
    home: { x: z.home.x, y: H - z.home.y },
  };
}

const inArea = (p, a, m = 0) => p.x >= a.x0 - m && p.x <= a.x1 + m && p.y >= a.y0 - m && p.y <= a.y1 + m;
const clampArea = (p, a) => ({ x: Math.max(a.x0, Math.min(a.x1, p.x)), y: Math.max(a.y0, Math.min(a.y1, p.y)) });

/* ------------------------------------------------------------------ */
/* Zustände (für Anzeige und Beschreibung)                             */
/* ------------------------------------------------------------------ */

export const DEFENSE_STATES = {
  ball: { label: "DRUCK", text: "verteidigt die Ballführerin" },
  deny: { label: "DENY", text: "stellt die Passlinie zu" },
  gap: { label: "LÜCKE", text: "steht in der Lücke, bereit zu helfen" },
  helpside: { label: "HELP-SEITE", text: "sinkt auf der Help-Seite ab (Ball und Gegenspielerin im Blick)" },
  help: { label: "HELP", text: "hilft gegen den Drive" },
  rotate: { label: "ROTATION", text: "rotiert zur freien Angreiferin" },
  recover: { label: "RECOVER", text: "läuft zurück zur eigenen Gegenspielerin" },
  closeout: { label: "CLOSEOUT", text: "läuft kontrolliert auf die Ballführerin heraus" },
  zone: { label: "ZONE", text: "hält ihren Raum und verschiebt mit dem Ball" },
  zoneman: { label: "IM RAUM", text: "deckt die Angreiferin in ihrem Raum" },
};

/* ------------------------------------------------------------------ */
/* Simulation eines Beats                                               */
/* ------------------------------------------------------------------ */

const SIM_DT = 1 / 40;
const GAIN = 6;               // 1/s – wie schnell die Lücke zum Ziel geschlossen wird
const RECOVER_DONE = 6;       // Einheiten: Recover/Closeout beendet

export const isSystem = (type) => type === "man" || type === "zone";

/**
 * @param ctx { C, b, rules, offense: ids, defenders: [{ id, action, startU, startPos }],
 *              posAt(id,u), ballGround(u), ballPhase(u) }
 * @returns sim { n, pos: {id: [{x,y}]}, state: {id: [key]}, resp: {id: [attackerId|null]},
 *                zoneOwner: [ {attackerId: defenderId} ], handovers: [{u, attacker, from, to}] }
 */
export function simulateDefense(ctx) {
  const { C, b, rules, offense, defenders } = ctx;
  const H = C.hoop;
  const n = Math.max(2, Math.ceil(b.dur / SIM_DT));
  const reactionU = (rules.speed.reaction ?? 0) / b.dur;
  const center = { x: 75, y: (C.play.attack ?? "up") === "up" ? 55 : C.courtH - 55 };
  const side = (p) => (Math.abs(p.x - 75) < 6 ? 0 : Math.sign(p.x - 75));
  const toHoop = (p) => norm(sub(H, p));

  const sim = { n, pos: {}, state: {}, resp: {}, zoneOwner: [], handovers: [] };
  const cur = {};
  // Zuständigkeiten laufen über Beat-Grenzen weiter (sonst würde neu "ausgelost")
  const prev = ctx.prev ?? {};
  const recovering = { ...(prev.recovering ?? {}) };
  let helper = prev.helper ?? null, rotator = prev.rotator ?? null;
  let owner = { ...(prev.owner ?? {}) }; // Zone: Angreiferin → Verteidigerin

  for (const d of defenders) { sim.pos[d.id] = []; sim.state[d.id] = []; sim.resp[d.id] = []; }

  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const ur = Math.max(0, u - reactionU);           // Wahrnehmung mit Reaktionszeit
    const O = Object.fromEntries(offense.map((id) => [id, ctx.posAt(id, ur)]));
    const ph = ctx.ballPhase(ur);
    const B = ph.state === "loose" ? center : ctx.ballGround(ur);
    // Beim Pass verteidigt man schon die Empfängerin ("mit dem Ball fliegen")
    const holder = ph.state === "flight" ? ph.pass.to : ph.holder ?? null;

    const active = defenders.filter((d) => u >= d.startU - 1e-9);
    for (const d of active) if (!cur[d.id]) cur[d.id] = { ...d.startPos(d.startU) };

    const man = active.filter((d) => d.action.type === "man");
    const zone = active.filter((d) => d.action.type === "zone");
    const target = {}, state = {}, resp = {};

    /* ---- Mann-Mann ---- */
    if (man.length) {
      const R = rules;
      const ballDef = holder ? man.find((d) => d.action.target === holder) : null;
      const dB = dist(B, H);
      // Ballführerin vorbei? Ihre Verteidigerin steht nicht mehr zwischen Ball und Korb.
      let beaten = false;
      if (holder && ph.state !== "flight" && bool(R.help.enabled) && dB < R.help.radius) {
        if (!ballDef) beaten = true;
        else {
          const p = cur[ballDef.id];
          const ahead = (p.x - B.x) * (H.x - B.x) + (p.y - B.y) * (H.y - B.y);
          beaten = ahead < 0 || dist(p, H) > dB + 2;
        }
      }
      const helpPoint = add(B, scale(toHoop(B), R.help.stepIn));
      if (!beaten) { helper = null; rotator = null; }
      else if (!helper || !man.some((d) => d.id === helper)) {
        const cand = man.filter((d) => d !== ballDef);
        if (cand.length) {
          const pick = R.help.who === "low"
            ? cand.filter((d) => side(O[d.action.target] ?? B) !== side(B)).sort((a, c) => dist(cur[a.id], H) - dist(cur[c.id], H))[0]
            : null;
          helper = (pick ?? cand.slice().sort((a, c) => dist(cur[a.id], helpPoint) - dist(cur[c.id], helpPoint))[0]).id;
          rotator = null;
          if (bool(R.help.rotate)) {
            const freeAtt = man.find((d) => d.id === helper)?.action.target;
            const rc = cand.filter((d) => d.id !== helper).sort((a, c) => dist(cur[a.id], O[freeAtt]) - dist(cur[c.id], O[freeAtt]))[0];
            rotator = rc?.id ?? null;
          }
        }
      }
      for (const d of man) {
        const A = O[d.action.target] ?? ctx.posAt(d.action.target, ur);
        resp[d.id] = d.action.target;
        if (d.id === helper) { target[d.id] = helpPoint; state[d.id] = "help"; continue; }
        if (d.id === rotator) {
          const free = O[man.find((x) => x.id === helper).action.target];
          target[d.id] = lerp(free, B, 0.3); state[d.id] = "rotate";
          resp[d.id] = man.find((x) => x.id === helper).action.target;
          continue;
        }
        if (d.action.target === holder) {
          const far = dist(A, H) > R.onBall.far;
          target[d.id] = add(A, scale(toHoop(A), far ? R.onBall.farDistance : R.onBall.distance));
          state[d.id] = "ball";
        } else if (dist(A, B) < R.ballSide.adjacent) {
          if (R.ballSide.mode === "gap") {
            const g = lerp(A, B, R.ballSide.gapRatio);
            target[d.id] = add(g, scale(toHoop(g), 3)); state[d.id] = "gap";
          } else {
            target[d.id] = add(add(A, scale(norm(sub(B, A)), R.ballSide.denyDistance)), scale(toHoop(A), 2)); state[d.id] = "deny";
          }
        } else {
          const p = lerp(A, B, R.helpSide.ratio);
          target[d.id] = add(p, scale(toHoop(p), R.helpSide.drop)); state[d.id] = "helpside";
        }
        // Grundregel Ball – Gegenspielerin – Korb: immer näher am Korb als die Gegenspielerin
        if (state[d.id] !== "ball") {
          const limit = Math.max(4, dist(A, H) - 3);
          if (dist(target[d.id], H) > limit) target[d.id] = add(H, scale(norm(sub(target[d.id], H)), limit));
        }
      }
    }

    /* ---- Zone ---- */
    if (zone.length) {
      const R = rules.zone;
      const geo = Object.fromEntries(zone.map((d) => [d.id, zoneGeometry(C, d.action.zone)]));
      const next = {};
      const byHome = (p) => (x, y) => dist(p, geo[x.id].home) - dist(p, geo[y.id].home);
      // Hysterese: die bisherige Verantwortliche behält, solange die Angreiferin (knapp) in ihrem Raum ist
      const pick = (a, exclude) => {
        const p = O[a];
        const prev = owner[a];
        const cands = zone.filter((d) => geo[d.id] && d.id !== exclude && (inArea(p, geo[d.id].area) || (d.id === prev && inArea(p, geo[d.id].area, 5))));
        if (cands.some((d) => d.id === prev)) return prev;
        return cands.sort(byHome(p))[0]?.id ?? null;
      };
      // 1. Ball zuerst: wer den Raum der Ballführerin hat, macht Druck
      let ballOwner = null;
      if (holder && O[holder]) {
        ballOwner = pick(holder, null) ?? zone.slice().sort(byHome(O[holder]))[0].id;
        next[holder] = ballOwner;
      }
      // 2. Übrige Angreiferinnen: die Ballverteidigerin gibt sie an eine freie Mitspielerin ab
      for (const a of offense) {
        if (a === holder) continue;
        const free = pick(a, ballOwner);
        const any = free ?? pick(a, null);
        if (any) next[a] = any;
      }
      for (const [a, to] of Object.entries(next)) {
        const from = owner[a];
        if (from && to && from !== to) sim.handovers.push({ u, attacker: a, from, to });
      }
      owner = next;
      for (const d of zone) {
        const g = geo[d.id];
        if (!g) { target[d.id] = cur[d.id]; state[d.id] = "zone"; resp[d.id] = null; continue; }
        const mine = Object.entries(owner).filter(([, o]) => o === d.id).map(([a]) => a);
        if (holder && mine.includes(holder)) {
          const A = O[holder];
          target[d.id] = add(A, scale(toHoop(A), rules.onBall.distance)); state[d.id] = "ball"; resp[d.id] = holder;
        } else if (mine.length) {
          const a = mine.sort((x, y) => dist(O[x], B) - dist(O[y], B))[0];
          const p = lerp(O[a], B, R.offBallRatio);
          target[d.id] = add(p, scale(toHoop(p), R.drop)); state[d.id] = "zoneman"; resp[d.id] = a;
        } else {
          const shifted = { x: g.home.x + R.shiftX * (B.x - center.x), y: g.home.y + R.shiftY * (B.y - center.y) };
          target[d.id] = clampArea(shifted, g.area); state[d.id] = "zone"; resp[d.id] = null;
        }
      }
      sim.zoneOwner.push({ ...owner });
    }

    /* ---- Bewegung mit Höchstgeschwindigkeit ---- */
    for (const d of active) {
      const p = cur[d.id];
      const T = target[d.id] ?? p;
      const gap = dist(p, T);
      let st = state[d.id];
      // Zurück aus der Hilfe/Rotation → Recover bzw. Closeout auf die Ballführerin
      if (st === "help" || st === "rotate") recovering[d.id] = true;
      else if (recovering[d.id]) {
        if (gap < RECOVER_DONE) recovering[d.id] = false;
        else st = st === "ball" ? "closeout" : "recover";
      }
      if (st === "ball" && gap > 14) st = "closeout";
      // Am Ball wird geslidet (ein schneller Drive kann die Verteidigerin schlagen),
      // Help, Recover, Closeout, Rotation und lange Wege werden gesprintet.
      const fast = st === "help" || st === "recover" || st === "closeout" || st === "rotate" || (gap > 10 && st !== "ball");
      const vmax = fast ? rules.speed.sprint : rules.speed.slide;
      if (i > 0) {
        const step = Math.min(gap, Math.min(vmax, gap * GAIN) * b.dur / n);
        if (gap > 1e-6) cur[d.id] = add(p, scale(sub(T, p), step / gap));
      }
      sim.pos[d.id][i] = { ...cur[d.id] };
      sim.state[d.id][i] = st;
      sim.resp[d.id][i] = resp[d.id] ?? null;
    }
    for (const d of defenders.filter((x) => !active.includes(x))) {
      sim.pos[d.id][i] = null; sim.state[d.id][i] = null; sim.resp[d.id][i] = null;
    }
  }
  sim.carry = { owner, recovering, helper, rotator };
  return sim;
}

/** Position einer simulierten Verteidigerin bei u (lineare Interpolation) */
export function simPos(sim, id, u) {
  const arr = sim.pos[id];
  const f = Math.max(0, Math.min(1, u)) * sim.n;
  const i = Math.floor(f);
  const a = arr[i], c = arr[Math.min(sim.n, i + 1)];
  if (!a) return c;
  if (!c) return a;
  return lerp(a, c, f - i);
}

/** Zustand und Verantwortung bei u (nächster Simulationsschritt) */
export function simInfo(sim, id, u) {
  const i = Math.round(Math.max(0, Math.min(1, u)) * sim.n);
  return { state: sim.state[id]?.[i] ?? null, resp: sim.resp[id]?.[i] ?? null };
}

/** Übergaben, die bis u passiert sind (mit Alter in u) */
export const handoversUntil = (sim, u) => sim.handovers.filter((h) => h.u <= u + 1e-9);

/** Bewegungsenergie einer Strecke – Hilfsfunktion für Tests */
export const pathLength = (pts) => pts.reduce((s, p, i) => (i && p && pts[i - 1] ? s + len(sub(p, pts[i - 1])) : s), 0);

/** Zustandsfolge einer System-Verteidigerin im Beat: [{ state, resp, u0, u1 }] (kurze Wackler entfernt) */
export function stateSequence(sim, id, minU = 0.08) {
  const st = sim?.state?.[id];
  if (!st) return [];
  const runs = [];
  for (let i = 0; i <= sim.n; i++) {
    const s = st[i], r = sim.resp[id][i];
    if (s == null) continue;
    const last = runs[runs.length - 1];
    if (last && last.state === s && last.resp === r) last.u1 = i / sim.n;
    else runs.push({ state: s, resp: r, u0: i / sim.n, u1: i / sim.n });
  }
  const kept = runs.filter((r, i) => r.u1 - r.u0 >= minU || i === runs.length - 1 || runs.length === 1);
  return kept.filter((r, i) => !i || r.state !== kept[i - 1].state || r.resp !== kept[i - 1].resp);
}
