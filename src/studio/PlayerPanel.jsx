/* Spielerinnen-Modus: Rollenwahl, Aufgabenkarte, Read-Karte, Schrittsteuerung.
 * Ziel: eine U14/U16-Spielerin versteht am Handy allein, was sie wann warum tut. */

import { useState } from "react";
import { C_UI, Label, Chip, IconButton } from "./studioUi.jsx";
import { OFF_COLOR, DEF_COLOR } from "../court/constants.js";

const who = (C, id) => (id === "ball" ? "den Ball" : C.entity[id]?.label ?? id);

/** Auswahl "Wer bist du?" – groß und tippfreundlich (mind. 44 px) */
export function RolePicker({ C, me, onPick, compact = false }) {
  const [team, setTeam] = useState(me && C.entity[me]?.team === "defense" ? "defense" : "offense");
  const ids = C.ids.filter((id) => C.entity[id].team === team);
  const color = team === "offense" ? OFF_COLOR : DEF_COLOR;
  const size = compact ? 44 : 52;
  return (
    <div>
      {!compact && <Label>Wer bist du?</Label>}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {ids.map((id) => {
          const on = id === me;
          return (
            <button key={id} onClick={() => onPick(id)} aria-pressed={on} title={`Ich bin ${C.entity[id].label}`}
              style={{
                width: size, height: size, borderRadius: 999, cursor: "pointer", padding: 0,
                border: `2px solid ${on ? C_UI.white : color}`, background: on ? color : "transparent",
                color: on ? "#16110C" : C_UI.text, fontFamily: "inherit", fontWeight: 800, fontSize: compact ? 15 : 17,
              }}>{C.entity[id].label}</button>
          );
        })}
        <button onClick={() => setTeam(team === "offense" ? "defense" : "offense")}
          title={team === "offense" ? "Positionen der Verteidigung zeigen" : "Positionen des Angriffs zeigen"}
          style={{
            minHeight: 44, minWidth: 44, padding: compact ? "0 8px" : "0 12px", borderRadius: 10, border: `1px solid ${C_UI.border}`, background: "transparent",
            color: C_UI.muted, fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer",
          }}>{compact ? "⇄" : team === "offense" ? "Verteidigung →" : "← Angriff"}</button>
      </div>
    </div>
  );
}

/** Kurze Anleitung beim ersten Öffnen (Positionswahl) */
export function HowTo() {
  const row = (n, text) => (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 10, background: C_UI.accent, color: "#16110C", fontWeight: 800, fontSize: 12, display: "grid", placeItems: "center" }}>{n}</span>
      <span>{text}</span>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 6, fontSize: 14, lineHeight: 1.4, color: C_UI.muted }}>
      {row(1, <>Tippe deine Nummer an – oder <strong style={{ color: C_UI.text }}>Team</strong> für alle fünf, <strong style={{ color: C_UI.text }}>＋</strong> für mehrere.</>)}
      {row(2, <>Mit <strong style={{ color: C_UI.text }}>▶ Weiter</strong> siehst du den Spielzug Schritt für Schritt – mit deiner Aufgabe.</>)}
      {row(3, <>Bei <strong style={{ color: C_UI.warn }}>Read</strong> entscheidest du selbst: Schau, was die Verteidigung macht.</>)}
    </div>
  );
}

/** Legende: was bedeuten die Zeichen auf dem Feld und die Knöpfe? */
export function Legend() {
  const row = (sym, text) => (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ flexShrink: 0, width: 34, textAlign: "center", fontWeight: 800 }}>{sym}</span>
      <span style={{ fontSize: 14, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {row(<span style={{ fontSize: 11, background: "#fff", color: "#111", borderRadius: 6, padding: "1px 4px" }}>DU</span>, "Das bist du (weiß umrandet).")}
      {row(<span style={{ fontSize: 11, background: C_UI.accent, color: "#111", borderRadius: 6, padding: "1px 4px" }}>ZIEL</span>, "Heller Schatten: Dorthin läufst du in diesem Schritt.")}
      {row("- ◉ -", "Gestrichelte Linie mit Auge: Darauf achtest du.")}
      {row(<span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 5, background: "#fff" }} />, "Weißer Punkt auf der Zeitleiste: Hier bist du dran.")}
      {row(<span style={{ display: "inline-block", width: 9, height: 9, transform: "rotate(45deg)", background: C_UI.warn }} />, "Gelbe Raute: Read – hier entscheidest du.")}
      {row("◀ ↻", "Einen Schritt zurück · den letzten Schritt nochmal zeigen.")}
      {row("🐢", "Zeitlupe: alles halb so schnell.")}
      {row("▶▶", "Bis zum nächsten Read (oder bis zum Ende) abspielen.")}
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
            background: "none", border: "none", padding: "0 12px 0 0", minHeight: 44, color: C_UI.accent, fontFamily: "inherit",
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

/** Read-Karte am Entscheidungspunkt: Read üben (Verteidigung ansehen → entscheiden)
 *  oder eine Variante direkt ansehen */
export function DecisionCard({ C, decision, onChoose, chosen, onPractice }) {
  const [browse, setBrowse] = useState(!onPractice);
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
      {onPractice && (
        <button onClick={onPractice} style={{
          minHeight: 48, borderRadius: 12, border: "none", cursor: "pointer", background: C_UI.warn, color: "#16110C",
          fontFamily: "inherit", fontWeight: 800, fontSize: 16,
        }}>▶ Verteidigung ansehen und entscheiden</button>
      )}
      {onPractice && (
        <button onClick={() => setBrowse((v) => !v)} aria-expanded={browse} style={{
          justifySelf: "start", minHeight: 44, background: "none", border: "none", padding: 0, color: C_UI.muted,
          fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
        }}>{browse ? "▾" : "▸"} Oder eine Variante direkt ansehen</button>
      )}
      {browse && (
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
      )}
    </div>
  );
}

/** Read-Training: zuschauen → entscheiden → Rückmeldung */
export function QuizCard({ C, decision, phase, secret, picked, onPick, onReplay, onContinue, answerOf }) {
  const right = picked === secret.id;
  const watch = decision.watch?.length ? decision.watch.map((w) => who(C, w)).join(", ") : "die Verteidigung";
  return (
    <div style={{ display: "grid", gap: 8 }} aria-live="polite">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Chip tone={C_UI.warn} ink="#16110C">Read-Training</Chip>
        <span style={{ fontWeight: 800, fontSize: 14 }}>{decision.title}</span>
      </div>
      {phase === "watch" && (
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>Schau genau auf <span style={{ color: C_UI.warn }}>{watch}</span> …</div>
      )}
      {phase === "ask" && (
        <>
          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>Was machst du jetzt?</div>
          <div style={{ display: "grid", gap: 6 }}>
            {decision.options.map((o, i) => (
              <button key={o.id} onClick={() => onPick(o.id)} style={{
                textAlign: "left", padding: "12px", minHeight: 48, borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                border: `1.5px solid ${C_UI.border}`, background: C_UI.card, color: C_UI.text, fontSize: 15, fontWeight: 800,
              }}>{String.fromCharCode(65 + i)} · {answerOf(o)}</button>
            ))}
          </div>
          <button onClick={onReplay} style={{ justifySelf: "start", minHeight: 44, background: "none", border: "none", padding: 0, color: C_UI.muted, fontFamily: "inherit", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>↻ Nochmal ansehen</button>
        </>
      )}
      {phase === "done" && (
        <>
          <div role="status" style={{ fontSize: 18, fontWeight: 800, color: right ? C_UI.open : "#FFB4A8" }}>
            {right ? "✓ Richtig gelesen!" : "✗ Nicht ganz."}
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.45 }}>
            <div><span style={{ color: C_UI.muted }}>Die Verteidigung:</span> {secret.label}</div>
            {secret.read && <div style={{ color: C_UI.muted }}>{secret.read}</div>}
            <div style={{ marginTop: 4, color: C_UI.open, fontWeight: 700 }}>Lösung: {answerOf(secret)}</div>
          </div>
          <button onClick={onContinue} style={{
            minHeight: 48, borderRadius: 12, border: "none", cursor: "pointer", background: C_UI.accent, color: "#16110C",
            fontFamily: "inherit", fontWeight: 800, fontSize: 16,
          }}>▶ Lösung ansehen</button>
        </>
      )}
    </div>
  );
}

/** Schrittsteuerung für Spielerinnen: groß, wenige Knöpfe, eigene Momente auf der Zeitleiste */
export function PlayerControls({ time, total, playing, onPrev, onNext, onToggle, onSeek, onReplay, slow, onSlow, moments, boundaries, decisionTimes, atEnd }) {
  const pos = (t) => `calc(${(t / total) * 100}% + ${8 - (t / total) * 16}px)`;
  const small = { height: 46, minWidth: 46, padding: "0 6px", fontSize: 17 };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ position: "relative", height: 22 }}>
        <input type="range" min="0" max={total} step="0.001" value={time} aria-label="Zeitleiste"
          onChange={(e) => onSeek(parseFloat(e.target.value))} style={{ width: "100%", margin: 0, position: "absolute", top: 4 }} />
        {boundaries.slice(1, -1).map((b) => (
          <span key={`b${b}`} style={{ position: "absolute", left: pos(b), top: 5, width: 2, height: 12, marginLeft: -1, background: "#E8E4DA", opacity: 0.45, pointerEvents: "none" }} />
        ))}
        {moments.map((m, i) => (
          <span key={`m${i}`} title="Hier bist du dran" style={{ position: "absolute", left: pos(m.t), top: -1, width: 8, height: 8, marginLeft: -4, borderRadius: 4, background: C_UI.white, pointerEvents: "none" }} />
        ))}
        {decisionTimes.map((d) => (
          <span key={`d${d.t}`} title="Read" style={{ position: "absolute", left: pos(d.t), top: 14, width: 9, height: 9, marginLeft: -4.5, transform: "rotate(45deg)", background: C_UI.warn, pointerEvents: "none" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <IconButton onClick={onPrev} title="Schritt zurück" style={small}>◀</IconButton>
        <IconButton onClick={onReplay} title="Schritt nochmal" style={small}>↻</IconButton>
        <button onClick={onNext} disabled={atEnd} style={{
          flex: 1, minWidth: 0, height: 46, borderRadius: 12, border: "none", cursor: atEnd ? "default" : "pointer",
          background: C_UI.accent, color: "#16110C", fontFamily: "inherit", fontWeight: 800, fontSize: 16, opacity: atEnd ? 0.5 : 1,
        }}>{playing ? "läuft …" : "▶ Weiter"}</button>
        <IconButton active={slow} onClick={onSlow} title={slow ? "Normale Geschwindigkeit" : "Zeitlupe"} style={small}>🐢</IconButton>
        <IconButton onClick={onToggle} title={playing ? "Pause" : "Alles abspielen"} style={small}>{playing ? "❚❚" : "▶▶"}</IconButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mannschaftsperspektive                                              */
/* ------------------------------------------------------------------ */

/**
 * Perspektive wählen: ganzes Team, eine Position oder Zusammenspiel mehrerer.
 * side: "offense" | "defense"; sel: Array der gewählten IDs (1 = eine Position).
 */
export function PerspectivePicker({ C, side, onSide, sel, onSel, multi, onMulti, compact = false }) {
  const ids = C.ids.filter((id) => C.entity[id].team === side);
  const color = side === "offense" ? OFF_COLOR : DEF_COLOR;
  const all = sel.length === ids.length && ids.every((id) => sel.includes(id));
  const size = compact ? 44 : 50;
  const tap = (id) => {
    if (!multi) return onSel([id]);
    const next = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel.filter((x) => ids.includes(x)), id];
    onSel(next.length ? next : [id]);
  };
  const chip = (on) => ({
    minHeight: 44, minWidth: 44, padding: "0 10px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13,
    border: `1.5px solid ${on ? C_UI.white : C_UI.border}`, background: on ? color : "transparent", color: on ? "#16110C" : C_UI.text,
  });
  return (
    <div role="group" aria-label="Perspektive" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={() => onSel(ids)} aria-pressed={all} title={side === "offense" ? "Ganzes Team – Angriff" : "Ganzes Team – Verteidigung"} style={chip(all)}>Team</button>
      {ids.map((id) => {
        const on = !all && sel.includes(id);
        return (
          <button key={id} onClick={() => tap(id)} aria-pressed={on} title={`Ich bin ${C.entity[id].label}`}
            style={{
              width: size, height: size, borderRadius: 999, cursor: "pointer", padding: 0,
              border: `2px solid ${on ? C_UI.white : color}`, background: on ? color : "transparent",
              color: on ? "#16110C" : C_UI.text, fontFamily: "inherit", fontWeight: 800, fontSize: compact ? 15 : 17,
            }}>{C.entity[id].label}</button>
        );
      })}
      <button onClick={onMulti} aria-pressed={multi} title={multi ? "Zusammenspiel: mehrere Positionen wählen (an)" : "Zusammenspiel: mehrere Positionen wählen"}
        style={{ ...chip(false), borderStyle: multi ? "solid" : "dashed", color: multi ? C_UI.warn : C_UI.muted }}>＋</button>
      <button onClick={onSide} title={side === "offense" ? "Zur Verteidigung wechseln" : "Zum Angriff wechseln"}
        style={{ ...chip(false), color: C_UI.muted }}>{side === "offense" ? "Abwehr ⇄" : "Angriff ⇄"}</button>
    </div>
  );
}

/** Prinzipien des Beats: Titel als Chips, Regel + Warum zum Aufklappen */
export function PrincipleList({ principles }) {
  const [open, setOpen] = useState(null);
  if (!principles?.length) return null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <Label color={C_UI.open}>Prinzip{principles.length > 1 ? "ien" : ""}</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {principles.map((p) => (
          <button key={p.id} onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}
            style={{ minHeight: 36, padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, fontSize: 13,
              border: `1px solid ${open === p.id ? C_UI.open : "rgba(95,211,141,0.4)"}`, background: open === p.id ? "rgba(95,211,141,0.18)" : "transparent", color: "#CFF5DE" }}>
            {p.title}
          </button>
        ))}
      </div>
      {open && (() => {
        const p = principles.find((x) => x.id === open);
        return (
          <div style={{ fontSize: 14, lineHeight: 1.45, padding: "8px 10px", borderRadius: 10, background: "rgba(95,211,141,0.08)" }}>
            <div style={{ color: C_UI.text }}>{p.rule}</div>
            {p.why && <div style={{ color: C_UI.muted, marginTop: 4 }}><strong style={{ color: C_UI.open }}>Warum? </strong>{p.why}</div>}
          </div>
        );
      })()}
    </div>
  );
}

/** Eine Zeile pro Spielerin: Aufgabe jetzt + (Verteidigung) aktueller Zustand. Antippen = diese Position */
export function TeamCard({ C, rows, title, onPick }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {title && <Label>{title}</Label>}
      {rows.map((r) => {
        const color = C.entity[r.id].team === "offense" ? OFF_COLOR : DEF_COLOR;
        return (
          <button key={r.id} onClick={() => onPick?.(r.id)} title={`Nur ${C.entity[r.id].label} zeigen`}
            style={{ display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", padding: "8px 10px", borderRadius: 12, cursor: onPick ? "pointer" : "default",
              border: `1px solid ${C_UI.line}`, background: C_UI.card, color: C_UI.text, fontFamily: "inherit" }}>
            <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 15, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13,
              background: color, color: "#16110C" }}>{C.entity[r.id].label}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              {r.state && (
                <span style={{ display: "inline-block", marginBottom: 3, padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
                  background: r.stateColor, color: "#14181C" }}>{r.state}{r.resp ? ` · ${C.entity[r.resp]?.label ?? ""}` : ""}</span>
              )}
              <span style={{ display: "block", fontSize: 14, lineHeight: 1.35, fontWeight: 600 }}>{r.task}</span>
              {r.why && <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.35, color: C_UI.muted, marginTop: 2 }}>{r.why}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
