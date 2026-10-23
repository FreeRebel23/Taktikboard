import { useEffect, useRef, useState } from "react";

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const same = (a, b) => a && b && ["x", "y", "w", "h"].every((k) => Math.abs(a[k] - b[k]) < 0.01);

/* Animiert einen Rechteck-Ausschnitt (viewBox) weich zum Ziel. */
/** instantKey: ändert er sich (z. B. anderes Feld, andere Orientierung), springt der
 *  Ausschnitt sofort – animiert werden nur Kamerafahrten innerhalb desselben Feldes. */
export default function useAnimatedBox(target, ms = 650, instantKey = "") {
  const [box, setBox] = useState(target);
  const cur = useRef(target);
  const key = useRef(instantKey);
  useEffect(() => {
    if (!target || same(cur.current, target)) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (key.current !== instantKey) { key.current = instantKey; cur.current = target; setBox(target); return; }
    const from = cur.current ?? target;
    if (reduce || !from) { cur.current = target; setBox(target); return; }
    let raf;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / ms);
      const e = ease(u);
      const b = { x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e, h: from.h + (target.h - from.h) * e };
      cur.current = b;
      setBox(b);
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target?.x, target?.y, target?.w, target?.h, instantKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Beim Sprung schon im selben Render den neuen Ausschnitt liefern (Pointer-Mapping stimmt sofort)
  if (key.current !== instantKey) return target;
  return box ?? target;
}
