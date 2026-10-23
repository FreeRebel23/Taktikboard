/* Ebenen des Spielerinnen-Modus: eigener Laufweg, Zielfigur, Signal-Linie, "DU". */

import { useView } from "./view.js";
import { Pill } from "./PlayOverlays.jsx";
import { PlayerGhost, TEAM_STYLE } from "./Player25D.jsx";

const pathD = (pts) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

/** Eigener Laufweg im aktuellen Beat – kräftig, mit Pfeil */
export function MyPath({ points, team }) {
  if (!points || points.length < 2) return null;
  const c = TEAM_STYLE[team].light;
  return (
    <g pointerEvents="none">
      <path d={pathD(points)} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathD(points)} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arrow)" />
    </g>
  );
}

/** Zielmarke mit erwarteter Körperhaltung */
export function TargetGhost({ ghost }) {
  const { sv } = useView();
  if (!ghost) return null;
  const off = sv(0, 13.5);
  return (
    <g pointerEvents="none">
      <PlayerGhost p={ghost} />
      <Pill x={ghost.x + off.x} y={ghost.y + off.y} text="ZIEL" color={TEAM_STYLE[ghost.team].light} size={3.4} />
    </g>
  );
}

/** Blicklinie zum Signal: Wen oder was soll ich beobachten? */
export function WatchLine({ from, to, label }) {
  const { sv } = useView();
  if (!from || !to) return null;
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  if (d < 6) return null;
  const off = sv(0, -15);
  // Linie beginnt/endet außerhalb der Figuren
  const ux = (to.x - from.x) / d, uy = (to.y - from.y) / d;
  const a = { x: from.x + ux * 9, y: from.y + uy * 9 };
  const b = { x: to.x - ux * 10, y: to.y - uy * 10 };
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (
    <g pointerEvents="none">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFFFFF" strokeWidth="0.9" strokeDasharray="1.6 1.8" opacity="0.85" />
      {/* Auge auf der Linie */}
      <g transform={`translate(${m.x},${m.y})`}>
        <ellipse rx="3.4" ry="2" fill="#14181C" stroke="#FFFFFF" strokeWidth="0.7" />
        <circle r="1" fill="#FFFFFF" />
      </g>
      <circle cx={to.x} cy={to.y} r="11" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2.4 1.8"
        className="tb-spin" style={{ transformOrigin: `${to.x}px ${to.y}px` }} />
      {label && <Pill x={to.x + off.x} y={to.y + off.y} text={label} color="#FFFFFF" size={3.4} />}
    </g>
  );
}

/** "DU"-Markierung unter der eigenen Figur */
export function MeLabel({ p }) {
  const { sv } = useView();
  if (!p) return null;
  const off = sv(0, 13.5);
  return <Pill x={p.x + off.x} y={p.y + off.y} text="DU" color="#FFFFFF" size={3.6} />;
}
