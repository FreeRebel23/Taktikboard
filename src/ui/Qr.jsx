/* QR-Code als SVG. Die Bibliothek wird erst bei Bedarf nachgeladen
 * (eigenes Bundle, im Offline-Cache enthalten). */

import { useEffect, useState } from "react";

/** Maximale Länge, die am Handybildschirm noch zuverlässig scanbar ist */
export const QR_MAX = 1200;

export default function Qr({ text, size = 220, label }) {
  const [path, setPath] = useState(null);
  useEffect(() => {
    let alive = true;
    import("qrcode-generator").then(({ default: qrcode }) => {
      const qr = qrcode(0, text.length > 300 ? "L" : "M");
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4},${r + 4}h1v1h-1z`;
      if (alive) setPath({ d, n: n + 8 });
    }).catch(() => alive && setPath({ error: true }));
    return () => { alive = false; };
  }, [text]);
  if (path?.error) return <div role="alert" style={{ fontSize: 13 }}>QR-Code konnte nicht erzeugt werden.</div>;
  if (!path) return <div style={{ width: size, height: size }} aria-busy="true" />;
  return (
    <svg role="img" aria-label={label ?? "QR-Code"} viewBox={`0 0 ${path.n} ${path.n}`} width={size} height={size}
      shapeRendering="crispEdges" style={{ background: "#fff", borderRadius: 8, display: "block" }}>
      <path d={path.d} fill="#000" />
    </svg>
  );
}
