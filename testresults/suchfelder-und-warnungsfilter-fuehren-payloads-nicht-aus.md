# Suchfelder und Warnungsfilter führen Payloads nicht aus

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Code-Injection |
| Testdatei | `tests/injection.spec.js` |
| Dauer | 1.42 s |
| Lauf | 25.9.2026, 19:00:00 |

## Zweck

Prüft Injection in Wetter-, Radar- und Pegelsuche sowie im Warnungsfilter, inklusive Anzeige des Suchbegriffs in Meldungen.

## Ablauf

- Wetter nach einem img-onerror- und einem script-Payload suchen (Treffer über die Test-API).
- Denselben img-Payload in Radar, Warnungsfilter und Pegelsuche absenden.

## Erwartetes Ergebnis

Ort, Leer-Meldung und Toast zeigen den Payload als Text. Keine eingefügten img/script-Knoten, kein Dialog.

## Fehler

_Keine._
