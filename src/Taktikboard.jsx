import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Court, { viewBoxFor } from "./court/Court.jsx";
import { OFF_COLOR, DEF_COLOR, BALL_COLOR, REC_COLOR, CHALK, OPEN_COLOR, OFF, DEF, courtHeight } from "./court/constants.js";
import { PRESETS, DEFAULT_HALF, DEFAULT_FULL, interpKF } from "./legacy/presets.js";
import { FRAME_MS, clone, loadSeqs, persistSeqs } from "./legacy/recordingStore.js";
import useZoomPan from "./hooks/useZoomPan.js";
import Btn from "./ui/Btn.jsx";
import Player25D, { PlayerDefs } from "./render/Player25D.jsx";
import Ball25D, { BallDefs } from "./render/Ball25D.jsx";
import { boardPlayers } from "./render/boardView.js";
import { ViewContext, PORTRAIT, LANDSCAPE, LANDSCAPE_MATRIX } from "./render/view.js";
import PlayScene from "./render/PlayScene.jsx";
import PlayControls from "./ui/PlayControls.jsx";
import usePlayback from "./hooks/usePlayback.js";
import { PLAYS, compilePlay, sampleFrame, beatDiagram, beatBoundaries } from "./play/index.js";

/* ============================================================
   TAKTIKBOARD – Basketball Coach Board
   Halbfeld / Ganzfeld · Drag & Drop · Zeichnen · Spielzug-Animation
   Koordinaten: siehe court/constants.js
   ============================================================ */

const SNAP_PX = 60;                          // Snap-Radius in Bildschirm-Pixeln
const BALL_OFFSET = { x: 6.5, y: -6.5 };     // Ball sitzt an der Schulter des Trägers

/* ---------------- App ---------------- */

export default function Taktikboard() {
  const [courtType, setCourtType] = useState("half");
  const [positions, setPositions] = useState(DEFAULT_HALF);
  const [showDef, setShowDef] = useState(true);
  const [mode, setMode] = useState("move"); // move | pen | arrow
  const [drawings, setDrawings] = useState([]);
  const [preset, setPreset] = useState(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showPaths, setShowPaths] = useState(true);
  const [ballOwnerId, setBallOwnerId] = useState(null); // "o1".."o5" / "d1".."d5" oder null
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [sequences, setSequences] = useState(loadSeqs);
  const [activeSeqId, setActiveSeqId] = useState(null);
  const [activePlayId, setActivePlayId] = useState(null); // aktionsbasiertes Play (neu)

  const svgRef = useRef(null);
  const viewportRef = useRef(null);
  const dragId = useRef(null);
  const ballPosRef = useRef(null);
  const stroke = useRef(null);
  const rafRef = useRef(null);
  const playRef = useRef(false);
  const snapRef = useRef(null);    // immer aktueller Board-State (für Aufnahme)
  const bufferRef = useRef([]);    // temporärer Aufnahme-Buffer
  const replayTimer = useRef(null);

  const { zoom, pan, resetZoom, isGesturing, handlers: zoomHandlers } = useZoomPan(viewportRef, {
    onGestureStart: () => { dragId.current = null; stroke.current = null; },
  });

  // Ganzfeld auf breiten Bildschirmen (Tablet quer, Desktop) quer darstellen
  const [viewportAspect, setViewportAspect] = useState(1);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (height > 0) setViewportAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const landscape = courtType === "full" && viewportAspect > 1.15;
  const view = landscape ? LANDSCAPE : PORTRAIT;

  const VB = viewBoxFor(courtType, landscape);

  /* ----- Aktionsbasierte Plays ----- */
  const activePlay = PLAYS.find((p) => p.id === activePlayId) ?? null;
  const compiled = useMemo(() => (activePlay ? compilePlay(activePlay) : null), [activePlay]);
  const playback = usePlayback(compiled?.total ?? 0);
  const frame = compiled ? sampleFrame(compiled, playback.time) : null;
  const diagram = compiled && showPaths ? beatDiagram(compiled, frame.beatIndex) : null;

  // Maßstab der gezeichneten viewBox (preserveAspectRatio="xMidYMid meet"):
  // px pro Court-Einheit – berücksichtigt Letterboxing UND den Zoom-Transform.
  const courtScale = (r) => Math.min(r.width / VB.w, r.height / VB.h);

  const toCourt = useCallback((e) => {
    const r = svgRef.current.getBoundingClientRect();
    const s = Math.min(r.width / VB.w, r.height / VB.h);
    const offX = r.left + (r.width - VB.w * s) / 2;
    const offY = r.top + (r.height - VB.h * s) / 2;
    const sx = (e.clientX - offX) / s + VB.x, sy = (e.clientY - offY) / s + VB.y;
    return landscape ? { x: 150 - sy, y: sx } : { x: sx, y: sy };
  }, [VB.w, VB.h, VB.x, VB.y, landscape]);

  /* ----- Animation loop ----- */
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

  /* ----- Aufnahme & Replay ----- */
  // Spiegelt den aktuellen Board-State (für die Aufnahme-Schleife)
  snapRef.current = { positions, ballOwnerId, drawings, showDef, courtType };

  // Aufnahme: alle FRAME_MS ein vollständiger Snapshot in den Buffer
  useEffect(() => {
    if (!recording) return;
    const tick = () => bufferRef.current.push(clone(snapRef.current));
    tick(); // sofort ersten Frame sichern
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
    leavePlay();
    stopReplay();
    setPlaying(false);
    bufferRef.current = [];
    setHasRecording(false);
    setSaving(false); setSaveName("");
    setActiveSeqId(null);
    setRecording(true);
  };

  const stopRec = () => {
    setRecording(false);
    setHasRecording(bufferRef.current.length > 0);
  };

  const saveRecording = () => {
    if (!bufferRef.current.length) return;
    const name = saveName.trim() || `Sequenz ${sequences.length + 1}`;
    const seq = { id: "seq_" + Date.now(), name, frames: clone(bufferRef.current) };
    const next = [...sequences, seq];
    setSequences(next); persistSeqs(next);
    setSaving(false); setSaveName("");
  };

  const playSequence = (seq) => {
    leavePlay();
    if (recording) stopRec();
    setActiveSeqId(seq.id);
    resetZoom();
    playFrames(seq.frames);
  };

  const deleteSequence = (id) => {
    const next = sequences.filter((s) => s.id !== id);
    setSequences(next); persistSeqs(next);
    if (activeSeqId === id) setActiveSeqId(null);
  };

  /* ----- Display position (Animation überlagert State) ----- */
  const displayPos = (id) => {
    if (preset?.anim?.[id] && progress > 0) return interpKF(preset.anim[id], progress);
    // Ball klebt am Träger (sofern keine Spielzug-Animation den Ball steuert)
    if (id === "ball" && ballOwnerId && positions[ballOwnerId]) {
      const o = displayPos(ballOwnerId);
      return { x: o.x + BALL_OFFSET.x, y: o.y + BALL_OFFSET.y };
    }
    return positions[id];
  };

  /* ----- Pointer handling ----- */
  const onTokenDown = (e, id) => {
    if (mode !== "move" || isGesturing() || replaying) return;
    if (progress > 0) { setProgress(0); setPlaying(false); }
    if (id === "ball" && ballOwnerId) {
      // Ball löst sich vom Träger – an aktueller (Schulter-)Position weiterziehen
      const start = displayPos("ball");
      setPositions((pos) => ({ ...pos, ball: { ...start } }));
      setBallOwnerId(null);
      ballPosRef.current = start;
    } else if (id === "ball") {
      ballPosRef.current = positions.ball;
    }
    dragId.current = id;
    try { svgRef.current.setPointerCapture(e.pointerId); } catch {}
  };

  const onSvgDown = (e) => {
    if (mode === "move" || isGesturing() || replaying) return;
    const p = toCourt(e);
    stroke.current = mode === "pen"
      ? { type: "pen", points: [p] }
      : { type: "arrow", x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    setDrawings((d) => [...d, stroke.current]);
    try { svgRef.current.setPointerCapture(e.pointerId); } catch {}
  };

  const onSvgMove = (e) => {
    if (isGesturing() || replaying) return;
    if (dragId.current) {
      const p = toCourt(e);
      const id = dragId.current;
      const maxY = courtHeight(courtType);
      const np = { x: Math.max(0, Math.min(150, p.x)), y: Math.max(0, Math.min(maxY, p.y)) };
      if (id === "ball") ballPosRef.current = np;
      setPositions((pos) => ({ ...pos, [id]: np }));
    } else if (stroke.current) {
      const p = toCourt(e);
      if (stroke.current.type === "pen") stroke.current.points.push(p);
      else { stroke.current.x2 = p.x; stroke.current.y2 = p.y; }
      setDrawings((d) => [...d.slice(0, -1), { ...stroke.current }]);
    }
  };

  const onSvgUp = () => {
    if (dragId.current === "ball" && ballPosRef.current) snapBall(ballPosRef.current);
    dragId.current = null; stroke.current = null;
  };

  // Snap: liegt der losgelassene Ball innerhalb SNAP_PX eines sichtbaren
  // Spieler-Mittelpunkts, übernimmt dieser Spieler den Ball.
  const snapBall = (ballPos) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const thr = SNAP_PX / courtScale(r); // 60px -> Court-Einheiten (zoom-/letterbox-genau)
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
  const leavePlay = () => { playback.pause(); setActivePlayId(null); };

  const selectPlay = (p) => {
    if (recording) stopRec();
    stopReplay(); setActiveSeqId(null);
    setPreset(null); setProgress(0); setPlaying(false);
    setDrawings([]); resetZoom(); setMode("move");
    setCourtType(p.court); setShowDef(true);
    setActivePlayId(p.id);
    playback.seek(0);
  };

  const applyPreset = (p) => {
    leavePlay();
    const base = p.court === "half" ? DEFAULT_HALF : DEFAULT_FULL;
    setCourtType(p.court);
    setPositions({ ...base, ...p.pos });
    setShowDef(p.showDef);
    setPreset(p);
    setProgress(0);
    setPlaying(false);
    setDrawings([]);
    resetZoom();
    setBallOwnerId(null);
    stopReplay(); setActiveSeqId(null);
  };

  const switchCourt = (t) => {
    if (t === courtType && !activePlay) return;
    leavePlay();
    setCourtType(t);
    setPositions(t === "half" ? DEFAULT_HALF : DEFAULT_FULL);
    setPreset(null); setProgress(0); setPlaying(false); setDrawings([]);
    resetZoom();
    setBallOwnerId(null);
    stopReplay(); setActiveSeqId(null);
  };

  const resetBoard = () => {
    leavePlay();
    setPositions(courtType === "half" ? DEFAULT_HALF : DEFAULT_FULL);
    setPreset(null); setProgress(0); setPlaying(false); setDrawings([]);
    resetZoom();
    setBallOwnerId(null);
    stopReplay(); setActiveSeqId(null);
  };

  // Verteidigung ausblenden: hält ein Verteidiger den Ball, fällt der Ball frei
  // an seine letzte Position zurück.
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

  /* ----- UI-Hilfen ----- */
  const entityColor = (id) => (id === "ball" ? BALL_COLOR : id.startsWith("d") ? DEF_COLOR : OFF_COLOR);

  // Tastatur (Tablet mit Tastatur / Desktop): Leertaste, Pfeile
  const keyRef = useRef(null);
  keyRef.current = (e) => {
    if (!compiled || e.target.closest?.("input, textarea")) return;
    const bounds = beatBoundaries(compiled);
    if (e.key === " ") { e.preventDefault(); playback.toggle(); }
    else if (e.key === "ArrowRight") { const t = bounds.find((b) => b > playback.time + 0.02); if (t != null) playback.playTo(t); }
    else if (e.key === "ArrowLeft") playback.seek([...bounds].reverse().find((b) => b < playback.time - 0.05) ?? 0);
  };
  useEffect(() => {
    const h = (e) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      background: "#14181C", color: "#E8E4DA",
      fontFamily: "'Archivo Narrow','Arial Narrow','Roboto Condensed',system-ui,sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;700&display=swap');
        input[type=range]{accent-color:${OFF_COLOR};}
        ::-webkit-scrollbar{height:0;width:0;}
        button:focus-visible{outline:2px solid ${OFF_COLOR};outline-offset:2px;}
        @keyframes recpulse{0%,100%{opacity:1;}50%{opacity:0.25;}}
        @keyframes tbpulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
        @keyframes tbspin{to{transform:rotate(360deg);}}
        .tb-pulse{animation:tbpulse 0.9s ease-in-out infinite;}
        .tb-spin{animation:tbspin 6s linear infinite;transform-box:view-box;}
        @media (prefers-reduced-motion: reduce){.tb-pulse,.tb-spin{animation:none;}}
      `}</style>

      {/* ===== Obere Leiste (fix) ===== */}
      <div style={{
        flexShrink: 0,
        padding: "calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 6px calc(12px + env(safe-area-inset-left))",
      }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Taktik<span style={{ color: OFF_COLOR }}>board</span>
          </h1>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn active={courtType === "half"} onClick={() => switchCourt("half")}>Halbfeld</Btn>
            <Btn active={courtType === "full"} onClick={() => switchCourt("full")}>Ganzfeld</Btn>
          </div>
        </header>

        {/* Spielzüge + gespeicherte Aufnahmen */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {PLAYS.map((p) => (
            <Btn key={p.id} active={activePlayId === p.id} onClick={() => selectPlay(p)} tone={OPEN_COLOR}
              title={`${p.name} (aktionsbasiert)`}>
              ★ {p.name}
            </Btn>
          ))}
          {PRESETS.map((p) => (
            <Btn key={p.id} active={preset?.id === p.id} onClick={() => applyPreset(p)}
              tone={p.id === "zone23" ? DEF_COLOR : OFF_COLOR}>
              {p.name}
            </Btn>
          ))}
          {sequences.map((seq) => (
            <span key={seq.id} style={{ display: "inline-flex", flexShrink: 0, alignItems: "stretch", gap: 2 }}>
              <Btn active={activeSeqId === seq.id} tone={REC_COLOR} onClick={() => playSequence(seq)}>
                ▶ {seq.name}
              </Btn>
              <button onClick={() => { if (window.confirm(`Sequenz „${seq.name}“ löschen?`)) deleteSequence(seq.id); }}
                title="Aufnahme löschen" aria-label={`Aufnahme ${seq.name} löschen`}
                style={{
                  padding: "0 8px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer", border: "1px solid #39424B",
                  background: "#232B32", color: "#8E9AA4",
                }}>✕</button>
            </span>
          ))}
        </div>

        {frame && (
          <p aria-live="polite" style={{
            margin: "8px 2px 0", fontSize: 13, lineHeight: 1.4, color: "#B9C2C9", minHeight: "2.8em",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            <strong style={{ color: OFF_COLOR, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Beat {frame.beatIndex + 1}/{compiled.beats.length} · {frame.beat.title}
            </strong>{" "}
            {frame.beat.text}
          </p>
        )}
        {preset && (
          <p style={{
            margin: "8px 2px 0", fontSize: 13, lineHeight: 1.4, color: "#B9C2C9",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {preset.note}
          </p>
        )}
      </div>

      {/* ===== Court (flexibel, füllt verfügbaren Platz) ===== */}
      <div ref={viewportRef}
        {...zoomHandlers}
        style={{
          flex: 1, minHeight: 0, position: "relative", overflow: "hidden",
          touchAction: "none", padding: "6px 10px",
        }}>
        <div style={{
          position: "absolute", inset: "6px 10px",
          transformOrigin: "0 0",
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          willChange: "transform",
        }}>
        {/* Feld */}
        <svg ref={svgRef}
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
          onPointerDown={onSvgDown} onPointerMove={onSvgMove}
          onPointerUp={onSvgUp} onPointerCancel={onSvgUp}>

          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
            <PlayerDefs />
            <BallDefs />
          </defs>

          <ViewContext.Provider value={view}>
          <g transform={landscape ? LANDSCAPE_MATRIX : undefined}>
          <Court courtType={courtType} />

          {frame ? (
            <PlayScene frame={frame} diagram={diagram} showDef={showDef} />
          ) : (<>
          {/* Preset-Formen (z. B. Triangle) */}
          {preset?.shapes?.map((s, i) => (
            <polygon key={i} points={s.points.map((p) => p.join(",")).join(" ")}
              fill="rgba(237,232,220,0.06)" stroke={CHALK} strokeWidth="0.8"
              strokeDasharray="3 2.5" opacity="0.7" />
          ))}

          {/* Laufwege */}
          {showPaths && preset?.anim && Object.entries(preset.anim).map(([id, kfs]) => (
            <polyline key={id}
              points={kfs.map((k) => `${k.x},${k.y}`).join(" ")}
              fill="none" stroke={entityColor(id)} strokeWidth="1.1"
              strokeDasharray={id === "ball" ? "1.5 2.5" : "4 2.5"}
              opacity="0.5" markerEnd="url(#arrow)" />
          ))}

          {/* Spielerinnen (2,5D) */}
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
          </>)}

          {/* Zeichnungen (über den Figuren, aber ohne Pointer-Events) */}
          <g pointerEvents="none">
          {drawings.map((d, i) =>
            d.type === "pen" ? (
              <polyline key={i} points={d.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke={CHALK} strokeWidth="1.4" strokeLinecap="round"
                strokeLinejoin="round" opacity="0.92" />
            ) : (
              <line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
                stroke={CHALK} strokeWidth="1.4" strokeLinecap="round"
                opacity="0.92" markerEnd="url(#arrow)" />
            )
          )}
          </g>
          </g>
          </ViewContext.Provider>
        </svg>
        </div>

        {/* Zoom-Reset (nur sichtbar wenn gezoomt) */}
        {zoom > 1.01 && (
          <button onClick={resetZoom} style={{
            position: "absolute", top: 12, right: 16, zIndex: 5,
            padding: "6px 11px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            fontFamily: "inherit", cursor: "pointer", color: "#16110C",
            background: OFF_COLOR, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}>⊙ {zoom.toFixed(1)}×</button>
        )}
      </div>

      {/* ===== Untere Leiste (fix, immer sichtbar) ===== */}
      <div style={{
        flexShrink: 0, borderTop: "1px solid #232B32", background: "#171C21",
        padding: "10px calc(12px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left))",
      }}>
        {/* Aktionsbasiertes Play */}
        {compiled && (
          <PlayControls compiled={compiled} frame={frame} playback={playback}
            showPaths={showPaths} onTogglePaths={() => setShowPaths((s) => !s)} />
        )}

        {/* Abspielen (Legacy-Presets) */}
        {preset?.anim && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Btn active onClick={togglePlay}>
              {playing ? "❚❚ Pause" : progress >= 1 ? "↻ Nochmal" : "▶ Abspielen"}
            </Btn>
            <input type="range" min="0" max="1" step="0.001" value={progress}
              onChange={(e) => { setPlaying(false); setProgress(parseFloat(e.target.value)); }}
              style={{ flex: 1 }} aria-label="Spielzug-Fortschritt" />
            <Btn active={showPaths} onClick={() => setShowPaths((s) => !s)}>Wege</Btn>
          </div>
        )}

        {/* Aufnahme & Replay (Legacy) */}
        {!compiled && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
          {!recording ? (
            <Btn active={false} tone={REC_COLOR} onClick={startRec}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%",
                background: REC_COLOR, marginRight: 6, verticalAlign: "middle" }} />
              REC
            </Btn>
          ) : (
            <Btn active tone={REC_COLOR} onClick={stopRec}>
              <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%",
                background: "#16110C", marginRight: 6, verticalAlign: "middle",
                animation: "recpulse 1s infinite" }} />
              ■ Stop
            </Btn>
          )}

          {!recording && hasRecording && (
            <>
              <Btn active={replaying} tone={OFF_COLOR}
                onClick={() => (replaying ? stopReplay() : playFrames(bufferRef.current))}>
                {replaying ? "■ Stopp" : "▶ Replay"}
              </Btn>
              <Btn active={saving} onClick={() => setSaving((s) => !s)}>✓ Speichern</Btn>
            </>
          )}

          {recording && (
            <span style={{ fontSize: 12.5, color: REC_COLOR, letterSpacing: "0.04em" }}>
              Aufnahme läuft …
            </span>
          )}
        </div>
        )}

        {/* Speichern-Feld */}
        {saving && !recording && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={saveName} autoFocus
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveRecording(); }}
              placeholder="Name der Sequenz, z. B. Pick & Roll Mitte"
              style={{
                flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 8, fontSize: 13,
                fontFamily: "inherit", color: "#E8E4DA", background: "#232B32",
                border: "1px solid #39424B", outline: "none",
              }} />
            <Btn active onClick={saveRecording}>Sichern</Btn>
            <Btn onClick={() => { setSaving(false); setSaveName(""); }}>Abbrechen</Btn>
          </div>
        )}

        {/* Werkzeuge */}
        {compiled ? (
          // Im Play: Figuren sind nicht verschiebbar, Zeichnen bleibt zum Erklären
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <Btn active={mode === "pen"} onClick={() => setMode((m) => (m === "pen" ? "move" : "pen"))}>✎ Stift</Btn>
            <Btn active={mode === "arrow"} onClick={() => setMode((m) => (m === "arrow" ? "move" : "arrow"))}>↗ Pfeil</Btn>
            {drawings.length > 0 && <Btn onClick={() => setDrawings([])}>Leeren</Btn>}
            <Btn active={showDef} tone={DEF_COLOR} onClick={() => setShowDef((v) => !v)}>Verteidigung</Btn>
            <Btn onClick={resetBoard} title="Play schließen, freies Board">✕</Btn>
          </div>
        ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Btn active={mode === "move"} onClick={() => setMode("move")}>✥ Bewegen</Btn>
          <Btn active={mode === "pen"} onClick={() => setMode("pen")}>✎ Stift</Btn>
          <Btn active={mode === "arrow"} onClick={() => setMode("arrow")}>↗ Pfeil</Btn>
          <Btn onClick={() => setDrawings((d) => d.slice(0, -1))}>⌫ Rückgängig</Btn>
          <Btn onClick={() => setDrawings([])}>Leeren</Btn>
          <Btn active={showDef} tone={DEF_COLOR} onClick={toggleDef}>Verteidigung</Btn>
          <Btn onClick={resetBoard}>Reset</Btn>
        </div>
        )}
      </div>
    </div>
  );
}
