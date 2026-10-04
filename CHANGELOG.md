# Changelog

Alle wesentlichen Änderungen am Dashboard stehen in dieser Datei.

Das Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung [Semantic Versioning](https://semver.org/lang/de/).

## [2.0.0] - 2026-10-04

Alle Änderungen nach dem 28. September 2026.

### Added

- Versionspunkt in der Seitenleiste mit Changelog-Fenster
- Standard-Widgets auf der Übersicht beim ersten Start
- Wiederverwendbare Widget-Komponenten: eine Quelle, Klone auf Übersicht und Unterseiten
- Kachellayout im F-Muster von links nach rechts, Zeile für Zeile
- Kacheln bleiben im sichtbaren Bereich, auch nach manuellem Anordnen

### Changed

- Theme-Wechsel (Hell/Dunkel) angepasst
- Farbschema, Diagramme und Kacheloptik
- Kacheln umschließen ihren Inhalt statt die Seite zu füllen
- Wetterseite: Regenradar unter aktuellem Wetter, Vorhersage an den Balken
- Übersicht und Unterseiten zeigen dieselbe Widget-Darstellung

### Removed

- Familien-Treffpunkt

### Fixed

- Skalierung bei hohen Bildschirmauflösungen
- 7-Tage-Wetter wird korrekt dargestellt
- Widgets lassen sich nur noch im Modus Anordnen entfernen
- Wetter-Leuchteffekt bleibt innerhalb der Kachel
- Regenradar überlappt die Vorhersage nicht mehr
