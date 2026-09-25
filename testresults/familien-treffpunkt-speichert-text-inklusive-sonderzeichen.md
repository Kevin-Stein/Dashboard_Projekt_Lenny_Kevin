# Familien-Treffpunkt speichert Text inklusive Sonderzeichen

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Eingabefelder |
| Testdatei | `tests/inputs.spec.js` |
| Dauer | 1.23 s |
| Lauf | 25.9.2026, 19:00:00 |

## Zweck

Prüft Speichern, Reload und dass HTML nicht als Script ausgeführt wird.

## Ablauf

- Im Treffpunkt `<script>alert(1)</script> bei Oma` eintragen.
- Auf „Gespeichert“ warten und die Seite neu laden.

## Erwartetes Ergebnis

Der Text bleibt unverändert im Feld. Es öffnet sich kein Dialog. Nach dem Reload ist derselbe Text wieder da.

## Fehler

_Keine._
