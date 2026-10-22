/* Eigene Plays im Browser (localStorage). Funktioniert offline, ohne Konto.
 * Format: [{ play, updatedAt }]. Lesen/Schreiben fehlertolerant (privater Modus usw.). */

const KEY = "taktikboard.plays.v1";

export function loadMyPlays() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY)) ?? [];
    return Array.isArray(arr) ? arr.filter((x) => x?.play?.id) : [];
  } catch { return []; }
}

function persist(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); return true; } catch { return false; }
}

/** Speichert (ersetzt bei gleicher ID). Gibt die neue Liste zurück. */
export function saveMyPlay(play) {
  const arr = loadMyPlays().filter((x) => x.play.id !== play.id);
  arr.unshift({ play, updatedAt: Date.now() });
  persist(arr);
  return arr;
}

export function deleteMyPlay(id) {
  const arr = loadMyPlays().filter((x) => x.play.id !== id);
  persist(arr);
  return arr;
}

export const newPlayId = () => `my_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
