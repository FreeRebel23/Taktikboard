/* Registry der aktionsbasierten Plays + öffentliche Play-API */
import { pressBreak } from "./plays/pressBreak.js";
import { pickRoll } from "./plays/pickRoll.js";
import { compilePlay } from "./engine.js";
import { resolveVariant, allChoicePaths, validateTree } from "./variants.js";
import { validatePlay } from "./model.js";

export const PLAYS = [pressBreak, pickRoll];

export { compilePlay, sampleFrame, beatDiagram, beatBoundaries, beatIndexAt, passLanes } from "./engine.js";
export { validatePlay } from "./model.js";
export { resolveVariant, allChoicePaths, allDecisions, validateTree } from "./variants.js";

/** Kompiliert die gewählte Variante eines (verzweigten) Plays */
export const compileVariant = (play, choices) => compilePlay(resolveVariant(play, choices));

/** Prüft den ganzen Baum: Struktur + jede Variante einzeln (inkl. Pass-Konsistenz) */
export function validatePlayTree(play) {
  const errors = validateTree(play);
  const warnings = [];
  for (const choices of allChoicePaths(play)) {
    const lin = resolveVariant(play, choices);
    const tag = lin.variant.key ? ` [${lin.variant.key}]` : "";
    const v = validatePlay(lin);
    errors.push(...v.errors.map((e) => e + tag));
    if (!v.errors.length) {
      try { warnings.push(...compilePlay(lin).warnings.map((w) => w + tag)); }
      catch (e) { errors.push(e.message + tag); }
    }
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
