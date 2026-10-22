# Taktikboard – Development Status

Stand: dritter Entwicklungsdurchlauf („Pilotfähigkeit“) auf PR #1.
Leitbild: [`NORTH_STAR.md`](NORTH_STAR.md). Der Trainer modelliert Basketball, das Board macht es verständlich.

Pilot-Dokumente: [`PILOT.md`](PILOT.md) (HTTPS-Strategie, Schritte, Datenhinweise) ·
[`GERAETETEST.md`](GERAETETEST.md) (iOS/Android-Checkliste) · [`PRAXISTEST.md`](PRAXISTEST.md) (Test mit Mannschaft).

## Dritter Durchlauf: Pilotfähigkeit

| Bereich | Was sich geändert hat | Stand |
|---|---|---|
| **Startbildschirm** | „Spielzüge“ statt Board als Einstieg: eigene Züge, Beispiele, ungesicherte Entwürfe, Neu/Import/Sicherung, Freies Board als eigener Bildschirm | implementiert, E2E |
| **Datensicherheit** | Jeder Speichervorgang wird zurückgelesen; Fehler (Speicher voll, privater Modus, nicht bestätigt) erscheinen als „Nicht gespeichert“ mit Grund und Datei-Ausweg – nie als Erfolg | implementiert, Unit + E2E (simulierter voller Speicher) |
| | Automatischer Entwurf 0,4 s nach jeder Änderung; Wiederherstellung nach Neuladen/Absturz; Rückfrage beim Verlassen; `beforeunload`-Schutz | implementiert, E2E |
| | Sicherungsdatei (alle Spielzüge + Board-Aufnahmen), Import ohne Duplikate (abweichende Fassung → Kopie), Schema-Version, `storage.persist()` | implementiert, Unit + E2E |
| | Fehlergrenze (ErrorBoundary) mit Notfall-Sicherung aller Daten | implementiert |
| | REC-Aufnahmen im Freien Board: Schreibfehler wurden bisher verschluckt → jetzt bestätigt/gemeldet, Aufnahme bleibt bei Fehler erhalten | behoben, Unit + E2E |
| **Builder** | Vorlagen (5-Out, Horns, 1-4 hoch, 4-Out, Box-Einwurf, Einwurf gegen Presse, Fastbreak) mit automatischer Verteidigung; Rückgängig/Wiederholen; Ziel- und Umwegpunkte ziehen; Beats umsortieren; verständliche Prüfmeldungen mit Namen; Speichern trotz Fehlern (als „noch nicht abspielbar“ markiert); Zeiten in Sekunden | implementiert, E2E |
| **Spielerinnen-Modus** | **Read-Training:** Verteidigung reagiert (Angriff steht, keine Hinweise), Spielerin entscheidet, Rückmeldung, Lösung läuft weiter; Antworten lokal protokolliert, CSV-Export | implementiert, Unit + E2E |
| | Steuerung bleibt am Handy immer sichtbar; Schritt nochmal ↻; Zeitlupe 🐢; Kurzanleitung; Legende „?“; Tippflächen ≥ 44 px; Beschriftungen bleiben im sichtbaren Ausschnitt | implementiert, E2E, Screenshots iPhone-13-Profil |
| **Teilen** | Geteilten Zug „In meine Spielzüge“ übernehmen (inkl. Aktualisieren/Kopie); QR-Code für die App-Adresse und kurze Links; Hinweis, wenn die Adresse nicht teilbar ist (localhost/LAN/HTTP) | implementiert, E2E |
| **Datenschutz** | Schrift lokal gebündelt statt Google Fonts – keine Anfragen an fremde Server (E2E-Test sichert das ab) | implementiert, E2E |
| **Tests/CI** | Playwright-Suite im Repo (`npm run e2e`), Projekte Telefon/Tablet (Chromium) und iPhone/iPad (WebKit, `E2E_WEBKIT=1`); GitHub-Workflow „Tests“ für PRs; Deploy nur mit grünen Unit-Tests | implementiert |

**Bewusst nicht umgesetzt:** Konto/Cloud-Sync (bräuchte Server), Kurzlinks (bräuchte Dienst), geneigte 3D-Kamera.

## Überblick: was gebaut ist

| Bereich | Stand | Wo |
|---|---|---|
| Aktionsbasiertes Play-Modell mit Beats, Beziehungen und Coaching-Rollen | implementiert, getestet | `src/play/model.js`, `actions.js` |
| Varianten / Reads (Wenn-dann-Bäume) | implementiert, getestet | `src/play/variants.js` |
| Deterministische Engine (Wege, Beziehungen, Ball, Ausrichtung) | implementiert, getestet | `src/play/engine.js` |
| Passarten Direkt / Bodenpass / Lob | implementiert, getestet | `src/play/ballFlight.js` |
| Spielerinnen-Modus („Ich bin die 5“) | implementiert, Browser-getestet | `src/studio/PlayerPanel.jsx`, `PlayStudio.jsx` |
| Kontext-Kamera (Spielerin + Trainer-Fokus) | implementiert, getestet | `src/play/camera.js`, `ui/CourtStage.jsx` |
| Taktische Analyse (Korridore, Reichweite, Freiräume, Passfenster) | implementiert, als Modell gekennzeichnet | `src/play/analysis.js`, `render/AnalysisLayers.jsx` |
| Play Builder (ohne Code, ohne Aufnahme) | implementiert (Minimalumfang), Browser-getestet | `src/studio/Builder.jsx`, `builderModel.js` |
| Speichern, Import, Export | implementiert | `src/store/playStore.js`, `share.js` |
| Teilen per Link / Datei / System-Teilen | implementiert, getestet | `src/studio/ShareSheet.jsx` |
| Zweites Referenzszenario Pick & Roll (Show / Switch) | implementiert, getestet | `src/play/plays/pickRoll.js` |
| Figuren 2.0 (Füße, Standbreite, Schrittbewegung, Zoom-Skalierung) | implementiert | `src/render/Player25D.jsx` |
| QR-Code | für App-Adresse und kurze Links (Spielzug-Links sind meist 3–6 kB, zu groß) | `src/ui/Qr.jsx` |
| Geneigte Kamera / 3D | **nicht umgesetzt**, bewusst zurückgestellt (Begründung unten) | – |
| Beschriftungen ohne Überlappung (automatisch) | **nicht umgesetzt** | – |

Bestand bleibt erhalten: Freimodus (Drag, Ball-Snapping, Zeichnen), Legacy-Presets, REC/Replay, Zoom/Pan, PWA/Offline.

## Der Gesamt-Workflow

**Trainer erstellt → Trainer teilt → Spielerin öffnet → Spielerin versteht**

1. **Erstellen:** In der Bibliothek auf „+ Neues Play“. Der Spielzug startet mit der aktuellen Board-Aufstellung. Im Builder: Aufstellung ziehen → Beat wählen → Figur antippen → Aktion → Ziel antippen. Timing per Regler, Coaching pro Rolle, „+ Read“ für Varianten. Die Prüfung läuft live, gespeichert wird lokal.
2. **Präsentieren:** In der Trainer-Ansicht stehen Varianten zur Wahl („A · X3 stellt den Rückpass zu / B · X3 bleibt in der Mitte“). Dazu kommen Fokus-Kamera, Analyse-Ebenen und Zeichnen.
3. **Teilen:** „Teilen“ erzeugt einen Link mit dem ganzen Spielzug (`#p=…&v=player`), der direkt in der Spielerinnen-Ansicht öffnet. Möglich sind auch System-Teilen (Handy), Kopieren und eine `.taktik.json`-Datei.
4. **Verstehen:** Die Spielerin wählt ihre Position und geht mit „Weiter“ Beat für Beat durch. Sie sieht ihre Aufgabe, wann sie startet, worauf sie achtet, wohin sie läuft und wie sie dort steht. Am Read hält der Ablauf an: erst beobachten, dann wählen, dann die Lösung sehen. Am Ende kommt „Andere Variante ansehen“.

## Architektur

```
src/
├─ Taktikboard.jsx          Bibliothek + Freimodus (Legacy, REC); öffnet das Studio
├─ main.jsx                 Einstieg + GlobalStyle
├─ court/                   Koordinatensystem, Spielfeld, viewBox
├─ play/                    ── Basketball-Kern, reines JS (ohne React), voll getestet ──
│  ├─ model.js              Datenmodell, validatePlay, Haltungen (STANCES)
│  ├─ actions.js            Aktions-Registry
│  ├─ variants.js           Entscheidungsbäume → lineare Varianten
│  ├─ engine.js             compilePlay, sampleFrame, passLanes, beatDiagram
│  ├─ ballFlight.js         Passarten und Ballhöhe
│  ├─ describe.js           Rollenbeschreibung (Trainer-Text > automatische Beschreibung)
│  ├─ camera.js             Ausschnitte pro Beat (Spielerin / Aktion)
│  ├─ analysis.js           Korridore, Reichweite, Freiraumkarte, Passfenster
│  ├─ easing.js, path.js, vec.js
│  ├─ index.js              Registry + compileVariant + validatePlayTree
│  └─ plays/                pressBreak.js, pickRoll.js
├─ studio/                  ── Ansichten eines geöffneten Spielzugs ──
│  ├─ PlayStudio.jsx        Trainer / Spielerin / Bearbeiten, Steuerung, Kamera
│  ├─ PlayerPanel.jsx       Rollenwahl, Aufgabenkarte, Read-Karte, Schrittsteuerung
│  ├─ CoachParts.jsx        Variantenleiste, Analyse-Schalter, Passfenster-Zeitleiste
│  ├─ Builder.jsx           Play Builder (UI)
│  ├─ builderModel.js       Builder-Datenoperationen (rein, getestet)
│  ├─ ShareSheet.jsx        Teilen
│  └─ studioUi.jsx          UI-Bausteine
├─ render/                  2,5D-Figuren, Ball, Overlays, Spielerinnen- und Analyse-Ebenen
├─ ui/                      CourtStage (Bühne: Orientierung, Kamera, Zoom, Pointer), PlayControls, Btn
├─ hooks/                   usePlayback, useZoomPan, useAnimatedBox, useWide
├─ store/                   playStore (localStorage), share (Link-/Dateiformat)
└─ legacy/                  Keyframe-Presets, REC-Speicher
test/                       node:test – 83 Tests
```

**Datenfluss:** `play (Baum) → resolveVariant(choices) → compilePlay → sampleFrame(t) → PlayScene`.
Die Engine bleibt linear und zustandslos. Varianten entstehen *vor* der Engine durch Auflösen des Baums. Deshalb ist jede Variante vom selben Ausgangszustand aus reproduzierbar, und Scrubbing, Schritte und Tests funktionieren ohne Sonderfälle.

## Datenmodell (Erweiterungen dieses Durchlaufs)

```js
{
  …,
  beats: [ /* gemeinsamer Stamm */ {
    id, title, text, duration, actions: […],
    roles: {                                  // Coaching pro Rolle (optional, vom Trainer)
      o5: { task, cue, watch: "d3" | "ball", stance: "open" | "triple" | "protect" | "defense" | "deny" | "screen", why },
    },
  }],
  decision: {                                 // Read am Ende des Stamms (optional, verschachtelbar)
    id, title, question, watch: ["d3"],
    options: [{ id, label, read, answer, beats: […], lines?: […], decision?: {…} }],
  },
}
// Pass: { type: "pass", from, to, start, end, kind: "chest" | "bounce" | "lob" }   (lob: true bleibt gültig)
// Screen: { type: "screen", player, to, on: "d1" }   → Brust zur geblockten Verteidigerin
```

`validatePlayTree` prüft die Baumstruktur (eindeutige IDs, mindestens zwei Optionen) und jede Variante einzeln, einschließlich der Pass-Konsistenz.

## Aktionen

| Aktion | Status |
|---|---|
| move, sprint, cut, dribble, roll, pop, hold, pass | ✅ |
| screen (mit `on` und Ausrichtung) | ✅ |
| guard, deny, help, trap | ✅ |
| **switch** (Übernahme, neue Matchups) | ✅ neu |
| **closeout** (eng heran, Hand hoch, eigene Haltung) | ✅ neu |
| hedge, handoff | ⏳ geplant (registriert, wirken noch wie „halten“) |

## Spielerinnen-Modus – Designentscheidungen

- **Eigene Oberfläche:** große Positionsknöpfe, eine Aufgabenkarte, eine große „Weiter“-Taste. Auf dem Handy sieht man keine Trainer-Werkzeuge.
- **Vorschau an Beat-Grenzen:** Pausiert zwischen zwei Beats zeigt die Karte den *kommenden* Beat, also erst lesen, dann „Weiter“ und zusehen.
- **Aufgabe:** Der Trainer-Text hat Vorrang. Fehlt er, beschreibt das System nur Aktion, Ort und Auslöser („Ball von 4 fangen → Sprinten: links, Rückfeld – nach dem Pass von 4 zu 5“). Das ist sichtbar als *automatisch* markiert und enthält nie ein erfundenes Signal oder „Warum“.
- **„Wann“:** Wird aus den Aktionen abgeleitet (nach welchem Pass oder welcher Aktion die Bewegung startet). Eigene Momente erscheinen als weiße Punkte auf der Zeitleiste.
- **„Achte auf“:** Eine gestrichelte Blicklinie mit Auge führt zum Signal (z. B. X3), dazu kreist eine Markierung um X3.
- **Ziel und Haltung:** Eine Geisterfigur mit Fußabdrücken steht schon vor der Bewegung am Ziel. Die Fußstellung folgt der Haltung (offen, versetzt, breit).
- **Read:** Am Entscheidungspunkt hält der Ablauf an. Die Karte zeigt die Frage und *nur die Beobachtung* je Option, die Lösung erst nach der Wahl. Auch Verteidigerinnen sind wählbar (X1–X5).
- **Kamera:** Pro Beat umfasst der Ausschnitt die eigene Figur, das Signal, den Ball, die Passpartnerinnen und die direkte Gegenspielerin über den *ganzen* Beat. Er bleibt innerhalb des Beats ruhig und fährt zwischen den Beats weich weiter. Beim Hineinzoomen werden die Figuren realistischer klein, damit eng stehende Spielerinnen nicht verschmelzen.

## Taktische Analyse – Modellannahmen

Alle Ebenen sind zuschaltbar und stehen nur in der Trainer-Ansicht. Sie tragen sichtbar den Hinweis „Modell-Einschätzung … keine Vorhersage des echten Spiels“.

- **Passkorridore:** Breite des freien Raums bis zur nächsten Hand (Anzeige in m), schmal an Passgeberin und Empfängerin.
- **Reichweite:** Kreise mit 0,8 m Armreichweite um die Verteidigerinnen.
- **Freiraumkarte:** grün = direkt anspielbar, gelb = nur per Lob oder Bodenpass (Hände an der Passgeberin). Im Press Break wird so der freie Raum in der Mitte als „nur über den Trap“ sichtbar.
- **Passfenster:** Zeitleiste pro Anspielstation (frei / nur Lob/Boden / zu / zu weit), anklickbar.
- **Regeln:** Hände an der Linie < 0,8 m, Deckung < 1 m nur auf der Passseite (sonst Körperkontakt < 0,5 m), Pässe über 10 m gelten als riskant. Verteidigerinnen hinter der Empfängerin schließen die Linie nicht (Post-Entry).

## Teilen ohne Server

- **Format:** `1.` + base64url(deflate-raw(JSON)), Zahlen gerundet. Der Press Break ergibt etwa 5.400 Zeichen, das Pick & Roll etwa 3.400.
- **Öffnen:** Ein Link mit `#p=` wird beim Start validiert und als „Geteilter Spielzug“ geöffnet, mit `&v=player` direkt in der Spielerinnen-Ansicht. Speichern legt eine eigene Kopie an.
- **Kein QR-Code:** Ein QR-Code fasst höchstens rund 2,9 KB, ein vollständiger Spielzug mit Coaching-Texten ist größer. Kurze QR-Codes bräuchten einen Kurzlink-Dienst, also externe Infrastruktur, die in diesem Auftrag ohne Freigabe ausgeschlossen ist.
- **Voraussetzung:** Links funktionieren gegenüber der veröffentlichten App-Adresse. Solange der Stand nicht nach `main` gemergt und deployt ist, zeigen sie auf die Adresse, auf der der Link erzeugt wurde.

## Technische und gestalterische Entscheidungen

- **Kein 3D, keine geneigte Kamera in diesem Durchlauf.** Der größte Verständnis-Engpass war die Lesbarkeit am Handy, nicht die fehlende Tiefe. Die Kontext-Kamera, die Zoom-Skalierung der Figuren, das Nebeneinander-Layout und die automatische Querdarstellung lösen ihn ohne neue Abhängigkeit. Eine geneigte Kamera würde im Hochformat Fläche kosten (das Feld wird verkürzt), Beschriftungen und Eingabe-Umrechnung verkomplizieren und Screens nur optisch, nicht inhaltlich klarer machen. Ein Prototyp bleibt sinnvoll, um ihn für die Präsentation am Tablet zu bewerten (siehe nächste Schritte).
- **Varianten außerhalb der Engine:** Der Baum wird zu linearen Abläufen aufgelöst. Die Engine bleibt einfach, deterministisch und vollständig getestet.
- **Coaching-Hoheit:** Inhalte wie Signal, Haltung und Warum kommen nur vom Trainer. Die Beispiel-Plays enthalten Beispiel-Coaching, das jeder Trainer im Builder ersetzen kann.
- **Builder-Prinzip „Aktion statt Aufnahme“:** Eine neue Aktion ersetzt die bisherige der Spielerin im Beat, „danach“ hängt sie an. So entstehen keine überlappenden Zeitfenster.
- **Eingebaute Plays sind schreibgeschützt:** Speichern erzeugt immer eine Kopie.
- **Layout:** Ab 900 px Breite und Querformat stehen Spielfeld und Panel nebeneinander. Das Ganzfeld nimmt die Orientierung, die es größer darstellt.

## Was getestet wurde

> Stand dritter Durchlauf: **102 Unit-Tests** (`npm test`) und **42 Browser-Tests** (`npm run e2e`, je 21 auf Telefon- und Tablet-Profil, Chromium) – alle grün.
> Die Browser-Suite deckt jetzt auch Startbildschirm, Builder-Datensicherheit (Bestätigung, Entwurf, Rückfrage, voller Speicher), Read-Training, QR/Teilen-Hinweise, REC-Speicherfehler und „keine fremden Server“ ab.
> WebKit (iPhone/iPad-Profil) läuft in CI; lokal ist keine WebKit-Engine installiert. Echte Geräte: siehe GERAETETEST.md – **noch nicht durchgeführt**.

Ergebnisse des zweiten Durchlaufs:

- **Build:** `npm run build` ok (PWA-Service-Worker wird erzeugt).
- **Automatische Tests:** `npm test` mit **83 Tests** (node:test, keine neue Dependency):
  - Modell, Validierung und Bewegungsprofile.
  - Engine: Stetigkeit bei 60 fps, Gleichzeitigkeit, Trap, Deny, Guard, Passwege, Determinismus.
  - Varianten: Baumprüfung, gemeinsamer Stamm identisch, Divergenz der Verteidigung, Reproduzierbarkeit.
  - Pick & Roll: Screen-Ausrichtung, Tag, Closeout, Switch-Matchups, Bodenpass mit Bodenkontakt.
  - Rollenbeschreibung: Vorrang des Trainer-Texts, keine erfundenen Inhalte, Auslöser, Zonen.
  - Kamera: Ausschnitt enthält alles Relevante über den ganzen Beat.
  - Analyse: Freiraum-Klassen, Korridorbreite, lückenlose Passfenster.
  - Builder: kompletter Trainer-Workflow, Ersetzen und Anhängen, Read anlegen, eingebaute Plays unverändert.
  - Teilen: Roundtrip, Hash-Parsing, Fehlerformate.
- **Browser (Playwright/Chromium, Handy 430×932 mit Touch-Emulation, Tablet 1180×820):** 64 Prüfungen, alle bestanden.
  - Trainer: Schritt, Variantenwechsel A/B, vollständiger Ablauf, Analyse-Hinweis, Passfenster, Tastatur.
  - Spielerin: Positionswahl, Aufgabenkarte, „DU“, Read hält an, Lösung erst nach der Wahl, Signal-Linie, Zielmarke, andere Variante.
  - Teilen und Link öffnen in neuer Seite (Spielerinnen-Ansicht des geteilten Zugs).
  - Builder: neuer Zug, Cut + Pass per Antippen, Speichern, Neuladen, Löschen mit Bestätigung; Datei-Import.
  - Regressionen: Drag im Freimodus (Halb- und Ganzfeld), Legacy-Preset, REC → Replay.
  - Keine JS-Fehler.
- **Offline:** Nach dem ersten Laden offline neu geladen, der Spielerinnen-Modus im Pick & Roll funktioniert.
- **Leistung (Node, Desktop):** `sampleFrame` 0,6 ms; Frame mit Freiraumkarte und Korridoren 1,8 ms; Passfenster einmalig 44 ms; Kamera je Beat 5 ms.

**Nicht geprüft:** echte iOS-/Android-Geräte und Safari/WebKit (u. a. `CompressionStream` erst ab Safari 16.4, Web Share, Touch-Gesten auf echter Hardware); Bedienung durch echte Trainer und U14/U16-Spielerinnen; Bildschirmleser-Bedienung.

## Bekannte Schwächen

- **Beschriftungen** (FREI, Callouts, ZIEL, ACHTE AUF) bleiben jetzt im sichtbaren Ausschnitt, werden aber nicht gegeneinander entzerrt und können sich in dichten Szenen überlappen.
- **Read-Training** setzt voraus, dass der erste Beat einer Option die Reaktion der Verteidigung zeigt (so sind beide Beispiele gebaut). Beginnt eine Option sofort mit der Lösung des Angriffs, sieht die Spielerin im Training nur die Verteidigung – das ist gewollt, sollte aber beim Bauen eigener Reads bekannt sein.
- **iOS:** Safari und installierte App haben getrennte Speicher; Messenger-Browser speichern oft nicht dauerhaft (in PILOT.md dokumentiert, nicht technisch lösbar ohne Server).
- **Builder:**
  - Figuren der Aufstellung lassen sich nicht ausblenden (immer 5 gegen 5).
  - Beats lassen sich nur innerhalb eines Abschnitts (Stamm oder Option) umsortieren.
  - Der Builder ist für Tablet und Desktop optimiert, am Handy geht er, ist aber eng.
- **Keine Kollisionsvermeidung:** Beim Switch steht X1 bewusst eng hinter der 5 und wird teilweise verdeckt.
- **Trap-Slots** sind weiterhin auf Seitenlinien-Traps in Angriffsrichtung zugeschnitten.
- **Analyse-Heuristik:** Pivot, Passgeschwindigkeit und Reaktionszeit der Verteidigung sind nicht modelliert. Der Status „nur per Lob/Boden“ ist keine Erfolgsgarantie.
- **Lokale Plays** liegen nur im Browser des Geräts (localStorage). Geräteübergreifend helfen Link oder Datei.
- **Legacy-Presets** sind noch nicht ins Aktionsmodell migriert.

## Nächste sinnvolle Schritte

1. **Freigabe und Pilot-Deployment** nach PILOT.md (GitHub Pages, kostenlos) – danach **Gerätetest** (GERAETETEST.md) und **Praxistest** (PRAXISTEST.md) mit einer U14/U16-Mannschaft.
2. **Befunde des Praxistests** priorisieren (blockierend/störend/Wunsch) und umsetzen.
3. **Beschriftungen ohne Überlappung**; Builder: Aktionen auf mehrere Spielerinnen kopieren, Figuren ausblenden.
4. **Legacy-Presets migrieren** (Horns, Triangle, 2-3-Zone mit Rotations-Reads) und danach das Keyframe-System entfernen.
5. **Prototyp geneigte Kamera** nur für die Präsentation am Tablet; Entscheidung nach Vergleich am Trap und am Screen.
6. **Teilen mit Kurzlink/QR,** falls gewünscht: braucht einen (ggf. kostenlosen) Dienst und deine Freigabe.
7. **hedge und handoff** implementieren, Trap-Varianten (Mitte, Grundlinie, Halbfeld).

## Anhang A: Passlinien-Analyse – Review-Befund vom ersten Durchlauf

_Hinweis: Der Status hieß damals `lob`. Seit es Bodenpässe gibt, heißt er `hands` („nur an den Händen vorbei“). Verteidigerinnen hinter der Empfängerin zählen inzwischen nicht mehr zur Linienfreiheit (Post-Entry)._

**Befund:** Die erste Version ignorierte **allgemein** jede Verteidigerin, die näher als 1,2 m an der Passgeberin stand. Das betraf alle Passlinien und nicht nur Trapperinnen. Es war unabhängig davon, ob überhaupt ein Lob modelliert war, weil die Analyse keinen Bezug zum Passtyp hatte. Folge: Eine Verteidigerin direkt in der Passrichtung, auch ohne Trap, erzeugte eine „freie“ Linie. Das ist eine freie Linie allein durch Ausschluss.

**Neue Regel** (`passLanes` in `src/play/engine.js`, gilt für jeden Pass):

| Status | Bedeutung | Bedingung |
|---|---|---|
| `closed` | zu | Verteidigerin (> 1,2 m von der Passgeberin) < 0,8 m an der Linie **oder** Empfängerin < 1 m gedeckt |
| `long` | riskant | Passweg > 10 m (gegen Presse) |
| `hands` | nur über die Hände | eine Verteidigerin ≤ 1,2 m an der Passgeberin erreicht mit den Händen (0,8 m) die Linie, dahinter ist alles frei (`blockedBy` nennt sie) |
| `open` | direkter Pass möglich | nichts davon |

Nahe Verteidigerinnen werden also nie ausgeblendet, sondern über ihre Armreichweite geprüft. Gemessen wird der senkrechte Abstand zur Linie. Zwei Trapperinnen schließen damit auch die Lücke zwischen sich. Ein reines Winkelmodell hätte dort eine falsche Lücke gelassen, das hat ein Test aufgedeckt.

**Konsistenzprüfung:** `compilePlay` prüft jeden modellierten Pass zum Abspielzeitpunkt gegen die Passlinie. Ein direkter Pass durch eine `hands`-Linie oder ein Pass durch eine `closed`-Linie ergibt eine Warnung. Diese Prüfung fand zwei echte Fehler im Press Break, die die alte Regel verdeckt hatte:
- **Einwurf 4→1:** X1 stand beim Abspiel fast in der Passlinie, der V-Cut schaffte keine Trennung. Korrigiert: X1 bleibt beim Richtungswechsel hängen. Außerdem deckt X4 mit hohen Armen die direkte Linie ab, der Einwurf ist jetzt ein Überkopfpass (`lob: true`).
- **Pass 5→2:** X2 stand 0,9 m vor 5, direkt an der Passlinie. Korrigiert: X2 sinkt tiefer ab (1,3 m), um die Mitte zu schließen.

Im Trap zeigt die Linie zu 5 jetzt `hands` (blockiert durch X1) und nicht `open`. Das passt zum modellierten Lob aus dem Trap.

**Tests:** Verteidigerin direkt vor der Passgeberin ohne Trap → `hands` statt `open` (Regression). Seitlich stehende nahe Verteidigerin → `open`. Nahe plus weitere Verteidigerin in der Linie → `closed`. Trapperinnen zählen bei jedem Pass (Split-Lücke geschlossen). Warnung bei direktem Pass durch die Arme, keine Warnung als Lob. Press Break: 5 nur per Lob, alle modellierten Pässe ohne Warnung.

Grenzen der Heuristik: Pivot bzw. Sternschritt der Passgeberin (Winkel verändern), Bodenpass und Passgeschwindigkeit sind nicht modelliert. `hands` heißt „nicht direkt spielbar“ und ist keine Erfolgsgarantie für den Lob.


## Anhang B: Audit des Ausgangsstands (main @ 28efec8)

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
