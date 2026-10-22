/* Spielerinnen-Modus: Rollenwahl, Aufgabenkarte, Read-Karte, Schrittsteuerung.
 * Ziel: eine U14/U16-Spielerin versteht am Handy allein, was sie wann warum tut. */

import { useState } from "react";
import { C_UI, Label, Chip, IconButton } from "./studioUi.jsx";
import { OFF_COLOR, DEF_COLOR } from "../court/constants.js";

const who = (C, id) => (id === "ball" ? "den Ball" : C.entity[id]?.label ?? id);

/** Auswahl "Wer bist du?" – groß und tippfreundlich */
export function RolePicker({ C, me, onPick, compact = false }) {
  const [team, setTeam] = useState(me && C.entity[me]?.team === "defense" ? "defense" : "offense");
  const ids = C.ids.filter((id) => C.entity[id].team === team);
  const color = team === "offense" ? OFF_COLOR : DEF_COLOR;
  return (
    <div>
      {!compact && <Label>Wer bist du?</Label>}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {ids.map((id) => {
          const on = id === me;
          return (
            <button key={id} onClick={() => onPick(id)} aria-pressed={on} title={`Ich bin ${C.entity[id].label}`}
              style={{
                width: compact ? 38 : 48, height: compact ? 38 : 48, borderRadius: 999, cursor: "pointer",
                border: `2px solid ${on ? C_UI.white : color}`, background: on ? color : "transparent",
                color: on ? "#16110C" : C_UI.text, fontFamily: "inherit", fontWeight: 800, fontSize: compact ? 13 : 16,
              }}>{C.entity[id].label}</button>
          );
        })}
        <button onClick={() => setTeam(team === "offense" ? "defense" : "offense")}
          style={{
            marginLeft: 4, padding: "6px 10px", borderRadius: 8, border: `1px solid ${C_UI.border}`, background: "transparent",
            color: C_UI.muted, fontFamily: "inherit", fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>{team === "offense" ? "Verteidigung →" : "← Angriff"}</button>
      </div>
    </div>
  );
}

/** Aufgabenkarte für den aktuellen Beat */
export function TaskCard({ C, role, beat, beatIndex, total, frameBeatTitle }) {
  const [why, setWhy] = useState(false);
  const firstTrigger = role.steps.find((s) => s.type !== "hold")?.trigger;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Chip tone={C_UI.accent} ink="#16110C">Beat {beatIndex + 1}/{total}</Chip>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.03em" }}>{frameBeatTitle}</span>
      </div>

      <div>
        <Label color={C_UI.accent}>Deine Aufgabe</Label>
        <div style={{ fontSize: 17, lineHeight: 1.35, fontWeight: 700, color: C_UI.text }}>{role.task}</div>
        {role.auto.task && (
          <div style={{ fontSize: 11.5, color: C_UI.dim, marginTop: 2 }}>Automatisch aus den Aktionen beschrieben – kein Trainer-Hinweis.</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        <div>
          <Label>Wann</Label>
          <div style={{ fontSize: 14, lineHeight: 1.35 }}>{firstTrigger ? firstTrigger[0].toUpperCase() + firstTrigger.slice(1) : "Gleich zu Beginn des Beats"}</div>
        </div>
        {(role.watch && !(role.auto.watch && role.watch === "ball")) && (
          <div>
            <Label>Achte auf</Label>
            <div style={{ fontSize: 14, lineHeight: 1.35 }}>
              <strong>{who(C, role.watch)}</strong>{role.cue ? ` – ${role.cue}` : ""}
            </div>
          </div>
        )}
        {role.stanceText && (
          <div>
            <Label>Stellung am Ziel</Label>
            <div style={{ fontSize: 14, lineHeight: 1.35 }}>{role.stanceText}</div>
          </div>
        )}
      </div>

      {(role.why || beat.text) && (
        <div>
          <button onClick={() => setWhy((v) => !v)} aria-expanded={why} style={{
            background: "none", border: "none", padding: 0, color: C_UI.accent, fontFamily: "inherit",
            fontWeight: 800, fontSize: 13, cursor: "pointer",
          }}>{why ? "▾" : "▸"} Warum?</button>
          {why && (
            <div style={{ fontSize: 13.5, lineHeight: 1.45, color: C_UI.muted, marginTop: 4 }}>
              {role.why && <div style={{ color: C_UI.text, marginBottom: 4 }}>{role.why}</div>}
              <div>{beat.text}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Read-Karte am Entscheidungspunkt: Beobachtung → Lösung */
export function DecisionCard({ C, decision, onChoose, chosen }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Chip tone={C_UI.warn} ink="#16110C">Read</Chip>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{decision.title}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{decision.question}</div>
      {decision.watch?.length > 0 && (
        <div style={{ fontSize: 13.5, color: C_UI.muted }}>Schau auf <strong style={{ color: C_UI.text }}>{decision.watch.map((w) => who(C, w)).join(", ")}</strong> – was siehst du?</div>
      )}
      <div style={{ display: "grid", gap: 6 }}>
        {decision.options.map((o, i) => (
          <button key={o.id} onClick={() => onChoose(o.id)} style={{
            textAlign: "left", padding: "10px 12px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${chosen === o.id ? C_UI.accent : C_UI.border}`, background: C_UI.card, color: C_UI.text,
          }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{String.fromCharCode(65 + i)} · {o.label}</div>
            {o.read && <div style={{ fontSize: 13, color: C_UI.muted, marginTop: 2 }}>Du siehst: {o.read}</div>}
            <div style={{ fontSize: 12.5, color: C_UI.accent, marginTop: 4, fontWeight: 700 }}>Das sehe ich → Lösung zeigen</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Schrittsteuerung für Spielerinnen: groß, wenige Knöpfe, eigene Momente auf der Zeitleiste */
export function PlayerControls({ time, total, playing, onPrev, onNext, onToggle, onSeek, moments, boundaries, decisionTimes, atEnd }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ position: "relative", height: 22 }}>
        <input type="range" min="0" max={total} step="0.001" value={time} aria-label="Zeitleiste"
          onChange={(e) => onSeek(parseFloat(e.target.value))} style={{ width: "100%", margin: 0, position: "absolute", top: 4 }} />
        {boundaries.slice(1, -1).map((b) => (
          <span key={`b${b}`} style={{ position: "absolute", left: `calc(${(b / total) * 100}% + ${8 - (b / total) * 16}px)`, top: 5, width: 2, height: 12, marginLeft: -1, background: "#E8E4DA", opacity: 0.45, pointerEvents: "none" }} />
        ))}
        {moments.map((m, i) => (
          <span key={`m${i}`} title="Hier bist du dran" style={{ position: "absolute", left: `calc(${(m.t / total) * 100}% + ${8 - (m.t / total) * 16}px)`, top: -1, width: 8, height: 8, marginLeft: -4, borderRadius: 4, background: C_UI.white, pointerEvents: "none" }} />
        ))}
        {decisionTimes.map((d) => (
          <span key={`d${d.t}`} title="Read" style={{ position: "absolute", left: `calc(${(d.t / total) * 100}% + ${8 - (d.t / total) * 16}px)`, top: 14, width: 9, height: 9, marginLeft: -4.5, transform: "rotate(45deg)", background: C_UI.warn, pointerEvents: "none" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconButton onClick={onPrev} title="Schritt zurück" style={{ height: 46, minWidth: 54, fontSize: 18 }}>◀</IconButton>
        <button onClick={onNext} disabled={atEnd} style={{
          flex: 1, height: 46, borderRadius: 12, border: "none", cursor: atEnd ? "default" : "pointer",
          background: C_UI.accent, color: "#16110C", fontFamily: "inherit", fontWeight: 800, fontSize: 16, opacity: atEnd ? 0.5 : 1,
        }}>{playing ? "läuft …" : "▶ Weiter"}</button>
        <IconButton onClick={onToggle} title={playing ? "Pause" : "Alles abspielen"} style={{ height: 46, minWidth: 54 }}>{playing ? "❚❚" : "▶▶"}</IconButton>
      </div>
    </div>
  );
}
