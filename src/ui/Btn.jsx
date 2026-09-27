import { OFF_COLOR } from "../court/constants.js";

export default function Btn({ active, onClick, children, tone, title, disabled, style }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} disabled={disabled} style={{
      padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700,
      letterSpacing: "0.02em", whiteSpace: "nowrap", flexShrink: 0,
      fontFamily: "inherit", cursor: disabled ? "default" : "pointer",
      border: `1px solid ${active ? (tone || OFF_COLOR) : "#39424B"}`,
      background: active ? (tone || OFF_COLOR) : "#232B32",
      color: active ? "#16110C" : "#D9D4C8",
      opacity: disabled ? 0.45 : 1,
      transition: "background 0.15s, color 0.15s",
      ...style,
    }}>{children}</button>
  );
}
