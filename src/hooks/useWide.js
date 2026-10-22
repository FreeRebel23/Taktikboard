import { useEffect, useState } from "react";

/* Breiter Bildschirm (Tablet quer, Desktop): Spielfeld und Panel nebeneinander */
const QUERY = "(min-width: 900px) and (min-aspect-ratio: 11/10)";

export default function useWide() {
  const get = () => typeof matchMedia !== "undefined" && matchMedia(QUERY).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia(QUERY);
    const h = () => setWide(m.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);
  return wide;
}

/** Stil des Bedien-Panels je nach Layout */
export const panelStyle = (wide, line, bg, maxH = "46vh") => (wide
  ? { width: 430, flexShrink: 0, overflowY: "auto", borderLeft: `1px solid ${line}`, background: bg,
      padding: "12px calc(14px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) 14px" }
  : { flexShrink: 0, maxHeight: maxH, overflowY: "auto", borderTop: `1px solid ${line}`, background: bg,
      padding: "10px calc(12px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))" });
