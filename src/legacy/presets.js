/* LEGACY – Keyframe-Presets (Positions-Interpolation über t = 0..1).
   Bleiben als Bestand erhalten. Neue Spielzüge nutzen das Play-Modell in src/play/. */

export const DEFAULT_HALF = {
  o1: { x: 75, y: 95 }, o2: { x: 122, y: 72 }, o3: { x: 28, y: 72 },
  o4: { x: 118, y: 30 }, o5: { x: 52, y: 30 },
  d1: { x: 75, y: 80 }, d2: { x: 108, y: 60 }, d3: { x: 42, y: 60 },
  d4: { x: 105, y: 30 }, d5: { x: 60, y: 34 },
  ball: { x: 81, y: 91 },
};

export const DEFAULT_FULL = {
  o1: { x: 75, y: 200 }, o2: { x: 120, y: 215 }, o3: { x: 30, y: 215 },
  o4: { x: 95, y: 240 }, o5: { x: 55, y: 240 },
  d1: { x: 75, y: 95 }, d2: { x: 115, y: 70 }, d3: { x: 35, y: 70 },
  d4: { x: 100, y: 35 }, d5: { x: 55, y: 35 },
  ball: { x: 81, y: 196 },
};

export const PRESETS = [
  {
    id: "five_out", name: "5-Out Grundaufstellung", court: "half", showDef: false,
    note: "Maximaler Raum: alle fünf Positionen hinter der Dreierlinie. Basis für Cuts und Drives.",
    pos: {
      o1: { x: 75, y: 96 }, o2: { x: 124, y: 70 }, o3: { x: 26, y: 70 },
      o4: { x: 140, y: 16 }, o5: { x: 10, y: 16 }, ball: { x: 81, y: 92 },
    },
  },
  {
    id: "pnr_top", name: "Pick & Roll – Mitte", court: "half", showDef: false,
    note: "5 stellt den Block oben am Perimeter, 1 zieht über den Block nach rechts, 5 rollt zum Korb – Pocket-Pass auf den Roller.",
    pos: {
      o1: { x: 75, y: 98 }, o2: { x: 140, y: 16 }, o3: { x: 10, y: 16 },
      o4: { x: 28, y: 68 }, o5: { x: 62, y: 62 }, ball: { x: 80, y: 94 },
    },
    anim: {
      o5: [{ t: 0, x: 62, y: 62 }, { t: 0.3, x: 84, y: 92 }, { t: 0.55, x: 84, y: 92 }, { t: 1, x: 62, y: 34 }],
      o1: [{ t: 0, x: 75, y: 98 }, { t: 0.35, x: 75, y: 98 }, { t: 0.6, x: 95, y: 85 }, { t: 0.8, x: 102, y: 62 }, { t: 1, x: 94, y: 46 }],
      ball: [{ t: 0, x: 80, y: 94 }, { t: 0.35, x: 80, y: 94 }, { t: 0.6, x: 100, y: 82 }, { t: 0.8, x: 107, y: 60 }, { t: 0.9, x: 99, y: 48 }, { t: 1, x: 66, y: 36 }],
      o4: [{ t: 0, x: 28, y: 68 }, { t: 1, x: 22, y: 82 }],
    },
  },
  {
    id: "pnr_wing", name: "Pick & Roll – Flügel", court: "half", showDef: false,
    note: "Side-P&R rechts: 5 blockt am Flügel, 1 zieht zur Mitte, 5 rollt – Kick-out in die schwache Ecke bleibt offen.",
    pos: {
      o1: { x: 118, y: 75 }, o2: { x: 75, y: 98 }, o3: { x: 12, y: 70 },
      o4: { x: 10, y: 16 }, o5: { x: 95, y: 48 }, ball: { x: 123, y: 71 },
    },
    anim: {
      o5: [{ t: 0, x: 95, y: 48 }, { t: 0.3, x: 113, y: 82 }, { t: 0.5, x: 113, y: 82 }, { t: 1, x: 88, y: 28 }],
      o1: [{ t: 0, x: 118, y: 75 }, { t: 0.35, x: 118, y: 75 }, { t: 0.6, x: 98, y: 82 }, { t: 0.8, x: 82, y: 62 }, { t: 1, x: 78, y: 44 }],
      ball: [{ t: 0, x: 123, y: 71 }, { t: 0.35, x: 123, y: 71 }, { t: 0.6, x: 102, y: 80 }, { t: 0.82, x: 84, y: 60 }, { t: 0.9, x: 80, y: 46 }, { t: 1, x: 14, y: 20 }],
      o2: [{ t: 0, x: 75, y: 98 }, { t: 0.5, x: 75, y: 98 }, { t: 1, x: 115, y: 72 }],
      o3: [{ t: 0, x: 12, y: 70 }, { t: 0.6, x: 12, y: 70 }, { t: 1, x: 12, y: 55 }],
    },
  },
  {
    id: "triangle", name: "Triangle Offense", court: "half", showDef: false,
    note: "Sideline-Triangle rechts: Post (5) – Ecke (2) – Flügel (3). Pass in die Ecke, 3 schneidet über den Post, 1 füllt den Flügel nach.",
    pos: {
      o1: { x: 60, y: 92 }, o2: { x: 138, y: 14 }, o3: { x: 120, y: 68 },
      o4: { x: 52, y: 58 }, o5: { x: 98, y: 25 }, ball: { x: 124, y: 64 },
    },
    shapes: [{ type: "poly", points: [[98, 25], [138, 14], [120, 68]] }],
    anim: {
      ball: [{ t: 0, x: 124, y: 64 }, { t: 0.2, x: 124, y: 64 }, { t: 0.35, x: 136, y: 18 }, { t: 1, x: 136, y: 18 }],
      o3: [{ t: 0, x: 120, y: 68 }, { t: 0.35, x: 120, y: 68 }, { t: 0.6, x: 95, y: 35 }, { t: 1, x: 32, y: 20 }],
      o1: [{ t: 0, x: 60, y: 92 }, { t: 0.45, x: 60, y: 92 }, { t: 1, x: 114, y: 66 }],
      o4: [{ t: 0, x: 52, y: 58 }, { t: 0.5, x: 52, y: 58 }, { t: 1, x: 70, y: 90 }],
      o5: [{ t: 0, x: 98, y: 25 }, { t: 0.6, x: 98, y: 25 }, { t: 1, x: 93, y: 28 }],
    },
  },
  {
    id: "horns", name: "Horns", court: "half", showDef: false,
    note: "Beide Bigs an den Ellbogen, Schützen in den Ecken. 5 blockt und rollt zum Korb, 4 poppt nach außen – zwei Optionen aus einem Set.",
    pos: {
      o1: { x: 75, y: 98 }, o2: { x: 140, y: 16 }, o3: { x: 10, y: 16 },
      o4: { x: 54, y: 60 }, o5: { x: 96, y: 60 }, ball: { x: 80, y: 94 },
    },
    anim: {
      o5: [{ t: 0, x: 96, y: 60 }, { t: 0.3, x: 83, y: 92 }, { t: 0.5, x: 83, y: 92 }, { t: 1, x: 68, y: 32 }],
      o1: [{ t: 0, x: 75, y: 98 }, { t: 0.35, x: 75, y: 98 }, { t: 0.6, x: 95, y: 84 }, { t: 0.85, x: 98, y: 60 }, { t: 1, x: 90, y: 48 }],
      o4: [{ t: 0, x: 54, y: 60 }, { t: 0.5, x: 54, y: 60 }, { t: 1, x: 44, y: 86 }],
      ball: [{ t: 0, x: 80, y: 94 }, { t: 0.35, x: 80, y: 94 }, { t: 0.6, x: 100, y: 82 }, { t: 0.85, x: 103, y: 58 }, { t: 0.92, x: 94, y: 50 }, { t: 1, x: 70, y: 34 }],
    },
  },
  {
    id: "fastbreak3", name: "Fast Break – 3 Bahnen", court: "full", showDef: false,
    note: "Klassischer 3-Bahnen-Break: Ball in der Mitte, Flügel sprinten breit in die Bahnen, Abschluss über die rechte Seite. 4 läuft als Trailer, 5 sichert.",
    pos: {
      o1: { x: 75, y: 235 }, o2: { x: 125, y: 250 }, o3: { x: 25, y: 250 },
      o4: { x: 90, y: 265 }, o5: { x: 60, y: 270 }, ball: { x: 80, y: 231 },
    },
    anim: {
      o1: [{ t: 0, x: 75, y: 235 }, { t: 0.5, x: 75, y: 140 }, { t: 0.8, x: 75, y: 75 }, { t: 1, x: 75, y: 58 }],
      o2: [{ t: 0, x: 125, y: 250 }, { t: 0.45, x: 136, y: 150 }, { t: 0.8, x: 136, y: 60 }, { t: 1, x: 112, y: 30 }],
      o3: [{ t: 0, x: 25, y: 250 }, { t: 0.45, x: 14, y: 150 }, { t: 0.8, x: 14, y: 60 }, { t: 1, x: 38, y: 30 }],
      o4: [{ t: 0, x: 90, y: 265 }, { t: 0.6, x: 95, y: 150 }, { t: 1, x: 95, y: 72 }],
      o5: [{ t: 0, x: 60, y: 270 }, { t: 1, x: 75, y: 155 }],
      ball: [{ t: 0, x: 80, y: 231 }, { t: 0.5, x: 80, y: 138 }, { t: 0.82, x: 80, y: 74 }, { t: 1, x: 110, y: 32 }],
    },
  },
  {
    id: "fastbreak5", name: "Primärbreak – 5 Bahnen", court: "full", showDef: false,
    note: "Rebound durch 5, Outlet auf 1 an der Seitenlinie. 1 pusht die Mitte, 2 und 3 besetzen die Ecken, 4 läuft als Rim-Runner zum Ring, 5 bleibt Safety.",
    pos: {
      o1: { x: 120, y: 235 }, o2: { x: 135, y: 250 }, o3: { x: 20, y: 250 },
      o4: { x: 60, y: 265 }, o5: { x: 75, y: 262 }, ball: { x: 79, y: 259 },
    },
    anim: {
      ball: [{ t: 0, x: 79, y: 259 }, { t: 0.15, x: 118, y: 233 }, { t: 0.5, x: 84, y: 180 }, { t: 0.75, x: 80, y: 92 }, { t: 0.85, x: 78, y: 62 }, { t: 1, x: 136, y: 32 }],
      o1: [{ t: 0, x: 120, y: 235 }, { t: 0.15, x: 120, y: 235 }, { t: 0.5, x: 85, y: 180 }, { t: 0.78, x: 80, y: 92 }, { t: 1, x: 76, y: 58 }],
      o2: [{ t: 0, x: 135, y: 250 }, { t: 0.5, x: 138, y: 120 }, { t: 1, x: 138, y: 28 }],
      o3: [{ t: 0, x: 20, y: 250 }, { t: 0.5, x: 12, y: 120 }, { t: 1, x: 12, y: 26 }],
      o4: [{ t: 0, x: 60, y: 265 }, { t: 0.55, x: 70, y: 140 }, { t: 1, x: 70, y: 42 }],
      o5: [{ t: 0, x: 75, y: 262 }, { t: 0.3, x: 75, y: 262 }, { t: 1, x: 75, y: 162 }],
    },
  },
  {
    id: "zone23", name: "2-3 Zone (Defense)", court: "half", showDef: true,
    note: "Zonenverschiebung bei Ballbewegung: Swing von oben über den Flügel in die Ecke – die Zone rotiert mit, 4 schließt die Ecke, 5 sichert die Zone unter dem Korb.",
    pos: {
      o1: { x: 75, y: 95 }, o2: { x: 125, y: 72 }, o3: { x: 25, y: 72 },
      o4: { x: 138, y: 18 }, o5: { x: 12, y: 18 }, ball: { x: 80, y: 91 },
      d1: { x: 52, y: 70 }, d2: { x: 98, y: 70 }, d3: { x: 22, y: 34 },
      d4: { x: 128, y: 34 }, d5: { x: 75, y: 26 },
    },
    anim: {
      ball: [{ t: 0, x: 80, y: 91 }, { t: 0.15, x: 80, y: 91 }, { t: 0.35, x: 122, y: 70 }, { t: 0.6, x: 122, y: 70 }, { t: 0.78, x: 136, y: 22 }, { t: 1, x: 136, y: 22 }],
      d1: [{ t: 0, x: 52, y: 70 }, { t: 0.45, x: 68, y: 74 }, { t: 1, x: 82, y: 72 }],
      d2: [{ t: 0, x: 98, y: 70 }, { t: 0.45, x: 113, y: 66 }, { t: 1, x: 104, y: 56 }],
      d3: [{ t: 0, x: 22, y: 34 }, { t: 0.45, x: 36, y: 32 }, { t: 1, x: 58, y: 30 }],
      d4: [{ t: 0, x: 128, y: 34 }, { t: 0.45, x: 126, y: 36 }, { t: 1, x: 132, y: 24 }],
      d5: [{ t: 0, x: 75, y: 26 }, { t: 0.45, x: 83, y: 26 }, { t: 1, x: 97, y: 22 }],
    },
  },
];

/** Keyframe-Interpolation mit Smoothstep (Legacy) */
export function interpKF(kfs, t) {
  if (t <= kfs[0].t) return kfs[0];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const u = (t - a.t) / span;
      const s = u * u * (3 - 2 * u);
      return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
    }
  }
  return kfs[kfs.length - 1];
}
