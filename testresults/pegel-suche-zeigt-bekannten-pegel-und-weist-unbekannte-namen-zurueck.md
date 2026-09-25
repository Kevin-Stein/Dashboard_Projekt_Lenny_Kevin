# Pegel-Suche zeigt bekannten Pegel und weist unbekannte Namen zurück

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Eingabefelder |
| Testdatei | `tests/inputs.spec.js` |
| Dauer | 0.86 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft die Pegelsuche mit Treffer und unbekanntem Namen.

## Ablauf

- Dresden suchen.
- Atlantis suchen.

## Erwartetes Ergebnis

Bei Dresden leert sich das Feld und der Diagrammtitel enthält Dresden. Bei Atlantis erscheint der Toast „Kein Pegel mit diesem Namen gefunden“.

## Fehler

_Keine._
