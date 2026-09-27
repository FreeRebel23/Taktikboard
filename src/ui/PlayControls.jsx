/* Steuerung für aktionsbasierte Plays: Beats, Play/Pause, Schritt, Scrubbing, Tempo. */

import Btn from "./Btn.jsx";
import { OFF_COLOR } from "../court/constants.js";
import { beatBoundaries } from "../play/engine.js";

const NAV = { padding: "7px 10px", minWidth: 40 };

export default function PlayControls({ compiled, frame, playback, showPaths, onTogglePaths }) {
  const { time, playing, speed } = playback;
  const bounds = beatBoundaries(compiled);
  const total = compiled.total;
  const atEnd = time >= total - 1e-3;

  const next = () => {
    const target = bounds.find((b) => b > time + 0.02);
    if (target != null) playback.playTo(target);
  };
  const prev = () => {
    const target = [...bounds].reverse().find((b) => b < time - 0.05) ?? 0;
    playback.seek(target);
  };
  const playBeat = (i) => {
    const b = compiled.beats[i];
    playback.seek(b.t0);
    playback.playTo(b.t1);
  };

  return (
    <div>
      {/* Beats */}
      <div role="tablist" aria-label="Beats" style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8 }}>
        {compiled.beats.map((b, i) => {
          const active = frame.beatIndex === i;
          const done = time >= b.t1 - 1e-3;
          return (
            <button key={b.beat.id} role="tab" aria-selected={active} onClick={() => playBeat(i)}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "6px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap",
                border: `1px solid ${active ? OFF_COLOR : "#39424B"}`,
                background: active ? "rgba(242,118,46,0.16)" : "#1D242A",
                color: active ? "#FFE1CC" : done ? "#8E9AA4" : "#D9D4C8",
              }}>
              <span style={{
                display: "inline-grid", placeItems: "center", width: 18, height: 18, borderRadius: 9,
                fontSize: 11, background: active ? OFF_COLOR : done ? "#39424B" : "#2A333B",
                color: active ? "#16110C" : "#D9D4C8",
              }}>{i + 1}</span>
              {b.beat.title}
            </button>
          );
        })}
      </div>

      {/* Zeitleiste mit Beat-Markern */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: 8 }}>
        <input type="range" min="0" max={total} step="0.001" value={time}
          onChange={(e) => playback.seek(parseFloat(e.target.value))}
          style={{ width: "100%", margin: 0 }} aria-label="Zeitleiste" />
        {bounds.slice(1, -1).map((b) => (
          <span key={b} style={{
            position: "absolute", left: `calc(${(b / total) * 100}% + ${8 - (b / total) * 16}px)`,
            top: "50%", width: 2, height: 12, marginTop: -6, marginLeft: -1, borderRadius: 1,
            background: "#E8E4DA", opacity: 0.55, pointerEvents: "none",
          }} />
        ))}
      </div>

      {/* Transport */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Btn onClick={() => playback.seek(0)} title="Zum Anfang" style={NAV}>⏮</Btn>
        <Btn onClick={prev} title="Beat zurück" style={NAV}>◀</Btn>
        <Btn active onClick={playback.toggle} title={playing ? "Pause" : "Abspielen"} style={{ minWidth: 104 }}>
          {playing ? "❚❚ Pause" : atEnd ? "↻ Nochmal" : "▶ Abspielen"}
        </Btn>
        <Btn onClick={next} title="Nächster Beat" style={NAV} disabled={atEnd}>▶|</Btn>
        <span style={{ flex: 1 }} />
        <Btn onClick={() => playback.setSpeed(speed === 1 ? 0.5 : 1)} title="Tempo" style={NAV}>
          {speed === 1 ? "1×" : "½×"}
        </Btn>
        <Btn active={showPaths} onClick={onTogglePaths} title="Laufwege des Beats">Wege</Btn>
      </div>
    </div>
  );
}
