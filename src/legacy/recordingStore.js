/* LEGACY – REC-Aufnahmen: Snapshot-Frames im localStorage. */
import { writeJson } from "../store/playStore.js";
export const FRAME_MS = 100;                         // Aufnahme-/Replay-Takt
const SEQ_KEY = "taktikboard.sequences.v1";

export const clone = (o) => JSON.parse(JSON.stringify(o));

export const loadSeqs = () => {
  try { return JSON.parse(localStorage.getItem(SEQ_KEY)) || []; } catch { return []; }
};

/** Speichert die Aufnahmen bestätigt. @returns {{ ok, error? }} */
export const persistSeqs = (arr) => {
  const res = writeJson(SEQ_KEY, arr);
  if (!res.ok) res.error = res.error.replace(/den Spielzug|ältere Spielzüge/, (m) => (m === "den Spielzug" ? "die Aufnahmen" : "ältere Aufnahmen oder Spielzüge"));
  return res;
};

/** Aufnahmen aus einer Sicherung ergänzen (vorhandene IDs bleiben unverändert) */
export function importSeqs(list) {
  const cur = loadSeqs();
  const ids = new Set(cur.map((x) => x.id));
  const add = (list ?? []).filter((x) => x && x.id && Array.isArray(x.frames) && !ids.has(x.id));
  if (!add.length) return { ok: true, added: 0 };
  const res = persistSeqs([...cur, ...add]);
  return { ...res, added: res.ok ? add.length : 0 };
}
