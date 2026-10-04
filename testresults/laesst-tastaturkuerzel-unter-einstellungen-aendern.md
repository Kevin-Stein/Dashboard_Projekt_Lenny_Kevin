# lässt Tastaturkürzel unter Einstellungen ändern

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 0.82 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft, dass Kürzel im Dialog Einstellungen neu belegt werden.

## Ablauf

- Einstellungen öffnen, Wetter-Kürzel anklicken und W drücken.
- Dialog mit Escape schließen, W und danach 2 drücken.

## Erwartetes Ergebnis

W öffnet Wetter. 2 bleibt auf Wetter, weil 2 nicht mehr belegt ist.

## Fehler

_Keine._
