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
import { PASS_KINDS } from "./ballFlight.js";

const EPS = 1e-6;

/** Körperhaltungen für Coaching (Zielmarke im Spielerinnen-Modus) */
export const STANCES = {
  open: "Offen: Brust zum Ball, Korb im Augenwinkel",
  triple: "Triple Threat: Ball an der Hüfte, Blick nach vorne",
  protect: "Ball schützen: Ball hoch, Ellbogen raus, pivotieren",
  defense: "Verteidigungsstellung: breite Füße, tief, Hände aktiv",
  deny: "Deny: Hand und Fuß in der Passlinie",
  screen: "Block: breit, stabil, Arme vor dem Körper",
};

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
  // Meldungen mit Rückennummern statt interner IDs ("2", "X1" statt "o2", "d1")
  const L = (id) => play.entities?.find((e) => e.id === id)?.label ?? id;
  const A = (type) => ACTIONS[type]?.label ?? type;

  for (const e of play.entities ?? []) {
    if (ids.has(e.id)) errors.push(`Entity "${L(e.id)}" doppelt`);
    ids.add(e.id);
    if (e.team !== "offense" && e.team !== "defense") errors.push(`Entity "${L(e.id)}": unbekanntes Team "${e.team}"`);
    if (!play.start?.positions?.[e.id]) errors.push(`Entity "${L(e.id)}": keine Startposition`);
  }
  const isOff = (id) => teamOf(play, id) === "offense";
  const isDef = (id) => teamOf(play, id) === "defense";

  let holder = play.start?.ball ?? null;
  if (holder && !ids.has(holder)) errors.push(`Startball bei unbekannter Spielerin "${L(holder)}"`);

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
        if (!ids.has(pid)) { errors.push(`${where}: "${a.type}" – unbekannte Spielerin "${L(pid)}"`); continue; }
        const list = windows.get(pid) ?? [];
        for (const w of list) {
          if (start < w.end - EPS && w.start < end - EPS) errors.push(`${where}: ${L(pid)} hat zwei Aktionen gleichzeitig (${A(w.type)} und ${A(a.type)}) – Zeitfenster anpassen oder eine Aktion löschen`);
        }
        list.push({ start, end, type: a.type });
        windows.set(pid, list);
      }

      if (def.kind === "path" && !a.to) errors.push(`${where}: ${A(a.type)} von ${L(a.player)} hat kein Ziel`);
      if (def.kind === "relation" && def.implemented) {
        if (!ids.has(a.target)) errors.push(`${where}: ${A(a.type)} braucht eine Gegenspielerin als Ziel`);
        else if (!isOff(a.target)) errors.push(`${where}: ${A(a.type)} – das Ziel (${L(a.target)}) muss eine Angreiferin sein`);
        for (const pid of actorsOf(a)) if (ids.has(pid) && !isDef(pid)) errors.push(`${where}: ${A(a.type)} können nur Verteidigerinnen ausführen (${L(pid)})`);
      }
      if (a.type === "trap" && (a.players?.length ?? 0) !== 2) errors.push(`${where}: Ein Trap braucht genau zwei Verteidigerinnen`);
      if (def.needsBall && a.player !== holder) {
        // Dribbling nach einem Pass im selben Beat ist erlaubt, wenn der Pass vorher ankommt
        const recv = passesOf(beat).find((p) => p.to === a.player && (p.end ?? 1) <= start + EPS);
        if (!recv) errors.push(`${where}: ${L(a.player)} dribbelt ohne Ball`);
      }
    }

    // Pässe: sequenziell, vom aktuellen Ballbesitz, an eine Mitspielerin
    let lastEnd = -1;
    for (const p of passesOf(beat)) {
      const { start, end } = actionWindow(p);
      if (p.kind && !PASS_KINDS[p.kind]) errors.push(`${where}: unbekannte Passart "${p.kind}"`);
      if (p.from !== holder) errors.push(`${where}: Pass von ${L(p.from)}, aber der Ball ist zu diesem Zeitpunkt bei ${holder ? L(holder) : "niemandem"}`);
      if (!ids.has(p.to)) errors.push(`${where}: Pass an unbekannte Spielerin "${L(p.to)}"`);
      else if (teamOf(play, p.to) !== teamOf(play, p.from)) warnings.push(`${where}: Pass von "${L(p.from)}" an Gegnerin "${L(p.to)}"`);
      if (start < lastEnd - EPS) errors.push(`${where}: Zwei Pässe überschneiden sich zeitlich`);
      lastEnd = end;
      holder = p.to;
    }

    for (const [pid, r] of Object.entries(beat.roles ?? {})) {
      if (!ids.has(pid)) errors.push(`${where}: Coaching für unbekannte Spielerin "${L(pid)}"`);
      if (r.watch && r.watch !== "ball" && typeof r.watch === "string" && !ids.has(r.watch)) errors.push(`${where}: "${L(pid)}" beobachtet unbekannte Spielerin "${L(r.watch)}"`);
      if (r.stance && !STANCES[r.stance]) warnings.push(`${where}: unbekannte Haltung "${r.stance}" bei "${L(pid)}"`);
    }

    for (const f of beat.focus ?? []) {
      if (!ids.has(f.player)) errors.push(`${where}: focus auf unbekannte Spielerin "${L(f.player)}"`);
    }
  });

  for (const l of play.lines ?? []) {
    for (const m of l.members ?? []) if (!ids.has(m)) errors.push(`Linie "${l.id}": unbekanntes Mitglied "${L(m)}"`);
    if (beatIndexById(play, l.anchorBeat) < 0) errors.push(`Linie "${l.id}": anchorBeat "${l.anchorBeat}" unbekannt`);
  }

  return { errors, warnings };
}
