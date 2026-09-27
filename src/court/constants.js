/* Court-Koordinatensystem
   Einheit = 10 cm. Breite 0–150 (15 m). y = Tiefe ab oberer Grundlinie.
   Halbfeld: 0–140 (Korb oben), Ganzfeld: 0–280 (zweiter Korb unten).
   Winkel in Radiant, 0 = +x (rechts), positiv im Uhrzeigersinn (SVG, y nach unten). */

export const COURT_W = 150;
export const HALF_H = 140;
export const FULL_H = 280;
export const HOOP_Y = 15.75;

export const courtHeight = (courtType) => (courtType === "half" ? HALF_H : FULL_H);

/** Korbmittelpunkte (top = oberer Korb, bottom = unterer Korb im Ganzfeld) */
export const HOOPS = {
  top: { x: COURT_W / 2, y: HOOP_Y },
  bottom: { x: COURT_W / 2, y: FULL_H - HOOP_Y },
};

export const CHALK = "#EDE8DC";
export const OFF_COLOR = "#F2762E";
export const DEF_COLOR = "#5B8BB2";
export const BALL_COLOR = "#D96A23";
export const REC_COLOR = "#E0463A";
export const TRAP_COLOR = "#E0463A";
export const OPEN_COLOR = "#5FD38D";
export const UI_BG = "#14181C";

export const OFF = ["o1", "o2", "o3", "o4", "o5"];
export const DEF = ["d1", "d2", "d3", "d4", "d5"];
