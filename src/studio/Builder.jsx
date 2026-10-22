/* Play Builder: Spielzüge ohne Programmcode und ohne Aufnahme erstellen.
 *
 *   Aufstellung  – Figuren ziehen, Ballbesitz wählen
 *   Beat         – Figur antippen → Aktion wählen → Ziel antippen (Punkt / Spielerin)
 *                  Ziele und Umwege direkt auf dem Feld verschieben, Timing in Sekunden,
 *                  "danach" für Aktionsfolgen, Coaching je Rolle
 *   Read         – Entscheidungspunkt mit zwei Reaktionen der Verteidigung
 *
 * Datensicherheit: Speichern wird bestätigt oder als Fehler gemeldet (mit Datei-Fallback),
 * Entwürfe werden automatisch gesichert, Verlassen mit ungespeicherten Änderungen fragt nach.
 * Eingebaute Spielzüge werden nie überschrieben (Speichern = Kopie). */

import { useEffect, useMemo, useRef, useState } from "react";
import CourtStage from "../ui/CourtStage.jsx";
import PlayScene from "../render/PlayScene.jsx";
import Player25D, { TEAM_STYLE } from "../render/Player25D.jsx";
import { compileVariant, sampleFrame, beatDiagram, validatePlayTree } from "../play/index.js";
import { ACTIONS } from "../play/actions.js";
import { PASS_KINDS } from "../play/ballFlight.js";
import { STANCES } from "../play/model.js";
import { zoneName } from "../play/describe.js";
import usePlayback from "../hooks/usePlayback.js";
import useWide, { panelStyle } from "../hooks/useWide.js";
import { C_UI, IconButton, Label, Chip, Dialog, downloadJson } from "./studioUi.jsx";
import useDraft from "./useDraft.js";
import {
  flatBeats, segments, addBeat, removeBeat, duplicateBeat, addAction, removeAction, patchAction,
  setRole, addDecision, removeDecision, patchDecision, BUILDER_ACTIONS, targetKind, updateBeat,
  moveBeat, addVia, clearVia, setPoint,
} from "./builderModel.js";
import { newPlayId, loadDrafts, clearDraft, findMyPlay } from "../store/playStore.js";
import { fileNameFor } from "../store/share.js";

const HIT = 9;        // Tipp-Radius Figuren (Court-Einheiten)
const HANDLE_HIT = 6; // Tipp-Radius Ziel-Griffe
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, fontSize: 15, fontFamily: "inherit",
  color: C_UI.text, background: "#0F1317", border: `1px solid ${C_UI.border}`, outline: "none",
};
const time = (ms) => new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const sec = (v) => v.toFixed(1).replace(".", ",");

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "grid", gap: 3 }}>
      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C_UI.muted }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: C_UI.dim }}>{hint}</span>}
    </label>
  );
}

const actionLabel = (C, a) => {
  const L = (id) => C?.entity[id]?.label ?? id;
  const name = ACTIONS[a.type]?.label ?? a.type;
  if (a.type === "pass") return `Pass ${L(a.from)} → ${L(a.to)}`;
  if (a.type === "trap") return `${L(a.players[0])} + ${L(a.players[1])}: Trap gegen ${L(a.target)}`;
  if (a.target) return `${L(a.player)}: ${name} → ${L(a.target)}`;
  if (a.to) return `${L(a.player)}: ${name} → ${C ? zoneName(C, a.to) : ""}${a.via?.length ? " (mit Umweg)" : ""}`;
  return `${L(a.player)}: ${name}`;
};

export default function Builder({ play, origin, onDone, onSave }) {
  const savedEntry = useMemo(() => findMyPlay(play.id), [play.id]);
  // Bezugspunkt für "ungespeichert": gespeicherter Stand; neue/geteilte/eingebaute: Ausgangsstand.
  // Wiederhergestellte Entwürfe sind immer ungespeichert.
  const initialSaved = origin === "draft" ? (savedEntry ? JSON.stringify(savedEntry.play) : "\u0000") : JSON.stringify(savedEntry?.play ?? play);
  const D = useDraft(structuredClone(play), { savedSnapshot: initialSaved });
  const draft = D.draft;
  const change = D.change;

  const [choices, setChoices] = useState({});
  const [step, setStep] = useState(-1);          // -1 = Aufstellung, sonst flacher Beat-Index
  const [sel, setSel] = useState(null);
  const [pick, setPick] = useState(null);        // { type, after, kind, partner? } wartet auf Ziel
  const [after, setAfter] = useState(false);
  const [status, setStatus] = useState(savedEntry && origin !== "draft" ? { kind: "saved", at: savedEntry.updatedAt } : null);
  const [dialog, setDialog] = useState(null);
  const [showDecision, setShowDecision] = useState(null);
  const lastSaved = useRef(savedEntry?.play ?? play);
  const drag = useRef(null);                     // { kind: "player", id } | { kind: "handle", k, which }
  const wide = useWide();

  // Ungesicherter Entwurf von früher? → Wiederherstellung anbieten
  const [recovery, setRecovery] = useState(() => {
    if (origin === "draft") return null;
    const d = loadDrafts()[play.id];
    if (!d?.play) return null;
    if (JSON.stringify(d.play) === JSON.stringify(play)) return null;
    if (savedEntry && d.savedAt <= savedEntry.updatedAt) return null;
    return d;
  });

  const flat = flatBeats(draft, choices);
  const segs = segments(draft, choices);
  const check = useMemo(() => validatePlayTree(draft), [draft]);

  // Letzter gültiger Stand zum Anzeigen (bei Fehlern bleibt das Feld bedienbar)
  const lastGood = useRef(null);
  const C = useMemo(() => {
    try { const c = compileVariant(draft, choices); lastGood.current = c; return c; } catch { return lastGood.current; }
  }, [draft, choices]);

  const playback = usePlayback(C?.total ?? 0, "builder");
  const beatIdx = C && step >= 0 ? Math.min(step, C.beats.length - 1) : -1;
  const beatInfo = beatIdx >= 0 ? C.beats[beatIdx] : null;
  useEffect(() => { if (beatInfo) playback.seek(beatInfo.t0 + 1e-4); }, [step, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const frame = beatInfo ? sampleFrame(C, playback.time) : null;
  const diagram = beatInfo ? beatDiagram(C, beatIdx) : null;
  const curBeat = step >= 0 ? flat[step]?.beat : null;
  const holderAtStart = beatInfo?.startHolder;
  const team = (id) => draft.entities.find((e) => e.id === id)?.team;
  const label = (id) => draft.entities.find((e) => e.id === id)?.label ?? id;

  /* ---------- Ziel-Griffe der Laufaktionen im aktuellen Beat ---------- */
  const handles = useMemo(() => {
    if (!curBeat) return [];
    const out = [];
    curBeat.actions.forEach((a, k) => {
      if (ACTIONS[a.type]?.kind !== "path" || !a.to) return;
      const t = team(a.player);
      (a.via ?? []).forEach((v, i) => out.push({ k, which: i, x: v.x, y: v.y, team: t, via: true }));
      out.push({ k, which: "to", x: a.to.x, y: a.to.y, team: t, via: false });
    });
    return out;
  }, [curBeat]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Treffer & Gesten ---------- */
  const posOf = (id) => (step < 0 ? draft.start.positions[id] : frame?.players[id]);
  const hitPlayer = (p) => {
    let best = null, bd = HIT;
    for (const e of draft.entities) {
      const q = posOf(e.id);
      if (!q) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd) { bd = d; best = e.id; }
    }
    return best;
  };
  const hitHandle = (p) => handles.find((h) => Math.hypot(h.x - p.x, h.y - p.y) < HANDLE_HIT) ?? null;

  const finishPick = (target, p) => {
    const tk = targetKind(pick.type);
    let action = null;
    if (tk === "point") action = { type: pick.type, player: sel, to: { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 } };
    if (tk === "opponent" && target && team(target) !== team(sel)) action = { type: pick.type, player: sel, target };
    if (tk === "teammate" && target && target !== sel && team(target) === team(sel)) action = { type: "pass", from: sel, to: target, start: 0.35, end: 0.7, kind: "chest" };
    if (tk === "partner") {
      if (!pick.partner) {
        if (target && target !== sel && team(target) === team(sel)) { setPick({ ...pick, partner: target }); return; }
      } else if (target && team(target) !== team(sel)) action = { type: "trap", players: [sel, pick.partner], target };
    }
    if (!action) return; // falsches Ziel → weiter warten
    change(addAction(draft, choices, step, action, { after: pick.after }));
    setPick(null);
  };

  const onDown = (e, p, svg) => {
    if (pick) { finishPick(hitPlayer(p), p); return; }
    if (step < 0) {
      const hit = hitPlayer(p);
      if (hit) { drag.current = { kind: "player", id: hit }; setSel(hit); try { svg.setPointerCapture(e.pointerId); } catch {} }
      else setSel(null);
      return;
    }
    const h = hitHandle(p);
    if (h) { drag.current = { kind: "handle", ...h }; try { svg.setPointerCapture(e.pointerId); } catch {} return; }
    setSel(hitPlayer(p));
  };
  const onMove = (e, p) => {
    const d = drag.current;
    if (!d) return;
    const H = draft.court === "half" ? 140 : 280;
    const q = { x: Math.round(Math.max(-6, Math.min(156, p.x)) * 10) / 10, y: Math.round(Math.max(-6, Math.min(H + 6, p.y)) * 10) / 10 };
    if (d.kind === "player") {
      change({ ...draft, start: { ...draft.start, positions: { ...draft.start.positions, [d.id]: q } } }, { merge: true });
    } else {
      change(setPoint(draft, choices, step, d.k, d.which, q), { merge: true });
    }
  };
  const onUp = () => { drag.current = null; D.endMerge(); };

  // Tastatur: Strg/Cmd+Z, Strg/Cmd+Umschalt+Z
  useEffect(() => {
    const h = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? D.redo() : D.undo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  /* ---------- Speichern & Verlassen ---------- */
  const save = () => {
    let p = draft;
    if (origin === "builtin") p = { ...draft, id: newPlayId(), name: `${draft.name} (Kopie)` };
    else if (!p.id?.startsWith("my_")) p = { ...draft, id: newPlayId() };
    const res = onSave(p);
    if (res?.ok) {
      if (p !== draft) { D.replace(p); clearDraft(draft.id); }
      D.markSaved(p);
      lastSaved.current = p;
      setStatus({ kind: "saved", at: res.savedAt ?? Date.now(), incomplete: check.errors.length > 0 });
    } else {
      setStatus({ kind: "error", error: res?.error ?? "Unbekannter Fehler beim Speichern." });
    }
    return { ...res, play: p };
  };

  // Nie gespeicherter neuer Spielzug/Entwurf: Verwerfen führt zurück zur Übersicht
  const unsavedNew = () => (origin === "new" || origin === "draft") && !findMyPlay(draft.id);
  const leave = () => {
    if (!D.dirty) { D.forget(); clearDraft(draft.id); onDone(unsavedNew() ? null : draft, { close: unsavedNew() }); return; }
    setDialog({
      title: "Ungespeicherte Änderungen",
      text: "Du hast Änderungen, die noch nicht gespeichert sind.",
      actions: [
        { label: "Weiter bearbeiten", onClick: () => setDialog(null) },
        { label: "Verwerfen", danger: true, onClick: () => { const close = unsavedNew(); D.forget(); clearDraft(draft.id); setDialog(null); onDone(close ? null : lastSaved.current, { close }); } },
        { label: "Speichern", primary: true, onClick: () => { const r = save(); setDialog(null); if (r?.ok) onDone(r.play); } },
      ],
    });
  };

  /* ---------- Szene für die Aufstellung ---------- */
  const setupPlayers = draft.entities.map((e) => ({
    id: e.id, team: e.team, label: e.label, ...draft.start.positions[e.id], vx: 0, vy: 0, speed: 0,
    body: e.team === "offense" ? (draft.attack === "down" ? Math.PI / 2 : -Math.PI / 2) : (draft.attack === "down" ? -Math.PI / 2 : Math.PI / 2),
    gaze: e.team === "offense" ? -Math.PI / 2 : Math.PI / 2, stance: "normal", hasBall: e.id === draft.start.ball, trail: null,
  }));
  const selPos = sel ? posOf(sel) : null;

  const pickHint = pick && (() => {
    const tk = targetKind(pick.type);
    if (tk === "point") return `${ACTIONS[pick.type].label} für ${label(sel)}: Tippe auf das Ziel im Feld.`;
    if (tk === "teammate") return `Pass von ${label(sel)}: Tippe auf die Mitspielerin, die den Ball bekommt.`;
    if (tk === "opponent") return `${ACTIONS[pick.type].label} für ${label(sel)}: Tippe auf die Gegenspielerin.`;
    if (tk === "partner") return pick.partner ? "Tippe auf die Ballführerin, die gedoppelt wird." : "Tippe auf die zweite Verteidigerin für den Trap.";
    return "";
  })();

  const selRole = sel && curBeat ? (curBeat.roles?.[sel] ?? {}) : {};
  const selTeam = sel ? team(sel) : null;
  const canPass = sel && step >= 0 && (holderAtStart === sel || curBeat?.actions.some((a) => a.type === "pass" && a.to === sel));
  const lastSeg = segs[segs.length - 1];
  const noActionsAnywhere = flat.every((f) => f.beat.actions.length === 0);
  const durS = (curBeat?.duration ?? 1000) / 1000;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: C_UI.bg, color: C_UI.text,
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif" }}>
      {/* Kopf */}
      <div style={{ flexShrink: 0, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap",
        padding: "calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 4px calc(12px + env(safe-area-inset-left))" }}>
        <IconButton onClick={leave} title="Bearbeiten beenden">← Fertig</IconButton>
        <input aria-label="Name des Spielzugs" value={draft.name} onChange={(e) => change({ ...draft, name: e.target.value }, { merge: true })}
          onBlur={D.endMerge} style={{ ...inputStyle, flex: "1 1 150px", width: "auto", fontWeight: 800 }} />
        <IconButton onClick={D.undo} disabled={!D.canUndo} title="Rückgängig">↶</IconButton>
        <IconButton onClick={D.redo} disabled={!D.canRedo} title="Wiederholen">↷</IconButton>
        <IconButton active={D.dirty} onClick={save} title="Spielzug speichern">Speichern</IconButton>
      </div>

      {/* Speicherstatus – immer ehrlich */}
      <div aria-live="polite" style={{ flexShrink: 0, padding: "0 14px 6px", fontSize: 12.5, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {status?.kind === "error" ? null : D.dirty ? (
          <span style={{ color: C_UI.warn }}>
            ● Nicht gespeichert
            {D.draftStatus?.ok && <span style={{ color: C_UI.muted }}> · Entwurf automatisch gesichert {time(D.draftStatus.at)}</span>}
            {D.draftStatus && !D.draftStatus.ok && <span style={{ color: "#FFB4A8" }}> · Entwurf konnte nicht gesichert werden</span>}
          </span>
        ) : status?.kind === "saved" ? (
          <span role="status" style={{ color: C_UI.open, fontWeight: 700 }}>
            ✓ Gespeichert {time(status.at)}{status.incomplete ? " – noch nicht abspielbar (siehe Hinweise unten)" : ""}
          </span>
        ) : origin === "builtin" ? (
          <span style={{ color: C_UI.muted }}>Eingebauter Spielzug – „Speichern“ legt eine eigene Kopie an.</span>
        ) : null}
      </div>
      {status?.kind === "error" && (
        <div role="alert" style={{ margin: "0 12px 6px", padding: "10px 12px", borderRadius: 10, background: "#3A1D1A", color: "#FFD9D3", fontSize: 13.5, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong>Nicht gespeichert.</strong> <span style={{ flex: "1 1 200px" }}>{status.error}</span>
          <IconButton onClick={() => downloadJson(draft, fileNameFor(draft))} title="Als Datei sichern">Als Datei sichern</IconButton>
          <IconButton onClick={save} title="Erneut speichern">Erneut versuchen</IconButton>
        </div>
      )}
      {recovery && (
        <div role="alert" style={{ margin: "0 12px 6px", padding: "10px 12px", borderRadius: 10, background: "rgba(255,209,102,0.14)", color: "#FFE9B3", fontSize: 13.5, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 200px" }}>Es gibt einen ungespeicherten Entwurf vom {new Date(recovery.savedAt).toLocaleString("de-DE")}.</span>
          <IconButton onClick={() => { change(recovery.play); setRecovery(null); }} title="Entwurf wiederherstellen">Wiederherstellen</IconButton>
          <IconButton onClick={() => { clearDraft(play.id); setRecovery(null); }} title="Entwurf verwerfen">Verwerfen</IconButton>
        </div>
      )}

      {/* Beat-Leiste */}
      <div style={{ flexShrink: 0, display: "flex", gap: 6, overflowX: "auto", padding: "0 12px 6px" }}>
        <IconButton active={step < 0} onClick={() => { setStep(-1); setPick(null); }} title="Aufstellung">Aufstellung</IconButton>
        {flat.map((f, i) => (
          <span key={f.beat.id} style={{ display: "inline-flex", gap: 6 }}>
            {f.j === 0 && f.decision && (
              <IconButton active={showDecision === f.decision.id} onClick={() => setShowDecision(showDecision === f.decision.id ? null : f.decision.id)}
                title="Read bearbeiten" style={{ borderColor: C_UI.warn, color: showDecision === f.decision.id ? "#16110C" : "#FFE9B3", background: showDecision === f.decision.id ? C_UI.warn : "#232B32" }}>
                ◆ {f.option.label}
              </IconButton>
            )}
            <IconButton active={step === i} onClick={() => { setStep(i); setPick(null); }} title={f.beat.title}>{i + 1} · {f.beat.title}</IconButton>
          </span>
        ))}
        <IconButton onClick={() => { const n = addBeat(draft, choices); change(n); setStep(flatBeats(n, choices).length - 1); setSel(null); }} title="Beat hinzufügen">+ Beat</IconButton>
        {!lastSeg.node.decision && (
          <IconButton onClick={() => { const n = addDecision(draft, choices); change(n); setShowDecision(segments(n, choices).at(-1).node.decision?.id ?? segments(n, choices).find((s) => s.decision)?.decision.id ?? null); }} title="Read / Variante hinzufügen" style={{ color: "#FFE9B3" }}>+ Read</IconButton>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: wide ? "row" : "column" }}>
        {/* Spielfeld */}
        <CourtStage courtType={draft.court} onCourtDown={onDown} onCourtMove={onMove} onCourtUp={onUp}>
          {step < 0 || !frame ? (
            <g>{setupPlayers.map((p) => <Player25D key={p.id} p={p} />)}</g>
          ) : (
            <PlayScene frame={frame} diagram={diagram} />
          )}
          {selPos && <circle cx={selPos.x} cy={selPos.y} r="10.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeDasharray="2 1.5" pointerEvents="none" />}
          {!pick && handles.map((h, i) => (
            <g key={i} transform={`translate(${h.x},${h.y})`}>
              {h.via
                ? <circle r="2.8" fill={TEAM_STYLE[h.team].light} stroke="#FFFFFF" strokeWidth="0.8" />
                : <rect x="-2.8" y="-2.8" width="5.6" height="5.6" transform="rotate(45)" fill={TEAM_STYLE[h.team].base} stroke="#FFFFFF" strokeWidth="0.8" />}
            </g>
          ))}
        </CourtStage>

        {/* Bearbeitungsfläche */}
        <div style={{ ...panelStyle(wide, C_UI.line, C_UI.panel, "50vh"), display: "grid", gap: 10, alignContent: "start" }}>

          {pick && (
            <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "rgba(255,209,102,0.14)", color: "#FFE9B3", fontWeight: 700, fontSize: 14.5 }}>
              <span style={{ flex: 1 }}>{pickHint}</span>
              <IconButton onClick={() => setPick(null)} title="Abbrechen">Abbrechen</IconButton>
            </div>
          )}

          {/* Read bearbeiten */}
          {showDecision && (() => {
            const d = segs.find((s) => s.decision?.id === showDecision)?.decision;
            if (!d) return null;
            return (
              <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${C_UI.warn}` }}>
                <div style={{ fontSize: 13.5, color: C_UI.muted }}>Ein Read zeigt zwei mögliche Reaktionen der Verteidigung. Spielerinnen beobachten, wählen, was sie sehen, und bekommen dann die Lösung.</div>
                <Field label="Frage an die Spielerinnen"><input style={inputStyle} value={d.question ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { question: e.target.value }), { merge: true })} onBlur={D.endMerge} /></Field>
                <Field label="Worauf achten">
                  <select style={inputStyle} value={d.watch?.[0] ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { watch: e.target.value ? [e.target.value] : [] }))}>
                    <option value="">–</option>
                    {draft.entities.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                </Field>
                {d.options.map((o, i) => (
                  <div key={o.id} style={{ display: "grid", gap: 6, paddingTop: 6, borderTop: `1px solid ${C_UI.line}` }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Chip tone={C_UI.warn} ink="#16110C">{String.fromCharCode(65 + i)}</Chip>
                      <IconButton active={(choices[d.id] ?? d.options[0].id) === o.id} onClick={() => { setChoices({ ...choices, [d.id]: o.id }); setStep(-1); }} title="Diese Variante bearbeiten">Diese Variante bearbeiten</IconButton>
                    </div>
                    <Field label="Reaktion der Verteidigung"><input style={inputStyle} value={o.label} onChange={(e) => change(patchDecision(draft, d.id, { label: e.target.value }, o.id), { merge: true })} onBlur={D.endMerge} /></Field>
                    <Field label="Das sieht die Spielerin"><input style={inputStyle} value={o.read ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { read: e.target.value }, o.id), { merge: true })} onBlur={D.endMerge} /></Field>
                    <Field label="Lösung"><input style={inputStyle} value={o.answer ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { answer: e.target.value }, o.id), { merge: true })} onBlur={D.endMerge} /></Field>
                  </div>
                ))}
                <IconButton onClick={() => setDialog({
                  title: "Read entfernen?", text: "Beide Varianten und ihre Beats werden gelöscht. Mit ↶ kannst du das rückgängig machen.",
                  actions: [{ label: "Abbrechen", onClick: () => setDialog(null) }, { label: "Entfernen", danger: true, onClick: () => { change(removeDecision(draft, choices, d.id)); setShowDecision(null); setStep(-1); setDialog(null); } }],
                })} title="Read entfernen" style={{ color: "#FFB4A8" }}>Read entfernen</IconButton>
              </div>
            );
          })()}

          {/* Aufstellung */}
          {step < 0 && (
            <div style={{ display: "grid", gap: 10 }}>
              {noActionsAnywhere && (
                <div style={{ padding: 10, borderRadius: 10, background: C_UI.card, fontSize: 14, lineHeight: 1.5 }}>
                  <strong>So entsteht ein Spielzug</strong>
                  <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                    <li>Figuren auf die Startpositionen ziehen.</li>
                    <li>„1 · Beat 1“ wählen → Figur antippen → Aktion → Ziel antippen. Was im selben Beat passiert, läuft gleichzeitig.</li>
                    <li>Ziele lassen sich danach auf dem Feld verschieben (◆-Griffe).</li>
                    <li>Optional: Coaching für jede Rolle, „+ Read“ für eine zweite Reaktion der Verteidigung.</li>
                    <li>Speichern – dann „Spielerin“ ansehen und teilen.</li>
                  </ol>
                </div>
              )}
              <div style={{ fontSize: 14, color: C_UI.muted }}>Ziehe die Figuren auf ihre Startpositionen. Tippe eine Angreiferin an, um ihr den Ball zu geben.</div>
              {sel && team(sel) === "offense" && sel !== draft.start.ball && (
                <IconButton onClick={() => change({ ...structuredClone(draft), start: { ...draft.start, ball: sel } })} title="Ball geben">Ball an {label(sel)}</IconButton>
              )}
              <Field label="Kurzbeschreibung"><textarea style={{ ...inputStyle, height: 54, resize: "vertical" }} value={draft.summary ?? ""} onChange={(e) => change({ ...draft, summary: e.target.value }, { merge: true })} onBlur={D.endMerge} /></Field>
            </div>
          )}

          {/* Beat */}
          {step >= 0 && curBeat && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 160px" }}>
                  <Field label="Titel"><input style={inputStyle} value={curBeat.title ?? ""} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.title = e.target.value; }), { merge: true })} onBlur={D.endMerge} /></Field>
                </div>
                <IconButton onClick={() => { if (beatInfo) { playback.seek(beatInfo.t0 + 1e-4); playback.playTo(beatInfo.t1); } }} title="Beat abspielen">▶</IconButton>
                <IconButton onClick={() => { const r = moveBeat(draft, choices, step, -1); change(r.play); setStep(r.index); }} title="Beat nach vorne">←</IconButton>
                <IconButton onClick={() => { const r = moveBeat(draft, choices, step, 1); change(r.play); setStep(r.index); }} title="Beat nach hinten">→</IconButton>
                <IconButton onClick={() => change(duplicateBeat(draft, choices, step))} title="Beat duplizieren">⧉</IconButton>
                <IconButton onClick={() => setDialog({
                  title: `Beat „${curBeat.title}“ löschen?`, text: "Mit ↶ kannst du das rückgängig machen.",
                  actions: [{ label: "Abbrechen", onClick: () => setDialog(null) }, { label: "Löschen", danger: true, onClick: () => { change(removeBeat(draft, choices, step)); setStep(Math.max(-1, step - 1)); setDialog(null); } }],
                })} title="Beat löschen" style={{ color: "#FFB4A8" }}>🗑</IconButton>
              </div>
              <Field label="Erklärung für alle"><textarea style={{ ...inputStyle, height: 48, resize: "vertical" }} value={curBeat.text ?? ""} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.text = e.target.value; }), { merge: true })} onBlur={D.endMerge} /></Field>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                  Dauer
                  <input aria-label="Dauer" type="range" min="600" max="4000" step="100" value={curBeat.duration} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.duration = +e.target.value; }), { merge: true })} onPointerUp={D.endMerge} />
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{sec(durS)} s</span>
                </label>
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
                  <input type="checkbox" checked={!!curBeat.showLanes} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.showLanes = e.target.checked; }))} />
                  Passwege zeigen
                </label>
              </div>

              {/* Aktionen des Beats */}
              <div style={{ display: "grid", gap: 6 }}>
                <Label>Aktionen in diesem Beat ({curBeat.actions.length})</Label>
                {curBeat.actions.length === 0 && <div style={{ fontSize: 14, color: C_UI.dim }}>Noch keine Aktionen – alle halten ihre Position. Tippe eine Figur im Feld an.</div>}
                {curBeat.actions.map((a, k) => {
                  const isPath = ACTIONS[a.type]?.kind === "path";
                  const s0 = (a.start ?? 0) * durS, s1 = (a.end ?? 1) * durS;
                  return (
                    <div key={k} style={{ display: "grid", gap: 4, padding: "8px 10px", borderRadius: 8, background: C_UI.card }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ flex: "1 1 140px", fontSize: 14, fontWeight: 700 }}>{actionLabel(C, a)}</span>
                        {a.type === "pass" && (
                          <select aria-label="Passart" style={{ ...inputStyle, width: "auto", padding: "4px 6px", fontSize: 13 }} value={a.kind ?? (a.lob ? "lob" : "chest")}
                            onChange={(e) => change(patchAction(draft, choices, step, k, { kind: e.target.value, lob: undefined }))}>
                            {Object.entries(PASS_KINDS).map(([kk, v]) => <option key={kk} value={kk}>{v.label}</option>)}
                          </select>
                        )}
                        {isPath && (a.via?.length
                          ? <IconButton onClick={() => change(clearVia(draft, choices, step, k))} title="Umweg entfernen" style={{ height: 32 }}>Umweg ✕</IconButton>
                          : <IconButton onClick={() => change(addVia(draft, choices, step, k, beatInfo?.startPos[a.player] ?? a.to))} title="Umweg hinzufügen" style={{ height: 32 }}>+ Umweg</IconButton>)}
                        <IconButton onClick={() => change(removeAction(draft, choices, step, k))} title="Aktion löschen" style={{ height: 32, minWidth: 32 }}>✕</IconButton>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: C_UI.muted }}>
                        <span>Start {sec(s0)} s</span>
                        <input aria-label="Start" type="range" min="0" max="0.95" step="0.05" value={a.start ?? 0} style={{ flex: 1 }}
                          onChange={(e) => { const s = +e.target.value; change(patchAction(draft, choices, step, k, { start: s, end: Math.max(s + 0.05, a.end ?? 1) }), { merge: true }); }} onPointerUp={D.endMerge} />
                        <span>Ende {sec(s1)} s</span>
                        <input aria-label="Ende" type="range" min="0.05" max="1" step="0.05" value={a.end ?? 1} style={{ flex: 1 }}
                          onChange={(e) => { const en = +e.target.value; change(patchAction(draft, choices, step, k, { end: en, start: Math.min(a.start ?? 0, en - 0.05) }), { merge: true }); }} onPointerUp={D.endMerge} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ausgewählte Spielerin */}
              {sel && (
                <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${C_UI.border}` }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip tone={selTeam === "offense" ? "#F2762E" : "#5B8BB2"} ink="#16110C">{label(sel)}</Chip>
                    <span style={{ fontSize: 14, color: C_UI.muted }}>Aktion wählen, dann Ziel antippen</span>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, marginLeft: "auto" }}>
                      <input type="checkbox" checked={after} onChange={(e) => setAfter(e.target.checked)} /> danach (Folgeaktion)
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {BUILDER_ACTIONS[selTeam].map((t) => {
                      const disabled = (t === "pass" || t === "dribble") && !canPass;
                      return (
                        <IconButton key={t} disabled={disabled} active={pick?.type === t}
                          title={disabled ? `${ACTIONS[t].label} – nur mit Ball` : ACTIONS[t].label}
                          onClick={() => {
                            if (targetKind(t) === "none") change(addAction(draft, choices, step, { type: "hold", player: sel, face: selTeam === "offense" ? "ball" : undefined }, { after }));
                            else setPick({ type: t, after });
                          }} style={{ height: 40 }}>{ACTIONS[t].label}</IconButton>
                      );
                    })}
                  </div>
                  <Label>Coaching für {label(sel)} in diesem Beat</Label>
                  <Field label="Aufgabe" hint="Leer lassen = das Board beschreibt die Aktion automatisch.">
                    <input style={inputStyle} value={selRole.task ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { task: e.target.value }), { merge: true })} onBlur={D.endMerge} />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                    <Field label="Achte auf">
                      <select style={inputStyle} value={selRole.watch ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { watch: e.target.value || null }))}>
                        <option value="">automatisch</option>
                        <option value="ball">Ball</option>
                        {draft.entities.filter((e) => e.id !== sel).map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Stellung am Ziel">
                      <select style={inputStyle} value={selRole.stance ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { stance: e.target.value || null }))}>
                        <option value="">–</option>
                        {Object.entries(STANCES).map(([k, v]) => <option key={k} value={k}>{v.split(":")[0]}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Signal – woran erkennt sie den Moment?"><input style={inputStyle} value={selRole.cue ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { cue: e.target.value }), { merge: true })} onBlur={D.endMerge} /></Field>
                  <Field label="Warum"><input style={inputStyle} value={selRole.why ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { why: e.target.value }), { merge: true })} onBlur={D.endMerge} /></Field>
                </div>
              )}
            </div>
          )}

          {/* Prüfung */}
          {(check.errors.length > 0 || check.warnings.length > 0) && (
            <div style={{ display: "grid", gap: 4, fontSize: 13.5, lineHeight: 1.4 }}>
              <Label>Hinweise</Label>
              {check.errors.map((e, i) => <div key={`e${i}`} data-kind="error" style={{ color: "#FFB4A8" }}>✕ {e}</div>)}
              {check.warnings.map((w, i) => <div key={`w${i}`} data-kind="warning" style={{ color: "#FFE9B3" }}>! {w}</div>)}
              {check.errors.length > 0 && <div style={{ color: C_UI.dim }}>Speichern geht trotzdem – abspielen erst, wenn die ✕-Punkte behoben sind.</div>}
            </div>
          )}
          {check.errors.length === 0 && check.warnings.length === 0 && <div style={{ fontSize: 13, color: C_UI.open }}>✓ Spielzug ist gültig – alle Varianten abspielbar.</div>}
        </div>
      </div>

      {dialog && (
        <Dialog title={dialog.title} onClose={() => setDialog(null)} actions={dialog.actions}>{dialog.text}</Dialog>
      )}
    </div>
  );
}
