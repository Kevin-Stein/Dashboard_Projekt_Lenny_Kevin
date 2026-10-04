# öffnet das Versions-Changelog als Popup

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 1.05 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft den Navigationspunkt Version unter der Dokumentation und das Changelog der Version 2.

## Ablauf

- Dashboard auf Deutsch öffnen.
- Prüfen, dass Version unter Dokumentation steht und nicht in der Seiten-Navigation.
- Version anklicken, Changelog lesen, mit Escape schließen.
- Auf Englisch wechseln, erneut öffnen und mit × schließen.

## Erwartetes Ergebnis

In der Seitenleiste steht dauerhaft „Version 2.0.0“. Der Dialog zeigt Version 2.0.0 und den Hinweis zu Änderungen nach dem 28. September 2026. Escape und Schließen blenden das Fenster aus. Englisch: after 28 September 2026.

## Fehler

_Keine._
