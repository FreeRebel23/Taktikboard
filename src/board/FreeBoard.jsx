import { useState, useRef, useEffect } from "react";
import { OFF_COLOR, DEF_COLOR, BALL_COLOR, REC_COLOR, CHALK, OFF, DEF, courtHeight } from "../court/constants.js";
import { PRESETS, DEFAULT_HALF, DEFAULT_FULL, interpKF } from "../legacy/presets.js";
import { FRAME_MS, clone, loadSeqs, persistSeqs } from "../legacy/recordingStore.js";
import Btn from "../ui/Btn.jsx";
import CourtStage from "../ui/CourtStage.jsx";
import Player25D from "../render/Player25D.jsx";
import Ball25D from "../render/Ball25D.jsx";
import { boardPlayers } from "../render/boardView.js";
import { Dialog } from "../studio/studioUi.jsx";

/* Freies Board: Figuren ziehen, Ball-Snapping, Zeichnen, Legacy-Presets, REC.
   "Als Spielzug übernehmen" startet den Builder mit der aktuellen Aufstellung. */

const SNAP_PX = 60;                          // Snap-Radius in Bildschirm-Pixeln
const BALL_OFFSET = { x: 6.5, y: -6.5 };     // Ball sitzt an der Schulter des Trägers

export default function FreeBoard({ onHome, onCreatePlay }) {
  const [courtType, setCourtType] = useState("half");
  const [positions, setPositions] = useState(DEFAULT_HALF);
  const [showDef, setShowDef] = useState(true);
  const [mode, setMode] = useState("move"); // move | pen | arrow
  const [drawings, setDrawings] = useState([]);
  const [preset, setPreset] = useState(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [ballOwnerId, setBallOwnerId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [sequences, setSequences] = useState(loadSeqs);
  const [activeSeqId, setActiveSeqId] = useState(null);
  const [confirmSeq, setConfirmSeq] = useState(null);

  const stageRef = useRef(null);
  const dragId = useRef(null);
  const ballPosRef = useRef(null);
  const stroke = useRef(null);
  const rafRef = useRef(null);
  const playRef = useRef(false);
  const snapRef = useRef(null);
  const bufferRef = useRef([]);
  const replayTimer = useRef(null);

  /* ----- Legacy-Animation ----- */
  useEffect(() => {
    playRef.current = playing;
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    let last = performance.now();
    const dur = 4500;
    const step = (now) => {
      const dt = now - last; last = now;
      setProgress((p) => {
        const np = Math.min(1, p + dt / dur);
        if (np >= 1) setPlaying(false);
        return np;
      });
      if (playRef.current) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  /* ----- Aufnahme & Replay (Legacy) ----- */
  snapRef.current = { positions, ballOwnerId, drawings, showDef, courtType };

  useEffect(() => {
    if (!recording) return;
    const tick = () => bufferRef.current.push(clone(snapRef.current));
    tick();
    const iv = setInterval(tick, FRAME_MS);
    return () => clearInterval(iv);
  }, [recording]);

  const stopReplay = () => {
    if (replayTimer.current) { clearTimeout(replayTimer.current); replayTimer.current = null; }
    setReplaying(false);
  };

  const applyFrame = (f) => {
    setCourtType(f.courtType);
    setPositions(f.positions);
    setBallOwnerId(f.ballOwnerId);
    setDrawings(f.drawings);
    setShowDef(f.showDef);
  };

  const playFrames = (frames) => {
    if (!frames || !frames.length) return;
    stopReplay();
    setPreset(null); setProgress(0); setPlaying(false);
    setReplaying(true);
    let i = 0;
    const step = () => {
      if (i >= frames.length) { replayTimer.current = null; setReplaying(false); return; }
      applyFrame(frames[i]); i += 1;
      replayTimer.current = setTimeout(step, FRAME_MS);
    };
    step();
  };

  const startRec = () => {
    stopReplay();
    setPlaying(false);
    bufferRef.current = [];
    setHasRecording(false);
    setSaving(false); setSaveName("");
    setActiveSeqId(null);
    setRecording(true);
  };
  const stopRec = () => { setRecording(false); setHasRecording(bufferRef.current.length > 0); };

  const saveRecording = () => {
    if (!bufferRef.current.length) return;
    const name = saveName.trim() || `Sequenz ${sequences.length + 1}`;
    const seq = { id: "seq_" + Date.now(), name, frames: clone(bufferRef.current) };
    const next = [...sequences, seq];
    setSequences(next); persistSeqs(next);
    setSaving(false); setSaveName("");
  };

  const playSequence = (seq) => {
    if (recording) stopRec();
    setActiveSeqId(seq.id);
    stageRef.current?.resetZoom();
    playFrames(seq.frames);
  };

  const deleteSequence = (id) => {
    const next = sequences.filter((s) => s.id !== id);
    setSequences(next); persistSeqs(next);
    if (activeSeqId === id) setActiveSeqId(null);
  };

  /* ----- Anzeigeposition (Legacy-Animation überlagert State) ----- */
  const displayPos = (id) => {
    if (preset?.anim?.[id] && progress > 0) return interpKF(preset.anim[id], progress);
    if (id === "ball" && ballOwnerId && positions[ballOwnerId]) {
      const o = displayPos(ballOwnerId);
      return { x: o.x + BALL_OFFSET.x, y: o.y + BALL_OFFSET.y };
    }
    return positions[id];
  };

  /* ----- Pointer (Freimodus) ----- */
  const onTokenDown = (e, id) => {
    if (mode !== "move" || replaying) return;
    if (progress > 0) { setProgress(0); setPlaying(false); }
    if (id === "ball" && ballOwnerId) {
      const start = displayPos("ball");
      setPositions((pos) => ({ ...pos, ball: { ...start } }));
      setBallOwnerId(null);
      ballPosRef.current = start;
    } else if (id === "ball") {
      ballPosRef.current = positions.ball;
    }
    dragId.current = id;
    try { stageRef.current.svg.setPointerCapture(e.pointerId); } catch {}
  };

  const onCourtDown = (e, p, svg) => {
    if (mode === "move" || replaying) return;
    stroke.current = mode === "pen" ? { type: "pen", points: [p] } : { type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    setDrawings((d) => [...d, stroke.current]);
    try { svg.setPointerCapture(e.pointerId); } catch {}
  };

  const onCourtMove = (e, p) => {
    if (replaying) return;
    if (dragId.current) {
      const id = dragId.current;
      const maxY = courtHeight(courtType);
      const np = { x: Math.max(0, Math.min(150, p.x)), y: Math.max(0, Math.min(maxY, p.y)) };
      if (id === "ball") ballPosRef.current = np;
      setPositions((pos) => ({ ...pos, [id]: np }));
    } else if (stroke.current) {
      if (stroke.current.type === "pen") stroke.current.points.push(p);
      else { stroke.current.x2 = p.x; stroke.current.y2 = p.y; }
      setDrawings((d) => [...d.slice(0, -1), { ...stroke.current }]);
    }
  };

  const onCourtUp = () => {
    if (dragId.current === "ball" && ballPosRef.current) snapBall(ballPosRef.current);
    dragId.current = null; stroke.current = null;
  };

  // Snap: Ball innerhalb SNAP_PX eines sichtbaren Spielers → Ballbesitz
  const snapBall = (ballPos) => {
    const thr = SNAP_PX / (stageRef.current?.pxPerUnit() ?? 1);
    const ids = showDef ? [...OFF, ...DEF] : OFF;
    let best = null, bestD = thr;
    for (const pid of ids) {
      const p = positions[pid];
      const d = Math.hypot(p.x - ballPos.x, p.y - ballPos.y);
      if (d <= bestD) { bestD = d; best = pid; }
    }
    setBallOwnerId(best);
  };

  /* ----- Aktionen ----- */
  const applyPreset = (p) => {
    const base = p.court === "half" ? DEFAULT_HALF : DEFAULT_FULL;
    setCourtType(p.court);
    setPositions({ ...base, ...p.pos });
    setShowDef(p.showDef);
    setPreset(p);
    setProgress(0);
    setPlaying(false);
    setDrawings([]);
    stageRef.current?.resetZoom();
    setBallOwnerId(null);
    stopReplay(); setActiveSeqId(null);
  };

  const switchCourt = (t) => {
    if (t === courtType) return;
    setCourtType(t);
    setPositions(t === "half" ? DEFAULT_HALF : DEFAULT_FULL);
    setPreset(null); setProgress(0); setPlaying(false); setDrawings([]);
    stageRef.current?.resetZoom();
    setBallOwnerId(null);
    stopReplay(); setActiveSeqId(null);
  };

  const resetBoard = () => {
    setPositions(courtType === "half" ? DEFAULT_HALF : DEFAULT_FULL);
    setPreset(null); setProgress(0); setPlaying(false); setDrawings([]);
    stageRef.current?.resetZoom();
    setBallOwnerId(null);
    stopReplay(); setActiveSeqId(null);
  };

  const toggleDef = () => {
    setShowDef((s) => {
      if (s && ballOwnerId?.startsWith("d")) {
        const here = displayPos("ball");
        setPositions((pos) => ({ ...pos, ball: { ...here } }));
        setBallOwnerId(null);
      }
      return !s;
    });
  };

  const togglePlay = () => {
    if (!preset?.anim) return;
    if (progress >= 1) { setProgress(0); setPlaying(true); }
    else setPlaying((p) => !p);
  };

  const entityColor = (id) => (id === "ball" ? BALL_COLOR : id.startsWith("d") ? DEF_COLOR : OFF_COLOR);

  /* ===== Bibliothek + Freimodus ===== */
  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      background: "#14181C", color: "#E8E4DA",
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        flexShrink: 0,
        padding: "calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 6px calc(12px + env(safe-area-inset-left))",
      }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn onClick={onHome} title="Zu den Spielzügen">← Spielzüge</Btn>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Freies Board</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn active={courtType === "half"} onClick={() => switchCourt("half")}>Halbfeld</Btn>
            <Btn active={courtType === "full"} onClick={() => switchCourt("full")}>Ganzfeld</Btn>
          </div>
        </header>

        {/* Spielzüge: aktionsbasiert (★), eigene, Legacy, Aufnahmen */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          <Btn onClick={() => onCreatePlay({ court: courtType, positions, ball: ballOwnerId })} tone="#5FD38D" title="Aktuelle Aufstellung als neuen Spielzug übernehmen">+ Als Spielzug übernehmen</Btn>
          {PRESETS.map((p) => (
            <Btn key={p.id} active={preset?.id === p.id} onClick={() => applyPreset(p)} tone={p.id === "zone23" ? DEF_COLOR : OFF_COLOR}>
              {p.name}
            </Btn>
          ))}
          {sequences.map((seq) => (
            <span key={seq.id} style={{ display: "inline-flex", flexShrink: 0, alignItems: "stretch", gap: 2 }}>
              <Btn active={activeSeqId === seq.id} tone={REC_COLOR} onClick={() => playSequence(seq)}>▶ {seq.name}</Btn>
              <button onClick={() => setConfirmSeq(seq)}
                title="Aufnahme löschen" aria-label={`Aufnahme ${seq.name} löschen`}
                style={{ padding: "0 8px", borderRadius: 8, fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", border: "1px solid #39424B", background: "#232B32", color: "#8E9AA4" }}>✕</button>
            </span>
          ))}
        </div>

        {preset && (
          <p style={{
            margin: "8px 2px 0", fontSize: 13, lineHeight: 1.4, color: "#B9C2C9",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{preset.note}</p>
        )}
      </div>

      <CourtStage ref={stageRef} courtType={courtType} style={{ padding: "6px 10px" }}
        onCourtDown={onCourtDown} onCourtMove={onCourtMove} onCourtUp={onCourtUp}
        onGestureStart={() => { dragId.current = null; stroke.current = null; }}>
        {preset?.shapes?.map((s, i) => (
          <polygon key={i} points={s.points.map((p) => p.join(",")).join(" ")}
            fill="rgba(237,232,220,0.06)" stroke={CHALK} strokeWidth="0.8" strokeDasharray="3 2.5" opacity="0.7" />
        ))}
        {showPaths && preset?.anim && Object.entries(preset.anim).map(([id, kfs]) => (
          <polyline key={id} points={kfs.map((k) => `${k.x},${k.y}`).join(" ")}
            fill="none" stroke={entityColor(id)} strokeWidth="1.1" strokeDasharray={id === "ball" ? "1.5 2.5" : "4 2.5"}
            opacity="0.5" markerEnd="url(#arrow)" />
        ))}
        {boardPlayers({
          ids: showDef ? [...DEF, ...OFF] : OFF,
          pos: displayPos,
          prevPos: preset?.anim && progress > 0.01 ? (id) => (preset.anim[id] ? interpKF(preset.anim[id], progress - 0.01) : null) : null,
          ball: displayPos("ball"),
          holder: preset?.anim && progress > 0 ? null : ballOwnerId,
          dt: 0.045,
        }).map((p) => (
          <Player25D key={p.id} p={p} onDown={onTokenDown} interactive={mode === "move"} />
        ))}
        <Ball25D ball={{ ...displayPos("ball"), z: ballOwnerId && !(preset?.anim && progress > 0) ? 3.5 : 0 }}
          onDown={onTokenDown} interactive={mode === "move"} />
        <g pointerEvents="none">
          {drawings.map((d, i) => d.type === "pen" ? (
            <polyline key={i} points={d.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none" stroke={CHALK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
          ) : (
            <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
              stroke={CHALK} strokeWidth="1.4" strokeLinecap="round" opacity="0.92" markerEnd="url(#arrow)" />
          ))}
        </g>
      </CourtStage>

      <div style={{
        flexShrink: 0, borderTop: "1px solid #232B32", background: "#171C21",
        padding: "10px calc(12px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))",
      }}>
        {preset?.anim && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Btn active onClick={togglePlay}>{playing ? "❚❚ Pause" : progress >= 1 ? "↻ Nochmal" : "▶ Abspielen"}</Btn>
            <input type="range" min="0" max="1" step="0.001" value={progress}
              onChange={(e) => { setPlaying(false); setProgress(parseFloat(e.target.value)); }}
              style={{ flex: 1 }} aria-label="Spielzug-Fortschritt" />
            <Btn active={showPaths} onClick={() => setShowPaths((s) => !s)}>Wege</Btn>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
          {!recording ? (
            <Btn active={false} tone={REC_COLOR} onClick={startRec}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: REC_COLOR, marginRight: 6, verticalAlign: "middle" }} />
              REC
            </Btn>
          ) : (
            <Btn active tone={REC_COLOR} onClick={stopRec}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#16110C", marginRight: 6, verticalAlign: "middle", animation: "recpulse 1s infinite" }} />
              ■ Stop
            </Btn>
          )}
          {!recording && hasRecording && (
            <>
              <Btn active={replaying} tone={OFF_COLOR} onClick={() => (replaying ? stopReplay() : playFrames(bufferRef.current))}>
                {replaying ? "■ Stopp" : "▶ Replay"}
              </Btn>
              <Btn active={saving} onClick={() => setSaving((s) => !s)}>✓ Speichern</Btn>
            </>
          )}
          {recording && <span style={{ fontSize: 12.5, color: REC_COLOR, letterSpacing: "0.04em" }}>Aufnahme läuft …</span>}
        </div>

        {saving && !recording && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={saveName} autoFocus onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveRecording(); }}
              placeholder="Name der Sequenz, z. B. Pick & Roll Mitte"
              style={{ flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 8, fontSize: 13, fontFamily: "inherit", color: "#E8E4DA", background: "#232B32", border: "1px solid #39424B", outline: "none" }} />
            <Btn active onClick={saveRecording}>Sichern</Btn>
            <Btn onClick={() => { setSaving(false); setSaveName(""); }}>Abbrechen</Btn>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Btn active={mode === "move"} onClick={() => setMode("move")}>✥ Bewegen</Btn>
          <Btn active={mode === "pen"} onClick={() => setMode("pen")}>✎ Stift</Btn>
          <Btn active={mode === "arrow"} onClick={() => setMode("arrow")}>↗ Pfeil</Btn>
          <Btn onClick={() => setDrawings((d) => d.slice(0, -1))}>⌫ Rückgängig</Btn>
          <Btn onClick={() => setDrawings([])}>Leeren</Btn>
          <Btn active={showDef} tone={DEF_COLOR} onClick={toggleDef}>Verteidigung</Btn>
          <Btn onClick={resetBoard}>Reset</Btn>
        </div>
      </div>
      {confirmSeq && (
        <Dialog title={`Aufnahme „${confirmSeq.name}“ löschen?`} onClose={() => setConfirmSeq(null)} actions={[
          { label: "Abbrechen", onClick: () => setConfirmSeq(null) },
          { label: "Löschen", danger: true, onClick: () => { deleteSequence(confirmSeq.id); setConfirmSeq(null); } },
        ]} />
      )}
    </div>
  );
}
