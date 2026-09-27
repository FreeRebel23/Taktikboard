/* Play-Datenmodell
 *
 * Ein Play beschreibt Basketball, nicht Koordinaten-Aufnahmen:
 *
 *   Play
 *   ├─ court, attack          Ganzfeld/Halbfeld, Angriffsrichtung der Offense ("up" = oberer Korb)
 *   ├─ entities[]             { id, team: "offense"|"defense", label }
 *   ├─ start                  { positions: {id: {x,y}}, ball: holderId }   ← Ausgangssituation
 *   ├─ lines[]                taktische Linien (z. B. 1. Presslinie) aus Spielerinnen abgeleitet
 *   └─ beats[]                Schritte, nacheinander
 *       ├─ title, text        Erklärung für Trainer/Spielerinnen
 *       ├─ duration           ms
 *       ├─ focus[]            Hervorhebungen ("open", "callout")
 *       ├─ showLanes          Passwege vom Ballführer analysieren
 *       └─ actions[]          gleichzeitig ablaufende Aktionen
 *            { type, player | players, start, end (0..1 im Beat),
 *              to, via[] (Wege), target (Beziehung), from/to (Pass), face }
 *
 * Positionen entstehen erst in der Engine – aus Wegen *und* Beziehungen
 * (Trap um die Ballführerin, Deny in der Passlinie, Help zwischen Ball und Korb).
 */

import { ACTIONS, actorsOf, actionWindow } from "./actions.js";

const EPS = 1e-6;

export const teamOf = (play, id) => play.entities.find((e) => e.id === id)?.team;

export function beatIndexById(play, id) {
  if (typeof id === "number") return id;
  return play.beats.findIndex((b) => b.id === id);
}

/** Alle Pässe eines Beats, zeitlich sortiert */
export const passesOf = (beat) =>
  beat.actions.filter((a) => a.type === "pass").sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

/** Ballbesitz zu Beginn jedes Beats (+ nach dem letzten) */
export function holderTimeline(play) {
  const out = [play.start.ball ?? null];
  let holder = out[0];
  for (const beat of play.beats) {
    for (const p of passesOf(beat)) holder = p.to;
    out.push(holder);
  }
  return out;
}

/**
 * Prüft ein Play auf strukturelle und basketballerische Konsistenz.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validatePlay(play) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  for (const e of play.entities ?? []) {
    if (ids.has(e.id)) errors.push(`Entity "${e.id}" doppelt`);
    ids.add(e.id);
    if (e.team !== "offense" && e.team !== "defense") errors.push(`Entity "${e.id}": unbekanntes Team "${e.team}"`);
    if (!play.start?.positions?.[e.id]) errors.push(`Entity "${e.id}": keine Startposition`);
  }
  const isOff = (id) => teamOf(play, id) === "offense";
  const isDef = (id) => teamOf(play, id) === "defense";

  let holder = play.start?.ball ?? null;
  if (holder && !ids.has(holder)) errors.push(`Startball bei unbekannter Spielerin "${holder}"`);

  (play.beats ?? []).forEach((beat, bi) => {
    const where = `Beat ${bi + 1} (${beat.title ?? beat.id})`;
    if (!(beat.duration > 0)) errors.push(`${where}: duration fehlt oder ≤ 0`);

    // Zeitfenster pro Spielerin dürfen sich nicht überlappen → eindeutige Bewegung
    const windows = new Map();

    for (const a of beat.actions ?? []) {
      const def = ACTIONS[a.type];
      if (!def) { errors.push(`${where}: unbekannte Aktion "${a.type}"`); continue; }
      if (!def.implemented) warnings.push(`${where}: Aktion "${a.type}" ist noch nicht implementiert (wird als Hold behandelt)`);

      const { start, end } = actionWindow(a);
      if (start < 0 || end > 1 || end <= start) errors.push(`${where}: "${a.type}" hat ungültiges Zeitfenster [${start}, ${end}]`);

      for (const pid of actorsOf(a)) {
        if (!ids.has(pid)) { errors.push(`${where}: "${a.type}" – unbekannte Spielerin "${pid}"`); continue; }
        const list = windows.get(pid) ?? [];
        for (const w of list) {
          if (start < w.end - EPS && w.start < end - EPS) errors.push(`${where}: "${pid}" hat überlappende Aktionen (${w.type} / ${a.type})`);
        }
        list.push({ start, end, type: a.type });
        windows.set(pid, list);
      }

      if (def.kind === "path" && !a.to) errors.push(`${where}: "${a.type}" von "${a.player}" braucht ein Ziel (to)`);
      if (def.kind === "relation" && def.implemented) {
        if (!ids.has(a.target)) errors.push(`${where}: "${a.type}" braucht ein gültiges target`);
        else if (!isOff(a.target)) errors.push(`${where}: "${a.type}" – target "${a.target}" muss Offense sein`);
        for (const pid of actorsOf(a)) if (ids.has(pid) && !isDef(pid)) errors.push(`${where}: "${a.type}" nur für Defense ("${pid}")`);
      }
      if (a.type === "trap" && (a.players?.length ?? 0) !== 2) errors.push(`${where}: trap braucht genau zwei players`);
      if (def.needsBall && a.player !== holder) {
        // Dribbling nach einem Pass im selben Beat ist erlaubt, wenn der Pass vorher ankommt
        const recv = passesOf(beat).find((p) => p.to === a.player && (p.end ?? 1) <= start + EPS);
        if (!recv) errors.push(`${where}: "${a.player}" dribbelt ohne Ball`);
      }
    }

    // Pässe: sequenziell, vom aktuellen Ballbesitz, an eine Mitspielerin
    let lastEnd = -1;
    for (const p of passesOf(beat)) {
      const { start, end } = actionWindow(p);
      if (p.from !== holder) errors.push(`${where}: Pass von "${p.from}", aber Ball ist bei "${holder}"`);
      if (!ids.has(p.to)) errors.push(`${where}: Pass an unbekannte Spielerin "${p.to}"`);
      else if (teamOf(play, p.to) !== teamOf(play, p.from)) warnings.push(`${where}: Pass von "${p.from}" an Gegnerin "${p.to}"`);
      if (start < lastEnd - EPS) errors.push(`${where}: Pässe überlappen zeitlich`);
      lastEnd = end;
      holder = p.to;
    }

    for (const f of beat.focus ?? []) {
      if (!ids.has(f.player)) errors.push(`${where}: focus auf unbekannte Spielerin "${f.player}"`);
    }
  });

  for (const l of play.lines ?? []) {
    for (const m of l.members ?? []) if (!ids.has(m)) errors.push(`Linie "${l.id}": unbekanntes Mitglied "${m}"`);
    if (beatIndexById(play, l.anchorBeat) < 0) errors.push(`Linie "${l.id}": anchorBeat "${l.anchorBeat}" unbekannt`);
  }

  return { errors, warnings };
}
