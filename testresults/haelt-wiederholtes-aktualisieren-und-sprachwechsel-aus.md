# hält wiederholtes Aktualisieren und Sprachwechsel aus

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Belastung |
| Testdatei | `tests/stress.spec.js` |
| Dauer | 3.64 s |
| Lauf | 25.9.2026, 19:00:00 |

## Zweck

Belastet Aktualisieren, Auto-Refresh und den Sprachwechsel inkl. Reload.

## Ablauf

- Aktualisieren und Auto-Aktualisierung je achtmal klicken.
- Vier Sprachwechsel Deutsch/Englisch auslösen.

## Erwartetes Ergebnis

Die Oberfläche bleibt Deutsch mit der Überschrift „Meine Übersicht“. Der Aktualisieren-Knopf bleibt sichtbar.

## Fehler

_Keine._
