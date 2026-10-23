/* Laufwege: Polylinie mit Bogenlängen-Parametrisierung.
   smooth = true  → Catmull-Rom durch die Wegpunkte (runde Laufwege)
   smooth = false → harte Ecken (Cuts, V-Cuts) */

const SAMPLES_PER_SEGMENT = 14;

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

export function buildPath(points, smooth = true) {
  let pts = points;
  if (smooth && points.length > 2) {
    pts = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p3 = points[i + 2] ?? points[i + 1];
      for (let k = 1; k <= SAMPLES_PER_SEGMENT; k++) pts.push(catmullRom(p0, points[i], points[i + 1], p3, k / SAMPLES_PER_SEGMENT));
    }
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, length: cum[cum.length - 1] };
}

/** Punkt bei Wegfraktion s ∈ [0,1] */
export function pointOnPath(path, s) {
  const { pts, cum, length } = path;
  if (length < 1e-9 || s <= 0) return pts[0];
  if (s >= 1) return pts[pts.length - 1];
  const target = s * length;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid; else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const f = (target - cum[lo]) / seg;
  return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * f, y: pts[lo].y + (pts[hi].y - pts[lo].y) * f };
}
