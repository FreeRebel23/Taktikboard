/* Taktische Ebenen eines Frames: Trap, Passwege, Presslinien, Matchups,
 * Fokus-Hervorhebungen und die Laufweg-Notation des aktuellen Beats. */

import { CHALK, COURT_W, OFF_COLOR, DEF_COLOR, TRAP_COLOR, OPEN_COLOR } from "../court/constants.js";
import { useView } from "./view.js";

const teamColor = (team) => (team === "defense" ? DEF_COLOR : OFF_COLOR);
const pathD = (pts) => pts.map((p, i) => `${i ? "L" : "M"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

/** Beschriftung, immer aufrecht. anchor "start"/"end": x ist die linke/rechte Kante (Bildschirm). */
function Pill({ x, y, text, color, ink = "#16110C", size = 4.2, anchor = "middle" }) {
  const { textRot } = useView();
  const w = text.length * size * 0.68 + 4; // fette Versalien
  const x0 = anchor === "start" ? 0 : anchor === "end" ? -w : -w / 2;
  return (
    <g transform={`translate(${x},${y}) rotate(${textRot})`} pointerEvents="none">
      <rect x={x0} y={-size * 0.8} width={w} height={size * 1.6} rx={size * 0.8} fill={color} />
      <text x={x0 + w / 2} textAnchor="middle" dy={size * 0.36} fontSize={size} fontWeight="800" fill={ink}
        style={{ letterSpacing: "0.04em", fontFamily: "inherit" }}>{text}</text>
    </g>
  );
}

/** Trap: Keil zwischen den beiden Trapperinnen – die abgeschnittenen Richtungen */
export function TrapOverlay({ trap }) {
  const T = trap.targetPos;
  const [a, b] = trap.playerPos;
  const angA = Math.atan2(a.y - T.y, a.x - T.x);
  let angB = Math.atan2(b.y - T.y, b.x - T.x);
  let sweep = angB - angA;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep < -Math.PI) sweep += 2 * Math.PI;
  const R = 24;
  const pa = { x: T.x + Math.cos(angA) * R, y: T.y + Math.sin(angA) * R };
  const pb = { x: T.x + Math.cos(angA + sweep) * R, y: T.y + Math.sin(angA + sweep) * R };
  const mid = angA + sweep / 2;
  const k = trap.strength;
  return (
    <g pointerEvents="none" opacity={Math.min(1, 0.25 + k)}>
      <path d={`M ${T.x} ${T.y} L ${pa.x} ${pa.y} A ${R} ${R} 0 0 ${sweep > 0 ? 1 : 0} ${pb.x} ${pb.y} Z`}
        fill={TRAP_COLOR} fillOpacity={0.28 * k} stroke={TRAP_COLOR} strokeWidth="0.9" strokeOpacity={0.8 * k} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={TRAP_COLOR} strokeWidth="1.3" strokeDasharray="2.2 1.4" opacity={k} />
      {k > 0.5 && <Pill x={T.x + Math.cos(mid) * (R + 6)} y={T.y + Math.sin(mid) * (R + 6)} text="TRAP 2:1" color={TRAP_COLOR} ink="#FFF3F0" />}
    </g>
  );
}

/** Passwege von der Ballführerin: frei (grün), nur per Lob (gelb, Bogen), zu (rot), weit/riskant (grau) */
export function LaneOverlay({ lanes, players }) {
  return (
    <g pointerEvents="none">
      {lanes.map((l) => {
        const a = players[l.from], b = players[l.to];
        const style = {
          open: { stroke: OPEN_COLOR, width: 1.4, dash: "3 1.8", op: 0.95 },
          closed: { stroke: TRAP_COLOR, width: 0.8, dash: "1 2", op: 0.55 },
          lob: { stroke: "#FFD166", width: 1.1, dash: "2.4 1.8", op: 0.9 },
          long: { stroke: CHALK, width: 0.7, dash: "0.8 2.4", op: 0.4 },
        }[l.status];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        return (
          <g key={l.to}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={style.stroke} strokeWidth={style.width}
              strokeDasharray={style.dash} opacity={style.op} strokeLinecap="round" />
            {l.status === "lob" && (
              // Bogen-Symbol: nur über die Hände spielbar
              <path d={`M ${mx - 3} ${my + 1} Q ${mx} ${my - 3.5} ${mx + 3} ${my + 1}`}
                fill="none" stroke="#FFD166" strokeWidth="1" opacity="0.95" />
            )}
            {l.status === "closed" && (
              <path d={`M ${mx - 1.6} ${my - 1.6} L ${mx + 1.6} ${my + 1.6} M ${mx + 1.6} ${my - 1.6} L ${mx - 1.6} ${my + 1.6}`}
                stroke={TRAP_COLOR} strokeWidth="0.9" opacity="0.75" />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Taktische Linie quer über das Feld (z. B. 1. Presslinie) */
export function LineOverlay({ line }) {
  const { landscape, sv } = useView();
  const color = line.beaten ? OPEN_COLOR : TRAP_COLOR;
  // Beschriftung am oberen/linken Bildschirmrand, knapp über der Linie
  const off = sv(0, -4.6);
  const lx = landscape ? COURT_W - 2 : 2;
  return (
    <g pointerEvents="none" opacity={line.beaten ? 0.7 : 0.9}>
      <line x1="0" y1={line.y} x2={COURT_W} y2={line.y} stroke={color} strokeWidth={line.beaten ? 0.8 : 1.2}
        strokeDasharray="4 2.5" />
      <Pill x={lx + off.x} y={line.y + off.y} anchor={landscape ? "end" : "start"} text={line.beaten ? `✓ ${line.label} ÜBERWUNDEN` : line.label}
        color={color} ink={line.beaten ? "#0E2A1A" : "#FFF3F0"} size={3.6} />
    </g>
  );
}

/** Wer verteidigt wen – On-Ball deutlich, sonst dezent */
export function MatchupOverlay({ matchups, players }) {
  return (
    <g pointerEvents="none">
      {matchups.map((m) => {
        const a = players[m.defender], b = players[m.target];
        return (
          <line key={m.defender} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={DEF_COLOR} strokeWidth={m.onBall ? 1.3 : 0.7}
            strokeDasharray={m.onBall ? undefined : "1 1.6"} opacity={m.onBall ? 0.85 : 0.45} />
        );
      })}
    </g>
  );
}

/** Hervorhebungen des Beats: freie Spielerin, Coaching-Hinweise */
export function FocusOverlay({ focus, players }) {
  const { sv } = useView();
  const above = sv(0, -15), callout = sv(0, -18);
  return (
    <g pointerEvents="none">
      {focus.map((f, i) => {
        const p = players[f.player];
        if (!p) return null;
        if (f.type === "open") {
          return (
            <g key={i} opacity={f.fade}>
              <circle cx={p.x} cy={p.y} r="11" fill={OPEN_COLOR} fillOpacity="0.14" stroke={OPEN_COLOR}
                strokeWidth="1.1" strokeDasharray="2.6 1.8" className="tb-spin" style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
              <Pill x={p.x + above.x} y={p.y + above.y} text={f.label ?? "FREI"} color={OPEN_COLOR} ink="#0E2A1A" />
            </g>
          );
        }
        if (f.type === "callout") {
          const color = f.tone === "warn" ? "#FFD166" : CHALK;
          return <g key={i} opacity={f.fade}><Pill x={p.x + callout.x} y={p.y + callout.y} text={f.text} color={color} size={3.6} /></g>;
        }
        return null;
      })}
    </g>
  );
}

function zigzag(points, amp = 1.6, wave = 4) {
  const out = [];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-6) continue;
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
    for (let d = 0; d < L; d += 1) {
      const f = d / L;
      const w = Math.sin(((acc + d) / wave) * Math.PI * 2) * amp;
      out.push({ x: a.x + (b.x - a.x) * f + nx * w, y: a.y + (b.y - a.y) * f + ny * w });
    }
    acc += L;
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Laufwege des aktuellen Beats in Trainer-Notation:
 *  durchgezogen = Laufweg, dick = Sprint, Zickzack = Dribbling, T = Screen,
 *  gestrichelt = Pass, fein gepunktet = Verteidigungs-Rotation */
export function DiagramOverlay({ items }) {
  return (
    <g pointerEvents="none">
      {items.map((it, i) => {
        const color = it.kind === "pass" ? CHALK : teamColor(it.team);
        const pts = it.kind === "dribble" ? zigzag(it.points) : it.points;
        const common = { fill: "none", stroke: color, strokeLinecap: "round", strokeLinejoin: "round" };
        if (it.kind === "pass") {
          return <path key={i} d={pathD(pts)} {...common} strokeWidth="1" strokeDasharray={it.lob ? "4 2" : "2 1.6"} opacity="0.75" markerEnd="url(#arrow)" />;
        }
        if (it.kind === "relation") {
          return <path key={i} d={pathD(pts)} {...common} strokeWidth="0.8" strokeDasharray="0.8 1.6" opacity="0.7" markerEnd="url(#arrow)" />;
        }
        const end = it.points[it.points.length - 1];
        const prev = it.points[it.points.length - 2] ?? end;
        const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
        return (
          <g key={i}>
            <path d={pathD(pts)} {...common} strokeWidth={it.kind === "sprint" || it.kind === "roll" ? 1.6 : 1.05}
              opacity="0.6" markerEnd={it.kind === "screen" ? undefined : "url(#arrow)"} />
            {it.kind === "screen" && (
              <line x1={end.x - Math.sin(ang) * 4} y1={end.y + Math.cos(ang) * 4}
                x2={end.x + Math.sin(ang) * 4} y2={end.y - Math.cos(ang) * 4}
                stroke={color} strokeWidth="1.4" opacity="0.8" />
            )}
          </g>
        );
      })}
    </g>
  );
}
