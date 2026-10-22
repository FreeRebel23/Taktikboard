/* Referenzfall: FULL-COURT PRESS BREAK
 *
 * Offense greift den oberen Korb an (attack: "up"), Einwurf an der unteren Grundlinie.
 * Die Defense presst mit Deny auf die Anspielstationen und doppelt nach dem ersten Pass.
 * Lösung: kein Dribbling im Trap, zweite Reihe finden, Ball schnell nach vorne bewegen.
 *
 * Es gibt keine aufgezeichneten Koordinaten für die Defense-Rotation: Deny-, Guard-,
 * Help- und Trap-Positionen berechnet die Engine aus Gegenspielerin, Ball und Korb.
 */

export const pressBreak = {
  id: "press_break",
  name: "Press Break – Full Court",
  court: "full",
  attack: "up",
  summary:
    "Einwurf gegen Ganzfeldpresse: Der erste Pass wird gedoppelt. Kein Dribbling – die zweite Reihe finden und den Ball schnell über die erste Presslinie bewegen.",

  entities: [
    { id: "o1", team: "offense", label: "1" },
    { id: "o2", team: "offense", label: "2" },
    { id: "o3", team: "offense", label: "3" },
    { id: "o4", team: "offense", label: "4" },
    { id: "o5", team: "offense", label: "5" },
    { id: "d1", team: "defense", label: "X1" },
    { id: "d2", team: "defense", label: "X2" },
    { id: "d3", team: "defense", label: "X3" },
    { id: "d4", team: "defense", label: "X4" },
    { id: "d5", team: "defense", label: "X5" },
  ],

  start: {
    ball: "o4",
    positions: {
      o4: { x: 104, y: 285 },   // Einwerferin hinter der Grundlinie
      o1: { x: 100, y: 236 },   // Anspielstation ballseitig
      o2: { x: 132, y: 196 },   // Up-the-line, rechte Seitenlinie
      o5: { x: 40, y: 190 },    // zweite Reihe, Weakside
      o3: { x: 36, y: 112 },    // tief, hinter der Mittellinie
      d4: { x: 103, y: 277 },   // verteidigt den Einwurf
      d1: { x: 100.5, y: 242.5 }, // Deny auf 1
      d2: { x: 129.2, y: 202.2 }, // Deny auf 2
      d3: { x: 74, y: 206 },    // Mitte
      d5: { x: 70, y: 118 },    // Safety
    },
  },

  beats: [
    {
      id: "inbound",
      title: "Einwurf",
      text: "4 wirft ein. 1 löst sich mit einem V-Cut von X1 und bekommt den Ball an der rechten Seite. X4 verteidigt den Einwurf mit hohen Armen – 4 spielt über Kopf.",
      duration: 2200,
      roles: {
        o4: { task: "Einwerfen, sobald 1 frei ist. Über Kopf passen – X4 hat die Arme oben.", watch: "o1", cue: "1 kommt nach dem V-Cut aus der Bewegung zurück.", why: "Ein Pass über Kopf geht über die Arme von X4 hinweg." },
        o1: { task: "V-Cut: erst 2 Schritte weg vom Ball, dann explosiv zur Seitenlinie zurück und Ball fordern.", cue: "Wenn X1 deinen ersten Schritt mitgeht, drehst du ab.", watch: "d1", stance: "open", why: "Der Richtungswechsel verschafft dir den halben Meter, den der Einwurf braucht." },
        o2: { task: "Hoch an der rechten Seitenlinie bleiben.", why: "Du ziehst X2 nach oben und hältst die Seitenlinie frei." },
        o5: { task: "In der zweiten Reihe auf der linken Seite stehen bleiben und den Ball beobachten.", watch: "ball", why: "Du bist die Anspielstation, wenn die Presse die erste Reihe doppelt." },
        o3: { task: "Tief stehen bleiben – Sicherheit nach vorne.", why: "Du hältst die Safety X5 weit hinten." },
        d4: { task: "Einwerferin verteidigen, Arme hoch.", why: "Der Einwurf soll nur über Kopf möglich sein." },
        d1: { task: "Die 1 denyen und den ersten Pass erschweren." },
      },
      actions: [
        { type: "cut", player: "o1", via: [{ x: 94, y: 222 }], to: { x: 122, y: 244 }, end: 0.5 },
        // X1 geht mit dem ersten Schritt des V-Cuts mit, bleibt beim Richtungswechsel hängen
        { type: "deny", player: "d1", target: "o1", end: 0.3 },
        { type: "hold", player: "d1", start: 0.3, end: 0.55 },
        { type: "guard", player: "d1", target: "o1", start: 0.55, distance: 7.5, profile: "sprint" },
        { type: "guard", player: "d4", target: "o4", distance: 8 },
        { type: "pass", from: "o4", to: "o1", start: 0.5, end: 0.86, lob: true }, // Überkopf über die Arme von X4
        { type: "deny", player: "d2", target: "o2" },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o5" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d3" },
        { type: "hold", player: "d5" },
      ],
    },
    {
      id: "catch",
      title: "Ballannahme",
      text: "1 fängt, dreht sofort auf und schaut nach vorne – nicht automatisch ins Dribbling. 4 kommt ins Feld und bleibt als Anspielstation hinter dem Ball.",
      duration: 1600,
      focus: [{ type: "callout", player: "o1", text: "Aufdrehen · Blick nach vorne", tone: "info" }],
      roles: {
        o1: { task: "Ball fangen, sofort aufdrehen, Blick nach vorne. Nicht automatisch dribbeln.", cue: "Ball in der Hand → zuerst nach vorne schauen.", watch: "o5", stance: "triple", why: "Wer sofort dribbelt, läuft genau in das Doppeln hinein." },
        o4: { task: "Ins Feld treten und hinter dem Ball anspielbar bleiben.", watch: "ball", why: "Der Rückpass ist die sicherste Notlösung." },
        o5: { task: "Bereit bleiben – beobachte X3.", watch: "d3", cue: "Wohin geht X3, wenn X4 zum Doppeln kommt?", why: "Davon hängt ab, welche Lösung offen ist." },
        o2: { task: "Hoch bleiben, Seitenlinie halten." },
        o3: { task: "Tief bleiben." },
      },
      actions: [
        { type: "hold", player: "o1", face: "upcourt" },
        { type: "guard", player: "d1", target: "o1", distance: 7.5 },
        { type: "move", player: "o4", to: { x: 92, y: 268 }, end: 0.8 },
        { type: "guard", player: "d4", target: "o4", distance: 9 },
        { type: "deny", player: "d2", target: "o2" },
        { type: "hold", player: "o2" },
        { type: "hold", player: "o5" },
        { type: "hold", player: "o3" },
        { type: "hold", player: "d3" },
        { type: "hold", player: "d5" },
      ],
    },
  ],

  // Read nach der Ballannahme: Wie reagiert X3 auf das Doppeln?
  decision: {
    id: "x3",
    title: "Read: Was macht X3?",
    question: "X4 kommt zum Doppeln. Wohin geht X3?",
    watch: ["d3"],
    options: [
      {
        id: "x3_zu",
        label: "X3 stellt den Rückpass zu",
        read: "X3 läuft zur 4 → die Mitte ist leer.",
        answer: "Lob über den Trap zur 5 in die Mitte.",
        lines: [
          { id: "press1", label: "1. PRESSLINIE", members: ["d1", "d4"], anchorBeat: "trap", fromBeat: "trap" },
        ],
        beats: [
          {
            id: "trap",
            title: "Trap",
            text: "X4 verlässt die Einwerferin und doppelt mit X1 an der Seitenlinie. Jetzt kein Dribbling: Ball hoch schützen, pivotieren, Kopf oben. X3 nimmt den Rückpass zu 4 weg – dadurch ist die Mitte leer und 5 frei.",
            duration: 1900,
            showLanes: true,
            focus: [
              { type: "callout", player: "o1", text: "KEIN DRIBBLING", tone: "warn", from: 0.35 },
              { type: "open", player: "o5", label: "FREI", from: 0.6 },
            ],
            roles: {
              o1: { task: "Im Trap: Ball hoch schützen, pivotieren, Kopf oben. Kein Dribbling.", watch: "o5", cue: "Die Mitte wird frei, sobald X3 zur 4 läuft.", stance: "protect", why: "Zwei Verteidigerinnen an dir heißt: eine Mitspielerin ist frei." },
              o5: { task: "Bereit machen zum Schneiden in die Mitte.", watch: "d3", cue: "X3 läuft zur 4 → die Mitte ist leer.", why: "Der Raum hinter dem Trap ist der freie Passraum." },
              o4: { task: "Hinter dem Ball bleiben – X3 stellt dich zu.", why: "Du ziehst X3 aus der Mitte." },
              o2: { task: "Hoch an der Seitenlinie bleiben." },
              o3: { task: "Tief bleiben." },
              d1: { task: "Trap mit X4: Weg nach vorne zustellen." },
              d4: { task: "Einwerferin verlassen und mit X1 doppeln – Mitte zustellen." },
              d3: { task: "Den Rückpass zur 4 zustellen." },
            },
            actions: [
              { type: "trap", players: ["d1", "d4"], target: "o1", end: 0.7 },
              { type: "deny", player: "d3", target: "o4", start: 0.1, end: 0.8, profile: "sprint" },
              { type: "deny", player: "d2", target: "o2" },
              { type: "hold", player: "o1", face: "upcourt" },
              { type: "hold", player: "o4" },
              { type: "hold", player: "o2" },
              { type: "hold", player: "o5" },
              { type: "hold", player: "o3" },
              { type: "hold", player: "d5" },
            ],
          },
          {
            id: "second_row",
            title: "Zweite Reihe",
            text: "5 erkennt, dass die Mitte leer ist, und schneidet in den freien Passraum hinter dem Trap – zwischen erster Presslinie und Safety X5.",
            duration: 1600,
            showLanes: true,
            focus: [
              { type: "callout", player: "o1", text: "KEIN DRIBBLING", tone: "warn" },
              { type: "open", player: "o5", label: "FREI" },
            ],
            roles: {
              o5: { task: "Cut in die Mitte, in den Raum hinter dem Trap. Hände zeigen.", cue: "Die Mitte ist leer.", watch: "o1", stance: "open", why: "Zwischen erster Presslinie und Safety ist niemand." },
              o1: { task: "Ball schützen, Blick zur 5 – Pass über die Hände vorbereiten.", watch: "o5", stance: "protect" },
              o4: { task: "Bleiben – Rückpass bleibt die Notlösung." },
              o2: { task: "Hoch bleiben." },
              o3: { task: "Tief bleiben." },
            },
            actions: [
              { type: "cut", player: "o5", via: [{ x: 50, y: 198 }], to: { x: 74, y: 212 }, end: 0.75 },
              { type: "trap", players: ["d1", "d4"], target: "o1" },
              { type: "deny", player: "d3", target: "o4" },
              { type: "deny", player: "d2", target: "o2" },
              { type: "hold", player: "o1", face: "o5" },
              { type: "hold", player: "o4" },
              { type: "hold", player: "o2" },
              { type: "hold", player: "o3" },
              { type: "hold", player: "d5" },
            ],
          },
          {
            id: "outlet",
            title: "Pass aus dem Trap",
            text: "1 passt über die Hände der Trapperinnen zu 5. Mit einem Pass stehen zwei Verteidigerinnen hinter dem Ball. X2 sinkt ab, um die Mitte zu schließen, und verlässt dafür 2.",
            duration: 1700,
            focus: [{ type: "open", player: "o5", label: "FREI", to: 0.5 }],
            roles: {
              o1: { task: "Pass über die Hände der Trapperinnen zur 5.", watch: "o5", why: "Ein Pass bringt zwei Verteidigerinnen hinter den Ball." },
              o5: { task: "Ball mit beiden Händen fangen, Füße landen, aufdrehen.", watch: "ball", stance: "open", why: "Erst stabil fangen, dann nach vorne schauen." },
              o2: { task: "Beobachte X2: Sinkt sie zur Mitte, löse dich an der Seitenlinie.", watch: "d2", cue: "X2 verlässt dich, um die 5 zu stoppen." },
              o4: { task: "Bleiben." },
              o3: { task: "Tief bleiben." },
            },
            actions: [
              { type: "pass", from: "o1", to: "o5", start: 0.08, end: 0.5, lob: true },
              { type: "trap", players: ["d1", "d4"], target: "o1", end: 0.3 },
              { type: "hold", player: "d1", start: 0.3 },
              { type: "hold", player: "d4", start: 0.3 },
              { type: "hold", player: "o1" },
              { type: "hold", player: "o5" },
              { type: "sprint", player: "d3", to: { x: 86, y: 236 }, start: 0.35 },
              { type: "help", player: "d2", target: "o5", start: 0.3, ratio: 0, drop: 13 },
              { type: "hold", player: "o2" },
              { type: "hold", player: "o4" },
              { type: "hold", player: "o3" },
              { type: "hold", player: "d5" },
            ],
          },
          {
            id: "break_line",
            title: "Presslinie überwunden",
            text: "5 dreht auf und spielt sofort nach vorne zu 2, die sich an der Seitenlinie gelöst hat. Drei Pässe, kein Dribbling – die Presse ist geschlagen, die Offense läuft mit Überzahl nach vorne.",
            duration: 2600,
            focus: [{ type: "open", player: "o2", label: "FREI", from: 0.05, to: 0.55 }],
            roles: {
              o5: { task: "Aufdrehen und sofort nach vorne zur 2 passen, dann mitlaufen.", watch: "o2", cue: "2 ist an der Seitenlinie frei.", why: "Ein Pass nach vorne ist schneller als jedes Dribbling." },
              o2: { task: "Nach vorne sprinten, Ball an der Seitenlinie fordern.", stance: "open", why: "Der Ball ist hinter der Presse – jetzt Überzahl ausnutzen." },
              o1: { task: "Nach dem Pass sofort nach vorne mitlaufen (Lane füllen)." },
              o3: { task: "Zum Korb sprinten.", why: "Die Safety muss sich entscheiden." },
              o4: { task: "Als Trailer folgen." },
            },
            actions: [
              { type: "hold", player: "o5", face: "upcourt", end: 0.35 },
              { type: "pass", from: "o5", to: "o2", start: 0.32, end: 0.6 },
              { type: "sprint", player: "o5", to: { x: 76, y: 176 }, start: 0.62 },
              { type: "sprint", player: "o2", via: [{ x: 136, y: 170 }], to: { x: 132, y: 142 }, end: 0.62 },
              { type: "sprint", player: "o3", to: { x: 30, y: 72 }, start: 0.3 },
              { type: "sprint", player: "o1", via: [{ x: 118, y: 222 }], to: { x: 108, y: 188 }, start: 0.2 },
              { type: "move", player: "o4", to: { x: 82, y: 236 }, start: 0.2 },
              { type: "sprint", player: "d1", to: { x: 102, y: 202 }, start: 0.1 },
              { type: "sprint", player: "d4", to: { x: 84, y: 220 }, start: 0.15 },
              { type: "sprint", player: "d3", to: { x: 90, y: 204 }, start: 0.1 },
              { type: "guard", player: "d2", target: "o2", start: 0.25, distance: 9, profile: "sprint" },
              { type: "hold", player: "d5" },
            ],
          },
        ],
      },
      {
        id: "x3_mitte",
        label: "X3 bleibt in der Mitte",
        read: "X3 bleibt bei der 5 → hinter dem Ball ist die 4 frei.",
        answer: "Rückpass zur 4, Lücke angreifen, Pass zur 5.",
        lines: [
          { id: "press1_b", label: "1. PRESSLINIE", members: ["d1", "d4"], anchorBeat: "trap_b", fromBeat: "trap_b" },
        ],
        beats: [
          {
            id: "trap_b",
            title: "Trap – X3 bleibt Mitte",
            text: "X4 doppelt mit X1 an der Seitenlinie. X3 bleibt in der Mitte und schützt die 5. Dadurch ist niemand bei der 4: Der Rückpass hinter den Ball ist frei.",
            duration: 1900,
            showLanes: true,
            focus: [
              { type: "callout", player: "o1", text: "KEIN DRIBBLING", tone: "warn", from: 0.35 },
              { type: "open", player: "o4", label: "FREI", from: 0.7 },
            ],
            roles: {
              o1: { task: "Im Trap: Ball hoch schützen, pivotieren, Rückpass zur 4 suchen.", watch: "d3", cue: "X3 bleibt in der Mitte → die Mitte ist zu, hinter dir ist die 4 frei.", stance: "protect", why: "Wenn die Mitte zu ist, ist der Rückpass offen." },
              o4: { task: "Hinter den Ball laufen – direkt hinter 1, Hände zeigen.", watch: "o1", cue: "Niemand verteidigt dich, weil X4 doppelt.", stance: "open", why: "Der Rückpass geht am Trap vorbei nach hinten." },
              o5: { task: "Bleib in der zweiten Reihe – X3 steht bei dir.", watch: "d3", cue: "X3 bleibt in der Mitte." },
              o2: { task: "Hoch an der Seitenlinie bleiben." },
              o3: { task: "Tief bleiben." },
              d3: { task: "In der Mitte bleiben und die 5 schützen." },
            },
            actions: [
              { type: "trap", players: ["d1", "d4"], target: "o1", end: 0.7 },
              { type: "move", player: "o4", to: { x: 118, y: 270 }, start: 0.15, end: 0.8 },
              { type: "hold", player: "d3" },
              { type: "deny", player: "d2", target: "o2" },
              { type: "hold", player: "o1", face: "upcourt" },
              { type: "hold", player: "o2" },
              { type: "hold", player: "o5" },
              { type: "hold", player: "o3" },
              { type: "hold", player: "d5" },
            ],
          },
          {
            id: "reversal",
            title: "Rückpass",
            text: "1 spielt den Rückpass zur 4. Der Trap ist damit geschlagen: X1 und X4 stehen auf der falschen Seite.",
            duration: 1500,
            roles: {
              o1: { task: "Rückpass zur 4, danach an der Seitenlinie nach vorne lösen.", watch: "o4" },
              o4: { task: "Ball fangen und sofort nach vorne schauen.", stance: "triple", watch: "d3", cue: "Wo ist X3?", why: "Jetzt entscheidet sich, ob die Mitte offen ist." },
              o5: { task: "Flach machen: auf Höhe des Balls zur linken Seitenlinie.", cue: "Ball bei 4 → Passwinkel neben X3 öffnen.", why: "So kommt der Pass seitlich an X3 vorbei." },
            },
            actions: [
              { type: "pass", from: "o1", to: "o4", start: 0.1, end: 0.45 },
              { type: "trap", players: ["d1", "d4"], target: "o1", end: 0.15 },
              { type: "hold", player: "d1", start: 0.15 },
              { type: "guard", player: "d4", target: "o4", start: 0.5, distance: 11, profile: "sprint" },
              { type: "hold", player: "o1" },
              { type: "hold", player: "o4" },
              { type: "move", player: "o5", to: { x: 34, y: 218 }, start: 0.35 },
              { type: "hold", player: "d3" },
              { type: "deny", player: "d2", target: "o2" },
              { type: "hold", player: "o2" },
              { type: "hold", player: "o3" },
              { type: "hold", player: "d5" },
            ],
          },
          {
            id: "attack_gap",
            title: "Lücke angreifen",
            text: "4 dribbelt in die Lücke zwischen Trap und Mitte. Jetzt ist Dribbling richtig, weil vor ihr Raum ist. X3 muss den Ball stoppen – und verlässt dafür die 5.",
            duration: 1800,
            focus: [{ type: "open", player: "o5", label: "FREI", from: 0.65 }],
            roles: {
              o4: { task: "Dribbling in die freie Lücke, Kopf oben.", watch: "d3", cue: "Wenn X3 auf dich zukommt, ist die 5 frei.", why: "Vor dir ist Raum – hier hilft das Dribbling." },
              o5: { task: "Flach bleiben, Hände zeigen.", watch: "d3", cue: "X3 läuft zur 4.", stance: "open" },
              o1: { task: "An der Seitenlinie nach vorne lösen." },
              d3: { task: "Den Ball stoppen." },
            },
            actions: [
              { type: "dribble", player: "o4", via: [{ x: 104, y: 252 }], to: { x: 84, y: 226 }, end: 0.85 },
              { type: "guard", player: "d3", target: "o4", start: 0.3, distance: 10 },
              { type: "sprint", player: "d4", to: { x: 100, y: 250 }, start: 0.1 },
              { type: "move", player: "o1", to: { x: 128, y: 216 }, start: 0.2 },
              { type: "sprint", player: "d1", to: { x: 118, y: 222 }, start: 0.3 },
              { type: "hold", player: "o5" },
              { type: "deny", player: "d2", target: "o2" },
              { type: "hold", player: "o2" },
              { type: "hold", player: "o3" },
              { type: "hold", player: "d5" },
            ],
          },
          {
            id: "hit_open",
            title: "Pass zur freien 5",
            text: "4 passt an X3 vorbei zur 5. Die 5 dreht auf und läuft an der linken Seite nach vorne – die Presse ist geschlagen.",
            duration: 2200,
            roles: {
              o4: { task: "Pass seitlich an X3 vorbei zur 5, dann nachlaufen.", watch: "o5" },
              o5: { task: "Fangen, aufdrehen, an der linken Seite nach vorne.", stance: "open", why: "Die Presse steht hinter dem Ball." },
              o3: { task: "Zum Korb sprinten." },
            },
            actions: [
              { type: "pass", from: "o4", to: "o5", start: 0.08, end: 0.42 },
              { type: "sprint", player: "o5", to: { x: 30, y: 160 }, start: 0.5 },
              { type: "move", player: "o4", to: { x: 76, y: 200 }, start: 0.45 },
              { type: "sprint", player: "o3", to: { x: 40, y: 70 }, start: 0.3 },
              { type: "sprint", player: "o1", via: [{ x: 116, y: 206 }], to: { x: 106, y: 182 }, start: 0.1 },
              { type: "sprint", player: "d3", to: { x: 56, y: 196 }, start: 0.35 },
              { type: "guard", player: "d5", target: "o5", start: 0.45, distance: 14 },
              { type: "sprint", player: "d4", to: { x: 86, y: 222 }, start: 0.1 },
              { type: "sprint", player: "d1", to: { x: 108, y: 200 }, start: 0.1 },
              { type: "deny", player: "d2", target: "o2" },
              { type: "hold", player: "o2" },
            ],
          },
        ],
      },
    ],
  },
};
