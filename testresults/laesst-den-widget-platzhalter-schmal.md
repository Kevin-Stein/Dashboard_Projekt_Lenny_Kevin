# lässt den Widget-Platzhalter schmal

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 0.70 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft, dass die Fläche „Widget hinzufügen“ nicht die Restbreite der Seite ausfüllt.

## Ablauf

- Auf der Übersicht die Breite des Platzhalters messen.
- Katastrophenschutz öffnen und den Platzhalter in der Widget-Zeile messen.

## Erwartetes Ergebnis

Der Platzhalter ist schmaler als 240 Pixel und nimmt auf Katastrophenschutz weniger als 35 Prozent der Seitenbreite ein.

## Fehler

_Keine._
