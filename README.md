# Taktikboard

Basketball Coach Board als installierbare **PWA** (Progressive Web App) – läuft offline, im Vollbild, mit eigenem Icon auf Handy & Tablet.

## Entwicklung

```bash
npm install        # einmalig
npm run dev        # Dev-Server (http://localhost:5173)
```

## Für Handy/Tablet bauen & bereitstellen

```bash
npm run icons      # PWA-Icons aus dem SVG-Logo erzeugen (nur nach Logo-Änderung nötig)
npm run build      # Production-Build -> dist/
npm run preview    # dist/ lokal im WLAN ausliefern (--host)
```

`npm run preview` zeigt eine Adresse wie `http://192.168.x.x:4173`. Diese auf
Handy/Tablet (gleiches WLAN) im Browser öffnen.

### Als App zum Homescreen hinzufügen
- **iPhone/iPad (Safari):** Teilen-Symbol → „Zum Home-Bildschirm". Danach
  startet das Taktikboard wie eine native App im Vollbild und funktioniert offline.
- **Android (Chrome):** Menü (⋮) → „App installieren" / „Zum Startbildschirm hinzufügen".

> Hinweis: PWAs brauchen für die Installation `https` **oder** `localhost`.
> Im lokalen WLAN über die IP funktioniert das Hinzufügen zum Homescreen je nach
> Browser eingeschränkt. Für die volle PWA-Erfahrung den `dist/`-Ordner bei einem
> Static-Host mit HTTPS ablegen (z. B. Netlify, Vercel, GitHub Pages) – die App ist
> dank `base: "./"` ohne weitere Konfiguration deploybar.

## Tests

```bash
npm test           # Unit-Tests: Modell, Engine, Varianten, Read-Training, Speicher, Teilen (node:test)
npm run e2e        # Browser-Tests (Playwright): Telefon- und Tablet-Profil, baut vorher automatisch
E2E_WEBKIT=1 npm run e2e   # zusätzlich iPhone/iPad (WebKit) – vorher: npx playwright install webkit
```

Die Browser-Tests laufen in GitHub Actions für jeden Pull Request (Workflow „Tests“).
Für echte Geräte: [`GERAETETEST.md`](GERAETETEST.md). Pilot und Veröffentlichung: [`PILOT.md`](PILOT.md).

## Nutzung in Kürze
- **Startbildschirm:** eigene Spielzüge und Beispiele; „+ Neuer Spielzug“ (Vorlage wählen), „Importieren“, „Sicherung herunterladen“, „App teilen“ (QR-Code), „Freies Board“.
- **Trainer:** Varianten (Reads) zeigen, Fokus-Kamera, Analyse-Ebenen (Modell-Einschätzung), Zeichnen.
- **Spielerin:** Position wählen („Ich bin die 5“), mit „Weiter“ Beat für Beat: Aufgabe, Wann, Achte auf, Ziel und Haltung; am Read das **Read-Training** (Verteidigung ansehen → entscheiden → Rückmeldung).
- **Bearbeiten:** Figur antippen → Aktion → Ziel antippen; Ziel/Umweg ziehen; Rückgängig; Coaching pro Rolle; „+ Read“ für Varianten. Speichern wird bestätigt, Entwürfe werden automatisch gesichert.
- **Teilen:** Link (öffnet direkt die Spielerinnen-Ansicht), System-Teilen oder Datei – ohne Konto und ohne Server.

## Aufbau
- `src/Taktikboard.jsx` – App-Hülle (Startbildschirm, Import/Sicherung, geteilte Links)
- `src/home/` – Startbildschirm, Neuer Spielzug · `src/board/` – Freies Board (Drag, Zeichnen, Legacy-Presets, REC)
- `e2e/`, `playwright.config.js` – Browser-Tests
- `src/studio/` – Play-Studio: Trainer-, Spielerinnen- und Bearbeiten-Ansicht, Teilen
- `src/play/` – Basketball-Kern ohne UI: Datenmodell, Varianten, Engine, Analyse, Kamera, Plays
- `src/render/` – 2,5D-Spielerinnen, Ball, taktische Ebenen
- `src/ui/`, `src/hooks/`, `src/store/`, `src/court/`, `src/legacy/` – Bühne/Bedienelemente, Hooks, Speicher/Teilen, Spielfeld, Bestand
- `vite.config.js` – Vite + PWA-Konfiguration (Manifest, Service Worker)
- `scripts/gen-icons.mjs`, `public/` – Icons

Architektur, Datenmodell und Stand: siehe [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md).
Produktleitbild: [`NORTH_STAR.md`](NORTH_STAR.md).
