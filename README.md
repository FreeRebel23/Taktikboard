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
npm test           # Play-Modell, Animation Engine, Press-Break-Szenario (node:test)
```

## Aufbau
- `src/Taktikboard.jsx` – App-Orchestrierung (Freimodus, Legacy-Presets, aktionsbasierte Plays)
- `src/play/` – Play-Datenmodell, Aktionen, Animation Engine, Plays (z. B. `plays/pressBreak.js`)
- `src/render/` – 2,5D-Spielerinnen, Ball, taktische Ebenen
- `src/court/`, `src/hooks/`, `src/ui/`, `src/legacy/` – Spielfeld, Gesten/Playback, UI, Bestand (Keyframes, REC)
- `src/main.jsx` – React-Einstiegspunkt
- `vite.config.js` – Vite + PWA-Konfiguration (Manifest, Service Worker)
- `scripts/gen-icons.mjs` – generiert die PWA-Icons
- `public/` – Icons & favicon

Architektur, Datenmodell und Stand: siehe [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md).
Produktleitbild: [`NORTH_STAR.md`](NORTH_STAR.md).
