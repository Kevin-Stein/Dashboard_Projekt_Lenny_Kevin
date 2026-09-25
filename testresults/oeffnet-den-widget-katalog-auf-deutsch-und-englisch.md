# öffnet den Widget-Katalog auf Deutsch und Englisch

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 1.07 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft den Widget-Katalog und dessen Übersetzung.

## Ablauf

- Auf der Übersicht „+ Widget“ öffnen und Gruppentitel prüfen.
- Den Katalog schließen.
- Auf Englisch wechseln und den Katalog erneut öffnen.

## Erwartetes Ergebnis

Deutsch: „Widget hinzufügen“, „Kalender & Organisation“, „Aktuelles Wetter“. Englisch: „Add widget“, „Calendar & organisation“, „Current weather“. Schließen blendet den Overlay aus.

## Fehler

_Keine._
