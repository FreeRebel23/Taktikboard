# Pilotversion – Strategie und Schritte

Ziel: eine über **HTTPS** erreichbare, installierbare und offline nutzbare Version für den
echten Trainingsalltag (Trainer:innen + U14/U16-Spielerinnen), **ohne** Konto, Server-Datenbank
oder laufende Kosten.

> **Wichtig:** Ein Deployment oder eine Veröffentlichung erfolgt erst nach ausdrücklicher Freigabe
> durch den Projektinhaber. Dieses Dokument beschreibt nur die Schritte.

---

## 1. Warum HTTPS zwingend ist

| Funktion | ohne HTTPS (z. B. `http://192.168…`) | mit HTTPS |
|---|---|---|
| Offline-Nutzung (Service Worker) | ✗ | ✓ |
| „Zum Home-Bildschirm“ als App (iOS/Android) | eingeschränkt / ✗ | ✓ |
| Geteilte Links funktionieren für alle | ✗ (nur im selben WLAN) | ✓ |
| Dauerhafter Speicher (`navigator.storage.persist`) | ✗ | ✓ |

Die App zeigt deshalb im Teilen-Dialog und bei „App teilen“ einen Hinweis, wenn sie unter
`localhost`, einer LAN-Adresse oder ohne HTTPS läuft.

## 2. Optionen

### Option A – GitHub Pages (empfohlen)

* **Bereits eingerichtet:** `.github/workflows/deploy.yml` baut und veröffentlicht bei jedem Push
  auf `main`. Das Repository ist öffentlich, GitHub Pages ist aktiv → **kostenlos**.
* Adresse: `https://freerebel23.github.io/Taktikboard/`
* Der Workflow führt jetzt vor dem Build `npm test` aus – ein Stand mit roten Tests wird nie veröffentlicht.
* **Konsequenz:** Der Merge des Pull Requests nach `main` **ist** die Veröffentlichung. Die bisherige
  Version unter dieser Adresse wird ersetzt. Daten der bisherigen Nutzer:innen bleiben erhalten
  (gleiche Adresse = gleicher Speicher; die REC-Aufnahmen verwenden denselben Schlüssel
  `taktikboard.sequences.v1` und erscheinen im „Freien Board“).

### Option B – getrennte Pilot-Adresse (Netlify oder Cloudflare Pages)

* Kostenloser Tarif, Vorschau je Branch möglich, `main` bliebe unverändert.
* **Nachteil:** neuer externer Dienst mit eigenem Konto → nur mit Freigabe. Andere Adresse =
  anderer Browser-Speicher (Spielzüge müssten per Sicherungsdatei umziehen, wenn später gewechselt wird).
* Einstellungen: Build `npm run build`, Ausgabe `dist`, Node 22. Keine Umgebungsvariablen nötig.

### Option C – nur lokal (nicht empfohlen)

`npm run build && npx vite preview --host` im WLAN der Halle: kein HTTPS → kein Offline, keine
Installation, Links nur im selben Netz. Nur für einen schnellen Funktionsblick.

**Empfehlung:** Option A. Sie verursacht keine Kosten, nutzt die vorhandene Infrastruktur, und die
Adresse bleibt nach dem Pilot dieselbe (kein Datenumzug).

## 3. Schritte bis zum Pilot (Option A)

1. **Review** des Pull Requests (Code + Vorschau-Artifact).
2. **CI grün:** Workflow „Tests“ (Unit, Build, Chromium- und WebKit/Safari-Browsertests).
3. **Freigabe** durch den Projektinhaber → PR nach `main` mergen.
4. Workflow „Deploy auf GitHub Pages“ abwarten (≈ 1–2 min), Adresse aufrufen.
5. **Gerätetest** nach [GERAETETEST.md](GERAETETEST.md) auf mind. 1 iPhone und 1 Android-Gerät.
6. Trainer:in: App installieren (siehe 4.), zwei Spielzüge anlegen, **Sicherung herunterladen**.
7. **Praxistest** nach [PRAXISTEST.md](PRAXISTEST.md) in einer Trainingseinheit.

**Rückweg:** Merge-Commit auf `main` per `git revert` zurücknehmen → der Deploy-Workflow
veröffentlicht automatisch den vorherigen Stand. Gespeicherte Spielzüge bleiben im Browser
erhalten (der alte Stand ignoriert sie nur).

## 4. Installation auf dem Handy

**iPhone/iPad (Safari):** Adresse öffnen → Teilen-Symbol → „Zum Home-Bildschirm“.
**Android (Chrome):** Adresse öffnen → Menü ⋮ → „App installieren“ / „Zum Startbildschirm hinzufügen“.

Spielerinnen bekommen die Adresse am einfachsten per QR-Code: Startbildschirm → **„App teilen“**.

## 5. Daten – was Trainer:innen wissen müssen

* Alle Daten liegen **nur auf dem Gerät** (localStorage). Kein Konto, kein Server, keine Übertragung.
* **iOS:** Safari und die installierte Home-Bildschirm-App haben **getrennte Speicher**. Spielzüge,
  die in Safari gespeichert wurden, erscheinen nicht in der installierten App (und umgekehrt).
  → Erst installieren, dann nur noch die App benutzen. Umzug per Sicherungsdatei.
* **iOS Safari (nicht installiert):** Website-Daten können nach 7 Tagen ohne Nutzung gelöscht werden.
  Installierte Apps sind davon ausgenommen.
* **Messenger-Browser** (WhatsApp, Instagram …) haben eigene, oft flüchtige Speicher. Geteilte Links
  zum **Ansehen** funktionieren dort; zum **Speichern** („In meine Spielzüge“) im richtigen Browser
  bzw. in der App öffnen.
* **Sicherung:** Startbildschirm → „Sicherung herunterladen“ (enthält Spielzüge und Board-Aufnahmen).
  Empfohlen: nach jeder größeren Änderung und vor jedem Gerätewechsel; Datei in die Cloud legen.
* Speichern wird durch Zurücklesen bestätigt; schlägt es fehl, erscheint „Nicht gespeichert“ mit
  Grund und dem Angebot, als Datei zu sichern. Ungespeicherte Änderungen werden automatisch als
  Entwurf gesichert und nach Absturz/Neuladen angeboten.

## 6. Datenschutz (Minderjährige)

* Die App erhebt keine personenbezogenen Daten, setzt keine Cookies und lädt keine Inhalte von Dritten
  (Schriften und Bibliotheken sind im Build enthalten).
* Der Hosting-Anbieter (GitHub) verarbeitet technisch bedingt IP-Adressen beim Abruf der Seite.
  Für einen Vereinseinsatz sollte das in der Datenschutzinformation des Vereins erwähnt werden.
* Das Read-Training-Protokoll enthält nur Spielzug, Position und Antworten – **keine Namen**. Es bleibt
  auf dem Gerät und wird nur exportiert, wenn jemand „Als Tabelle herunterladen“ tippt.

## 7. Updates während des Pilots

Neue Versionen werden beim nächsten Start der App im Hintergrund geladen und sind ab dem darauf
folgenden Start aktiv (Service Worker `autoUpdate`). Für sofortige Aktualisierung: App schließen und
neu öffnen (ggf. zweimal).
