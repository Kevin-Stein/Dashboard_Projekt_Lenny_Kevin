// Lokaler Server: liefert die statischen Dateien aus und stellt /api/warnings und /api/radar wie auf Vercel bereit.
// Start: node dev-server.js  ->  http://localhost:3000
const http = require("http");
const fs = require("fs");
const path = require("path");
const warnings = require("./api/warnings");
const radar = require("./api/radar");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function sendText(res, status, text) {
  if (res.headersSent) return res.end();
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}

function handle(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (err) {
    return sendText(res, 400, "Ungültige Adresse");
  }
  if (urlPath === "/api/warnings") {
    return Promise.resolve(warnings(req, res)).catch((err) => {
      console.error("[api/warnings]", err);
      sendText(res, 500, "Interner Fehler");
    });
  }
  if (urlPath === "/api/radar") {
    return Promise.resolve(radar(req, res)).catch((err) => {
      console.error("[api/radar]", err);
      sendText(res, 500, "Interner Fehler");
    });
  }

  const file = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return sendText(res, 403, "Zugriff verweigert");
  fs.readFile(file, (err, data) => {
    if (err) {
      if (err.code === "ENOENT" || err.code === "EISDIR") return sendText(res, 404, "Nicht gefunden");
      console.error(`[dev-server] ${urlPath}:`, err);
      return sendText(res, 500, "Datei konnte nicht gelesen werden");
    }
    res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    res.end(data);
  });
}

http
  .createServer((req, res) => {
    try {
      handle(req, res);
    } catch (err) {
      console.error("[dev-server]", err);
      sendText(res, 500, "Interner Fehler");
    }
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} ist schon belegt. Anderen Port wählen, z. B.: PORT=3001 node dev-server.js`);
    } else {
      console.error("Server konnte nicht starten:", err);
    }
    process.exit(1);
  })
  .listen(PORT, () => console.log(`Dashboard läuft auf http://localhost:${PORT}`));
