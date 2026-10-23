/* Neuer Spielzug: Name + Aufstellung wählen (Vorlagen mit automatischer Verteidigung). */

import { useState } from "react";
import { C_UI } from "../studio/studioUi.jsx";
import { MiniCourt } from "./Home.jsx";
import { TEMPLATES, templatePositions } from "../play/templates.js";
import { DEFAULT_HALF, DEFAULT_FULL } from "../legacy/presets.js";

const EMPTY = [
  { id: "empty_half", name: "Freie Aufstellung (Halbfeld)", court: "half", ball: "o1", positions: DEFAULT_HALF, note: "Standardaufstellung zum Anpassen." },
  { id: "empty_full", name: "Freie Aufstellung (Ganzfeld)", court: "full", ball: "o1", positions: DEFAULT_FULL, note: "Standardaufstellung zum Anpassen." },
];

export default function NewPlaySheet({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const options = [
    ...TEMPLATES.map((t) => ({ ...t, positions: templatePositions(t) })),
    ...EMPTY,
  ];
  return (
    <div role="dialog" aria-modal="true" aria-label="Neuer Spielzug" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(720px, 100%)", maxHeight: "92vh", overflowY: "auto", background: C_UI.panel, borderRadius: "16px 16px 0 0",
        padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", display: "grid", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 18 }}>Neuer Spielzug</div>
          <button onClick={onClose} aria-label="Schließen" style={{ minWidth: 44, minHeight: 44, borderRadius: 10, border: `1px solid ${C_UI.border}`, background: "#232B32", color: C_UI.text, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C_UI.muted }}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Einwurf gegen Presse" aria-label="Name des neuen Spielzugs"
            style={{ padding: "10px 12px", borderRadius: 10, fontSize: 16, fontFamily: "inherit", color: C_UI.text, background: "#0F1317", border: `1px solid ${C_UI.border}` }} />
        </label>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: C_UI.muted }}>Aufstellung wählen</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {options.map((o) => (
            <button key={o.id} onClick={() => onCreate({ name: name.trim() || o.name, court: o.court, positions: o.positions, ball: o.ball })}
              style={{ display: "flex", gap: 10, alignItems: "center", textAlign: "left", padding: 10, borderRadius: 12, cursor: "pointer",
                border: `1px solid ${C_UI.border}`, background: C_UI.card, color: C_UI.text, fontFamily: "inherit" }}>
              <MiniCourt play={{ court: o.court, start: { positions: o.positions } }} size={56} />
              <span>
                <span style={{ display: "block", fontWeight: 800, fontSize: 15 }}>{o.name}</span>
                <span style={{ display: "block", fontSize: 12.5, color: C_UI.muted, lineHeight: 1.3 }}>{o.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
