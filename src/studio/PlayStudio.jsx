/* Play-Studio: ein geöffneter Spielzug in drei Ansichten.
 *   Trainer     – erklären und präsentieren (Varianten, Analyse, Zeichnen)
 *   Spielerin   – "Ich bin die 5": Aufgabe, Signal, Ziel, Read, Schritt für Schritt
 *   Bearbeiten  – Play Builder (eigene Datei)
 * Alle Ansichten nutzen dieselbe Engine; eine Variante ist immer reproduzierbar. */

import { useEffect, useMemo, useRef, useState } from "react";
import CourtStage from "../ui/CourtStage.jsx";
import PlayScene from "../render/PlayScene.jsx";
import PlayControls from "../ui/PlayControls.jsx";
import usePlayback from "../hooks/usePlayback.js";
import { compileVariant, sampleFrame, beatDiagram, beatBoundaries } from "../play/index.js";
import { describeRole, myMoments } from "../play/describe.js";
import { playerCamera, actionCamera, relatedIds } from "../play/camera.js";
import { passWindows } from "../play/analysis.js";
import { AnalysisContext } from "../render/analysisContext.js";
import { CHALK } from "../court/constants.js";
import { C_UI, Segmented, IconButton, Chip } from "./studioUi.jsx";
import { RolePicker, TaskCard, DecisionCard, PlayerControls, QuizCard, HowTo, Legend } from "./PlayerPanel.jsx";
import { compileReadQuiz, quizAnswer } from "../play/readQuiz.js";
import { logRead } from "../store/readLog.js";
import { VariantBar, AnalysisPanel, PassWindowStrip } from "./CoachParts.jsx";
import Builder from "./Builder.jsx";
import ShareSheet from "./ShareSheet.jsx";
import useWide, { panelStyle } from "../hooks/useWide.js";
import { Dialog } from "./studioUi.jsx";
import { findMyPlay, newPlayId } from "../store/playStore.js";

const EPS = 0.02;
const FOOT = { screen: "wide", defense: "wide", deny: "wide", triple: "stagger", protect: "stagger", open: "stagger" };

export default function PlayStudio({ play: initialPlay, origin, onClose, onSave, initialMode = "coach", initialMe = null }) {
  const [keepMsg, setKeepMsg] = useState(null);   // Ergebnis "In meine Spielzüge"
  const [keepDialog, setKeepDialog] = useState(null);
  const [play, setPlay] = useState(initialPlay);
  const [mode, setMode] = useState(initialMode);
  const [choices, setChoices] = useState({});
  const [me, setMe] = useState(initialMe);
  const [answered, setAnswered] = useState({});
  const [analysis, setAnalysis] = useState({ lanes: false, reach: false, space: false, windows: false });
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [showDef, setShowDef] = useState(true);
  const [focusCam, setFocusCam] = useState(() => typeof window !== "undefined" && window.innerWidth < 700);
  const [playerCam, setPlayerCam] = useState(true);
  const [tool, setTool] = useState(null); // "pen" | "arrow" | null
  const [drawings, setDrawings] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [quiz, setQuiz] = useState(null);         // Read-Training: { key, d, secret, C, t0, phase, picked }
  const [help, setHelp] = useState(false);
  const autoplayTo = useRef(null);                // nach dem Quiz die Lösung automatisch zeigen
  const stroke = useRef(null);
  const wide = useWide();

  useEffect(() => setPlay(initialPlay), [initialPlay]);

  const compiled = useMemo(() => {
    try { return { C: compileVariant(play, choices) }; } catch (e) { return { error: e.message }; }
  }, [play, choices]);
  const C = compiled.C;
  const variantKey = C?.play.variant.key ?? "";
  const playback = usePlayback(C?.total ?? 0, play.id);
  const time = Math.min(playback.time, C?.total ?? 0);
  const frame = C ? sampleFrame(C, time) : null;
  const bounds = C ? beatBoundaries(C) : [0];

  const decisions = useMemo(() => (C ? C.play.variant.decisions.map((d) => ({
    ...d, t: d.atBeat === 0 ? 0 : C.beats[d.atBeat - 1].t1,
  })) : []), [C]);
  const pending = mode === "player" ? decisions.find((d) => !answered[d.decision.id] && Math.abs(time - d.t) < EPS && !playback.playing) : null;
  const atEnd = C ? time >= C.total - 1e-3 : true;

  /* ---------- Read-Training ---------- */
  const qp = usePlayback(quiz?.C.total ?? 0, quiz?.key ?? 0);
  useEffect(() => {
    if (quiz?.phase === "watch") { qp.seek(quiz.t0); qp.playTo(quiz.C.total); }
  }, [quiz?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (quiz?.phase === "watch" && !qp.playing && qp.time >= quiz.C.total - 1e-3) setQuiz((q) => ({ ...q, phase: "ask" }));
  }, [qp.playing, qp.time]); // eslint-disable-line react-hooks/exhaustive-deps
  const startQuiz = (d) => {
    const opts = d.decision.options;
    const secret = opts[Math.floor(Math.random() * opts.length)];
    try {
      const q = compileReadQuiz(play, choices, d.decision.id, secret.id);
      setQuiz({ key: Date.now(), d, secret, C: q.C, t0: q.t0, phase: "watch", picked: null });
    } catch { chooseFromQuiz(d, secret.id); }
  };
  const replayQuiz = () => setQuiz((q) => ({ ...q, key: Date.now(), phase: "watch" }));
  const answerQuiz = (optionId) => {
    logRead({ play: play.name, me: me ? C.entity[me]?.label : null, read: quiz.d.decision.title,
      shown: quiz.secret.label, answer: quizAnswer(quiz.d.decision.options.find((o) => o.id === optionId)), correct: optionId === quiz.secret.id });
    setQuiz((q) => ({ ...q, phase: "done", picked: optionId }));
  };
  const chooseFromQuiz = (d, optionId) => {
    setQuiz(null);
    setChoices((c) => ({ ...c, [d.decision.id]: optionId }));
    setAnswered((a) => ({ ...a, [d.decision.id]: true }));
    playback.seek(d.t);
    autoplayTo.current = d.atBeat;
  };
  // Nach dem Wechsel der Variante den ersten Beat der Lösung abspielen
  useEffect(() => {
    if (autoplayTo.current == null || !C) return;
    const b = C.beats[autoplayTo.current];
    autoplayTo.current = null;
    if (b) playback.playTo(b.t1);
  }, [variantKey, !quiz]); // eslint-disable-line react-hooks/exhaustive-deps
  const quizFrame = quiz ? sampleFrame(quiz.C, Math.min(qp.time, quiz.C.total)) : null;

  // Beat, um den es gerade geht: an einer Grenze (pausiert) der kommende Beat → Vorschau
  const boundaryIdx = C ? C.beats.findIndex((b) => Math.abs(time - b.t1) < EPS) : -1;
  const displayBeat = !C ? 0 : (!playback.playing && boundaryIdx >= 0 && boundaryIdx < C.beats.length - 1) ? boundaryIdx + 1 : frame.beatIndex;

  /* ---------- Spielerinnen-Modus: Rolle, Ziel, Kamera ---------- */
  const playerInfo = useMemo(() => {
    if (!C || mode !== "player" || !me) return null;
    const role = describeRole(C, displayBeat, me);
    const b = C.beats[displayBeat];
    const end = sampleFrame(C, b.t1).players[me];
    const path = beatDiagram(C, displayBeat).find((d) => d.player === me && d.kind !== "pass")?.points ?? null;
    const ghost = path ? { ...end, footStance: FOOT[role.stance] ?? (end.team === "defense" ? "wide" : "stagger"), speed: 0, hasBall: false } : null;
    const related = new Set(relatedIds(C, displayBeat, me));
    if (role.watch && role.watch !== "ball") related.add(role.watch);
    const showWatch = role.watch && !(role.auto.watch && role.watch === "ball");
    return {
      role, ghost, path, related,
      watch: showWatch ? role.watch : null,
      watchLabel: showWatch ? (role.watch === "ball" ? "ACHTE AUF DEN BALL" : `ACHTE AUF ${C.entity[role.watch].label}`) : null,
      camera: playerCam ? playerCamera(C, displayBeat, me) : null,
    };
  }, [C, mode, me, displayBeat, variantKey, playerCam]); // eslint-disable-line react-hooks/exhaustive-deps

  const coachCamera = useMemo(() => (C && mode === "coach" && focusCam ? actionCamera(C, displayBeat) : null),
    [C, mode, focusCam, displayBeat, variantKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const moments = useMemo(() => (C && me ? myMoments(C, me) : []), [C, me]);
  const windows = useMemo(() => (C && analysis.windows ? passWindows(C) : null), [C, analysis.windows]);

  const sceneInfo = playerInfo && frame ? {
    me, related: playerInfo.related, watch: playerInfo.watch, watchLabel: playerInfo.watchLabel,
    ghost: playerInfo.ghost && Math.hypot(playerInfo.ghost.x - frame.players[me].x, playerInfo.ghost.y - frame.players[me].y) > 3 ? playerInfo.ghost : null,
    myPath: playerInfo.path,
  } : null;

  // Read-Training: nur die eigene Figur und worauf zu achten ist – keine Wege, kein Ziel
  const quizCamera = useMemo(() => (quiz && me && playerCam ? playerCamera(quiz.C, quiz.C.beats.length - 1, me) : null),
    [quiz?.key, me, playerCam]); // eslint-disable-line react-hooks/exhaustive-deps
  const quizWatch = quiz?.d.decision.watch?.[0] ?? null;
  const quizScene = quiz && me ? {
    me, related: new Set([me, ...(quiz.d.decision.watch ?? [])]), watch: quizWatch,
    watchLabel: quizWatch ? `ACHTE AUF ${quizWatch === "ball" ? "DEN BALL" : quiz.C.entity[quizWatch]?.label}` : null,
    ghost: null, myPath: null,
  } : null;

  /* ---------- Steuerung ---------- */
  const nextBoundary = () => bounds.find((b) => b > time + EPS);
  const prevBoundary = () => [...bounds].reverse().find((b) => b < time - 0.05) ?? 0;
  const unansweredAhead = () => decisions.find((d) => !answered[d.decision.id] && d.t > time + EPS);

  const stepNext = () => {
    let target = nextBoundary();
    if (target == null) return;
    const d = mode === "player" ? unansweredAhead() : null;
    if (d && d.t <= target + EPS) target = d.t;
    playback.playTo(target);
  };
  const playAll = () => {
    if (playback.playing) return playback.pause();
    const d = mode === "player" ? unansweredAhead() : null;
    if (d) playback.playTo(d.t); else playback.play();
  };
  const choose = (decisionId, optionId) => {
    setChoices((c) => ({ ...c, [decisionId]: optionId }));
    setAnswered((a) => ({ ...a, [decisionId]: true }));
    const d = decisions.find((x) => x.decision.id === decisionId);
    if (d && time > d.t + EPS) playback.seek(d.t);
  };
  // Trainer wählt eine Variante zum Zeigen – das ist keine Antwort der Spielerin
  const chooseCoach = (decisionId, optionId) => {
    setChoices((c) => ({ ...c, [decisionId]: optionId }));
    const d = decisions.find((x) => x.decision.id === decisionId);
    if (d && time > d.t + EPS) playback.seek(d.t);
  };
  const otherVariant = () => {
    const d = decisions[decisions.length - 1];
    if (!d) return;
    const opts = d.decision.options;
    const i = opts.findIndex((o) => o.id === d.option.id);
    setChoices((c) => ({ ...c, [d.decision.id]: opts[(i + 1) % opts.length].id }));
    setAnswered((a) => ({ ...a, [d.decision.id]: mode !== "player" }));
    playback.seek(d.t);
  };

  // Tastatur
  const keyRef = useRef(null);
  keyRef.current = (e) => {
    if (!C || mode === "edit" || quiz || e.target.closest?.("input, textarea, select")) return;
    if (e.key === " ") { e.preventDefault(); mode === "player" ? playAll() : playback.toggle(); }
    else if (e.key === "ArrowRight") stepNext();
    else if (e.key === "ArrowLeft") playback.seek(prevBoundary());
  };
  useEffect(() => {
    const h = (e) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ---------- Zeichnen (Trainer) ---------- */
  const onDown = (e, p, svg) => {
    if (mode !== "coach" || !tool) return;
    stroke.current = tool === "pen" ? { type: "pen", points: [p] } : { type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    setDrawings((d) => [...d, stroke.current]);
    try { svg.setPointerCapture(e.pointerId); } catch {}
  };
  const onMove = (e, p) => {
    if (!stroke.current) return;
    if (stroke.current.type === "pen") stroke.current.points.push(p);
    else { stroke.current.x2 = p.x; stroke.current.y2 = p.y; }
    setDrawings((d) => [...d.slice(0, -1), { ...stroke.current }]);
  };
  const onUp = () => { stroke.current = null; };

  /* ---------- Bearbeiten ---------- */
  if (mode === "edit") {
    return (
      <Builder play={play} origin={origin}
        onDone={(p, { close } = {}) => { if (close) { onClose(); return; } if (p) { setPlay(p); setChoices({}); } setMode("coach"); }}
        onSave={(p) => { const r = onSave?.(p) ?? { ok: false, error: "Speichern ist hier nicht verfügbar." }; if (r.ok) setPlay(p); return r; }} />
    );
  }

  const diagram = C && showPaths && !quiz ? beatDiagram(C, mode === "player" ? displayBeat : frame.beatIndex) : null;
  const camera = quiz ? quizCamera : mode === "player" ? playerInfo?.camera : coachCamera;
  const replayBeat = () => { const b = C.beats[frame.beatIndex]; playback.seek(b.t0); playback.playTo(b.t1); };

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: C_UI.bg, color: C_UI.text,
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif" }}>
      {/* ===== Kopf ===== */}
      <div style={{
        flexShrink: 0, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
        padding: "calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 6px calc(12px + env(safe-area-inset-left))",
      }}>
        <IconButton onClick={onClose} title="Zur Übersicht">←</IconButton>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{play.name}</div>
          {origin === "shared" && <div style={{ fontSize: 11.5, color: C_UI.warn }}>Geteilter Spielzug</div>}
        </div>
        <Segmented label="Ansicht" value={mode} onChange={(m) => { if (m === "player") setAnswered({}); setQuiz(null); setMode(m); setTool(null); }}
          options={[
            { value: "coach", label: "Trainer" },
            { value: "player", label: "Spielerin" },
            { value: "edit", label: "Bearbeiten" },
          ]} />
        {origin === "shared" && (
          <IconButton onClick={() => {
            const doSave = (p) => { const r = onSave?.(p); setKeepMsg(r?.ok ? { ok: true, text: "In deinen Spielzügen gespeichert" } : { ok: false, text: r?.error ?? "Speichern fehlgeschlagen" }); };
            const existing = findMyPlay(play.id);
            if (existing && JSON.stringify(existing.play) !== JSON.stringify(play)) {
              setKeepDialog({
                title: "Diesen Spielzug hast du schon",
                text: `Du hast eine ältere Fassung von „${existing.play.name}“ gespeichert. Mit dem geteilten Stand aktualisieren oder als Kopie behalten?`,
                actions: [
                  { label: "Abbrechen", onClick: () => setKeepDialog(null) },
                  { label: "Als Kopie", onClick: () => { setKeepDialog(null); doSave({ ...play, id: newPlayId(), name: `${play.name} (neu)` }); } },
                  { label: "Aktualisieren", primary: true, onClick: () => { setKeepDialog(null); doSave(play); } },
                ],
              });
            } else doSave(play);
          }} title="In meine Spielzüge übernehmen">In meine Spielzüge</IconButton>
        )}
        <IconButton onClick={() => setSharing(true)} title="Teilen">Teilen</IconButton>
      </div>

      {keepMsg && (
        <div role={keepMsg.ok ? "status" : "alert"} style={{ margin: "0 12px 6px", padding: "8px 10px", borderRadius: 10, fontSize: 13.5,
          background: keepMsg.ok ? "rgba(95,211,141,0.12)" : "#3A1D1A", color: keepMsg.ok ? "#CFF5DE" : "#FFD9D3" }}>
          {keepMsg.ok ? "✓ " : "Nicht gespeichert: "}{keepMsg.text}
        </div>
      )}
      {keepDialog && <Dialog title={keepDialog.title} onClose={() => setKeepDialog(null)} actions={keepDialog.actions}>{keepDialog.text}</Dialog>}
      {compiled.error && (
        <div role="alert" style={{ margin: "0 12px 6px", padding: 10, borderRadius: 10, background: "#3A1D1A", color: "#FFD9D3", fontSize: 13, whiteSpace: "pre-wrap" }}>
          Dieser Spielzug ist fehlerhaft und kann nicht abgespielt werden:{"\n"}{compiled.error}
        </div>
      )}

      {C && mode === "coach" && (
        <p aria-live="polite" style={{
          margin: "0 14px 4px", fontSize: 13, lineHeight: 1.4, color: "#B9C2C9",
          display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          <strong style={{ color: C_UI.accent, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Beat {frame.beatIndex + 1}/{C.beats.length} · {frame.beat.title}
          </strong>{" "}{frame.beat.text}
        </p>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: wide ? "row" : "column" }}>
      {/* ===== Spielfeld ===== */}
      {C ? (
        <CourtStage courtType={play.court} camera={camera} onCourtDown={onDown} onCourtMove={onMove} onCourtUp={onUp}
          onGestureStart={() => { stroke.current = null; }}>
          <AnalysisContext.Provider value={C}>
            <PlayScene frame={quizFrame ?? frame} diagram={diagram} showDef={showDef} player={quiz ? quizScene : sceneInfo}
              analysis={mode === "coach" && showAnalysis ? analysis : null} />
          </AnalysisContext.Provider>
          <g pointerEvents="none">
            {drawings.map((d, i) => d.type === "pen" ? (
              <polyline key={i} points={d.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={CHALK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
            ) : (
              <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={CHALK} strokeWidth="1.4" strokeLinecap="round" opacity="0.92" markerEnd="url(#arrow)" />
            ))}
          </g>
        </CourtStage>
      ) : <div style={{ flex: 1 }} />}

      {/* ===== Unten ===== */}
      <div style={{ ...panelStyle(wide, C_UI.line, C_UI.panel, mode === "player" ? "50vh" : "46vh"),
        ...(mode === "player" && me ? { display: "flex", flexDirection: "column", overflowY: "hidden" } : {}) }}>
        {C && mode === "coach" && (
          <>
            <VariantBar decisions={C.play.variant.decisions} choices={choices} onChoose={chooseCoach} />
            {showAnalysis && <AnalysisPanel analysis={analysis} onChange={setAnalysis} />}
            {windows && showAnalysis && <PassWindowStrip C={C} windows={windows} time={time} onSeek={playback.seek} />}
            <PlayControls compiled={C} frame={frame} playback={playback}
              showPaths={showPaths} onTogglePaths={() => setShowPaths((s) => !s)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <IconButton active={focusCam} onClick={() => setFocusCam((v) => !v)} title="Kamera folgt der Aktion">Fokus</IconButton>
              <IconButton active={showAnalysis} onClick={() => setShowAnalysis((v) => !v)} title="Analyse-Ebenen">Analyse</IconButton>
              <IconButton active={showDef} onClick={() => setShowDef((v) => !v)} title="Verteidigung ein/aus">Verteidigung</IconButton>
              <IconButton active={tool === "pen"} onClick={() => setTool((t) => (t === "pen" ? null : "pen"))} title="Stift">✎</IconButton>
              <IconButton active={tool === "arrow"} onClick={() => setTool((t) => (t === "arrow" ? null : "arrow"))} title="Pfeil">↗</IconButton>
              {drawings.length > 0 && <IconButton onClick={() => setDrawings([])} title="Zeichnungen löschen">Leeren</IconButton>}
            </div>
          </>
        )}

        {C && mode === "player" && (
          !me ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Wähle deine Position</div>
              <HowTo />
              <RolePicker C={C} me={me} onPick={(id) => { setMe(id); playback.seek(0); }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <RolePicker C={C} me={me} onPick={(id) => { setMe(id); setQuiz(null); }} compact />
                <span style={{ flex: 1 }} />
                <IconButton onClick={() => setHelp(true)} title="Hilfe und Legende" style={{ height: 44, minWidth: 44 }}>?</IconButton>
              </div>
              <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", display: "grid", gap: 10, alignContent: "start" }}>
                {quiz ? (
                  <QuizCard C={C} decision={quiz.d.decision} phase={quiz.phase} secret={quiz.secret} picked={quiz.picked}
                    answerOf={quizAnswer} onPick={answerQuiz} onReplay={replayQuiz}
                    onContinue={() => chooseFromQuiz(quiz.d, quiz.secret.id)} />
                ) : pending ? (
                  <DecisionCard C={C} decision={pending.decision} chosen={choices[pending.decision.id]}
                    onChoose={(o) => choose(pending.decision.id, o)}
                    onPractice={pending.decision.options.length > 1 ? () => startQuiz(pending) : null} />
                ) : (
                  <>
                    {decisions.filter((d) => answered[d.decision.id] && displayBeat >= d.atBeat).map((d) => (
                      <div key={d.decision.id} style={{ fontSize: 13, color: C_UI.muted, lineHeight: 1.4, padding: "6px 8px", borderRadius: 8, background: "rgba(255,209,102,0.08)" }}>
                        <Chip tone="rgba(255,209,102,0.18)" ink="#FFE9B3">Read</Chip> <strong style={{ color: C_UI.text }}>{d.option.label}</strong>
                        {d.option.answer && <div style={{ color: C_UI.open }}>Lösung: {d.option.answer}</div>}
                      </div>
                    ))}
                    {playerInfo && <TaskCard C={C} role={playerInfo.role} beat={C.beats[displayBeat].beat} beatIndex={displayBeat}
                      total={C.beats.length} frameBeatTitle={C.beats[displayBeat].beat.title} />}
                    {atEnd && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <IconButton onClick={() => { setAnswered({}); playback.seek(0); }} title="Von vorn">↺ Von vorn</IconButton>
                        {decisions.length > 0 && <IconButton onClick={otherVariant} title="Andere Variante ansehen">Andere Variante ansehen</IconButton>}
                      </div>
                    )}
                  </>
                )}
              </div>
              {!quiz && (
                <div style={{ flexShrink: 0 }}>
                  <PlayerControls time={time} total={C.total} playing={playback.playing}
                    onPrev={() => playback.seek(prevBoundary())} onNext={stepNext} onToggle={playAll} onSeek={playback.seek}
                    onReplay={replayBeat} slow={playback.speed < 1} onSlow={() => playback.setSpeed(playback.speed < 1 ? 1 : 0.5)}
                    moments={moments} boundaries={bounds} decisionTimes={decisions} atEnd={atEnd || !!pending} />
                </div>
              )}
            </div>
          )
        )}
      </div>

      </div>

      {sharing && <ShareSheet play={play} onClose={() => setSharing(false)} />}
      {help && (
        <Dialog title="So liest du das Feld" onClose={() => setHelp(false)} actions={[
          { label: playerCam ? "Ganzes Feld zeigen" : "Kamera folgt mir", onClick: () => setPlayerCam((v) => !v) },
          { label: "Verstanden", primary: true, onClick: () => setHelp(false) },
        ]}><Legend /></Dialog>
      )}
    </div>
  );
}
