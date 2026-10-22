/* Startbildschirm "Spielzüge": eigene Spielzüge, Beispiele, Entwürfe, Neu/Import/Sicherung.
 * Mobile zuerst: Karten untereinander, große Tippflächen. */

import { useEffect, useMemo, useState } from "react";
import { C_UI, Chip, Dialog } from "../studio/studioUi.jsx";
import { OFF_COLOR, DEF_COLOR } from "../court/constants.js";
import { validatePlayTree, allChoicePaths } from "../play/index.js";
import { storageInfo } from "../store/playStore.js";

const dateFmt = (ms) => new Date(ms).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Kleine Vorschau der Startaufstellung */
export function MiniCourt({ play, size = 64 }) {
  const H = play.court === "half" ? 140 : 280;
  const vb = play.court === "half" ? "-8 -8 166 156" : "-8 -8 166 296";
  return (
    <svg viewBox={vb} width={play.court === "half" ? size : size * 0.6} height={size} aria-hidden="true" style={{ flexShrink: 0, borderRadius: 6, background: "#B97A44" }}>
      <rect x="0" y="0" width="150" height={H} fill="none" stroke="#EDE8DC" strokeWidth="2" />
      <rect x="50.5" y="0" width="49" height="58" fill="rgba(96,42,32,0.5)" stroke="#EDE8DC" strokeWidth="1.6" />
      {play.court === "full" && <line x1="0" y1="140" x2="150" y2="140" stroke="#EDE8DC" strokeWidth="1.6" />}
      {Object.entries(play.start?.positions ?? {}).map(([id, p]) => (
        <circle key={id} cx={p.x} cy={p.y} r={play.court === "half" ? 7 : 9} fill={id[0] === "o" ? OFF_COLOR : DEF_COLOR} stroke="#1B1410" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

function PlayCard({ play, updatedAt, builtin, onOpen, onPlayer, onEdit, onShare, onMore }) {
  const info = useMemo(() => {
    const { errors } = validatePlayTree(play);
    const variants = allChoicePaths(play).length;
    const beats = play.beats.length;
    return { ok: errors.length === 0, variants, beats };
  }, [play]);
  const btn = (primary) => ({
    padding: "9px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 14, minHeight: 40,
    border: `1px solid ${primary ? C_UI.accent : C_UI.border}`, background: primary ? C_UI.accent : "#232B32", color: primary ? "#16110C" : C_UI.text,
  });
  return (
    <article style={{ display: "grid", gap: 10, padding: 12, borderRadius: 14, background: C_UI.card, border: `1px solid ${C_UI.line}` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <MiniCourt play={play} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.25, overflowWrap: "anywhere" }}>{play.name}</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
            <Chip tone="#2A333B" ink={C_UI.muted}>{play.court === "half" ? "Halbfeld" : "Ganzfeld"}</Chip>
            {info.variants > 1 && <Chip tone="rgba(255,209,102,0.18)" ink="#FFE9B3">{info.variants} Varianten</Chip>}
            {!info.ok && <Chip tone="rgba(224,70,58,0.2)" ink="#FFB4A8">unvollständig</Chip>}
            {updatedAt && <span style={{ fontSize: 12, color: C_UI.dim }}>gespeichert {dateFmt(updatedAt)}</span>}
          </div>
          {play.summary && <p style={{ margin: "6px 0 0", fontSize: 13, color: C_UI.muted, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{play.summary}</p>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={btn(true)} onClick={onOpen} disabled={!info.ok} title={info.ok ? "Ansehen" : "Erst im Builder vervollständigen"}>Ansehen</button>
        <button style={btn(false)} onClick={onPlayer} disabled={!info.ok}>Als Spielerin</button>
        <button style={btn(false)} onClick={onEdit}>{builtin ? "Kopie bearbeiten" : "Bearbeiten"}</button>
        <button style={btn(false)} onClick={onShare} disabled={!info.ok}>Teilen</button>
        {onMore && <button style={btn(false)} onClick={onMore} aria-label={`Weitere Aktionen für ${play.name}`} title="Weitere Aktionen">⋯</button>}
      </div>
    </article>
  );
}

export default function Home({
  myPlays, builtins, drafts, notice, onDismissNotice,
  onOpen, onNew, onImport, onBackup, onBoard, onShare, onDelete, onDuplicate, onExportOne, onResumeDraft, onDiscardDraft,
}) {
  const [more, setMore] = useState(null);
  const [store, setStore] = useState(null);
  useEffect(() => { storageInfo().then(setStore); }, [myPlays.length]);

  const section = { display: "grid", gap: 10 };
  const h2 = { margin: "4px 2px 0", fontSize: 13, fontWeight: 800, letterSpacing: "0.09em", textTransform: "uppercase", color: C_UI.muted };
  const action = (primary) => ({
    padding: "11px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 15, minHeight: 44,
    border: `1px solid ${primary ? C_UI.accent : C_UI.border}`, background: primary ? C_UI.accent : "#232B32", color: primary ? "#16110C" : C_UI.text,
  });

  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: C_UI.bg, color: C_UI.text,
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 16,
        padding: "calc(14px + env(safe-area-inset-top)) calc(16px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left))" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Taktik<span style={{ color: C_UI.accent }}>board</span>
          </h1>
          <button style={action(false)} onClick={onBoard}>Freies Board</button>
        </header>

        {notice && (
          <div role={notice.error ? "alert" : "status"} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12,
            background: notice.error ? "#3A1D1A" : "rgba(95,211,141,0.12)", color: notice.error ? "#FFD9D3" : "#CFF5DE", fontSize: 14 }}>
            <span style={{ flex: 1 }}>{notice.text}</span>
            <button style={action(false)} onClick={onDismissNotice}>OK</button>
          </div>
        )}

        {drafts.length > 0 && (
          <section style={section} aria-label="Ungesicherte Entwürfe">
            <h2 style={{ ...h2, color: C_UI.warn }}>Ungesicherte Entwürfe</h2>
            {drafts.map((d) => (
              <div key={d.play.id} role="alert" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, background: "rgba(255,209,102,0.12)", color: "#FFE9B3" }}>
                <span style={{ flex: "1 1 200px", fontSize: 14 }}><strong>{d.play.name}</strong> – automatisch gesichert {dateFmt(d.savedAt)}, aber noch nicht gespeichert.</span>
                <button style={action(true)} onClick={() => onResumeDraft(d)}>Weiter bearbeiten</button>
                <button style={action(false)} onClick={() => onDiscardDraft(d)}>Verwerfen</button>
              </div>
            ))}
          </section>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={action(true)} onClick={onNew}>+ Neuer Spielzug</button>
          <button style={action(false)} onClick={onImport}>Importieren</button>
          {myPlays.length > 0 && <button style={action(false)} onClick={onBackup}>Sicherung herunterladen</button>}
        </div>

        <section style={section} aria-label="Meine Spielzüge">
          <h2 style={h2}>Meine Spielzüge</h2>
          {myPlays.length === 0 && (
            <div style={{ padding: 14, borderRadius: 14, border: `1px dashed ${C_UI.border}`, color: C_UI.muted, fontSize: 14, lineHeight: 1.5 }}>
              Noch keine eigenen Spielzüge. Starte mit „+ Neuer Spielzug“ und einer Aufstellung – oder öffne ein Beispiel unten und wähle „Kopie bearbeiten“.
            </div>
          )}
          {myPlays.map(({ play, updatedAt }) => (
            <PlayCard key={play.id} play={play} updatedAt={updatedAt}
              onOpen={() => onOpen(play, "mine", "coach")} onPlayer={() => onOpen(play, "mine", "player")}
              onEdit={() => onOpen(play, "mine", "edit")} onShare={() => onShare(play)} onMore={() => setMore(play)} />
          ))}
        </section>

        <section style={section} aria-label="Beispiele">
          <h2 style={h2}>Beispiele</h2>
          {builtins.map((play) => (
            <PlayCard key={play.id} play={play} builtin
              onOpen={() => onOpen(play, "builtin", "coach")} onPlayer={() => onOpen(play, "builtin", "player")}
              onEdit={() => onOpen(play, "builtin", "edit")} onShare={() => onShare(play)} />
          ))}
        </section>

        <footer style={{ fontSize: 13, color: C_UI.dim, lineHeight: 1.5 }}>
          Deine Spielzüge sind nur auf diesem Gerät gespeichert (kein Konto, kein Server).
          {myPlays.length > 0 && " Lade regelmäßig eine Sicherung herunter, besonders vor einem Gerätewechsel."}
          {store && !store.persisted && " Tipp: Füge die App zum Home-Bildschirm hinzu – dann löscht der Browser die Daten nicht automatisch."}
        </footer>
      </div>

      {more && (
        <Dialog title={more.name} onClose={() => setMore(null)} actions={[
          { label: "Duplizieren", onClick: () => { onDuplicate(more); setMore(null); } },
          { label: "Als Datei speichern", onClick: () => { onExportOne(more); setMore(null); } },
          { label: "Löschen …", danger: true, onClick: () => { const p = more; setMore(null); onDelete(p); } },
          { label: "Schließen", primary: true, onClick: () => setMore(null) },
        ]} />
      )}
    </div>
  );
}
