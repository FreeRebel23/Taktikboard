/* Play Builder: Spielzüge ohne Programmcode und ohne Aufnahme erstellen.
 *
 *   Aufstellung  – Figuren ziehen, Ballbesitz wählen
 *   Beat         – Figur antippen → Aktion wählen → Ziel antippen (Punkt / Spielerin)
 *                  Timing per Regler, "danach" für Aktionsfolgen, Coaching je Rolle
 *   Read         – Entscheidungspunkt mit zwei Reaktionen der Verteidigung
 * Gespeichert wird lokal; eingebaute Plays werden nie überschrieben (Kopie). */

import { useEffect, useMemo, useRef, useState } from "react";
import CourtStage from "../ui/CourtStage.jsx";
import PlayScene from "../render/PlayScene.jsx";
import Player25D from "../render/Player25D.jsx";
import { compileVariant, sampleFrame, beatDiagram, validatePlayTree } from "../play/index.js";
import { ACTIONS } from "../play/actions.js";
import { PASS_KINDS } from "../play/ballFlight.js";
import { STANCES } from "../play/model.js";
import usePlayback from "../hooks/usePlayback.js";
import { C_UI, IconButton, Label, Chip } from "./studioUi.jsx";
import {
  flatBeats, segments, addBeat, removeBeat, duplicateBeat, addAction, removeAction, patchAction,
  setRole, addDecision, removeDecision, patchDecision, BUILDER_ACTIONS, targetKind, updateBeat,
} from "./builderModel.js";
import { newPlayId } from "../store/playStore.js";
import useWide, { panelStyle } from "../hooks/useWide.js";
import { zoneName } from "../play/describe.js";

const HIT = 9; // Tipp-Radius in Court-Einheiten
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "7px 9px", borderRadius: 8, fontSize: 14, fontFamily: "inherit",
  color: C_UI.text, background: "#0F1317", border: `1px solid ${C_UI.border}`, outline: "none",
};

function Field({ label, children }) {
  return <label style={{ display: "grid", gap: 3 }}><span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C_UI.muted }}>{label}</span>{children}</label>;
}

const actionLabel = (C, a) => {
  const L = (id) => C?.entity[id]?.label ?? id;
  const name = ACTIONS[a.type]?.label ?? a.type;
  if (a.type === "pass") return `Pass ${L(a.from)} → ${L(a.to)} (${PASS_KINDS[a.kind ?? (a.lob ? "lob" : "chest")].short})`;
  if (a.type === "trap") return `${L(a.players[0])} + ${L(a.players[1])}: Trap gegen ${L(a.target)}`;
  if (a.target) return `${L(a.player)}: ${name} → ${L(a.target)}`;
  if (a.to) return `${L(a.player)}: ${name} → ${C ? zoneName(C, a.to) : ""}`;
  return `${L(a.player)}: ${name}`;
};

export default function Builder({ play, origin, onDone, onSave }) {
  const [draft, setDraft] = useState(() => structuredClone(play));
  const [choices, setChoices] = useState({});
  const [step, setStep] = useState(-1);          // -1 = Aufstellung, sonst flacher Beat-Index
  const [sel, setSel] = useState(null);          // ausgewählte Spielerin
  const [pick, setPick] = useState(null);        // { type, after, kind, partner? } wartet auf Ziel
  const [after, setAfter] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [showDecision, setShowDecision] = useState(null);
  const drag = useRef(null);
  const wide = useWide();

  const change = (next) => { if (next !== draft) { setDraft(next); setDirty(true); setSavedMsg(""); } };

  const flat = flatBeats(draft, choices);
  const segs = segments(draft, choices);
  const check = useMemo(() => validatePlayTree(draft), [draft]);

  // Letzter gültiger Stand zum Anzeigen (bei Fehlern bleibt das Feld bedienbar)
  const lastGood = useRef(null);
  const compiled = useMemo(() => {
    try { const C = compileVariant(draft, choices); lastGood.current = C; return C; } catch { return lastGood.current; }
  }, [draft, choices]);
  const C = compiled;

  const playback = usePlayback(C?.total ?? 0, "builder");
  const beatInfo = step >= 0 && C ? C.beats[Math.min(step, C.beats.length - 1)] : null;
  // Beim Wechsel/Ändern des Beats an dessen Anfang springen
  useEffect(() => { if (beatInfo) playback.seek(beatInfo.t0 + 1e-4); }, [step, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const frame = C && step >= 0 ? sampleFrame(C, playback.time) : null;
  const diagram = C && step >= 0 ? beatDiagram(C, Math.min(step, C.beats.length - 1)) : null;
  const curBeat = step >= 0 ? flat[step]?.beat : null;
  const holderAtStart = beatInfo?.startHolder;

  /* ---------- Treffer & Gesten ---------- */
  const posOf = (id) => (step < 0 ? draft.start.positions[id] : frame?.players[id]);
  const hitTest = (p) => {
    let best = null, bd = HIT;
    for (const e of draft.entities) {
      const q = posOf(e.id);
      if (!q) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd) { bd = d; best = e.id; }
    }
    return best;
  };
  const team = (id) => draft.entities.find((e) => e.id === id)?.team;

  const finishPick = (target, p) => {
    const { type } = pick;
    const tk = targetKind(type);
    let action = null;
    if (tk === "point") action = { type, player: sel, to: { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 } };
    if (tk === "opponent" && target && team(target) !== team(sel)) action = { type, player: sel, target };
    if (tk === "teammate" && target && target !== sel && team(target) === team(sel)) action = { type: "pass", from: sel, to: target, start: 0.35, end: 0.7, kind: pick.kind ?? "chest" };
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
    const hit = hitTest(p);
    if (pick) { finishPick(hit, p); return; }
    if (step < 0) {
      if (hit) { drag.current = hit; setSel(hit); try { svg.setPointerCapture(e.pointerId); } catch {} }
      else setSel(null);
      return;
    }
    setSel(hit);
  };
  const onMove = (e, p) => {
    if (!drag.current) return;
    const H = draft.court === "half" ? 140 : 280;
    const id = drag.current;
    const q = { x: Math.round(Math.max(-6, Math.min(156, p.x)) * 10) / 10, y: Math.round(Math.max(-6, Math.min(H + 6, p.y)) * 10) / 10 };
    setDraft((d) => ({ ...d, start: { ...d.start, positions: { ...d.start.positions, [id]: q } } }));
    setDirty(true);
  };
  const onUp = () => { drag.current = null; };

  /* ---------- Speichern ---------- */
  const save = () => {
    let p = draft;
    if (origin === "builtin" || origin === "shared" || !p.id?.startsWith("my_")) {
      p = { ...draft, id: newPlayId(), name: origin === "builtin" ? `${draft.name} (Kopie)` : draft.name };
      setDraft(p);
    }
    onSave(p);
    setDirty(false);
    setSavedMsg("Gespeichert");
    return p;
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
    if (tk === "point") return "Tippe auf das Ziel im Feld.";
    if (tk === "teammate") return "Tippe auf die Mitspielerin, die den Pass bekommt.";
    if (tk === "opponent") return "Tippe auf die Gegenspielerin.";
    if (tk === "partner") return pick.partner ? "Tippe auf die Ballführerin, die gedoppelt wird." : "Tippe auf die zweite Verteidigerin für den Trap.";
    return "";
  })();

  const selRole = sel && curBeat ? (curBeat.roles?.[sel] ?? {}) : {};
  const selTeam = sel ? team(sel) : null;
  const canPass = sel && step >= 0 && (holderAtStart === sel || curBeat?.actions.some((a) => a.type === "pass" && a.to === sel));
  const lastSeg = segs[segs.length - 1];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: C_UI.bg, color: C_UI.text,
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif" }}>
      {/* Kopf */}
      <div style={{ flexShrink: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        padding: "calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 6px calc(12px + env(safe-area-inset-left))" }}>
        <IconButton onClick={() => onDone(check.errors.length ? null : draft, null)} title="Bearbeiten beenden">← Fertig</IconButton>
        <input aria-label="Name des Spielzugs" value={draft.name} onChange={(e) => { setDraft({ ...draft, name: e.target.value }); setDirty(true); }}
          style={{ ...inputStyle, flex: "1 1 160px", width: "auto", fontWeight: 800 }} />
        <IconButton active={dirty} onClick={save} title="Spielzug speichern" disabled={check.errors.length > 0}>Speichern</IconButton>
        {savedMsg && !dirty && <span role="status" style={{ color: C_UI.open, fontSize: 13, fontWeight: 700 }}>✓ {savedMsg}</span>}
      </div>

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
        <IconButton onClick={() => { const n = addBeat(draft, choices); change(n); setStep(flatBeats(n, choices).length - 1); }} title="Beat hinzufügen">+ Beat</IconButton>
        {!lastSeg.node.decision && (
          <IconButton onClick={() => { const n = addDecision(draft, choices); change(n); }} title="Read / Variante hinzufügen" style={{ color: "#FFE9B3" }}>+ Read</IconButton>
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
      </CourtStage>

      {/* Bearbeitungsfläche */}
      <div style={{ ...panelStyle(wide, C_UI.line, C_UI.panel, "48vh"), display: "grid", gap: 10, alignContent: "start" }}>

        {pick && (
          <div role="status" style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 10, background: "rgba(255,209,102,0.14)", color: "#FFE9B3", fontWeight: 700 }}>
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
              <Field label="Frage an die Spielerinnen"><input style={inputStyle} value={d.question ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { question: e.target.value }))} /></Field>
              <Field label="Worauf achten (Spielerin)">
                <select style={inputStyle} value={d.watch?.[0] ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { watch: e.target.value ? [e.target.value] : [] }))}>
                  <option value="">–</option>
                  {draft.entities.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </Field>
              {d.options.map((o, i) => (
                <div key={o.id} style={{ display: "grid", gap: 6, paddingTop: 6, borderTop: `1px solid ${C_UI.line}` }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Chip tone={C_UI.warn} ink="#16110C">{String.fromCharCode(65 + i)}</Chip>
                    <IconButton active={(choices[d.id] ?? d.options[0].id) === o.id} onClick={() => { setChoices({ ...choices, [d.id]: o.id }); setStep(-1); }} title="Diese Variante bearbeiten">Bearbeiten</IconButton>
                  </div>
                  <Field label="Reaktion der Verteidigung"><input style={inputStyle} value={o.label} onChange={(e) => change(patchDecision(draft, d.id, { label: e.target.value }, o.id))} /></Field>
                  <Field label="Das sieht die Spielerin"><input style={inputStyle} value={o.read ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { read: e.target.value }, o.id))} /></Field>
                  <Field label="Lösung"><input style={inputStyle} value={o.answer ?? ""} onChange={(e) => change(patchDecision(draft, d.id, { answer: e.target.value }, o.id))} /></Field>
                </div>
              ))}
              <IconButton onClick={() => { change(removeDecision(draft, choices, d.id)); setShowDecision(null); setStep(-1); }} title="Read entfernen" style={{ color: "#FFB4A8" }}>Read entfernen</IconButton>
            </div>
          );
        })()}

        {/* Aufstellung */}
        {step < 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 14, color: C_UI.muted }}>Ziehe die Figuren auf ihre Startpositionen. Wähle eine Angreiferin aus, um ihr den Ball zu geben.</div>
            {sel && team(sel) === "offense" && sel !== draft.start.ball && (
              <IconButton onClick={() => change({ ...structuredClone(draft), start: { ...draft.start, ball: sel } })} title="Ball geben">Ball an {draft.entities.find((e) => e.id === sel).label}</IconButton>
            )}
            <Field label="Kurzbeschreibung"><textarea style={{ ...inputStyle, height: 54, resize: "vertical" }} value={draft.summary ?? ""} onChange={(e) => { setDraft({ ...draft, summary: e.target.value }); setDirty(true); }} /></Field>
          </div>
        )}

        {/* Beat */}
        {step >= 0 && curBeat && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
              <Field label="Titel"><input style={inputStyle} value={curBeat.title ?? ""} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.title = e.target.value; }))} /></Field>
              <div style={{ display: "flex", gap: 6 }}>
                <IconButton onClick={() => { if (beatInfo) { playback.seek(beatInfo.t0 + 1e-4); playback.playTo(beatInfo.t1); } }} title="Beat abspielen">▶</IconButton>
                <IconButton onClick={() => change(duplicateBeat(draft, choices, step))} title="Beat duplizieren">⧉</IconButton>
                <IconButton onClick={() => { const n = removeBeat(draft, choices, step); change(n); setStep(Math.max(-1, step - 1)); }} title="Beat löschen" style={{ color: "#FFB4A8" }}>🗑</IconButton>
              </div>
            </div>
            <Field label="Erklärung für alle"><textarea style={{ ...inputStyle, height: 48, resize: "vertical" }} value={curBeat.text ?? ""} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.text = e.target.value; }))} /></Field>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
                Dauer
                <input type="range" min="600" max="4000" step="100" value={curBeat.duration} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.duration = +e.target.value; }))} />
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{(curBeat.duration / 1000).toFixed(1).replace(".", ",")} s</span>
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5 }}>
                <input type="checkbox" checked={!!curBeat.showLanes} onChange={(e) => change(updateBeat(draft, choices, step, (b) => { b.showLanes = e.target.checked; }))} />
                Passwege zeigen
              </label>
            </div>

            {/* Aktionen des Beats */}
            <div style={{ display: "grid", gap: 6 }}>
              <Label>Aktionen in diesem Beat ({curBeat.actions.length})</Label>
              {curBeat.actions.length === 0 && <div style={{ fontSize: 13.5, color: C_UI.dim }}>Noch keine Aktionen – alle halten ihre Position. Tippe eine Figur an.</div>}
              {curBeat.actions.map((a, k) => (
                <div key={k} style={{ display: "grid", gap: 4, padding: "6px 8px", borderRadius: 8, background: C_UI.card }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{actionLabel(C, a)}</span>
                    {a.type === "pass" && (
                      <select aria-label="Passart" style={{ ...inputStyle, width: "auto", padding: "3px 6px", fontSize: 12.5 }} value={a.kind ?? (a.lob ? "lob" : "chest")}
                        onChange={(e) => change(patchAction(draft, choices, step, k, { kind: e.target.value, lob: undefined }))}>
                        {Object.entries(PASS_KINDS).map(([kk, v]) => <option key={kk} value={kk}>{v.label}</option>)}
                      </select>
                    )}
                    <IconButton onClick={() => change(removeAction(draft, choices, step, k))} title="Aktion löschen" style={{ height: 30, minWidth: 30 }}>✕</IconButton>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C_UI.muted }}>
                    <span>Start</span>
                    <input aria-label="Start" type="range" min="0" max="0.95" step="0.05" value={a.start ?? 0} style={{ flex: 1 }}
                      onChange={(e) => { const s = +e.target.value; change(patchAction(draft, choices, step, k, { start: s, end: Math.max(s + 0.05, a.end ?? 1) })); }} />
                    <span>Ende</span>
                    <input aria-label="Ende" type="range" min="0.05" max="1" step="0.05" value={a.end ?? 1} style={{ flex: 1 }}
                      onChange={(e) => { const en = +e.target.value; change(patchAction(draft, choices, step, k, { end: en, start: Math.min(a.start ?? 0, en - 0.05) })); }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Ausgewählte Spielerin */}
            {sel && (
              <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${C_UI.border}` }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Chip tone={selTeam === "offense" ? "#F2762E" : "#5B8BB2"} ink="#16110C">{draft.entities.find((e) => e.id === sel).label}</Chip>
                  <span style={{ fontSize: 13.5, color: C_UI.muted }}>Aktion wählen, dann Ziel antippen</span>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, marginLeft: "auto" }}>
                    <input type="checkbox" checked={after} onChange={(e) => setAfter(e.target.checked)} /> danach (Folgeaktion)
                  </label>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {BUILDER_ACTIONS[selTeam].map((t) => {
                    const disabled = (t === "pass" || t === "dribble") && !canPass;
                    return (
                      <IconButton key={t} disabled={disabled} active={pick?.type === t}
                        title={disabled ? "Nur mit Ball" : ACTIONS[t].label}
                        onClick={() => {
                          if (targetKind(t) === "none") change(addAction(draft, choices, step, { type: "hold", player: sel, face: selTeam === "offense" ? "ball" : undefined }, { after }));
                          else setPick({ type: t, after, kind: "chest" });
                        }}>{ACTIONS[t].label}</IconButton>
                    );
                  })}
                </div>
                <Label>Coaching für {draft.entities.find((e) => e.id === sel).label} in diesem Beat</Label>
                <Field label="Aufgabe"><input style={inputStyle} placeholder="leer = automatisch aus den Aktionen" value={selRole.task ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { task: e.target.value }))} /></Field>
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
                <Field label="Signal (wann/woran erkennt sie es?)"><input style={inputStyle} value={selRole.cue ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { cue: e.target.value }))} /></Field>
                <Field label="Warum"><input style={inputStyle} value={selRole.why ?? ""} onChange={(e) => change(setRole(draft, choices, step, sel, { why: e.target.value }))} /></Field>
              </div>
            )}
          </div>
        )}

        {/* Prüfung */}
        {(check.errors.length > 0 || check.warnings.length > 0) && (
          <div role="alert" style={{ display: "grid", gap: 4, fontSize: 13, lineHeight: 1.35 }}>
            {check.errors.map((e, i) => <div key={`e${i}`} style={{ color: "#FFB4A8" }}>✕ {e}</div>)}
            {check.warnings.map((w, i) => <div key={`w${i}`} style={{ color: "#FFE9B3" }}>! {w}</div>)}
          </div>
        )}
        {check.errors.length === 0 && check.warnings.length === 0 && <div style={{ fontSize: 12.5, color: C_UI.open }}>✓ Spielzug ist gültig – alle Varianten abspielbar.</div>}
      </div>
      </div>
    </div>
  );
}
