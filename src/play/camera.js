/* Kamera: Bildausschnitt pro Beat.
 *
 * Die Kamera folgt nicht blind einer Figur. Sie hält über den ganzen Beat den
 * Zusammenhang sichtbar – eigene Spielerin, ihr Signal (wen sie beobachtet), den Ball,
 * Passpartnerinnen, die direkte Gegenspielerin und das Ziel ihres Laufwegs.
 * Der Ausschnitt ist pro Beat konstant (kein Wackeln) und wird zwischen Beats animiert.
 */

import { sampleFrame } from "./engine.js";
import { ACTIONS } from "./actions.js";
import { describeRole } from "./describe.js";

const SAMPLES = 10;
const COURT_W = 150;

function bboxOf(points) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of points) {
    if (!p) continue;
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

/** Rand, Mindestgröße, Begrenzung auf Feld + Einwurfrand */
function finish(C, box, { pad = 16, min = 80 } = {}) {
  let { x0, y0, x1, y1 } = box;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const grow = (a, b, m) => { const d = m - (b - a); return d > 0 ? [a - d / 2, b + d / 2] : [a, b]; };
  [x0, x1] = grow(x0, x1, min);
  [y0, y1] = grow(y0, y1, min);
  const M = 12;
  const clampSpan = (a, b, lo, hi) => {
    if (b - a >= hi - lo) return [lo, hi];
    if (a < lo) return [lo, lo + (b - a)];
    if (b > hi) return [hi - (b - a), hi];
    return [a, b];
  };
  [x0, x1] = clampSpan(x0, x1, -M, COURT_W + M);
  [y0, y1] = clampSpan(y0, y1, -M, C.courtH + M);
  return { x0, y0, x1, y1 };
}

const sampleBeat = (C, b) => Array.from({ length: SAMPLES + 1 }, (_, i) => sampleFrame(C, b.t0 + (b.dur * i) / SAMPLES + (i === 0 ? 1e-4 : 0)));

/** Wer gehört im Beat zur Spielerin dazu? */
export function relatedIds(C, beatIndex, me) {
  const b = C.beats[beatIndex];
  const ids = new Set([me]);
  const role = describeRole(C, beatIndex, me);
  if (role.watch && role.watch !== "ball" && C.entity[role.watch]) ids.add(role.watch);
  for (const p of b.passes) if (p.from === me || p.to === me) { ids.add(p.from); ids.add(p.to); }
  // Mannschaftsverteidigung: wen verantworte ich im Beat / wer verantwortet mich?
  const sim = b.cache?.get("sim");
  if (sim) {
    for (const r of sim.resp[me] ?? []) if (r) ids.add(r);
    for (const [d, list] of Object.entries(sim.resp)) if (list.includes(me)) ids.add(d);
  }
  for (const [pid, acts] of b.byPlayer) {
    for (const a of acts) {
      if (!ACTIONS[a.type]?.implemented) continue;
      if (pid === me && a.target) ids.add(a.target);
      if (a.target === me) ids.add(pid);
      if (pid === me && a.on) ids.add(a.on);
      if (a.players?.includes(me)) { a.players.forEach((x) => ids.add(x)); ids.add(a.target); }
      if (a.on === me) ids.add(pid);
    }
  }
  return [...ids];
}

/** Ausschnitt für den Spielerinnen-Modus */
export function playerCamera(C, beatIndex, me) {
  const b = C.beats[beatIndex];
  const ids = relatedIds(C, beatIndex, me);
  const pts = [];
  for (const f of sampleBeat(C, b)) {
    for (const id of ids) pts.push(f.players[id]);
    pts.push({ x: f.ball.x, y: f.ball.y });
  }
  return finish(C, bboxOf(pts), { pad: 18, min: 84 });
}

/** Ausschnitt für mehrere Positionen (Zusammenspiel/Team): alle plus ihre Partnerinnen und der Ball */
export function groupCamera(C, beatIndex, group) {
  const b = C.beats[beatIndex];
  const ids = new Set(group.flatMap((id) => relatedIds(C, beatIndex, id)));
  const pts = [];
  for (const f of sampleBeat(C, b)) {
    for (const id of ids) pts.push(f.players[id]);
    pts.push({ x: f.ball.x, y: f.ball.y });
  }
  return finish(C, bboxOf(pts), { pad: 20, min: 96 });
}

/** Ausschnitt für die Traineransicht: alles, was sich im Beat bewegt, plus Ball */
export function actionCamera(C, beatIndex) {
  const b = C.beats[beatIndex];
  const frames = sampleBeat(C, b);
  const first = frames[0], last = frames[frames.length - 1];
  const moving = C.ids.filter((id) => {
    let d = 0;
    for (let i = 1; i < frames.length; i++) d += Math.hypot(frames[i].players[id].x - frames[i - 1].players[id].x, frames[i].players[id].y - frames[i - 1].players[id].y);
    return d > 4;
  });
  const ids = new Set(moving);
  for (const p of b.passes) { ids.add(p.from); ids.add(p.to); }
  if (first.ball.holder) ids.add(first.ball.holder);
  if (last.ball.holder) ids.add(last.ball.holder);
  const pts = [];
  for (const f of frames) {
    for (const id of ids) pts.push(f.players[id]);
    pts.push({ x: f.ball.x, y: f.ball.y });
  }
  return finish(C, bboxOf(pts), { pad: 18, min: 96 });
}

/**
 * Court-Box → viewBox in Bildschirmkoordinaten, auf das Seitenverhältnis des
 * Containers erweitert (füllt die Fläche) und auf den Gesamtausschnitt begrenzt.
 */
export function boxToViewBox(box, { landscape, aspect, full }) {
  let r = landscape
    ? { x: box.y0, y: COURT_W - box.x1, w: box.y1 - box.y0, h: box.x1 - box.x0 }
    : { x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0 };
  if (aspect > 0) {
    if (r.w / r.h < aspect) { const w = r.h * aspect; r = { ...r, x: r.x - (w - r.w) / 2, w }; }
    else { const h = r.w / aspect; r = { ...r, y: r.y - (h - r.h) / 2, h }; }
  }
  if (r.w >= full.w || r.h >= full.h) {
    // größer als das ganze Feld → Gesamtansicht (meet zentriert)
    if (r.w >= full.w && r.h >= full.h) return full;
  }
  const clamp = (pos, size, lo, span) => (size >= span ? lo - (size - span) / 2 : Math.min(Math.max(pos, lo), lo + span - size));
  return { x: clamp(r.x, r.w, full.x, full.w), y: clamp(r.y, r.h, full.y, full.h), w: r.w, h: r.h };
}
