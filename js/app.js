// ---- Fehlerbehandlung ----
const FETCH_TIMEOUT_MS = 12000;

class FetchError extends Error {
  constructor(kind, message, { source = "", status = 0, retryAfter = 0, cause } = {}) {
    super(message, { cause });
    this.name = "FetchError";
    this.kind = kind; // offline | timeout | network | http | data
    this.source = source;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function dataError(source, message) {
  return new FetchError("data", `${source}: ${message}`, { source });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(err) {
  if (!(err instanceof FetchError)) return false;
  if (err.kind === "timeout" || err.kind === "network") return true;
  return err.kind === "http" && (err.status === 429 || err.status >= 500);
}

async function fetchOnce(url, { source, parse, timeout, init }) {
  if (navigator.onLine === false) throw new FetchError("offline", `${source}: offline`, { source });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    let res;
    try {
      res = await fetch(url, { ...init, signal: ctrl.signal });
    } catch (err) {
      const kind = ctrl.signal.aborted ? "timeout" : navigator.onLine === false ? "offline" : "network";
      throw new FetchError(kind, `${source}: ${err.message}`, { source, cause: err });
    }
    if (!res.ok) {
      throw new FetchError("http", `${source}: HTTP ${res.status}`, {
        source,
        status: res.status,
        retryAfter: Number(res.headers.get("Retry-After")) || 0,
      });
    }
    try {
      if (typeof parse === "function") return await parse(res);
      return parse === "text" ? await res.text() : await res.json();
    } catch (err) {
      if (err instanceof FetchError) throw err;
      const kind = ctrl.signal.aborted ? "timeout" : "data";
      throw new FetchError(kind, `${source}: ${err.message}`, { source, cause: err });
    }
  } finally {
    clearTimeout(timer);
  }
}

// Einheitlicher Abruf: Timeout, eine Wiederholung bei Netzfehlern/Überlastung, klassifizierte Fehler
async function fetchData(url, { source = "Anfrage", parse = "json", timeout = FETCH_TIMEOUT_MS, retries = 1, ...init } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(url, { source, parse, timeout, init });
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
      const delay = err.retryAfter ? Math.min(err.retryAfter * 1000, 5000) : 800 * (attempt + 1);
      await sleep(delay + Math.random() * 300);
    }
  }
}

function describeError(err) {
  if (!(err instanceof FetchError)) return "unerwarteter Fehler";
  if (err.kind === "offline") return "keine Internetverbindung";
  if (err.kind === "timeout") return "der Dienst antwortet nicht";
  if (err.kind === "network") return "Dienst nicht erreichbar";
  if (err.kind === "data") return "Antwort unvollständig oder fehlerhaft";
  if (err.status === 429) return "zu viele Anfragen, bitte in einer Minute erneut versuchen";
  if (err.status === 401 || err.status === 403) return "Zugriff verweigert (API-Key prüfen)";
  if (err.status === 404) return "Daten nicht gefunden";
  if (err.status >= 500) return "Dienst gerade gestört";
  return `Fehler HTTP ${err.status}`;
}

function reportError(source, err) {
  if (err instanceof FetchError && err.kind === "offline") return;
  console.warn(`[Dashboard] ${source}:`, err);
}

// Fehlermeldung mit „Erneut versuchen“-Knopf in ein vorhandenes Element schreiben
function renderRetry(el, message, onRetry, className = "") {
  if (!el) return;
  el.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "load-error" + (className ? " " + className : "");
  wrap.setAttribute("role", "alert");
  const text = document.createElement("span");
  text.textContent = message;
  wrap.appendChild(text);
  if (onRetry) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "retry-btn";
    btn.textContent = "Erneut versuchen";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onRetry();
    });
    wrap.appendChild(btn);
  }
  el.appendChild(wrap);
}

let storageWarned = false;
function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!storageWarned) {
      storageWarned = true;
      console.warn("[Dashboard] localStorage:", err);
      showToast("Speichern im Browser nicht möglich – Änderungen gehen beim Schließen verloren", "error");
    }
    return false;
  }
}

let lastGlobalErrorToast = 0;
function handleUnexpectedError(err) {
  console.error("[Dashboard] Unerwarteter Fehler:", err);
  if (Date.now() - lastGlobalErrorToast < 15000) return;
  lastGlobalErrorToast = Date.now();
  try {
    showToast("Unerwarteter Fehler – Details in der Browser-Konsole", "error");
  } catch (e) {}
}
window.addEventListener("error", (e) => handleUnexpectedError(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => handleUnexpectedError(e.reason));

// Ohne Leaflet (CDN blockiert/offline) soll der Rest des Dashboards trotzdem laufen
const LEAFLET_AVAILABLE = typeof window.L !== "undefined";
if (!LEAFLET_AVAILABLE) {
  const noop = new Proxy(function () {}, {
    get: (target, prop) => (prop === Symbol.toPrimitive ? () => 0 : noop),
    apply: () => noop,
    construct: () => noop,
  });
  window.L = noop;
  console.warn("[Dashboard] Leaflet nicht geladen – Karten sind deaktiviert.");
}

// ---- Uhrzeit aktualisieren ----
function updateClock() {
  const now = new Date();
  document.getElementById("headerDate").textContent =
    now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " · " +
    now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) +
    " Uhr";
}
updateClock();
setInterval(updateClock, 30000);

// ---- Dynamische Navigation basierend auf vorhandenen Widgets ----
const NAV_CATEGORIES = {
  overview: {
    id: "overview",
    label: "Übersicht",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10" />
    </svg><span>Übersicht</span>`,
    target: "overviewPage",
  },
  weather: {
    id: "weather",
    label: "Wetter",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M7 15.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 17 15z" />
    </svg><span>Wetter</span>`,
    target: "weatherPage",
  },
  radar: {
    id: "radar",
    label: "Regenradar",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M12 3v6M12 3a9 9 0 1 0 9 9M12 3a5 5 0 0 1 5 5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg><span>Regenradar</span>`,
    target: "radarPage",
  },
  disaster: {
    id: "disaster",
    label: "Katastrophenschutz",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M12 3.5l7.5 3v5.2c0 4.6-3.1 8.2-7.5 9.8-4.4-1.6-7.5-5.2-7.5-9.8V6.5l7.5-3z" />
      <path d="M12 8v5" /><circle cx="12" cy="15.8" r="0.6" fill="currentColor" stroke="none" />
    </svg><span>Katastrophenschutz</span>`,
    target: "disasterPage",
  },
  fire: {
    id: "fire",
    label: "Feuerwehr",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.6.3 1.6 1.1 2.8 2.2 3.4.2-2.9 1.4-5.6 3.7-7.6.3 2.7 1.3 4.6 2.6 6.4 1 1.4.9 2.9.9 5.4 0 3.6-2.6 6.2-6.5 6.2z" />
    </svg><span>Feuerwehr</span>`,
    target: "firePage",
  },
  water: {
    id: "water",
    label: "Wasserpegel",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 15c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    </svg><span>Wasserpegel</span>`,
    target: "waterPage",
  },
};

function updateNavigation() {
  const navContainer = document.getElementById("sidebarNav");
  if (!navContainer) return;
  navContainer.innerHTML = "";

  Object.keys(NAV_CATEGORIES).forEach((key) => {
    const category = NAV_CATEGORIES[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-item";
    btn.dataset.target = category.target;
    btn.innerHTML = category.html;

    // Aktuell sichtbare Seite in der Navigation markieren
    const activePage = document.querySelector(".page.active");
    if (activePage && activePage.id === category.target) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      // Seite wechseln
      document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
      const target = document.getElementById(category.target);
      if (target) target.classList.add("active");

      // Leaflet kann die Kartengröße auf einer versteckten Seite nicht messen
      if (target && target.querySelector("#map")) {
        setTimeout(() => map.invalidateSize(), 50);
      }

      // Navigation aktualisieren
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updateResizeHandles();
    });

    navContainer.appendChild(btn);
  });
}

// ---- Toast-Nachrichten ----
const toast = document.getElementById("toast");
let toastTimer;
function showToast(msg, type = "info") {
  toast.textContent = msg;
  toast.classList.toggle("error", type === "error");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), type === "error" ? 5000 : 2200);
}

const COLLAPSED_STORAGE_KEY = "dashboard-collapsed";

function loadCollapsedIds() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) || "[]");
  } catch (err) {
    return [];
  }
}
function storeCollapsed(id, collapsed) {
  const ids = loadCollapsedIds().filter((x) => x !== id);
  if (collapsed) ids.push(id);
  storageSet(COLLAPSED_STORAGE_KEY, JSON.stringify(ids));
}

function setCollapsed(panelEl, btnEl, collapsed) {
  panelEl.classList.toggle("collapsed", collapsed);
  btnEl.classList.toggle("rotated", collapsed);
  btnEl.setAttribute("aria-expanded", String(!collapsed));
}

function setupToggle(panelEl, btnEl) {
  if (!panelEl || !btnEl) return;
  const id = panelEl.id || panelEl.dataset.layoutId;
  setCollapsed(panelEl, btnEl, Boolean(id) && loadCollapsedIds().includes(id));
  btnEl.addEventListener("click", () => {
    const willCollapse = !panelEl.classList.contains("collapsed");
    setCollapsed(panelEl, btnEl, willCollapse);
    if (id) storeCollapsed(id, willCollapse);
    document.dispatchEvent(new Event("widget-collapse"));
  });
}

// Alle übrigen Widgets bekommen einen eigenen Einklapp-Pfeil
function addMissingToggles() {
  document.querySelectorAll(".page .panel, .page .stat-card").forEach((el) => {
    if (el.querySelector(".panel-toggle")) return;
    const title = el.querySelector(".panel-title, .stat-label");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "panel-toggle auto-toggle";
    btn.setAttribute("aria-label", `${title ? title.textContent.trim() : "Widget"} ein-/ausklappen`);
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    el.appendChild(btn);
    setupToggle(el, btn);
  });
}

// Navigation bei Initialisierung aktualisieren
updateNavigation();

// ---- Hamburger-Menü (mobile Ansicht) ----
const sidebarEl = document.querySelector(".sidebar");
const menuToggleBtn = document.getElementById("menuToggle");

function setMenuOpen(open) {
  sidebarEl.classList.toggle("menu-open", open);
  menuToggleBtn.setAttribute("aria-expanded", String(open));
  menuToggleBtn.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
}
menuToggleBtn.addEventListener("click", () => {
  setMenuOpen(!sidebarEl.classList.contains("menu-open"));
});
// Nav-Buttons werden dynamisch neu erzeugt, daher per Delegation
document.getElementById("sidebarNav").addEventListener("click", (e) => {
  if (e.target.closest(".nav-item")) setMenuOpen(false);
});

// Dokumentation als eigenes Fenster; bei blockiertem Popup öffnet der Link normal im neuen Tab
document.getElementById("docsLink").addEventListener("click", (e) => {
  setMenuOpen(false);
  if (MOBILE_SCROLL_QUERY.matches) return;
  const w = Math.min(1280, screen.availWidth - 80);
  const h = Math.min(920, screen.availHeight - 80);
  const docsWindow = window.open(
    "docs.html",
    "dashboard-docs",
    `popup,width=${w},height=${h},left=${Math.round((screen.availWidth - w) / 2)},top=${Math.round((screen.availHeight - h) / 2)}`,
  );
  if (docsWindow) {
    e.preventDefault();
    docsWindow.focus();
  }
});

setupToggle(document.querySelector("section.panel.weather"), document.getElementById("weatherToggle"));
setupToggle(document.querySelector("section.panel.radar"), document.getElementById("radarToggle"));

// ---- Light Mode / Dark Mode ----
const themeToggleBtn = document.getElementById("themeToggle");
const sunIconSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M3 12h2.2M18.8 12H21M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" stroke-linecap="round"/></svg>';
const moonIconSvg =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.5 14.8A8.5 8.5 0 1 1 9.2 3.5a6.8 6.8 0 0 0 11.3 11.3z"/></svg>';

function getStoredTheme() {
  try {
    return localStorage.getItem("dashboard-theme");
  } catch (err) {
    return null;
  }
}
function setStoredTheme(v) {
  storageSet("dashboard-theme", v);
}
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function effectiveTheme() {
  const stored = getStoredTheme();
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}
function updateThemeIcon() {
  const eff = effectiveTheme();
  themeToggleBtn.innerHTML =
    eff === "dark" ? `${moonIconSvg}<span>Modus: Dunkel</span>` : `${sunIconSvg}<span>Modus: Hell</span>`;
  themeToggleBtn.title = eff === "dark" ? "Zu Light Mode wechseln" : "Zu Dark Mode wechseln";
}
function applyTheme(stored) {
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeIcon();
}
applyTheme(getStoredTheme());
themeToggleBtn.addEventListener("click", () => {
  const next = effectiveTheme() === "dark" ? "light" : "dark";
  setStoredTheme(next);
  applyTheme(next);
});

// ---- Manuelles Aktualisieren ----
const DEFAULT_PLACE = { lat: 52.52, lon: 13.405, label: "Berlin" };
let currentWeatherCoords = { ...DEFAULT_PLACE };
const lastUpdatedEl = document.getElementById("lastUpdated");

function setLastUpdatedNow() {
  const now = new Date();
  lastUpdatedEl.textContent = `Zuletzt aktualisiert: ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
}

const refreshBtn = document.getElementById("refreshBtn");
const refreshIcon = document.getElementById("refreshIcon");

const refreshErrorsEl = document.getElementById("refreshErrors");
let refreshInFlight = null;

// Jede Quelle liefert true/false; eine fehlerhafte Quelle hält die anderen nicht auf
async function runRefresh(manual) {
  const sources = [
    ["Wetter", () => loadWeatherForPlace(currentWeatherCoords.lat, currentWeatherCoords.lon, currentWeatherCoords.label)],
    ["Radar", () => loadRadar()],
    ["Warnungen", () => loadDisasterWarnings(document.getElementById("disasterWarnSearchInput")?.value || "")],
    ["Feuerwehr", () => loadFireData()],
    ["Pegel", () => loadWaterData()],
  ];
  refreshBtn.disabled = true;
  refreshIcon.classList.add("spinning");
  try {
    const results = await Promise.allSettled(sources.map(([, load]) => load()));
    const failed = sources
      .filter((_, i) => results[i].status === "rejected" || results[i].value === false)
      .map(([name]) => name);
    results.forEach((r, i) => r.status === "rejected" && reportError(sources[i][0], r.reason));
    document.dispatchEvent(new Event("dashboard-refresh"));

    refreshErrorsEl.hidden = !failed.length;
    refreshErrorsEl.textContent = failed.length ? `Nicht aktualisiert: ${failed.join(", ")}` : "";
    if (failed.length && manual) {
      const hint = navigator.onLine === false ? "keine Internetverbindung" : "ältere Daten bleiben sichtbar";
      showToast(`${failed.join(", ")} nicht aktualisiert – ${hint}`, "error");
    }
  } finally {
    refreshIcon.classList.remove("spinning");
    refreshBtn.disabled = false;
  }
}

function refreshDashboardData({ manual = false } = {}) {
  if (!refreshInFlight) refreshInFlight = runRefresh(manual).finally(() => (refreshInFlight = null));
  return refreshInFlight;
}

refreshBtn.addEventListener("click", () => {
  refreshDashboardData({ manual: true });
});

window.addEventListener("offline", () => {
  showToast("Keine Internetverbindung – angezeigte Daten können veraltet sein", "error");
});
window.addEventListener("online", () => {
  showToast("Wieder online – Daten werden aktualisiert");
  refreshDashboardData();
});

// ---- Automatische Aktualisierung ----
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const autoRefreshToggleBtn = document.getElementById("autoRefreshToggle");
const autoRefreshLabel = document.getElementById("autoRefreshLabel");
let autoRefreshTimer = null;

function getStoredAutoRefresh() {
  try {
    const v = localStorage.getItem("dashboard-auto-refresh");
    return v === null ? true : v === "true";
  } catch (err) {
    return true;
  }
}
function setStoredAutoRefresh(v) {
  storageSet("dashboard-auto-refresh", String(v));
}

let autoRefreshEnabled = getStoredAutoRefresh();

function startAutoRefreshTimer() {
  stopAutoRefreshTimer();
  autoRefreshTimer = setInterval(refreshDashboardData, AUTO_REFRESH_INTERVAL_MS);
}
function stopAutoRefreshTimer() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}
function updateAutoRefreshUI() {
  autoRefreshLabel.textContent = autoRefreshEnabled ? "⏸ Auto-Aktualisierung: AN" : "▶ Auto-Aktualisierung: AUS";
}
function applyAutoRefreshState() {
  updateAutoRefreshUI();
  if (autoRefreshEnabled) startAutoRefreshTimer();
  else stopAutoRefreshTimer();
}

autoRefreshToggleBtn.addEventListener("click", () => {
  autoRefreshEnabled = !autoRefreshEnabled;
  setStoredAutoRefresh(autoRefreshEnabled);
  applyAutoRefreshState();
});

applyAutoRefreshState();

// Die Widgets rendern in einen Container der Übersicht; zurückgegebene Funktionen räumen beim Entfernen auf
function renderInto(body, html) {
  body.innerHTML = html;
  return body;
}

// ---- To-do Widget ----
function mountTodoWidget(body) {
  const panel = renderInto(
    body,
    `
    <form class="todo-add" id="todoAddForm">
      <input type="text" id="todoAddInput" placeholder="Neue Aufgabe …" autocomplete="off">
      <button type="submit">+</button>
    </form>
    <div class="todo-list" id="todoList"></div>
  `,
  );

  function loadTodos() {
    try {
      return JSON.parse(localStorage.getItem("dashboard-widget-todo") || "[]");
    } catch (err) {
      return [];
    }
  }
  function saveTodos(items) {
    storageSet("dashboard-widget-todo", JSON.stringify(items));
  }
  let todos = loadTodos();

  function renderTodos() {
    const list = panel.querySelector("#todoList");
    list.innerHTML = "";
    if (!todos.length) {
      list.innerHTML = '<div class="todo-empty">Noch keine Aufgaben — leg oben los.</div>';
      return;
    }
    todos.forEach((t, i) => {
      const row = document.createElement("div");
      row.className = "todo-item" + (t.done ? " done" : "");
      row.innerHTML = `<input type="checkbox" ${t.done ? "checked" : ""}><span></span><button type="button" aria-label="Löschen">×</button>`;
      row.querySelector("span").textContent = t.text;
      row.querySelector("input").addEventListener("change", () => {
        todos[i].done = !todos[i].done;
        saveTodos(todos);
        renderTodos();
      });
      row.querySelector("button").addEventListener("click", () => {
        todos.splice(i, 1);
        saveTodos(todos);
        renderTodos();
      });
      list.appendChild(row);
    });
  }

  panel.querySelector("#todoAddForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = panel.querySelector("#todoAddInput");
    const text = input.value.trim();
    if (!text) return;
    todos.push({ text, done: false });
    saveTodos(todos);
    input.value = "";
    renderTodos();
  });

  renderTodos();
}

// ---- Notizen Widget ----
function mountNotesWidget(body) {
  const panel = renderInto(
    body,
    `
    <textarea class="notes-area" id="notesArea" placeholder="Hier ist Platz für alles, was dir einfällt …"></textarea>
    <div class="notes-saved" id="notesSaved">&nbsp;</div>
  `,
  );

  const area = panel.querySelector("#notesArea");
  const saved = panel.querySelector("#notesSaved");
  try {
    area.value = localStorage.getItem("dashboard-widget-notes") || "";
  } catch (err) {}

  let saveTimer;
  area.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!storageSet("dashboard-widget-notes", area.value)) {
        saved.textContent = "Nicht gespeichert – Browser-Speicher nicht verfügbar";
        return;
      }
      saved.textContent = "Gespeichert";
      setTimeout(() => {
        saved.textContent = "";
      }, 1500);
    }, 500);
  });
}

// ---- Weltzeituhr Widget ----
function mountClockWidget(body) {
  const zones = [
    { city: "Berlin", tz: "Europe/Berlin" },
    { city: "London", tz: "Europe/London" },
    { city: "New York", tz: "America/New_York" },
    { city: "Tokio", tz: "Asia/Tokyo" },
  ];
  const panel = renderInto(
    body,
    `
    <div class="clock-list" id="clockList"></div>
  `,
  );

  const list = panel.querySelector("#clockList");
  zones.forEach((z) => {
    const row = document.createElement("div");
    row.className = "clock-row";
    row.innerHTML = `<div><div class="clock-row-city">${z.city}</div><div class="clock-row-diff" data-diff></div></div><div class="clock-row-time" data-time></div>`;
    row.dataset.tz = z.tz;
    list.appendChild(row);
  });

  function tickClocks() {
    const now = new Date();
    list.querySelectorAll(".clock-row").forEach((row) => {
      const tz = row.dataset.tz;
      const timeStr = now.toLocaleTimeString("de-DE", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
      row.querySelector("[data-time]").textContent = timeStr;
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
      }).formatToParts(now);
      const h = parseInt(parts.find((p) => p.type === "hour").value, 10);
      const m = parseInt(parts.find((p) => p.type === "minute").value, 10);
      const localParts = new Intl.DateTimeFormat("en-US", {
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
      }).formatToParts(now);
      const lh = parseInt(localParts.find((p) => p.type === "hour").value, 10);
      const lm = parseInt(localParts.find((p) => p.type === "minute").value, 10);
      let diffMin = h * 60 + m - (lh * 60 + lm);
      if (diffMin > 720) diffMin -= 1440;
      if (diffMin < -720) diffMin += 1440;
      const diffH = diffMin / 60;
      row.querySelector("[data-diff]").textContent =
        diffMin === 0 ? "Ortszeit" : diffH > 0 ? `+${diffH}h` : `${diffH}h`;
    });
  }
  tickClocks();
  const clockTimer = setInterval(tickClocks, 30000);
  return () => clearInterval(clockTimer);
}

// ---- Countdown Widget ----
function mountCountdownWidget(body) {
  const panel = renderInto(
    body,
    `
    <div id="countdownBody"></div>
  `,
  );

  function loadCountdown() {
    try {
      return JSON.parse(localStorage.getItem("dashboard-widget-countdown") || "null");
    } catch (err) {
      return null;
    }
  }
  function saveCountdown(data) {
    storageSet("dashboard-widget-countdown", JSON.stringify(data));
  }

  let countdownTimer;

  function renderSetup() {
    clearInterval(countdownTimer);
    const body = panel.querySelector("#countdownBody");
    body.innerHTML = `
      <div class="countdown-setup">
        <input type="text" id="cdTitle" placeholder="Wofür? z. B. Urlaub" autocomplete="off">
        <input type="date" id="cdDate">
        <button type="button" id="cdSave">Countdown starten</button>
      </div>
    `;
    body.querySelector("#cdSave").addEventListener("click", () => {
      const title = body.querySelector("#cdTitle").value.trim() || "Countdown";
      const dateVal = body.querySelector("#cdDate").value;
      if (!dateVal) return;
      saveCountdown({ title, date: dateVal });
      renderCountdown();
    });
  }

  function renderCountdown() {
    const data = loadCountdown();
    if (!data) {
      renderSetup();
      return;
    }
    const body = panel.querySelector("#countdownBody");
    body.innerHTML = `
      <div class="countdown-display">
        <div class="countdown-title">${data.title}</div>
        <div class="countdown-number" id="cdNumber">–</div>
        <div class="countdown-label" id="cdLabel">Tage</div>
      </div>
      <button type="button" class="countdown-edit" id="cdEdit">anderen Termin wählen</button>
    `;
    body.querySelector("#cdEdit").addEventListener("click", () => {
      try {
        localStorage.removeItem("dashboard-widget-countdown");
      } catch (err) {}
      renderSetup();
    });

    function tick() {
      const target = new Date(data.date + "T00:00:00");
      const now = new Date();
      const diffMs = target - now;
      const numberEl = panel.querySelector("#cdNumber");
      const labelEl = panel.querySelector("#cdLabel");
      if (!numberEl) {
        clearInterval(countdownTimer);
        return;
      }
      if (diffMs <= 0 && diffMs > -86400000) {
        numberEl.textContent = "Heute!";
        labelEl.textContent = data.title;
      } else if (diffMs <= -86400000) {
        const daysPast = Math.floor(-diffMs / 86400000);
        numberEl.textContent = `vor ${daysPast}`;
        labelEl.textContent = daysPast === 1 ? "Tag" : "Tagen";
      } else {
        const days = Math.ceil(diffMs / 86400000);
        numberEl.textContent = days;
        labelEl.textContent = days === 1 ? "Tag" : "Tage";
      }
    }
    tick();
    countdownTimer = setInterval(tick, 60000);
  }

  renderCountdown();
  return () => clearInterval(countdownTimer);
}

// ---- Warnungen Widget ----
function mountWarningsWidget(body) {
  const panel = renderInto(
    body,
    `
    <form class="warn-search" id="warnSearchForm">
      <input type="text" id="warnSearchInput" placeholder="Ort filtern, z. B. Berlin …" autocomplete="off">
      <button type="submit">Filtern</button>
    </form>
    <div class="warn-note" id="warnLoading">Warnungen werden geladen …</div>
    <div class="warn-list" id="warnList"></div>
    <div class="warn-note">Quelle: warnung.bund.de (BBK/NINA) · bundesweite Meldungen aus MoWaS, KATWARN, BIWAPP, DWD und Hochwasser</div>
  `,
  );

  const severityRank = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
  const typeLabel = { Alert: "Neu", Update: "Update", Cancel: "Aufgehoben", Test: "Test" };

  function sevClass(sev) {
    const s = (sev || "").toLowerCase();
    if (s === "extreme") return "sev-extreme";
    if (s === "severe") return "sev-severe";
    if (s === "moderate") return "sev-moderate";
    if (s === "minor") return "sev-minor";
    return "sev-cancel";
  }

  async function loadWarnings(filterText) {
    const listEl = panel.querySelector("#warnList");
    const loadingEl = panel.querySelector("#warnLoading");
    loadingEl.textContent = "Warnungen werden geladen …";
    try {
      const { warnings, failed } = await fetchOfficialWarnings();
      let all = warnings;
      listEl.innerHTML = "";

      if (filterText && filterText.trim()) {
        const q = filterText.trim().toLowerCase();
        all = all.filter((w) => (w.i18nTitle?.de || "").toLowerCase().includes(q));
      }

      all.sort(
        (a, b) =>
          (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) ||
          new Date(b.startDate) - new Date(a.startDate),
      );
      all = all.slice(0, filterText ? 20 : 10);

      loadingEl.textContent = warningsPartialText(failed);
      if (!all.length) {
        const empty = document.createElement("div");
        empty.className = "warn-empty";
        empty.textContent = `Keine Warnungen${filterText ? ` für "${filterText.trim()}"` : ""} gefunden.`;
        listEl.appendChild(empty);
        return;
      }

      all.forEach((w) => {
        const item = document.createElement("div");
        item.className = "warn-item " + sevClass(w.type === "Cancel" ? "cancel" : w.severity);
        const date = w.startDate
          ? new Date(w.startDate).toLocaleString("de-DE", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        item.innerHTML = `
          <div class="warn-title"></div>
          <div class="warn-meta"><span class="warn-badge">${typeLabel[w.type] || w.type || ""}</span><span>${date} Uhr</span></div>
        `;
        item.querySelector(".warn-title").textContent = w.i18nTitle?.de || "Meldung ohne Titel";
        listEl.appendChild(item);
      });
    } catch (err) {
      reportError("Warnungen-Widget", err);
      renderRetry(loadingEl, warningsErrorText(err), () => loadWarnings(filterText));
    }
  }

  panel.querySelector("#warnSearchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    loadWarnings(panel.querySelector("#warnSearchInput").value);
  });

  loadWarnings("");
  const reload = () => loadWarnings(panel.querySelector("#warnSearchInput").value);
  document.addEventListener("dashboard-refresh", reload);
  return () => document.removeEventListener("dashboard-refresh", reload);
}

// ---- Notfall-Checkliste Widget ----
const CHECKLIST_STORAGE_KEY = "dashboard-widget-checklist";

function loadChecklistState() {
  try {
    return JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || "[]");
  } catch (err) {
    return [];
  }
}
function toggleChecklistItem(i) {
  let checked = loadChecklistState();
  checked = checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i];
  storageSet(CHECKLIST_STORAGE_KEY, JSON.stringify(checked));
  document.dispatchEvent(new Event("checklist-change"));
}
function renderChecklist(list) {
  const checked = loadChecklistState();
  list.innerHTML = "";
  DISASTER_CHECKLIST_ITEMS.forEach((text, i) => {
    const row = document.createElement("div");
    row.className = "todo-item" + (checked.includes(i) ? " done" : "");
    row.innerHTML = `<input type="checkbox" ${checked.includes(i) ? "checked" : ""}><span></span>`;
    row.querySelector("span").textContent = text;
    row.querySelector("input").addEventListener("change", () => toggleChecklistItem(i));
    list.appendChild(row);
  });
}

function mountChecklistWidget(body) {
  renderInto(
    body,
    `
    <div class="todo-list scroll-list" data-checklist></div>
    <div class="warn-note">Orientiert an den Empfehlungen des BBK für die private Notfallvorsorge.</div>
  `,
  );
  const list = body.querySelector("[data-checklist]");
  const render = () => renderChecklist(list);
  render();
  document.addEventListener("checklist-change", render);
  return () => document.removeEventListener("checklist-change", render);
}

// ---- Notrufnummern Widget ----
function mountEmergencyNumbersWidget(body) {
  renderInto(
    body,
    `
    <div class="clock-list">
      ${DISASTER_NUMBERS.map((n) => `<div class="emerg-row"><div class="emerg-num">${n.num}</div><div class="emerg-label">${n.label}</div></div>`).join("")}
    </div>
    <div class="warn-note">Außerhalb von Berlin und Brandenburg gelten andere Giftnotruf-Nummern.</div>
  `,
  );
}

// ---- Katastrophenschutz-Seite ----
const DISASTER_NUMBERS = [
  { num: "112", label: "Feuerwehr & Rettungsdienst — lebensbedrohliche Notfälle, Brand" },
  { num: "110", label: "Polizei-Notruf" },
  { num: "116 117", label: "Ärztlicher Bereitschaftsdienst — dringend, aber nicht lebensbedrohlich" },
  { num: "030 19240", label: "Giftnotruf Berlin (Charité) — rund um die Uhr" },
];
const DISASTER_CHECKLIST_ITEMS = [
  "Trinkwasser (mind. 2 Liter pro Person und Tag)",
  "Haltbare Lebensmittel für mehrere Tage",
  "Wichtige Dokumente griffbereit (Ausweis, Impfpass, Versicherung)",
  "Erste-Hilfe-Set",
  "Wichtige Medikamente",
  "Taschenlampe & Ersatzbatterien",
  "Batteriebetriebenes oder Kurbelradio",
  "Powerbank bzw. Ersatzakku fürs Handy",
  "Bargeld in kleinen Scheinen",
  "Warme Kleidung & Decken",
  "Hygieneartikel",
];

function renderDisasterNumbers() {
  const el = document.getElementById("disasterNumbersList");
  if (!el) return;
  el.innerHTML = DISASTER_NUMBERS.map(
    (n) => `<div class="emerg-row"><div class="emerg-num">${n.num}</div><div class="emerg-label">${n.label}</div></div>`,
  ).join("");
}

function renderDisasterChecklist() {
  const list = document.getElementById("disasterChecklistList");
  if (list) renderChecklist(list);
}
document.addEventListener("checklist-change", renderDisasterChecklist);

// warnung.bund.de erlaubt keine Browser-Abrufe (kein CORS), daher über /api/warnings (api/warnings.js)
const WARN_SOURCE_LABEL = { mowas: "MoWaS", katwarn: "KATWARN", biwapp: "BIWAPP", dwd: "DWD", lhp: "Hochwasser" };
async function fetchOfficialWarnings() {
  return fetchData("/api/warnings", {
    source: "Warnungen",
    parse: async (res) => {
      const warnings = await res.json();
      if (!Array.isArray(warnings)) throw dataError("Warnungen", "kein Array");
      const failed = (res.headers.get("X-Warnings-Failed") || "")
        .split(",")
        .filter(Boolean)
        .map((s) => WARN_SOURCE_LABEL[s] || s);
      return { warnings, failed };
    },
  });
}
function warningsErrorText(err) {
  if (location.protocol === "file:" || (err instanceof FetchError && err.kind === "http" && err.status === 404))
    return "Warnungen nicht verfügbar – die Warn-Schnittstelle fehlt. Dashboard mit „node dev-server.js“ starten.";
  return `Warnungen nicht verfügbar – ${describeError(err)}. Alternativ direkt auf warnung.bund.de nachsehen.`;
}
function warningsPartialText(failed) {
  return failed.length ? `Unvollständig: ${failed.join(", ")} gerade nicht erreichbar.` : "";
}
const DISASTER_SEV_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
const DISASTER_TYPE_LABEL = { Alert: "Neu", Update: "Update", Cancel: "Aufgehoben", Test: "Test" };
function disasterSevClass(sev) {
  const s = (sev || "").toLowerCase();
  if (s === "extreme") return "sev-extreme";
  if (s === "severe") return "sev-severe";
  if (s === "moderate") return "sev-moderate";
  if (s === "minor") return "sev-minor";
  return "sev-cancel";
}

async function loadDisasterWarnings(filterText) {
  const listEl = document.getElementById("disasterWarnList");
  const loadingEl = document.getElementById("disasterWarnLoading");
  if (!listEl || !loadingEl) return;
  loadingEl.textContent = "Warnungen werden geladen …";
  try {
    const { warnings, failed } = await fetchOfficialWarnings();
    let all = warnings;
    listEl.innerHTML = "";
    if (filterText && filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      all = all.filter((w) => (w.i18nTitle?.de || "").toLowerCase().includes(q));
    }
    all.sort(
      (a, b) =>
        (DISASTER_SEV_RANK[b.severity] || 0) - (DISASTER_SEV_RANK[a.severity] || 0) ||
        new Date(b.startDate) - new Date(a.startDate),
    );
    all = all.slice(0, filterText ? 30 : 15);
    loadingEl.textContent = warningsPartialText(failed);
    if (!all.length) {
      const empty = document.createElement("div");
      empty.className = "warn-empty";
      empty.textContent = `Keine Warnungen${filterText ? ` für "${filterText.trim()}"` : ""} gefunden.`;
      listEl.appendChild(empty);
      return true;
    }
    all.forEach((w) => {
      const item = document.createElement("div");
      item.className = "warn-item " + disasterSevClass(w.type === "Cancel" ? "cancel" : w.severity);
      const date = w.startDate
        ? new Date(w.startDate).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "";
      item.innerHTML = `
        <div class="warn-title"></div>
        <div class="warn-meta"><span class="warn-badge">${DISASTER_TYPE_LABEL[w.type] || w.type || ""}</span><span>${date} Uhr</span></div>
      `;
      item.querySelector(".warn-title").textContent = w.i18nTitle?.de || "Meldung ohne Titel";
      listEl.appendChild(item);
    });
    return true;
  } catch (err) {
    reportError("Warnungen", err);
    renderRetry(loadingEl, warningsErrorText(err), () => loadDisasterWarnings(filterText));
    return false;
  }
}

// Treffpunkt-Eingabe auf der Katastrophenschutz-Seite und im Übersichts-Widget teilen sich den Wert
function bindMeetingPointInput(input, saved) {
  const load = () => {
    try {
      if (document.activeElement !== input) input.value = localStorage.getItem("dashboard-meeting-point") || "";
    } catch (err) {}
  };
  load();
  let saveTimer;
  input.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!storageSet("dashboard-meeting-point", input.value)) {
        saved.textContent = "Nicht gespeichert – Browser-Speicher nicht verfügbar";
        return;
      }
      saved.textContent = "Gespeichert";
      setTimeout(() => (saved.textContent = "\u00a0"), 1500);
      document.dispatchEvent(new Event("meeting-change"));
    }, 500);
  });
  document.addEventListener("meeting-change", load);
  return () => document.removeEventListener("meeting-change", load);
}

function setupDisasterMeetingPoint() {
  const input = document.getElementById("meetingPointInput");
  if (input) bindMeetingPointInput(input, document.getElementById("meetingSaved"));
}

function initDisasterPage() {
  renderDisasterNumbers();
  renderDisasterChecklist();
  setupDisasterMeetingPoint();
  const form = document.getElementById("disasterWarnSearchForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      loadDisasterWarnings(document.getElementById("disasterWarnSearchInput").value);
    });
  }
  loadDisasterWarnings("");
}
initDisasterPage();

// ---- Layout anpassen: Widgets per Drag & Drop umsortieren ----
const LAYOUT_GROUP_CLASSES = [
  "stat-row",
  "charts-row",
  "lower-row",
  "detail-row",
  "disaster-row",
  "disaster-side",
  "weather-side",
  "overview-grid",
];
const LAYOUT_CONTAINER_SELECTOR = [".page", ...LAYOUT_GROUP_CLASSES.map((c) => "." + c)].join(", ");
const LAYOUT_STORAGE_PREFIX = "dashboard-layout-";
const LAYOUT_HANDLE_SVG =
  '<svg viewBox="0 0 18 10" fill="currentColor"><circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/><circle cx="15" cy="3" r="1.4"/><circle cx="3" cy="7" r="1.4"/><circle cx="9" cy="7" r="1.4"/><circle cx="15" cy="7" r="1.4"/></svg>';

function layoutContainerKey(container) {
  if (container.id) return container.id;
  const page = container.closest(".page");
  const cls = LAYOUT_GROUP_CLASSES.find((c) => container.classList.contains(c));
  return `${page ? page.id : "root"}:${cls}`;
}
function layoutItemId(item) {
  return item.id || item.dataset.layoutId;
}
function layoutItems(container, includeHidden = false) {
  return [...container.children].filter(
    (c) =>
      !c.classList.contains("layout-handle") &&
      !c.classList.contains("layout-resize") &&
      !c.hasAttribute("data-layout-fixed") &&
      (includeHidden || !c.hidden),
  );
}

function saveLayoutOrder(container) {
  const order = layoutItems(container).map(layoutItemId).filter(Boolean);
  storageSet(LAYOUT_STORAGE_PREFIX + layoutContainerKey(container), JSON.stringify(order));
}
function applySavedLayoutOrder(container) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_PREFIX + layoutContainerKey(container)) || "null");
  } catch (err) {}
  if (!Array.isArray(saved)) return;
  const items = layoutItems(container, true);
  const known = saved.map((id) => items.find((el) => layoutItemId(el) === id)).filter(Boolean);
  const rest = items.filter((el) => !known.includes(el));
  [...known, ...rest].forEach((el) => container.appendChild(el));
}

// Auf den Unterseiten dürfen Panels, Kennzahlen und hinzugefügte Widgets in jede Zeile oder Spalte wandern;
// nur die Zeilen und Spalten selbst bleiben in ihrem Container
const WIDGET_PLACES_KEY = "dashboard-widget-places";

function isLayoutGroup(el) {
  return LAYOUT_GROUP_CLASSES.some((c) => el.classList.contains(c));
}
function canRoam(item) {
  const page = item.closest(".page");
  return Boolean(page) && page.id !== "overviewPage" && !isLayoutGroup(item);
}
// Kennzahlen-Karten dürfen zurück in eine Kennzahlen-Reihe, das Widget-Raster nimmt nur Widgets auf
function roamContainers(page, item) {
  const isStat = item.classList.contains("stat-card");
  const isWidget = item.classList.contains("ov-widget");
  return [page, ...page.querySelectorAll(LAYOUT_CONTAINER_SELECTOR)].filter(
    (c) =>
      !c.hidden &&
      (!c.classList.contains("stat-row") || isStat) &&
      (!c.classList.contains("overview-grid") || isWidget),
  );
}
function findLayoutItem(id) {
  return document.getElementById(id) || document.querySelector(`[data-layout-id="${CSS.escape(id)}"]`);
}
// Leere Zeilen und Spalten verschwinden, im Anordnen-Modus bleiben sie als Ablagefläche sichtbar
function updateEmptyGroups() {
  document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((c) => {
    if (c.classList.contains("page") || c.classList.contains("overview-grid")) return;
    const count = layoutItems(c, true).length;
    c.classList.add("layout-drop");
    c.classList.toggle("layout-empty", count === 0);
    if (c.classList.contains("stat-row")) c.style.setProperty("--stat-cols", String(Math.max(1, count)));
  });
}
function applySavedPlaces() {
  const containers = [...document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR)];
  Object.entries(loadWidgetPlaces()).forEach(([id, key]) => {
    const el = findLayoutItem(id);
    const container = containers.find((c) => layoutContainerKey(c) === key);
    if (el && container && el.closest(".page") === container.closest(".page")) container.appendChild(el);
  });
}
function loadWidgetPlaces() {
  try {
    return JSON.parse(localStorage.getItem(WIDGET_PLACES_KEY) || "{}") || {};
  } catch (err) {
    return {};
  }
}
function saveWidgetPlace(id, containerKey) {
  const places = loadWidgetPlaces();
  if (containerKey) places[id] = containerKey;
  else delete places[id];
  storageSet(WIDGET_PLACES_KEY, JSON.stringify(places));
}

// Tiefstes verschiebbares Element unter dem Zeiger, samt Container, in den eingefügt wird
function roamTargetAt(x, y, item, containers) {
  const hits = document.elementsFromPoint(x, y);
  // Über dem gezogenen Widget selbst lägen darunter nur seine eigenen Container
  if (!hits.length || item.contains(hits[0])) return null;
  for (const hit of hits) {
    let el = hit;
    while (el && el.parentElement) {
      if (containers.includes(el) && layoutItems(el).length === 0) return { target: null, container: el };
      if (containers.includes(el.parentElement) && layoutItems(el.parentElement).includes(el)) {
        return { target: el, container: el.parentElement };
      }
      el = el.parentElement;
    }
  }
  return null;
}

function startRoamDrag(e, item) {
  const page = item.closest(".page");
  const board = widgetBoards.get(page.id);
  const containers = roamContainers(page, item);
  const source = item.parentElement;
  let last = null;
  item.classList.add("layout-dragging");
  document.body.classList.add("layout-drag-active");

  function onMove(ev) {
    const hit = roamTargetAt(ev.clientX, ev.clientY, item, containers);
    if (!hit) return;
    const { target, container } = hit;
    if (!target) {
      container.appendChild(item);
      last = null;
      return;
    }
    const r = target.getBoundingClientRect();
    const cs = getComputedStyle(container);
    const horizontal = cs.display === "grid" || (cs.display === "flex" && cs.flexDirection === "row");
    const before = horizontal ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2;
    if (target === last?.target && before === last?.before) return;
    last = { target, before };
    if (before) target.before(item);
    else target.after(item);
    item.style.gridColumn = "";
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    item.classList.remove("layout-dragging");
    document.body.classList.remove("layout-drag-active");
    const container = item.parentElement;
    saveLayoutOrder(source);
    if (container !== source) saveLayoutOrder(container);
    const home = item.classList.contains("ov-widget") ? board.grid : item._layoutHome;
    saveWidgetPlace(layoutItemId(item), container === home ? null : layoutContainerKey(container));
    updateEmptyGroups();
    afterBoardChange(board);
    document.dispatchEvent(new Event("widget-collapse"));
    window.dispatchEvent(new Event("resize"));
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function startLayoutDrag(e, item) {
  if (e.button !== 0) return;
  e.preventDefault();
  if (canRoam(item)) return startRoamDrag(e, item);
  const container = item.parentElement;
  let lastTarget = null;
  item.classList.add("layout-dragging");
  document.body.classList.add("layout-drag-active");

  function onMove(ev) {
    const items = layoutItems(container);
    const target = items.find((el) => {
      if (el === item) return false;
      const r = el.getBoundingClientRect();
      return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    });
    // Erst neu tauschen, wenn der Zeiger das zuletzt getauschte Element verlassen hat
    if (!target || target === lastTarget) {
      if (!target) lastTarget = null;
      return;
    }
    lastTarget = target;
    if (items.indexOf(target) > items.indexOf(item)) target.after(item);
    else target.before(item);
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    item.classList.remove("layout-dragging");
    document.body.classList.remove("layout-drag-active");
    saveLayoutOrder(container);
    window.dispatchEvent(new Event("resize"));
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

// ---- Größe ändern: Widget-Raster rasten in Spalten ein, sonst werden die Flex-Anteile verschoben ----
const LAYOUT_SIZES_KEY = LAYOUT_STORAGE_PREFIX + "sizes";
// Darunter passen Diagramme und Wetterdaten nicht mehr sinnvoll in ein Panel
const LAYOUT_MIN_WIDTH = 260;
const LAYOUT_MIN_HEIGHT = 170;
const RESIZE_HANDLE_SVG =
  '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10.5 4.5l-6 6M10.5 8.5l-2 2"/></svg>';

function loadLayoutSizes() {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_SIZES_KEY) || "{}") || {};
  } catch (err) {
    return {};
  }
}
function saveLayoutSize(id, patch) {
  if (!id) return;
  const sizes = loadLayoutSizes();
  if (patch) sizes[id] = { ...sizes[id], ...patch };
  else delete sizes[id];
  storageSet(LAYOUT_SIZES_KEY, JSON.stringify(sizes));
}

function applyFlexGrow(el, grow) {
  el.style.setProperty("--layout-grow", String(grow));
  el.dataset.layoutGrow = "";
}

function isWidgetGrid(el) {
  return Boolean(el && el.classList.contains("overview-grid"));
}

// Wachsende, offene Geschwister entlang der Hauptachse eines Flex-Containers
function flexGrowItems(parent) {
  return layoutItems(parent).filter(
    (el) => !el.classList.contains("collapsed") && parseFloat(getComputedStyle(el).flexGrow) > 0,
  );
}

// Sucht für jede Achse das Element, dessen Flex-Anteil die Größe bestimmt (das Widget selbst oder seine Zeile/Spalte)
function flexResizeTargets(item) {
  const targets = {};
  ["row", "column"].forEach((axis) => {
    let el = item;
    while (el && el.parentElement) {
      const parent = el.parentElement;
      const cs = getComputedStyle(parent);
      if (cs.display === "flex" && cs.flexDirection === axis) {
        const growing = flexGrowItems(parent);
        if (growing.length > 1 && growing.includes(el)) targets[axis] = el;
        break;
      }
      if (parent.classList.contains("page") || !parent.matches(LAYOUT_CONTAINER_SELECTOR)) break;
      el = parent;
    }
  });
  return targets;
}

function resizeMode(item) {
  if (item.classList.contains("collapsed")) return null;
  if (isWidgetGrid(item.parentElement)) return { grid: true, x: true, y: !MOBILE_SCROLL_QUERY.matches };
  if (MOBILE_SCROLL_QUERY.matches) return null;
  const t = flexResizeTargets(item);
  if (!t.row && !t.column) return null;
  return { grid: false, x: Boolean(t.row), y: Boolean(t.column), targets: t };
}

function updateResizeHandles() {
  if (!document.body.classList.contains("layout-editing")) return;
  document.querySelectorAll(".page.active .layout-resize").forEach((handle) => {
    const mode = resizeMode(handle.parentElement);
    handle.hidden = !mode;
    if (mode) handle.style.cursor = mode.x && mode.y ? "nwse-resize" : mode.x ? "ew-resize" : "ns-resize";
  });
}

function startFlexResize(e, item, targets) {
  const axes = Object.entries(targets).map(([axis, el]) => {
    const horizontal = axis === "row";
    const siblings = flexGrowItems(el.parentElement);
    const sizes = siblings.map((s) => (horizontal ? s.getBoundingClientRect().width : s.getBoundingClientRect().height));
    const total = sizes.reduce((a, b) => a + b, 0);
    return { el, horizontal, siblings, sizes, total, start: sizes[siblings.indexOf(el)] };
  });
  return (ev) => {
    axes.forEach(({ el, horizontal, siblings, sizes, total, start }) => {
      const delta = horizontal ? ev.clientX - e.clientX : ev.clientY - e.clientY;
      const min = Math.min(horizontal ? LAYOUT_MIN_WIDTH : LAYOUT_MIN_HEIGHT, total / siblings.length);
      const size = Math.min(Math.max(start + delta, min), total - min * (siblings.length - 1));
      const scale = (total - size) / (total - start || 1);
      siblings.forEach((s, i) => {
        const px = s === el ? size : sizes[i] * scale;
        const grow = +((px * siblings.length) / total).toFixed(3);
        applyFlexGrow(s, grow);
        saveLayoutSize(layoutItemId(s), { grow });
      });
    });
  };
}

function startGridResize(e, item) {
  const grid = item.parentElement;
  const cs = getComputedStyle(grid);
  const gap = parseFloat(cs.columnGap) || 0;
  const cols = cs.gridTemplateColumns.split(" ").length;
  const colWidth = (grid.clientWidth - gap * (cols - 1)) / cols;
  const startRect = item.getBoundingClientRect();

  return (ev) => {
    const width = startRect.width + ev.clientX - e.clientX;
    const span = Math.min(cols, Math.max(1, Math.round((width + gap) / (colWidth + gap))));
    const frac = +(span / cols).toFixed(3);
    item.dataset.colFrac = String(frac);
    saveLayoutSize(layoutItemId(item), { frac, span: undefined });
    // Neue Breite kann die Reihen umsortieren, daher die Höhe erst danach auf die aktuelle Reihe anwenden
    fitWidgetGrid(grid);
    if (MOBILE_SCROLL_QUERY.matches) return;

    const rows = grid._layoutRows || [];
    const rowIndex = rows.findIndex((row) => row.some(({ el }) => el === item));
    const rowPx = getComputedStyle(grid).gridTemplateRows.split(" ").map(parseFloat);
    const openRows = rows.map((_, i) => i).filter((i) => isOpenRow(rows[i]));
    const otherRows = openRows.filter((i) => i !== rowIndex);
    if (rowIndex < 0 || !otherRows.length) return;
    const totalOpen = openRows.reduce((sum, i) => sum + (rowPx[i] || 0), 0);
    const otherWeight = otherRows.reduce((sum, i) => sum + rowWeight(rows[i]), 0);
    const min = OVERVIEW_MIN_TILE;
    const h = Math.min(Math.max(startRect.height + ev.clientY - e.clientY, min), totalOpen - min * otherRows.length);
    const weight = +((h * otherWeight) / (totalOpen - h)).toFixed(3);
    item.dataset.rowWeight = String(weight);
    saveLayoutSize(layoutItemId(item), { weight });
    fitWidgetGrid(grid);
  };
}

function startLayoutResize(e, item) {
  if (e.button !== 0) return;
  const mode = resizeMode(item);
  if (!mode) return;
  e.preventDefault();
  e.stopPropagation();
  const onMove = mode.grid ? startGridResize(e, item) : startFlexResize(e, item, mode.targets);
  document.body.classList.add("layout-resize-active");
  item.classList.add("layout-resizing");
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.body.classList.remove("layout-resize-active");
    item.classList.remove("layout-resizing");
    if (mode.grid) fitWidgetGrid(item.parentElement);
    window.dispatchEvent(new Event("resize"));
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

function applySavedFlexSizes() {
  const sizes = loadLayoutSizes();
  document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((container) => {
    layoutItems(container, true).forEach((el) => {
      const grow = sizes[layoutItemId(el)]?.grow;
      if (grow > 0) applyFlexGrow(el, grow);
    });
  });
}

function refreshLayoutHandles() {
  document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((container) => {
    const items = layoutItems(container);
    items.forEach((item) => {
      const existing = [...item.children].find((c) => c.classList.contains("layout-handle"));
      const existingResize = [...item.children].find((c) => c.classList.contains("layout-resize"));
      if (items.length < 2 && !canRoam(item)) {
        if (existing) existing.remove();
        if (existingResize) existingResize.remove();
        delete item.dataset.layoutItem;
        return;
      }
      item.dataset.layoutItem = "";
      if (LAYOUT_GROUP_CLASSES.some((c) => item.classList.contains(c))) item.classList.add("layout-group");
      if (!existing) {
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "layout-handle";
        handle.setAttribute("aria-label", "Zum Verschieben ziehen");
        handle.title = "Zum Verschieben ziehen";
        handle.innerHTML = LAYOUT_HANDLE_SVG;
        handle.addEventListener("pointerdown", (e) => startLayoutDrag(e, item));
        item.prepend(handle);
      }
      // Kennzahlen-Karten liegen in einem festen Raster und behalten ihre Größe
      if (!existingResize && !container.classList.contains("stat-row")) {
        const resize = document.createElement("button");
        resize.type = "button";
        resize.className = "layout-resize";
        resize.setAttribute("aria-label", "Zum Ändern der Größe ziehen");
        resize.title = "Größe ändern";
        resize.innerHTML = RESIZE_HANDLE_SVG;
        resize.addEventListener("pointerdown", (e) => startLayoutResize(e, item));
        item.appendChild(resize);
      }
    });
  });
  updateResizeHandles();
}

function setLayoutEditing(editing) {
  document.body.classList.toggle("layout-editing", editing);
  document.querySelectorAll('[data-widget-action="arrange"]').forEach((btn) => {
    btn.setAttribute("aria-pressed", String(editing));
    btn.textContent = editing ? "✓ Fertig" : "✥ Anordnen";
  });
  updateResizeHandles();
}

function initLayout() {
  const containers = document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR);
  containers.forEach((container) => {
    const key = layoutContainerKey(container);
    layoutItems(container).forEach((child, i) => {
      if (!child.id && !child.dataset.layoutId) child.dataset.layoutId = `${key}#${i}`;
    });
    container._defaultOrder = layoutItems(container, true);
    container._defaultOrder.forEach((el) => (el._layoutHome = container));
  });
  applySavedPlaces();
  containers.forEach(applySavedLayoutOrder);
  updateEmptyGroups();
  applySavedFlexSizes();
  refreshLayoutHandles();

  document.querySelectorAll('[data-widget-action="arrange"]').forEach((btn) =>
    btn.addEventListener("click", () => setLayoutEditing(!document.body.classList.contains("layout-editing"))),
  );
}

// Stellt Reihenfolge, Größen und Einklapp-Zustand einer Seite wie im HTML vorgegeben wieder her
function resetLayoutOrderAndSizes(page) {
  const containers = [page, ...page.querySelectorAll(LAYOUT_CONTAINER_SELECTOR)];
  containers.forEach((container) => {
    (container._defaultOrder || []).forEach((el) => {
      container.appendChild(el);
      saveWidgetPlace(layoutItemId(el), null);
    });
    try {
      localStorage.removeItem(LAYOUT_STORAGE_PREFIX + layoutContainerKey(container));
    } catch (err) {}
    layoutItems(container, true).forEach((el) => {
      el.style.removeProperty("--layout-grow");
      delete el.dataset.layoutGrow;
      saveLayoutSize(layoutItemId(el), null);
    });
  });
  page.querySelectorAll(".collapsed").forEach((el) => {
    const btn = [...el.querySelectorAll(".panel-toggle")].find((b) => b.closest(".panel, .stat-card") === el);
    if (btn) setCollapsed(el, btn, false);
    else el.classList.remove("collapsed");
    const id = el.id || el.dataset.layoutId;
    if (id) storeCollapsed(id, false);
  });
}

initLayout();
addMissingToggles();

// ---- Live-Regenradar (Leaflet + RainViewer + Open-Meteo Geocoding) ----
const map = L.map("map", {
  zoomControl: true,
  attributionControl: true,
  maxZoom: 16,
}).setView([DEFAULT_PLACE.lat, DEFAULT_PLACE.lon], 8);
new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById("map"));

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles: Esri — Esri, HERE, Garmin, FAO, NOAA, USGS",
    maxZoom: 16,
  },
).addTo(map);

// Kommt aus js/config.js (nicht im Repository, Vorlage: js/config.example.js) und ist im Browser trotzdem sichtbar
const OPENWEATHER_KEY = (window.DASHBOARD_CONFIG && window.DASHBOARD_CONFIG.openWeatherKey) || "";
let radarLayers = [];
let frames = [];
let currentFrame = 0;
let playing = false;
let playTimer = null;
let openWeatherLayer = null;
let radarEpoch = 0;
const mapLoading = document.getElementById("mapLoading");
const slider = document.getElementById("frameSlider");
const frameTimeEl = document.getElementById("frameTime");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const radarProvider = document.getElementById("radarProvider");
const radarDetailNote = document.getElementById("radarDetailNote");
if (!OPENWEATHER_KEY) {
  const option = radarProvider.querySelector('option[value="openweather"]');
  option.disabled = true;
  option.textContent += " (kein API-Key in js/config.js)";
  radarProvider.value = "rainviewer";
}
const playback = document.getElementById("radarPlayback");

function formatFrameTime(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function stopPlayback() {
  playing = false;
  playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  clearInterval(playTimer);
  playTimer = null;
}

function showFrame(index) {
  if (!frames.length || radarProvider.value !== "rainviewer") return;
  currentFrame = ((index % frames.length) + frames.length) % frames.length;
  radarLayers.forEach((layer, i) => {
    if (i !== currentFrame && map.hasLayer(layer)) map.removeLayer(layer);
  });
  if (!map.hasLayer(radarLayers[currentFrame])) radarLayers[currentFrame].addTo(map);
  slider.value = String(currentFrame);
  frameTimeEl.textContent = formatFrameTime(frames[currentFrame].time) + " Uhr";
}

function clearRadar() {
  stopPlayback();
  radarLayers.forEach((layer) => {
    if (map.hasLayer(layer)) map.removeLayer(layer);
  });
  radarLayers = [];
  frames = [];
  slider.max = "0";
  slider.value = "0";
  frameTimeEl.textContent = "–";
  if (openWeatherLayer) {
    map.removeLayer(openWeatherLayer);
    openWeatherLayer = null;
  }
}

function setRadarStatus(message, error = false, onRetry = null) {
  if (error) renderRetry(mapLoading, message, onRetry);
  else mapLoading.textContent = message;
  mapLoading.classList.toggle("hidden", !message);
  mapLoading.classList.toggle("has-retry", Boolean(error && onRetry));
  mapLoading.setAttribute("role", error ? "alert" : "status");
}

async function loadRainViewer() {
  const epoch = ++radarEpoch;
  playback.hidden = false;
  radarDetailNote.textContent =
    "RainViewer: kostenlos bis Radar-Zoom 7. Bei höherem Kartenzoom wird das Radar vergrößert, nicht detaillierter.";
  if (!LEAFLET_AVAILABLE) {
    setRadarStatus("Karte nicht verfügbar – die Kartenbibliothek Leaflet konnte nicht geladen werden.", true);
    return false;
  }
  const hadFrames = radarLayers.length > 0;
  if (!hadFrames) setRadarStatus("Regendaten werden geladen …");
  try {
    const data = await fetchData("https://api.rainviewer.com/public/weather-maps.json", { source: "RainViewer" });
    const next = data.radar?.past || [];
    if (!next.length || !data.host?.startsWith("https://")) throw dataError("RainViewer", "keine Radarframes");
    if (epoch !== radarEpoch || radarProvider.value !== "rainviewer") return true;
    clearRadar();
    frames = next;
    radarLayers = frames.map((frame) =>
      L.tileLayer(`${data.host}${frame.path}/512/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.78,
        zIndex: 400,
        maxNativeZoom: 7,
        maxZoom: 16,
        tileSize: 256,
        updateWhenIdle: true,
      }),
    );
    slider.max = String(frames.length - 1);
    showFrame(frames.length - 1);
    setRadarStatus("");
    setLastUpdatedNow();
    return true;
  } catch (err) {
    reportError("Radar", err);
    if (epoch !== radarEpoch) return true;
    if (hadFrames) {
      radarDetailNote.textContent = `Radar nicht aktualisiert – ${describeError(err)}. Angezeigt wird der letzte Stand.`;
    } else {
      setRadarStatus(`Regendaten nicht verfügbar – ${describeError(err)}.`, true, loadRadar);
    }
    return false;
  }
}

function loadOpenWeather() {
  if (!LEAFLET_AVAILABLE) return loadRainViewer();
  ++radarEpoch;
  clearRadar();
  playback.hidden = true;
  radarDetailNote.textContent =
    "OpenWeather: aktuelle Niederschlagskarte (keine Radar-Animation); Detailgrad hängt von Quelldaten und Tarif ab.";
  setRadarStatus("Niederschlagskarte wird geladen …");
  let seen = false;
  openWeatherLayer = L.tileLayer(
    "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=" +
      encodeURIComponent(OPENWEATHER_KEY),
    {
      attribution: "Niederschlag © OpenWeather",
      opacity: 0.7,
      zIndex: 400,
      maxNativeZoom: 12,
      maxZoom: 16,
      updateWhenIdle: true,
    },
  );
  openWeatherLayer.on("tileload", () => {
    if (!seen && radarProvider.value === "openweather") {
      seen = true;
      setRadarStatus("");
      setLastUpdatedNow();
    }
  });
  openWeatherLayer.on("tileerror", () => {
    if (radarProvider.value !== "openweather" || seen) return;
    const reason =
      navigator.onLine === false ? "keine Internetverbindung" : "Kacheln nicht erreichbar, API-Key und Tarif prüfen";
    setRadarStatus(`Niederschlagskarte nicht verfügbar – ${reason}.`, true, loadRadar);
  });
  openWeatherLayer.addTo(map);
  return true;
}

function loadRadar() {
  return radarProvider.value === "openweather" ? loadOpenWeather() : loadRainViewer();
}

radarProvider.addEventListener("change", loadRadar);
slider.addEventListener("input", () => {
  stopPlayback();
  showFrame(Number(slider.value));
});

function startPlayback() {
  if (!frames.length || radarProvider.value !== "rainviewer") return;
  stopPlayback();
  playing = true;
  playIcon.innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  playTimer = setInterval(() => showFrame(currentFrame + 1), 850);
}

playBtn.addEventListener("click", () => (playing ? stopPlayback() : startPlayback()));

map.on("zoomend", () => {
  if (radarProvider.value === "rainviewer") {
    radarDetailNote.textContent =
      map.getZoom() > 7
        ? "Radarquelle nur bis Zoom 7: vergrößerte Darstellung, keine zusätzlichen Messdetails. Für eine aktuelle Niederschlagskarte OpenWeather wählen."
        : "RainViewer: kostenlose Radardaten bis Zoom 7; Animation der letzten Messungen.";
  }
});

loadRadar();

// Ortssuche über Open-Meteo Geocoding
let searchMarker = null;

async function searchPlace(query) {
  if (!query.trim()) return;
  showToast(`Suche "${query.trim()}" …`);
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=de&format=json`;
    const data = await fetchData(url, { source: "Ortssuche" });
    const hit = data.results?.[0];
    if (!hit) {
      showToast(`Kein Ort namens "${query.trim()}" gefunden`);
      return;
    }
    map.setView([hit.latitude, hit.longitude], 9);
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([hit.latitude, hit.longitude]).addTo(map);
    const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
    searchMarker.bindPopup(label).openPopup();
  } catch (err) {
    reportError("Ortssuche", err);
    showToast(`Ortssuche fehlgeschlagen – ${describeError(err)}`, "error");
  }
}

document.getElementById("radarForm").addEventListener("submit", (e) => {
  e.preventDefault();
  searchPlace(document.getElementById("radarInput").value);
});

document.getElementById("radarQuick").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-city]");
  if (!btn) return;
  document.getElementById("radarInput").value = btn.dataset.city;
  searchPlace(btn.dataset.city);
});

// ---- Live-Wetter mit Ortssuche (Open-Meteo) ----
const weatherIcons = {
  clear:
    '<circle cx="9" cy="9" r="5.2"/><path d="M9 1.4V3M9 15v1.6M1.4 9H3M15 9h1.6M3.5 3.5l1.1 1.1M13.4 13.4l1.1 1.1M3.5 14.5l1.1-1.1M13.4 4.6l1.1-1.1"/>',
  cloud: '<path d="M4 15.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 14 15.5z"/>',
  sun_cloud:
    '<circle cx="7" cy="7" r="3.4"/><path d="M7 1.4v1.1M7 12.5v1.1M1.4 7h1.1M12.5 7h1.1M2.9 2.9l.8.8M11.3 11.3l.8.8" opacity="0.6"/><path d="M6.5 15.5h6a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 3.6 9.9a3 3 0 0 0 .4 5.9h2.5z" fill="currentColor" fill-opacity="0.12"/>',
  rain: '<path d="M4 12.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 14 12z"/><path d="M5 15l-1 2M9 15l-1 2M13 15l-1 2"/>',
  snow: '<path d="M4 12.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 14 12z"/><path d="M6 15.5v2.6M6 15.5l-1.3 1M6 15.5l1.3 1M12 15.5v2.6M12 15.5l-1.3 1M12 15.5l1.3 1" opacity="0.8"/>',
  fog: '<path d="M4 8.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 8 3.2"/><path d="M2 12h14M2 15h14M4 9h10"/>',
  storm:
    '<path d="M4 12a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 14 11.5z"/><path d="M9.5 13l-2.5 4h2.5l-1.5 3"/>',
};

function weatherCodeInfo(code) {
  if (code === 0) return { text: "Klar", icon: "clear" };
  if (code === 1) return { text: "Überwiegend klar", icon: "sun_cloud" };
  if (code === 2) return { text: "Teils bewölkt", icon: "sun_cloud" };
  if (code === 3) return { text: "Bedeckt", icon: "cloud" };
  if (code === 45 || code === 48) return { text: "Nebel", icon: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: "Nieselregen", icon: "rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: "Regen", icon: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "Schnee", icon: "snow" };
  if ([95, 96, 99].includes(code)) return { text: "Gewitter", icon: "storm" };
  return { text: "Wechselhaft", icon: "cloud" };
}

const weatherDayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const weatherLoading = document.getElementById("weatherLoading");
let weatherData = null;
let selectedDayIndex = 0;

const iconPressure =
  '<path d="M8 1v6.5M8 7.5l-2.4-2.4M8 7.5l2.4-2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="11" r="5.5"/>';
const iconHumidity = '<path d="M8 1.5S3 7 3 10.5a5 5 0 0 0 10 0C13 7 8 1.5 8 1.5z"/>';
const iconWind =
  '<path d="M1.5 6h8a2 2 0 1 0-2-2" stroke-linecap="round"/><path d="M1.5 10h10a2 2 0 1 1-2 2" stroke-linecap="round"/>';
const iconFeels = '<circle cx="8" cy="11" r="3.5"/><path d="M8 8V2a1.5 1.5 0 0 1 3 0v6a4 4 0 1 1-3 0z"/>';
const iconUv =
  '<circle cx="8" cy="8" r="3.2"/><path d="M8 1.3v1.6M8 13.1v1.6M1.3 8h1.6M13.1 8h1.6M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"/>';
const iconSun =
  '<path d="M2 9.5A6 6 0 0 1 14 9.5" stroke-linecap="round"/><path d="M8 9.5V3M4.5 9.5L2.5 5.5M11.5 9.5l2-4" stroke-linecap="round"/><path d="M1 12.5h14" stroke-linecap="round"/>';

function statChip(icon, label, value) {
  return `<div class="weather-stat"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">${icon}</svg><div><div class="weather-stat-label">${label}</div><div class="weather-stat-value">${value}</div></div></div>`;
}

function formatHour(iso) {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit" }).replace(" Uhr", "") + " Uhr";
}

// ---- NEU: Balkendiagramm (Höchsttemperatur je Tag) ----
function renderForecastBars(data) {
  const el = document.getElementById("barChart");
  if (!el) return;
  const highs = data.daily.temperature_2m_max;
  const maxVal = Math.max(...highs);
  const minVal = Math.min(...highs);
  const span = Math.max(maxVal - minVal, 1);
  el.innerHTML = data.daily.time
    .map((dateStr, i) => {
      const d = new Date(dateStr + "T00:00:00");
      const high = Math.round(highs[i]);
      const heightPct = 22 + ((high - minVal) / span) * 78; // 22%–100%
      const label = i === 0 ? "Heute" : weatherDayLabels[d.getDay()];
      return `<div class="bar-col${i === 0 ? " today" : ""}">
      <div class="bar-value">${high}°</div>
      <div class="bar-track"><div class="bar" style="height:${heightPct.toFixed(0)}%"></div></div>
      <div class="bar-label">${label}</div>
    </div>`;
    })
    .join("");
}

// ---- NEU: Donut-Diagramm (Regenwahrscheinlichkeit) ----
function renderRainDonut(percent, captionText) {
  const el = document.getElementById("donutChart");
  if (!el) return;
  const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const filled = (p / 100) * circumference;
  el.innerHTML = `
    <svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="14"/>
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--orange)" stroke-width="14" transform="rotate(-90 60 60)"
        stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"/>
    </svg>
    <div class="donut-center">
      <div class="donut-pct">${p}%</div>
      <div class="donut-word">Regen</div>
    </div>`;
  const caption = document.getElementById("donutCaption");
  if (caption) caption.textContent = captionText || "";
}

// ---- NEU: Wellen-/Flächendiagramm (stündlicher Temperaturverlauf) ----
function renderTempWave(hourIdxForDay, hourly, nowIso) {
  const el = document.getElementById("waveChart");
  if (!el || !hourIdxForDay.length) return;
  const temps = hourIdxForDay.map((i) => hourly.temperature_2m[i]);
  const w = 600,
    h = 150,
    pad = 10;
  const maxT = Math.max(...temps),
    minT = Math.min(...temps);
  const span = Math.max(maxT - minT, 1);
  const stepX = (w - pad * 2) / (temps.length - 1 || 1);
  const points = temps.map((t, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((t - minT) / span) * (h - pad * 2);
    return [x, y];
  });
  const linePath = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaPath =
    linePath + ` L${points[points.length - 1][0].toFixed(1)} ${h - pad} L${points[0][0].toFixed(1)} ${h - pad} Z`;

  // Beschriftungen als HTML, weil Text im gestreckten SVG (preserveAspectRatio="none") verzerrt würde
  const xPct = (x) => ((x / w) * 100).toFixed(2) + "%";
  const yPct = (y) => ((y / h) * 100).toFixed(2) + "%";
  const xLabels = hourIdxForDay
    .map((idx, i) => ({ i, hour: Number(hourly.time[idx].slice(11, 13)) }))
    .filter(({ hour }) => hour % 6 === 0)
    .map(({ i, hour }) => `<span style="left:${xPct(points[i][0])}">${String(hour).padStart(2, "0")}:00</span>`)
    .join("");
  const yLabels =
    `<span style="top:${yPct(pad)}">${Math.round(maxT)}°</span>` +
    `<span style="top:${yPct(h / 2)}">${Math.round((maxT + minT) / 2)}°</span>` +
    `<span style="top:${yPct(h - pad)}">${Math.round(minT)}°</span>`;

  let nowLine = "";
  let nowLabel = "";
  if (nowIso) {
    const i = hourIdxForDay.findIndex((idx) => hourly.time[idx].startsWith(nowIso.slice(0, 13)));
    if (i >= 0) {
      const x = points[i][0].toFixed(1);
      nowLine = `<line x1="${x}" y1="0" x2="${x}" y2="${h}" style="stroke:var(--orange)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
      nowLabel = `<span class="wave-now-label" style="left:${xPct(points[i][0])}">jetzt</span>`;
    }
  }

  el.setAttribute("role", "img");
  el.setAttribute("aria-label", `Temperaturverlauf zwischen ${Math.round(minT)}° und ${Math.round(maxT)}°`);
  el.innerHTML = `
    <div class="wave-plot">
      <div class="wave-y">${yLabels}</div>
      <div class="wave-area">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style="stop-color:var(--orange);stop-opacity:0.35"/>
              <stop offset="100%" style="stop-color:var(--orange);stop-opacity:0"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#waveFill)" stroke="none"/>
          <path d="${linePath}" fill="none" style="stroke:var(--navy)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
          ${nowLine}
        </svg>
        ${nowLabel}
      </div>
      <div class="wave-x">${xLabels}</div>
    </div>`;
}

function renderDayDetail(index) {
  if (!weatherData) return;
  selectedDayIndex = index;

  document.querySelectorAll("#weatherForecast .day").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });

  const d = weatherData.daily;
  const dateStr = d.time[index];
  const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  document.getElementById("dayDetailTitle").textContent = dateLabel;

  const hourly = weatherData.hourly;
  const hourIdxForDay = hourly.time.map((t, i) => (t.startsWith(dateStr) ? i : -1)).filter((i) => i >= 0);

  const rainHours = hourIdxForDay.filter((i) => hourly.precipitation_probability[i] >= 30);
  let rainSummary;
  if (!rainHours.length) {
    rainSummary = "Kein nennenswerter Regen erwartet.";
  } else {
    const first = formatHour(hourly.time[rainHours[0]]);
    const last = formatHour(hourly.time[rainHours[rainHours.length - 1]]);
    const maxPop = Math.max(...rainHours.map((i) => hourly.precipitation_probability[i]));
    rainSummary =
      rainHours.length === 1
        ? `Regen wahrscheinlich um ${first} (bis zu ${maxPop} %).`
        : `Regen wahrscheinlich zwischen ${first} und ${last} (bis zu ${maxPop} %).`;
  }
  document.getElementById("dayDetailRain").textContent = rainSummary;

  const hoursEl = document.getElementById("dayDetailHours");
  hoursEl.innerHTML = "";
  hourIdxForDay
    .filter((_, pos) => pos % 2 === 0)
    .forEach((i) => {
      const info = weatherCodeInfo(hourly.weather_code[i]);
      const chip = document.createElement("div");
      chip.className = "hour-chip";
      chip.innerHTML = `
      <div class="hour-time">${hourly.time[i].slice(11, 16)}</div>
      <svg class="hour-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${weatherIcons[info.icon]}</svg>
      <div class="hour-temp">${Math.round(hourly.temperature_2m[i])}°</div>
      <div class="hour-rain">${hourly.precipitation_probability[i]}%</div>
    `;
      hoursEl.appendChild(chip);
    });
  hoursEl.scrollLeft = 0;
  updateHourScrollButtons();

  document.getElementById("dayDetail").classList.add("show");

  const dayPop = d.precipitation_probability_max[index] ?? 0;
  const shortLabel = index === 0 ? "heute" : dateLabel;
  renderRainDonut(dayPop, shortLabel);
  renderTempWave(hourIdxForDay, hourly, index === 0 ? weatherData.current.time : null);
  const waveLabelEl = document.getElementById("waveDayLabel");
  if (waveLabelEl) waveLabelEl.textContent = shortLabel + ", stündlich" + (weatherTzShort ? ` · ${weatherTzShort}` : "");

  const statsEl = document.getElementById("weatherStats");
  if (index === 0) {
    const c = weatherData.current;
    const sunrise = new Date(d.sunrise[0]).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(d.sunset[0]).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    statsEl.innerHTML =
      statChip(iconPressure, "Luftdruck", `${Math.round(c.surface_pressure)} hPa`) +
      statChip(iconHumidity, "Luftfeuchtigkeit", `${c.relative_humidity_2m} %`) +
      statChip(iconWind, "Wind", `${Math.round(c.wind_speed_10m)} km/h`) +
      statChip(iconFeels, "Gefühlt", `${Math.round(c.apparent_temperature)}°`) +
      statChip(iconUv, "UV-Index", `${Math.round(d.uv_index_max[0])}`) +
      statChip(iconSun, "Sonne", `${sunrise} – ${sunset}`);
  } else {
    const avgPressure = Math.round(
      hourIdxForDay.reduce((s, i) => s + hourly.surface_pressure[i], 0) / hourIdxForDay.length,
    );
    const avgHumidity = Math.round(
      hourIdxForDay.reduce((s, i) => s + hourly.relative_humidity_2m[i], 0) / hourIdxForDay.length,
    );
    const sunrise = new Date(d.sunrise[index]).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(d.sunset[index]).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    statsEl.innerHTML =
      statChip(iconPressure, "Luftdruck (Ø)", `${avgPressure} hPa`) +
      statChip(iconHumidity, "Luftfeuchte (Ø)", `${avgHumidity} %`) +
      statChip(iconWind, "Wind (max.)", `${Math.round(d.wind_speed_10m_max[index])} km/h`) +
      statChip(iconUv, "UV-Index", `${Math.round(d.uv_index_max[index])}`) +
      statChip(iconSun, "Sonne", `${sunrise} – ${sunset}`);
  }
}

// ---- Stundenleiste mit Pfeiltasten (Scrollbars sind ausgeblendet) ----
const hourStripEl = document.getElementById("dayDetailHours");
const hourPrevBtn = document.getElementById("hourScrollPrev");
const hourNextBtn = document.getElementById("hourScrollNext");

function updateHourScrollButtons() {
  hourPrevBtn.disabled = hourStripEl.scrollLeft <= 2;
  hourNextBtn.disabled = hourStripEl.scrollLeft + hourStripEl.clientWidth >= hourStripEl.scrollWidth - 2;
}
hourPrevBtn.addEventListener("click", () => hourStripEl.scrollBy({ left: -hourStripEl.clientWidth * 0.8 }));
hourNextBtn.addEventListener("click", () => hourStripEl.scrollBy({ left: hourStripEl.clientWidth * 0.8 }));
hourStripEl.addEventListener("scroll", updateHourScrollButtons);
// Auf versteckten Seiten ist die Breite 0 — beim Einblenden neu prüfen
new ResizeObserver(updateHourScrollButtons).observe(hourStripEl);

// ---- KPI-Vergleich mit dem Vortag ----
// Mit past_days=1 liefert Open-Meteo den Vortag vorne mit; er wird abgetrennt,
// damit Index 0 im Rest des Codes weiterhin "heute" ist.
function splitOffYesterday(data) {
  const yDate = data.daily.time[0];
  const cut = data.hourly.time.findIndex((t) => !t.startsWith(yDate));
  const yesterday = { hourly: {}, daily: {} };
  Object.keys(data.hourly).forEach((k) => {
    yesterday.hourly[k] = data.hourly[k].slice(0, cut);
    data.hourly[k] = data.hourly[k].slice(cut);
  });
  Object.keys(data.daily).forEach((k) => {
    yesterday.daily[k] = data.daily[k][0];
    data.daily[k] = data.daily[k].slice(1);
  });
  return yesterday;
}

function sameHourYesterday(yesterday, currentIso, key) {
  const hour = currentIso.slice(11, 13);
  const i = yesterday.hourly.time.findIndex((t) => t.slice(11, 13) === hour);
  return i >= 0 ? yesterday.hourly[key][i] : null;
}

function formatDelta(now, before, unit, compareText, decimals = 0) {
  if (now == null || before == null) return null;
  const factor = 10 ** decimals;
  const diff = Math.round((now - before) * factor) / factor;
  if (diff === 0) return { main: "→", suffix: `wie ${compareText}` };
  const amount = Math.abs(diff).toLocaleString("de-DE", { maximumFractionDigits: decimals });
  return { main: `${diff > 0 ? "↑" : "↓"} ${amount}${unit}`, suffix: `ggü. ${compareText}` };
}

// Der Zusatztext wird auf schmalen Bildschirmen per CSS ausgeblendet
function setStatDelta(id, delta) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = delta ? delta.main : "";
  if (delta && delta.suffix) {
    const suffix = document.createElement("span");
    suffix.className = "stat-delta-suffix";
    suffix.textContent = " " + delta.suffix;
    el.appendChild(suffix);
  }
}

// ---- Zeitzone des gesuchten Orts ----
let weatherTzShort = "";

function formatUtcOffset(seconds) {
  const sign = seconds >= 0 ? "+" : "−";
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.round((abs % 3600) / 60);
  return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

function updateTimezoneNote(data, label) {
  const tzEl = document.getElementById("weatherTzNote");
  const browserOffset = -new Date().getTimezoneOffset() * 60;
  if (typeof data.utc_offset_seconds !== "number" || data.utc_offset_seconds === browserOffset) {
    weatherTzShort = "";
    tzEl.hidden = true;
    return;
  }
  const place = label.split(",")[0];
  weatherTzShort = `Ortszeit ${place}`;
  tzEl.textContent = `Alle Uhrzeiten in Ortszeit ${place} (${formatUtcOffset(data.utc_offset_seconds)})`;
  tzEl.hidden = false;
}

function renderWeatherNoData() {
  const msg = '<div class="chart-empty">Keine Daten verfügbar</div>';
  ["barChart", "donutChart", "waveChart"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = msg;
  });
  ["statTempDelta", "statWindDelta", "statHumidityDelta", "statRainDelta"].forEach((id) =>
    setStatDelta(id, { main: "Keine Daten", suffix: "verfügbar" }),
  );
  document.getElementById("weatherRange").textContent = "Keine Daten verfügbar";
}

async function loadWeatherForPlace(lat, lon, label) {
  currentWeatherCoords = { lat, lon, label };
  weatherLoading.textContent = `Lade Wetter für "${label}" …`;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,surface_pressure,relative_humidity_2m,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&timezone=auto&forecast_days=6&past_days=1`;
    const data = await fetchData(url, { source: "Wetter" });
    if (!data.current || !(data.daily?.time?.length > 1)) throw dataError("Wetter", "unvollständige Wetterdaten");
    const yesterday = splitOffYesterday(data);
    weatherData = data;
    updateTimezoneNote(data, label);

    document.getElementById("weatherPlaceName").textContent = label;
    const sidebarPlaceEl = document.getElementById("sidebarPlaceName");
    if (sidebarPlaceEl) sidebarPlaceEl.textContent = label;

    const cur = weatherCodeInfo(data.current.weather_code);
    document.getElementById("weatherTempNow").textContent = `${Math.round(data.current.temperature_2m)}°`;
    document.getElementById("weatherConditionText").textContent = cur.text;
    document.getElementById("weatherIcon").innerHTML = weatherIcons[cur.icon];

    const hi = Math.round(data.daily.temperature_2m_max[0]);
    const lo = Math.round(data.daily.temperature_2m_min[0]);
    const pop = data.daily.precipitation_probability_max[0];
    document.getElementById("weatherRange").textContent =
      `Heute ${lo}° – ${hi}° · ${pop ?? 0} % Regenwahrscheinlichkeit`;

    // NEU: Kopfzeilen-Stat-Karten
    const statTempEl = document.getElementById("statTempNow");
    const statWindEl = document.getElementById("statWind");
    const statHumEl = document.getElementById("statHumidity");
    const statRainEl = document.getElementById("statRain");
    if (statTempEl) statTempEl.textContent = `${Math.round(data.current.temperature_2m)}°`;
    if (statWindEl) statWindEl.textContent = `${Math.round(data.current.wind_speed_10m)} km/h`;
    if (statHumEl) statHumEl.textContent = `${data.current.relative_humidity_2m}%`;
    if (statRainEl) statRainEl.textContent = `${pop ?? 0}%`;

    const c = data.current;
    setStatDelta(
      "statTempDelta",
      formatDelta(c.temperature_2m, sameHourYesterday(yesterday, c.time, "temperature_2m"), "°", "gestern"),
    );
    setStatDelta(
      "statWindDelta",
      formatDelta(c.wind_speed_10m, sameHourYesterday(yesterday, c.time, "wind_speed_10m"), " km/h", "gestern"),
    );
    setStatDelta(
      "statHumidityDelta",
      formatDelta(c.relative_humidity_2m, sameHourYesterday(yesterday, c.time, "relative_humidity_2m"), " %", "gestern"),
    );
    setStatDelta(
      "statRainDelta",
      formatDelta(pop, yesterday.daily.precipitation_probability_max, " %", "gestern"),
    );

    renderForecastBars(data);

    const forecastEl = document.getElementById("weatherForecast");
    forecastEl.innerHTML = "";
    data.daily.time.forEach((dateStr, i) => {
      const d = new Date(dateStr + "T00:00:00");
      const info = weatherCodeInfo(data.daily.weather_code[i]);
      const isToday = i === 0;
      const dayEl = document.createElement("div");
      dayEl.className = "day" + (isToday ? " today" : "");
      dayEl.innerHTML = `
        <div class="day-label">${weatherDayLabels[d.getDay()]}</div>
        <svg class="day-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:20px;height:20px;">${weatherIcons[info.icon]}</svg>
        <div class="day-high">${Math.round(data.daily.temperature_2m_max[i])}°</div>
        <div class="day-low">${Math.round(data.daily.temperature_2m_min[i])}°</div>
      `;
      dayEl.addEventListener("click", () => renderDayDetail(i));
      forecastEl.appendChild(dayEl);
    });

    renderDayDetail(0);

    document.getElementById("weatherSourceNote").textContent =
      "Live-Daten von Open-Meteo · Tag anklicken für Details · aktualisiert bei jeder Suche";
    weatherLoading.textContent = "";
    setLastUpdatedNow();
    return true;
  } catch (err) {
    reportError("Wetter", err);
    const stale = weatherData ? " Angezeigt wird der letzte Stand." : "";
    renderRetry(weatherLoading, `Wetter für "${label}" nicht verfügbar – ${describeError(err)}.${stale}`, () =>
      loadWeatherForPlace(lat, lon, label),
    );
    if (!weatherData) renderWeatherNoData();
    return false;
  }
}

async function searchWeatherPlace(query) {
  if (!query.trim()) return;
  weatherLoading.textContent = `Suche "${query.trim()}" …`;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=de&format=json`;
    const data = await fetchData(url, { source: "Ortssuche" });
    const hit = data.results?.[0];
    if (!hit) {
      weatherLoading.textContent = `Kein Ort namens "${query.trim()}" gefunden`;
      return;
    }
    const label = [hit.name, hit.country].filter(Boolean).join(", ");
    loadWeatherForPlace(hit.latitude, hit.longitude, label);
  } catch (err) {
    reportError("Ortssuche", err);
    renderRetry(weatherLoading, `Ortssuche fehlgeschlagen – ${describeError(err)}.`, () => searchWeatherPlace(query));
  }
}

document.getElementById("weatherSearchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  searchWeatherPlace(document.getElementById("weatherSearchInput").value);
});

loadWeatherForPlace(DEFAULT_PLACE.lat, DEFAULT_PLACE.lon, DEFAULT_PLACE.label);

// ---- Interaktiver Kalender mit lokal gespeicherten Terminen ----
function loadCalEvents() {
  try {
    const raw = localStorage.getItem("dashboard-cal-events");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
}

function saveCalEvents(events) {
  storageSet("dashboard-cal-events", JSON.stringify(events));
  document.dispatchEvent(new Event("calendar-change"));
}

let calEvents = loadCalEvents();
const today = new Date();

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const calMonthNames = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const calWeekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const CAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Jede Instanz hat eigenen Monat und ausgewählten Tag; die Termine sind für alle gleich
function mountCalendarWidget(body) {
  renderInto(
    body,
    `<div class="calendar cal-widget">
      <div class="cal-header">
        <div class="cal-title"></div>
        <div class="cal-nav">
          <button type="button" class="cal-prev" aria-label="Vorheriger Monat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" class="cal-today-btn" aria-label="Heute">Heute</button>
          <button type="button" class="cal-next" aria-label="Nächster Monat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
      <div class="cal-grid"></div>
      <div class="cal-selected-date">Termine für <span class="cal-selected-label">heute</span></div>
      <div class="cal-events"></div>
      <form class="cal-add">
        <input type="text" class="cal-add-input" placeholder="Termin hinzufügen …" autocomplete="off" required aria-label="Terminname">
        <input type="time" class="cal-add-time" aria-label="Uhrzeit" required>
        <label class="cal-all-day"><input type="checkbox" class="cal-all-day-input">Ganztags</label>
        <button type="submit" aria-label="Termin hinzufügen">+</button>
      </form>
    </div>`,
  );
  const $ = (sel) => body.querySelector(sel);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = dateKey(today);

  function renderGrid() {
    $(".cal-title").textContent = `${calMonthNames[viewMonth]} ${viewYear}`;
    const grid = $(".cal-grid");
    grid.innerHTML = "";
    calWeekdayLabels.forEach((wd) => {
      const el = document.createElement("div");
      el.className = "cal-weekday";
      el.textContent = wd;
      grid.appendChild(el);
    });

    let startOffset = new Date(viewYear, viewMonth, 1).getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    for (let i = startOffset; i > 0; i--) cells.push({ day: daysInPrevMonth - i + 1, muted: true, month: viewMonth - 1 });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, muted: false, month: viewMonth });
    while (cells.length % 7 !== 0 || cells.length < 35) {
      cells.push({ day: cells.length - (startOffset + daysInMonth) + 1, muted: true, month: viewMonth + 1 });
    }

    cells.forEach((cell) => {
      const cellDate = new Date(viewYear, cell.month, cell.day);
      const key = dateKey(cellDate);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "cal-day" +
        (cell.muted ? " muted" : "") +
        (key === dateKey(today) ? " today" : "") +
        (key === selectedKey ? " selected" : "") +
        (calEvents[key]?.length ? " has-event" : "");
      btn.textContent = cell.day;
      btn.addEventListener("click", () => {
        selectedKey = key;
        if (cell.muted) {
          viewYear = cellDate.getFullYear();
          viewMonth = cellDate.getMonth();
        }
        render();
      });
      grid.appendChild(btn);
    });
  }

  function renderEvents() {
    const [y, m, d] = selectedKey.split("-").map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    $(".cal-selected-label").textContent = selectedKey === dateKey(today) ? `heute, ${label}` : label;

    const list = $(".cal-events");
    list.innerHTML = "";
    const items = (calEvents[selectedKey] || [])
      .map((item, index) => ({
        index,
        event: typeof item === "string" ? { text: item, allDay: true, time: "" } : item,
      }))
      .sort((a, b) => {
        const aKey = a.event.allDay || !CAL_TIME_PATTERN.test(a.event.time || "") ? "" : a.event.time;
        const bKey = b.event.allDay || !CAL_TIME_PATTERN.test(b.event.time || "") ? "" : b.event.time;
        return aKey.localeCompare(bKey) || a.index - b.index;
      });
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "cal-empty";
      empty.textContent = "Keine Termine — trag unten etwas ein.";
      list.appendChild(empty);
      return;
    }
    items.forEach(({ event, index }) => {
      const row = document.createElement("div");
      row.className = "cal-event";
      const info = document.createElement("span");
      info.className = "event-info";
      const time = document.createElement("span");
      time.className = "event-time";
      time.textContent = event.allDay || !event.time ? "Ganztags" : event.time + " Uhr";
      const name = document.createElement("span");
      name.className = "event-name";
      name.textContent = event.text || "";
      info.append(time, name);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", "Termin löschen");
      remove.textContent = "×";
      row.append(info, remove);
      remove.addEventListener("click", () => {
        calEvents[selectedKey].splice(index, 1);
        if (!calEvents[selectedKey].length) delete calEvents[selectedKey];
        saveCalEvents(calEvents);
      });
      list.appendChild(row);
    });
  }

  function render() {
    renderGrid();
    renderEvents();
  }

  const shiftMonth = (delta) => {
    viewMonth += delta;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    } else if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderGrid();
  };
  $(".cal-prev").addEventListener("click", () => shiftMonth(-1));
  $(".cal-next").addEventListener("click", () => shiftMonth(1));
  $(".cal-today-btn").addEventListener("click", () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    selectedKey = dateKey(today);
    render();
  });

  const input = $(".cal-add-input");
  const timeInput = $(".cal-add-time");
  const allDayInput = $(".cal-all-day-input");
  allDayInput.addEventListener("change", () => {
    timeInput.disabled = allDayInput.checked;
    timeInput.required = !allDayInput.checked;
  });
  $(".cal-add").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const allDay = allDayInput.checked;
    const time = timeInput.value;
    if (!allDay && !CAL_TIME_PATTERN.test(time)) {
      timeInput.reportValidity();
      return;
    }
    if (!calEvents[selectedKey]) calEvents[selectedKey] = [];
    calEvents[selectedKey].push({ text, allDay, time: allDay ? "" : time });
    input.value = "";
    saveCalEvents(calEvents);
  });

  render();
  document.addEventListener("calendar-change", render);
  return () => document.removeEventListener("calendar-change", render);
}

// ---- Feuerwehr Berlin: Brandeinsätze der letzten 7 Tage ----
const FIRE_DATA_URL =
  "https://raw.githubusercontent.com/Berliner-Feuerwehr/BF-Open-Data/main/Datasets/Daily_Data/BFw_mission_data_daily.csv";
let fireDays = [];

function parseFireCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const idx = {
    date: header.indexOf("mission_created_date"),
    fire: header.indexOf("mission_count_fire"),
    tech: header.indexOf("mission_count_technical_rescue"),
    all: header.indexOf("mission_count_all"),
    pump: header.indexOf("response_time_fire_time_to_first_pump_median"),
  };
  if (Object.values(idx).some((i) => i < 0)) throw new Error("Unbekanntes CSV-Format");
  const num = (v) => (v === undefined || v === "" ? null : Number(v));
  return lines
    .slice(-14)
    .map((line) => {
      const c = line.split(",");
      return { date: c[idx.date], fire: num(c[idx.fire]), tech: num(c[idx.tech]), all: num(c[idx.all]), pump: num(c[idx.pump]) };
    })
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && Number.isFinite(d.fire))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function sumBy(days, key) {
  return days.reduce((sum, d) => sum + (d[key] || 0), 0);
}
function meanBy(days, key) {
  const values = days.map((d) => d[key]).filter((v) => Number.isFinite(v));
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
function formatMinSec(seconds) {
  if (!Number.isFinite(seconds)) return "–";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min`;
}
function fireWeekday(iso) {
  return weatherDayLabels[new Date(iso + "T00:00:00").getDay()];
}
function fireShortDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
function fireDayLabel(iso) {
  return `${fireWeekday(iso)}, ${fireShortDate(iso)}`;
}

function renderFire(days) {
  const week = days.slice(-7);
  const prev = days.length >= 14 ? days.slice(-14, -7) : null;
  const last = week[week.length - 1];

  const total = sumBy(week, "fire");
  const prevTotal = prev ? sumBy(prev, "fire") : null;
  document.getElementById("fireTotal").textContent = total.toLocaleString("de-DE");
  setStatDelta("fireTotalDelta", formatDelta(total, prevTotal, "", "Vorwoche"));

  const avg = total / week.length;
  document.getElementById("fireAvg").textContent = avg.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  setStatDelta("fireAvgDelta", formatDelta(avg, prev ? prevTotal / prev.length : null, "", "Vorwoche", 1));

  const peak = week.reduce((a, b) => (b.fire > a.fire ? b : a));
  document.getElementById("firePeak").textContent = peak.fire.toLocaleString("de-DE");
  setStatDelta("firePeakDelta", { main: fireDayLabel(peak.date), suffix: "" });

  const response = meanBy(week, "pump");
  const responseEl = document.getElementById("fireResponse");
  responseEl.textContent = formatMinSec(response).replace(" min", "");
  if (Number.isFinite(response)) {
    const unit = document.createElement("span");
    unit.className = "stat-unit";
    unit.textContent = " min";
    responseEl.appendChild(unit);
  }
  setStatDelta("fireResponseDelta", formatDelta(response, prev ? meanBy(prev, "pump") : null, " s", "Vorwoche"));

  const bar = document.getElementById("fireBarChart");
  const max = Math.max(...week.map((d) => d.fire), 1);
  bar.setAttribute("role", "img");
  bar.setAttribute("aria-label", `Brandeinsätze pro Tag: ${week.map((d) => `${fireDayLabel(d.date)} ${d.fire}`).join(", ")}`);
  bar.innerHTML = week
    .map(
      (d) => `<div class="bar-col${d === peak ? " today" : ""}" title="${fireDayLabel(d.date)}: ${d.fire} Brandeinsätze">
      <div class="bar-value">${d.fire}</div>
      <div class="bar-track"><div class="bar" style="height:${Math.max(4, (d.fire / max) * 100).toFixed(0)}%"></div></div>
      <div class="bar-label">${fireWeekday(d.date)}<span class="bar-date">${fireShortDate(d.date)}</span></div>
    </div>`,
    )
    .join("");
  document.getElementById("fireChartSub").textContent =
    `${fireDayLabel(week[0].date)} – ${fireDayLabel(last.date)} · orange = Spitzentag`;

  const all = sumBy(week, "all");
  const share = all ? (total / all) * 100 : 0;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(share, 100) / 100) * circumference;
  document.getElementById("fireDonut").innerHTML = `
    <svg viewBox="0 0 120 120" role="img" aria-label="${share.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Prozent aller Einsätze waren Brände">
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="14"/>
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--orange)" stroke-width="14" transform="rotate(-90 60 60)"
        stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"/>
    </svg>
    <div class="donut-center">
      <div class="donut-pct">${share.toLocaleString("de-DE", { maximumFractionDigits: 1 })}%</div>
      <div class="donut-word">Brände</div>
    </div>`;
  document.getElementById("fireDonutCaption").textContent =
    `${total.toLocaleString("de-DE")} von ${all.toLocaleString("de-DE")} Einsätzen`;

  document.getElementById("fireTableBody").innerHTML = [...week]
    .reverse()
    .map(
      (d) => `<tr>
      <td>${fireDayLabel(d.date)}</td>
      <td>${d.fire.toLocaleString("de-DE")}</td>
      <td>${Number.isFinite(d.tech) ? d.tech.toLocaleString("de-DE") : "–"}</td>
      <td>${Number.isFinite(d.all) ? d.all.toLocaleString("de-DE") : "–"}</td>
      <td>${formatMinSec(d.pump)}</td>
    </tr>`,
    )
    .join("");

  const ageDays = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(last.date + "T00:00:00")) / 86400000);
  document.getElementById("fireSourceNote").textContent =
    `Quelle: Berliner Feuerwehr Open Data · Stand: ${fireDayLabel(last.date)}` +
    (ageDays > 2 ? ` (Daten ${ageDays} Tage alt)` : "") +
    " · Tage nach Berliner Ortszeit";
  document.getElementById("fireExportBtn").disabled = false;
}

function renderFireNoData() {
  ["fireTotal", "fireAvg", "firePeak", "fireResponse"].forEach((id) => {
    document.getElementById(id).textContent = "–";
  });
  ["fireTotalDelta", "fireAvgDelta", "firePeakDelta", "fireResponseDelta"].forEach((id) =>
    setStatDelta(id, { main: "Keine Daten", suffix: "verfügbar" }),
  );
  ["fireBarChart", "fireDonut"].forEach((id) => {
    document.getElementById(id).innerHTML = '<div class="chart-empty">Keine Daten verfügbar</div>';
  });
  document.getElementById("fireDonutCaption").textContent = "";
  document.getElementById("fireTableBody").innerHTML =
    '<tr><td colspan="5" class="fire-table-empty">Keine Daten verfügbar</td></tr>';
  document.getElementById("fireExportBtn").disabled = true;
}

async function loadFireData() {
  try {
    const csv = await fetchData(FIRE_DATA_URL, { source: "Feuerwehr", parse: "text", cache: "no-cache", timeout: 20000 });
    const days = parseFireCsv(csv);
    if (!days.length) throw dataError("Feuerwehr", "keine Tageswerte in der Datei");
    fireDays = days;
    renderFire(days);
    return true;
  } catch (err) {
    reportError("Feuerwehr", err);
    if (!fireDays.length) renderFireNoData();
    const stale = fireDays.length ? " Angezeigt wird der letzte Stand." : "";
    renderRetry(
      document.getElementById("fireSourceNote"),
      `Daten der Berliner Feuerwehr nicht verfügbar – ${describeError(err)}.${stale}`,
      loadFireData,
    );
    return false;
  }
}

document.getElementById("fireExportBtn").addEventListener("click", () => {
  const week = fireDays.slice(-7);
  if (!week.length) return;
  const rows = [
    ["Datum", "Brandeinsätze", "Technische Hilfe", "Alle Einsätze", "Eintreffzeit 1. Löschfahrzeug Median (s)"],
    ...week.map((d) => [d.date, d.fire, d.tech ?? "", d.all ?? "", Number.isFinite(d.pump) ? Math.round(d.pump) : ""]),
  ];
  // BOM und Semikolon, damit Excel mit deutscher Einstellung Umlaute und Spalten richtig liest
  const csv = "\uFEFF" + rows.map((row) => row.join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `feuerwehr-berlin-brandeinsaetze-${week[week.length - 1].date}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

loadFireData();

// ---- Wasserpegel: aktuelle Wasserstände von PEGELONLINE (WSV) ----
const PEGEL_API = "https://www.pegelonline.wsv.de/webservices/rest-api/v2";
const WATER_DEFAULT_STATION = "47d3e815-c556-4e1b-93de-9fe07329fb00"; // Berlin-Köpenick
const WATER_STATION_KEY = "dashboard-water-station";
const WATER_STATE_LABELS = { low: "Niedrig", normal: "Normal", high: "Hoch" };
const WATER_REF_LINES = ["MNW", "MW", "MHW"];
let waterStations = [];
let waterStationId = WATER_DEFAULT_STATION;
try {
  waterStationId = localStorage.getItem(WATER_STATION_KEY) || WATER_DEFAULT_STATION;
} catch (err) {}

// PEGELONLINE liefert Namen in Großbuchstaben
function pegelName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/(^|[\s\-(/.])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase())
    .replace(/\b(Op|Up)\b/g, (m) => m.toUpperCase());
}
function pegelLabel(station) {
  return `${pegelName(station.longname)} (${pegelName(station.water?.longname)})`;
}
function waterLevelOf(station) {
  return station.timeseries?.find((t) => t.shortname === "W")?.currentMeasurement;
}

function fetchPegel(path) {
  return fetchData(PEGEL_API + path, { source: "PEGELONLINE" });
}
let waterShownId = null;

async function loadWaterStations() {
  const list = document.getElementById("waterBerlinList");
  try {
    const data = await fetchPegel("/stations.json?includeTimeseries=true&includeCurrentMeasurement=true");
    waterStations = data
      .filter((s) => s.timeseries?.some((t) => t.shortname === "W"))
      .sort((a, b) => a.longname.localeCompare(b.longname, "de"));
    const datalist = document.getElementById("waterStationList");
    datalist.replaceChildren(
      ...waterStations.map((s) => {
        const opt = document.createElement("option");
        opt.value = pegelLabel(s);
        return opt;
      }),
    );
    renderBerlinStations();
    return true;
  } catch (err) {
    reportError("Pegelliste", err);
    if (!waterStations.length) {
      renderRetry(list, `Pegelliste nicht verfügbar – ${describeError(err)}.`, loadWaterStations, "chart-empty");
    }
    return false;
  }
}

function renderBerlinStations() {
  const list = document.getElementById("waterBerlinList");
  const berlin = waterStations.filter((s) => s.longname.startsWith("BERLIN"));
  if (!berlin.length) {
    list.innerHTML = '<div class="chart-empty">Keine Berliner Pegel gefunden.</div>';
    return;
  }
  list.replaceChildren(
    ...berlin.map((s) => {
      const m = waterLevelOf(s);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "water-item" + (s.uuid === waterStationId ? " selected" : "");
      btn.innerHTML = `
        <span class="water-item-text"><span class="water-item-name"></span><span class="water-item-water"></span></span>
        <span class="water-item-value"></span>`;
      btn.querySelector(".water-item-name").textContent = pegelName(s.longname).replace(/^Berlin-/, "");
      btn.querySelector(".water-item-water").textContent = pegelName(s.water?.longname);
      const value = btn.querySelector(".water-item-value");
      value.textContent = m ? `${Math.round(m.value)} cm` : "–";
      if (m && WATER_STATE_LABELS[m.stateMnwMhw]) {
        value.classList.add("water-state-" + m.stateMnwMhw);
        value.title = WATER_STATE_LABELS[m.stateMnwMhw];
      }
      btn.addEventListener("click", () => selectWaterStation(s.uuid));
      return btn;
    }),
  );
}

// Messwert, der am nächsten an einem Zeitpunkt liegt
function measurementNear(measurements, time) {
  let best = null;
  measurements.forEach((m) => {
    const d = Math.abs(new Date(m.timestamp) - time);
    if (!best || d < best.d) best = { m, d };
  });
  return best?.m;
}

async function loadWaterStation(id) {
  const chartEl = document.getElementById("waterChart");
  try {
    const [station, series, measurements] = await Promise.all([
      fetchPegel(`/stations/${id}.json`),
      fetchPegel(`/stations/${id}/W.json?includeCharacteristicValues=true&includeCurrentMeasurement=true`),
      fetchPegel(`/stations/${id}/W/measurements.json?start=P7D`),
    ]);
    const name = pegelName(station.longname);
    const current = series.currentMeasurement || measurements[measurements.length - 1];
    const chars = Object.fromEntries((series.characteristicValues || []).map((c) => [c.shortname, c.value]));
    const values = measurements.map((m) => m.value);

    document.getElementById("waterLevel").textContent = current ? `${Math.round(current.value)} cm` : "–";
    document.getElementById("waterLevelLabel").textContent = `Wasserstand ${name}`;
    const dayAgo = current && measurementNear(measurements, new Date(current.timestamp) - 24 * 3600 * 1000);
    setStatDelta("waterLevelDelta", current && dayAgo ? formatDelta(current.value, dayAgo.value, " cm", "gestern") : null);

    document.getElementById("waterState").textContent = WATER_STATE_LABELS[current?.stateMnwMhw] || "–";
    setStatDelta(
      "waterStateDelta",
      chars.MW != null ? { main: `MW ${Math.round(chars.MW)} cm`, suffix: "(Mittelwasser)" } : { main: "keine Kennwerte" },
    );

    if (values.length) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      document.getElementById("waterRange").textContent = `${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))} cm`;
      setStatDelta("waterRangeDelta", { main: `Ø ${Math.round(avg)} cm` });
    } else {
      document.getElementById("waterRange").textContent = "–";
      setStatDelta("waterRangeDelta", null);
    }

    const ts = current ? new Date(current.timestamp) : null;
    document.getElementById("waterTime").textContent = ts
      ? ts.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr"
      : "–";
    setStatDelta(
      "waterTimeDelta",
      ts ? { main: ts.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), suffix: `· ${pegelName(station.water?.longname)}` } : null,
    );

    document.getElementById("waterChartTitle").textContent = `Pegelverlauf · ${name}`;
    document.getElementById("waterChartSub").textContent = `${name} · letzte 7 Tage · Wasserstand in cm`;
    renderWaterChart(chartEl, measurements, chars);
    waterShownId = id;
    setLastUpdatedNow();
    return true;
  } catch (err) {
    reportError("Pegel", err);
    if (waterShownId === id) {
      document.getElementById("waterChartSub").textContent =
        `Nicht aktualisiert – ${describeError(err)}. Angezeigt wird der letzte Stand.`;
    } else {
      renderRetry(chartEl, `Pegeldaten nicht verfügbar – ${describeError(err)}.`, () => loadWaterStation(id), "chart-empty");
    }
    return false;
  }
}

function renderWaterChart(el, measurements, chars) {
  if (!measurements.length) {
    el.innerHTML = '<div class="chart-empty">Keine Messwerte der letzten 7 Tage.</div>';
    return;
  }
  const step = Math.max(1, Math.floor(measurements.length / 240));
  const points = measurements.filter((_, i) => i % step === 0 || i === measurements.length - 1);
  const refs = WATER_REF_LINES.filter((k) => chars[k] != null).map((k) => ({ key: k, value: chars[k] }));
  const all = [...points.map((m) => m.value), ...refs.map((r) => r.value)];
  const pad0 = Math.max((Math.max(...all) - Math.min(...all)) * 0.12, 2);
  const minV = Math.min(...all) - pad0;
  const maxV = Math.max(...all) + pad0;
  const t0 = new Date(points[0].timestamp).getTime();
  const t1 = new Date(points[points.length - 1].timestamp).getTime();
  const w = 600,
    h = 150;
  const xOf = (t) => ((t - t0) / (t1 - t0 || 1)) * w;
  const yOf = (v) => h - ((v - minV) / (maxV - minV)) * h;
  const coords = points.map((m) => [xOf(new Date(m.timestamp).getTime()), yOf(m.value)]);
  const line = coords.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const pct = (v, total) => ((v / total) * 100).toFixed(2) + "%";

  const refLines = refs
    .map(
      (r) =>
        `<line x1="0" x2="${w}" y1="${yOf(r.value).toFixed(1)}" y2="${yOf(r.value).toFixed(1)}" class="water-ref water-ref-${r.key}" vector-effect="non-scaling-stroke"/>`,
    )
    .join("");
  const refLabels = refs
    .map((r) => `<span class="water-ref-label" style="top:${pct(yOf(r.value), h)}">${r.key} ${Math.round(r.value)}</span>`)
    .join("");
  const yLabels = [maxV, (maxV + minV) / 2, minV]
    .map((v) => `<span style="top:${pct(yOf(v), h)}">${Math.round(v)}</span>`)
    .join("");
  const xLabels = [];
  const day = new Date(t0);
  day.setHours(24, 0, 0, 0);
  for (; day.getTime() < t1; day.setDate(day.getDate() + 1)) {
    const label = day.toLocaleDateString("de-DE", { weekday: "short", day: "numeric" }).replace(".,", ",");
    xLabels.push(`<span style="left:${pct(xOf(day.getTime()), w)}">${label}</span>`);
  }

  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    `Wasserstand der letzten 7 Tage zwischen ${Math.round(Math.min(...points.map((m) => m.value)))} und ${Math.round(Math.max(...points.map((m) => m.value)))} cm`,
  );
  el.innerHTML = `
    <div class="wave-plot">
      <div class="wave-y">${yLabels}</div>
      <div class="wave-area">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style="stop-color:var(--teal);stop-opacity:0.35"/>
              <stop offset="100%" style="stop-color:var(--teal);stop-opacity:0"/>
            </linearGradient>
          </defs>
          <path d="${area}" fill="url(#waterFill)" stroke="none"/>
          ${refLines}
          <path d="${line}" fill="none" style="stroke:var(--teal)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        </svg>
        ${refLabels}
      </div>
      <div class="wave-x">${xLabels.join("")}</div>
    </div>`;
}

function selectWaterStation(id) {
  waterStationId = id;
  storageSet(WATER_STATION_KEY, id);
  renderBerlinStations();
  return loadWaterStation(id);
}

async function loadWaterData() {
  const results = await Promise.all([loadWaterStations(), loadWaterStation(waterStationId)]);
  return results.every(Boolean);
}

document.getElementById("waterSearchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("waterSearchInput");
  const q = input.value.trim().toLowerCase();
  if (!q) return;
  const match =
    waterStations.find((s) => pegelLabel(s).toLowerCase() === q) ||
    waterStations.find((s) => s.longname.toLowerCase().includes(q)) ||
    waterStations.find((s) => pegelLabel(s).toLowerCase().includes(q));
  if (!match) {
    showToast(waterStations.length ? "Kein Pegel mit diesem Namen gefunden" : "Pegelliste wird noch geladen …");
    return;
  }
  input.value = "";
  selectWaterStation(match.uuid);
});

loadWaterData();

// ---- Übersicht: frei zusammenstellbare Widgets ----
const OVERVIEW_STORAGE_KEY = "dashboard-overview-widgets";
const OVERVIEW_DEFAULT = ["weather-now", "weather-kpis", "forecast-bars", "rain-donut", "temp-wave"];
const OVERVIEW_MIN_COL = 260;
const OVERVIEW_MIN_COL_TIGHT = 160;
const OVERVIEW_MIN_ROW = 150;
const OVERVIEW_MIN_TILE = 110;
const OVERVIEW_MOBILE_ROW = 200;
const MOBILE_SCROLL_QUERY = window.matchMedia("(max-width: 760px)");
const BASE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";
const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

const svgIcon = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${paths}</svg>`;
const OVERVIEW_ICONS = {
  cloud: svgIcon('<path d="M7 15.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 17 15z"/>'),
  kpi: svgIcon('<rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6"/><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6"/><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6"/><rect x="13" y="13" width="7.5" height="7.5" rx="1.6"/>'),
  bars: svgIcon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  donut: svgIcon('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/>'),
  wave: svgIcon('<path d="M3 16c3-6 5-6 8-2s5 4 10-6"/>'),
  radar: svgIcon('<path d="M12 3v6M12 3a9 9 0 1 0 9 9M12 3a5 5 0 0 1 5 5"/>'),
  calendar: svgIcon('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/>'),
  notes: svgIcon('<path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M8 12h7M8 15.5h7"/>'),
  todo: svgIcon('<path d="M9 11l2 2 4-4"/><rect x="3.5" y="3.5" width="17" height="17" rx="4"/>'),
  clock: svgIcon('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  warning: svgIcon('<path d="M12 3.5L2.5 20h19L12 3.5z"/><path d="M12 10v4.5"/>'),
  phone: svgIcon('<path d="M6.5 3.5c1 2 1.5 3.5 1.5 4.5 0 1-2 1.5-2 2.5 0 2.5 4 6.5 6.5 6.5 1 0 1.5-2 2.5-2 1 0 2.5.5 4.5 1.5 0 2-1.5 4-3.5 4-6 0-13-7-13-13 0-2 2-4 4-4z"/>'),
  pin: svgIcon('<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  fire: svgIcon('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.6.3 1.6 1.1 2.8 2.2 3.4.2-2.9 1.4-5.6 3.7-7.6.3 2.7 1.3 4.6 2.6 6.4 1 1.4.9 2.9.9 5.4 0 3.6-2.6 6.2-6.5 6.2z"/>'),
  table: svgIcon('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'),
};

// "mirror" zeigt eine laufend aktualisierte Kopie eines Widgets von einer anderen Seite
const OVERVIEW_WIDGETS = {
  "weather-now": {
    group: "Wetter",
    title: "Aktuelles Wetter",
    desc: "Temperatur und Wetterlage am gewählten Ort",
    icon: OVERVIEW_ICONS.cloud,
    mirror: ["#weatherPlace", "#weatherIcon", "#weatherPanel .temp-row"],
  },
  "weather-kpis": {
    group: "Wetter",
    title: "Wetter-Kennzahlen",
    desc: "Temperatur, Wind, Luftfeuchte und Regen im Vergleich zu gestern",
    icon: OVERVIEW_ICONS.kpi,
    mirror: ["#weatherKpiRow"],
    wide: true,
  },
  "forecast-bars": {
    group: "Wetter",
    title: "Vorhersage · Höchsttemperatur",
    desc: "Höchstwerte der nächsten Tage als Balken",
    icon: OVERVIEW_ICONS.bars,
    mirror: ["#barChart"],
  },
  "rain-donut": {
    group: "Wetter",
    title: "Regenwahrscheinlichkeit",
    desc: "Regenchance für heute",
    icon: OVERVIEW_ICONS.donut,
    mirror: ["#donutChart", "#donutCaption"],
  },
  "temp-wave": {
    group: "Wetter",
    title: "Temperaturverlauf",
    desc: "Stündlicher Verlauf mit Achsen und „jetzt“-Markierung",
    icon: OVERVIEW_ICONS.wave,
    mirror: ["#waveDayLabel", "#waveChart"],
    wide: true,
  },
  radar: {
    group: "Wetter",
    title: "Regenradar",
    desc: "Kleine Karte mit dem letzten Radarbild",
    icon: OVERVIEW_ICONS.radar,
    mount: mountRadarWidget,
  },
  calendar: {
    group: "Kalender & Organisation",
    title: "Kalender",
    desc: "Monatsansicht mit Terminen zum Eintragen",
    icon: OVERVIEW_ICONS.calendar,
    mount: mountCalendarWidget,
    wide: true,
  },
  "calendar-today": {
    group: "Kalender & Organisation",
    title: "Termine heute",
    desc: "Heutige Einträge aus dem Kalender",
    icon: OVERVIEW_ICONS.calendar,
    mount: mountCalendarTodayWidget,
  },
  notes: {
    group: "Kalender & Organisation",
    title: "Notizen",
    desc: "Freier Notizzettel, speichert automatisch",
    icon: OVERVIEW_ICONS.notes,
    mount: mountNotesWidget,
  },
  todo: {
    group: "Kalender & Organisation",
    title: "Aufgaben",
    desc: "To-do-Liste zum Abhaken",
    icon: OVERVIEW_ICONS.todo,
    mount: mountTodoWidget,
  },
  countdown: {
    group: "Kalender & Organisation",
    title: "Countdown",
    desc: "Tage bis zu einem Termin deiner Wahl",
    icon: OVERVIEW_ICONS.calendar,
    mount: mountCountdownWidget,
  },
  clock: {
    group: "Kalender & Organisation",
    title: "Weltzeituhr",
    desc: "Uhrzeit in mehreren Städten",
    icon: OVERVIEW_ICONS.clock,
    mount: mountClockWidget,
  },
  warnings: {
    group: "Sicherheit",
    title: "Warnungen",
    desc: "Amtliche Warnungen (BBK/NINA), nach Ort filterbar",
    icon: OVERVIEW_ICONS.warning,
    mount: mountWarningsWidget,
  },
  checklist: {
    group: "Sicherheit",
    title: "Notfall-Checkliste",
    desc: "Vorrat & Ausrüstung zum Abhaken",
    icon: OVERVIEW_ICONS.todo,
    mount: mountChecklistWidget,
  },
  emergencynumbers: {
    group: "Sicherheit",
    title: "Notrufnummern",
    desc: "112, 110 und weitere wichtige Nummern",
    icon: OVERVIEW_ICONS.phone,
    mount: mountEmergencyNumbersWidget,
  },
  meeting: {
    group: "Sicherheit",
    title: "Familien-Treffpunkt",
    desc: "Vereinbarter Treffpunkt für den Notfall",
    icon: OVERVIEW_ICONS.pin,
    mount: mountMeetingWidget,
  },
  "fire-kpis": {
    group: "Feuerwehr",
    title: "Feuerwehr-Kennzahlen",
    desc: "Brandeinsätze Berlin, 7 Tage im Vergleich zur Vorwoche",
    icon: OVERVIEW_ICONS.fire,
    mirror: ["#fireStats"],
    wide: true,
  },
  "fire-chart": {
    group: "Feuerwehr",
    title: "Brandeinsätze pro Tag",
    desc: "Balkendiagramm der letzten 7 Tage",
    icon: OVERVIEW_ICONS.bars,
    mirror: ["#fireChartSub", "#fireBarChart"],
  },
  "fire-share": {
    group: "Feuerwehr",
    title: "Anteil Brandeinsätze",
    desc: "Anteil an allen Einsätzen der Woche",
    icon: OVERVIEW_ICONS.donut,
    mirror: ["#fireDonut", "#fireDonutCaption"],
  },
  "fire-table": {
    group: "Feuerwehr",
    title: "Feuerwehr-Tagesübersicht",
    desc: "Tabelle mit Bränden, Hilfeleistungen und Eintreffzeit",
    icon: OVERVIEW_ICONS.table,
    mirror: ["#fireTablePanel .fire-table-wrap"],
    wide: true,
  },
  "water-kpis": {
    group: "Wasserpegel",
    title: "Pegel-Kennzahlen",
    desc: "Aktueller Wasserstand, Einordnung und 7-Tage-Spanne",
    icon: OVERVIEW_ICONS.wave,
    mirror: ["#waterStats"],
    wide: true,
  },
  "water-chart": {
    group: "Wasserpegel",
    title: "Pegelverlauf",
    desc: "Wasserstand der letzten 7 Tage mit Mittelwerten",
    icon: OVERVIEW_ICONS.wave,
    mirror: ["#waterChartSub", "#waterChart"],
  },
};

// IDs werden umbenannt, damit sie eindeutig bleiben und SVG-Verläufe nicht auf die versteckte Vorlage zeigen
function cloneForMirror(src, suffix) {
  const clone = src.cloneNode(true);
  clone.querySelectorAll(".panel-toggle, .layout-handle, .layout-resize, .fire-export").forEach((el) => el.remove());
  [clone, ...clone.querySelectorAll("*")].forEach((el) => {
    el.classList.remove("collapsed", "layout-group", "layout-dragging", "layout-resizing");
    el.removeAttribute("data-layout-id");
    el.removeAttribute("data-layout-item");
    el.removeAttribute("data-layout-grow");
    el.style.removeProperty("--layout-grow");
    if (el.id) el.id += "--" + suffix;
    ["fill", "stroke", "clip-path", "mask"].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && value.includes("url(#"))
        el.setAttribute(attr, value.replace(/url\(#([^)]+)\)/g, `url(#$1--${suffix})`));
    });
  });
  clone.hidden = false;
  return clone;
}

// Aus einer Kennzahlen-Reihe herausgezogene Karten gehören für die Spiegelung weiter zur Reihe
function mirrorMembers(src) {
  if (!src.classList.contains("stat-row") || !src._defaultOrder) return null;
  return [...layoutItems(src, true), ...src._defaultOrder.filter((el) => el.parentElement !== src)];
}

function mountMirrorWidget(body, selectors, suffix) {
  const sources = selectors.map((s) => document.querySelector(s)).filter(Boolean);
  let queued = false;
  const update = () => {
    queued = false;
    body.replaceChildren(
      ...sources.map((src) => {
        const members = mirrorMembers(src);
        const clone = cloneForMirror(src, suffix);
        if (members) clone.replaceChildren(...members.map((el) => cloneForMirror(el, suffix)));
        return clone;
      }),
    );
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  });
  const watched = sources.flatMap((src) => [src, ...(mirrorMembers(src) ? src._defaultOrder : [])]);
  watched.forEach((el) =>
    observer.observe(el, { childList: true, subtree: true, characterData: true, attributes: true }),
  );
  update();
  return () => observer.disconnect();
}

function mountRadarWidget(body) {
  renderInto(body, '<div class="ov-map"></div><div class="warn-note ov-map-note">Radar wird geladen …</div>');
  const mapEl = body.querySelector(".ov-map");
  const note = body.querySelector(".ov-map-note");
  if (!LEAFLET_AVAILABLE) {
    mapEl.remove();
    note.textContent = "Karte nicht verfügbar – die Kartenbibliothek Leaflet konnte nicht geladen werden.";
    return () => {};
  }
  const miniMap = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView(
    [currentWeatherCoords.lat, currentWeatherCoords.lon],
    7,
  );
  L.tileLayer(BASE_TILE_URL, { maxZoom: 16 }).addTo(miniMap);
  let layer = null;
  async function load() {
    try {
      const data = await fetchData("https://api.rainviewer.com/public/weather-maps.json", { source: "RainViewer" });
      const past = data.radar?.past || [];
      if (!past.length || !data.host?.startsWith("https://")) throw dataError("RainViewer", "keine Radarframes");
      const frame = past[past.length - 1];
      if (layer) miniMap.removeLayer(layer);
      layer = L.tileLayer(`${data.host}${frame.path}/512/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.78,
        maxNativeZoom: 7,
        maxZoom: 16,
      }).addTo(miniMap);
      note.textContent = `Radar ${formatFrameTime(frame.time)} Uhr · © RainViewer · Karte © Esri`;
    } catch (err) {
      reportError("Radar-Widget", err);
      const stale = layer ? " Angezeigt wird der letzte Stand." : "";
      renderRetry(note, `Radar nicht verfügbar – ${describeError(err)}.${stale}`, load);
    }
  }
  const resizeObserver = new ResizeObserver(() => miniMap.invalidateSize());
  resizeObserver.observe(mapEl);
  load();
  document.addEventListener("dashboard-refresh", load);
  return () => {
    resizeObserver.disconnect();
    document.removeEventListener("dashboard-refresh", load);
    miniMap.remove();
  };
}

function mountCalendarTodayWidget(body) {
  const render = () => {
    const now = new Date();
    const events = [...(calEvents[dateKey(now)] || [])].sort(
      (a, b) => (a.allDay ? 0 : 1) - (b.allDay ? 0 : 1) || (a.time || "").localeCompare(b.time || ""),
    );
    renderInto(
      body,
      `<div class="ov-date">${now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</div>
      <div class="ov-events"></div>`,
    );
    const list = body.querySelector(".ov-events");
    if (!events.length) {
      list.innerHTML = '<div class="todo-empty">Heute keine Termine — im Kalender-Widget eintragen.</div>';
      return;
    }
    events.forEach((ev) => {
      const row = document.createElement("div");
      row.className = "ov-event";
      row.innerHTML = '<span class="ov-event-time"></span><span class="ov-event-text"></span>';
      row.querySelector(".ov-event-time").textContent = ev.allDay ? "ganztags" : `${ev.time} Uhr`;
      row.querySelector(".ov-event-text").textContent = ev.text;
      list.appendChild(row);
    });
  };
  render();
  const dayTimer = setInterval(render, 15 * 60 * 1000);
  document.addEventListener("calendar-change", render);
  return () => {
    clearInterval(dayTimer);
    document.removeEventListener("calendar-change", render);
  };
}

function mountMeetingWidget(body) {
  renderInto(
    body,
    `<div class="panel-sub">Falls Netz oder Strom ausfallen</div>
    <input type="text" class="meeting-input" placeholder="z. B. bei Oma, Nachbarschaftstreff …" autocomplete="off" aria-label="Familien-Treffpunkt">
    <div class="notes-saved">&nbsp;</div>`,
  );
  return bindMeetingPointInput(body.querySelector(".meeting-input"), body.querySelector(".notes-saved"));
}

// Jede Seite hat ein eigenes Widget-Raster; die Übersicht ist eines davon
const PAGE_WIDGETS_STORAGE_PREFIX = "dashboard-page-widgets-";
const widgetBoards = new Map();

function loadBoardTypes(board, defaults) {
  try {
    const raw = localStorage.getItem(board.storageKey);
    if (raw) return JSON.parse(raw).filter((type) => OVERVIEW_WIDGETS[type]);
  } catch (err) {}
  return [...defaults];
}

function saveBoardTypes(board) {
  storageSet(board.storageKey, JSON.stringify(board.types));
}

function createWidgetBoard(page, grid, { prefix, storageKey, defaults = [], emptyEl = null }) {
  const board = { page, grid, prefix, storageKey, emptyEl, cleanups: new Map() };
  board.types = loadBoardTypes(board, defaults);
  widgetBoards.set(page.id, board);
  return board;
}

// Ein Spiegel-Widget der eigenen Seite würde nur doppelt anzeigen, was dort schon steht
function boardOffersWidget(board, def) {
  return !def.mirror || !def.mirror.some((sel) => board.page.contains(document.querySelector(sel)));
}

function mountBoardWidget(board, type) {
  const def = OVERVIEW_WIDGETS[type];
  const panel = document.createElement("section");
  panel.className = "panel ov-widget" + (def.wide ? " ov-wide" : "");
  panel.id = `${board.prefix}-${type}`;
  panel.setAttribute("aria-label", def.title);
  panel.innerHTML = `
    <div class="panel-title">${def.title}</div>
    <button type="button" class="ov-remove" aria-label="${def.title} entfernen" title="Entfernen">×</button>
    <div class="ov-body ov-body-${type}"></div>`;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "panel-toggle auto-toggle";
  toggle.setAttribute("aria-label", `${def.title} ein-/ausklappen`);
  toggle.innerHTML = CHEVRON_SVG;
  panel.appendChild(toggle);
  setupToggle(panel, toggle);
  panel.querySelector(".ov-remove").addEventListener("click", () => removeBoardWidget(board, type));
  const size = loadLayoutSizes()[panel.id];
  if (size?.frac) panel.dataset.colFrac = String(size.frac);
  if (size?.weight) panel.dataset.rowWeight = String(size.weight);
  board.grid.appendChild(panel);

  const body = panel.querySelector(".ov-body");
  let cleanup = null;
  try {
    cleanup = def.mirror ? mountMirrorWidget(body, def.mirror, board.prefix) : def.mount(body);
  } catch (err) {
    console.error(`[Dashboard] Widget "${type}" konnte nicht gestartet werden:`, err);
    renderRetry(body, "Dieses Widget konnte nicht geladen werden. Widget entfernen und neu hinzufügen oder Seite neu laden.", null, "chart-empty");
  }
  board.cleanups.set(type, typeof cleanup === "function" ? cleanup : null);
}

function addBoardWidget(board, type) {
  if (!OVERVIEW_WIDGETS[type] || board.types.includes(type)) return;
  board.types.push(type);
  saveBoardTypes(board);
  mountBoardWidget(board, type);
  afterBoardChange(board);
  saveLayoutOrder(board.grid);
}

function removeBoardWidget(board, type) {
  board.types = board.types.filter((t) => t !== type);
  saveBoardTypes(board);
  const cleanup = board.cleanups.get(type);
  if (cleanup) cleanup();
  board.cleanups.delete(type);
  document.getElementById(`${board.prefix}-${type}`)?.remove();
  storeCollapsed(`${board.prefix}-${type}`, false);
  saveLayoutSize(`${board.prefix}-${type}`, null);
  saveWidgetPlace(`${board.prefix}-${type}`, null);
  afterBoardChange(board);
  saveLayoutOrder(board.grid);
}

function afterBoardChange(board) {
  board.grid.hidden = !board.grid.querySelector(":scope > .ov-widget");
  if (board.emptyEl) board.emptyEl.hidden = board.types.length > 0;
  refreshLayoutHandles();
  fitWidgetGrid(board.grid);
  if (pickerOverlay.classList.contains("show") && pickerBoard === board) renderWidgetPicker();
}

// Zeilen, in denen alles eingeklappt ist, bekommen nur ihre Titelhöhe; alle anderen teilen sich den Rest
function fitWidgetGrid(grid) {
  if (!grid.offsetParent) return;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const width = grid.clientWidth;
  const height = grid.clientHeight;
  const items = layoutItems(grid);

  // Mobil scrollt die Seite: feste Kachelhöhe, breite Widgets über die ganze Breite
  if (MOBILE_SCROLL_QUERY.matches) {
    const mobileCols = width >= 2 * OVERVIEW_MIN_COL_TIGHT + gap ? 2 : 1;
    const mobileRows = packOverviewRows(items, mobileCols, 2);
    grid._layoutRows = mobileRows;
    grid.classList.remove("ov-overfull");
    grid.style.gridTemplateColumns = `repeat(${mobileCols}, minmax(0, 1fr))`;
    mobileRows.forEach((row) => row.forEach(({ el, span }) => (el.style.gridColumn = span > 1 ? `span ${span}` : "")));
    grid.style.gridTemplateRows = mobileRows
      .map((row) => (isOpenRow(row) ? `${OVERVIEW_MOBILE_ROW}px` : "auto"))
      .join(" ");
    return;
  }

  const rowHeight = (c) => {
    const rowCount = packOverviewRows(items, c).length;
    return (height - gap * (rowCount - 1)) / rowCount;
  };
  // Bei wenig Höhe lieber schmalere Kacheln nebeneinander als zu flache untereinander
  let cols = Math.max(1, Math.floor((width + gap) / (OVERVIEW_MIN_COL + gap)));
  while (
    cols < items.length &&
    rowHeight(cols) < OVERVIEW_MIN_ROW &&
    (width - gap * cols) / (cols + 1) >= OVERVIEW_MIN_COL_TIGHT
  ) {
    cols++;
  }
  const rows = packOverviewRows(items, cols);
  grid._layoutRows = rows;
  // Nur wenn so viele Widgets gewählt sind, dass nicht einmal die Titel passen, darf das Raster scrollen
  const overfull = items.length > 0 && rowHeight(cols) < OVERVIEW_MIN_TILE;
  grid.classList.toggle("ov-overfull", overfull);
  const minRow = overfull ? OVERVIEW_MIN_TILE : 0;
  grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  rows.forEach((row) => row.forEach(({ el, span }) => (el.style.gridColumn = span > 1 ? `span ${span}` : "")));
  // fr-Werte mit Summe unter 1 füllen die Höhe nicht, daher nur das Verhältnis der Reihen übernehmen
  const openWeight = rows.filter(isOpenRow).reduce((sum, row) => sum + rowWeight(row), 0);
  const scale = openWeight > 0 && openWeight < 1 ? 1 / openWeight : 1;
  grid.style.gridTemplateRows = rows
    .map((row) => (isOpenRow(row) ? `minmax(${minRow}px, ${+(rowWeight(row) * scale).toFixed(3)}fr)` : "auto"))
    .join(" ");
}
function isOpenRow(row) {
  return row.some(({ el }) => !el.classList.contains("collapsed"));
}
// Eine Reihe ist so hoch wie ihr höchstes offenes Widget
function rowWeight(row) {
  return Math.max(
    1e-3,
    ...row.filter(({ el }) => !el.classList.contains("collapsed")).map(({ el }) => Number(el.dataset.rowWeight) || 1),
  );
}
function fitAllWidgetGrids() {
  widgetBoards.forEach((board) => fitWidgetGrid(board.grid));
}

// Verteilt die Kacheln zeilenweise; die freien Spalten einer Zeile gehen reihum an die Kacheln,
// deren Breite nicht von Hand festgelegt wurde
function packOverviewRows(items, cols, minColsForWide = 3) {
  const rows = [];
  let row = [];
  let used = 0;
  const closeRow = () => {
    if (!row.length) return;
    const flexible = row.filter((cell) => !cell.fixed).reverse();
    for (let free = cols - used, i = 0; free > 0 && flexible.length; free--, i++) {
      flexible[i % flexible.length].span++;
    }
    rows.push(row);
    row = [];
    used = 0;
  };
  items.forEach((el) => {
    const frac = Number(el.dataset.colFrac) || 0;
    const custom = frac ? Math.max(1, Math.round(frac * cols)) : 0;
    const span = Math.min(cols, custom || (el.classList.contains("ov-wide") && cols >= minColsForWide ? 2 : 1));
    if (used + span > cols) closeRow();
    row.push({ el, span, fixed: custom > 0 });
    used += span;
  });
  closeRow();
  return rows;
}

// ---- Widget-Auswahl: fügt hinzu oder entfernt wieder ----
const pickerOverlay = document.getElementById("widgetPickerOverlay");
const pickerBody = document.getElementById("widgetPickerBody");
let pickerBoard = null;

function renderWidgetPicker() {
  const offered = Object.entries(OVERVIEW_WIDGETS).filter(([, d]) => boardOffersWidget(pickerBoard, d));
  const groups = [...new Set(offered.map(([, d]) => d.group))];
  pickerBody.innerHTML = groups
    .map(
      (group) => `<div class="widget-picker-group">
      <div class="widget-picker-group-title">${group}</div>
      <div class="widget-picker-grid">
        ${offered
          .filter(([, d]) => d.group === group)
          .map(([type, d]) => {
            const added = pickerBoard.types.includes(type);
            return `<button type="button" class="widget-option${added ? " added" : ""}" data-widget="${type}" aria-pressed="${added}">
              <span class="widget-option-icon">${d.icon}</span>
              <span class="widget-option-text">
                <span class="widget-option-title">${d.title}</span>
                <span class="widget-option-desc">${d.desc}</span>
              </span>
              <span class="widget-option-state" aria-hidden="true">${added ? "✓" : "+"}</span>
            </button>`;
          })
          .join("")}
      </div>
    </div>`,
    )
    .join("");
}
function openWidgetPicker(board) {
  pickerBoard = board;
  renderWidgetPicker();
  pickerOverlay.classList.add("show");
  pickerBody.querySelector(".widget-option")?.focus();
}
function closeWidgetPicker() {
  pickerOverlay.classList.remove("show");
}
pickerBody.addEventListener("click", (e) => {
  const option = e.target.closest(".widget-option");
  if (!option) return;
  const type = option.dataset.widget;
  if (pickerBoard.types.includes(type)) removeBoardWidget(pickerBoard, type);
  else addBoardWidget(pickerBoard, type);
  pickerBody.querySelector(`[data-widget="${type}"]`)?.focus();
});
document.getElementById("widgetPickerClose").addEventListener("click", closeWidgetPicker);
pickerOverlay.addEventListener("click", (e) => {
  if (e.target === pickerOverlay) closeWidgetPicker();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pickerOverlay.classList.contains("show")) closeWidgetPicker();
});

const overviewBoard = createWidgetBoard(document.getElementById("overviewPage"), document.getElementById("overviewGrid"), {
  prefix: "ov",
  storageKey: OVERVIEW_STORAGE_KEY,
  defaults: OVERVIEW_DEFAULT,
  emptyEl: document.getElementById("overviewEmpty"),
});
// Widget der früheren Widget-Seite übernehmen
try {
  const legacy = localStorage.getItem("dashboard-widget-slot");
  if (legacy && OVERVIEW_WIDGETS[legacy] && !overviewBoard.types.includes(legacy)) overviewBoard.types.push(legacy);
  localStorage.removeItem("dashboard-widget-slot");
} catch (err) {}
overviewBoard.emptyEl.addEventListener("click", () => openWidgetPicker(overviewBoard));

document.querySelectorAll(".page").forEach((page) => {
  const grid = page === overviewBoard.page ? overviewBoard.grid : document.getElementById(page.id + "Widgets");
  if (!grid) return;
  const board =
    widgetBoards.get(page.id) ||
    createWidgetBoard(page, grid, { prefix: page.id, storageKey: PAGE_WIDGETS_STORAGE_PREFIX + page.id });
  page.querySelector('[data-widget-action="add"]')?.addEventListener("click", () => openWidgetPicker(board));
});

// Frei platzierte Widgets zurück in ihre Zeile oder Spalte setzen
function placeRoamingWidgets(board) {
  const places = loadWidgetPlaces();
  const sizes = loadLayoutSizes();
  const touched = new Set();
  layoutItems(board.grid, true).forEach((panel) => {
    const container = roamContainers(board.page, panel).find(
      (c) => c !== board.grid && layoutContainerKey(c) === places[panel.id],
    );
    if (!container) return;
    container.appendChild(panel);
    if (sizes[panel.id]?.grow > 0) applyFlexGrow(panel, sizes[panel.id].grow);
    touched.add(container);
  });
  touched.forEach(applySavedLayoutOrder);
}

widgetBoards.forEach((board) => {
  saveBoardTypes(board);
  board.types.forEach((type) => mountBoardWidget(board, type));
  applySavedLayoutOrder(board.grid);
  if (board !== overviewBoard) placeRoamingWidgets(board);
  board.grid.hidden = !board.grid.querySelector(":scope > .ov-widget");
  if (board.emptyEl) board.emptyEl.hidden = board.types.length > 0;
  new ResizeObserver(() => fitWidgetGrid(board.grid)).observe(board.grid);
});
updateEmptyGroups();
refreshLayoutHandles();
fitAllWidgetGrids();
document.addEventListener("widget-collapse", () => {
  fitAllWidgetGrids();
  updateResizeHandles();
});
window.addEventListener("resize", fitAllWidgetGrids);
MOBILE_SCROLL_QUERY.addEventListener("change", updateResizeHandles);

// ---- Seite auf Standard-Layout zurücksetzen (mit Rückfrage) ----
function resetPageLayout(page) {
  const board = widgetBoards.get(page.id);
  if (board) [...board.types].forEach((type) => removeBoardWidget(board, type));
  resetLayoutOrderAndSizes(page);
  updateEmptyGroups();
  refreshLayoutHandles();
  fitAllWidgetGrids();
  document.dispatchEvent(new Event("widget-collapse"));
  window.dispatchEvent(new Event("resize"));
}

const resetOverlay = document.getElementById("resetConfirmOverlay");
let resetTargetPage = null;
let resetReturnFocus = null;

function openResetConfirm(page, trigger) {
  resetTargetPage = page;
  resetReturnFocus = trigger;
  const title = page.querySelector(".overview-title")?.textContent.trim() || "diese Seite";
  document.getElementById("resetConfirmText").textContent =
    page === overviewBoard.page
      ? `Soll „${title}“ wirklich zurückgesetzt werden? Dabei werden alle Widgets entfernt.`
      : `Soll das Layout der Seite „${title}“ wirklich auf den Standard zurückgesetzt werden? ` +
        "Reihenfolge, Größen und eingeklappte Widgets werden zurückgesetzt, hinzugefügte Widgets entfernt.";
  resetOverlay.classList.add("show");
  document.getElementById("resetConfirmCancel").focus();
}
function closeResetConfirm() {
  resetOverlay.classList.remove("show");
  resetTargetPage = null;
  resetReturnFocus?.focus();
}

document.querySelectorAll('[data-widget-action="reset"]').forEach((btn) =>
  btn.addEventListener("click", () => openResetConfirm(btn.closest(".page"), btn)),
);
document.getElementById("resetConfirmOk").addEventListener("click", () => {
  const page = resetTargetPage;
  closeResetConfirm();
  if (!page) return;
  resetPageLayout(page);
  showToast(page === overviewBoard.page ? "Übersicht zurückgesetzt – alle Widgets entfernt" : "Layout auf Standard zurückgesetzt");
});
document.getElementById("resetConfirmCancel").addEventListener("click", closeResetConfirm);
document.getElementById("resetConfirmClose").addEventListener("click", closeResetConfirm);
resetOverlay.addEventListener("click", (e) => {
  if (e.target === resetOverlay) closeResetConfirm();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && resetOverlay.classList.contains("show")) closeResetConfirm();
});
