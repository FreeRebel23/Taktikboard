/* Weitergabe ohne Server: Spielzug komprimiert im Link (#p=…) oder als Datei.
 *
 * Format: "1." + base64url(deflate-raw(JSON))  (Zahlen auf 0,1 gerundet)
 *         "0." + base64url(JSON)               (Fallback ohne CompressionStream)
 * Der Link enthält den kompletten Spielzug – keine Registrierung, kein Backend,
 * funktioniert offline, sobald die App geladen ist. */

const round = (_k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v);

const b64url = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (str) => {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
};

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

/** Kompakte JSON-Darstellung (ohne Laufzeitfelder) */
export const playToJson = (play) => JSON.stringify(play, round);

export async function encodePlay(play) {
  const bytes = new TextEncoder().encode(playToJson(play));
  if (typeof CompressionStream !== "undefined") {
    return "1." + b64url(await pipe(bytes, new CompressionStream("deflate-raw")));
  }
  return "0." + b64url(bytes);
}

export async function decodePlay(code) {
  const [ver, data] = [code.slice(0, 2), code.slice(2)];
  let bytes = fromB64url(data);
  if (ver === "1.") {
    if (typeof DecompressionStream === "undefined") throw new Error("Dieser Browser kann den Link nicht entpacken.");
    bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  } else if (ver !== "0.") throw new Error("Unbekanntes Link-Format.");
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Link auf die aktuelle App-Adresse */
export async function shareUrl(play, base = typeof location !== "undefined" ? location.origin + location.pathname : "") {
  return `${base}#p=${await encodePlay(play)}`;
}

/** Liest einen geteilten Spielzug aus dem Hash (oder null) */
export async function playFromHash(hash) {
  const m = /[#&]p=([^&]+)/.exec(hash ?? "");
  return m ? decodePlay(decodeURIComponent(m[1])) : null;
}

/** Plausibilitätsprüfung importierter Daten (Struktur), Details prüft validatePlayTree */
export function looksLikePlay(x) {
  return !!x && typeof x === "object" && typeof x.id === "string" && Array.isArray(x.entities) && Array.isArray(x.beats) && !!x.start?.positions;
}

export const fileNameFor = (play) =>
  `${(play.name || "spielzug").toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, "")}.taktik.json`;

/** Ist die aktuelle Adresse für andere Geräte erreichbar? Gibt einen Hinweis oder null zurück. */
export function publicAddressProblem(loc) {
  if (!loc) return null;
  const host = loc.hostname ?? "";
  if (loc.protocol === "file:") return "Die App läuft als lokale Datei – Links funktionieren nur auf diesem Gerät. Für die Mannschaft die Pilot-Adresse (https://…) verwenden.";
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host)) return "Die App läuft lokal (localhost) – dieser Link funktioniert nur auf diesem Gerät. Für die Mannschaft die Pilot-Adresse (https://…) verwenden.";
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return "Die App läuft in einem lokalen Netz – der Link funktioniert nur im selben WLAN und ohne Offline-Modus. Für die Mannschaft die Pilot-Adresse (https://…) verwenden.";
  if (loc.protocol !== "https:") return "Die App läuft ohne HTTPS – Installation und Offline-Nutzung funktionieren dann auf Handys nicht. Für die Mannschaft die Pilot-Adresse (https://…) verwenden.";
  return null;
}
