/* ============================================================
   TAKTIKBOARD – App-Hülle
   Startbildschirm "Spielzüge" · Freies Board · Play-Studio
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import Home from "./home/Home.jsx";
import NewPlaySheet from "./home/NewPlaySheet.jsx";
import FreeBoard from "./board/FreeBoard.jsx";
import PlayStudio from "./studio/PlayStudio.jsx";
import ShareSheet from "./studio/ShareSheet.jsx";
import { Dialog, downloadJson } from "./studio/studioUi.jsx";
import { PLAYS, validatePlayTree } from "./play/index.js";
import {
  loadMyPlays, saveMyPlay, deleteMyPlay, newPlayId, importPlays, pendingDrafts, clearDraft, backupObject, findMyPlay,
} from "./store/playStore.js";
import { playFromHash, looksLikePlay, fileNameFor } from "./store/share.js";
import { newPlayFrom } from "./studio/builderModel.js";
import { importSeqs, loadSeqs } from "./legacy/recordingStore.js";

const isBuiltin = (id) => PLAYS.some((p) => p.id === id);

export default function Taktikboard() {
  const [screen, setScreen] = useState("home");          // home | board
  const [myPlays, setMyPlays] = useState(loadMyPlays);
  const [drafts, setDrafts] = useState(pendingDrafts);
  const [open, setOpen] = useState(null);                // { play, origin, mode, me, session }
  const [notice, setNotice] = useState(null);            // { text, error? }
  const [newSheet, setNewSheet] = useState(false);
  const [sharePlay, setSharePlay] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);

  const refresh = () => { setMyPlays(loadMyPlays()); setDrafts(pendingDrafts()); };

  // Änderungen aus einem anderen Tab übernehmen
  useEffect(() => {
    const h = (e) => { if (e.key?.startsWith("taktikboard.")) refresh(); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  /* ----- Geteilter Spielzug im Link (#p=…) ----- */
  useEffect(() => {
    const hash = typeof location !== "undefined" ? location.hash : "";
    if (!/[#&]p=/.test(hash)) return;
    playFromHash(hash).then((play) => {
      if (!looksLikePlay(play)) throw new Error("Der Link enthält keinen Spielzug.");
      const { errors } = validatePlayTree(play);
      if (errors.length) throw new Error(errors[0]);
      setOpen({ play, origin: "shared", mode: /[#&]v=player/.test(hash) ? "player" : "coach", session: Date.now() });
    }).catch((e) => setNotice({
      error: true,
      text: /entpacken|DecompressionStream/i.test(e.message)
        ? "Dieser Browser ist zu alt, um den Link zu öffnen (benötigt z. B. Safari ab iOS 16.4). Bitte den Browser aktualisieren oder den Spielzug als Datei schicken lassen."
        : `Der Link konnte nicht geöffnet werden: ${e.message}`,
    }));
  }, []);

  const openPlay = (play, origin, mode = "coach", me = null) => setOpen({ play, origin, mode, me, session: Date.now() });
  const closePlay = () => {
    setOpen(null);
    refresh();
    if (typeof location !== "undefined" && location.hash) history.replaceState(null, "", location.pathname + location.search);
  };

  /** Speichern mit Bestätigung – Ergebnis geht an den Aufrufer (Builder/Studio) */
  const persistPlay = (play) => {
    const res = saveMyPlay(play);
    if (res.ok) {
      setMyPlays(res.items);
      setDrafts(pendingDrafts());
      setOpen((o) => (o ? { ...o, play, origin: "mine" } : o));
    }
    return res;
  };

  const createPlay = ({ name, court, positions, ball }) => {
    const play = { ...newPlayFrom({ id: newPlayId(), court, positions, ball }), name: name || "Neuer Spielzug" };
    setNewSheet(false);
    openPlay(play, "new", "edit");
  };

  const importFile = async (file) => {
    try {
      const data = JSON.parse(await file.text());
      const isBackup = data?.format === "taktikboard-backup";
      const list = isBackup ? data.plays : [data];
      const valid = [], broken = [];
      for (const p of list ?? []) {
        if (!looksLikePlay(p)) { broken.push("unbekannte Daten"); continue; }
        const { errors } = validatePlayTree(p);
        (errors.length ? broken : valid).push(errors.length ? p.name : p);
      }
      const seqs = isBackup && Array.isArray(data.sequences) ? data.sequences : [];
      if (!valid.length && !seqs.length) throw new Error(broken.length ? "Die Datei enthält keinen abspielbaren Spielzug." : "Die Datei enthält keinen Spielzug.");
      // eingebaute Beispiele nicht als "eigene" importieren
      const res = valid.length ? importPlays(valid.map((p) => (isBuiltin(p.id) ? { ...p, id: newPlayId() } : p)), newPlayId) : { ok: true, added: 0, skipped: 0 };
      if (!res.ok) throw new Error(res.error);
      const sres = seqs.length ? importSeqs(seqs) : { ok: true, added: 0 };
      refresh();
      const parts = [`${res.added} Spielzug${res.added === 1 ? "" : "e"} importiert`];
      if (res.skipped) parts.push(`${res.skipped} bereits vorhanden`);
      if (broken.length) parts.push(`${broken.length} fehlerhaft übersprungen`);
      if (sres.added) parts.push(`${sres.added} Board-Aufnahme${sres.added === 1 ? "" : "n"} wiederhergestellt`);
      if (!sres.ok) parts.push(`Board-Aufnahmen NICHT importiert: ${sres.error}`);
      setNotice({ error: !sres.ok, text: parts.join(", ") + "." });
    } catch (e) {
      setNotice({ error: true, text: `Import fehlgeschlagen: ${e.message}` });
    }
  };

  const backup = () => {
    const obj = backupObject();
    downloadJson(obj, `taktikboard-sicherung-${new Date().toISOString().slice(0, 10)}.json`);
    setNotice({ text: `Sicherung mit ${obj.plays.length} Spielzügen${obj.sequences.length ? ` und ${obj.sequences.length} Board-Aufnahmen` : ""} heruntergeladen. Bewahre die Datei gut auf (z. B. in der Cloud).` });
  };

  const duplicate = (play) => {
    const res = saveMyPlay({ ...structuredClone(play), id: newPlayId(), name: `${play.name} (Kopie)` });
    if (res.ok) { setMyPlays(res.items); setNotice({ text: `„${play.name}“ dupliziert.` }); }
    else setNotice({ error: true, text: res.error });
  };

  const askDelete = (play) => setConfirm({
    title: `„${play.name}“ löschen?`,
    text: "Der Spielzug wird von diesem Gerät gelöscht. Tipp: Vorher als Datei speichern, falls du ihn noch brauchst.",
    actions: [
      { label: "Abbrechen", onClick: () => setConfirm(null) },
      { label: "Als Datei speichern", onClick: () => downloadJson(play, fileNameFor(play)) },
      { label: "Löschen", danger: true, onClick: () => {
        const res = deleteMyPlay(play.id);
        setConfirm(null);
        if (res.ok) { setMyPlays(res.items); clearDraft(play.id); setDrafts(pendingDrafts()); setNotice({ text: `„${play.name}“ gelöscht.` }); }
        else setNotice({ error: true, text: res.error });
      } },
    ],
  });

  /* ===== Play-Studio ===== */
  if (open) {
    return (
      <PlayStudio key={open.session} play={open.play} origin={open.origin}
        initialMode={open.mode} initialMe={open.me} onClose={closePlay} onSave={persistPlay}
        isSaved={!!findMyPlay(open.play.id)} />
    );
  }

  /* ===== Freies Board ===== */
  if (screen === "board") {
    return <FreeBoard onHome={() => { setScreen("home"); refresh(); }}
      onCreatePlay={({ court, positions, ball }) => createPlay({ name: "Neuer Spielzug", court, positions, ball })} />;
  }

  /* ===== Startbildschirm ===== */
  return (
    <>
      <Home
        myPlays={myPlays} builtins={PLAYS} drafts={drafts} notice={notice} onDismissNotice={() => setNotice(null)}
        hasRecordings={loadSeqs().length > 0}
        onOpen={(play, origin, mode) => openPlay(play, origin, mode)}
        onNew={() => setNewSheet(true)}
        onImport={() => fileRef.current?.click()}
        onBackup={backup}
        onBoard={() => setScreen("board")}
        onShare={setSharePlay}
        onDelete={askDelete}
        onDuplicate={duplicate}
        onExportOne={(p) => downloadJson(p, fileNameFor(p))}
        onResumeDraft={(d) => openPlay(d.play, "draft", "edit")}
        onDiscardDraft={(d) => setConfirm({
          title: `Entwurf „${d.play.name}“ verwerfen?`,
          text: "Die ungespeicherten Änderungen gehen verloren.",
          actions: [
            { label: "Abbrechen", onClick: () => setConfirm(null) },
            { label: "Verwerfen", danger: true, onClick: () => { clearDraft(d.play.id); setDrafts(pendingDrafts()); setConfirm(null); } },
          ],
        })}
      />
      <input ref={fileRef} type="file" accept=".json,application/json" hidden aria-label="Spielzug-Datei importieren"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
      {newSheet && <NewPlaySheet onCreate={createPlay} onClose={() => setNewSheet(false)} />}
      {sharePlay && <ShareSheet play={sharePlay} onClose={() => setSharePlay(null)} />}
      {confirm && <Dialog title={confirm.title} onClose={() => setConfirm(null)} actions={confirm.actions}>{confirm.text}</Dialog>}
    </>
  );
}
