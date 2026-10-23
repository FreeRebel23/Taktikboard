# Gerätetest iOS / Android – Checkliste

Automatisiert abgedeckt (Playwright, siehe `e2e/`): Chromium mit Pixel-7- und Tablet-Profil,
in CI zusätzlich **WebKit** (Safari-Engine) mit iPhone-13- und iPad-Profil.
Emulation ersetzt **keine** echten Geräte: Installation, Speicherverhalten, Share-Sheet,
Messenger-Browser und Touch-Gefühl müssen real geprüft werden.

**Voraussetzung:** HTTPS-Adresse (siehe [PILOT.md](PILOT.md)). Mit `localhost`/LAN-IP sind Offline
und Installation nicht prüfbar.

## Geräte (Minimum)

| Gerät | System | Browser |
|---|---|---|
| iPhone (klein, z. B. SE/13 mini) | iOS ≥ 16.4 | Safari + installierte App |
| iPhone (groß) oder iPad | iOS/iPadOS ≥ 16.4 | Safari |
| Android-Handy (Mittelklasse) | Android ≥ 11 | Chrome + installierte App |
| optional: Samsung Internet, Firefox Android | | |

iOS < 16.4 kann komprimierte Links nicht öffnen – die App zeigt dann eine verständliche Meldung
(Datei als Alternative).

## Ablauf (ca. 30 min je Gerät)

Ergebnis je Zeile: ✓ / ✗ + Notiz. Bei ✗ Bildschirmfoto machen.

### A. Installation & Offline
1. Adresse öffnen, Startbildschirm erscheint mit Beispielen.
2. App installieren (iOS: Teilen → Zum Home-Bildschirm; Android: Menü → App installieren).
3. Installierte App öffnen → Vollbild ohne Browserleiste, Notch/Home-Indikator verdecken nichts.
4. Flugmodus an → App schließen und neu öffnen → Beispiele abspielbar, eigene Spielzüge da.
5. Flugmodus aus.

### B. Spielerinnen-Modus (Hochformat)
6. „Press Break“ → „Als Spielerin“ → Kurzanleitung sichtbar, Nummer 5 wählen.
7. **„▶ Weiter“ ist ohne Scrollen sichtbar**, alle Knöpfe gut mit dem Daumen treffbar.
8. Aufgabe lesbar (Sonnenlicht/Hallenlicht prüfen), „DU“, Ziel-Schatten, „ACHTE AUF …“ nicht abgeschnitten.
9. Read: „Verteidigung ansehen und entscheiden“ → Antwort → Rückmeldung → „Lösung ansehen“ läuft.
10. Zeitlupe 🐢, Schritt nochmal ↻, Zeitleiste mit dem Finger ziehen.
11. Gerät drehen (Querformat) → Feld größer, nichts überlappt.

### B2. Mannschaft und Verteidigung
- „Mann-Mann – Help & Recover“ → Lernen → **Team**: Zustandsplaketten (DRUCK, DENY, HELP …) im Sonnen-/Hallenlicht lesbar, nicht verdeckt.
- Position antippen, ＋ für Zusammenspiel, „Angriff ⇄“ – Wechsel ohne Ruckeln.
- „2-3-Zone“: Übergabe beim Cut (Beat 4) sichtbar; Zonenräume stören nicht.
- Pässe: Bodenpass (Aufsetzring), Lob (hoher Bogen) und Direktpass (Tempostreifen) ohne Text unterscheidbar.

### C. Trainer:in / Builder (Tablet oder Handy quer)
12. „+ Neuer Spielzug“ → Vorlage „Horns“ → Beat 1: Spielerin antippen → „Cut“ → Ziel antippen.
13. Ziel-Raute mit dem Finger verschieben; Pinch-Zoom und Verschieben des Feldes.
14. Speichern → „✓ Gespeichert HH:MM“. App komplett schließen, neu öffnen → Spielzug da.
15. Änderung machen, **nicht** speichern, App schließen → beim Öffnen „Ungesicherte Entwürfe“ → wiederherstellen.
16. „← Fertig“ mit ungespeicherten Änderungen → Rückfrage erscheint.
16b. Beat → „Mann-Mann“ für alle fünf; Aufstellung → Regel „Eine Passlänge entfernt: Lücke“ → Beat abspielen: Verteidigung steht anders.

### D. Teilen
17. Teilen → „Teilen …“ → System-Teilen-Dialog (WhatsApp/Messenger) → an zweites Gerät.
18. Link auf dem zweiten Gerät **im Messenger** öffnen → Spielerinnen-Ansicht erscheint.
19. Link im **Standardbrowser** öffnen → „In meine Spielzüge“ → gespeichert, erscheint auf dem Startbildschirm.
20. „Datei teilen“ / „Datei speichern“ → Datei auf dem zweiten Gerät über „Importieren“ laden.
21. „App teilen“ → QR-Code mit der Kamera des zweiten Geräts scannen → App öffnet.

### E. Datensicherheit
22. „Sicherung herunterladen“ → Datei landet in Dateien/Downloads, lässt sich öffnen.
23. Sicherung auf anderem Gerät importieren → gleiche Spielzüge.
24. **iOS-Speichertrennung:** Spielzug in Safari speichern → in der installierten App fehlt er (erwartet, so dokumentiert).
25. Privater Modus (Safari privat): Speichern → klare Meldung oder Erfolg; **nie** „Gespeichert“, wenn nach Neuladen weg.
26. Nach ≥ 8 Tagen ohne Nutzung (iOS, installiert): Spielzüge noch vorhanden.

## Protokoll-Vorlage

| Nr. | iPhone (Safari) | iPhone (App) | Android (Chrome) | Android (App) | Notiz |
|---|---|---|---|---|---|
| 1 | | | | | |
| … | | | | | |

## Bekannte Grenzen
* iOS hat keinen „App installieren“-Dialog; die Anleitung steht in PILOT.md und in „App teilen“.
* Messenger-Browser speichern Daten oft nicht dauerhaft – dort nur ansehen.
* Sehr große Spielzüge erzeugen lange Links (3–6 kB); manche SMS-Apps kürzen sie → Datei nutzen.
