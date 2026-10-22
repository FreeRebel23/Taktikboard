/* Kleine, gemeinsame UI-Bausteine des Studios */

import { OFF_COLOR } from "../court/constants.js";

export const C_UI = {
  bg: "#14181C", panel: "#171C21", card: "#1D242A", line: "#2A333B", border: "#39424B",
  text: "#E8E4DA", muted: "#9AA6AF", dim: "#6F7B84", accent: OFF_COLOR, white: "#FFFFFF",
  open: "#5FD38D", warn: "#FFD166", trap: "#E0463A", def: "#5B8BB2",
};

/** Segmentierte Auswahl (z. B. Trainer / Spielerin / Bearbeiten) */
export function Segmented({ options, value, onChange, size = "md", label }) {
  return (
    <div role="radiogroup" aria-label={label} style={{
      display: "inline-flex", background: "#0F1317", border: `1px solid ${C_UI.border}`, borderRadius: 10, padding: 2, gap: 2, flexShrink: 0,
    }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} role="radio" aria-checked={on} onClick={() => onChange(o.value)} title={o.title}
            style={{
              padding: size === "sm" ? "5px 9px" : "7px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontWeight: 700, fontSize: size === "sm" ? 12 : 13, whiteSpace: "nowrap",
              background: on ? (o.tone ?? C_UI.accent) : "transparent", color: on ? "#16110C" : C_UI.text,
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

export function Chip({ children, tone = C_UI.border, ink = C_UI.text, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999,
      fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
      background: tone, color: ink, whiteSpace: "nowrap", ...style,
    }}>{children}</span>
  );
}

/** Kleine Überschrift über einem Abschnitt der Aufgabenkarte */
export function Label({ children, color = C_UI.muted }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color, marginBottom: 2 }}>
      {children}
    </div>
  );
}

export function IconButton({ onClick, title, children, active, style, disabled }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} style={{
      minWidth: 40, height: 38, padding: "0 10px", borderRadius: 10, cursor: disabled ? "default" : "pointer",
      border: `1px solid ${active ? C_UI.accent : C_UI.border}`, background: active ? C_UI.accent : "#232B32",
      color: active ? "#16110C" : C_UI.text, fontFamily: "inherit", fontWeight: 800, fontSize: 14,
      opacity: disabled ? 0.4 : 1, flexShrink: 0, ...style,
    }}>{children}</button>
  );
}

/** Dialog in der App (statt window.confirm – funktioniert überall, auch eingebettet) */
export function Dialog({ title, children, actions, onClose }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.6)", display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(440px, 100%)", background: C_UI.panel, border: `1px solid ${C_UI.border}`, borderRadius: 14,
        padding: 16, display: "grid", gap: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
        {children && <div style={{ fontSize: 14, lineHeight: 1.45, color: C_UI.muted }}>{children}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {actions.map((a) => (
            <button key={a.label} onClick={a.onClick} autoFocus={a.primary} style={{
              padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14,
              border: `1px solid ${a.danger ? C_UI.trap : a.primary ? C_UI.accent : C_UI.border}`,
              background: a.primary ? C_UI.accent : a.danger ? "rgba(224,70,58,0.14)" : "#232B32",
              color: a.primary ? "#16110C" : a.danger ? "#FFB4A8" : C_UI.text,
            }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Datei im Browser speichern (Fallback, wenn der Gerätespeicher versagt) */
export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
