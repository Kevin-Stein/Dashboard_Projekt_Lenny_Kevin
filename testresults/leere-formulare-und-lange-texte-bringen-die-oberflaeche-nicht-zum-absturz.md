# leere Formulare und lange Texte bringen die Oberfläche nicht zum Absturz

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Belastung |
| Testdatei | `tests/stress.spec.js` |
| Dauer | 1.30 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft leere Absenden und einen 4000-Zeichen-Text mit HTML und Umlauten.

## Ablauf

- Wetter, Radar, Warnungen und Pegel mehrfach leer absenden.
- Denselben langen Text in die Felder schreiben.

## Erwartetes Ergebnis

Unbekannte Orte und Pegel werden gemeldet. Der Treffpunkt speichert. Das Sprachmenü bleibt sichtbar.

## Fehler

_Keine._
