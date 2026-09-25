# startet auf Deutsch und wechselt auf Englisch

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Dashboard |
| Testdatei | `tests/dashboard.spec.js` |
| Dauer | 0.69 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft die Mehrsprachigkeit der Oberfläche inklusive Speichern und Neuladen.

## Ablauf

- Dashboard auf Deutsch öffnen.
- Titel, Übersichtsüberschrift und Navigationspunkte prüfen.
- Im Sprachmenü English wählen und den Reload abwarten.

## Erwartetes Ergebnis

html lang wechselt von de auf en. Titel, Navigation und Übersicht erscheinen auf Englisch. Das Sprachmenü bleibt auf en.

## Fehler

_Keine._
