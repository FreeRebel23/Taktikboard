/* 2,5D-Spielerin in Vogelperspektive.
 *
 * Schichten (von unten nach oben):
 *   Schatten (Licht von oben links) → Bodenring → Blickkegel → Bewegungspfeil
 *   → Arme (Haltung) → Oberkörper (Schulterachse = Körperausrichtung)
 *   → Kopf mit Nummer (leicht angehoben, bleibt immer lesbar).
 *
 * Erkennbar sind damit: Körperausrichtung (Schultern + Brustmarke), Blickrichtung
 * (Kegel), Bewegungsrichtung (Pfeil am Boden + Spur), Team, Ballbesitz (Ring),
 * defensive Haltung (Arme: On-Ball, Trap, Einwurf, Deny) und Screens (Balken).
 */

import { OFF_COLOR, DEF_COLOR } from "../court/constants.js";
import { useView } from "./view.js";

const DEG = 180 / Math.PI;
const LIFT_BODY = -1.0;  // Oberkörper leicht angehoben (Pseudo-Perspektive)
const LIFT_HEAD = -1.9;

export const TEAM_STYLE = {
  offense: { base: OFF_COLOR, dark: "#A9481A", light: "#FFB27A", ink: "#FFF7EC", id: "off" },
  defense: { base: DEF_COLOR, dark: "#2F5677", light: "#A9C8E2", ink: "#F3F8FC", id: "def" },
};

// Arme im Körper-Koordinatensystem (x = nach vorne, y = seitlich)
const ARMS = {
  "on-ball": [[1, -5.4, 6.4, -7.2], [1, 5.4, 6.4, 7.2]],
  trap: [[0.8, -5.6, 4.6, -10.8], [0.8, 5.6, 4.6, 10.8]],
  "arms-up": [[1, -5.2, 5.2, -6.2], [1, 5.2, 5.2, 6.2]],
  deny: [[1, -5.4, 7.4, -6.8]],
};

export function PlayerDefs() {
  return (
    <>
      <radialGradient id="pl-shadow">
        <stop offset="0%" stopColor="#000" stopOpacity="0.42" />
        <stop offset="70%" stopColor="#000" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      {Object.values(TEAM_STYLE).map((s) => (
        <g key={s.id}>
          <linearGradient id={`torso-${s.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={s.light} />
            <stop offset="55%" stopColor={s.base} />
            <stop offset="100%" stopColor={s.dark} />
          </linearGradient>
          <radialGradient id={`head-${s.id}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stopColor={s.base} />
            <stop offset="100%" stopColor={s.dark} />
          </radialGradient>
          <radialGradient id={`cone-${s.id}`} cx="0" cy="0.5" r="1" fx="0" fy="0.5">
            <stop offset="0%" stopColor={s.light} stopOpacity="0.62" />
            <stop offset="100%" stopColor={s.light} stopOpacity="0" />
          </radialGradient>
        </g>
      ))}
    </>
  );
}

/** Bewegungsspur am Boden (absolute Koordinaten) – unter allen Spielerinnen zeichnen */
export function PlayerTrail({ p }) {
  if (!p.trail || p.trail.length < 2) return null;
  const s = TEAM_STYLE[p.team];
  const pts = p.trail;
  return (
    <g pointerEvents="none">
      {pts.slice(1).map((q, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={q.x} y2={q.y}
          stroke={s.base} strokeWidth={3.4 - i * 0.32} strokeLinecap="round"
          opacity={0.32 * (1 - i / pts.length)} />
      ))}
    </g>
  );
}

export default function Player25D({ p, onDown, interactive, dim = false }) {
  const { sv, textRot } = useView();
  const s = TEAM_STYLE[p.team];
  const shadow = sv(1.8, 2.4);
  const liftB = sv(0, LIFT_BODY);
  const liftH = sv(0, LIFT_HEAD);
  const bodyDeg = p.body * DEG;
  const gazeDeg = p.gaze * DEG;
  const moving = p.speed > 6;
  const moveDeg = Math.atan2(p.vy ?? 0, p.vx ?? 0) * DEG;
  const arms = ARMS[p.stance];
  const long = p.label.length > 1;

  return (
    <g transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.55 : 1}
      onPointerDown={interactive ? (e) => onDown(e, p.id) : undefined}
      style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}>
      {/* Schatten */}
      <circle cx={shadow.x} cy={shadow.y} r="7.4" fill="url(#pl-shadow)" />

      {/* Ballbesitz / Trap-Ring am Boden */}
      {p.hasBall && (
        <circle r="8.6" fill="none" stroke={p.trapped ? "#E0463A" : "#FFD166"} strokeWidth="1.2"
          className={p.trapped ? "tb-pulse" : undefined} />
      )}

      {/* Bodenring */}
      <circle r="6.3" fill={s.base} fillOpacity="0.16" stroke={s.base} strokeWidth="0.9" strokeOpacity="0.9" />

      {/* Blickkegel */}
      <g transform={`rotate(${gazeDeg})`} pointerEvents="none">
        <path d="M 0 0 L 17 -7.6 A 18.6 18.6 0 0 1 17 7.6 Z" fill={`url(#cone-${s.id})`} />
      </g>

      {/* Bewegungsrichtung */}
      {moving && (
        <g transform={`rotate(${moveDeg})`} opacity={Math.min(1, p.speed / 30)} pointerEvents="none">
          <path d="M 7.6 -2.4 L 10.6 0 L 7.6 2.4" fill="none" stroke={s.light} strokeWidth="1.1"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}

      {/* Oberkörper */}
      <g transform={`translate(${liftB.x},${liftB.y}) rotate(${bodyDeg})`}>
        {arms?.map(([x1, y1, x2, y2], i) => (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.dark} strokeWidth="2.2" strokeLinecap="round" />
            <circle cx={x2} cy={y2} r="1.25" fill={s.light} stroke={s.dark} strokeWidth="0.4" />
          </g>
        ))}
        <rect x="-2.5" y="-6.6" width="5" height="13.2" rx="2.5"
          fill={`url(#torso-${s.id})`} stroke="#1B1410" strokeWidth="0.55" />
        {/* Brustmarke = vorne */}
        <path d="M 3 -2.9 L 7 0 L 3 2.9 Z" fill={s.light} stroke="#1B1410" strokeWidth="0.45" strokeLinejoin="round" />
        {p.stance === "screen" && (
          <line x1="4.4" y1="-7" x2="4.4" y2="7" stroke="#EDE8DC" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </g>

      {/* Kopf + Nummer (nicht rotiert → immer lesbar) */}
      <g transform={`translate(${liftH.x},${liftH.y}) rotate(${textRot})`}>
        <circle r="3.6" fill={`url(#head-${s.id})`} stroke="#1B1410" strokeWidth="0.55" />
        <text textAnchor="middle" dy={long ? 1.2 : 1.6} fontSize={long ? 3.3 : 4.6} fontWeight="800"
          fill={s.ink} style={{ userSelect: "none", pointerEvents: "none", fontFamily: "inherit" }}>
          {p.label}
        </text>
      </g>
    </g>
  );
}
