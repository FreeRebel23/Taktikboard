/* Referenzfall: FULL-COURT PRESS BREAK
 *
 * Offense greift den oberen Korb an (attack: "up"), Einwurf an der unteren Grundlinie.
 * Die Defense presst mit Deny auf die Anspielstationen und doppelt nach dem ersten Pass.
 * Lösung: kein Dribbling im Trap, zweite Reihe finden, Ball schnell nach vorne bewegen.
 *
 * Es gibt keine aufgezeichneten Koordinaten für die Defense-Rotation: Deny-, Guard-,
 * Help- und Trap-Positionen berechnet die Engine aus Gegenspielerin, Ball und Korb.
 */

export const pressBreak = {
  id: "press_break",
  name: "Press Break – Full Court",
  court: "full",
  attack: "up",
  summary:
    "Einwurf gegen Ganzfeldpresse: Der erste Pass wird gedoppelt. Kein Dribbling – die zweite Reihe finden und den Ball schnell über die erste Presslinie bewegen.",

  entities: [
    { id: "o1", team: "offense", label: "1" },
    { id: "o2", team: "offense", label: "2" },
    { id: "o3", team: "offense", label: "3" },
    { id: "o4", team: "offense", label: "4" },
    { id: "o5", team: "offense", label: "5" },
    { id: "d1", team: "defense", label: "X1" },
    { id: "d2", team: "defense", label: "X2" },
    { id: "d3", team: "defense", label: "X3" },
    { id: "d4", team: "defense", label: "X4" },
    { id: "d5", team: "defense", label: "X5" },
  ],

  start: {
    ball: "o4",
    positions: {
      o4: { x: 104, y: 285 },   // Einwerferin hinter der Grundlinie
      o1: { x: 100, y: 236 },   // Anspielstation ballseitig
      o2: { x: 132, y: 196 },   // Up-the-line, rechte Seitenlinie
      o5: { x: 40, y: 190 },    // zweite Reihe, Weakside
      o3: { x: 36, y: 112 },    // tief, hinter der Mittellinie
      d4: { x: 103, y: 277 },   // verteidigt den Einwurf
      d1: { x: 100.5, y: 242.5 }, // Deny auf 1
      d2: { x: 129.2, y: 202.2 }, // Deny auf 2
      d3: { x: 74, y: 206 },    // Mitte
      d5: { x: 70, y: 118 },    // Safety
    },
  },

  lines: [
    { id: "press1", label: "1. PRESSLINIE", members: ["d1", "d4"], anchorBeat: "trap", fromBeat: "trap" },
  ],

  beats: [
    {
      id: "inbound",
      title: "Einwurf",
      text: "4 wirft ein. 1 löst sich mit einem V-Cut von X1 und bekommt den Ball an der rechten Seite. X4 verteidigt den Einwurf mit hohen Armen – 4 spielt über Kopf.",
      duration: 2200,
      actions: [
        { type: "cut", player: "o1", via: [{ x: 94, y: 222 }], to: { x: 122, y: 244 }, end: 0.5 },
        // X1 geht mit dem ersten Schritt des V-Cuts mit, bleibt beim Richtungswechsel hängen
        { type: "deny", player: "d1", target: "o1", end: 0.3 },
        { type: "hold", player: "d1", start: 0.3, end: 0.55 },
        { type: "guard", player: "d1", target: "o1", start: 0.55, distance: 7.5, profile: "sprint" },
        { type: "guard", player: "d4", target: "o4", distance: 8 },
        { type: "pass", from: "o4", to: "o1", start: 0.52, end: 0.8, lob: true }, // Überkopf über die Arme von X4
        { type: "deny", player: "d2", target: "o2" },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o5" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d3" },
        { type: "hold", player: "d5" },
      ],
    },
    {
      id: "catch",
      title: "Ballannahme",
      text: "1 fängt, dreht sofort auf und schaut nach vorne – nicht automatisch ins Dribbling. 4 kommt ins Feld und bleibt als Anspielstation hinter dem Ball.",
      duration: 1600,
      focus: [{ type: "callout", player: "o1", text: "Aufdrehen · Blick nach vorne", tone: "info" }],
      actions: [
        { type: "hold", player: "o1", face: "upcourt" },
        { type: "guard", player: "d1", target: "o1", distance: 7.5 },
        { type: "move", player: "o4", to: { x: 92, y: 268 }, end: 0.8 },
        { type: "guard", player: "d4", target: "o4", distance: 9 },
        { type: "deny", player: "d2", target: "o2" },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o5" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d3" },
        { type: "hold", player: "d5" },
      ],
    },
    {
      id: "trap",
      title: "Trap",
      text: "X4 verlässt die Einwerferin und doppelt mit X1 an der Seitenlinie. Jetzt kein Dribbling: Ball hoch schützen, pivotieren, Kopf oben. X3 nimmt den Rückpass zu 4 weg – dadurch ist die Mitte leer und 5 frei.",
      duration: 1900,
      showLanes: true,
      focus: [
        { type: "callout", player: "o1", text: "KEIN DRIBBLING", tone: "warn", from: 0.35 },
        { type: "open", player: "o5", label: "FREI", from: 0.6 },
      ],
      actions: [
        { type: "trap", players: ["d1", "d4"], target: "o1", end: 0.7 },
        { type: "deny", player: "d3", target: "o4", start: 0.1, end: 0.8, profile: "sprint" },
        { type: "deny", player: "d2", target: "o2" },
        { type: "hold", player: "o1", face: "upcourt" },
        { type: "hold", player: "o4" },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o5" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d5" },
      ],
    },
    {
      id: "second_row",
      title: "Zweite Reihe",
      text: "5 erkennt, dass die Mitte leer ist, und schneidet in den freien Passraum hinter dem Trap – zwischen erster Presslinie und Safety X5.",
      duration: 1600,
      showLanes: true,
      focus: [
        { type: "callout", player: "o1", text: "KEIN DRIBBLING", tone: "warn" },
        { type: "open", player: "o5", label: "FREI" },
      ],
      actions: [
        { type: "cut", player: "o5", via: [{ x: 50, y: 198 }], to: { x: 74, y: 212 }, end: 0.75 },
        { type: "trap", players: ["d1", "d4"], target: "o1" },
        { type: "deny", player: "d3", target: "o4" },
        { type: "deny", player: "d2", target: "o2" },
        { type: "hold", player: "o1", face: "o5" },
        { type: "hold", player: "o4" },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d5" },
      ],
    },
    {
      id: "outlet",
      title: "Pass aus dem Trap",
      text: "1 passt über die Hände der Trapperinnen zu 5. Mit einem Pass stehen zwei Verteidigerinnen hinter dem Ball. X2 sinkt ab, um die Mitte zu schließen, und verlässt dafür 2.",
      duration: 1700,
      focus: [{ type: "open", player: "o5", label: "FREI", to: 0.5 }],
      actions: [
        { type: "pass", from: "o1", to: "o5", start: 0.08, end: 0.5, lob: true },
        { type: "trap", players: ["d1", "d4"], target: "o1", end: 0.3 },
        { type: "hold", player: "d1", start: 0.3 },
        { type: "hold", player: "d4", start: 0.3 },
        { type: "hold", player: "o1" },
        { type: "hold", player: "o5" },
        { type: "sprint", player: "d3", to: { x: 86, y: 236 }, start: 0.35 },
        { type: "help", player: "d2", target: "o5", start: 0.3, ratio: 0, drop: 13 },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o4" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d5" },
      ],
    },
    {
      id: "break_line",
      title: "Presslinie überwunden",
      text: "5 dreht auf und spielt sofort nach vorne zu 2, die sich an der Seitenlinie gelöst hat. Drei Pässe, kein Dribbling – die Presse ist geschlagen, die Offense läuft mit Überzahl nach vorne.",
      duration: 2600,
      focus: [{ type: "open", player: "o2", label: "FREI", from: 0.05, to: 0.55 }],
      actions: [
        { type: "hold", player: "o5", face: "upcourt", end: 0.35 },
        { type: "pass", from: "o5", to: "o2", start: 0.32, end: 0.6 },
        { type: "sprint", player: "o5", to: { x: 76, y: 176 }, start: 0.62 },
        { type: "sprint", player: "o2", via: [{ x: 136, y: 170 }], to: { x: 132, y: 142 }, end: 0.62 },
        { type: "sprint", player: "o3", to: { x: 30, y: 72 }, start: 0.3 },
        { type: "sprint", player: "o1", via: [{ x: 118, y: 222 }], to: { x: 108, y: 188 }, start: 0.2 },
        { type: "move", player: "o4", to: { x: 82, y: 236 }, start: 0.2 },
        { type: "sprint", player: "d1", to: { x: 102, y: 202 }, start: 0.1 },
        { type: "sprint", player: "d4", to: { x: 84, y: 220 }, start: 0.15 },
        { type: "sprint", player: "d3", to: { x: 90, y: 204 }, start: 0.1 },
        { type: "guard", player: "d2", target: "o2", start: 0.25, distance: 9, profile: "sprint" },
        { type: "hold", player: "d5" },
      ],
    },
  ],
};
