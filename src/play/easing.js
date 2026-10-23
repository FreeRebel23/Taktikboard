/* Bewegungsprofile: bilden normierte Zeit u ∈ [0,1] auf normierten Weg s ∈ [0,1] ab.
   Spieler beschleunigen und bremsen (Trapez-Geschwindigkeitsprofil),
   der Ball fliegt nahezu mit konstanter Geschwindigkeit. */

export const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);

export const smoothstep = (u) => { u = clamp01(u); return u * u * (3 - 2 * u); };

/**
 * Trapezförmiges Geschwindigkeitsprofil: Beschleunigung über Anteil `a`,
 * konstante Geschwindigkeit, Abbremsen über Anteil `d`. Weg ist stetig und
 * endet exakt bei 1.
 */
export function trapezoid(u, a, d) {
  u = clamp01(u);
  const vmax = 1 / (1 - a / 2 - d / 2);
  if (u < a) return (vmax * u * u) / (2 * a);
  if (u <= 1 - d) return vmax * (a / 2 + (u - a));
  const w = 1 - u;
  return 1 - (vmax * w * w) / (2 * d);
}

export const PROFILES = {
  // Normale Bewegung: weich an- und auslaufen
  move: (u) => trapezoid(u, 0.4, 0.4),
  // Sprint: explosiver Antritt, lange Höchstgeschwindigkeit, kurzes Abbremsen
  sprint: (u) => trapezoid(u, 0.12, 0.2),
  // Cut: schneller Antritt, harter Stopp
  cut: (u) => trapezoid(u, 0.15, 0.15),
  // Dribbling: kontrolliert
  dribble: (u) => trapezoid(u, 0.3, 0.3),
  // Verteidigerin schließt aggressiv (Closeout/Trap): schnell rein, kontrolliert abbremsen
  close: (u) => trapezoid(u, 0.12, 0.45),
  // Pass: fast konstante Ballgeschwindigkeit, minimal auslaufend
  pass: (u) => { u = clamp01(u); return u * (1.2 - 0.2 * u); },
  linear: (u) => clamp01(u),
};
