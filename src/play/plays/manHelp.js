/* Referenzfall Verteidigung: MANN-MANN – Help & Recover (Halbfeld)
 *
 * Die Verteidigung ist kein Ablauf einzelner Figuren, sondern ein System: Alle fünf
 * spielen "man" nach denselben Regeln (play.defense.rules). Ihre Positionen ergeben
 * sich in jedem Moment aus Ball, Gegenspielerin und Korb – deshalb bewegen sich bei
 * jedem Pass alle fünf. Help, Recover und Closeout entstehen aus den Regeln.
 * Einzige ausdrücklich gesetzte Bewegung: X2 wird im Drive geschlagen.
 *
 * Die Regeln und Prinzipien sind BEISPIELE. Trainerinnen ändern sie im Builder
 * (z. B. Lücke statt Deny, Low Man hilft, Rotation statt Recover).
 */

const man = (d, o) => ({ type: "man", player: d, target: o });
const ALL_MAN = [man("d1", "o1"), man("d2", "o2"), man("d3", "o3"), man("d4", "o4"), man("d5", "o5")];

export const manHelp = {
  id: "man_help_recover",
  name: "Mann-Mann – Help & Recover",
  category: "defense",
  court: "half",
  attack: "up",
  summary:
    "Mannschaftsverteidigung als System: Alle fünf stehen zwischen Ball, Gegenspielerin und Korb. Mit jedem Pass verschieben sich alle. Wird eine Verteidigerin geschlagen, hilft die Nächste und erholt sich danach (Recover) – mit Closeout, wenn der Ball zurückkommt.",

  defense: {
    system: "man",
    rules: {
      onBall: { distance: 6 },
      ballSide: { mode: "deny", adjacent: 62 },
      helpSide: { ratio: 0.45, drop: 9 },
      help: { enabled: true, who: "nearest", rotate: false },
    },
  },

  principles: [
    { id: "dreieck", title: "Ball – Gegenspielerin – Korb", rule: "Stehe so, dass du Ball und Gegenspielerin gleichzeitig siehst – immer näher am Korb als sie.", why: "Nur so kannst du helfen und trotzdem rechtzeitig zurück zu ihr." },
    { id: "druck", title: "Am Ball: Druck mit Abstand", rule: "Eine Armlänge Abstand, Korbseite, Hände aktiv. Weit vom Korb mehr Platz lassen.", why: "Zu nah = sie ist mit einem Schritt vorbei. Zu weit = freier Wurf." },
    { id: "passlaenge", title: "Eine Passlänge entfernt: Deny", rule: "Hand und Fuß in die Passlinie, Blick über die Schulter zum Ball.", why: "Wer den Ball nicht bekommt, kann nichts anfangen." },
    { id: "helpseite", title: "Help-Seite: absinken", rule: "Zwei Passlängen entfernt: weit Richtung Ball und Korb, ein Fuß in der Zone.", why: "Von hier stoppst du jeden Drive – und bist in zwei Schritten zurück." },
    { id: "mitdempass", title: "Mit dem Pass bewegen", rule: "Wenn der Ball fliegt, bewegen sich alle fünf – nicht erst, wenn er gefangen ist.", why: "Die Verteidigung muss stehen, bevor die Angreiferin den Ball sicher hat." },
    { id: "help", title: "Help", rule: "Wird eine Mitspielerin geschlagen, stoppt die Nächste den Drive vor dem Korb – mit beiden Füßen und ohne Foul.", why: "Ein Korbleger ist der leichteste Korb. Lieber einen schweren Pass erzwingen." },
    { id: "recover", title: "Recover & Closeout", rule: "Nach der Hilfe zurück zur eigenen Gegenspielerin: erst sprinten, die letzten Schritte kurz, Hand hoch.", why: "Wer zu schnell ankommt, wird überlaufen; wer zu spät kommt, gibt den Wurf frei." },
  ],

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
    ball: "o1",
    positions: {
      o1: { x: 75, y: 86 },
      o2: { x: 126, y: 60 },
      o3: { x: 24, y: 60 },
      o4: { x: 9, y: 13 },
      o5: { x: 55, y: 24 },
      d1: { x: 75, y: 76 },
      d2: { x: 118, y: 52 },
      d3: { x: 32, y: 52 },
      d4: { x: 20, y: 20 },
      d5: { x: 60, y: 22 },
    },
  },

  beats: [
    {
      id: "set",
      title: "Ball oben – alle finden ihre Position",
      text: "Jede Verteidigerin stellt sich nach denselben Regeln auf: X1 macht Druck am Ball. X2 und X3 sind eine Passlänge entfernt und stellen die Passlinie zu (Deny). X4 und X5 sind weit weg vom Ball und sinken auf die Help-Seite ab.",
      duration: 2200,
      principles: ["dreieck", "druck", "passlaenge", "helpseite"],
      roles: {
        d1: { task: "Druck auf 1: eine Armlänge, Korbseite, Hände aktiv.", watch: "o1", stance: "defense", why: "Je schwerer der Pass, desto mehr Zeit für deine Mitspielerinnen." },
        d2: { task: "Deny gegen 2: Hand und Fuß in die Passlinie.", watch: "ball", cue: "Ball und 2 gleichzeitig sehen.", stance: "deny", why: "2 ist nur einen Pass entfernt – sie soll den Ball nicht leicht bekommen." },
        d3: { task: "Deny gegen 3, genau wie X2 auf der anderen Seite.", watch: "ball", stance: "deny", why: "Gleiche Regel, andere Seite." },
        d4: { task: "Help-Seite: weit absinken, Ball und 4 im Blick.", watch: "ball", cue: "4 steht zwei Pässe weg.", why: "Aus der Zone kannst du jeden Drive stoppen." },
        d5: { task: "Help-Seite am Block: zwischen 5 und Ball, ein Fuß in der Zone.", watch: "ball", why: "Du bist die letzte Linie vor dem Korb." },
        o1: { task: "Ball oben halten, Verteidigung lesen.", watch: "ball" },
        o2: { task: "Am rechten Flügel anbieten." },
        o3: { task: "Am linken Flügel anbieten." },
        o4: { task: "In der linken Ecke breit stehen." },
        o5: { task: "Am linken Block positionieren." },
      },
      actions: [...ALL_MAN, { type: "hold", player: "o1", face: "upcourt" }],
    },
    {
      id: "swing",
      title: "Pass auf den Flügel – alle bewegen sich mit",
      text: "Der Ball geht zu 2. Schon während er fliegt, verschieben sich alle fünf: X2 läuft heran (Druck), X1 springt Richtung Ball und stellt den Rückpass zu, X3, X4 und X5 sind jetzt auf der Help-Seite und sinken tief.",
      duration: 1800,
      principles: ["mitdempass", "dreieck", "helpseite"],
      roles: {
        d2: { task: "Mit dem Pass heran: Druck auf 2, kurze Schritte am Ende.", watch: "o2", stance: "defense", why: "Kommt der Ball an, musst du schon stehen." },
        d1: { task: "Zum Ball springen und den Rückpass zu 1 zustellen.", watch: "ball", stance: "deny", why: "Jetzt bist du eine Passlänge entfernt." },
        d3: { task: "Von Deny zu Help-Seite: tief absinken Richtung Zone.", watch: "ball", cue: "Ball wechselt die Seite → du wechselst die Aufgabe.", why: "3 ist jetzt zwei Pässe weg." },
        d4: { task: "Noch tiefer auf der Help-Seite – Fuß in der Zone.", watch: "ball", why: "Du sicherst die Grundlinie." },
        d5: { task: "Zwischen 5 und Ball bleiben, bereit zur Hilfe.", watch: "ball", why: "Der Ball ist näher am Korb – du auch." },
        o1: { task: "Pass auf den rechten Flügel zu 2." },
        o2: { task: "Ball fangen, Blick zum Korb." },
        o3: { task: "Am Flügel bleiben." },
        o4: { task: "In der Ecke bleiben." },
        o5: { task: "Am Block bleiben." },
      },
      actions: [
        { type: "cut", player: "o2", via: [{ x: 118, y: 44 }], to: { x: 130, y: 62 }, end: 0.32 },
        { type: "pass", from: "o1", to: "o2", start: 0.28, end: 0.55, contested: true },
      ],
    },
    {
      id: "drive",
      title: "Drive zur Grundlinie – Help",
      text: "2 schlägt X2 an der Grundlinie. Jetzt greift die Help-Regel: Die nächste Verteidigerin auf der Help-Seite – hier X5 – stoppt den Drive vor dem Korb. Alle anderen bleiben zwischen Ball und Gegenspielerin.",
      duration: 1500,
      principles: ["help", "dreieck"],
      roles: {
        d2: { task: "Geschlagen: hinterher und von hinten Druck machen – nicht aufgeben.", watch: "o2", why: "Je schneller du wieder da bist, desto kürzer muss X5 helfen." },
        d5: { task: "Help: vor dem Korb in den Drive steigen, beide Füße am Boden.", watch: "o2", cue: "2 ist an X2 vorbei.", stance: "defense", why: "Ein Korbleger ist der leichteste Korb – zwinge 2 zum Pass." },
        d1: { task: "Zur Mitte absinken, Ball und 1 im Blick.", watch: "ball" },
        d3: { task: "Help-Seite halten, bereit für den Pass auf deine Seite.", watch: "ball" },
        d4: { task: "Tief bleiben, Grundlinie sichern.", watch: "ball" },
        o2: { task: "Drive an der Grundlinie Richtung Korb.", why: "Wenn X5 hilft, ist 5 frei." },
        o5: { task: "Am Block bereit machen – dein Moment kommt, wenn X5 hilft.", watch: "d5" },
        o1: { task: "Oben bleiben." },
        o3: { task: "Am Flügel bleiben." },
        o4: { task: "In der Ecke bleiben." },
      },
      actions: [
        { type: "dribble", player: "o2", via: [{ x: 124, y: 34 }], to: { x: 104, y: 16 }, end: 0.85 },
        { type: "sprint", player: "d2", via: [{ x: 124, y: 46 }], to: { x: 112, y: 25 }, end: 0.95 },
      ],
    },
    {
      id: "recover",
      title: "Pass zur Freien – Recover",
      text: "2 spielt einen Bodenpass zu 5, die X5 für die Hilfe verlassen hat. X5 erholt sich sofort (Recover) und läuft 5 kontrolliert an. X2 ist zurück bei 2 und nimmt die Mann-Mann-Regeln wieder auf.",
      duration: 1500,
      principles: ["recover", "mitdempass"],
      roles: {
        d5: { task: "Recover: zurück zu 5, die letzten Schritte kurz, Hand hoch.", watch: "o5", stance: "defense", why: "Du hast geholfen – jetzt ist deine Gegenspielerin frei." },
        d2: { task: "Zurück zu 2 und wieder nach den Regeln verteidigen.", watch: "ball" },
        d1: { task: "Tief in der Mitte helfen, Ball im Blick.", watch: "ball" },
        d3: { task: "Help-Seite: tief, bereit für den nächsten Pass.", watch: "ball" },
        d4: { task: "Die Ecke und die Grundlinie sichern.", watch: "ball" },
        o2: { task: "Bodenpass zu 5 unter den Händen von X5 durch." },
        o5: { task: "An der Grundlinie freilaufen und fangen." },
        o1: { task: "Oben bleiben." },
        o3: { task: "Hoch auf den Flügel absetzen – weg vom Ball, Platz schaffen." },
        o4: { task: "In der Ecke bleiben." },
      },
      actions: [
        man("d2", "o2"),
        { type: "move", player: "o5", to: { x: 50, y: 11 }, end: 0.35 },
        { type: "pass", from: "o2", to: "o5", kind: "bounce", start: 0.25, end: 0.72, contested: true },
        { type: "move", player: "o2", to: { x: 124, y: 24 }, start: 0.3, end: 0.85 },
        { type: "move", player: "o3", to: { x: 22, y: 80 }, start: 0.2, end: 0.8 },
      ],
    },
    {
      id: "reverse",
      title: "Ball raus – Closeout und alle neu ordnen",
      text: "5 spielt den Ball über Kopf zu 3 auf den Flügel. X3 war auf der Help-Seite tief abgesunken und kommt jetzt mit einem Closeout heraus. Die Help-Seite wird zur Ball-Seite: X4 und X5 stellen jetzt zu, X1 und X2 sinken auf die neue Help-Seite ab.",
      duration: 2000,
      principles: ["recover", "mitdempass", "passlaenge", "helpseite"],
      roles: {
        d3: { task: "Closeout auf 3: sprinten, dann kurze Schritte, Hand hoch gegen den Wurf.", watch: "o3", stance: "defense", why: "Du kommst von weit – nicht überlaufen lassen." },
        d4: { task: "Jetzt eine Passlänge entfernt: Deny gegen 4.", watch: "ball", stance: "deny" },
        d5: { task: "Ballseitig am Block: zwischen 5 und Ball.", watch: "ball", stance: "deny" },
        d1: { task: "Deny gegen 1 – oder absinken, je nach Abstand.", watch: "ball" },
        d2: { task: "Jetzt Help-Seite: weit absinken.", watch: "ball", why: "Der Ball ist auf der anderen Seite." },
        o5: { task: "Pass raus zu 3." },
        o3: { task: "Fangen, Blick zum Korb." },
        o2: { task: "In die rechte Ecke." },
        o1: { task: "Oben bleiben." },
        o4: { task: "In der Ecke bleiben." },
      },
      actions: [
        { type: "pass", from: "o5", to: "o3", kind: "lob", start: 0.08, end: 0.55, contested: true },
        { type: "move", player: "o2", to: { x: 139, y: 14 }, start: 0.1, end: 0.7 },
      ],
    },
  ],
};
