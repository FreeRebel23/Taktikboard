/* Mannschaftsverteidigung sichtbar machen (Ebene unter den Figuren + Beschriftungen).
 *
 * Visuelle Sprache:
 *   Zuständigkeit   – Linie Verteidigerin → Angreiferin: durchgezogen = am Ball,
 *                     dünn = Deny/Lücke, gepunktet = Help-Seite / im Raum
 *   Zustand         – kleine Plakette unter der Verteidigerin (DRUCK, DENY, HELP …),
 *                     Farbe nach Aufgabe: rot = Druck, gelb = Hilfe/Recover, blau = zustellen, grau = absichern
 *   Zone            – getönte Räume mit Namen; Raum der Ballverteidigerin kräftiger
 *   Übergabe        – Bogen von der alten zur neuen Verantwortlichen + „ÜBERGABE“
 */

import { DEF_COLOR } from "../court/constants.js";
import { DEFENSE_STATES } from "../play/teamDefense.js";
import { Pill } from "./PlayOverlays.jsx";
import { useView } from "./view.js";

export const STATE_COLOR = {
  ball: "#E0463A", closeout: "#FF7A52",
  help: "#FFD166", rotate: "#FFD166", recover: "#FFB547",
  deny: "#7FB2DE", gap: "#A9C7E2", zoneman: "#7FB2DE",
  helpside: "#94A6B5", zone: "#94A6B5",
};
const INK = { ball: "#fff", closeout: "#1B0F0A" };

/** Zonenräume – unter allem anderen zeichnen */
export function ZoneAreas({ zones, focus }) {
  if (!zones?.length) return null;
  return (
    <g pointerEvents="none">
      {zones.map((z) => {
        const strong = z.state === "ball" || z.state === "closeout" || focus?.has(z.defender);
        const { x0, y0, x1, y1 } = z.area;
        return (
          <g key={z.id}>
            <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="3"
              fill={DEF_COLOR} fillOpacity={strong ? 0.16 : 0.05}
              stroke={DEF_COLOR} strokeOpacity={strong ? 0.75 : 0} strokeWidth="0.7" strokeDasharray="3 2" />
          </g>
        );
      })}
    </g>
  );
}

function Arc({ a, b, color, opacity }) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / L) * L * 0.25, y: my + (dx / L) * L * 0.25 };
  return <path d={`M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`} fill="none" stroke={color} strokeWidth="1.3"
    strokeDasharray="2.4 1.6" opacity={opacity} markerEnd="url(#arrow)" />;
}

/** Zuständigkeiten, Zustände und Übergaben */
export default function DefenseLayer({ frame, focus = null, labels = "all", me = null }) {
  const { sv } = useView();
  const P = frame.players;
  const defenders = Object.values(P).filter((p) => p.defense);
  if (!defenders.length) return null;
  const shown = (id) => !focus || focus.has(id);
  const below = sv(0, 9.5), above = sv(0, -11);
  return (
    <g pointerEvents="none">
      {defenders.map((p) => {
        const s = p.defense.state;
        const t = p.defense.resp && P[p.defense.resp];
        if (!t || !shown(p.id) || s === "zone") return null;
        const onBall = s === "ball" || s === "closeout";
        const dotted = s === "helpside" || s === "zoneman" || s === "recover";
        return (
          <line key={`r-${p.id}`} x1={p.x} y1={p.y} x2={t.x} y2={t.y} stroke={STATE_COLOR[s] ?? DEF_COLOR}
            strokeWidth={onBall ? 1.4 : 0.9} strokeDasharray={dotted ? "0.9 1.6" : undefined}
            strokeLinecap="round" opacity={onBall ? 0.9 : 0.7} />
        );
      })}
      {(frame.handovers ?? []).map((h, i) => {
        const a = P[h.from], b = P[h.to], att = P[h.attacker];
        if (!a || !b || !att) return null;
        const op = Math.max(0, 1 - h.age / 1.6);
        return (
          <g key={`h-${i}`} opacity={op}>
            <Arc a={a} b={b} color="#FFD166" opacity={0.95} />
            <Pill x={att.x} y={att.y - 12} text="ÜBERGABE" color="#FFD166" size={3.3} />
          </g>
        );
      })}
      {labels !== "none" && defenders.filter((p) => shown(p.id)).map((p) => {
        const s = p.defense.state;
        const meta = DEFENSE_STATES[s];
        if (!meta || (labels === "active" && (s === "zone" || s === "helpside"))) return null;
        const off = p.id === me ? above : below; // unter der eigenen Figur steht „DU“
        return <Pill key={`s-${p.id}`} x={p.x + off.x} y={p.y + off.y} text={meta.label} color={STATE_COLOR[s] ?? DEF_COLOR} ink={INK[s] ?? "#14181C"} size={3} />;
      })}
    </g>
  );
}
