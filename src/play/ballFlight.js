/* Passarten und Ballhöhe im Flug (gemeinsam für Engine und Rendering).
 *   chest  – direkter Pass, flacher Bogen
 *   bounce – Bodenpass: setzt bei ~60 % des Weges auf, geht unter den Händen durch
 *   lob    – Überkopf/Lob: hoher Bogen über die Hände
 * Höhe z in Court-Einheiten (10 cm), Abwurf/Fang auf Hüft-/Brusthöhe. */

export const PASS_KINDS = {
  chest: { label: "Direkter Pass", short: "Direkt" },
  bounce: { label: "Bodenpass", short: "Boden" },
  lob: { label: "Überkopf / Lob", short: "Lob" },
};

export const HAND_Z = 3.5;
const BOUNCE_AT = 0.6;

/** Passart einer Pass-Aktion (lob: true bleibt als Kurzform gültig) */
export const passKind = (p) => p.kind ?? (p.lob ? "lob" : "chest");

/** Kommt diese Passart an Händen direkt an der Passgeberin vorbei? */
export const beatsHands = (kind) => kind === "lob" || kind === "bounce";

/** Ballhöhe bei Flugfortschritt s ∈ [0,1] über Distanz d */
export function flightHeight(kind, s, d) {
  if (kind === "bounce") {
    return s < BOUNCE_AT ? HAND_Z * (1 - s / BOUNCE_AT) : HAND_Z * ((s - BOUNCE_AT) / (1 - BOUNCE_AT)) * 0.9;
  }
  const arc = kind === "lob" ? 13 : Math.min(6, d * 0.06);
  return HAND_Z + arc * 4 * s * (1 - s);
}
