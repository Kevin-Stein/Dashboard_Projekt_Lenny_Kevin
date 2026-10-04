# öffnet den Widget-Katalog auf Deutsch und Englisch

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 1.08 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft den Widget-Katalog und dessen Übersetzung.

## Ablauf

- Auf der Übersicht „+ Widget“ öffnen und Gruppentitel prüfen.
- Den Katalog schließen.
- Auf Englisch wechseln und den Katalog erneut öffnen.

## Erwartetes Ergebnis

Deutsch: „Widget hinzufügen“, „Kalender & Organisation“, „Aktuelles Wetter“, Plus statt Haken und Anzahl 1. Englisch: „Add widget“, „Calendar & organisation“, „Current weather“. Schließen blendet den Overlay aus.

## Fehler

_Keine._
