# startet auf Deutsch und wechselt auf Englisch

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 0.82 s |
| Lauf | 4.10.2026, 19:11:28 |

## Zweck

Prüft die Mehrsprachigkeit der Oberfläche inklusive Speichern und Neuladen.

## Ablauf

- Dashboard auf Deutsch öffnen.
- Titel, Übersichtsüberschrift und Navigationspunkte prüfen.
- Im Sprachmenü English wählen und den Reload abwarten.

## Erwartetes Ergebnis

html lang wechselt von de auf en. Titel, Navigation, Slogan und Übersicht erscheinen auf Englisch. Das Sprachmenü bleibt auf en.

## Fehler

_Keine._
