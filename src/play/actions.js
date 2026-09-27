/* Aktions-Registry des Play-Modells.
   kind:
     path     – Spielerin bewegt sich entlang eines Weges (to/via)
     static   – Spielerin bleibt stehen (dreht sich ggf.)
     relation – Position ergibt sich aus Beziehungen (Gegenspielerin, Ball, Korb)
     ball     – Ballaktion (Pass) – verändert Ballbesitz, nicht die Position
   implemented: false → Modell akzeptiert die Aktion (mit Warnung), Engine behandelt sie als "hold". */

export const ACTIONS = {
  move:     { kind: "path", profile: "move", implemented: true, label: "Bewegen" },
  sprint:   { kind: "path", profile: "sprint", implemented: true, label: "Sprint" },
  cut:      { kind: "path", profile: "cut", implemented: true, label: "Cut" },
  dribble:  { kind: "path", profile: "dribble", implemented: true, label: "Dribbling", needsBall: true },
  screen:   { kind: "path", profile: "move", implemented: true, label: "Screen" },
  roll:     { kind: "path", profile: "sprint", implemented: true, label: "Roll" },
  pop:      { kind: "path", profile: "move", implemented: true, label: "Pop" },
  hold:     { kind: "static", implemented: true, label: "Position halten" },
  pass:     { kind: "ball", profile: "pass", implemented: true, label: "Pass" },
  guard:    { kind: "relation", profile: "close", implemented: true, label: "Verteidigen" },
  deny:     { kind: "relation", profile: "move", implemented: true, label: "Deny" },
  help:     { kind: "relation", profile: "move", implemented: true, label: "Help" },
  trap:     { kind: "relation", profile: "close", implemented: true, label: "Trap / Doppeln", group: true },
  switch:   { kind: "relation", implemented: false, label: "Switch" },
  closeout: { kind: "relation", implemented: false, label: "Closeout" },
  handoff:  { kind: "ball", implemented: false, label: "Handoff" },
};

export const actionDef = (type) => ACTIONS[type];

/** Spielerinnen, die eine Aktion bewegt (Pass bewegt niemanden) */
export function actorsOf(action) {
  if (action.type === "pass" || action.type === "handoff") return [];
  if (action.players) return action.players;
  return action.player ? [action.player] : [];
}

export const actionWindow = (a) => ({ start: a.start ?? 0, end: a.end ?? 1 });
