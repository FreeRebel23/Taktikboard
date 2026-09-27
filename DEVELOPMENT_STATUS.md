# Taktikboard – Development Status

## Audit des Ausgangsstands (main @ 28efec8)

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

### Technische Schulden, die die nächste Generation behindern
1. Monolith – jede neue Funktion vergrößert eine Datei, die bereits alles mischt.
2. Das Datenmodell kennt keine Aktionen, keine Beats, keine Beziehungen (wer verteidigt wen, wer passt zu wem).
3. Ball und Ballbesitz sind im Animationspfad nicht modelliert (Snapping existiert nur im Freimodus).
4. Tokens tragen keine Information außer Farbe und Nummer.
5. Timing ist global normiert (0..1) – keine Dauer pro Schritt, keine Schrittnavigation.

### Entscheidung
- **Erhalten:** React/Vite/PWA, Court-Koordinatensystem, SVG-Rendering, Pointer-/Zoom-Handling, Freimodus (Drag, Snapping, Zeichnen), Legacy-Presets, REC (als Legacy).
- **Refaktorieren:** Monolith in Module zerlegen (`court/`, `hooks/`, `ui/`, `legacy/`).
- **Ersetzen (für neue Plays):** Keyframe-Animation → aktionsbasiertes Play-Modell + Engine (`play/`), Kreis-Tokens → 2,5D-Spieler (`render/`).
- **Kein Full Rewrite.**
