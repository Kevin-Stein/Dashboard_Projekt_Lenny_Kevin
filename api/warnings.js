// warnung.bund.de sendet keine CORS-Header, daher werden die Daten serverseitig geholt.
const SOURCES = ["mowas", "katwarn", "biwapp", "dwd", "lhp"];
const SOURCE_TIMEOUT_MS = 8000;

async function fetchSource(source) {
  const r = await fetch(`https://warnung.bund.de/api31/${source}/mapData.json`, {
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error("unerwartetes Datenformat");
  return data;
}

async function fetchAllWarnings() {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const warnings = [];
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") warnings.push(...r.value);
    else {
      failed.push(SOURCES[i]);
      const reason = r.reason?.name === "TimeoutError" ? "Timeout" : r.reason?.message;
      console.error(`[warnings] ${SOURCES[i]}: ${reason}`);
    }
  });
  if (failed.length === SOURCES.length) throw new Error("Keine Warnquelle erreichbar");
  return { warnings, failed };
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return sendJson(res, 405, { error: "Methode nicht erlaubt" });
  }
  try {
    const { warnings, failed } = await fetchAllWarnings();
    // Teilausfälle meldet der Header, damit das Array-Format für bestehende Clients gleich bleibt
    if (failed.length) res.setHeader("X-Warnings-Failed", failed.join(","));
    res.setHeader("Cache-Control", failed.length ? "s-maxage=15" : "s-maxage=60, stale-while-revalidate=300");
    sendJson(res, 200, warnings);
  } catch (err) {
    console.error("[warnings]", err);
    res.setHeader("Cache-Control", "no-store");
    sendJson(res, 502, { error: err.message });
  }
};
