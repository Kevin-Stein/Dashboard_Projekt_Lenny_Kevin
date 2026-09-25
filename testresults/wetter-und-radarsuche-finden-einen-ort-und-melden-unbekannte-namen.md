# Wetter- und Radarsuche finden einen Ort und melden unbekannte Namen

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Eingabefelder |
| Testdatei | `tests/inputs.spec.js` |
| Dauer | 1.15 s |
| Lauf | 25.9.2026, 19:00:00 |

## Zweck

Prüft Treffer und Fehlermeldung der Ortssuche.

## Ablauf

- Wetter nach Hamburg suchen, danach nach xyzzy.
- Radar nach Hamburg und keinort suchen.
- Die Schnellwahl Potsdam klicken.

## Erwartetes Ergebnis

Hamburg erscheint als Ort in Wetter und Seitenleiste. Unbekannte Namen erzeugen eine klare Meldung. Potsdam landet im Radarfeld.

## Fehler

_Keine._
