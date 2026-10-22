/* Traineransicht: Variantenwahl, Analyse-Schalter, Passfenster-Zeitleiste */

import { C_UI, Chip } from "./studioUi.jsx";
import { MODEL_NOTE } from "../play/analysis.js";

/** Varianten an Entscheidungspunkten (Wenn-dann) */
export function VariantBar({ decisions, choices, onChoose }) {
  if (!decisions.length) return null;
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
      {decisions.map(({ decision, option }) => (
        <div key={decision.id} style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto" }}>
          <Chip tone={C_UI.warn} ink="#16110C" style={{ flexShrink: 0 }}>Read</Chip>
          <span style={{ fontSize: 12.5, color: C_UI.muted, whiteSpace: "nowrap" }}>{decision.question ?? decision.title}</span>
          {decision.options.map((o, i) => {
            const on = (choices[decision.id] ?? decision.options[0].id) === o.id;
            return (
              <button key={o.id} onClick={() => onChoose(decision.id, o.id)} aria-pressed={on} title={o.read}
                style={{
                  flexShrink: 0, padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                  fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap",
                  border: `1px solid ${on ? C_UI.warn : C_UI.border}`, background: on ? "rgba(255,209,102,0.16)" : "#1D242A",
                  color: on ? "#FFE9B3" : C_UI.text,
                }}>{String.fromCharCode(65 + i)} · {o.label}</button>
            );
          })}
          {option.answer && <span style={{ fontSize: 12.5, color: C_UI.open, whiteSpace: "nowrap" }}>→ {option.answer}</span>}
        </div>
      ))}
    </div>
  );
}

const TOGGLES = [
  { key: "lanes", label: "Passkorridore" },
  { key: "reach", label: "Reichweite" },
  { key: "space", label: "Freiräume" },
  { key: "windows", label: "Passfenster" },
];

/** Analyse-Ebenen ein-/ausschalten – immer als Modell gekennzeichnet */
export function AnalysisPanel({ analysis, onChange }) {
  return (
    <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <Chip tone="#2A333B" ink={C_UI.muted}>Modell</Chip>
        {TOGGLES.map((t) => {
          const on = !!analysis[t.key];
          return (
            <button key={t.key} aria-pressed={on} onClick={() => onChange({ ...analysis, [t.key]: !on })}
              style={{
                padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5,
                border: `1px solid ${on ? C_UI.open : C_UI.border}`, background: on ? "rgba(95,211,141,0.16)" : "transparent",
                color: on ? "#BFF0D2" : C_UI.text,
              }}>{t.label}</button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: C_UI.dim, lineHeight: 1.35 }}>
        {analysis.space && <span><span style={{ color: C_UI.open }}>■</span> direkt anspielbar · <span style={{ color: C_UI.warn }}>■</span> nur per Lob/Bodenpass · </span>}
        {MODEL_NOTE}
      </div>
    </div>
  );
}

const STATUS_COLOR = { open: C_UI.open, hands: C_UI.warn, closed: C_UI.trap, long: "#55606A" };
const STATUS_LABEL = { open: "frei", hands: "nur Lob/Boden", closed: "zu", long: "zu weit" };

/** Passfenster: Wann ist welche Anspielstation von der Ballführerin aus offen? */
export function PassWindowStrip({ C, windows, time, onSeek }) {
  const ids = Object.keys(windows.rows).sort();
  const total = C.total;
  return (
    <div style={{ display: "grid", gap: 3, marginBottom: 8 }} aria-label="Passfenster">
      {ids.map((id) => (
        <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 22, fontSize: 11.5, fontWeight: 800, color: C_UI.muted, textAlign: "right" }}>{C.entity[id].label}</span>
          <div style={{ position: "relative", flex: 1, height: 9, background: "#0F1317", borderRadius: 3, cursor: "pointer" }}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * total); }}>
            {windows.rows[id].map((s, i) => (
              <span key={i} title={`${C.entity[id].label}: ${STATUS_LABEL[s.status]} (${s.t0.toFixed(1)}–${s.t1.toFixed(1)} s)`} style={{
                position: "absolute", left: `${(s.t0 / total) * 100}%`, width: `${((s.t1 - s.t0) / total) * 100}%`,
                top: 0, bottom: 0, background: STATUS_COLOR[s.status], opacity: s.status === "open" ? 0.95 : 0.55, borderRadius: 2,
              }} />
            ))}
            <span style={{ position: "absolute", left: `${(time / total) * 100}%`, top: -2, bottom: -2, width: 2, background: "#fff" }} />
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, fontSize: 11, color: C_UI.dim, paddingLeft: 28, flexWrap: "wrap" }}>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: STATUS_COLOR[k], marginRight: 4 }} />{v}</span>
        ))}
        <span>Pass von der jeweiligen Ballführerin aus</span>
      </div>
    </div>
  );
}
