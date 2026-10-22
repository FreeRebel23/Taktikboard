/* Reine Datenoperationen des Play Builders (testbar ohne UI).
 * Der Entwurf ist ein normales Play (Baum). Bearbeitet wird immer der gewählte
 * Variantenpfad; jede Operation liefert einen neuen Entwurf (Klon). */

import { ACTIONS, actionWindow } from "../play/actions.js";

const clone = (x) => structuredClone(x);

/** Segmente des Pfads: Stamm, dann gewählte Optionen */
export function segments(play, choices = {}) {
  const segs = [{ node: play, decision: null, option: null }];
  let node = play;
  while (node.decision) {
    const d = node.decision;
    const o = d.options.find((x) => x.id === (choices[d.id] ?? d.options[0].id)) ?? d.options[0];
    segs.push({ node: o, decision: d, option: o });
    node = o;
  }
  return segs;
}

/** Flache Beat-Liste des Pfads mit Fundstelle im Baum */
export function flatBeats(play, choices) {
  const out = [];
  segments(play, choices).forEach((s, si) => s.node.beats.forEach((beat, j) => out.push({ si, j, beat, decision: s.decision, option: s.option })));
  return out;
}

/** Beat an flacher Position im (geklonten) Entwurf ändern */
export function updateBeat(play, choices, index, fn) {
  const next = clone(play);
  const f = flatBeats(next, choices)[index];
  if (!f) return play;
  fn(f.beat, next);
  return next;
}

const usedIds = (play) => {
  const ids = new Set();
  const walk = (n) => { n.beats?.forEach((b) => ids.add(b.id)); n.decision?.options.forEach(walk); };
  walk(play);
  return ids;
};
export const uniqueBeatId = (play, base = "beat") => {
  const ids = usedIds(play);
  let i = ids.size + 1;
  while (ids.has(`${base}${i}`)) i++;
  return `${base}${i}`;
};

/** Neuen Beat am Ende des Pfads anhängen */
export function addBeat(play, choices) {
  const next = clone(play);
  const segs = segments(next, choices);
  const last = segs[segs.length - 1].node;
  const n = flatBeats(next, choices).length + 1;
  last.beats.push({ id: uniqueBeatId(next), title: `Beat ${n}`, text: "", duration: 1500, actions: [] });
  return next;
}

export function removeBeat(play, choices, index) {
  const next = clone(play);
  const f = flatBeats(next, choices)[index];
  if (!f) return play;
  const node = segments(next, choices)[f.si].node;
  if (node.beats.length <= 1) return play; // Segment braucht mindestens einen Beat
  node.beats.splice(f.j, 1);
  return next;
}

export function duplicateBeat(play, choices, index) {
  const next = clone(play);
  const f = flatBeats(next, choices)[index];
  if (!f) return play;
  const node = segments(next, choices)[f.si].node;
  const copy = clone(f.beat);
  copy.id = uniqueBeatId(next);
  copy.title = `${f.beat.title ?? "Beat"} (Kopie)`;
  // Pässe würden den Ball doppelt bewegen → in der Kopie entfernen
  copy.actions = copy.actions.filter((a) => a.type !== "pass");
  node.beats.splice(f.j + 1, 0, copy);
  return next;
}

/** Ende der letzten Bewegungsaktion einer Spielerin im Beat (für "danach") */
export function lastEnd(beat, player) {
  return beat.actions
    .filter((a) => a.type !== "pass" && (a.player === player || a.players?.includes(player)) && a.type !== "hold")
    .reduce((m, a) => Math.max(m, actionWindow(a).end), 0);
}

/**
 * Aktion hinzufügen. after=true → startet nach der letzten Aktion der Spielerin,
 * sonst ersetzt sie deren bisherige (Nicht-Pass-)Aktionen in diesem Beat.
 */
export function addAction(play, choices, index, action, { after = false } = {}) {
  return updateBeat(play, choices, index, (beat) => {
    const actors = action.players ?? (action.type === "pass" ? [] : [action.player]);
    if (action.type !== "pass") {
      if (after) {
        const s = Math.min(0.9, lastEnd(beat, actors[0]));
        action = { ...action, start: s, end: Math.max(s + 0.1, action.end ?? 1) };
        // Haltungen, die mit dem neuen Fenster überlappen, entfernen
        beat.actions = beat.actions.filter((a) => !(a.type === "hold" && actors.includes(a.player)));
      } else {
        beat.actions = beat.actions.filter((a) => a.type === "pass" || !(actors.includes(a.player) || a.players?.some((p) => actors.includes(p))));
      }
    }
    beat.actions.push(action);
  });
}

export function removeAction(play, choices, index, k) {
  return updateBeat(play, choices, index, (beat) => { beat.actions.splice(k, 1); });
}

export function patchAction(play, choices, index, k, patch) {
  return updateBeat(play, choices, index, (beat) => { beat.actions[k] = { ...beat.actions[k], ...patch }; });
}

export function setRole(play, choices, index, player, patch) {
  return updateBeat(play, choices, index, (beat) => {
    const r = { ...(beat.roles?.[player] ?? {}), ...patch };
    for (const k of Object.keys(r)) if (r[k] === "" || r[k] == null) delete r[k];
    beat.roles = { ...(beat.roles ?? {}), [player]: r };
    if (!Object.keys(r).length) delete beat.roles[player];
  });
}

/** Read (Entscheidung) am Ende des Pfads anlegen – zwei Optionen mit je einem Beat */
export function addDecision(play, choices) {
  const next = clone(play);
  const segs = segments(next, choices);
  const last = segs[segs.length - 1].node;
  if (last.decision) return play;
  const mk = (suffix) => ({ id: uniqueBeatId(next, `read_${suffix}_`), title: "Neuer Beat", text: "", duration: 1500, actions: [] });
  const a = mk("a"); const b = mk("b");
  b.id = b.id === a.id ? `${b.id}x` : b.id;
  const did = `read${Date.now().toString(36)}`;
  last.decision = {
    id: did, title: "Read", question: "Was macht die Verteidigung?", watch: [],
    options: [
      { id: "a", label: "Reaktion A", read: "", answer: "", beats: [a] },
      { id: "b", label: "Reaktion B", read: "", answer: "", beats: [b] },
    ],
  };
  return next;
}

export function removeDecision(play, choices, decisionId) {
  const next = clone(play);
  for (const s of segments(next, choices)) if (s.node.decision?.id === decisionId) delete s.node.decision;
  return next;
}

export function patchDecision(play, decisionId, patch, optionId = null) {
  const next = clone(play);
  const walk = (n) => {
    if (!n.decision) return;
    if (n.decision.id === decisionId) {
      if (optionId) Object.assign(n.decision.options.find((o) => o.id === optionId), patch);
      else Object.assign(n.decision, patch);
    }
    n.decision.options.forEach(walk);
  };
  walk(next);
  return next;
}

/** Neuer Spielzug aus Board-Positionen */
export function newPlayFrom({ id, court, positions, ball }) {
  const ids = ["o1", "o2", "o3", "o4", "o5", "d1", "d2", "d3", "d4", "d5"];
  return {
    id, name: "Neuer Spielzug", court, attack: "up", summary: "",
    entities: ids.map((e) => ({ id: e, team: e[0] === "o" ? "offense" : "defense", label: e[0] === "o" ? e[1] : `X${e[1]}` })),
    start: { ball: ball && ball[0] === "o" ? ball : "o1", positions: Object.fromEntries(ids.map((e) => [e, { x: positions[e].x, y: positions[e].y }])) },
    beats: [{ id: "beat1", title: "Beat 1", text: "", duration: 1500, actions: [] }],
  };
}

/** Welche Aktionen bietet der Builder für ein Team an? */
export const BUILDER_ACTIONS = {
  offense: ["move", "sprint", "cut", "dribble", "screen", "roll", "pop", "pass", "hold"],
  defense: ["guard", "deny", "help", "trap", "switch", "closeout", "move", "sprint", "hold"],
};

/** Welches Ziel braucht eine Aktion? point | player | partner+player | none */
export function targetKind(type) {
  if (type === "pass") return "teammate";
  if (type === "trap") return "partner";
  if (type === "hold") return "none";
  return ACTIONS[type]?.kind === "relation" ? "opponent" : "point";
}
