/* LEGACY – REC-Aufnahmen: Snapshot-Frames im localStorage. */
export const FRAME_MS = 100;                         // Aufnahme-/Replay-Takt
const SEQ_KEY = "taktikboard.sequences.v1";

export const clone = (o) => JSON.parse(JSON.stringify(o));

export const loadSeqs = () => {
  try { return JSON.parse(localStorage.getItem(SEQ_KEY)) || []; } catch { return []; }
};

export const persistSeqs = (arr) => {
  try { localStorage.setItem(SEQ_KEY, JSON.stringify(arr)); } catch {}
};
