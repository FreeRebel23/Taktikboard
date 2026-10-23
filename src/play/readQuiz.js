/* Read-Training: Die Spielerin sieht nur die Reaktion der Verteidigung und entscheidet
 * dann selbst. Dafür wird der Variantenpfad bis einschließlich des ersten Beats der
 * (geheim gewählten) Option gekürzt; in diesem Beat bleibt der Angriff stehen und alle
 * Hinweise, die die Lösung verraten würden (Fokus-Beschriftungen, Passlinien, Texte),
 * werden entfernt. Bis zum Entscheidungszeitpunkt ist der Ablauf identisch mit dem
 * normalen Spielzug – der Übergang ist also nahtlos. */

import { resolveVariant } from "./variants.js";
import { compilePlay } from "./engine.js";

export function readQuizPlay(play, choices, decisionId, optionId) {
  const v = resolveVariant(play, { ...choices, [decisionId]: optionId });
  const d = v.variant.decisions.find((x) => x.decision.id === decisionId);
  if (!d) return null;
  const team = Object.fromEntries(play.entities.map((e) => [e.id, e.team]));
  const isDefense = (a) => (a.players ?? [a.player]).every((p) => team[p] === "defense");
  const reaction = v.beats[d.atBeat];
  const beats = [
    ...v.beats.slice(0, d.atBeat),
    {
      id: reaction.id, title: "Was macht die Verteidigung?", text: "", duration: reaction.duration,
      actions: reaction.actions.filter((a) => a.type !== "pass" && a.type !== "handoff" && (isDefense(a) || a.type === "hold")),
    },
  ];
  return {
    ...v,
    beats,
    variant: { key: `quiz:${v.variant.key}`, decisions: v.variant.decisions.filter((x) => x.atBeat <= d.atBeat) },
  };
}

/** Kompilierter Quiz-Ablauf + Startzeit der Reaktion */
export function compileReadQuiz(play, choices, decisionId, optionId) {
  const q = readQuizPlay(play, choices, decisionId, optionId);
  if (!q) return null;
  const C = compilePlay(q);
  const last = C.beats[C.beats.length - 1];
  return { C, t0: last.t0, t1: last.t1 };
}

/** Antworttext einer Option: Lösung, sonst die Beschreibung */
export const quizAnswer = (o) => o.answer || o.label;
