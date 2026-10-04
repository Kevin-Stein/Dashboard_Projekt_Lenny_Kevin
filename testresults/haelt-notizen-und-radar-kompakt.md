# hält Notizen und Radar kompakt

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 0.91 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft, dass Notizen und Regenradar nicht die ganze Seitenbreite nutzen.

## Ablauf

- Notizen-Widget auf der Übersicht hinzufügen und die Breite messen.
- Wetter-Panel auf Übersicht und Wetterseite vergleichen.
- Wetterseite öffnen und die Radar-Breite messen.

## Erwartetes Ergebnis

Notizen sind schmaler als die halbe Übersicht. Das Wetter-Panel ist auf Übersicht und Wetterseite gleich breit. Der Pegelverlauf ist mindestens 500 Pixel breit, das Diagramm nicht gequetscht. Das Radar ist schmaler als 65 Prozent der Wetterseite.

## Fehler

_Keine._
