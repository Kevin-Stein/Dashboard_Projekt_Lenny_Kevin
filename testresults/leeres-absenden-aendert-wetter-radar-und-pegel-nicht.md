# leeres Absenden ändert Wetter, Radar und Pegel nicht

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Eingabefelder |
| Testdatei | `tests/inputs.spec.js` |
| Dauer | 0.86 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft, dass leere Suchfelder nichts auslösen.

## Ablauf

- Wetter: nur Leerzeichen absenden.
- Radar: leeres Formular absenden.
- Pegel: nur Leerzeichen absenden.

## Erwartetes Ergebnis

Der Wetterort bleibt unverändert, es erscheint keine Ladezeile. Radar und Pegel zeigen keinen Hinweis-Toast.

## Fehler

_Keine._
