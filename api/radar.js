// OpenWeather-Niederschlagskacheln. Der Key bleibt serverseitig
// (Vercel: OPENWEATHER_KEY, lokal: dieselbe Variable oder js/config.js).
const fs = require("fs");
const path = require("path");

const TILE_TIMEOUT_MS = 8000;
const TILE_URL = "https://tile.openweathermap.org/map/precipitation_new";

function queryOf(req) {
  if (req.query && typeof req.query === "object") return req.query;
  try {
    return Object.fromEntries(new URL(req.url, "http://localhost").searchParams);
  } catch {
    return {};
  }
}

function keyFromConfigFile() {
  try {
    const src = fs.readFileSync(path.join(__dirname, "..", "js", "config.js"), "utf8");
    const match = src.match(/openWeatherKey:\s*["']([^"']*)["']/);
    return (match && match[1].trim()) || "";
  } catch {
    return "";
  }
}

function getKey() {
  return (process.env.OPENWEATHER_KEY || keyFromConfigFile() || "").trim();
}

function parseTile(query) {
  const z = Number(query.z);
  const x = Number(query.x);
  const y = Number(query.y);
  if (![z, x, y].every((n) => Number.isInteger(n) && n >= 0) || z > 16) return null;
  const max = 2 ** z;
  if (x >= max || y >= max) return null;
  return { z, x, y };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function sendTile(res, tile, key) {
  const upstream = `${TILE_URL}/${tile.z}/${tile.x}/${tile.y}.png?appid=${encodeURIComponent(key)}`;
  let response;
  try {
    response = await fetch(upstream, { signal: AbortSignal.timeout(TILE_TIMEOUT_MS) });
  } catch (err) {
    const timeout = err?.name === "TimeoutError";
    return sendJson(res, 502, { error: timeout ? "OpenWeather antwortet nicht" : "OpenWeather nicht erreichbar" });
  }
  const type = response.headers.get("content-type") || "";
  if (!response.ok || !type.includes("image")) {
    return sendJson(res, 502, { error: "Niederschlagskarte nicht erreichbar" });
  }
  const body = Buffer.from(await response.arrayBuffer());
  res.statusCode = 200;
  res.setHeader("Content-Type", type.split(";")[0].trim() || "image/png");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  res.end(body);
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendJson(res, 405, { error: "Methode nicht erlaubt" });
  }
  const query = queryOf(req);
  const key = getKey();
  if (query.z == null && query.x == null && query.y == null) {
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 200, { available: Boolean(key) });
  }
  const tile = parseTile(query);
  if (!tile) return sendJson(res, 400, { error: "Ungültige Kachel" });
  if (!key) {
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 503, { error: "Kein OpenWeather-Key" });
  }
  if (req.method === "HEAD") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/png");
    return res.end();
  }
  try {
    await sendTile(res, tile, key);
  } catch (err) {
    console.error("[radar]", err?.message || err);
    if (!res.headersSent) sendJson(res, 502, { error: "Niederschlagskarte nicht erreichbar" });
  }
};
