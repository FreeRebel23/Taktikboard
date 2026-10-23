import { useEffect, useRef, useState } from "react";
import { saveDraft } from "../store/playStore.js";

/* Entwurf eines Spielzugs im Builder:
 *  - Verlauf für Rückgängig/Wiederholen
 *  - "ungespeichert" = Unterschied zum zuletzt bestätigt gespeicherten Stand
 *  - automatische Entwurfssicherung (Wiederherstellung nach Absturz/geschlossenem Tab)
 *  - Warnung des Browsers beim Schließen mit ungespeicherten Änderungen */

const LIMIT = 100;

export default function useDraft(initial, { savedSnapshot }) {
  const [h, setH] = useState({ past: [], present: initial, future: [] });
  const [saved, setSaved] = useState(savedSnapshot);
  const [draftStatus, setDraftStatus] = useState(null); // { ok, at, error }
  const merging = useRef(false);

  /** Änderung übernehmen. merge=true: mit der letzten Änderung zusammenfassen (z. B. Ziehen). */
  const change = (next, { merge = false } = {}) => setH((s) => {
    if (next === s.present) return s;
    const past = merge && merging.current ? s.past : [...s.past.slice(-LIMIT), s.present];
    merging.current = merge;
    return { past, present: next, future: [] };
  });
  const endMerge = () => { merging.current = false; };
  const undo = () => setH((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  const redo = () => setH((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  /** Ersetzen ohne Verlaufseintrag (z. B. neue ID nach dem Speichern als Kopie) */
  const replace = (next) => setH((s) => ({ ...s, present: next }));

  const draft = h.present;
  const json = JSON.stringify(draft);
  const dirty = json !== saved;
  const latest = useRef(null);           // ungesicherter Stand für die Sofort-Sicherung
  const markSaved = (play) => { latest.current = null; setSaved(JSON.stringify(play)); };
  /** Entwurf bewusst verwerfen: keine Sofort-Sicherung mehr beim Verlassen */
  const forget = () => { latest.current = null; forgotten.current = true; };
  const forgotten = useRef(false);

  // Entwurf automatisch sichern (kurz nach der letzten Änderung)
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      const res = saveDraft(draft);
      setDraftStatus(res.ok ? { ok: true, at: Date.now() } : { ok: false, error: res.error });
    }, 400);
    return () => clearTimeout(t);
  }, [json, dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sofort sichern, wenn die Seite verlassen/versteckt wird (App-Wechsel auf iOS beendet
  // Tabs ohne Vorwarnung) – sonst ginge die letzte Änderung im 400-ms-Fenster verloren.
  latest.current = dirty && !forgotten.current ? draft : null;
  useEffect(() => {
    const flush = () => { if (latest.current) saveDraft(latest.current); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      flush(); // auch beim Verlassen des Builders innerhalb der App
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Browser-Warnung beim Schließen/Neuladen mit ungespeicherten Änderungen
  useEffect(() => {
    if (!dirty) return;
    const h2 = (e) => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", h2);
    return () => window.removeEventListener("beforeunload", h2);
  }, [dirty]);

  return {
    draft, change, endMerge, undo, redo, replace, dirty, markSaved, forget, draftStatus,
    canUndo: h.past.length > 0, canRedo: h.future.length > 0,
  };
}
