import { useEffect, useRef, useState } from "react";

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const same = (a, b) => a && b && ["x", "y", "w", "h"].every((k) => Math.abs(a[k] - b[k]) < 0.01);

/* Animiert einen Rechteck-Ausschnitt (viewBox) weich zum Ziel. */
export default function useAnimatedBox(target, ms = 650) {
  const [box, setBox] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (!target || same(cur.current, target)) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  }, [target?.x, target?.y, target?.w, target?.h]); // eslint-disable-line react-hooks/exhaustive-deps
  return box ?? target;
}
