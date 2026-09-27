import { useRef, useState, useCallback } from "react";

/* Zwei-Finger-Zoom & Pan für den Court-Viewport.
   onGestureStart: wird aufgerufen, sobald ein zweiter Finger aufsetzt
   (laufende Ein-Finger-Interaktionen wie Drag/Zeichnen abbrechen). */
export default function useZoomPan(viewportRef, { onGestureStart, maxZoom = 5 } = {}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map());
  const gesture = useRef({ active: false, lastDist: 0, lastMid: { x: 0, y: 0 }, W: 0, H: 0, left: 0, top: 0 });

  const applyZoom = (s, p) => {
    zoomRef.current = s; panRef.current = p;
    setZoom(s); setPan(p);
  };

  const resetZoom = useCallback(() => applyZoom(1, { x: 0, y: 0 }), []);

  const clampPan = (s, p, W, H) => ({
    x: Math.min(0, Math.max(-(s - 1) * W, p.x)),
    y: Math.min(0, Math.max(-(s - 1) * H, p.y)),
  });

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      onGestureStart?.();
      const r = viewportRef.current.getBoundingClientRect();
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        active: true,
        lastDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        lastMid: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
        W: r.width, H: r.height, left: r.left, top: r.top,
      };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g.active || pointers.current.size < 2) return;
    const [a, b] = [...pointers.current.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const mid = { x: (a.x + b.x) / 2 - g.left, y: (a.y + b.y) / 2 - g.top };
    const sOld = zoomRef.current;
    const sNew = Math.min(maxZoom, Math.max(1, sOld * (dist / g.lastDist)));
    let t = {
      x: mid.x - (sNew / sOld) * (g.lastMid.x - panRef.current.x),
      y: mid.y - (sNew / sOld) * (g.lastMid.y - panRef.current.y),
    };
    t = clampPan(sNew, t, g.W, g.H);
    g.lastDist = dist; g.lastMid = mid;
    applyZoom(sNew, t);
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.active = false;
  };

  return {
    zoom, pan, resetZoom,
    isGesturing: () => gesture.current.active,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
