# hält schnelles Umschalten von Theme, Menü und Widget-Auswahl aus

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Belastung |
| Testdatei | `tests/stress.spec.js` |
| Dauer | 2.48 s |
| Lauf | 25.9.2026, 19:00:00 |

## Zweck

Belastet Theme, Widget-Katalog und Anordnen-Modus durch viele Klicks.

## Ablauf

- Theme 20-mal umschalten.
- Widget-Katalog 15-mal öffnen und schließen.
- Anordnen 12-mal umschalten.

## Erwartetes Ergebnis

Die betroffenen Knöpfe bleiben bedienbar, der Katalog öffnet und schließt zuverlässig.

## Fehler

_Keine._
