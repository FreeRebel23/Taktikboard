/* Referenzfall Verteidigung: 2-3-ZONE – Verschieben, Übergabe, Closeout (Halbfeld)
 *
 * Jede Verteidigerin verantwortet einen Raum (play.defense.zones, von der Trainerin
 * festgelegt). Wer den Raum der Ballführerin hat, macht Druck; Angreiferinnen in
 * einem Raum werden gedeckt; wechselt eine Angreiferin den Raum, wird sie übergeben.
 * Ohne Angreiferin verschiebt sich die Verteidigerin mit dem Ball (zone.shiftX/Y).
 *
 * Räume, Verschieben und Prinzipien sind BEISPIELE. Trainerinnen passen sie an.
 */

import { ZONE_TEMPLATES } from "../teamDefense.js";

const zone = (d, z) => ({ type: "zone", player: d, zone: z });

export const zone23 = {
  id: "zone_2_3",
  name: "2-3-Zone – Verschieben und Übergeben",
  category: "defense",
  court: "half",
  attack: "up",
  summary:
    "Jede Verteidigerin hat einen Raum. Mit jedem Pass verschiebt sich die ganze Zone, wer den Ball in ihrem Raum hat, macht Druck (Closeout), Angreiferinnen, die den Raum wechseln, werden übergeben.",

  defense: {
    system: "zone",
    template: "2-3",
    zones: structuredClone(ZONE_TEMPLATES["2-3"].zones),
    rules: {
      onBall: { distance: 6 },
      zone: { shiftX: 0.35, shiftY: 0.25, offBallRatio: 0.3, drop: 4 },
    },
  },

  principles: [
    { id: "raum", title: "Jede hat ihren Raum", rule: "Du verantwortest einen Raum, nicht eine Gegenspielerin. Wer in deinen Raum kommt, gehört dir.", why: "So bleibt die Zone geschlossen, egal wie die Offense läuft." },
    { id: "ball", title: "Ball zuerst", rule: "Ist der Ball in deinem Raum, machst du Druck – alle anderen helfen dir.", why: "Druck am Ball macht jeden Pass schwerer." },
    { id: "verschieben", title: "Mit dem Pass verschieben", rule: "Bewege dich, während der Ball fliegt. Die ganze Zone wandert zur Ballseite.", why: "Eine Zone, die erst beim Fang reagiert, ist immer zu spät." },
    { id: "uebergabe", title: "Übergeben und ansagen", rule: "Verlässt eine Angreiferin deinen Raum, begleite sie bis zur Grenze, sag sie laut an („Deine!“) und übergib sie.", why: "Ohne Ansage stehen zwei bei einer – und eine ist frei." },
    { id: "closeout", title: "Closeout", rule: "Sprint heraus, die letzten Schritte kurz und tief, Hand hoch gegen den Wurf.", why: "Zu schnell = Drive, zu langsam = freier Wurf." },
    { id: "korb", title: "Die Mitte bleibt zu", rule: "Die Mittlere schützt immer den Korb; die Zone gibt lieber außen einen Pass ab als innen.", why: "Würfe von außen sind schwerer als Korbleger." },
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
      o1: { x: 75, y: 88 },
      o2: { x: 22, y: 64 },
      o3: { x: 128, y: 64 },
      o4: { x: 9, y: 12 },
      o5: { x: 102, y: 20 },
      d1: { x: 55, y: 62 },
      d2: { x: 95, y: 62 },
      d3: { x: 42, y: 26 },
      d5: { x: 75, y: 24 },
      d4: { x: 108, y: 26 },
    },
  },

  beats: [
    {
      id: "set",
      title: "Grundstellung 2-3",
      text: "Zwei vorne, drei hinten. Der Ball ist oben zwischen X1 und X2 – X1 übernimmt den Druck, X2 schließt die Mitte. Hinten deckt X4 die 5 in ihrem Raum, X3 und X5 schützen Zone und Korb.",
      duration: 2000,
      principles: ["raum", "ball", "korb"],
      roles: {
        d1: { task: "Ball in deinem Raum: Druck auf 1.", watch: "o1", stance: "defense", why: "Ball zuerst." },
        d2: { task: "Mitte schließen, rechten Flügel im Blick.", watch: "ball", why: "Du sicherst den Pass in die Mitte." },
        d3: { task: "Linker Block: Raum halten, Ecke und Flügel im Blick.", watch: "ball" },
        d5: { task: "Mitte: den Korb schützen.", watch: "ball", why: "Die Mitte bleibt immer zu." },
        d4: { task: "5 ist in deinem Raum: zwischen 5 und Ball stehen.", watch: "ball" },
        o1: { task: "Ball oben halten.", watch: "ball" },
        o2: { task: "Am linken Flügel in die Lücke stellen." },
        o3: { task: "Am rechten Flügel in die Lücke stellen." },
        o4: { task: "Linke Ecke besetzen." },
        o5: { task: "Am rechten Block." },
      },
      actions: [zone("d1", "top_l"), zone("d2", "top_r"), zone("d3", "low_l"), zone("d5", "mid"), zone("d4", "low_r"),
        { type: "hold", player: "o1", face: "upcourt" }],
    },
    {
      id: "wing",
      title: "Pass auf den Flügel – die Zone wandert mit",
      text: "Der Ball geht zu 2. X1 hat den linken Flügel in ihrem Raum und kommt heraus. X2 übernimmt 1 oben – die erste Übergabe. Die hintere Reihe verschiebt sich nach links: X3 zur Ecke, X5 vor den Block, X4 in die Mitte.",
      duration: 1800,
      principles: ["verschieben", "ball", "uebergabe"],
      roles: {
        d1: { task: "Closeout auf 2 am Flügel.", watch: "o2", stance: "defense", why: "Der Flügel liegt in deinem Raum." },
        d2: { task: "1 übernehmen – sie ist jetzt in deinem Raum.", watch: "ball", cue: "X1 geht zum Flügel.", why: "Übergabe: X1 kann nicht zwei decken." },
        d3: { task: "Nach links unten verschieben, Ecke im Blick.", watch: "ball" },
        d5: { task: "Mit dem Ball nach links, Korb schützen.", watch: "ball" },
        d4: { task: "Zur Mitte verschieben – 5 bleibt in deinem Raum.", watch: "ball" },
        o1: { task: "Pass zu 2 auf den linken Flügel." },
        o2: { task: "Fangen, Blick zum Korb." },
        o3: { task: "Am Flügel bleiben." },
        o4: { task: "In der Ecke bleiben." },
        o5: { task: "Am Block bleiben." },
      },
      actions: [{ type: "pass", from: "o1", to: "o2", start: 0.12, end: 0.42, contested: true }],
    },
    {
      id: "corner",
      title: "Pass in die Ecke – Druck von unten",
      text: "2 passt in die Ecke. Die Ecke gehört X3: Sie kommt heraus. X1 sinkt zurück zu 2 an den Flügel, X5 deckt den Block hinter X3, X4 sichert die Help-Seite.",
      duration: 1700,
      principles: ["closeout", "verschieben", "korb"],
      roles: {
        d3: { task: "Closeout auf 4 in der Ecke.", watch: "o4", stance: "defense", why: "Die Ecke liegt in deinem Raum." },
        d1: { task: "Zurück an den Flügel – Rückpass zu 2 erschweren.", watch: "ball" },
        d5: { task: "Hinter X3 den Block und den Korb sichern.", watch: "ball", why: "X3 ist draußen – jetzt bist du die Tiefste auf der Ballseite." },
        d4: { task: "Help-Seite: Mitte und Korb, 5 im Blick.", watch: "ball" },
        d2: { task: "Oben die Mitte schließen.", watch: "ball" },
        o2: { task: "Pass in die Ecke zu 4." },
        o4: { task: "Fangen, Blick zum Korb." },
        o1: { task: "Oben bleiben." },
        o3: { task: "Am Flügel bleiben." },
        o5: { task: "Am Block warten." },
      },
      actions: [{ type: "pass", from: "o2", to: "o4", start: 0.12, end: 0.44, contested: true }],
    },
    {
      id: "cut",
      title: "Cut durch die Zone – Übergabe",
      text: "5 schneidet von rechts über die Zone zum Ball. Sie verlässt den Raum von X4 und kommt in den Raum von X5: X4 begleitet sie bis zur Grenze, sagt sie an und übergibt. X5 übernimmt.",
      duration: 2000,
      principles: ["uebergabe", "raum"],
      roles: {
        d4: { task: "5 bis zur Raumgrenze begleiten, laut ansagen, übergeben – dann zurück in deinen Raum.", watch: "o5", why: "Sonst stehen zwei bei 5 und die rechte Seite ist frei." },
        d5: { task: "5 übernehmen, sobald sie in deinen Raum kommt: zwischen 5 und Ball.", watch: "o5", cue: "X4 ruft „Deine!“", why: "Der Block am Ball ist der gefährlichste Ort." },
        d3: { task: "Druck auf 4 halten.", watch: "o4" },
        d1: { task: "Flügel und Rückpass im Blick.", watch: "ball" },
        d2: { task: "Mitte oben schließen.", watch: "ball" },
        o5: { task: "Cut über die Zone zum Ball an den linken Block." },
        o4: { task: "Ball halten, 5 suchen." },
        o1: { task: "Oben bleiben." },
        o2: { task: "Am Flügel bleiben." },
        o3: { task: "Am Flügel bleiben." },
      },
      actions: [
        { type: "cut", player: "o5", via: [{ x: 80, y: 30 }], to: { x: 48, y: 26 }, start: 0.1, end: 0.75 },
        { type: "hold", player: "o4", face: "o5" },
      ],
    },
    {
      id: "swing",
      title: "Schnelle Ballverlagerung – die ganze Zone wandert",
      text: "Drei schnelle Pässe: 4 → 2 → 1 → 3. Mit jedem Pass wandert die Zone: wer den Ball im Raum hat, macht Druck, alle anderen verschieben. Am Ende muss X2 weit heraus zu 3 – ein langer Closeout.",
      duration: 2600,
      principles: ["verschieben", "ball", "closeout"],
      roles: {
        d2: { task: "Mit der Verlagerung nach rechts – am Ende Closeout auf 3.", watch: "ball", stance: "defense", why: "Je schneller der Ball, desto früher musst du los." },
        d1: { task: "Erst 2, dann 1 unter Druck setzen, dann Mitte schließen.", watch: "ball" },
        d3: { task: "Zurück in den Raum, dann mit nach rechts verschieben.", watch: "ball" },
        d5: { task: "5 am linken Block halten, dann zur Mitte.", watch: "ball" },
        d4: { task: "Rechts unten: bereit für den Pass in die Ecke.", watch: "ball" },
        o4: { task: "Pass zurück zu 2." },
        o2: { task: "Sofort weiter zu 1." },
        o1: { task: "Sofort weiter zu 3." },
        o3: { task: "Fangen, Blick zum Korb." },
        o5: { task: "Am Block bleiben." },
      },
      actions: [
        { type: "pass", from: "o4", to: "o2", start: 0.04, end: 0.22, contested: true },
        { type: "pass", from: "o2", to: "o1", start: 0.3, end: 0.48, contested: true },
        { type: "pass", from: "o1", to: "o3", start: 0.56, end: 0.76, contested: true },
      ],
    },
    {
      id: "settle",
      title: "Closeout – die Zone steht wieder",
      text: "X2 kommt mit kurzen Schritten bei 3 an. Die Zone hat sich komplett nach rechts verschoben: X4 deckt die Ecke, X5 den Block, X3 sichert die Help-Seite, X1 schließt oben.",
      duration: 1500,
      principles: ["closeout", "korb"],
      roles: {
        d2: { task: "Kurze Schritte, Hand hoch, Drive zur Mitte verhindern.", watch: "o3", stance: "defense" },
        d4: { task: "Rechte Ecke und Grundlinie sichern.", watch: "ball" },
        d5: { task: "Block und Korb schützen.", watch: "ball" },
        d3: { task: "Help-Seite: Mitte und Korb.", watch: "ball" },
        d1: { task: "Oben die Mitte und 1 im Blick.", watch: "ball" },
        o3: { task: "Den Wurf antäuschen oder den nächsten Pass suchen." },
        o1: { task: "Oben bleiben." },
        o2: { task: "Am Flügel bleiben." },
        o4: { task: "In der Ecke bleiben." },
        o5: { task: "Am Block bleiben." },
      },
      actions: [{ type: "hold", player: "o3", face: "basket" }],
    },
  ],
};
