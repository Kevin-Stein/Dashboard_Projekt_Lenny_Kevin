# Kalender und Countdown rendern Payloads nicht als HTML

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Code-Injection |
| Testdatei | `tests/injection.spec.js` |
| Dauer | 1.07 s |
| Lauf | 25.9.2026, 19:50:33 |

## Zweck

Prüft, dass Widget-Titel aus Nutzereingaben über textContent und nicht als HTML gerendert werden.

## Ablauf

- Kalendertermin mit img-onerror-Payload anlegen.
- Countdown mit script-Payload starten.

## Erwartetes Ergebnis

Die Texte erscheinen wörtlich. Es wird kein img oder script im Titel erzeugt, kein Dialog.

## Fehler

_Keine._
