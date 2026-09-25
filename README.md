# Dashboard Projekt - Lenny & Kevin

## test test

**Katastrophenschutz – „Wir helfen Berlin“**: ein interaktives Dashboard für Berlin mit Wetter, Warnungen, Feuerwehr-Einsätzen und frei anordenbaren Widgets. Standardort ist Berlin.

## Features

- **Wetter**: Aktuelle Wetterdaten und 6-Tage-Vorhersage (Open-Meteo API)
- **Regenradar**: Live-Radardaten mit RainViewer und OpenWeather
- **Kalender**: als Widget auf jeder Seite hinzufügbar – Monatsansicht mit Terminverwaltung im lokalen Speicher
- **Feuerwehr**: Brandeinsätze der Berliner Feuerwehr der letzten 7 Tage (Berliner Feuerwehr Open Data)
- **Wasserpegel**: aktuelle Wasserstände der Bundeswasserstraßen ([PEGELONLINE](https://pegelonline.wsv.de/gast/start), WSV) – Standard ist Berlin-Köpenick, weitere Pegel per Suche oder aus der Liste der Berliner Pegel; 7-Tage-Verlauf mit MNW/MW/MHW
- **Übersicht**: frei zusammenstellbar – Widgets aller Bereiche hinzufügen, entfernen und per „Anordnen“ verschieben. Verfügbare Widgets u. a.:
  - Wetter, Kennzahlen, Vorhersage, Regenchance, Temperaturverlauf, Mini-Regenradar
  - Feuerwehr-Kennzahlen, -Diagramm und -Tabelle
  - Termine heute, Familien-Treffpunkt
  - Aufgabenliste (To-do)
  - Notizen
  - Weltzeituhr
  - Countdown
  - Amtliche Warnungen (BBK/NINA)
  - Notfall-Checkliste
  - Notrufnummern
- **Alle Seiten**: oben „✥ Anordnen“ zum Verschieben und Größe ändern und „+ Widget“, um zusätzliche Widgets auf genau dieser Seite einzublenden
- **Standard-Layout**: Alle Seiten außer der Übersicht haben ein festes Standard-Layout. Im Anordnen-Modus erscheint „↺ Zurücksetzen“, das nach einer Rückfrage die Seite wieder auf den Standard setzt

## Funktionen

- Light/Dark Mode
- Automatische Daten-Aktualisierung
- Responsive Design
- Ortsbasierte Wetteranzeige
- Interaktive Karten (Leaflet)

## Technologie-Stack

- HTML5
- CSS3 (mit CSS Variables für Themes)
- Vanilla JavaScript
- Leaflet.js für Karten
- Open-Meteo API
- RainViewer API
- OpenWeather API

## Entwicklung

Das Projekt besteht aus drei Hauptdateien:
- `index.html` - HTML-Struktur
- `css/style.css` - Alle Styles
- `js/app.js` - JavaScript-Funktionen

### Lokal starten

```bash
node dev-server.js
```

Dann http://localhost:3000 öffnen. Die amtlichen Warnungen laufen über `api/warnings.js` (auf Vercel als Serverless-Funktion), weil `warnung.bund.de` keine direkten Browser-Abrufe erlaubt. Beim reinen Öffnen der `index.html` oder mit Live Server bleiben die Warnungen deshalb leer.

### API-Key für OpenWeather

`js/config.example.js` nach `js/config.js` kopieren und den eigenen OpenWeather-Key eintragen.
`js/config.js` ist in `.gitignore` und wird nicht committet. Ohne Key läuft das Regenradar nur mit RainViewer.

### Fehlerbehandlung

Alle Datenabrufe laufen über `fetchData()` in `js/app.js`: 12 s Timeout, eine automatische Wiederholung bei Netzfehlern, HTTP 429 und 5xx sowie verständliche Meldungen (offline, Timeout, Dienst gestört, fehlerhafte Daten). Fällt eine Quelle aus, zeigt das Widget den Grund und „Erneut versuchen“; vorhandene Daten bleiben sichtbar. Nach „Aktualisieren“ steht in der Seitenleiste, welche Bereiche fehlgeschlagen sind. Offline/Online wird erkannt, ohne Leaflet laufen alle anderen Bereiche weiter. `api/warnings.js` bricht einzelne Warnquellen nach 8 s ab und meldet Teilausfälle im Header `X-Warnings-Failed`. Details stehen in der Dokumentation unter „Fehlerbehandlung“.

### Cursor-Skills

Projekt-Skills liegen in `.cursor/skills/<name>/SKILL.md` und werden mit dem Repository geteilt. Vorlage und Regeln stehen in [`.cursor/skills/README.md`](.cursor/skills/README.md). Der Ordner wird über `.vercelignore` nicht mit auf Vercel veröffentlicht.


### Lizenzen

**Daten und Dienste**

| Quelle | Verwendung | Lizenz / Bedingungen |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | Wetter, Vorhersage, Ortssuche | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), kostenlos für nicht-kommerzielle Nutzung ([Bedingungen](https://open-meteo.com/en/terms)); Ortsdaten der Suche von [GeoNames](https://www.geonames.org/) (CC BY 4.0) |
| [RainViewer](https://www.rainviewer.com/) | Regenradar | kostenlose öffentliche API mit Namensnennung ([Nutzungsbedingungen](https://www.rainviewer.com/terms.html)) |
| [OpenWeather](https://openweathermap.org/) | Niederschlags-Kartenebene | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/) mit Pflicht zur Namensnennung „Weather data provided by OpenWeather“ ([Bedingungen](https://openweathermap.org/terms)) |
| [Esri World Light Gray Base](https://www.arcgis.com/home/item.html?id=ed712cb1db3e4bae9e85329040fb9a49) | Hintergrundkarte | [Esri-Nutzungsbedingungen](https://www.esri.com/en-us/legal/terms/full-master-agreement), Namensnennung: Esri, HERE, Garmin, FAO, NOAA, USGS |
| [Berliner Feuerwehr – BF-Open-Data](https://github.com/Berliner-Feuerwehr/BF-Open-Data) | Feuerwehr-Einsätze | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), © Berliner Feuerwehr |
| [PEGELONLINE](https://www.pegelonline.wsv.de/) (WSV / ITZBund) | Wasserpegel | [Datenlizenz Deutschland – Zero – 2.0](https://www.govdata.de/dl-de/zero-2-0) |
| [warnung.bund.de](https://warnung.bund.de/) (BBK, NINA) | Amtliche Warnungen | keine ausdrückliche Lizenz angegeben; amtliche Warnmeldungen, Quelle: Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK) und die jeweils herausgebende Stelle (z. B. DWD) |

**Bibliotheken und Schriften**

| Quelle | Verwendung | Lizenz |
|---|---|---|
| [Leaflet 1.9.4](https://leafletjs.com/) (über cdnjs) | Karten | [BSD 2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) |
| [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) | Schrift | [SIL Open Font License 1.1](https://openfontlicense.org/) |
| [Fraunces](https://fonts.google.com/specimen/Fraunces) (Google Fonts) | Schrift | [SIL Open Font License 1.1](https://openfontlicense.org/) |
