# Taktikboard – Development Status

Stand: Full-Court-Press-Break als vertikaler Prototyp der neuen Generation
(„Build basketball actions“ statt „Record movements“).

## Kurzfassung

- Plays bestehen aus **Beats mit gleichzeitigen Basketball-Aktionen**, nicht aus aufgezeichneten Koordinaten.
- Eine **deterministische Engine** wertet ein Play zu jedem Zeitpunkt aus. Abspielen, Schritt-Navigation und Scrubbing nutzen denselben Codepfad.
- **Beziehungen statt Koordinaten**: Guard-, Deny-, Help- und Trap-Positionen berechnet die Engine aus Gegenspielerin, Ball und Korb.
- **2,5D-Figuren** (SVG) zeigen Körper- und Blickrichtung, Bewegung, Team, Ballbesitz und defensive Haltung. Der Ball hat eine Flughöhe.
- **Taktik-Ebenen**: Trap-Keil, Passwege (frei/zu/riskant), 1. Presslinie (überwunden ja/nein), Matchups, „FREI“-Markierung, Coaching-Hinweise, Laufweg-Notation.
- Freimodus, Legacy-Presets, Zeichnen, Zoom/Pan, REC und PWA/Offline funktionieren weiter.

## Aktuelle Architektur

```
src/
├─ Taktikboard.jsx        App-Orchestrierung: Modi, State, Layout (Freimodus / Legacy / Play)
├─ court/
│  ├─ constants.js        Koordinatensystem, Körbe, Farben
│  └─ Court.jsx           Spielfeld (Halb-/Ganzfeld), viewBox, Einwurf-Rand
├─ play/                  ── neue Generation, reines JS, ohne React ──
│  ├─ actions.js          Aktions-Registry (Art, Bewegungsprofil, Status)
│  ├─ model.js            Datenmodell-Doku, validatePlay, Ballbesitz-Timeline
│  ├─ engine.js           compilePlay, sampleFrame, beatDiagram, Taktik-Ableitungen
│  ├─ easing.js           Bewegungsprofile (Trapez-Geschwindigkeit, Pass)
│  ├─ path.js             Laufwege mit Bogenlängen-Parametrisierung (Catmull-Rom / hart)
│  ├─ vec.js              2D-Vektoren
│  ├─ index.js            Registry der Plays
│  └─ plays/pressBreak.js Referenzfall
├─ render/
│  ├─ Player25D.jsx       2,5D-Spielerin
│  ├─ Ball25D.jsx         Ball mit Höhe, Passbogen
│  ├─ PlayOverlays.jsx    Trap, Passwege, Linien, Matchups, Fokus, Notation
│  ├─ PlayScene.jsx       Ebenenstapel eines Engine-Frames
│  ├─ boardView.js        Freimodus/Legacy → 2,5D (abgeleitete Ausrichtung)
│  └─ view.js             Hoch-/Querformat-Kontext (Text aufrecht, Pseudo-3D-Richtung)
├─ hooks/
│  ├─ useZoomPan.js       Pinch-Zoom/Pan
│  └─ usePlayback.js      Zeitsteuerung (play, pause, seek, playTo, Tempo)
├─ ui/                    Btn, PlayControls
└─ legacy/                Keyframe-Presets, REC-Speicher (Bestand)
test/                     node:test – Modell, Bewegung, Engine, Press-Break-Szenario
```

Datenfluss im Play-Modus: `play (Daten) → compilePlay → usePlayback.time → sampleFrame(t) → PlayScene (SVG)`.
Die Engine hat keinen internen Zustand über die Zeit. Deshalb sind Scrubbing, Rückwärtsspringen und Schrittmodus trivial und reproduzierbar.

### Orientierung
Ganzfeld wird auf breiten Bildschirmen (Seitenverhältnis > 1,15: Tablet quer, Desktop) automatisch quer dargestellt. Das Feld wird dann etwa doppelt so groß. Court-Koordinaten bleiben unverändert: Nur die Darstellung wird rotiert, Pointer-Koordinaten werden zurückgerechnet. Texte, Schattenrichtung, Anheben und Ballhöhe bleiben bildschirm-aufrecht (`render/view.js`).

## Play-Datenmodell

```js
{
  id, name, court: "full" | "half",
  attack: "up",                          // Offense greift den oberen Korb an
  entities: [{ id: "o1", team: "offense", label: "1" }, …],
  start: { positions: { o1: {x, y}, … }, ball: "o4" },          // Ausgangssituation
  lines: [{ id, label, members: ["d1","d4"], anchorBeat, fromBeat }],  // z. B. 1. Presslinie
  beats: [{
    id, title, text,                     // Erklärung
    duration,                            // ms
    showLanes, focus: [{ type: "open" | "callout", player, label|text, from, to }],
    actions: [                           // gleichzeitig; optional start/end ∈ [0,1] im Beat
      { type: "cut",   player: "o1", via: [{x,y}], to: {x,y}, end: 0.5 },
      { type: "pass",  from: "o4", to: "o1", start: 0.52, end: 0.8, lob? },
      { type: "deny",  player: "d1", target: "o1", end: 0.4 },
      { type: "guard", player: "d1", target: "o1", start: 0.4, distance },
      { type: "trap",  players: ["d1","d4"], target: "o1" },
      { type: "hold",  player: "o1", face: "upcourt" | "ball" | "basket" | id | {x,y} | deg },
    ],
  }],
}
```

Regeln (geprüft durch `validatePlay`):
- Pro Spielerin dürfen sich die Zeitfenster im Beat nicht überlappen. Sequenzen (Deny → Guard) sind erlaubt.
- Ein Pass geht nur vom aktuellen Ballbesitz aus. Pässe innerhalb eines Beats laufen nacheinander.
- Dribbling nur mit Ball (auch nach Ballannahme im selben Beat).
- Beziehungsaktionen: Defense → Offense-Ziel. Trap: genau zwei Spielerinnen.
- Unbekannte Aktionen sind Fehler. Geplante Aktionen erzeugen eine Warnung und werden als Hold behandelt.

Beat-Grenzen: Intervalle `(t0, t1]`. An einer Grenze sieht man den **Zustand nach Beat N**, passend zu „Schritt vor“.

## Actions

| Aktion | Status | Umsetzung |
|---|---|---|
| move | ✅ | Weg mit weichem An-/Auslaufen |
| sprint | ✅ | explosiver Antritt, lange Höchstgeschwindigkeit, Körper in Laufrichtung |
| cut | ✅ | harte Ecken (V-Cut), schneller Antritt/Stopp |
| dribble | ✅ | Weg + springender Ball seitlich (Engine & Tests; im Press Break bewusst nicht verwendet) |
| screen | ✅ (Basis) | Weg zum Block-Spot, Screen-Balken in Figur und Notation (T) |
| roll / pop | ✅ (Basis) | Weg-Aktionen mit eigener Semantik/Profil |
| hold | ✅ | Position halten, Ausrichtung per `face` |
| pass | ✅ | Ballflug fast gleichförmig, Bogen (Lob höher), Zielmarke, Ballbesitzwechsel |
| guard | ✅ | Korbseite der Gegenspielerin, folgt ihr, On-Ball-Haltung; beim Einwurf „Arme hoch“ |
| deny | ✅ | in der Passlinie zwischen Gegenspielerin und Ball |
| help | ✅ (Basis) | zwischen Ball und Gegenspielerin, zum Korb abgesunken |
| trap | ✅ | zwei Slots um die Ballführerin (nach vorne + zur Mitte), Zuordnung nach kürzesten Wegen; Trap-Stärke aus Geometrie; Ball wird hoch geschützt |
| switch | ⏳ geplant | registriert, noch Hold |
| closeout | ⏳ geplant | registriert, noch Hold |
| handoff | ⏳ geplant | registriert, noch ohne Wirkung |

Automatisch abgeleitet: Ballphase (gehalten/Flug/Dribbling), Körper- und Blickrichtung, Passwege mit Status, Trap-Stärke, Presslinie überwunden, Matchups (wer verteidigt wen, On-Ball hervorgehoben).

## Referenzfall: Press Break (6 Beats, ~11,6 s)

1. **Einwurf** – 1 V-Cut gegen den Deny von X1, Einwurf von 4, X4 mit hohen Armen.
2. **Ballannahme** – 1 dreht auf, Blick nach vorne; 4 kommt ins Feld.
3. **Trap** – X4 verlässt die Einwerferin, doppelt mit X1 an der Seitenlinie. „KEIN DRIBBLING“. X3 nimmt den Rückpass weg → Mitte leer, 5 „FREI“. Passwege: 2 und 4 zu, 5 frei, 3 zu weit.
4. **Zweite Reihe** – 5 cuttet in den freien Passraum hinter dem Trap.
5. **Pass aus dem Trap** – Lob 1 → 5. Die 1. Presslinie wird im Flug als „überwunden“ markiert. X2 muss die Mitte stoppen.
6. **Presslinie überwunden** – 5 dreht auf, Pass nach vorne zu 2. Drei Pässe, kein Dribbling.

## Was getestet wurde

- **Build:** `npm run build` erfolgreich, PWA-Service-Worker wird erzeugt.
- **Unit-/Szenario-Tests:** `npm test` mit 37 Tests (node:test, keine neue Dependency). Abgedeckt:
  - Validierung: unbekannte Aktion/Spielerin, überlappende Aktionen, Pass ohne Ball, Dribbling ohne Ball, Trap-Regeln, Warnung bei geplanten Aktionen.
  - Bewegungsprofile: monoton, stetig, Beschleunigen/Abbremsen; Ball nahezu gleichförmig; Sprint schneller als Move.
  - Engine: Gleichzeitigkeit, keine Positionssprünge (60-fps-Abtastung über das ganze Play), Stetigkeit an Beat-Grenzen, Guard auf der Korbseite, Trap-Geometrie und Trap-Ende nach dem Pass, Deny in der Passlinie, Passwege-Status, Presslinie erst nach dem Pass überwunden, Ballbesitz 4 → 1 → 5 → 2, Lob schneller als jede Spielerin, Ausrichtung, Determinismus beim Scrubbing.
- **Browser (Playwright/Chromium, Handy 430×932 hochkant und Tablet 1180×820 quer):** Play laden, Schritt vor/zurück, Beat-Chips, kompletter Ablauf bis Beat 6, Scrubbing, Leertaste, Tempo, Verteidigung ausblenden, Zeichnen im Play, Play schließen. Regressionen: Drag im Freimodus (auch im gedrehten Ganzfeld), Legacy-Preset abspielen, REC → Replay. Keine JS-Fehler.
- **Offline:** Nach dem ersten Laden die Seite offline neu geladen: Press Break lädt und spielt.
- **Performance:** `sampleFrame` braucht ca. 0,4 ms pro Frame (Node, Desktop).

Nicht getestet: echte iOS-/Android-Geräte (Touch-Gesten nur über Chromium-Emulation), Safari/WebKit.

## Bekannte Schwächen

- **Handy hochkant:** Das Ganzfeld ist breitenbegrenzt, die Figuren sind klein. Die Trap-Gruppe ist eng, Pinch-Zoom hilft. Eine automatische Kamera, die auf die Aktion zoomt, fehlt noch.
- **Keine Kollisionsvermeidung:** Enge Abstände (Deny/Guard ~0,8–0,9 m) sind gewollt. Bei ungünstigem Authoring können sich Figuren kurz überlappen.
- **Trap-Slots** sind auf „Ballführerin an der Seitenlinie, Angriff nach vorne“ optimiert. Für Mitte, Grundlinie und Halbfeld-Traps braucht es Varianten.
- **Passwege-Analyse** ist eine Heuristik (Abstand der Verteidigerinnen zur Passlinie, Mindestabstand zur Empfängerin, Länge). Verteidigerinnen direkt an der Passgeberin werden ignoriert, weil der Pass über oder neben sie geht.
- **Presslinie** wird einmalig am Ende des Anker-Beats gemessen (statische Linie), nicht dynamisch mitgeführt.
- **Blickrichtung Defense** ohne Beziehungsaktion: schaut zum Ball. Ein echtes „Ball-You-Prinzip“ fehlt.
- **Kein Play-Builder:** Plays werden als Daten in `src/play/plays/` geschrieben.
- **Legacy-Presets** laufen weiter über Keyframes. Sie zeigen die neuen Figuren, aber keine Aktions-Semantik (keine Traps, keine Passwege).
- Die Tastatursteuerung ist global, sobald ein Play aktiv ist (Leertaste = Play/Pause).
- Google-Font-Import über das Netz (Bestand). Offline greift die Fallback-Schrift.

## Technische Entscheidungen

- **Evolution statt Rewrite:** Court, Koordinatensystem, Pointer/Zoom, Freimodus, Legacy und REC bleiben erhalten. Die neue Generation liegt daneben in `play/` und `render/`.
- **Zustandslose Engine** (`sampleFrame(C, t)`): Sie ermöglicht Scrubbing, Schritte und Tests ohne Sonderfälle. Die Glättung der Ausrichtung entsteht durch ein Rückblickfenster (6 Stützstellen, 0,3 s), nicht durch gespeicherten Zustand.
- **Beziehungen werden jeden Frame aufgelöst:** Verteidigerinnen folgen ihrer Gegenspielerin automatisch. Beim Übergang interpoliert die Engine von der Startposition zum Beziehungsanker. Dadurch entsteht natürliche Reaktionszeit (z. B. X1 kommt beim V-Cut zu spät).
- **Bewegungsprofile** mit Trapez-Geschwindigkeit statt Smoothstep-Keyframes; Sprint, Move, Cut und Closeout unterscheiden sich sichtbar. Der Ball fliegt fast gleichförmig und mit Höhe (Schatten bleibt am Boden).
- **SVG statt 3D-Engine:** Die 2,5D-Wirkung entsteht aus Schatten, Anheben, Schulterachse und Blickkegel. Keine neue Dependency, gute Performance, scharf auf allen Displays.
- **Tests mit `node:test`:** Die Engine ist reines JS ohne React und deshalb ohne Test-Framework testbar.
- **REC bleibt Legacy:** Die Funktion ist im Freimodus verfügbar und im Play-Modus ausgeblendet. Neue Plays hängen nicht davon ab.

## Nächste sinnvolle Schritte

1. **Play Builder (minimal):** Spielerin antippen → Aktion wählen (Pass an…, Cut nach…, Trap mit…) → Ziel antippen. Ein Beat füllt sich mit gleichzeitigen Aktionen. Das Datenmodell trägt das bereits.
2. **Varianten/Reads:** Beats verzweigen („Defense macht A → X / B → Y“), z. B. Trap wird nicht gestellt oder X3 bleibt in der Mitte.
3. **Auto-Kamera** für Handy hochkant (auf die Aktion fokussieren) und optional Fokus auf eine Position (Player Mode).
4. **switch, closeout, handoff** implementieren; Screen mit Screen-Winkel und Ausweichen der Verteidigerin (über/unter).
5. **Legacy-Presets migrieren** (Pick & Roll, Horns, 2-3-Zone) auf das Aktionsmodell. Danach kann das Keyframe-System entfallen.
6. **Speichern eigener Plays** (localStorage, JSON-Export/-Import) statt REC-Snapshots.
7. **Passwege** mit Passart (Bodenpass, Lob) und Zeitfenster; „Ball-You“-Ausrichtung der Help-Defense.

---

## Anhang: Audit des Ausgangsstands (main @ 28efec8)

| Bereich | Befund |
|---|---|
| Komponentenstruktur | Eine 850-Zeilen-Komponente `Taktikboard.jsx` enthielt Court, Tokens, Presets, Zoom/Pan, Drag, Zeichnen, Legacy-Animation, REC und das gesamte UI. |
| State Management | Lokaler React-State (`useState`) + Refs für Drag/Gesten/Aufnahme. Keine globale State-Lib – für die Größe angemessen. |
| Court-Koordinaten | Saubere, metrische Welt-Koordinaten (1 Einheit = 10 cm, Breite 150, Halbfeld 140 / Ganzfeld 280, Korb oben). SVG-`viewBox` mit `meet`-Skalierung; `toCourt()` rechnet Bildschirm → Court. **Erhalten.** |
| Animationen | Presets = Positions-Keyframes pro Entity über `t ∈ [0,1]`, Smoothstep-Interpolation, feste Gesamtdauer 4,5 s. Ball ist ein weiteres Keyframe-Objekt – Pässe sind nur „schnelle Positionen“; keine Semantik, kein Ballbesitz, keine Gleichzeitigkeit im Sinne von Aktionen. |
| REC/Replay | Alle 100 ms ein kompletter Board-Snapshot in `localStorage`. Nur sequenzielles Verschieben möglich → kein Fluss, keine Gleichzeitigkeit. |
| Preset-Datenmodell | `{pos, anim: {id: keyframes[]}}` – rein geometrisch. |
| Rendering | SVG; Spieler = Kreis + Nummer, Ball = Kreis. Keine Ausrichtung, keine Bewegungsrichtung. |
| Touch/Mobile | Pointer Events, `touch-action: none`, Zwei-Finger-Pinch-Zoom/Pan, Pointer-Capture, Safe-Area-Insets. **Funktioniert, erhalten.** |
| PWA/Offline | `vite-plugin-pwa` (generateSW, autoUpdate), `base: "./"`, GitHub-Pages-Deploy. **Erhalten.** |

#### Technische Schulden, die die nächste Generation behindern
1. Monolith – jede neue Funktion vergrößert eine Datei, die bereits alles mischt.
2. Das Datenmodell kennt keine Aktionen, keine Beats, keine Beziehungen (wer verteidigt wen, wer passt zu wem).
3. Ball und Ballbesitz sind im Animationspfad nicht modelliert (Snapping existiert nur im Freimodus).
4. Tokens tragen keine Information außer Farbe und Nummer.
5. Timing ist global normiert (0..1) – keine Dauer pro Schritt, keine Schrittnavigation.

#### Entscheidung
- **Erhalten:** React/Vite/PWA, Court-Koordinatensystem, SVG-Rendering, Pointer-/Zoom-Handling, Freimodus (Drag, Snapping, Zeichnen), Legacy-Presets, REC (als Legacy).
- **Refaktorieren:** Monolith in Module zerlegen (`court/`, `hooks/`, `ui/`, `legacy/`).
- **Ersetzen (für neue Plays):** Keyframe-Animation → aktionsbasiertes Play-Modell + Engine (`play/`), Kreis-Tokens → 2,5D-Spieler (`render/`).
- **Kein Full Rewrite.**
