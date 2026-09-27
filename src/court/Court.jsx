import { CHALK, HOOP_Y, COURT_W, courtHeight, HALF_H } from "./constants.js";

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

/** Rand um das Feld (Einwurf-Raum hinter Grund- und Seitenlinien) */
export const apronFor = (courtType) => (courtType === "full" ? 12 : 8);

export default function Court({ courtType }) {
  const H = courtHeight(courtType);
  const M = apronFor(courtType);
  return (
    <g>
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9905A" />
          <stop offset="55%" stopColor="#BE8048" />
          <stop offset="100%" stopColor="#B0703C" />
        </linearGradient>
      </defs>
      <rect x={-M} y={-M} width={COURT_W + 2 * M} height={H + 2 * M} fill="#8A5A30" rx="3" />
      <rect x="0" y="0" width={COURT_W} height={H} fill="url(#wood)" />
      {/* Parkett-Andeutung */}
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={(i + 1) * 12.5} y1="0" x2={(i + 1) * 12.5} y2={H}
          stroke="#000" strokeOpacity="0.05" strokeWidth="0.6" />
      ))}
      <rect x="0" y="0" width={COURT_W} height={H} fill="none" stroke={CHALK} strokeWidth="1.2" />
      <HalfLines />
      {courtType === "full" ? (
        <>
          <g transform={`translate(0,${H}) scale(1,-1)`}><HalfLines /></g>
          <line x1="0" y1={HALF_H} x2={COURT_W} y2={HALF_H} stroke={CHALK} strokeWidth="0.9" />
          <circle cx="75" cy={HALF_H} r="18" stroke={CHALK} strokeWidth="0.9" fill="none" />
        </>
      ) : (
        <>
          <line x1="0" y1={HALF_H} x2={COURT_W} y2={HALF_H} stroke={CHALK} strokeWidth="1.2" />
          <path d="M 57 140 A 18 18 0 0 1 93 140" stroke={CHALK} strokeWidth="0.9" fill="none" />
        </>
      )}
    </g>
  );
}

/** viewBox inkl. Rand. landscape: Ganzfeld quer (Bildschirm X = y, Y = 150 − x) */
export const viewBoxFor = (courtType, landscape = false) => {
  const M = apronFor(courtType);
  const H = courtHeight(courtType);
  return landscape
    ? { x: -M, y: -M, w: H + 2 * M, h: COURT_W + 2 * M }
    : { x: -M, y: -M, w: COURT_W + 2 * M, h: H + 2 * M };
};
