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

## Aufbau
- `src/Taktikboard.jsx` – die komplette App-Komponente
- `src/main.jsx` – React-Einstiegspunkt
- `vite.config.js` – Vite + PWA-Konfiguration (Manifest, Service Worker)
- `scripts/gen-icons.mjs` – generiert die PWA-Icons
- `public/` – Icons & favicon
