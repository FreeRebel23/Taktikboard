/* Spielfeld-Bühne: SVG mit Court, Orientierung (hoch/quer), Kamera-Ausschnitt,
 * Pinch-Zoom/Pan und Umrechnung Bildschirm → Court-Koordinaten.
 * Wird vom Freimodus und von allen Play-Ansichten genutzt. */

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Court, { viewBoxFor } from "../court/Court.jsx";
import { OFF_COLOR } from "../court/constants.js";
import { PlayerDefs } from "../render/Player25D.jsx";
import { BallDefs } from "../render/Ball25D.jsx";
import { ViewContext, PORTRAIT, LANDSCAPE, LANDSCAPE_MATRIX } from "../render/view.js";
import useZoomPan from "../hooks/useZoomPan.js";
import useAnimatedBox from "../hooks/useAnimatedBox.js";
import { boxToViewBox } from "../play/camera.js";

const CourtStage = forwardRef(function CourtStage(
  { courtType, camera = null, allowLandscape = true, children, onCourtDown, onCourtMove, onCourtUp, onGestureStart, style }, ref,
) {
  const viewportRef = useRef(null);
  const svgRef = useRef(null);
  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (height > 0 && width > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = size.w / size.h;
  // Ganzfeld quer auf breiten Flächen (Tablet quer, Desktop)
  const landscape = allowLandscape && courtType === "full" && aspect > 1.15;
  const view = landscape ? LANDSCAPE : PORTRAIT;
  const full = viewBoxFor(courtType, landscape);
  const target = useMemo(
    () => (camera ? boxToViewBox(camera, { landscape, aspect, full }) : full),
    [camera?.x0, camera?.y0, camera?.x1, camera?.y1, landscape, aspect, courtType], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const VB = useAnimatedBox(target);
  // Beim Hineinzoomen Figuren relativ zum Feld verkleinern (realistischere Abstände,
  // weniger Überlappung); in der Gesamtansicht bleiben sie zur Lesbarkeit groß.
  const figScale = Math.max(0.72, Math.min(1, Math.sqrt(Math.min(VB.w / full.w, VB.h / full.h) * 1.15)));
  // Sichtbarer Bereich in Court-Koordinaten (für Beschriftungen am Bildrand)
  const visible = landscape
    ? { x0: 150 - (VB.y + VB.h), x1: 150 - VB.y, y0: VB.x, y1: VB.x + VB.w }
    : { x0: VB.x, x1: VB.x + VB.w, y0: VB.y, y1: VB.y + VB.h };
  const visKey = [visible.x0, visible.x1, visible.y0, visible.y1].map((v) => Math.round(v)).join(",");
  const viewCtx = useMemo(() => ({ ...view, figScale, visible }), [view, Math.round(figScale * 50), visKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const zp = useZoomPan(viewportRef, { onGestureStart });

  const toCourt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const s = Math.min(r.width / VB.w, r.height / VB.h);
    const offX = r.left + (r.width - VB.w * s) / 2;
    const offY = r.top + (r.height - VB.h * s) / 2;
    const sx = (e.clientX - offX) / s + VB.x, sy = (e.clientY - offY) / s + VB.y;
    return landscape ? { x: 150 - sy, y: sx } : { x: sx, y: sy };
  };
  /** Bildschirm-Pixel pro Court-Einheit (inkl. Zoom) */
  const pxPerUnit = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return r ? Math.min(r.width / VB.w, r.height / VB.h) : 1;
  };

  useImperativeHandle(ref, () => ({ toCourt, pxPerUnit, svg: svgRef.current, resetZoom: zp.resetZoom, landscape }));

  const wrap = (fn) => (fn ? (e) => { if (!zp.isGesturing()) fn(e, toCourt(e), svgRef.current); } : undefined);

  return (
    <div ref={viewportRef} {...zp.handlers}
      style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden", touchAction: "none", ...style }}>
      <div style={{
        position: "absolute", inset: "6px 10px", transformOrigin: "0 0",
        transform: `translate(${zp.pan.x}px,${zp.pan.y}px) scale(${zp.zoom})`, willChange: "transform",
      }}>
        <svg ref={svgRef} viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
          onPointerDown={wrap(onCourtDown)} onPointerMove={wrap(onCourtMove)}
          onPointerUp={wrap(onCourtUp)} onPointerCancel={wrap(onCourtUp)}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
            <PlayerDefs />
            <BallDefs />
          </defs>
          <ViewContext.Provider value={viewCtx}>
            <g transform={landscape ? LANDSCAPE_MATRIX : undefined}>
              <Court courtType={courtType} />
              {typeof children === "function" ? children(view) : children}
            </g>
          </ViewContext.Provider>
        </svg>
      </div>
      {zp.zoom > 1.01 && (
        <button onClick={zp.resetZoom} style={{
          position: "absolute", top: 12, right: 16, zIndex: 5,
          padding: "6px 11px", borderRadius: 8, fontSize: 13, fontWeight: 700,
          fontFamily: "inherit", cursor: "pointer", color: "#16110C",
          background: OFF_COLOR, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}>⊙ {zp.zoom.toFixed(1)}×</button>
      )}
    </div>
  );
});

export default CourtStage;
