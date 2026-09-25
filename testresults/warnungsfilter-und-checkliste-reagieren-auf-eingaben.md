# Warnungsfilter und Checkliste reagieren auf Eingaben

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Eingabefelder |
| Testdatei | `tests/inputs.spec.js` |
| Dauer | 0.64 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft Filter der amtlichen Warnungen und das Abhaken der Notfall-Checkliste.

## Ablauf

- Warnungen nach Dresden filtern, danach nach xyzzy.
- Den ersten Checklistenpunkt abhaken.

## Erwartetes Ergebnis

Dresden zeigt genau eine Warnung. xyzzy zeigt die Leer-Meldung. Der erste Listenpunkt hat die Klasse done.

## Fehler

_Keine._
