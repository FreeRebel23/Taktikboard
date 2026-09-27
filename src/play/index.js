/* Registry der aktionsbasierten Plays */
import { pressBreak } from "./plays/pressBreak.js";

export const PLAYS = [pressBreak];
export { compilePlay, sampleFrame, beatDiagram, beatBoundaries, beatIndexAt } from "./engine.js";
export { validatePlay } from "./model.js";
