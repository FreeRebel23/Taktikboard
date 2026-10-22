/* Eigene Spielzüge im Browser (localStorage) – offline, ohne Konto.
 *
 * Grundsätze gegen Datenverlust:
 *  - Jeder Schreibvorgang wird zurückgelesen und verglichen. Nur dann gilt er als gespeichert.
 *  - Fehler (Speicher voll, privater Modus, nicht bestätigt) werden mit verständlicher
 *    Meldung zurückgegeben – nie stillschweigend geschluckt.
 *  - Entwürfe werden separat und automatisch gesichert (Wiederherstellung nach Absturz,
 *    geschlossenem Tab oder leerem Akku).
 *  - Sicherungsdatei mit allen Spielzügen für Gerätewechsel und gegen Browser-Löschung.
 */

const KEY = "taktikboard.plays.v1";
const DRAFTS = "taktikboard.drafts.v1";
export const SCHEMA = 1;

let memoryFallback = null; // nur für Tests ohne localStorage

const storage = () => {
  try { if (typeof localStorage !== "undefined") return localStorage; } catch { /* gesperrt */ }
  return null;
};

function readJson(key, fallback) {
  const s = storage();
  if (!s) return memoryFallback?.[key] ?? fallback;
  try {
    const raw = s.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

/** Schreibt und prüft durch Zurücklesen. → { ok, error? } */
function writeJson(key, value) {
  const s = storage();
  const text = JSON.stringify(value);
  if (!s) return { ok: false, error: "Speichern ist in diesem Browser nicht möglich (privater Modus oder gesperrte Website-Daten). Bitte den Spielzug als Datei sichern." };
  try {
    s.setItem(key, text);
  } catch (e) {
    const full = e?.name === "QuotaExceededError" || /quota/i.test(e?.message ?? "");
    return {
      ok: false,
      error: full
        ? "Der Speicher des Browsers ist voll. Bitte ältere Spielzüge als Datei sichern und löschen."
        : "Speichern ist in diesem Browser nicht möglich (privater Modus oder gesperrte Website-Daten). Bitte den Spielzug als Datei sichern.",
    };
  }
  try {
    if (s.getItem(key) !== text) return { ok: false, error: "Das Speichern konnte nicht bestätigt werden. Bitte erneut versuchen oder als Datei sichern." };
  } catch { return { ok: false, error: "Das Speichern konnte nicht bestätigt werden." }; }
  return { ok: true };
}

/** Spielzug in das aktuelle Schema überführen (für spätere Formatänderungen) */
export function migratePlay(play) {
  if (!play || typeof play !== "object") return play;
  return { ...play, schema: play.schema ?? SCHEMA };
}

/* ---------------- Gespeicherte Spielzüge ---------------- */

export function loadMyPlays() {
  const arr = readJson(KEY, []);
  return Array.isArray(arr) ? arr.filter((x) => x?.play?.id).map((x) => ({ ...x, play: migratePlay(x.play) })) : [];
}

export const findMyPlay = (id) => loadMyPlays().find((x) => x.play.id === id) ?? null;

/**
 * Speichert (ersetzt bei gleicher ID) und bestätigt durch Zurücklesen.
 * @returns {{ ok: boolean, error?: string, items: Array, savedAt?: number }}
 */
export function saveMyPlay(play) {
  const before = loadMyPlays();
  const savedAt = Date.now();
  const entry = { play: { ...migratePlay(play) }, updatedAt: savedAt };
  const items = [entry, ...before.filter((x) => x.play.id !== play.id)];
  const res = writeJson(KEY, items);
  if (!res.ok) return { ok: false, error: res.error, items: before };
  // Gezielte Prüfung des eben gespeicherten Spielzugs
  const back = findMyPlay(play.id);
  if (!back || JSON.stringify(back.play) !== JSON.stringify(entry.play)) {
    return { ok: false, error: "Das Speichern konnte nicht bestätigt werden. Bitte erneut versuchen oder als Datei sichern.", items: before };
  }
  clearDraft(play.id);
  requestPersistence();
  return { ok: true, items, savedAt };
}

export function deleteMyPlay(id) {
  const before = loadMyPlays();
  const items = before.filter((x) => x.play.id !== id);
  const res = writeJson(KEY, items);
  return res.ok ? { ok: true, items } : { ok: false, error: res.error, items: before };
}

/* ---------------- Entwürfe (automatisch) ---------------- */

export function loadDrafts() {
  const d = readJson(DRAFTS, {});
  return d && typeof d === "object" ? d : {};
}

/** Sichert einen Entwurf. Rückgabe wie writeJson. */
export function saveDraft(play) {
  const d = loadDrafts();
  d[play.id] = { play, savedAt: Date.now() };
  return writeJson(DRAFTS, d);
}

export function clearDraft(id) {
  const d = loadDrafts();
  if (!(id in d)) return;
  delete d[id];
  writeJson(DRAFTS, d);
}

/** Entwürfe, die neuer sind als der gespeicherte Stand (oder nie gespeichert wurden) */
export function pendingDrafts() {
  const saved = new Map(loadMyPlays().map((x) => [x.play.id, x]));
  return Object.values(loadDrafts())
    .filter((d) => d?.play?.id)
    .filter((d) => {
      const s = saved.get(d.play.id);
      return !s || (d.savedAt > s.updatedAt && JSON.stringify(s.play) !== JSON.stringify(d.play));
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

/* ---------------- Sicherung (alle Spielzüge in einer Datei) ---------------- */

export function backupObject() {
  return { format: "taktikboard-backup", version: 1, exportedAt: new Date().toISOString(), plays: loadMyPlays().map((x) => x.play) };
}

/**
 * Importiert Spielzüge aus einer Sicherung oder einer Einzeldatei.
 * Gleiche ID + gleicher Inhalt → übersprungen; gleiche ID + anderer Inhalt → als Kopie.
 * @returns {{ ok, error?, added, skipped, items }}
 */
export function importPlays(plays, newId) {
  let items = loadMyPlays();
  let added = 0, skipped = 0;
  for (const raw of plays) {
    const play = migratePlay(raw);
    const existing = items.find((x) => x.play.id === play.id);
    if (existing && JSON.stringify(existing.play) === JSON.stringify(play)) { skipped++; continue; }
    const p = existing ? { ...play, id: newId(), name: `${play.name} (importiert)` } : play;
    items = [{ play: p, updatedAt: Date.now() }, ...items];
    added++;
  }
  const res = writeJson(KEY, items);
  return res.ok ? { ok: true, added, skipped, items } : { ok: false, error: res.error, added: 0, skipped, items: loadMyPlays() };
}

/** Bittet den Browser, die Daten nicht automatisch zu löschen (wo unterstützt). */
let persistAsked = false;
export function requestPersistence() {
  if (persistAsked || typeof navigator === "undefined" || !navigator.storage?.persist) return;
  persistAsked = true;
  navigator.storage.persist().catch(() => {});
}

export async function storageInfo() {
  try {
    const persisted = await navigator.storage?.persisted?.();
    const est = await navigator.storage?.estimate?.();
    return { persisted: !!persisted, usage: est?.usage, quota: est?.quota };
  } catch { return { persisted: false }; }
}

export const newPlayId = () => `my_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** Nur für Tests: In-Memory-Speicher statt localStorage */
export function __setMemoryStorage(obj) { memoryFallback = obj; }
