/* Varianten / Entscheidungen ("Wenn die Defense A macht → wir machen X")
 *
 * Ein Play ist ein Baum:
 *   play.beats      gemeinsamer Stamm
 *   play.decision   optional: Entscheidungspunkt am Ende des Stamms
 *     { id, title, question, watch: [ids], options: [{ id, label, read, beats, lines?, decision? }] }
 *
 * Für jede Auswahl (choices: { decisionId: optionId }) entsteht ein linearer Ablauf,
 * den die Engine unverändert abspielt. So ist jede Variante vom selben Ausgangszustand
 * aus reproduzierbar, und Scrubbing/Schritte funktionieren wie bisher.
 */

/** Pfad durch den Baum für gegebene Auswahl (fehlende Auswahl → erste Option) */
export function resolveVariant(play, choices = {}) {
  const beats = [...play.beats];
  const lines = [...(play.lines ?? [])];
  const decisions = [];
  let node = play;
  while (node.decision) {
    const d = node.decision;
    const chosenId = choices[d.id] ?? d.options[0].id;
    const option = d.options.find((o) => o.id === chosenId) ?? d.options[0];
    decisions.push({ decision: d, option, atBeat: beats.length });
    beats.push(...option.beats);
    lines.push(...(option.lines ?? []));
    node = option;
  }
  const { decision, ...rest } = play;
  return {
    ...rest,
    beats,
    lines,
    variant: { key: decisions.map((x) => `${x.decision.id}=${x.option.id}`).join("&"), decisions },
  };
}

/** Alle vollständigen Auswahlpfade (für Validierung und Tests) */
export function allChoicePaths(play) {
  const out = [];
  const walk = (node, choices) => {
    if (!node.decision) { out.push(choices); return; }
    for (const o of node.decision.options) walk(o, { ...choices, [node.decision.id]: o.id });
  };
  walk(play, {});
  return out;
}

/** Alle Entscheidungen im Baum (flach) */
export function allDecisions(play) {
  const out = [];
  const walk = (node) => {
    if (!node.decision) return;
    out.push(node.decision);
    node.decision.options.forEach(walk);
  };
  walk(play);
  return out;
}

/** Strukturprüfung des Baums: eindeutige IDs, mindestens zwei Optionen */
export function validateTree(play) {
  const errors = [];
  const beatIds = new Set();
  const decisionIds = new Set();
  const walk = (node, where) => {
    for (const b of node.beats ?? []) {
      if (b.id && beatIds.has(b.id)) errors.push(`${where}: Beat-ID "${b.id}" ist im Baum doppelt`);
      if (b.id) beatIds.add(b.id);
    }
    const d = node.decision;
    if (!d) return;
    if (decisionIds.has(d.id)) errors.push(`Entscheidung "${d.id}" doppelt`);
    decisionIds.add(d.id);
    if (!d.options?.length || d.options.length < 2) errors.push(`Entscheidung "${d.id}" braucht mindestens zwei Optionen`);
    const optIds = new Set();
    for (const o of d.options ?? []) {
      if (optIds.has(o.id)) errors.push(`Entscheidung "${d.id}": Option "${o.id}" doppelt`);
      optIds.add(o.id);
      if (!o.beats?.length) errors.push(`Entscheidung "${d.id}": Option "${o.id}" hat keine Beats`);
      walk(o, `Option "${o.id}"`);
    }
  };
  walk(play, "Stamm");
  return errors;
}
