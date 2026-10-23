/* Ball mit Höhe: Schatten bleibt am Boden, der Ball steigt mit z nach oben.
 * Passarten ohne Text erkennbar:
 *   Direktpass – flacher, gerader Flug, Tempostreifen hinter dem Ball
 *   Bodenpass  – V-förmige Bahn bis zum Boden, Aufsetzpunkt als Ring am Boden
 *   Lob        – hoher Bogen, Ball wird mit der Höhe größer, Schatten bleibt klein am Boden
 * Flugbahnen sind immer gestrichelt (Ball), Laufwege durchgezogen (Bewegung). */

import { BALL_COLOR } from "../court/constants.js";
import { useView } from "./view.js";
import { flightHeight, BOUNCE_AT } from "../play/ballFlight.js";

const Z_SCREEN = 0.85; // Höhe → Bildschirmversatz nach oben
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

function arcPoint(ball, s, sv) {
  const { fromPos: a, toPos: b } = ball;
  const z = flightHeight(ball.kind, s, Math.hypot(b.x - a.x, b.y - a.y));
  const lift = sv(0, -z * Z_SCREEN);
  return { x: a.x + (b.x - a.x) * s + lift.x, y: a.y + (b.y - a.y) * s + lift.y };
}

/** Flugbahn eines Passes – unter den Spielerinnen zeichnen */
export function PassFlight({ ball }) {
  const { sv } = useView();
  if (ball.state !== "flight") return null;
  const all = Array.from({ length: ARC_SAMPLES + 1 }, (_, i) => arcPoint(ball, i / ARC_SAMPLES, sv));
  const done = all.filter((_, i) => i / ARC_SAMPLES <= ball.progress);
  const d = (pts) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const bounce = ball.kind === "bounce"
    ? { x: ball.fromPos.x + (ball.toPos.x - ball.fromPos.x) * BOUNCE_AT, y: ball.fromPos.y + (ball.toPos.y - ball.fromPos.y) * BOUNCE_AT }
    : null;
  const hit = bounce ? Math.max(0, 1 - Math.abs(ball.progress - BOUNCE_AT) / 0.12) : 0; // Aufprall-Moment
  return (
    <g pointerEvents="none">
      {ball.kind === "lob" && (
        // Bodenlinie unter dem Bogen: zeigt, wie hoch der Ball über die Verteidigung geht
        <line x1={ball.fromPos.x} y1={ball.fromPos.y} x2={ball.toPos.x} y2={ball.toPos.y} stroke="#000" strokeWidth="0.6" strokeDasharray="0.8 1.6" opacity="0.35" />
      )}
      <path d={d(all)} fill="none" stroke="#FFE3C4" strokeWidth={ball.kind === "chest" ? 1 : 0.8} strokeDasharray={ball.kind === "chest" ? "3 1.2" : "1.4 1.8"} opacity="0.75" />
      {done.length > 1 && <path d={d(done)} fill="none" stroke="#FFD166" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />}
      {bounce && (
        <g>
          <circle cx={bounce.x} cy={bounce.y} r={2.2 + hit * 2.5} fill="none" stroke="#FFE3C4" strokeWidth={0.8 + hit * 0.6} opacity={0.55 + hit * 0.45} />
          <circle cx={bounce.x} cy={bounce.y} r="0.8" fill="#FFE3C4" opacity="0.85" />
        </g>
      )}
      <circle cx={ball.toPos.x} cy={ball.toPos.y} r="4.6" fill="none" stroke="#FFD166" strokeWidth="0.9" strokeDasharray="2 1.4" />
    </g>
  );
}

/** Tempostreifen hinter einem harten Direktpass (Länge ~ Geschwindigkeit) */
function SpeedStreaks({ ball, lift }) {
  if (ball.state !== "flight" || ball.kind !== "chest" || !(ball.speed > 6)) return null;
  const dx = ball.toPos.x - ball.fromPos.x, dy = ball.toPos.y - ball.fromPos.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const len = Math.min(14, (ball.speed - 4) * 1.1);
  const cx = ball.x + lift.x, cy = ball.y + lift.y;
  return (
    <g pointerEvents="none" opacity="0.8">
      {[-1.6, 0, 1.6].map((o, i) => (
        <line key={i} x1={cx - ux * 3.6 + nx * o} y1={cy - uy * 3.6 + ny * o}
          x2={cx - ux * (3.6 + len * (i === 1 ? 1 : 0.65)) + nx * o} y2={cy - uy * (3.6 + len * (i === 1 ? 1 : 0.65)) + ny * o}
          stroke="#FFE3C4" strokeWidth={i === 1 ? 0.9 : 0.6} strokeLinecap="round" />
      ))}
    </g>
  );
}

export default function Ball25D({ ball, onDown, interactive }) {
  const { sv, figScale = 1 } = useView();
  const z = ball.z ?? 0;
  const sh = sv(0.6, 0.8);
  const lift = sv(0, -z * Z_SCREEN);
  const shadowScale = Math.max(0.35, 1 - z / 30);
  const grow = 1 + Math.max(0, z - 4) / 40; // höher = näher an der Kamera
  return (
    <g onPointerDown={interactive ? (e) => onDown(e, "ball") : undefined}
      style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}>
      <circle cx={ball.x + sh.x} cy={ball.y + sh.y} r={2.9 * shadowScale}
        fill="#000" opacity={0.38 * shadowScale} />
      <SpeedStreaks ball={ball} lift={lift} />
      <g transform={`translate(${ball.x + lift.x},${ball.y + lift.y}) scale(${figScale * grow})`}>
        <circle r="3.3" fill="url(#ball-grad)" stroke="#3A2410" strokeWidth="0.55" />
        <path d="M -3.3 0 H 3.3 M 0 -3.3 V 3.3 M -2.3 -2.3 Q 0 0 -2.3 2.3 M 2.3 -2.3 Q 0 0 2.3 2.3"
          stroke="#3A2410" strokeWidth="0.4" fill="none" />
      </g>
    </g>
  );
}
