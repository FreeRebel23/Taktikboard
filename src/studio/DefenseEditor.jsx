/* Builder: Mannschaftsverteidigung und Prinzipien – ohne Code.
 * Die Trainerin legt fest, nach welchen Regeln ihre Verteidigung spielt und welche
 * Prinzipien sie vermittelt. Es gibt keine eingebaute "richtige" Philosophie: alle
 * Werte sind Voreinstellungen, die hier überschrieben werden. */

import { C_UI, IconButton, Label } from "./studioUi.jsx";
import { RULE_FIELDS, DEFAULT_RULES, ZONE_TEMPLATES, getRule, rulesFor } from "../play/teamDefense.js";

const box = { display: "grid", gap: 8, padding: 10, borderRadius: 10, border: `1px solid ${C_UI.border}` };
const input = {
  width: "100%", boxSizing: "border-box", padding: "7px 9px", borderRadius: 8, fontSize: 14, fontFamily: "inherit",
  color: C_UI.text, background: "#0F1317", border: `1px solid ${C_UI.border}`, outline: "none",
};

/** Welches System nutzt der Spielzug? (Angabe oder aus den Aktionen) */
export function systemOf(play) {
  if (play.defense?.system) return play.defense.system;
  const walk = (n) => n.beats?.some((b) => b.actions.some((a) => a.type === "zone")) || n.decision?.options.some(walk);
  return walk(play) ? "zone" : "man";
}

const toDisplay = (f, v) => (f.unit === "m" ? v / 10 : f.unit === "%" ? Math.round(v * 100) : v);
const fromDisplay = (f, v) => (f.unit === "m" ? v * 10 : f.unit === "%" ? v / 100 : v);
const fmt = (f, v) => `${String(+toDisplay(f, v).toFixed(f.unit === "s" ? 2 : 1)).replace(".", ",")} ${f.unit === "%" ? "%" : f.unit}`;

/** Regeln der Mannschaftsverteidigung */
export function RuleEditor({ play, onChange, onEndMerge }) {
  const system = systemOf(play);
  const rules = rulesFor(play, null);
  const fields = RULE_FIELDS.filter((f) => f.systems.includes(system));
  return (
    <div style={box}>
      <Label color={C_UI.def}>Regeln der Verteidigung ({system === "zone" ? "Zone" : "Mann-Mann"})</Label>
      <div style={{ fontSize: 13, color: C_UI.muted, lineHeight: 1.4 }}>
        Deine Regeln bestimmen, wie sich alle fünf bewegen. Ändere einen Wert und spiele den Beat ab – die ganze Mannschaft reagiert neu.
      </div>
      {fields.map((f) => {
        const v = getRule(rules, f.path);
        const changed = JSON.stringify(v) !== JSON.stringify(getRule(DEFAULT_RULES, f.path));
        return (
          <label key={f.path} style={{ display: "grid", gap: 3 }}>
            <span style={{ display: "flex", gap: 6, fontSize: 13.5, fontWeight: 700 }}>
              <span style={{ flex: 1 }}>{f.label}</span>
              {f.unit && <span style={{ fontVariantNumeric: "tabular-nums", color: changed ? C_UI.warn : C_UI.muted }}>{fmt(f, v)}</span>}
            </span>
            {f.options ? (
              <select aria-label={f.label} style={input} value={String(v)} onChange={(e) => {
                const raw = e.target.value;
                onChange(f.path, raw === "true" ? true : raw === "false" ? false : raw);
              }}>
                {Object.entries(f.options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            ) : (
              <input aria-label={f.label} type="range" min={f.min} max={f.max} step={f.step} value={toDisplay(f, v)}
                onChange={(e) => onChange(f.path, fromDisplay(f, +e.target.value), { merge: true })} onPointerUp={onEndMerge} />
            )}
            {f.hint && <span style={{ fontSize: 12, color: C_UI.dim, lineHeight: 1.35 }}>{f.hint}</span>}
          </label>
        );
      })}
    </div>
  );
}

/** Ganze Verteidigung eines Beats auf ein System setzen */
export function TeamDefenseButtons({ onSet, current }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <Label color={C_UI.def}>Teamverteidigung für alle fünf</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <IconButton active={current === "man"} onClick={() => onSet("man")} title="Alle fünf spielen Mann-Mann nach deinen Regeln">Mann-Mann</IconButton>
        {Object.entries(ZONE_TEMPLATES).map(([k, t]) => (
          <IconButton key={k} active={current === `zone:${k}`} onClick={() => onSet("zone", k)} title={`Alle fünf spielen ${t.label}`}>{t.label}</IconButton>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: C_UI.dim, lineHeight: 1.35 }}>
        Zuordnung nach Nähe. Gilt ab diesem Beat, bis du einer Verteidigerin eine andere Aktion gibst. Regeln unter „Aufstellung“.
      </div>
    </div>
  );
}

/** Prinzipien des Spielzugs: Titel, Regel, Warum */
export function PrincipleEditor({ play, onAdd, onPatch, onRemove, onEndMerge }) {
  const list = play.principles ?? [];
  return (
    <div style={box}>
      <Label color={C_UI.open}>Prinzipien</Label>
      <div style={{ fontSize: 13, color: C_UI.muted, lineHeight: 1.4 }}>
        Was sollen deine Spielerinnen verstehen – nicht nur auswendig laufen? Jedes Prinzip kannst du in den Beats zuordnen, in denen es sichtbar wird.
      </div>
      {list.map((p) => (
        <div key={p.id} style={{ display: "grid", gap: 4, padding: 8, borderRadius: 8, background: C_UI.card }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input aria-label="Titel des Prinzips" style={{ ...input, fontWeight: 700 }} value={p.title} onChange={(e) => onPatch(p.id, { title: e.target.value })} onBlur={onEndMerge} />
            <IconButton onClick={() => onRemove(p.id)} title={`Prinzip „${p.title}“ löschen`} style={{ minWidth: 40, color: "#FFB4A8" }}>✕</IconButton>
          </div>
          <textarea aria-label="Regel" placeholder="Regel: Was tust du?" style={{ ...input, height: 46, resize: "vertical" }} value={p.rule ?? ""} onChange={(e) => onPatch(p.id, { rule: e.target.value })} onBlur={onEndMerge} />
          <textarea aria-label="Warum" placeholder="Warum?" style={{ ...input, height: 40, resize: "vertical" }} value={p.why ?? ""} onChange={(e) => onPatch(p.id, { why: e.target.value })} onBlur={onEndMerge} />
        </div>
      ))}
      <IconButton onClick={onAdd} title="Prinzip hinzufügen">+ Prinzip</IconButton>
    </div>
  );
}

/** Prinzipien einem Beat zuordnen */
export function BeatPrinciples({ play, beat, onToggle }) {
  const list = play.principles ?? [];
  if (!list.length) return null;
  const on = new Set(beat.principles ?? []);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <Label color={C_UI.open}>Prinzipien in diesem Beat</Label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {list.map((p) => (
          <button key={p.id} onClick={() => onToggle(p.id)} aria-pressed={on.has(p.id)}
            style={{ minHeight: 36, padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
              border: `1px solid ${on.has(p.id) ? C_UI.open : C_UI.border}`, background: on.has(p.id) ? "rgba(95,211,141,0.2)" : "transparent", color: on.has(p.id) ? "#CFF5DE" : C_UI.muted }}>
            {on.has(p.id) ? "✓ " : ""}{p.title}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Raum wählen für die Aktion "Zone" einer einzelnen Verteidigerin */
export function ZonePicker({ play, onPick, onTemplate }) {
  const zones = play.defense?.zones;
  if (!zones) {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 13.5, color: C_UI.muted }}>Erst eine Zonenform wählen:</span>
        {Object.entries(ZONE_TEMPLATES).map(([k, t]) => <IconButton key={k} onClick={() => onTemplate(k)}>{t.label}</IconButton>)}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 13.5, color: C_UI.muted }}>Welcher Raum?</span>
      {Object.entries(zones).map(([k, z]) => <IconButton key={k} onClick={() => onPick(k)}>{z.label}</IconButton>)}
    </div>
  );
}
