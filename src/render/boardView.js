/* Freimodus & Legacy-Presets → Render-Modell der 2,5D-Spielerinnen.
 * Ohne Aktionsdaten wird die Ausrichtung aus Situation und Bewegung abgeleitet:
 * Ballführerin schaut zum Korb, alle anderen zum Ball, in Bewegung dreht der
 * Körper in Laufrichtung. */

import { HOOPS } from "../court/constants.js";

const angle = (from, to, fallback) => {
  const dx = to.x - from.x, dy = to.y - from.y;
  return Math.hypot(dx, dy) > 0.5 ? Math.atan2(dy, dx) : fallback;
};

/**
 * @param ids       sichtbare Spielerinnen-IDs
 * @param pos       (id) → {x,y}
 * @param prevPos   (id) → {x,y} | null  (für Bewegungsrichtung, z. B. Legacy-Animation)
 * @param ball      {x,y}
 * @param holder    id | null
 */
export function boardPlayers({ ids, pos, prevPos, ball, holder, dt = 0.05 }) {
  const hoop = HOOPS.top;
  return ids.map((id) => {
    const p = pos(id);
    const team = id.startsWith("d") ? "defense" : "offense";
    const up = -Math.PI / 2;
    let gaze = id === holder ? angle(p, hoop, up) : angle(p, ball, team === "offense" ? up : Math.PI / 2);
    let body = gaze;
    let vx = 0, vy = 0, speed = 0;
    const q = prevPos?.(id);
    if (q) {
      vx = (p.x - q.x) / dt; vy = (p.y - q.y) / dt; speed = Math.hypot(vx, vy);
      if (speed > 12) body = Math.atan2(vy, vx);
    }
    return {
      id, team, label: team === "defense" ? `X${id[1]}` : id[1],
      x: p.x, y: p.y, vx, vy, speed, body, gaze,
      stance: "normal", hasBall: id === holder, trapped: false, trail: null,
    };
  });
}
