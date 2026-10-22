/* Teilen: Trainer erstellt → teilt → Spielerin öffnet → versteht.
 * Ohne Server: der ganze Spielzug steckt im Link oder in einer Datei. */

import { useEffect, useState } from "react";
import { C_UI, IconButton, Segmented } from "./studioUi.jsx";
import { shareUrl, playToJson, fileNameFor } from "../store/share.js";

export default function ShareSheet({ play, onClose }) {
  const [target, setTarget] = useState("player");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let alive = true;
    shareUrl(play).then((u) => { if (alive) setUrl(target === "player" ? `${u}&v=player` : u); });
    return () => { alive = false; };
  }, [play, target]);

  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const file = () => new File([playToJson(play)], fileNameFor(play), { type: "application/json" });
  const canShareFile = (() => { try { return canShare && navigator.canShare?.({ files: [file()] }); } catch { return false; } })();

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setStatus("Link kopiert."); }
    catch { setStatus("Kopieren nicht erlaubt – Link unten markieren und kopieren."); }
  };
  const shareLink = async () => {
    try { await navigator.share({ title: play.name, text: `Spielzug: ${play.name}`, url }); setStatus("Geteilt."); }
    catch (e) { if (e?.name !== "AbortError") setStatus("Teilen nicht möglich – Link kopieren."); }
  };
  const shareFile = async () => {
    try { await navigator.share({ title: play.name, files: [file()] }); setStatus("Datei geteilt."); }
    catch (e) { if (e?.name !== "AbortError") setStatus("Datei teilen nicht möglich."); }
  };
  const download = () => {
    const blob = new Blob([playToJson(play)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileNameFor(play);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setStatus("Datei gespeichert.");
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Spielzug teilen" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(560px, 100%)", background: C_UI.panel, borderTop: `1px solid ${C_UI.line}`, borderRadius: "16px 16px 0 0",
        padding: "16px 16px calc(16px + env(safe-area-inset-bottom))", display: "grid", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>Mit der Mannschaft teilen</div>
          <IconButton onClick={onClose} title="Schließen">✕</IconButton>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: C_UI.muted }}>Link öffnet</span>
          <Segmented size="sm" label="Ansicht beim Öffnen" value={target} onChange={setTarget}
            options={[{ value: "player", label: "Spielerinnen-Ansicht" }, { value: "coach", label: "Trainer-Ansicht" }]} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canShare && <IconButton active onClick={shareLink} title="Über das Handy teilen" disabled={!url}>Teilen …</IconButton>}
          <IconButton onClick={copy} title="Link kopieren" disabled={!url}>Link kopieren</IconButton>
          {canShareFile && <IconButton onClick={shareFile} title="Als Datei teilen">Datei teilen</IconButton>}
          <IconButton onClick={download} title="Als Datei speichern">Datei speichern</IconButton>
        </div>
        <textarea readOnly value={url} aria-label="Link zum Spielzug" onFocus={(e) => e.target.select()}
          style={{ width: "100%", height: 64, resize: "none", fontSize: 11.5, background: "#0F1317", color: C_UI.muted,
            border: `1px solid ${C_UI.border}`, borderRadius: 8, padding: 8, fontFamily: "ui-monospace, monospace", boxSizing: "border-box" }} />
        <div style={{ fontSize: 12.5, color: C_UI.dim, lineHeight: 1.4 }}>
          Der Link enthält den ganzen Spielzug ({url.length.toLocaleString("de-DE")} Zeichen) – kein Konto, kein Server.
          Spielerinnen öffnen ihn im Browser und können die App danach auch offline nutzen.
          {status && <div style={{ color: C_UI.open, marginTop: 4 }} role="status">{status}</div>}
        </div>
      </div>
    </div>
  );
}
