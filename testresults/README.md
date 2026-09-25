# Testergebnisse

Letzter Lauf: **25.9.2026, 19:00:00** · 22 Tests in 8.5 s · 22 bestanden, 0 fehlgeschlagen, 0 übersprungen.

Die Dateien in diesem Ordner werden bei jedem `npm test` neu geschrieben: Übersicht plus eine Markdown-Datei je Test mit Zweck, Ablauf und Ergebnis.

## Dashboard

| Test | Status | Dauer |
| --- | --- | --- |
| [zeigt den Sprachwechsler neben dem Farbmodus](zeigt-den-sprachwechsler-neben-dem-farbmodus.md) | bestanden | 0.53 s |
| [öffnet das Menü auf dem Smartphone](oeffnet-das-menue-auf-dem-smartphone.md) | bestanden | 0.60 s |
| [wechselt den Farbmodus](wechselt-den-farbmodus.md) | bestanden | 0.76 s |
| [startet auf Deutsch und wechselt auf Englisch](startet-auf-deutsch-und-wechselt-auf-englisch.md) | bestanden | 0.85 s |
| [öffnet den Widget-Katalog auf Deutsch und Englisch](oeffnet-den-widget-katalog-auf-deutsch-und-englisch.md) | bestanden | 1.05 s |
| [wechselt alle Seiten in der Navigation](wechselt-alle-seiten-in-der-navigation.md) | bestanden | 1.17 s |
## Dokumentation

| Test | Status | Dauer |
| --- | --- | --- |
| [zeigt die deutsche Doku und wechselt auf Englisch](zeigt-die-deutsche-doku-und-wechselt-auf-englisch.md) | bestanden | 0.88 s |
## Eingabefelder

| Test | Status | Dauer |
| --- | --- | --- |
| [leeres Absenden ändert Wetter, Radar und Pegel nicht](leeres-absenden-aendert-wetter-radar-und-pegel-nicht.md) | bestanden | 1.02 s |
| [Wetter- und Radarsuche finden einen Ort und melden unbekannte Namen](wetter-und-radarsuche-finden-einen-ort-und-melden-unbekannte-namen.md) | bestanden | 1.15 s |
| [Warnungsfilter und Checkliste reagieren auf Eingaben](warnungsfilter-und-checkliste-reagieren-auf-eingaben.md) | bestanden | 0.74 s |
| [Radar-Anbieter und Auto-Aktualisierung lassen sich umschalten](radar-anbieter-und-auto-aktualisierung-lassen-sich-umschalten.md) | bestanden | 0.59 s |
| [Pegel-Suche zeigt bekannten Pegel und weist unbekannte Namen zurück](pegel-suche-zeigt-bekannten-pegel-und-weist-unbekannte-namen-zurueck.md) | bestanden | 0.80 s |
| [Familien-Treffpunkt speichert Text inklusive Sonderzeichen](familien-treffpunkt-speichert-text-inklusive-sonderzeichen.md) | bestanden | 1.23 s |
| [Aufgaben, Notizen, Kalender und Countdown nehmen Eingaben an](aufgaben-notizen-kalender-und-countdown-nehmen-eingaben-an.md) | bestanden | 1.90 s |
## Code-Injection

| Test | Status | Dauer |
| --- | --- | --- |
| [Kalender und Countdown rendern Payloads nicht als HTML](kalender-und-countdown-rendern-payloads-nicht-als-html.md) | bestanden | 1.24 s |
| [Suchfelder und Warnungsfilter führen Payloads nicht aus](suchfelder-und-warnungsfilter-fuehren-payloads-nicht-aus.md) | bestanden | 1.42 s |
| [Treffpunkt, Notizen und Aufgaben speichern Payloads nur als Text](treffpunkt-notizen-und-aufgaben-speichern-payloads-nur-als-text.md) | bestanden | 7.75 s |
## Belastung

| Test | Status | Dauer |
| --- | --- | --- |
| [leere Formulare und lange Texte bringen die Oberfläche nicht zum Absturz](leere-formulare-und-lange-texte-bringen-die-oberflaeche-nicht-zum-absturz.md) | bestanden | 1.44 s |
| [hält viele Aufgaben und schnelles Hinzufügen/Entfernen von Widgets aus](haelt-viele-aufgaben-und-schnelles-hinzufuegen-entfernen-von-widgets-aus.md) | bestanden | 1.85 s |
| [hält schnelles Umschalten aller Seiten aus](haelt-schnelles-umschalten-aller-seiten-aus.md) | bestanden | 2.08 s |
| [hält schnelles Umschalten von Theme, Menü und Widget-Auswahl aus](haelt-schnelles-umschalten-von-theme-menue-und-widget-auswahl-aus.md) | bestanden | 2.48 s |
| [hält wiederholtes Aktualisieren und Sprachwechsel aus](haelt-wiederholtes-aktualisieren-und-sprachwechsel-aus.md) | bestanden | 3.64 s |


## Start

```bash
npm test
```
