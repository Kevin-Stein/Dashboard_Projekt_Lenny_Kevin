# Dashboard Projekt - Lenny & Kevin

## test test

**Katastrophenschutz – „Wir helfen Berlin“**: ein interaktives Dashboard für Berlin mit Wetter, Warnungen, Feuerwehr-Einsätzen und frei anordenbaren Widgets. Standardort ist Berlin.

## Features

- **Wetter**: Aktuelle Wetterdaten und 6-Tage-Vorhersage (Open-Meteo API)
- **Regenradar**: Live-Radardaten mit RainViewer und OpenWeather
- **Kalender**: Terminverwaltung mit lokalen Speicher
- **Feuerwehr**: Brandeinsätze der Berliner Feuerwehr der letzten 7 Tage (Berliner Feuerwehr Open Data)
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

### API-Key für OpenWeather

`js/config.example.js` nach `js/config.js` kopieren und den eigenen OpenWeather-Key eintragen.
`js/config.js` ist in `.gitignore` und wird nicht committet. Ohne Key läuft das Regenradar nur mit RainViewer.

## Lizenz

Schulprojekt - Lernfeld 5+8 Binder
