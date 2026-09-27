/* Ball mit Höhe: Schatten bleibt am Boden, der Ball steigt mit z nach oben.
 * Im Flug: Flugbogen (gestrichelt) + Zielmarke – deutlich anders als Laufwege. */

import { BALL_COLOR } from "../court/constants.js";

const Z_SCREEN = 0.6; // Höhe → Bildschirmversatz nach oben
const ARC_SAMPLES = 20;

export function BallDefs() {
  return (
    <radialGradient id="ball-grad" cx="0.35" cy="0.3" r="0.75">
      <stop offset="0%" stopColor="#FFB36B" />
      <stop offset="60%" stopColor={BALL_COLOR} />
      <stop offset="100%" stopColor="#8E3F10" />
    </radialGradient>
  );
}

function arcPoint(ball, s) {
  const { fromPos: a, toPos: b } = ball;
  const arc = ball.lob ? 13 : Math.min(6, Math.hypot(b.x - a.x, b.y - a.y) * 0.06);
  const z = 3.5 + arc * 4 * s * (1 - s);
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s - z * Z_SCREEN };
}

/** Flugbahn eines Passes – unter den Spielerinnen zeichnen */
export function PassFlight({ ball }) {
  if (ball.state !== "flight") return null;
  const all = Array.from({ length: ARC_SAMPLES + 1 }, (_, i) => arcPoint(ball, i / ARC_SAMPLES));
  const done = all.filter((_, i) => i / ARC_SAMPLES <= ball.progress);
  const d = (pts) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return (
    <g pointerEvents="none">
      <path d={d(all)} fill="none" stroke="#FFE3C4" strokeWidth="0.8" strokeDasharray="1.4 1.8" opacity="0.7" />
      {done.length > 1 && <path d={d(done)} fill="none" stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />}
      <circle cx={ball.toPos.x} cy={ball.toPos.y} r="4.6" fill="none" stroke="#FFD166" strokeWidth="0.9" strokeDasharray="2 1.4" />
    </g>
  );
}

export default function Ball25D({ ball, onDown, interactive }) {
  const z = ball.z ?? 0;
  const shadowScale = Math.max(0.45, 1 - z / 26);
  return (
    <g onPointerDown={interactive ? (e) => onDown(e, "ball") : undefined}
      style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}>
      <ellipse cx={ball.x + 0.6} cy={ball.y + 0.8} rx={3.2 * shadowScale} ry={2.5 * shadowScale}
        fill="#000" opacity={0.38 * shadowScale} />
      <g transform={`translate(${ball.x},${ball.y - z * Z_SCREEN})`}>
        <circle r="3.3" fill="url(#ball-grad)" stroke="#3A2410" strokeWidth="0.55" />
        <path d="M -3.3 0 H 3.3 M 0 -3.3 V 3.3 M -2.3 -2.3 Q 0 0 -2.3 2.3 M 2.3 -2.3 Q 0 0 2.3 2.3"
          stroke="#3A2410" strokeWidth="0.4" fill="none" />
      </g>
    </g>
  );
}
