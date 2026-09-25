# Treffpunkt, Notizen und Aufgaben speichern Payloads nur als Text

| | |
| --- | --- |
| Status | **bestanden** |
| Suite | Code-Injection |
| Testdatei | `tests/injection.spec.js` |
| Dauer | 7.75 s |
| Lauf | 25.9.2026, 19:00:00 |

## Zweck

Prüft XSS- und HTML-Payloads in Treffpunkt, Aufgaben und Notizen. Gespeicherter Text darf nicht als Code laufen.

## Ablauf

- Mehrere Payloads (script, img onerror, svg onload, textarea-Breakout, javascript:-URL, Template-Injection) nacheinander in den Treffpunkt schreiben und neu laden.
- Dasselbe img-onerror als Aufgabe anlegen.
- Den textarea-Breakout in die Notizen schreiben.

## Erwartetes Ergebnis

Kein alert/prompt. Kein eingefügtes img/svg/iframe. Werte stehen unverändert als Text in den Feldern bzw. in der Aufgabenliste.

## Fehler

_Keine._
