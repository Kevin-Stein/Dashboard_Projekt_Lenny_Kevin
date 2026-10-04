# Dashboard Projekt – Lenny & Kevin

Katastrophenschutz – „Wir helfen Berlin“.

**Live:** [https://dashboard-projekt-lenny-kevin.vercel.app/](https://dashboard-projekt-lenny-kevin.vercel.app/)

Bedienung, Widgets, APIs, Tests und Lizenzen stehen in der [Dokumentation](docs.html) (`docs.html` im Browser oder **Dokumentation** in der Seitenleiste des Dashboards).

## Lokal starten

### Voraussetzungen

| Programm | Wofür | Installation |
|---|---|---|
| [Node.js](https://nodejs.org/) 18 oder neuer (LTS) | Server `dev-server.js`, bringt **npm** mit | Installer von der Website. Danach `node -v` und `npm -v` prüfen |
| [Git](https://git-scm.com/) | Repository klonen | Installer von der Website, auf Linux oft schon dabei |
| Ein aktueller Browser | Dashboard anzeigen | Chrome, Firefox, Edge oder Safari |

```bash
# Linux (Arch / CachyOS)
sudo pacman -S nodejs npm git

# Debian / Ubuntu
sudo apt install nodejs npm git

# macOS (Homebrew)
brew install node git
```

Unter Windows den LTS-Installer von [nodejs.org](https://nodejs.org/) und [Git for Windows](https://git-scm.com/download/win) verwenden. Eine Internetverbindung ist nötig, weil Wetter, Radar, Warnungen, Feuerwehr und Pegel von öffentlichen APIs kommen.

### Start

```bash
git clone https://github.com/Kevin-Stein/Dashboard_Projekt_Lenny_Kevin.git
cd Dashboard_Projekt_Lenny_Kevin
node dev-server.js
```

Im Browser [http://localhost:3000](http://localhost:3000) öffnen. Ein `npm install` ist zum Starten nicht nötig (`npm start` macht dasselbe). Anderer Port: `PORT=3001 node dev-server.js`.

Die Datei `index.html` nicht direkt und nicht mit Live Server öffnen: amtliche Warnungen und OpenWeather-Radar laufen nur über `dev-server.js`.
