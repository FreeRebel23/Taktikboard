import { useState, useRef, useEffect, useCallback } from "react";

/* ============================================================
   TAKTIKBOARD – Basketball Coach Board
   Halbfeld / Ganzfeld · Drag & Drop · Zeichnen · Spielzug-Animation
   Koordinaten: Breite 0–150 (15 m), Tiefe ab Grundlinie (Korb oben)
   ============================================================ */

const HOOP_Y = 15.75;
const CHALK = "#EDE8DC";
const OFF_COLOR = "#F2762E";
const DEF_COLOR = "#5B8BB2";
const BALL_COLOR = "#D96A23";

const OFF = ["o1", "o2", "o3", "o4", "o5"];
const DEF = ["d1", "d2", "d3", "d4", "d5"];

const DEFAULT_HALF = {
  o1: { x: 75, y: 95 }, o2: { x: 122, y: 72 }, o3: { x: 28, y: 72 },
  o4: { x: 118, y: 30 }, o5: { x: 52, y: 30 },
  d1: { x: 75, y: 80 }, d2: { x: 108, y: 60 }, d3: { x: 42, y: 60 },
  d4: { x: 105, y: 30 }, d5: { x: 60, y: 34 },
  ball: { x: 81, y: 91 },
};

const DEFAULT_FULL = {
  o1: { x: 75, y: 200 }, o2: { x: 120, y: 215 }, o3: { x: 30, y: 215 },
  o4: { x: 95, y: 240 }, o5: { x: 55, y: 240 },
  d1: { x: 75, y: 95 }, d2: { x: 115, y: 70 }, d3: { x: 35, y: 70 },
  d4: { x: 100, y: 35 }, d5: { x: 55, y: 35 },
  ball: { x: 81, y: 196 },
};

/* ---------------- Presets ---------------- */

const PRESETS = [
  {
    id: "five_out", name: "5-Out Grundaufstellung", court: "half", showDef: false,
    note: "Maximaler Raum: alle fünf Positionen hinter der Dreierlinie. Basis für Cuts und Drives.",
    pos: {
      o1: { x: 75, y: 96 }, o2: { x: 124, y: 70 }, o3: { x: 26, y: 70 },
      o4: { x: 140, y: 16 }, o5: { x: 10, y: 16 }, ball: { x: 81, y: 92 },
    },
  },
  {
    id: "pnr_top", name: "Pick & Roll – Mitte", court: "half", showDef: false,
    note: "5 stellt den Block oben am Perimeter, 1 zieht über den Block nach rechts, 5 rollt zum Korb – Pocket-Pass auf den Roller.",
    pos: {
      o1: { x: 75, y: 98 }, o2: { x: 140, y: 16 }, o3: { x: 10, y: 16 },
      o4: { x: 28, y: 68 }, o5: { x: 62, y: 62 }, ball: { x: 80, y: 94 },
    },
    anim: {
      o5: [{ t: 0, x: 62, y: 62 }, { t: 0.3, x: 84, y: 92 }, { t: 0.55, x: 84, y: 92 }, { t: 1, x: 62, y: 34 }],
      o1: [{ t: 0, x: 75, y: 98 }, { t: 0.35, x: 75, y: 98 }, { t: 0.6, x: 95, y: 85 }, { t: 0.8, x: 102, y: 62 }, { t: 1, x: 94, y: 46 }],
      ball: [{ t: 0, x: 80, y: 94 }, { t: 0.35, x: 80, y: 94 }, { t: 0.6, x: 100, y: 82 }, { t: 0.8, x: 107, y: 60 }, { t: 0.9, x: 99, y: 48 }, { t: 1, x: 66, y: 36 }],
      o4: [{ t: 0, x: 28, y: 68 }, { t: 1, x: 22, y: 82 }],
    },
  },
  {
    id: "pnr_wing", name: "Pick & Roll – Flügel", court: "half", showDef: false,
    note: "Side-P&R rechts: 5 blockt am Flügel, 1 zieht zur Mitte, 5 rollt – Kick-out in die schwache Ecke bleibt offen.",
    pos: {
      o1: { x: 118, y: 75 }, o2: { x: 75, y: 98 }, o3: { x: 12, y: 70 },
      o4: { x: 10, y: 16 }, o5: { x: 95, y: 48 }, ball: { x: 123, y: 71 },
    },
    anim: {
      o5: [{ t: 0, x: 95, y: 48 }, { t: 0.3, x: 113, y: 82 }, { t: 0.5, x: 113, y: 82 }, { t: 1, x: 88, y: 28 }],
      o1: [{ t: 0, x: 118, y: 75 }, { t: 0.35, x: 118, y: 75 }, { t: 0.6, x: 98, y: 82 }, { t: 0.8, x: 82, y: 62 }, { t: 1, x: 78, y: 44 }],
      ball: [{ t: 0, x: 123, y: 71 }, { t: 0.35, x: 123, y: 71 }, { t: 0.6, x: 102, y: 80 }, { t: 0.82, x: 84, y: 60 }, { t: 0.9, x: 80, y: 46 }, { t: 1, x: 14, y: 20 }],
      o2: [{ t: 0, x: 75, y: 98 }, { t: 0.5, x: 75, y: 98 }, { t: 1, x: 115, y: 72 }],
      o3: [{ t: 0, x: 12, y: 70 }, { t: 0.6, x: 12, y: 70 }, { t: 1, x: 12, y: 55 }],
    },
  },
  {
    id: "triangle", name: "Triangle Offense", court: "half", showDef: false,
    note: "Sideline-Triangle rechts: Post (5) – Ecke (2) – Flügel (3). Pass in die Ecke, 3 schneidet über den Post, 1 füllt den Flügel nach.",
    pos: {
      o1: { x: 60, y: 92 }, o2: { x: 138, y: 14 }, o3: { x: 120, y: 68 },
      o4: { x: 52, y: 58 }, o5: { x: 98, y: 25 }, ball: { x: 124, y: 64 },
    },
    shapes: [{ type: "poly", points: [[98, 25], [138, 14], [120, 68]] }],
    anim: {
      ball: [{ t: 0, x: 124, y: 64 }, { t: 0.2, x: 124, y: 64 }, { t: 0.35, x: 136, y: 18 }, { t: 1, x: 136, y: 18 }],
      o3: [{ t: 0, x: 120, y: 68 }, { t: 0.35, x: 120, y: 68 }, { t: 0.6, x: 95, y: 35 }, { t: 1, x: 32, y: 20 }],
      o1: [{ t: 0, x: 60, y: 92 }, { t: 0.45, x: 60, y: 92 }, { t: 1, x: 114, y: 66 }],
      o4: [{ t: 0, x: 52, y: 58 }, { t: 0.5, x: 52, y: 58 }, { t: 1, x: 70, y: 90 }],
      o5: [{ t: 0, x: 98, y: 25 }, { t: 0.6, x: 98, y: 25 }, { t: 1, x: 93, y: 28 }],
    },
  },
  {
    id: "horns", name: "Horns", court: "half", showDef: false,
    note: "Beide Bigs an den Ellbogen, Schützen in den Ecken. 5 blockt und rollt zum Korb, 4 poppt nach außen – zwei Optionen aus einem Set.",
    pos: {
      o1: { x: 75, y: 98 }, o2: { x: 140, y: 16 }, o3: { x: 10, y: 16 },
      o4: { x: 54, y: 60 }, o5: { x: 96, y: 60 }, ball: { x: 80, y: 94 },
    },
    anim: {
      o5: [{ t: 0, x: 96, y: 60 }, { t: 0.3, x: 83, y: 92 }, { t: 0.5, x: 83, y: 92 }, { t: 1, x: 68, y: 32 }],
      o1: [{ t: 0, x: 75, y: 98 }, { t: 0.35, x: 75, y: 98 }, { t: 0.6, x: 95, y: 84 }, { t: 0.85, x: 98, y: 60 }, { t: 1, x: 90, y: 48 }],
      o4: [{ t: 0, x: 54, y: 60 }, { t: 0.5, x: 54, y: 60 }, { t: 1, x: 44, y: 86 }],
      ball: [{ t: 0, x: 80, y: 94 }, { t: 0.35, x: 80, y: 94 }, { t: 0.6, x: 100, y: 82 }, { t: 0.85, x: 103, y: 58 }, { t: 0.92, x: 94, y: 50 }, { t: 1, x: 70, y: 34 }],
    },
  },
  {
    id: "fastbreak3", name: "Fast Break – 3 Bahnen", court: "full", showDef: false,
    note: "Klassischer 3-Bahnen-Break: Ball in der Mitte, Flügel sprinten breit in die Bahnen, Abschluss über die rechte Seite. 4 läuft als Trailer, 5 sichert.",
    pos: {
      o1: { x: 75, y: 235 }, o2: { x: 125, y: 250 }, o3: { x: 25, y: 250 },
      o4: { x: 90, y: 265 }, o5: { x: 60, y: 270 }, ball: { x: 80, y: 231 },
    },
    anim: {
      o1: [{ t: 0, x: 75, y: 235 }, { t: 0.5, x: 75, y: 140 }, { t: 0.8, x: 75, y: 75 }, { t: 1, x: 75, y: 58 }],
      o2: [{ t: 0, x: 125, y: 250 }, { t: 0.45, x: 136, y: 150 }, { t: 0.8, x: 136, y: 60 }, { t: 1, x: 112, y: 30 }],
      o3: [{ t: 0, x: 25, y: 250 }, { t: 0.45, x: 14, y: 150 }, { t: 0.8, x: 14, y: 60 }, { t: 1, x: 38, y: 30 }],
      o4: [{ t: 0, x: 90, y: 265 }, { t: 0.6, x: 95, y: 150 }, { t: 1, x: 95, y: 72 }],
      o5: [{ t: 0, x: 60, y: 270 }, { t: 1, x: 75, y: 155 }],
      ball: [{ t: 0, x: 80, y: 231 }, { t: 0.5, x: 80, y: 138 }, { t: 0.82, x: 80, y: 74 }, { t: 1, x: 110, y: 32 }],
    },
  },
  {
    id: "fastbreak5", name: "Primärbreak – 5 Bahnen", court: "full", showDef: false,
    note: "Rebound durch 5, Outlet auf 1 an der Seitenlinie. 1 pusht die Mitte, 2 und 3 besetzen die Ecken, 4 läuft als Rim-Runner zum Ring, 5 bleibt Safety.",
    pos: {
      o1: { x: 120, y: 235 }, o2: { x: 135, y: 250 }, o3: { x: 20, y: 250 },
      o4: { x: 60, y: 265 }, o5: { x: 75, y: 262 }, ball: { x: 79, y: 259 },
    },
    anim: {
      ball: [{ t: 0, x: 79, y: 259 }, { t: 0.15, x: 118, y: 233 }, { t: 0.5, x: 84, y: 180 }, { t: 0.75, x: 80, y: 92 }, { t: 0.85, x: 78, y: 62 }, { t: 1, x: 136, y: 32 }],
      o1: [{ t: 0, x: 120, y: 235 }, { t: 0.15, x: 120, y: 235 }, { t: 0.5, x: 85, y: 180 }, { t: 0.78, x: 80, y: 92 }, { t: 1, x: 76, y: 58 }],
      o2: [{ t: 0, x: 135, y: 250 }, { t: 0.5, x: 138, y: 120 }, { t: 1, x: 138, y: 28 }],
      o3: [{ t: 0, x: 20, y: 250 }, { t: 0.5, x: 12, y: 120 }, { t: 1, x: 12, y: 26 }],
      o4: [{ t: 0, x: 60, y: 265 }, { t: 0.55, x: 70, y: 140 }, { t: 1, x: 70, y: 42 }],
      o5: [{ t: 0, x: 75, y: 262 }, { t: 0.3, x: 75, y: 262 }, { t: 1, x: 75, y: 162 }],
    },
  },
  {
    id: "zone23", name: "2-3 Zone (Defense)", court: "half", showDef: true,
    note: "Zonenverschiebung bei Ballbewegung: Swing von oben über den Flügel in die Ecke – die Zone rotiert mit, 4 schließt die Ecke, 5 sichert die Zone unter dem Korb.",
    pos: {
      o1: { x: 75, y: 95 }, o2: { x: 125, y: 72 }, o3: { x: 25, y: 72 },
      o4: { x: 138, y: 18 }, o5: { x: 12, y: 18 }, ball: { x: 80, y: 91 },
      d1: { x: 52, y: 70 }, d2: { x: 98, y: 70 }, d3: { x: 22, y: 34 },
      d4: { x: 128, y: 34 }, d5: { x: 75, y: 26 },
    },
    anim: {
      ball: [{ t: 0, x: 80, y: 91 }, { t: 0.15, x: 80, y: 91 }, { t: 0.35, x: 122, y: 70 }, { t: 0.6, x: 122, y: 70 }, { t: 0.78, x: 136, y: 22 }, { t: 1, x: 136, y: 22 }],
      d1: [{ t: 0, x: 52, y: 70 }, { t: 0.45, x: 68, y: 74 }, { t: 1, x: 82, y: 72 }],
      d2: [{ t: 0, x: 98, y: 70 }, { t: 0.45, x: 113, y: 66 }, { t: 1, x: 104, y: 56 }],
      d3: [{ t: 0, x: 22, y: 34 }, { t: 0.45, x: 36, y: 32 }, { t: 1, x: 58, y: 30 }],
      d4: [{ t: 0, x: 128, y: 34 }, { t: 0.45, x: 126, y: 36 }, { t: 1, x: 132, y: 24 }],
      d5: [{ t: 0, x: 75, y: 26 }, { t: 0.45, x: 83, y: 26 }, { t: 1, x: 97, y: 22 }],
    },
  },
];

/* ---------------- Interpolation ---------------- */

function interpKF(kfs, t) {
  if (t <= kfs[0].t) return kfs[0];
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i], b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const u = (t - a.t) / span;
      const s = u * u * (3 - 2 * u);
      return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
    }
  }
  return kfs[kfs.length - 1];
}

/* ---------------- Court ---------------- */

function HalfLines() {
  return (
    <g stroke={CHALK} strokeWidth="0.9" fill="none" strokeLinecap="round">
      {/* Zone */}
      <rect x="50.5" y="0" width="49" height="58" fill="rgba(96,42,32,0.55)" />
      {/* Freiwurfkreis */}
      <circle cx="75" cy="58" r="18" />
      {/* No-Charge-Halbkreis */}
      <path d="M 62.5 15.75 A 12.5 12.5 0 0 0 87.5 15.75" />
      {/* Brett + Ring */}
      <line x1="66" y1="12" x2="84" y2="12" strokeWidth="1.4" />
      <circle cx="75" cy={HOOP_Y} r="2.4" stroke="#F2994A" strokeWidth="1" />
      {/* Dreierlinie */}
      <path d="M 9 0 L 9 29.9 A 67.5 67.5 0 0 0 141 29.9 L 141 0" />
    </g>
  );
}

function Court({ courtType }) {
  const H = courtType === "half" ? 140 : 280;
  return (
    <g>
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9905A" />
          <stop offset="55%" stopColor="#BE8048" />
          <stop offset="100%" stopColor="#B0703C" />
        </linearGradient>
      </defs>
      <rect x="-8" y="-8" width="166" height={H + 16} fill="#8A5A30" rx="3" />
      <rect x="0" y="0" width="150" height={H} fill="url(#wood)" />
      {/* Parkett-Andeutung */}
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={(i + 1) * 12.5} y1="0" x2={(i + 1) * 12.5} y2={H}
          stroke="#000" strokeOpacity="0.05" strokeWidth="0.6" />
      ))}
      <rect x="0" y="0" width="150" height={H} fill="none" stroke={CHALK} strokeWidth="1.2" />
      <HalfLines />
      {courtType === "full" ? (
        <>
          <g transform="translate(0,280) scale(1,-1)"><HalfLines /></g>
          <line x1="0" y1="140" x2="150" y2="140" stroke={CHALK} strokeWidth="0.9" />
          <circle cx="75" cy="140" r="18" stroke={CHALK} strokeWidth="0.9" fill="none" />
        </>
      ) : (
        <>
          <line x1="0" y1="140" x2="150" y2="140" stroke={CHALK} strokeWidth="1.2" />
          <path d="M 57 140 A 18 18 0 0 1 93 140" stroke={CHALK} strokeWidth="0.9" fill="none" />
        </>
      )}
    </g>
  );
}

/* ---------------- Tokens ---------------- */

function PlayerToken({ id, pos, onDown, interactive }) {
  const isDef = id.startsWith("d");
  const num = id[1];
  return (
    <g transform={`translate(${pos.x},${pos.y})`}
      onPointerDown={interactive ? (e) => onDown(e, id) : undefined}
      style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}>
      <circle r="7.6" fill="rgba(0,0,0,0.25)" cx="0.6" cy="1" />
      <circle r="7.2" fill={isDef ? DEF_COLOR : OFF_COLOR} stroke="#1B1410" strokeWidth="0.8" />
      <text textAnchor="middle" dy="2.4" fontSize="6.4" fontWeight="800"
        fill="#FFF7EC" style={{ userSelect: "none", pointerEvents: "none", fontFamily: "inherit" }}>
        {isDef ? `X${num}` : num}
      </text>
    </g>
  );
}

function BallToken({ pos, onDown, interactive }) {
  return (
    <g transform={`translate(${pos.x},${pos.y})`}
      onPointerDown={interactive ? (e) => onDown(e, "ball") : undefined}
      style={{ cursor: interactive ? "grab" : "default", touchAction: "none" }}>
      <circle r="4" fill={BALL_COLOR} stroke="#3A2410" strokeWidth="0.7" />
      <path d="M -4 0 H 4 M 0 -4 V 4" stroke="#3A2410" strokeWidth="0.5" fill="none" />
    </g>
  );
}

/* ---------------- App ---------------- */

export default function Taktikboard() {
  const [courtType, setCourtType] = useState("half");
  const [positions, setPositions] = useState(DEFAULT_HALF);
  const [showDef, setShowDef] = useState(true);
  const [mode, setMode] = useState("move"); // move | pen | arrow
  const [drawings, setDrawings] = useState([]);
  const [preset, setPreset] = useState(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showPaths, setShowPaths] = useState(true);

  const svgRef = useRef(null);
  const dragId = useRef(null);
  const stroke = useRef(null);
  const rafRef = useRef(null);
  const playRef = useRef(false);

  const VB = courtType === "half"
    ? { x: -8, y: -8, w: 166, h: 156 }
    : { x: -8, y: -8, w: 166, h: 296 };

  const toCourt = useCallback((e) => {
    const r = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VB.w + VB.x,
      y: ((e.clientY - r.top) / r.height) * VB.h + VB.y,
    };
  }, [VB.w, VB.h, VB.x, VB.y]);

  /* ----- Animation loop ----- */
  useEffect(() => {
    playRef.current = playing;
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const dur = 4500;
    const step = (now) => {
      const dt = now - last; last = now;
      setProgress((p) => {
        const np = Math.min(1, p + dt / dur);
        if (np >= 1) setPlaying(false);
        return np;
      });
      if (playRef.current) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  /* ----- Display position (Animation überlagert State) ----- */
  const displayPos = (id) => {
    if (preset?.anim?.[id] && progress > 0) return interpKF(preset.anim[id], progress);
    return positions[id];
  };

  /* ----- Pointer handling ----- */
  const onTokenDown = (e, id) => {
    if (mode !== "move") return;
    e.stopPropagation();
    if (progress > 0) { setProgress(0); setPlaying(false); }
    dragId.current = id;
    try { svgRef.current.setPointerCapture(e.pointerId); } catch {}
  };

  const onSvgDown = (e) => {
    if (mode === "move") return;
    const p = toCourt(e);
    stroke.current = mode === "pen"
      ? { type: "pen", points: [p] }
      : { type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    setDrawings((d) => [...d, stroke.current]);
    try { svgRef.current.setPointerCapture(e.pointerId); } catch {}
  };

  const onSvgMove = (e) => {
    if (dragId.current) {
      const p = toCourt(e);
      const id = dragId.current;
      const maxY = courtType === "half" ? 140 : 280;
      setPositions((pos) => ({
        ...pos,
        [id]: { x: Math.max(0, Math.min(150, p.x)), y: Math.max(0, Math.min(maxY, p.y)) },
      }));
    } else if (stroke.current) {
      const p = toCourt(e);
      if (stroke.current.type === "pen") stroke.current.points.push(p);
      else { stroke.current.x2 = p.x; stroke.current.y2 = p.y; }
      setDrawings((d) => [...d.slice(0, -1), { ...stroke.current }]);
    }
  };

  const onSvgUp = () => { dragId.current = null; stroke.current = null; };

  /* ----- Aktionen ----- */
  const applyPreset = (p) => {
    const base = p.court === "half" ? DEFAULT_HALF : DEFAULT_FULL;
    setCourtType(p.court);
    setPositions({ ...base, ...p.pos });
    setShowDef(p.showDef);
    setPreset(p);
    setProgress(0);
    setPlaying(false);
    setDrawings([]);
  };

  const switchCourt = (t) => {
    if (t === courtType) return;
    setCourtType(t);
    setPositions(t === "half" ? DEFAULT_HALF : DEFAULT_FULL);
    setPreset(null); setProgress(0); setPlaying(false); setDrawings([]);
  };

  const resetBoard = () => {
    setPositions(courtType === "half" ? DEFAULT_HALF : DEFAULT_FULL);
    setPreset(null); setProgress(0); setPlaying(false); setDrawings([]);
  };

  const togglePlay = () => {
    if (!preset?.anim) return;
    if (progress >= 1) { setProgress(0); setPlaying(true); }
    else setPlaying((p) => !p);
  };

  /* ----- UI-Hilfen ----- */
  const Btn = ({ active, onClick, children, tone }) => (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
      fontFamily: "inherit", cursor: "pointer",
      border: `1px solid ${active ? (tone || OFF_COLOR) : "#39424B"}`,
      background: active ? (tone || OFF_COLOR) : "#232B32",
      color: active ? "#16110C" : "#D9D4C8",
      transition: "background 0.15s, color 0.15s",
    }}>{children}</button>
  );

  const entityColor = (id) => (id === "ball" ? BALL_COLOR : id.startsWith("d") ? DEF_COLOR : OFF_COLOR);

  return (
    <div style={{
      minHeight: "100vh", background: "#14181C", color: "#E8E4DA",
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;700&display=swap');
        input[type=range]{accent-color:${OFF_COLOR};}
        ::-webkit-scrollbar{height:0;width:0;}
        button:focus-visible{outline:2px solid ${OFF_COLOR};outline-offset:2px;}
      `}</style>

      <div style={{
        width: "100%", maxWidth: 560,
        padding: "calc(14px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left))",
      }}>

        {/* Kopf */}
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Taktik<span style={{ color: OFF_COLOR }}>board</span>
            </h1>
            <div style={{ fontSize: 12, color: "#8E9AA4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Basketball · Halb- & Ganzfeld
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn active={courtType === "half"} onClick={() => switchCourt("half")}>Halbfeld</Btn>
            <Btn active={courtType === "full"} onClick={() => switchCourt("full")}>Ganzfeld</Btn>
          </div>
        </header>

        {/* Spielzüge */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
          {PRESETS.map((p) => (
            <Btn key={p.id} active={preset?.id === p.id} onClick={() => applyPreset(p)}
              tone={p.id === "zone23" ? DEF_COLOR : OFF_COLOR}>
              {p.name}
            </Btn>
          ))}
        </div>

        {preset && (
          <p style={{ margin: "2px 2px 10px", fontSize: 13.5, lineHeight: 1.45, color: "#B9C2C9" }}>
            {preset.note}
          </p>
        )}

        {/* Feld */}
        <svg ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          style={{ width: "100%", display: "block", borderRadius: 10, touchAction: "none",
            boxShadow: "0 6px 24px rgba(0,0,0,0.45)" }}
          onPointerDown={onSvgDown} onPointerMove={onSvgMove}
          onPointerUp={onSvgUp} onPointerCancel={onSvgUp}>

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
          </defs>

          <Court courtType={courtType} />

          {/* Preset-Formen (z. B. Triangle) */}
          {preset?.shapes?.map((s, i) => (
            <polygon key={i} points={s.points.map((p) => p.join(",")).join(" ")}
              fill="rgba(237,232,220,0.06)" stroke={CHALK} strokeWidth="0.8"
              strokeDasharray="3 2.5" opacity="0.7" />
          ))}

          {/* Laufwege */}
          {showPaths && preset?.anim && Object.entries(preset.anim).map(([id, kfs]) => (
            <polyline key={id}
              points={kfs.map((k) => `${k.x},${k.y}`).join(" ")}
              fill="none" stroke={entityColor(id)} strokeWidth="1.1"
              strokeDasharray={id === "ball" ? "1.5 2.5" : "4 2.5"}
              opacity="0.5" markerEnd="url(#arrow)" />
          ))}

          {/* Zeichnungen */}
          {drawings.map((d, i) =>
            d.type === "pen" ? (
              <polyline key={i} points={d.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={CHALK} strokeWidth="1.4" strokeLinecap="round"
                strokeLinejoin="round" opacity="0.92" />
            ) : (
              <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
                stroke={CHALK} strokeWidth="1.4" strokeLinecap="round"
                opacity="0.92" markerEnd="url(#arrow)" />
            )
          )}

          {/* Spieler */}
          {showDef && DEF.map((id) => (
            <PlayerToken key={id} id={id} pos={displayPos(id)} onDown={onTokenDown}
              interactive={mode === "move"} />
          ))}
          {OFF.map((id) => (
            <PlayerToken key={id} id={id} pos={displayPos(id)} onDown={onTokenDown}
              interactive={mode === "move"} />
          ))}
          <BallToken pos={displayPos("ball")} onDown={onTokenDown} interactive={mode === "move"} />
        </svg>

        {/* Abspielen */}
        {preset?.anim && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <Btn active onClick={togglePlay}>
              {playing ? "❚❚ Pause" : progress >= 1 ? "↻ Nochmal" : "▶ Abspielen"}
            </Btn>
            <input type="range" min="0" max="1" step="0.001" value={progress}
              onChange={(e) => { setPlaying(false); setProgress(parseFloat(e.target.value)); }}
              style={{ flex: 1 }} aria-label="Spielzug-Fortschritt" />
            <Btn active={showPaths} onClick={() => setShowPaths((s) => !s)}>Wege</Btn>
          </div>
        )}

        {/* Werkzeuge */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          <Btn active={mode === "move"} onClick={() => setMode("move")}>✥ Bewegen</Btn>
          <Btn active={mode === "pen"} onClick={() => setMode("pen")}>✎ Stift</Btn>
          <Btn active={mode === "arrow"} onClick={() => setMode("arrow")}>↗ Pfeil</Btn>
          <Btn onClick={() => setDrawings((d) => d.slice(0, -1))}>⌫ Rückgängig</Btn>
          <Btn onClick={() => setDrawings([])}>Zeichnung leeren</Btn>
          <Btn active={showDef} tone={DEF_COLOR} onClick={() => setShowDef((s) => !s)}>Verteidigung</Btn>
          <Btn onClick={resetBoard}>Reset</Btn>
        </div>

        {/* Legende */}
        <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 12.5, color: "#8E9AA4" }}>
          <span><span style={{ color: OFF_COLOR }}>●</span> Angriff 1–5</span>
          <span><span style={{ color: DEF_COLOR }}>●</span> Verteidigung X1–X5</span>
          <span><span style={{ color: BALL_COLOR }}>●</span> Ball</span>
        </div>
      </div>
    </div>
  );
}
