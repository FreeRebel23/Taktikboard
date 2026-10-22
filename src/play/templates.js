/* Aufstellungs-Vorlagen für neue Spielzüge.
 * Die Verteidigung wird automatisch korbseitig vor ihre Gegenspielerin gestellt
 * (wie die Engine-Aktion "guard"), damit Trainer nicht zehn Figuren ziehen müssen. */

import { HOOPS } from "../court/constants.js";

const GUARD = 8;

/** Verteidigerinnen auf die Korbseite ihrer Gegenspielerinnen (o1→d1 …) */
export function withDefense(offense, court = "half") {
  const hoop = HOOPS.top;
  const pos = { ...offense };
  for (const id of Object.keys(offense)) {
    if (!id.startsWith("o")) continue;
    const o = offense[id];
    const out = o.y < 0 || o.y > (court === "half" ? 140 : 280) || o.x < 0 || o.x > 150; // Einwerferin
    const dx = hoop.x - o.x, dy = hoop.y - o.y;
    const L = Math.hypot(dx, dy) || 1;
    const k = out ? GUARD + 2 : GUARD;
    let d = { x: o.x + (dx / L) * k, y: o.y + (dy / L) * k };
    if (out) d = { x: Math.min(146, Math.max(4, d.x)), y: Math.min(court === "half" ? 136 : 276, Math.max(4, d.y)) };
    pos[`d${id[1]}`] = { x: Math.round(d.x * 10) / 10, y: Math.round(d.y * 10) / 10 };
  }
  return pos;
}

export const TEMPLATES = [
  {
    id: "five_out", name: "5-Out", court: "half", ball: "o1",
    note: "Alle fünf hinter der Dreierlinie – Basis für Cuts und Drives.",
    offense: { o1: { x: 75, y: 96 }, o2: { x: 124, y: 70 }, o3: { x: 26, y: 70 }, o4: { x: 140, y: 16 }, o5: { x: 10, y: 16 } },
  },
  {
    id: "horns", name: "Horns", court: "half", ball: "o1",
    note: "Beide Großen an den Ellbogen, Schützinnen in den Ecken.",
    offense: { o1: { x: 75, y: 98 }, o2: { x: 140, y: 16 }, o3: { x: 10, y: 16 }, o4: { x: 54, y: 60 }, o5: { x: 96, y: 60 } },
  },
  {
    id: "one_four_high", name: "1-4 hoch", court: "half", ball: "o1",
    note: "Aufbau oben, vier Spielerinnen auf Höhe der Freiwurflinie.",
    offense: { o1: { x: 75, y: 100 }, o2: { x: 128, y: 60 }, o3: { x: 22, y: 60 }, o4: { x: 98, y: 58 }, o5: { x: 52, y: 58 } },
  },
  {
    id: "four_out", name: "4-Out / 1-In", court: "half", ball: "o1",
    note: "Vier außen, die 5 am tiefen Block.",
    offense: { o1: { x: 75, y: 96 }, o2: { x: 126, y: 64 }, o3: { x: 24, y: 64 }, o4: { x: 138, y: 18 }, o5: { x: 56, y: 26 } },
  },
  {
    id: "blob_box", name: "Einwurf Grundlinie (Box)", court: "half", ball: "o1",
    note: "Einwurf unter dem eigenen Korb, Box-Aufstellung an Blocks und Ellbogen.",
    offense: { o1: { x: 96, y: -5 }, o2: { x: 98, y: 58 }, o3: { x: 52, y: 58 }, o4: { x: 98, y: 22 }, o5: { x: 52, y: 22 } },
  },
  {
    id: "press_inbound", name: "Einwurf gegen Presse", court: "full", ball: "o4",
    note: "Einwurf an der Grundlinie im Rückfeld, zwei Anspielstationen, zweite Reihe.",
    offense: { o4: { x: 104, y: 285 }, o1: { x: 100, y: 236 }, o2: { x: 132, y: 196 }, o5: { x: 40, y: 190 }, o3: { x: 36, y: 112 } },
  },
  {
    id: "fastbreak", name: "Fastbreak-Start", court: "full", ball: "o1",
    note: "Ball im Rückfeld, Flügel breit, zwei Trailer.",
    offense: { o1: { x: 75, y: 235 }, o2: { x: 125, y: 250 }, o3: { x: 25, y: 250 }, o4: { x: 90, y: 265 }, o5: { x: 60, y: 270 } },
  },
];

/** Positionen (inkl. automatischer Verteidigung) einer Vorlage */
export const templatePositions = (t) => withDefense(t.offense, t.court);
