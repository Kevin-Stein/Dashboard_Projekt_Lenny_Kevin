# bindet dasselbe Widget mehrfach zum Vergleich ein

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 1.49 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft, dass Wetter und Pegel mehrfach mit eigener Suche liegen können.

## Ablauf

- Auf der Übersicht „Aktuelles Wetter“ ein zweites Mal hinzufügen und Lissabon suchen.
- „Pegelverlauf“ ein zweites Mal hinzufügen und Dresden suchen.

## Erwartetes Ergebnis

Die zweite Wetterkachel zeigt Lissabon, die Wetterseite bleibt Berlin. Die zweite Pegelkachel zeigt Dresden, die Pegel-Quelle nicht.

## Fehler

_Keine._
