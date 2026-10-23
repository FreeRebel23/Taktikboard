/* Rollenbeschreibung für den Spielerinnen-Modus.
 *
 * Trainer-Coaching (beat.roles[id]) hat immer Vorrang. Fehlt es, beschreibt das
 * System nur, WAS laut den Aktionen passiert (Ort, Auslöser, Partnerin) – es erfindet
 * keine Coaching-Inhalte wie "warum". Automatische Texte sind als solche markiert.
 */

import { ACTIONS, actionWindow } from "./actions.js";
import { passKind } from "./ballFlight.js";
import { STANCES } from "./model.js";
import { DEFENSE_STATES, stateSequence, zoneGeometry } from "./teamDefense.js";

const COURT_W = 150;

/** Ortsbeschreibung aus Sicht der Angreiferinnen (links/rechts in Angriffsrichtung) */
export function zoneName(C, p) {
  const up = C.attackDir.y < 0;
  const depth = up ? p.y : C.courtH - p.y;            // Abstand zur angegriffenen Grundlinie
  const lat = up ? p.x : COURT_W - p.x;               // links → rechts in Angriffsrichtung
  const side = lat < 28 ? "linke Seitenlinie" : lat < 60 ? "links" : lat <= 90 ? "Mitte" : lat <= 122 ? "rechts" : "rechte Seitenlinie";
  if (C.courtH > 140 && depth > 140) {
    const back = depth > 230 ? "nahe der eigenen Grundlinie" : depth > 196 ? "Rückfeld, Höhe Dreierlinie" : "Rückfeld";
    return `${side}, ${back}`;
  }
  if (depth < 30 && (lat < 25 || lat > 125)) return lat < 75 ? "linke Ecke" : "rechte Ecke";
  if (depth < 24 && lat > 45 && lat < 105) return "unter dem Korb";
  if (depth < 58 && lat > 50 && lat < 100) return "in der Zone";
  if (depth < 70) return lat < 75 ? "linker Flügel / Block" : "rechter Flügel / Block";
  if (depth < 100) return lat < 55 ? "linker Flügel" : lat > 95 ? "rechter Flügel" : "oben an der Dreierlinie";
  if (depth < 118) return `${side}, vor der Dreierlinie`;
  if (depth < 140) return `${side}, Höhe Mittellinie`;
  return side;
}

const label = (C, id) => C.entity[id]?.label ?? id;

function faceText(C, face) {
  if (!face) return null;
  if (face === "upcourt") return "Blick nach vorne";
  if (face === "ball") return "Blick zum Ball";
  if (face === "basket") return "Blick zum Korb";
  if (C.entity[face]) return `Blick zu ${label(C, face)}`;
  return null;
}

/** Was löst eine Aktion aus, die nicht zu Beat-Beginn startet? */
function triggerText(C, b, a, id) {
  const { start } = actionWindow(a);
  if (start < 0.12) return null;
  const pass = b.passes.find((p) => Math.abs(actionWindow(p).end - start) < 0.12 || (actionWindow(p).start <= start && actionWindow(p).end >= start - 0.05));
  if (pass && pass.from !== id) return `nach dem Pass von ${label(C, pass.from)} zu ${label(C, pass.to)}`;
  for (const [pid, acts] of b.byPlayer) {
    if (pid === id) continue;
    const other = acts.find((x) => ACTIONS[x.type]?.kind !== "static" && Math.abs(actionWindow(x).end - start) < 0.1);
    if (other) return `nach der Aktion von ${label(C, pid)} (${ACTIONS[other.type]?.label ?? other.type})`;
  }
  return start > 0.45 ? "in der zweiten Hälfte des Beats" : "kurz nach Beginn des Beats";
}

function actionText(C, b, a, id) {
  const t = a.type;
  switch (t) {
    case "move": return `Laufen: ${zoneName(C, a.to)}`;
    case "sprint": return `Sprinten: ${zoneName(C, a.to)}`;
    case "cut": return `Cut: ${zoneName(C, a.to)}`;
    case "dribble": return `Dribbling: ${zoneName(C, a.to)}`;
    case "screen": return a.on ? `Block gegen ${label(C, a.on)} stellen (${zoneName(C, a.to)})` : `Block stellen (${zoneName(C, a.to)})`;
    case "roll": return `Abrollen zum Korb (${zoneName(C, a.to)})`;
    case "pop": return `Absetzen nach außen (${zoneName(C, a.to)})`;
    case "hold": return ["Position halten", faceText(C, a.face)].filter(Boolean).join(", ");
    case "guard": return `${label(C, a.target)} verteidigen`;
    case "deny": return `Passweg zu ${label(C, a.target)} zustellen (Deny)`;
    case "help": return `Helfen gegen ${label(C, a.target)}`;
    case "trap": {
      const partner = a.players.find((p) => p !== id);
      return `Mit ${label(C, partner)} die ${label(C, a.target)} doppeln (Trap)`;
    }
    case "switch": return `Übernehmen: jetzt ${label(C, a.target)} verteidigen (Switch)`;
    case "closeout": return `Closeout auf ${label(C, a.target)}: schnell heran, Hand hoch`;
    case "man":
    case "zone": {
      const head = t === "man" ? `Mann-Mann gegen ${label(C, a.target)}` : `Zone „${zoneGeometry(C, a.zone)?.label ?? a.zone}“`;
      const seq = stateSequence(b.cache.get("sim"), id);
      if (!seq.length) return head;
      const parts = seq.map((r) => {
        const L = DEFENSE_STATES[r.state]?.label ?? r.state;
        const who = r.resp && (t === "zone" || r.resp !== a.target) ? ` (${label(C, r.resp)})` : "";
        return `${L.charAt(0)}${L.slice(1).toLowerCase()}${who}`;
      });
      return `${head}: ${parts.join(" → ")}`;
    }
    default: return ACTIONS[t]?.label ?? t;
  }
}

const KIND_SUFFIX = { bounce: " als Bodenpass", lob: " über Kopf", chest: "" };

/**
 * Aufgabe einer Spielerin in einem Beat.
 * @returns {{ task, cue, watch, stance, stanceText, why, auto: {task, watch}, steps: [{text, start, end, trigger}] }}
 */
export function describeRole(C, beatIndex, id) {
  const b = C.beats[beatIndex];
  const role = b.beat.roles?.[id] ?? {};
  const steps = [];

  for (const a of b.byPlayer.get(id) ?? []) {
    const { start, end } = actionWindow(a);
    // reine "Halten"-Aktionen ohne Blickvorgabe sind keine eigene Aufgabe, wenn es andere gibt
    steps.push({ text: actionText(C, b, a, id), start, end, trigger: triggerText(C, b, a, id), type: a.type });
  }
  for (const p of b.passes) {
    const { start, end } = actionWindow(p);
    if (p.from === id) steps.push({ text: `Pass zu ${label(C, p.to)}${KIND_SUFFIX[passKind(p)]}`, start, end, trigger: triggerText(C, b, p, id), type: "pass" });
    if (p.to === id) steps.push({ text: `Ball von ${label(C, p.from)} fangen`, start: end, end, trigger: null, type: "catch" });
  }
  steps.sort((x, y) => x.start - y.start);
  const meaningful = steps.filter((s) => s.type !== "hold" || steps.length === 1 || s.text !== "Position halten");

  const autoTask = meaningful.length
    ? meaningful.map((s) => (s.trigger ? `${s.text} – ${s.trigger}` : s.text)).join(" → ")
    : "Position halten";

  // Wen beobachten? Trainer-Vorgabe, sonst: Defense → Gegenspielerin, Offense → Ball
  let watch = role.watch ?? null;
  let autoWatch = false;
  if (!watch) {
    const rel = (b.byPlayer.get(id) ?? []).find((a) => ["relation", "system"].includes(ACTIONS[a.type]?.kind) && a.target);
    watch = rel ? rel.target : "ball";
    autoWatch = true;
  }

  return {
    task: role.task ?? autoTask,
    cue: role.cue ?? null,
    watch,
    stance: role.stance ?? null,
    stanceText: role.stance ? STANCES[role.stance] : null,
    why: role.why ?? null,
    auto: { task: !role.task, watch: autoWatch },
    steps: meaningful,
    autoTask,
  };
}

/** Zeitpunkte (s), zu denen die Spielerin im ganzen Play aktiv wird – für die Zeitleiste */
export function myMoments(C, id) {
  const out = [];
  for (const b of C.beats) {
    for (const a of b.byPlayer.get(id) ?? []) {
      if (ACTIONS[a.type]?.kind === "static") continue;
      out.push({ t: b.t0 + actionWindow(a).start * b.dur, beat: b.index, type: a.type });
    }
    for (const p of b.passes) {
      if (p.from === id) out.push({ t: b.t0 + actionWindow(p).start * b.dur, beat: b.index, type: "pass" });
      if (p.to === id) out.push({ t: b.t0 + actionWindow(p).end * b.dur, beat: b.index, type: "catch" });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
