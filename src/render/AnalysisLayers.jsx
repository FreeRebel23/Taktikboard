/* Zuschaltbare Analyse-Ebenen (Modell-Einschätzung). */

import { useMemo } from "react";
import { OPEN_COLOR, TRAP_COLOR, CHALK } from "../court/constants.js";
import { useView } from "./view.js";
import { Pill } from "./PlayOverlays.jsx";
import { corridors, reachZones, freeSpace } from "../play/analysis.js";
import { useAnalysisContext } from "./analysisContext.js";

const LANE_COLORS = { open: OPEN_COLOR, hands: "#FFD166", closed: TRAP_COLOR, long: CHALK };

function Corridor({ a, b, w, status }) {
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
  const c = LANE_COLORS[status];
  if (status === "closed" || status === "long") {
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth="0.7" strokeDasharray="1 2" opacity="0.5" />;
  }
  const hw = Math.max(1.2, w);
  // schmal an Passgeberin und Empfängerin (Hände), breit dazwischen
  const at = (t, k) => ({ x: a.x + (b.x - a.x) * t + nx * hw * k, y: a.y + (b.y - a.y) * t + ny * hw * k });
  const pts = [at(0.08, 0.25), at(0.3, 1), at(0.7, 1), at(0.92, 0.25), at(0.92, -0.25), at(0.7, -1), at(0.3, -1), at(0.08, -0.25)];
  return (
    <g>
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill={c} fillOpacity="0.2" stroke={c} strokeWidth="0.6" strokeOpacity="0.7" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth="0.8" opacity="0.9" />
    </g>
  );
}

export default function AnalysisLayers({ frame, analysis }) {
  const C = useAnalysisContext();
  const { sv } = useView();
  const holder = frame.ball.state === "held" ? frame.ball.holder : null;
  const players = frame.players;
  const space = useMemo(
    () => (C && holder && analysis.space ? freeSpace(C, players, holder) : []),
    [C, holder, analysis.space, frame.t], // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!C) return null;
  const lanes = holder && analysis.lanes ? corridors(C, players, holder) : [];
  const zones = analysis.reach ? reachZones(C, players, holder ? (C.entity[holder].team === "offense" ? "defense" : "offense") : "defense") : [];
  const off = sv(0, -7);
  return (
    <g pointerEvents="none">
      {space.map((p, i) => (
        <rect key={i} x={p.x - 2.6} y={p.y - 2.6} width="5.2" height="5.2" rx="1.6" fill={OPEN_COLOR} opacity={0.08 + 0.32 * p.score} />
      ))}
      {zones.map((z) => (
        <circle key={z.id} cx={z.x} cy={z.y} r={z.r} fill="#5B8BB2" fillOpacity="0.12" stroke="#A9C8E2" strokeWidth="0.5" strokeDasharray="1.2 1.2" opacity="0.9" />
      ))}
      {lanes.map((l) => (
        <g key={l.to}>
          <Corridor a={players[l.from]} b={players[l.to]} w={l.halfWidth} status={l.status} />
          {l.status === "open" && l.halfWidth > 0 && (() => {
            const m = { x: (players[l.from].x + players[l.to].x) / 2 + off.x, y: (players[l.from].y + players[l.to].y) / 2 + off.y };
            return <Pill x={m.x} y={m.y} text={`${(l.halfWidth / 5).toFixed(1).replace(".", ",")} m`} color={OPEN_COLOR} ink="#0E2A1A" size={2.8} />;
          })()}
        </g>
      ))}
    </g>
  );
}
