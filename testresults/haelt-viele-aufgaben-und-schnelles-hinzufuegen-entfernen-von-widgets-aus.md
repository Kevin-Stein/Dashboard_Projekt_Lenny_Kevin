# hält viele Aufgaben und schnelles Hinzufügen/Entfernen von Widgets aus

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Belastung |
| Testdatei | `tests/stress.spec.js` |
| Dauer | 1.69 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft viele Listeneinträge und das Anlegen/Entfernen mehrerer Widgets.

## Ablauf

- 40 Aufgaben anlegen, 10 wieder löschen.
- Notizen, Kalender, Countdown, Weltzeituhr und Radar hinzufügen und wieder entfernen.

## Erwartetes Ergebnis

Es bleiben 30 Aufgaben. Die Extra-Widgets sind weg, das Aufgaben-Widget bleibt.

## Fehler

_Keine._
