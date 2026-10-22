/* Protokoll des Read-Trainings (nur lokal auf dem Gerät).
 * Dient dem Praxistest: Trainerin kann die Antworten als Datei exportieren. */

const KEY = "taktikboard.readlog.v1";
const MAX = 500;

export function loadReadLog() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

/** Eintrag anhängen; Fehler (Speicher voll, privat) sind hier unkritisch und werden ignoriert */
export function logRead(entry) {
  try {
    const list = [...loadReadLog(), { at: new Date().toISOString(), ...entry }].slice(-MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch { return false; }
}

export function clearReadLog() {
  try { localStorage.removeItem(KEY); } catch { /* egal */ }
}

/** CSV (Semikolon, für deutsches Excel) */
export function readLogCsv(list = loadReadLog()) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Zeit", "Spielzug", "Position", "Read", "Gezeigt", "Antwort", "Richtig"];
  const rows = list.map((e) => [e.at, e.play, e.me, e.read, e.shown, e.answer, e.correct ? "ja" : "nein"].map(esc).join(";"));
  return [head.join(";"), ...rows].join("\r\n");
}
