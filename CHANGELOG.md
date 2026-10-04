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
- Dasselbe Widget mehrfach einbinden, z. B. zwei Wetterorte oder zwei Pegel zum Vergleich
- Kachellayout im F-Muster von links nach rechts, Zeile für Zeile
- Kacheln bleiben im sichtbaren Bereich, auch nach manuellem Anordnen
- Warn-Banner oben auf allen Seiten mit Lauftext, konfigurierbar unter Organisation
- Seitenleistenpunkt „Gegen Langeweile“ mit Spielkacheln (Klondike-Solitaire und Tic Tac Toe)

### Changed

- Schriften größer als Full HD (über 1920 px Breite, typisch >27"): aus etwa 1,4–2 m lesbar; darunter, Tablet und Mobil die kompakte Größe
- Widgets im Anordnen-Modus frei in Breite und Höhe skalieren
- Kleine Kacheln rücken in den freien Raum neben hohen Widgets
- Eine gemeinsame Widget-Fläche pro Seite statt getrennter Reihen
- Zurücksetzen der Übersicht stellt die Standard-Widgets wieder her, statt sie zu löschen
- README enthält nur lokalen Start und den Live-Link, alles Weitere steht in der Dokumentation
- Theme-Wechsel (Hell/Dunkel) angepasst
- Farbschema, Diagramme und Kacheloptik
- Kacheln umschließen ihren Inhalt statt die Seite zu füllen
- Wetterseite: Regenradar unter aktuellem Wetter, Vorhersage an den Balken
- Übersicht und Unterseiten zeigen dieselbe Widget-Darstellung
- Die Seite Katastrophenschutz heißt Organisation

### Removed

- Familien-Treffpunkt

### Fixed

- Skalierung bei hohen Bildschirmauflösungen
- 7-Tage-Wetter wird korrekt dargestellt
- Feuerwehr-Einsätze werden wieder angezeigt
- Widgets lassen sich nur noch im Modus Anordnen entfernen
- Wetter-Leuchteffekt bleibt innerhalb der Kachel
- Regenradar überlappt die Vorhersage nicht mehr
- Pegelverlauf füllt die Kachel beim Skalieren
- Pegel-Buttons so breit wie ihr Text
- Kennzahlen (Wetter, Feuerwehr, Pegel) als einzelne Widgets mit eigener Überschrift
- Nach Zurücksetzen der Wetterseite lässt sich die Breite wieder anpassen
