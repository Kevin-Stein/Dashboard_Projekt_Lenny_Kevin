// ---- Sprache (js/i18n.js, Texte in js/lang/) ----
I18N.apply();
I18N.mountSwitcher(document.getElementById("langSelect"));
const LOCALE = I18N.locale();

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
  if (!(err instanceof FetchError)) return t("err.unexpected");
  if (err.kind === "offline") return t("err.offline");
  if (err.kind === "timeout") return t("err.timeout");
  if (err.kind === "network") return t("err.network");
  if (err.kind === "data") return t("err.data");
  if (err.status === 429) return t("err.rateLimit");
  if (err.status === 401 || err.status === 403) return t("err.forbidden");
  if (err.status === 404) return t("err.notFound");
  if (err.status >= 500) return t("err.server");
  return t("err.http", { status: err.status });
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
    btn.textContent = t("common.retry");
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
      showToast(t("storage.failed"), "error");
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
    showToast(t("err.unexpectedToast"), "error");
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
    now.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
    " · " +
    t("time.clock", { time: now.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" }) });
}
updateClock();
setInterval(updateClock, 30000);

// ---- Dynamische Navigation basierend auf vorhandenen Widgets ----
const NAV_CATEGORIES = {
  overview: {
    id: "overview",
    label: t("nav.overview"),
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5.5 10v9.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10" />
    </svg><span>${t("nav.overview")}</span>`,
    target: "overviewPage",
  },
  weather: {
    id: "weather",
    label: t("nav.weather"),
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M7 15.5a3.8 3.8 0 0 1 .3-7.6 5.4 5.4 0 0 1 10.4-1.7A4.3 4.3 0 0 1 17 15z" />
    </svg><span>${t("nav.weather")}</span>`,
    target: "weatherPage",
  },
  water: {
    id: "water",
    label: t("nav.water"),
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
      <path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 15c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
    </svg><span>${t("nav.water")}</span>`,
    target: "waterPage",
  },
  fire: {
    id: "fire",
    label: t("nav.fire"),
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.6.3 1.6 1.1 2.8 2.2 3.4.2-2.9 1.4-5.6 3.7-7.6.3 2.7 1.3 4.6 2.6 6.4 1 1.4.9 2.9.9 5.4 0 3.6-2.6 6.2-6.5 6.2z" />
    </svg><span>${t("nav.fire")}</span>`,
    target: "firePage",
  },
  disaster: {
    id: "disaster",
    label: t("nav.disaster"),
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M12 3.5l7.5 3v5.2c0 4.6-3.1 8.2-7.5 9.8-4.4-1.6-7.5-5.2-7.5-9.8V6.5l7.5-3z" />
      <path d="M12 8v5" /><circle cx="12" cy="15.8" r="0.6" fill="currentColor" stroke="none" />
    </svg><span>${t("nav.disaster")}</span>`,
    target: "disasterPage",
  },
};

function showDashboardPage(pageId, activeBtn) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");
  if (target && target.querySelector("#map")) {
    setTimeout(() => map.invalidateSize(), 50);
  }
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  if (activeBtn) activeBtn.classList.add("active");
  document.dispatchEvent(new Event("dashboard-page-change"));
  placeWarnBanner();
  updateResizeHandles();
  requestAnimationFrame(() => fitAllWidgetGrids());
}

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
      showDashboardPage(category.target, btn);
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
    if (el.classList.contains("boredom-game") || el.classList.contains("boredom-pick")) return;
    if (el.querySelector(".panel-toggle")) return;
    const title = el.querySelector(".panel-title, .stat-label");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "panel-toggle auto-toggle";
    btn.setAttribute("aria-label", t("widget.toggleAria", { title: title ? title.textContent.trim() : "Widget" }));
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
  menuToggleBtn.setAttribute("aria-label", t(open ? "menu.close" : "menu.open"));
}
menuToggleBtn.addEventListener("click", () => {
  setMenuOpen(!sidebarEl.classList.contains("menu-open"));
});
// Nav-Buttons werden dynamisch neu erzeugt, daher per Delegation
document.getElementById("sidebarNav").addEventListener("click", (e) => {
  if (e.target.closest(".nav-item")) setMenuOpen(false);
});

document.getElementById("boredomLink").addEventListener("click", () => {
  setMenuOpen(false);
  showDashboardPage("boredomPage", document.getElementById("boredomLink"));
});

const boredomPicker = document.getElementById("boredomPicker");
const boredomBack = document.getElementById("boredomBack");
const JOTFORM_TICTACTOE_SRC =
  "https://www.jotform.com/website-widgets/embed/01a1079cec1870008d80ca784681b127ad71";

function loadTictactoeWidget() {
  if (document.getElementById("boredomTictactoeScript")) return;
  const script = document.createElement("script");
  script.id = "boredomTictactoeScript";
  script.src = JOTFORM_TICTACTOE_SRC;
  script.defer = true;
  document.body.appendChild(script);
}

function showBoredomGame(id) {
  const open = Boolean(id);
  boredomPicker.hidden = open;
  boredomBack.hidden = !open;
  document.querySelectorAll("#boredomPage .boredom-game").forEach((el) => {
    el.hidden = el.id !== id;
  });
  if (id === "boredomTictactoe") loadTictactoeWidget();
}

boredomPicker.addEventListener("click", (e) => {
  const pick = e.target.closest("[data-game]");
  if (pick) showBoredomGame(pick.dataset.game);
});
boredomBack.addEventListener("click", () => showBoredomGame(null));

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

const changelogOverlay = document.getElementById("changelogOverlay");
const changelogBody = document.getElementById("changelogBody");
const changelogTitle = document.getElementById("changelogTitle");
const versionLink = document.getElementById("versionLink");
const versionNumberEl = document.getElementById("versionNumber");
const CHANGELOG_SECTIONS = ["added", "changed", "removed", "fixed"];
if (versionNumberEl && window.DASHBOARD_CHANGELOG?.version) {
  versionNumberEl.textContent = window.DASHBOARD_CHANGELOG.version;
}

function changelogCopy() {
  const data = window.DASHBOARD_CHANGELOG || { version: "2.0.0", de: {} };
  return data[I18N.lang()] || data.de || {};
}

function renderChangelog() {
  const data = window.DASHBOARD_CHANGELOG || { version: "2.0.0", date: "2026-10-04" };
  const copy = changelogCopy();
  changelogTitle.textContent = t("changelog.title", { version: data.version });
  changelogBody.replaceChildren();

  const meta = document.createElement("div");
  meta.className = "changelog-release-meta";
  const ver = document.createElement("div");
  ver.className = "changelog-version";
  ver.textContent = data.version;
  const dateEl = document.createElement("div");
  dateEl.className = "changelog-date";
  dateEl.textContent = data.date
    ? new Date(`${data.date}T12:00:00`).toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" })
    : "";
  meta.append(ver, dateEl);
  changelogBody.append(meta);

  CHANGELOG_SECTIONS.forEach((section) => {
    const items = copy[section];
    if (!items || !items.length) return;
    const title = document.createElement("div");
    title.className = "changelog-section-title";
    title.textContent = t(`changelog.${section}`);
    const list = document.createElement("ul");
    list.className = "changelog-list";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    changelogBody.append(title, list);
  });
}

function openChangelog() {
  setMenuOpen(false);
  renderChangelog();
  changelogOverlay.classList.add("show");
  versionLink.setAttribute("aria-expanded", "true");
  document.getElementById("changelogClose").focus();
}

function closeChangelog() {
  changelogOverlay.classList.remove("show");
  versionLink.setAttribute("aria-expanded", "false");
}

versionLink.addEventListener("click", openChangelog);
document.getElementById("changelogClose").addEventListener("click", closeChangelog);
changelogOverlay.addEventListener("click", (e) => {
  if (e.target === changelogOverlay) closeChangelog();
});
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key !== "Escape" || !changelogOverlay.classList.contains("show")) return;
    e.stopImmediatePropagation();
    closeChangelog();
  },
  true,
);

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
themeToggleBtn.innerHTML = `${sunIconSvg}${moonIconSvg}<span class="theme-switch-thumb" aria-hidden="true"></span>`;
function updateThemeIcon() {
  const eff = effectiveTheme();
  themeToggleBtn.classList.toggle("is-dark", eff === "dark");
  themeToggleBtn.setAttribute("aria-pressed", String(eff === "dark"));
  themeToggleBtn.title = t(eff === "dark" ? "theme.toLight" : "theme.toDark");
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
  lastUpdatedEl.textContent = t("refresh.lastUpdated", { time: now.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" }) });
}

const refreshBtn = document.getElementById("refreshBtn");
const refreshIcon = document.getElementById("refreshIcon");
const refreshBtnFace = document.getElementById("refreshBtnFace");
const refreshDone = document.getElementById("refreshDone");
const REFRESH_LOADING_MS = 200;
const REFRESH_DONE_MS = 300;

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setTilesRefreshing(on) {
  document.querySelectorAll(".panel").forEach((el) => {
    el.classList.toggle("is-refreshing", Boolean(on && el.closest(".page.active")));
  });
}

function setRefreshUi(mode) {
  refreshBtn.classList.toggle("is-loading", mode === "loading");
  refreshBtn.classList.toggle("is-done", mode === "done");
  if (refreshBtnFace) refreshBtnFace.hidden = mode === "done";
  if (refreshDone) refreshDone.hidden = mode !== "done";
  refreshBtn.disabled = mode !== "idle";
  refreshBtn.setAttribute("aria-busy", String(mode !== "idle"));
  if (mode === "loading") {
    refreshBtn.setAttribute("aria-label", t("refresh.aria"));
    refreshIcon.classList.add("spinning");
    setTilesRefreshing(true);
  } else {
    refreshIcon.classList.remove("spinning");
    setTilesRefreshing(false);
    refreshBtn.setAttribute("aria-label", mode === "done" ? t("refresh.done") : t("refresh.aria"));
  }
}

async function playManualRefreshUi() {
  setRefreshUi("loading");
  await waitMs(REFRESH_LOADING_MS);
  setRefreshUi("done");
  await waitMs(REFRESH_DONE_MS);
}

const refreshErrorsEl = document.getElementById("refreshErrors");
let refreshInFlight = null;
let refreshUiInFlight = null;

// Jede Quelle liefert true/false; eine fehlerhafte Quelle hält die anderen nicht auf
async function runRefreshFetch(manual) {
  const sources = [
    [t("source.weather"), () => loadWeatherForPlace(currentWeatherCoords.lat, currentWeatherCoords.lon, currentWeatherCoords.label)],
    [t("source.radar"), () => loadRadar()],
    [t("source.warnings"), () => loadDisasterWarnings(document.getElementById("disasterWarnSearchInput")?.value || "")],
    [t("source.fire"), () => loadFireData()],
    [t("source.water"), () => loadWaterData()],
  ];
  const results = await Promise.allSettled(sources.map(([, load]) => load()));
  const failed = sources
    .filter((_, i) => results[i].status === "rejected" || results[i].value === false)
    .map(([name]) => name);
  results.forEach((r, i) => r.status === "rejected" && reportError(sources[i][0], r.reason));
  document.dispatchEvent(new Event("dashboard-refresh"));

  refreshErrorsEl.hidden = !failed.length;
  refreshErrorsEl.textContent = failed.length ? t("refresh.failedList", { list: failed.join(", ") }) : "";
  if (failed.length && manual) {
    const hint = navigator.onLine === false ? t("err.offline") : t("refresh.staleHint");
    showToast(t("refresh.failedToast", { list: failed.join(", "), hint }), "error");
  }
}

function refreshDashboardData({ manual = false } = {}) {
  if (manual && !refreshUiInFlight) {
    refreshUiInFlight = playManualRefreshUi().finally(() => {
      setRefreshUi("idle");
      refreshUiInFlight = null;
    });
  }
  if (!refreshInFlight) {
    if (!manual && !refreshUiInFlight) {
      refreshBtn.disabled = true;
      refreshIcon.classList.add("spinning");
    }
    refreshInFlight = runRefreshFetch(manual).finally(() => {
      refreshInFlight = null;
      refreshIcon.classList.remove("spinning");
      if (!refreshUiInFlight) {
        refreshBtn.disabled = false;
        setRefreshUi("idle");
      }
    });
  }
  return Promise.all([refreshInFlight, refreshUiInFlight].filter(Boolean));
}

refreshBtn.addEventListener("click", () => {
  refreshDashboardData({ manual: true });
});

window.addEventListener("offline", () => {
  showToast(t("net.offline"), "error");
});
window.addEventListener("online", () => {
  showToast(t("net.online"));
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
  autoRefreshLabel.textContent = t(autoRefreshEnabled ? "autoRefresh.on" : "autoRefresh.off");
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
      <input type="text" id="todoAddInput" placeholder="${t("todo.placeholder")}" autocomplete="off">
      <button type="submit" aria-label="${t("todo.add")}">+</button>
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
      list.innerHTML = `<div class="todo-empty">${t("todo.empty")}</div>`;
      return;
    }
    todos.forEach((todo, i) => {
      const row = document.createElement("div");
      row.className = "todo-item" + (todo.done ? " done" : "");
      row.innerHTML = `<input type="checkbox" ${todo.done ? "checked" : ""}><span></span><button type="button" aria-label="${t("common.delete")}">×</button>`;
      row.querySelector("span").textContent = todo.text;
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
    <textarea class="notes-area" id="notesArea" placeholder="${t("notes.placeholder")}"></textarea>
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
        saved.textContent = t("storage.notSaved");
        return;
      }
      saved.textContent = t("storage.saved");
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
    { city: t("clock.tokyo"), tz: "Asia/Tokyo" },
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
      const timeStr = now.toLocaleTimeString(LOCALE, { timeZone: tz, hour: "2-digit", minute: "2-digit" });
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
        diffMin === 0 ? t("clock.local") : diffH > 0 ? `+${diffH}h` : `${diffH}h`;
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
        <input type="text" id="cdTitle" placeholder="${t("countdown.titlePlaceholder")}" autocomplete="off">
        <input type="date" id="cdDate" aria-label="${t("countdown.dateAria")}">
        <button type="button" id="cdSave">${t("countdown.start")}</button>
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
        <div class="countdown-title"></div>
        <div class="countdown-number" id="cdNumber">–</div>
        <div class="countdown-label" id="cdLabel">${t("countdown.days")}</div>
      </div>
      <button type="button" class="countdown-edit" id="cdEdit">${t("countdown.change")}</button>
    `;
    body.querySelector(".countdown-title").textContent = data.title;
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
        numberEl.textContent = t("countdown.today");
        labelEl.textContent = data.title;
      } else if (diffMs <= -86400000) {
        const daysPast = Math.floor(-diffMs / 86400000);
        numberEl.textContent = t("countdown.pastNumber", { n: daysPast });
        labelEl.textContent = t(daysPast === 1 ? "countdown.dayPast" : "countdown.daysPast");
      } else {
        const days = Math.ceil(diffMs / 86400000);
        numberEl.textContent = days;
        labelEl.textContent = t(days === 1 ? "countdown.day" : "countdown.days");
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
      <input type="text" id="warnSearchInput" placeholder="${t("warn.filterPlaceholder")}" autocomplete="off">
      <button type="submit">${t("warn.filter")}</button>
    </form>
    <div class="warn-note" id="warnLoading">${t("warn.loading")}</div>
    <div class="warn-list" id="warnList"></div>
    <div class="warn-note">${t("warn.sourceLong")}</div>
  `,
  );

  const severityRank = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };

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
    loadingEl.textContent = t("warn.loading");
    try {
      const { warnings, failed } = await fetchOfficialWarnings();
      let all = warnings;
      listEl.innerHTML = "";

      if (filterText && filterText.trim()) {
        const q = filterText.trim().toLowerCase();
        all = all.filter((w) => warningTitle(w).toLowerCase().includes(q));
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
        empty.textContent = warningsEmptyText(filterText);
        listEl.appendChild(empty);
        return;
      }

      all.forEach((w) => {
        const item = document.createElement("div");
        item.className = "warn-item " + sevClass(w.type === "Cancel" ? "cancel" : w.severity);
        item.innerHTML = `
          <div class="warn-title"></div>
          <div class="warn-meta"><span class="warn-badge">${warningTypeLabel(w.type)}</span><span>${warningDate(w)}</span></div>
        `;
        item.querySelector(".warn-title").textContent = warningTitle(w);
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

// ---- To-do-Liste (anpassbare Checkliste) ----
const CHECKLIST_STORAGE_KEY = "dashboard-widget-checklist";

function defaultChecklistItems() {
  return DISASTER_CHECKLIST_ITEMS.map((key, i) => ({ id: "d" + i, key, done: false }));
}

function loadChecklistItems() {
  try {
    const raw = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || "null");
    if (!raw) return defaultChecklistItems();
    if (Array.isArray(raw) && raw.every((x) => typeof x === "number")) {
      return defaultChecklistItems().map((item, i) => ({ ...item, done: raw.includes(i) }));
    }
    if (raw && Array.isArray(raw.items)) {
      return raw.items.filter((it) => it && it.id && (it.key || typeof it.text === "string"));
    }
  } catch (err) {}
  return defaultChecklistItems();
}

function saveChecklistItems(items) {
  storageSet(CHECKLIST_STORAGE_KEY, JSON.stringify({ v: 2, items }));
  document.dispatchEvent(new Event("checklist-change"));
}

function checklistItemLabel(item) {
  return item.key ? t(item.key) : item.text;
}

function renderChecklist(list) {
  const items = loadChecklistItems();
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<div class="todo-empty">${t("checklist.empty")}</div>`;
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "todo-item" + (item.done ? " done" : "");
    row.innerHTML = `<input type="checkbox" ${item.done ? "checked" : ""}><span></span><button type="button" aria-label="${t("common.delete")}">×</button>`;
    row.querySelector("span").textContent = checklistItemLabel(item);
    row.querySelector("input").addEventListener("change", () => {
      const next = loadChecklistItems();
      const found = next.find((it) => it.id === item.id);
      if (found) found.done = !found.done;
      saveChecklistItems(next);
    });
    row.querySelector("button").addEventListener("click", () => {
      saveChecklistItems(loadChecklistItems().filter((it) => it.id !== item.id));
    });
    list.appendChild(row);
  });
}

function checklistMarkup() {
  return `
    <form class="todo-add" data-checklist-add>
      <input type="text" placeholder="${t("checklist.placeholder")}" autocomplete="off" aria-label="${t("checklist.add")}">
      <button type="submit" aria-label="${t("checklist.add")}">+</button>
    </form>
    <div class="todo-list scroll-list" data-checklist></div>
    <div class="warn-note">${t("checklist.note")}</div>
  `;
}

function bindChecklist(root) {
  const list = root.querySelector("[data-checklist]");
  const form = root.querySelector("[data-checklist-add]");
  if (!list) return () => {};
  const render = () => renderChecklist(list);
  render();
  const onAdd = (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    const text = input.value.trim();
    if (!text) return;
    saveChecklistItems([...loadChecklistItems(), { id: "c" + Date.now().toString(36), text, done: false }]);
    input.value = "";
  };
  form?.addEventListener("submit", onAdd);
  document.addEventListener("checklist-change", render);
  return () => {
    form?.removeEventListener("submit", onAdd);
    document.removeEventListener("checklist-change", render);
  };
}

function mountChecklistWidget(body) {
  renderInto(body, checklistMarkup());
  return bindChecklist(body);
}

// ---- Notrufnummern Widget ----
function mountEmergencyNumbersWidget(body) {
  renderInto(
    body,
    `
    <div class="clock-list">
      ${DISASTER_NUMBERS.map((n) => `<div class="emerg-row"><div class="emerg-num">${n.num}</div><div class="emerg-label">${t(n.label)}</div></div>`).join("")}
    </div>
    <div class="warn-note">${t("numbers.note")}</div>
  `,
  );
}

// ---- Katastrophenschutz-Seite ----
const DISASTER_NUMBERS = [
  { num: "112", label: "numbers.112" },
  { num: "110", label: "numbers.110" },
  { num: "116 117", label: "numbers.116117" },
  { num: "030 19240", label: "numbers.poison" },
];
// Vorgeschlagene Einträge; eigene Punkte kommen dazu, gelöschte bleiben weg
const DISASTER_CHECKLIST_ITEMS = [
  "checklist.water",
  "checklist.food",
  "checklist.documents",
  "checklist.firstAid",
  "checklist.medication",
  "checklist.torch",
  "checklist.radio",
  "checklist.powerbank",
  "checklist.cash",
  "checklist.clothes",
  "checklist.hygiene",
];

function renderDisasterNumbers() {
  const el = document.getElementById("disasterNumbersList");
  if (!el) return;
  el.innerHTML = DISASTER_NUMBERS.map(
    (n) => `<div class="emerg-row"><div class="emerg-num">${n.num}</div><div class="emerg-label">${t(n.label)}</div></div>`,
  ).join("");
}

// warnung.bund.de erlaubt keine Browser-Abrufe (kein CORS), daher über /api/warnings (api/warnings.js)
const WARN_SOURCE_LABEL = { mowas: "MoWaS", katwarn: "KATWARN", biwapp: "BIWAPP", dwd: "DWD", lhp: t("warn.sourceFlood") };
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
    return t("warn.noApi");
  return t("warn.unavailable", { reason: describeError(err) });
}
function warningsPartialText(failed) {
  return failed.length ? t("warn.partial", { list: failed.join(", ") }) : "";
}
function warningsEmptyText(filterText) {
  return filterText && filterText.trim() ? t("warn.emptyFor", { query: filterText.trim() }) : t("warn.empty");
}
// Die API liefert Titel teils auch in anderen Sprachen, sonst Deutsch
function warningTitle(w) {
  return w.i18nTitle?.[I18N.lang()] || w.i18nTitle?.de || t("warn.untitled");
}
function warningTypeLabel(type) {
  return type && I18N.has(`warn.type.${type}`) ? t(`warn.type.${type}`) : type || "";
}
function warningDate(w) {
  if (!w.startDate) return "";
  const date = new Date(w.startDate).toLocaleString(LOCALE, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return t("time.clock", { time: date });
}
const DISASTER_SEV_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
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
  loadingEl.textContent = t("warn.loading");
  try {
    const { warnings, failed } = await fetchOfficialWarnings();
    let all = warnings;
    listEl.innerHTML = "";
    if (filterText && filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      all = all.filter((w) => warningTitle(w).toLowerCase().includes(q));
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
      empty.textContent = warningsEmptyText(filterText);
      listEl.appendChild(empty);
      return true;
    }
    all.forEach((w) => {
      const item = document.createElement("div");
      item.className = "warn-item " + disasterSevClass(w.type === "Cancel" ? "cancel" : w.severity);
      item.innerHTML = `
        <div class="warn-title"></div>
        <div class="warn-meta"><span class="warn-badge">${warningTypeLabel(w.type)}</span><span>${warningDate(w)}</span></div>
      `;
      item.querySelector(".warn-title").textContent = warningTitle(w);
      listEl.appendChild(item);
    });
    return true;
  } catch (err) {
    reportError("Warnungen", err);
    renderRetry(loadingEl, warningsErrorText(err), () => loadDisasterWarnings(filterText));
    return false;
  }
}

function initDisasterPage() {
  renderDisasterNumbers();
  bindChecklist(document.getElementById("disasterChecklistPanel"));
  const form = document.getElementById("disasterWarnSearchForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      loadDisasterWarnings(document.getElementById("disasterWarnSearchInput").value);
    });
  }
  loadDisasterWarnings("");
}

const BANNER_STORAGE_KEY = "dashboard-banner-text";

function loadBannerText() {
  try {
    return localStorage.getItem(BANNER_STORAGE_KEY) || "";
  } catch (err) {
    return "";
  }
}

function placeWarnBanner() {
  const banner = document.getElementById("warnBanner");
  const page = document.querySelector(".page.active");
  const host = page && page.querySelector(":scope > .overview-bar .overview-banner-host");
  if (!banner || !host) return;
  if (banner.parentElement !== host) host.appendChild(banner);
}

function renderWarnBanner(text) {
  const banner = document.getElementById("warnBanner");
  const run = document.getElementById("warnBannerRun");
  if (!banner || !run) return;
  placeWarnBanner();
  const trimmed = String(text || "").replace(/\s+/g, " ").trim();
  banner.hidden = !trimmed;
  document.body.classList.toggle("has-warn-banner", Boolean(trimmed));
  banner.setAttribute("aria-label", trimmed ? `${t("banner.tag")}: ${trimmed}` : t("banner.aria"));
  run.replaceChildren();
  if (!trimmed) return;
  const viewport = banner.querySelector(".warn-banner-viewport");
  const lead = Math.max(80, viewport ? viewport.clientWidth : 0);
  const copies = 2;
  for (let i = 0; i < copies; i++) {
    const gap = document.createElement("span");
    gap.className = "warn-banner-gap";
    gap.style.flex = `0 0 ${lead}px`;
    run.appendChild(gap);
    const span = document.createElement("span");
    span.className = "warn-banner-copy";
    span.textContent = trimmed;
    run.appendChild(span);
  }
  requestAnimationFrame(() => {
    const half = run.scrollWidth / 2;
    const duration = Math.max(14, half / 70);
    run.style.animationDuration = `${duration}s`;
  });
}

function initWarnBanner() {
  const input = document.getElementById("bannerConfigInput");
  const text = loadBannerText();
  if (input) input.value = text;
  renderWarnBanner(text);
  let saveTimer;
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLTextAreaElement) || !el.id || !el.id.startsWith("bannerConfigInput")) return;
    const value = el.value;
    renderWarnBanner(value);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const saved = el.parentElement?.querySelector("#bannerConfigSaved, [id^='bannerConfigSaved']");
      if (!storageSet(BANNER_STORAGE_KEY, value)) {
        if (saved) saved.textContent = t("storage.notSaved");
        return;
      }
      const src = document.getElementById("bannerConfigInput");
      if (src && src !== el && document.activeElement !== src) src.value = value;
      if (saved) {
        saved.textContent = t("storage.saved");
        setTimeout(() => {
          if (saved.textContent === t("storage.saved")) saved.textContent = "";
        }, 1500);
      }
    }, 400);
  });
}
initDisasterPage();
initWarnBanner();
document.addEventListener("dashboard-page-change", placeWarnBanner);

// ---- Layout anpassen: Widgets per Drag & Drop umsortieren ----
const LAYOUT_GROUP_CLASSES = ["overview-grid"];
const LAYOUT_CONTAINER_SELECTOR = ".overview-grid";
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
      !c.classList.contains("widget-slot") &&
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
  return Boolean(item.closest(".page")) && !isLayoutGroup(item);
}
function roamContainers(page) {
  return [...page.querySelectorAll(":scope > .overview-grid")].filter((c) => !c.hidden);
}
function findLayoutItem(id) {
  return document.getElementById(id) || document.querySelector(`[data-layout-id="${CSS.escape(id)}"]`);
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
    const slot = hit.closest?.(".widget-slot");
    if (slot && containers.includes(slot.parentElement)) {
      return { target: slot, container: slot.parentElement };
    }
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
  const containers = roamContainers(page);
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
    const before =
      target.classList.contains("widget-slot") ||
      (horizontal ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2);
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
    if (board) afterBoardChange(board);
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

function applyLayoutHeight(el, px) {
  if (!(px > 0)) return;
  el.style.setProperty("--layout-h", `${Math.round(px)}px`);
  el.dataset.layoutH = "";
  el.dataset.rowHeight = String(Math.round(px));
}

function applyLayoutWidth(el, px) {
  if (!(px > 0)) return;
  el.style.setProperty("--layout-w", `${Math.round(px)}px`);
  el.dataset.layoutW = "";
}

function clearClampStyles(el) {
  el.classList.remove("tile-in-view");
  ["width", "min-width", "max-width", "height", "min-height", "max-height", "flex", "flex-basis"].forEach((prop) =>
    el.style.removeProperty(prop),
  );
}

function clearLayoutBox(el) {
  el.style.removeProperty("--layout-grow");
  el.style.removeProperty("--layout-h");
  el.style.removeProperty("--layout-w");
  delete el.dataset.layoutGrow;
  delete el.dataset.layoutH;
  delete el.dataset.layoutW;
  delete el.dataset.rowHeight;
  delete el.dataset.rowWeight;
  delete el.dataset.colFrac;
  el.style.gridColumn = "";
  clearClampStyles(el);
}

function clearGridPack(grid) {
  if (!grid) return;
  grid.style.flexDirection = "";
  grid.style.height = "";
  grid.querySelectorAll(":scope > .widget-slot").forEach((slot) => {
    slot.hidden = false;
  });
}

function applySavedSize(el, size) {
  if (!size) return;
  if (size.grow > 0) applyFlexGrow(el, size.grow);
  if (size.height > 0) applyLayoutHeight(el, size.height);
  if (size.width > 0) applyLayoutWidth(el, size.width);
  if (size.frac) el.dataset.colFrac = String(size.frac);
}

function isWidgetGrid(el) {
  return Boolean(el && el.classList.contains("overview-grid"));
}

function resizeMode(item) {
  if (item.classList.contains("collapsed")) return null;
  const inGrid = isWidgetGrid(item.parentElement);
  if (MOBILE_SCROLL_QUERY.matches) {
    if (!inGrid) return null;
    return { grid: true, x: true, y: false };
  }
  return { grid: false, x: true, y: true };
}

function updateResizeHandles() {
  if (!document.body.classList.contains("layout-editing")) return;
  document.querySelectorAll(".page.active .layout-resize").forEach((handle) => {
    const mode = resizeMode(handle.parentElement);
    handle.hidden = !mode;
    if (mode) handle.style.cursor = mode.x && mode.y ? "nwse-resize" : mode.x ? "ew-resize" : "ns-resize";
  });
}

function pageViewBox(page) {
  return page.getBoundingClientRect();
}

function tileOutOfView(el, view, slack = 4) {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  return r.right > view.right + slack || r.bottom > view.bottom + slack || r.left < view.left - slack || r.top < view.top - slack;
}

function clampTileToView(el, view) {
  const r = el.getBoundingClientRect();
  const left = Math.max(r.left, view.left);
  const top = Math.max(r.top, view.top);
  const maxW = Math.max(LAYOUT_MIN_WIDTH, Math.floor(view.right - left - 4));
  const maxH = Math.max(LAYOUT_MIN_HEIGHT, Math.floor(view.bottom - top - 4));
  if (r.width > maxW + 2 || r.right > view.right + 2) {
    if (!el.classList.contains("water-combo")) {
      clearClampStyles(el);
      applyLayoutWidth(el, maxW);
      el.classList.add("tile-in-view");
    }
  }
  if (r.height > maxH + 2 || r.bottom > view.bottom + 2) {
    if (!el.classList.contains("water-combo")) {
      applyLayoutHeight(el, maxH);
      el.classList.add("tile-in-view");
    }
  }
}

const RADAR_MAP_MIN = 260;

function placeOverflowingTileBeside(page, el, view) {
  const row = el.parentElement;
  if (!row || !row.classList.contains("overview-grid")) return;
  const map = el.querySelector(".map-wrap");
  const mapBox = map ? map.getBoundingClientRect() : null;
  const squeezed = mapBox && mapBox.height > 0 && mapBox.height < RADAR_MAP_MIN;
  const belowFold = el.getBoundingClientRect().bottom > view.bottom + 4;
  if (!belowFold && !squeezed && !tileOutOfView(el, view)) return;
  el.style.maxHeight = "";
  if (map) map.style.maxHeight = "";
  const items = layoutItems(row).filter((item) => item !== el);
  const weather = items.find((c) => c.classList.contains("weather") || c.id === "weatherPanel");
  const inView = items.filter((item) => item.getBoundingClientRect().bottom <= view.bottom + 4);
  const anchor = (el.classList.contains("radar") && weather) || inView[inView.length - 1] || items[0];
  if (anchor && anchor.nextElementSibling !== el) anchor.after(el);
}

function packOverflowingGrid(page) {
  const grid = page.querySelector(":scope > .overview-grid");
  if (!grid || MOBILE_SCROLL_QUERY.matches) return;
  const view = pageViewBox(page);
  const bar = page.querySelector(":scope > .overview-bar");
  const top = bar ? bar.getBoundingClientRect().bottom : view.top;
  const height = Math.max(200, Math.floor(view.bottom - top - 8));
  const items = layoutItems(grid).filter((el) => el.offsetParent && !el.classList.contains("collapsed"));
  grid.style.flexDirection = "row";
  grid.style.flexWrap = "wrap";
  grid.style.height = "";
  grid.style.alignContent = "flex-start";
  grid.style.alignItems = "flex-start";
  if (!items.length) {
    clearGridPack(grid);
    return;
  }
  const packed = items.map((el) => ({ el, r: el.getBoundingClientRect() }));
  const overflow = packed.some((p) => p.r.height > 2 && p.r.bottom > view.bottom + 4);
  const leftover = packed.some((tall) => {
    if (tall.r.height < 240) return false;
    const roomRight = view.right - tall.r.right;
    const laterFits = packed.some(
      (other) => other.el !== tall.el && other.r.top >= tall.r.bottom - 12 && other.r.width <= roomRight - 8,
    );
    return roomRight > 140 && laterFits;
  });
  const squeezeWide = leftover && packed.some((p) => {
    if (!p.el.classList.contains("water-combo")) return false;
    const tall = packed.find((t) => t.r.height >= 240 && t.el !== p.el);
    const room = tall ? view.right - tall.r.right : view.width;
    return p.r.width > room - 8;
  });
  if (!overflow && (!leftover || squeezeWide)) {
    clearGridPack(grid);
    return;
  }
  grid.querySelectorAll(":scope > .widget-slot").forEach((slot) => {
    slot.hidden = true;
  });
  grid.style.flexDirection = "column";
  grid.style.flexWrap = "wrap";
  grid.style.height = `${height}px`;
}

function keepTilesInView(page) {
  if (!page || !page.classList.contains("active") || MOBILE_SCROLL_QUERY.matches) return;
  if (document.body.classList.contains("layout-dragging") || document.body.classList.contains("layout-resize-active"))
    return;
  const view = pageViewBox(page);
  if (view.width < 80 || view.height < 80) return;

  packOverflowingGrid(page);

  const grid = page.querySelector(":scope > .overview-grid");
  const tiles = (grid ? layoutItems(grid) : []).filter(
    (el) => el.offsetParent && !el.classList.contains("collapsed"),
  );
  tiles.forEach((el) => clampTileToView(el, view));

  tiles
    .filter((el) => el.classList.contains("radar") || tileOutOfView(el, view))
    .forEach((el) => placeOverflowingTileBeside(page, el, view));
  packOverflowingGrid(page);
  tiles.forEach((el) => {
    if (el.isConnected) clampTileToView(el, view);
  });

  page.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((row) => {
    if (row.classList.contains("stat-row")) return;
    const cs = getComputedStyle(row);
    if (cs.display !== "flex" && cs.display !== "inline-flex") return;
    if (cs.flexDirection === "column") return;
    const overflowsX = [...row.children].some(
      (ch) => !ch.classList.contains("widget-slot") && ch.getBoundingClientRect().right > view.right + 6,
    );
    if (overflowsX) {
      row.style.flexWrap = "wrap";
      row.style.justifyContent = "flex-start";
      row.style.alignContent = "flex-start";
    }
  });

  requestAnimationFrame(() => {
    if (!page.classList.contains("active") || MOBILE_SCROLL_QUERY.matches) return;
    const box = pageViewBox(page);
    tiles
      .filter((el) => el.isConnected && tileOutOfView(el, box))
      .forEach((el) => {
        const parent = el.parentElement;
        if (!parent || !parent.classList.contains("overview-grid")) return;
        if (getComputedStyle(parent).flexDirection !== "column") {
          parent.style.flexWrap = "wrap";
          parent.style.justifyContent = "flex-start";
          parent.style.alignContent = "flex-start";
        }
        if (el.classList.contains("radar")) placeOverflowingTileBeside(page, el, box);
      });
  });
}

function startFlexResize(e, item, mode) {
  const start = item.getBoundingClientRect();
  const page = item.closest(".page");
  return (ev) => {
    const view = page ? pageViewBox(page) : null;
    const patch = {};
    if (mode.x) {
      let width = Math.max(LAYOUT_MIN_WIDTH, Math.round(start.width + ev.clientX - e.clientX));
      if (view) width = Math.min(width, Math.max(LAYOUT_MIN_WIDTH, Math.floor(view.right - start.left - 4)));
      applyLayoutWidth(item, width);
      patch.width = width;
    }
    if (mode.y) {
      let height = Math.max(LAYOUT_MIN_HEIGHT, Math.round(start.height + ev.clientY - e.clientY));
      if (view) height = Math.min(height, Math.max(LAYOUT_MIN_HEIGHT, Math.floor(view.bottom - start.top - 4)));
      applyLayoutHeight(item, height);
      patch.height = height;
    }
    saveLayoutSize(layoutItemId(item), patch);
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
    const height = Math.max(LAYOUT_MIN_HEIGHT, Math.round(startRect.height + ev.clientY - e.clientY));
    applyLayoutHeight(item, height);
    saveLayoutSize(layoutItemId(item), { height });
    fitWidgetGrid(grid);
  };
}

function startLayoutResize(e, item) {
  if (e.button !== 0) return;
  const mode = resizeMode(item);
  if (!mode) return;
  e.preventDefault();
  e.stopPropagation();
  clearClampStyles(item);
  const useGrid = mode.grid && getComputedStyle(item.parentElement).display === "grid";
  const onMove = useGrid ? startGridResize(e, item) : startFlexResize(e, item, { x: true, y: true });
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
    layoutItems(container, true).forEach((el) => applySavedSize(el, sizes[layoutItemId(el)]));
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
        handle.setAttribute("aria-label", t("layout.dragHandle"));
        handle.title = t("layout.dragHandle");
        handle.innerHTML = LAYOUT_HANDLE_SVG;
        handle.addEventListener("pointerdown", (e) => startLayoutDrag(e, item));
        item.prepend(handle);
      }
      // Zeilen und Spalten nicht skalieren — nur die Widgets darin
      if (!existingResize && !item.classList.contains("layout-group")) {
        const resize = document.createElement("button");
        resize.type = "button";
        resize.className = "layout-resize";
        resize.setAttribute("aria-label", t("layout.resizeAria"));
        resize.title = t("layout.resize");
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
    btn.textContent = t(editing ? "layout.done" : "layout.arrange");
  });
  refreshLayoutHandles();
}

function initLayout() {
  document.documentElement.style.setProperty("--i18n-drop-here", JSON.stringify(t("layout.dropHere")));
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
  applySavedFlexSizes();
  refreshLayoutHandles();

  document.querySelectorAll('[data-widget-action="arrange"]').forEach((btn) =>
    btn.addEventListener("click", () => setLayoutEditing(!document.body.classList.contains("layout-editing"))),
  );
}

// Stellt Reihenfolge, Größen und Einklapp-Zustand einer Seite wie im HTML vorgegeben wieder her
function resetLayoutOrderAndSizes(page) {
  const containers = [...page.querySelectorAll(":scope > .overview-grid")];
  containers.forEach((container) => {
    (container._defaultOrder || []).forEach((el) => {
      container.appendChild(el);
      saveWidgetPlace(layoutItemId(el), null);
    });
    try {
      localStorage.removeItem(LAYOUT_STORAGE_PREFIX + layoutContainerKey(container));
    } catch (err) {}
    layoutItems(container, true).forEach((el) => {
      clearLayoutBox(el);
      saveLayoutSize(layoutItemId(el), null);
    });
    clearGridPack(container);
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

// OpenWeather-Key: bevorzugt /api/radar (Vercel-Env oder lokaler Server). Fallback: js/config.js im Browser (Live Server).
const OPENWEATHER_CLIENT_KEY = (window.DASHBOARD_CONFIG && window.DASHBOARD_CONFIG.openWeatherKey) || "";
let openWeatherViaProxy = false;
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
const openWeatherOption = radarProvider.querySelector('option[value="openweather"]');

function openWeatherEnabled() {
  return openWeatherViaProxy || Boolean(OPENWEATHER_CLIENT_KEY);
}

function applyOpenWeatherOption() {
  const on = openWeatherEnabled();
  openWeatherOption.disabled = !on;
  openWeatherOption.textContent = t("radar.providerOpenweather") + (on ? "" : t("radar.noKey"));
  if (!on && radarProvider.value === "openweather") radarProvider.value = "rainviewer";
}

applyOpenWeatherOption();
fetch("/api/radar", { headers: { Accept: "application/json" } })
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    openWeatherViaProxy = Boolean(data && data.available);
    applyOpenWeatherOption();
  })
  .catch(() => {
    openWeatherViaProxy = false;
    applyOpenWeatherOption();
  });
const playback = document.getElementById("radarPlayback");

function formatFrameTime(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
}

function stopPlayback() {
  playing = false;
  playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  playBtn.setAttribute("aria-label", t("radar.play"));
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
  frameTimeEl.textContent = t("time.clock", { time: formatFrameTime(frames[currentFrame].time) });
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
  radarDetailNote.textContent = t("radar.noteRainviewer");
  if (!LEAFLET_AVAILABLE) {
    setRadarStatus(t("map.unavailable"), true);
    return false;
  }
  const hadFrames = radarLayers.length > 0;
  if (!hadFrames) setRadarStatus(t("radar.loading"));
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
      radarDetailNote.textContent = t("radar.notUpdated", { reason: describeError(err) });
    } else {
      setRadarStatus(t("radar.unavailable", { reason: describeError(err) }), true, loadRadar);
    }
    return false;
  }
}

function loadOpenWeather() {
  if (!LEAFLET_AVAILABLE || !openWeatherEnabled()) return loadRainViewer();
  ++radarEpoch;
  clearRadar();
  playback.hidden = true;
  radarDetailNote.textContent = t("radar.noteOpenweather");
  setRadarStatus(t("radar.owLoading"));
  let seen = false;
  const tileUrl = openWeatherViaProxy
    ? "/api/radar?z={z}&x={x}&y={y}"
    : "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=" +
      encodeURIComponent(OPENWEATHER_CLIENT_KEY);
  openWeatherLayer = L.tileLayer(tileUrl, {
    attribution: t("radar.owAttribution"),
    opacity: 0.7,
    zIndex: 400,
    maxNativeZoom: 12,
    maxZoom: 16,
    updateWhenIdle: true,
  });
  openWeatherLayer.on("tileload", () => {
    if (!seen && radarProvider.value === "openweather") {
      seen = true;
      setRadarStatus("");
      setLastUpdatedNow();
    }
  });
  openWeatherLayer.on("tileerror", () => {
    if (radarProvider.value !== "openweather" || seen) return;
    const reason = navigator.onLine === false ? t("err.offline") : t("radar.owTilesFailed");
    setRadarStatus(t("radar.owUnavailable", { reason }), true, loadRadar);
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
  playBtn.setAttribute("aria-label", t("radar.pause"));
  playTimer = setInterval(() => showFrame(currentFrame + 1), 850);
}

playBtn.addEventListener("click", () => (playing ? stopPlayback() : startPlayback()));

map.on("zoomend", () => {
  if (radarProvider.value === "rainviewer") {
    radarDetailNote.textContent =
      map.getZoom() > 7 ? t("radar.noteZoomed") : t("radar.noteDefault");
  }
});

loadRadar();

// Ortssuche über Open-Meteo Geocoding, Ortsnamen in der gewählten Sprache
let searchMarker = null;
function geocodeUrl(query) {
  return `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=${I18N.lang()}&format=json`;
}

async function searchPlace(query) {
  if (!query.trim()) return;
  showToast(t("search.searching", { query: query.trim() }));
  try {
    const data = await fetchData(geocodeUrl(query), { source: "Ortssuche" });
    const hit = data.results?.[0];
    if (!hit) {
      showToast(t("search.notFound", { query: query.trim() }));
      return;
    }
    map.setView([hit.latitude, hit.longitude], 9);
    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([hit.latitude, hit.longitude]).addTo(map);
    const label = [hit.name, hit.admin1, hit.country].filter(Boolean).join(", ");
    const popup = document.createElement("div");
    popup.textContent = label;
    searchMarker.bindPopup(popup).openPopup();
  } catch (err) {
    reportError("Ortssuche", err);
    showToast(t("search.failed", { reason: describeError(err) }), "error");
  }
}

document.getElementById("radarForm").addEventListener("submit", (e) => {
  e.preventDefault();
  searchPlace(document.getElementById("radarInput").value);
});

document.getElementById("radarQuick").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-city]");
  if (!btn) return;
  document.getElementById("radarInput").value = btn.textContent;
  searchPlace(btn.textContent);
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
  if (code === 0) return { text: t("wcode.clear"), icon: "clear" };
  if (code === 1) return { text: t("wcode.mainlyClear"), icon: "sun_cloud" };
  if (code === 2) return { text: t("wcode.partlyCloudy"), icon: "sun_cloud" };
  if (code === 3) return { text: t("wcode.overcast"), icon: "cloud" };
  if (code === 45 || code === 48) return { text: t("wcode.fog"), icon: "fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: t("wcode.drizzle"), icon: "rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: t("wcode.rain"), icon: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: t("wcode.snow"), icon: "snow" };
  if ([95, 96, 99].includes(code)) return { text: t("wcode.storm"), icon: "storm" };
  return { text: t("wcode.changeable"), icon: "cloud" };
}

// Kurze Wochentage (So, Mo … bzw. Sun, Mon …) in der gewählten Sprache
function weekdayShort(date) {
  return date.toLocaleDateString(LOCALE, { weekday: "short" }).replace(/\.$/, "");
}
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
  return t("time.hour", { hour: iso.slice(11, 13) });
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
      const low = Math.round(data.daily.temperature_2m_min[i]);
      const heightPct = 22 + ((high - minVal) / span) * 78; // 22%–100%
      const label = i === 0 ? t("common.todayCap") : weekdayShort(d);
      const info = weatherCodeInfo(data.daily.weather_code[i]);
      return `<div class="bar-col${i === 0 ? " today" : ""}" title="${label}: ${info.text} · ${high}° / ${low}°">
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
    <svg viewBox="0 0 120 120" role="img" aria-label="${captionText || t("weather.donutWord")}: ${p}%">
      <title>${captionText || t("weather.donutWord")}: ${p}%</title>
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="14"/>
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--orange)" stroke-width="14" transform="rotate(-90 60 60)"
        stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"/>
    </svg>
    <div class="donut-center">
      <div class="donut-pct">${p}%</div>
      <div class="donut-word">${t("weather.donutWord")}</div>
    </div>`;
  const caption = document.getElementById("donutCaption");
  if (caption) caption.textContent = captionText || "";
}

const waveHoverCache = new WeakMap();
let activeWaveHoverArea = null;

function hideWaveHover(area) {
  area.classList.remove("chart-hover-active");
  if (activeWaveHoverArea === area) activeWaveHoverArea = null;
}

document.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  const area = event.target instanceof Element ? event.target.closest(".wave-area") : null;
  const svg = area?.querySelector("svg[data-hover-points]");
  if (!area || !svg) {
    if (activeWaveHoverArea) hideWaveHover(activeWaveHoverArea);
    return;
  }

  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  let points = waveHoverCache.get(svg);
  if (!points) {
    try {
      points = JSON.parse(svg.dataset.hoverPoints);
      waveHoverCache.set(svg, points);
    } catch {
      return;
    }
  }
  if (!points.length) return;

  const viewBox = svg.viewBox.baseVal;
  const chartX = ((event.clientX - rect.left) / rect.width) * viewBox.width;
  const point = points.reduce((nearest, candidate) =>
    Math.abs(candidate.x - chartX) < Math.abs(nearest.x - chartX) ? candidate : nearest,
  );
  const tooltip = area.querySelector(".chart-hover-tooltip");
  const marker = svg.querySelector(".chart-hover-marker");
  if (!tooltip || !marker) return;

  if (activeWaveHoverArea && activeWaveHoverArea !== area) hideWaveHover(activeWaveHoverArea);
  activeWaveHoverArea = area;
  area.classList.add("chart-hover-active");
  tooltip.querySelector("span").textContent = point.label;
  tooltip.querySelector("strong").textContent = point.value;
  marker.setAttribute("cx", point.x);
  marker.setAttribute("cy", point.y);
  const guide = svg.querySelector(".chart-hover-guide");
  if (guide) {
    guide.setAttribute("x1", point.x);
    guide.setAttribute("x2", point.x);
  }

  const pointX = (point.x / viewBox.width) * rect.width;
  const pointY = (point.y / viewBox.height) * rect.height;
  const halfTooltipWidth = tooltip.offsetWidth / 2;
  tooltip.style.left = `${Math.max(halfTooltipWidth + 4, Math.min(rect.width - halfTooltipWidth - 4, pointX))}px`;
  tooltip.style.top = `${pointY}px`;
  tooltip.classList.toggle("below", pointY < 42);
});

document.addEventListener("pointerout", (event) => {
  const area = event.target instanceof Element ? event.target.closest(".wave-area") : null;
  const nextTarget = event.relatedTarget;
  if (area && (!(nextTarget instanceof Node) || !area.contains(nextTarget))) hideWaveHover(area);
});

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
  const hoverPoints = hourIdxForDay.map((idx, i) => ({
    x: points[i][0],
    y: points[i][1],
    label: new Date(hourly.time[idx]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" }),
    value: `${temps[i].toLocaleString(LOCALE, { maximumFractionDigits: 1 })} °C`,
  }));
  const yGrid = [pad, h / 2, h - pad]
    .map((y) => `<line class="wave-grid-line" x1="${pad}" x2="${w - pad}" y1="${y}" y2="${y}"/>`)
    .join("");
  const xGrid = hourIdxForDay
    .map((idx, i) => ({ i, hour: Number(hourly.time[idx].slice(11, 13)) }))
    .filter(({ hour }) => hour > 0 && hour < 24 && hour % 6 === 0)
    .map(({ i }) => `<line class="wave-grid-line" x1="${points[i][0]}" x2="${points[i][0]}" y1="${pad}" y2="${h - pad}"/>`)
    .join("");
  const dataDots = points
    .map(([x, y]) => `<circle class="temp-data-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5"/>`)
    .join("");
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
      nowLine = `<line x1="${x}" y1="0" x2="${x}" y2="${h}" style="stroke:var(--teal)" stroke-width="1.5" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
      nowLabel = `<span class="wave-now-label" style="left:${xPct(points[i][0])}">${t("weather.now")}</span>`;
    }
  }

  el.setAttribute("role", "img");
  el.setAttribute("aria-label", t("weather.waveAria", { min: Math.round(minT), max: Math.round(maxT) }));
  el.innerHTML = `
    <div class="wave-plot">
      <div class="wave-y">${yLabels}</div>
      <div class="wave-area temperature-wave-area">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style="stop-color:var(--orange);stop-opacity:0.24"/>
              <stop offset="100%" style="stop-color:var(--orange);stop-opacity:0"/>
            </linearGradient>
          </defs>
          ${yGrid}${xGrid}
          <path d="${areaPath}" fill="url(#waveFill)" stroke="none"/>
          <path d="${linePath}" fill="none" style="stroke:var(--orange)" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
          ${dataDots}
          ${nowLine}
          <line class="chart-hover-guide" x1="0" y1="${pad}" x2="0" y2="${h - pad}"/>
          <circle class="chart-hover-marker" cx="0" cy="0" r="4"/>
          <rect class="chart-hover-target" x="0" y="0" width="${w}" height="${h}" fill="transparent" pointer-events="all"/>
        </svg>
        ${nowLabel}
        <div class="chart-hover-tooltip" aria-hidden="true"><span></span><strong></strong></div>
      </div>
      <div class="wave-x">${xLabels}</div>
    </div>`;
  el.querySelector(".wave-area svg").dataset.hoverPoints = JSON.stringify(hoverPoints);
}

function renderDayDetail(index) {
  if (!weatherData) return;
  selectedDayIndex = index;

  document.querySelectorAll("#weatherForecast .day").forEach((el, i) => {
    el.classList.toggle("selected", i === index);
  });

  const d = weatherData.daily;
  const dateStr = d.time[index];
  const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString(LOCALE, {
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
    rainSummary = t("weather.noRain");
  } else {
    const first = formatHour(hourly.time[rainHours[0]]);
    const last = formatHour(hourly.time[rainHours[rainHours.length - 1]]);
    const maxPop = Math.max(...rainHours.map((i) => hourly.precipitation_probability[i]));
    rainSummary =
      rainHours.length === 1
        ? t("weather.rainAt", { time: first, pop: maxPop })
        : t("weather.rainBetween", { from: first, to: last, pop: maxPop });
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
  const shortLabel = index === 0 ? t("common.today") : dateLabel;
  renderRainDonut(dayPop, shortLabel);
  renderTempWave(hourIdxForDay, hourly, index === 0 ? weatherData.current.time : null);
  const waveLabelEl = document.getElementById("waveDayLabel");
  if (waveLabelEl) waveLabelEl.textContent = t("weather.hourlyLabel", { day: shortLabel }) + (weatherTzShort ? ` · ${weatherTzShort}` : "");

  const statsEl = document.getElementById("weatherStats");
  if (index === 0) {
    const c = weatherData.current;
    const sunrise = new Date(d.sunrise[0]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(d.sunset[0]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    statsEl.innerHTML =
      statChip(iconPressure, t("weather.chip.pressure"), `${Math.round(c.surface_pressure)} hPa`) +
      statChip(iconHumidity, t("weather.chip.humidity"), `${c.relative_humidity_2m} %`) +
      statChip(iconWind, t("weather.chip.wind"), `${Math.round(c.wind_speed_10m)} km/h`) +
      statChip(iconFeels, t("weather.chip.feels"), `${Math.round(c.apparent_temperature)}°`) +
      statChip(iconUv, t("weather.chip.uv"), `${Math.round(d.uv_index_max[0])}`) +
      statChip(iconSun, t("weather.chip.sun"), `${sunrise} – ${sunset}`);
  } else {
    const avgPressure = Math.round(
      hourIdxForDay.reduce((s, i) => s + hourly.surface_pressure[i], 0) / hourIdxForDay.length,
    );
    const avgHumidity = Math.round(
      hourIdxForDay.reduce((s, i) => s + hourly.relative_humidity_2m[i], 0) / hourIdxForDay.length,
    );
    const sunrise = new Date(d.sunrise[index]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(d.sunset[index]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    statsEl.innerHTML =
      statChip(iconPressure, t("weather.chip.pressureAvg"), `${avgPressure} hPa`) +
      statChip(iconHumidity, t("weather.chip.humidityAvg"), `${avgHumidity} %`) +
      statChip(iconWind, t("weather.chip.windMax"), `${Math.round(d.wind_speed_10m_max[index])} km/h`) +
      statChip(iconUv, t("weather.chip.uv"), `${Math.round(d.uv_index_max[index])}`) +
      statChip(iconSun, t("weather.chip.sun"), `${sunrise} – ${sunset}`);
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
  if (diff === 0) return { main: "→", suffix: t("delta.same", { cmp: compareText }) };
  const amount = Math.abs(diff).toLocaleString(LOCALE, { maximumFractionDigits: decimals });
  return { main: `${diff > 0 ? "↑" : "↓"} ${amount}${unit}`, suffix: t("delta.vs", { cmp: compareText }) };
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
  weatherTzShort = t("weather.tzShort", { place });
  tzEl.textContent = t("weather.tzNote", { place, offset: formatUtcOffset(data.utc_offset_seconds) });
  tzEl.hidden = false;
}

function renderWeatherNoData() {
  const msg = `<div class="chart-empty">${t("common.noData")}</div>`;
  ["barChart", "donutChart", "waveChart"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = msg;
  });
  ["statTempDelta", "statWindDelta", "statHumidityDelta", "statRainDelta"].forEach((id) =>
    setStatDelta(id, { main: t("common.noDataMain"), suffix: t("common.noDataSuffix") }),
  );
  document.getElementById("weatherRange").textContent = t("common.noData");
}

function weatherForecastUrl(lat, lon) {
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability,surface_pressure,relative_humidity_2m,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
    `&timezone=auto&forecast_days=8&past_days=1`
  );
}

async function loadWeatherForPlace(lat, lon, label) {
  currentWeatherCoords = { lat, lon, label };
  weatherLoading.textContent = t("weather.loadingFor", { place: label });
  try {
    const url = weatherForecastUrl(lat, lon);
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
      t("weather.range", { lo, hi, pop: pop ?? 0 });

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
      formatDelta(c.temperature_2m, sameHourYesterday(yesterday, c.time, "temperature_2m"), "°", t("delta.yesterday")),
    );
    setStatDelta(
      "statWindDelta",
      formatDelta(c.wind_speed_10m, sameHourYesterday(yesterday, c.time, "wind_speed_10m"), " km/h", t("delta.yesterday")),
    );
    setStatDelta(
      "statHumidityDelta",
      formatDelta(c.relative_humidity_2m, sameHourYesterday(yesterday, c.time, "relative_humidity_2m"), " %", t("delta.yesterday")),
    );
    setStatDelta(
      "statRainDelta",
      formatDelta(pop, yesterday.daily.precipitation_probability_max, " %", t("delta.yesterday")),
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
      dayEl.title = `${isToday ? t("common.todayCap") : weekdayShort(d)} · ${info.text} · ${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°`;
      dayEl.innerHTML = `
        <div class="day-label">${isToday ? t("common.todayCap") : weekdayShort(d)}</div>
        <svg class="day-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:20px;height:20px;">${weatherIcons[info.icon]}</svg>
        <div class="day-high">${Math.round(data.daily.temperature_2m_max[i])}°</div>
        <div class="day-low">${Math.round(data.daily.temperature_2m_min[i])}°</div>
      `;
      dayEl.addEventListener("click", () => renderDayDetail(i));
      forecastEl.appendChild(dayEl);
    });

    renderDayDetail(0);

    document.getElementById("weatherSourceNote").textContent =
      t("weather.source");
    weatherLoading.textContent = "";
    setLastUpdatedNow();
    requestAnimationFrame(() => fitAllWidgetGrids());
    return true;
  } catch (err) {
    reportError("Wetter", err);
    const stale = weatherData ? " " + t("common.showingLast") : "";
    renderRetry(weatherLoading, t("weather.unavailable", { place: label, reason: describeError(err) }) + stale, () =>
      loadWeatherForPlace(lat, lon, label),
    );
    if (!weatherData) renderWeatherNoData();
    return false;
  }
}

async function searchWeatherPlace(query) {
  if (!query.trim()) return;
  weatherLoading.textContent = t("search.searching", { query: query.trim() });
  try {
    const data = await fetchData(geocodeUrl(query), { source: "Ortssuche" });
    const hit = data.results?.[0];
    if (!hit) {
      weatherLoading.textContent = t("search.notFound", { query: query.trim() });
      return;
    }
    const label = [hit.name, hit.country].filter(Boolean).join(", ");
    loadWeatherForPlace(hit.latitude, hit.longitude, label);
  } catch (err) {
    reportError("Ortssuche", err);
    renderRetry(weatherLoading, t("search.failed", { reason: describeError(err) }) + ".", () => searchWeatherPlace(query));
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

// Wochentage ab Montag; der 1. Januar 2024 war ein Montag
const calWeekdayLabels = Array.from({ length: 7 }, (_, i) => weekdayShort(new Date(2024, 0, 1 + i)));

const CAL_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Jede Instanz hat eigenen Monat und ausgewählten Tag; die Termine sind für alle gleich
function mountCalendarWidget(body) {
  renderInto(
    body,
    `<div class="calendar cal-widget">
      <div class="cal-header">
        <div class="cal-title"></div>
        <div class="cal-nav">
          <button type="button" class="cal-prev" aria-label="${t("cal.prev")}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button type="button" class="cal-today-btn">${t("common.todayCap")}</button>
          <button type="button" class="cal-next" aria-label="${t("cal.next")}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
      <div class="cal-grid"></div>
      <div class="cal-selected-date">${t("cal.eventsFor", { day: `<span class="cal-selected-label">${t("common.today")}</span>` })}</div>
      <div class="cal-events"></div>
      <form class="cal-add">
        <input type="text" class="cal-add-input" placeholder="${t("cal.addPlaceholder")}" autocomplete="off" required aria-label="${t("cal.nameAria")}">
        <input type="time" class="cal-add-time" aria-label="${t("cal.timeAria")}" required>
        <label class="cal-all-day"><input type="checkbox" class="cal-all-day-input">${t("cal.allDay")}</label>
        <button type="submit" aria-label="${t("cal.add")}">+</button>
      </form>
    </div>`,
  );
  const $ = (sel) => body.querySelector(sel);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = dateKey(today);

  function renderGrid() {
    $(".cal-title").textContent = new Date(viewYear, viewMonth, 1).toLocaleDateString(LOCALE, {
      month: "long",
      year: "numeric",
    });
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
    const label = new Date(y, m - 1, d).toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
    $(".cal-selected-label").textContent =
      selectedKey === dateKey(today) ? t("cal.todayWithDate", { date: label }) : label;

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
      empty.textContent = t("cal.empty");
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
      time.textContent = event.allDay || !event.time ? t("cal.allDay") : t("time.clock", { time: event.time });
      const name = document.createElement("span");
      name.className = "event-name";
      name.textContent = event.text || "";
      info.append(time, name);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.setAttribute("aria-label", t("cal.delete"));
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
  return weekdayShort(new Date(iso + "T00:00:00"));
}
function fireShortDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit" });
}
function fireDayLabel(iso) {
  return `${fireWeekday(iso)}, ${fireShortDate(iso)}`;
}

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderFire(days) {
  const week = days.slice(-7);
  const prev = days.length >= 14 ? days.slice(-14, -7) : null;
  const last = week[week.length - 1];
  const prevDay = days.length >= 2 ? days[days.length - 2] : null;
  setElText("fireYesterday", last.fire.toLocaleString(LOCALE));
  setElText("fireYesterdayLabel", fireDayLabel(last.date));
  setStatDelta(
    "fireYesterdayDelta",
    formatDelta(last.fire, prevDay?.fire, "", prevDay ? fireDayLabel(prevDay.date) : ""),
  );

  const total = sumBy(week, "fire");
  const prevTotal = prev ? sumBy(prev, "fire") : null;
  document.getElementById("fireTotal").textContent = total.toLocaleString(LOCALE);
  setStatDelta("fireTotalDelta", formatDelta(total, prevTotal, "", t("delta.lastWeek")));

  const avg = total / week.length;
  document.getElementById("fireAvg").textContent = avg.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
  setStatDelta("fireAvgDelta", formatDelta(avg, prev ? prevTotal / prev.length : null, "", t("delta.lastWeek"), 1));

  const peak = week.reduce((a, b) => (b.fire > a.fire ? b : a));
  document.getElementById("firePeak").textContent = peak.fire.toLocaleString(LOCALE);
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
  setStatDelta("fireResponseDelta", formatDelta(response, prev ? meanBy(prev, "pump") : null, " s", t("delta.lastWeek")));

  const bar = document.getElementById("fireBarChart");
  const max = Math.max(...week.map((d) => d.fire), 1);
  bar.setAttribute("role", "img");
  bar.setAttribute(
    "aria-label",
    t("fire.barsAria", { list: week.map((d) => `${fireDayLabel(d.date)} ${d.fire}`).join(", ") }),
  );
  bar.innerHTML = week
    .map(
      (d) => `<div class="bar-col${d === peak ? " today" : ""}" title="${t("fire.barTitle", { day: fireDayLabel(d.date), count: d.fire })}">
      <div class="bar-value">${d.fire}</div>
      <div class="bar-track"><div class="bar" style="height:${Math.max(4, (d.fire / max) * 100).toFixed(0)}%"></div></div>
      <div class="bar-label">${fireWeekday(d.date)}<span class="bar-date">${fireShortDate(d.date)}</span></div>
    </div>`,
    )
    .join("");
  document.getElementById("fireChartSub").textContent =
    t("fire.chartRange", { from: fireDayLabel(week[0].date), to: fireDayLabel(last.date) });

  const all = sumBy(week, "all");
  const share = all ? (total / all) * 100 : 0;
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(share, 100) / 100) * circumference;
  const shareText = share.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
  document.getElementById("fireDonut").innerHTML = `
    <svg viewBox="0 0 120 120" role="img" aria-label="${t("fire.donutAria", { share: shareText })}">
      <title>${t("fire.donutWord")}: ${shareText}%</title>
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--line)" stroke-width="14"/>
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--orange)" stroke-width="14" transform="rotate(-90 60 60)"
        stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"/>
    </svg>
    <div class="donut-center">
      <div class="donut-pct">${shareText}%</div>
      <div class="donut-word">${t("fire.donutWord")}</div>
    </div>`;
  document.getElementById("fireDonutCaption").textContent =
    t("fire.donutCaption", { part: total.toLocaleString(LOCALE), all: all.toLocaleString(LOCALE) });

  document.getElementById("fireTableBody").innerHTML = [...week]
    .reverse()
    .map(
      (d) => `<tr>
      <td>${fireDayLabel(d.date)}</td>
      <td>${d.fire.toLocaleString(LOCALE)}</td>
      <td>${Number.isFinite(d.tech) ? d.tech.toLocaleString(LOCALE) : "–"}</td>
      <td>${Number.isFinite(d.all) ? d.all.toLocaleString(LOCALE) : "–"}</td>
      <td>${formatMinSec(d.pump)}</td>
    </tr>`,
    )
    .join("");

  const ageDays = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(last.date + "T00:00:00")) / 86400000);
  document.getElementById("fireSourceNote").textContent =
    t("fire.source", { date: fireDayLabel(last.date) }) +
    (ageDays > 2 ? " " + t("fire.dataAge", { days: ageDays }) : "") +
    t("fire.sourceTz");
  document.getElementById("fireExportBtn").disabled = false;
}

function renderFireNoData() {
  ["fireTotal", "fireAvg", "firePeak", "fireResponse", "fireYesterday"].forEach((id) => {
    setElText(id, "–");
  });
  setElText("fireYesterdayLabel", "");
  ["fireTotalDelta", "fireAvgDelta", "firePeakDelta", "fireResponseDelta", "fireYesterdayDelta"].forEach((id) =>
    setStatDelta(id, { main: t("common.noDataMain"), suffix: t("common.noDataSuffix") }),
  );
  ["fireBarChart", "fireDonut"].forEach((id) => {
    document.getElementById(id).innerHTML = `<div class="chart-empty">${t("common.noData")}</div>`;
  });
  document.getElementById("fireDonutCaption").textContent = "";
  document.getElementById("fireTableBody").innerHTML =
    `<tr><td colspan="5" class="fire-table-empty">${t("common.noData")}</td></tr>`;
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
    const stale = fireDays.length ? " " + t("common.showingLast") : "";
    renderRetry(
      document.getElementById("fireSourceNote"),
      t("fire.unavailable", { reason: describeError(err) }) + stale,
      loadFireData,
    );
    return false;
  }
}

document.getElementById("fireExportBtn").addEventListener("click", () => {
  const week = fireDays.slice(-7);
  if (!week.length) return;
  const rows = [
    ["fire.csv.date", "fire.csv.fire", "fire.csv.tech", "fire.csv.all", "fire.csv.pump"].map((key) => t(key)),
    ...week.map((d) => [d.date, d.fire, d.tech ?? "", d.all ?? "", Number.isFinite(d.pump) ? Math.round(d.pump) : ""]),
  ];
  // BOM und Semikolon, damit Excel mit deutscher Einstellung Umlaute und Spalten richtig liest
  const csv = "\uFEFF" + rows.map((row) => row.join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${t("fire.csvFile")}-${week[week.length - 1].date}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

loadFireData();

// ---- Wasserpegel: aktuelle Wasserstände von PEGELONLINE (WSV) ----
const PEGEL_API = "https://www.pegelonline.wsv.de/webservices/rest-api/v2";
const WATER_DEFAULT_STATION = "47d3e815-c556-4e1b-93de-9fe07329fb00"; // Berlin-Köpenick
const WATER_STATION_KEY = "dashboard-water-station";
const WATER_STATE_LABELS = { low: t("water.state.low"), normal: t("water.state.normal"), high: t("water.state.high") };
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
    document.querySelectorAll(".ov-compare.water-combo").forEach((panel) => {
      fillWaterStationList(panel);
      paintBerlinStations(panel, panel._compareWaterId, (next) => loadWaterIntoPanel(panel, next));
    });
    return true;
  } catch (err) {
    reportError("Pegelliste", err);
    if (!waterStations.length) {
      renderRetry(list, t("water.listUnavailable", { reason: describeError(err) }), loadWaterStations, "chart-empty");
    }
    return false;
  }
}

function renderBerlinStations() {
  const list = document.getElementById("waterBerlinList");
  const berlin = waterStations.filter((s) => s.longname.startsWith("BERLIN"));
  if (!berlin.length) {
    list.innerHTML = `<div class="chart-empty">${t("water.noBerlin")}</div>`;
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
    document.getElementById("waterLevelLabel").textContent = name;
    const dayAgo = current && measurementNear(measurements, new Date(current.timestamp) - 24 * 3600 * 1000);
    setStatDelta("waterLevelDelta", current && dayAgo ? formatDelta(current.value, dayAgo.value, " cm", t("delta.yesterday")) : null);

    document.getElementById("waterState").textContent = WATER_STATE_LABELS[current?.stateMnwMhw] || "–";
    setStatDelta(
      "waterStateDelta",
      chars.MW != null
        ? { main: t("water.mw", { value: Math.round(chars.MW) }), suffix: t("water.mwSuffix") }
        : { main: t("water.noChars") },
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
      ? t("time.clock", { time: ts.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" }) })
      : "–";
    setStatDelta(
      "waterTimeDelta",
      ts ? { main: ts.toLocaleDateString(LOCALE, { day: "2-digit", month: "2-digit" }), suffix: `· ${pegelName(station.water?.longname)}` } : null,
    );

    document.getElementById("waterChartTitle").textContent = t("water.chartTitle", { name });
    document.getElementById("waterChartSub").textContent = t("water.chartSub", { name });
    renderWaterChart(chartEl, measurements, chars);
    waterShownId = id;
    setLastUpdatedNow();
    return true;
  } catch (err) {
    reportError("Pegel", err);
    if (waterShownId === id) {
      document.getElementById("waterChartSub").textContent =
        t("water.notUpdated", { reason: describeError(err) }) + " " + t("common.showingLast");
    } else {
      renderRetry(chartEl, t("water.unavailable", { reason: describeError(err) }), () => loadWaterStation(id), "chart-empty");
    }
    return false;
  }
}

function renderWaterChart(el, measurements, chars, fillId = "waterFill") {
  if (!measurements.length) {
    el.innerHTML = `<div class="chart-empty">${t("water.noMeasurements")}</div>`;
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
  const hoverPoints = points.map((measurement, i) => ({
    x: coords[i][0],
    y: coords[i][1],
    label: new Date(measurement.timestamp).toLocaleString(LOCALE, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: `${Number(measurement.value).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} cm`,
  }));
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
    const label = day.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric" }).replace(".,", ",");
    xLabels.push(`<span style="left:${pct(xOf(day.getTime()), w)}">${label}</span>`);
  }

  el.setAttribute("role", "img");
  el.setAttribute(
    "aria-label",
    t("water.chartAria", {
      min: Math.round(Math.min(...points.map((m) => m.value))),
      max: Math.round(Math.max(...points.map((m) => m.value))),
    }),
  );
  el.innerHTML = `
    <div class="wave-plot">
      <div class="wave-y">${yLabels}</div>
      <div class="wave-area">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style="stop-color:var(--teal);stop-opacity:0.35"/>
              <stop offset="100%" style="stop-color:var(--teal);stop-opacity:0"/>
            </linearGradient>
          </defs>
          <path d="${area}" fill="url(#${fillId})" stroke="none"/>
          ${refLines}
          <path d="${line}" fill="none" style="stroke:var(--teal)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
          <line class="chart-hover-guide" x1="0" y1="0" x2="0" y2="${h}"/>
          <circle class="chart-hover-marker" cx="0" cy="0" r="4"/>
          <rect class="chart-hover-target" x="0" y="0" width="${w}" height="${h}" fill="transparent" pointer-events="all"/>
        </svg>
        ${refLabels}
        <div class="chart-hover-tooltip" aria-hidden="true"><span></span><strong></strong></div>
      </div>
      <div class="wave-x">${xLabels.join("")}</div>
    </div>`;
  el.querySelector(".wave-area svg").dataset.hoverPoints = JSON.stringify(hoverPoints);
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
    showToast(t(waterStations.length ? "water.notFound" : "water.listLoading"));
    return;
  }
  input.value = "";
  selectWaterStation(match.uuid);
});

loadWaterData();

// ---- Übersicht: frei zusammenstellbare Widgets ----
const OVERVIEW_STORAGE_KEY = "dashboard-overview-widgets";
const OVERVIEW_DEFAULT = ["weather-now", "fire-chart", "water-chart"];
const OVERVIEW_DEFAULT_LEGACY = [
  ["weather-now", "weather-kpis", "forecast-bars", "rain-donut", "temp-wave"],
  ["fire-yesterday", "water-level", "weather-now", "forecast-bars"],
  ["weather-now", "fire-chart", "water-chart", "water-berlin"],
];
const OVERVIEW_MIN_COL = 260;
const OVERVIEW_ROW = 280;
const OVERVIEW_MIN_COL_TIGHT = 160;
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
  fire: svgIcon('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.6-7.6.3 1.6 1.1 2.8 2.2 3.4.2-2.9 1.4-5.6 3.7-7.6.3 2.7 1.3 4.6 2.6 6.4 1 1.4.9 2.9.9 5.4 0 3.6-2.6 6.2-6.5 6.2z"/>'),
  table: svgIcon('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'),
};

// "mirror" zeigt eine laufend aktualisierte Kopie eines Widgets von einer anderen Seite
const OVERVIEW_WIDGETS = {
  "weather-now": {
    group: "weather",
    icon: OVERVIEW_ICONS.cloud,
    source: "#weatherPanel",
    compare: true,
    wide: true,
  },
  "weather-temp": {
    group: "weather",
    icon: OVERVIEW_ICONS.kpi,
    source: "#weatherTempCard",
  },
  "weather-wind": {
    group: "weather",
    icon: OVERVIEW_ICONS.kpi,
    source: "#weatherWindCard",
  },
  "weather-humidity": {
    group: "weather",
    icon: OVERVIEW_ICONS.kpi,
    source: "#weatherHumidityCard",
  },
  "weather-rain": {
    group: "weather",
    icon: OVERVIEW_ICONS.kpi,
    source: "#weatherRainCard",
  },
  "forecast-bars": {
    group: "weather",
    icon: OVERVIEW_ICONS.bars,
    source: "#weatherForecastPanel",
  },
  "rain-donut": {
    group: "weather",
    icon: OVERVIEW_ICONS.donut,
    source: "#weatherRainPanel",
  },
  "temp-wave": {
    group: "weather",
    icon: OVERVIEW_ICONS.wave,
    source: "#weatherWavePanel",
    wide: true,
  },
  radar: {
    group: "weather",
    icon: OVERVIEW_ICONS.radar,
    mount: mountRadarWidget,
    hideOn: ["#radarPanel"],
    compact: "ov-compact-radar",
  },
  calendar: {
    group: "calendar",
    icon: OVERVIEW_ICONS.calendar,
    mount: mountCalendarWidget,
    wide: true,
  },
  "calendar-today": {
    group: "calendar",
    icon: OVERVIEW_ICONS.calendar,
    mount: mountCalendarTodayWidget,
  },
  notes: {
    group: "calendar",
    icon: OVERVIEW_ICONS.notes,
    mount: mountNotesWidget,
    compact: "ov-compact-notes",
  },
  todo: {
    group: "calendar",
    icon: OVERVIEW_ICONS.todo,
    mount: mountTodoWidget,
  },
  countdown: {
    group: "calendar",
    icon: OVERVIEW_ICONS.calendar,
    mount: mountCountdownWidget,
  },
  clock: {
    group: "calendar",
    icon: OVERVIEW_ICONS.clock,
    mount: mountClockWidget,
  },
  warnings: {
    group: "safety",
    icon: OVERVIEW_ICONS.warning,
    mount: mountWarningsWidget,
  },
  "banner-config": {
    group: "safety",
    icon: OVERVIEW_ICONS.warning,
    source: "#bannerConfigPanel",
  },
  checklist: {
    group: "safety",
    icon: OVERVIEW_ICONS.todo,
    mount: mountChecklistWidget,
  },
  emergencynumbers: {
    group: "safety",
    icon: OVERVIEW_ICONS.phone,
    mount: mountEmergencyNumbersWidget,
  },
  "fire-yesterday": {
    group: "fire",
    icon: OVERVIEW_ICONS.fire,
    source: "#fireYesterdayCard",
  },
  "fire-total": {
    group: "fire",
    icon: OVERVIEW_ICONS.fire,
    source: "#fireTotalCard",
  },
  "fire-avg": {
    group: "fire",
    icon: OVERVIEW_ICONS.calendar,
    source: "#fireAvgCard",
  },
  "fire-peak": {
    group: "fire",
    icon: OVERVIEW_ICONS.bars,
    source: "#firePeakCard",
  },
  "fire-response": {
    group: "fire",
    icon: OVERVIEW_ICONS.clock,
    source: "#fireResponseCard",
  },
  "fire-chart": {
    group: "fire",
    icon: OVERVIEW_ICONS.bars,
    source: "#fireChartPanel",
    wide: true,
  },
  "fire-share": {
    group: "fire",
    icon: OVERVIEW_ICONS.donut,
    source: "#fireSharePanel",
  },
  "fire-table": {
    group: "fire",
    icon: OVERVIEW_ICONS.table,
    source: "#fireTablePanel",
    wide: true,
  },
  "water-level": {
    group: "water",
    icon: OVERVIEW_ICONS.wave,
    source: "#waterLevelCard",
  },
  "water-state": {
    group: "water",
    icon: OVERVIEW_ICONS.bars,
    source: "#waterStateCard",
  },
  "water-range": {
    group: "water",
    icon: OVERVIEW_ICONS.wave,
    source: "#waterRangeCard",
  },
  "water-time": {
    group: "water",
    icon: OVERVIEW_ICONS.clock,
    source: "#waterTimeCard",
  },
  "water-chart": {
    group: "water",
    icon: OVERVIEW_ICONS.wave,
    source: "#waterChartPanel",
    compare: true,
    wide: true,
  },
  "water-berlin": {
    group: "water",
    icon: OVERVIEW_ICONS.wave,
    mirror: ["#waterBerlinPanel .panel-sub", "#waterBerlinList"],
    wide: true,
  },
};

function mirrorMembers(src) {
  if (!src.classList.contains("stat-row") || !src._defaultOrder) return null;
  return [...layoutItems(src, true), ...src._defaultOrder.filter((el) => el.parentElement !== src)];
}

function mountRadarWidget(body) {
  renderInto(body, `<div class="ov-map"></div><div class="warn-note ov-map-note">${t("radar.widgetLoading")}</div>`);
  const mapEl = body.querySelector(".ov-map");
  const note = body.querySelector(".ov-map-note");
  if (!LEAFLET_AVAILABLE) {
    mapEl.remove();
    note.textContent = t("map.unavailable");
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
      note.textContent = t("radar.widgetNote", { time: t("time.clock", { time: formatFrameTime(frame.time) }) });
    } catch (err) {
      reportError("Radar-Widget", err);
      const stale = layer ? " " + t("common.showingLast") : "";
      renderRetry(note, t("radar.widgetUnavailable", { reason: describeError(err) }) + stale, load);
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
      `<div class="ov-date">${now.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" })}</div>
      <div class="ov-events"></div>`,
    );
    const list = body.querySelector(".ov-events");
    if (!events.length) {
      list.innerHTML = `<div class="todo-empty">${t("cal.todayEmpty")}</div>`;
      return;
    }
    events.forEach((ev) => {
      const row = document.createElement("div");
      row.className = "ov-event";
      row.innerHTML = '<span class="ov-event-time"></span><span class="ov-event-text"></span>';
      row.querySelector(".ov-event-time").textContent = ev.allDay ? t("cal.allDayLower") : t("time.clock", { time: ev.time });
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

function widgetEl(root, baseId) {
  if (!root) return document.getElementById(baseId);
  if (root.id === baseId) return root;
  try {
    const exact = root.querySelector("#" + CSS.escape(baseId));
    if (exact) return exact;
  } catch (err) {}
  const prefix = baseId + "--";
  return [...root.querySelectorAll("[id]")].find((el) => el.id.startsWith(prefix)) || null;
}

function bindHourStrip(root) {
  const hours = widgetEl(root, "dayDetailHours");
  const prev = widgetEl(root, "hourScrollPrev");
  const next = widgetEl(root, "hourScrollNext");
  if (!hours || !prev || !next) return () => {};
  const update = () => {
    prev.disabled = hours.scrollLeft <= 2;
    next.disabled = hours.scrollLeft + hours.clientWidth >= hours.scrollWidth - 2;
  };
  prev.addEventListener("click", () => hours.scrollBy({ left: -hours.clientWidth * 0.8 }));
  next.addEventListener("click", () => hours.scrollBy({ left: hours.clientWidth * 0.8 }));
  hours.addEventListener("scroll", update);
  const resize = new ResizeObserver(update);
  resize.observe(hours);
  update();
  return () => resize.disconnect();
}

function paintTimezoneNote(root, data, label) {
  const tzEl = widgetEl(root, "weatherTzNote");
  if (!tzEl) return "";
  const browserOffset = -new Date().getTimezoneOffset() * 60;
  if (typeof data.utc_offset_seconds !== "number" || data.utc_offset_seconds === browserOffset) {
    tzEl.hidden = true;
    return "";
  }
  const place = label.split(",")[0];
  tzEl.textContent = t("weather.tzNote", { place, offset: formatUtcOffset(data.utc_offset_seconds) });
  tzEl.hidden = false;
  return t("weather.tzShort", { place });
}

function paintWeatherDayDetail(root, data, index, tzShort) {
  const forecastEl = widgetEl(root, "weatherForecast");
  forecastEl?.querySelectorAll(".day").forEach((el, i) => el.classList.toggle("selected", i === index));
  const d = data.daily;
  const dateStr = d.time[index];
  const dateLabel = new Date(dateStr + "T00:00:00").toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const titleEl = widgetEl(root, "dayDetailTitle");
  if (titleEl) titleEl.textContent = dateLabel;
  const hourly = data.hourly;
  const hourIdxForDay = hourly.time.map((t, i) => (t.startsWith(dateStr) ? i : -1)).filter((i) => i >= 0);
  const rainHours = hourIdxForDay.filter((i) => hourly.precipitation_probability[i] >= 30);
  let rainSummary;
  if (!rainHours.length) rainSummary = t("weather.noRain");
  else {
    const first = formatHour(hourly.time[rainHours[0]]);
    const last = formatHour(hourly.time[rainHours[rainHours.length - 1]]);
    const maxPop = Math.max(...rainHours.map((i) => hourly.precipitation_probability[i]));
    rainSummary =
      rainHours.length === 1
        ? t("weather.rainAt", { time: first, pop: maxPop })
        : t("weather.rainBetween", { from: first, to: last, pop: maxPop });
  }
  const rainEl = widgetEl(root, "dayDetailRain");
  if (rainEl) rainEl.textContent = rainSummary;
  const hoursEl = widgetEl(root, "dayDetailHours");
  if (hoursEl) {
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
  }
  widgetEl(root, "dayDetail")?.classList.add("show");
  const statsEl = widgetEl(root, "weatherStats");
  if (!statsEl) return;
  if (index === 0) {
    const c = data.current;
    const sunrise = new Date(d.sunrise[0]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(d.sunset[0]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    statsEl.innerHTML =
      statChip(iconPressure, t("weather.chip.pressure"), `${Math.round(c.surface_pressure)} hPa`) +
      statChip(iconHumidity, t("weather.chip.humidity"), `${c.relative_humidity_2m} %`) +
      statChip(iconWind, t("weather.chip.wind"), `${Math.round(c.wind_speed_10m)} km/h`) +
      statChip(iconFeels, t("weather.chip.feels"), `${Math.round(c.apparent_temperature)}°`) +
      statChip(iconUv, t("weather.chip.uv"), `${Math.round(d.uv_index_max[0])}`) +
      statChip(iconSun, t("weather.chip.sun"), `${sunrise} – ${sunset}`);
  } else {
    const avgPressure = Math.round(
      hourIdxForDay.reduce((s, i) => s + hourly.surface_pressure[i], 0) / hourIdxForDay.length,
    );
    const avgHumidity = Math.round(
      hourIdxForDay.reduce((s, i) => s + hourly.relative_humidity_2m[i], 0) / hourIdxForDay.length,
    );
    const sunrise = new Date(d.sunrise[index]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    const sunset = new Date(d.sunset[index]).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
    statsEl.innerHTML =
      statChip(iconPressure, t("weather.chip.pressureAvg"), `${avgPressure} hPa`) +
      statChip(iconHumidity, t("weather.chip.humidityAvg"), `${avgHumidity} %`) +
      statChip(iconWind, t("weather.chip.windMax"), `${Math.round(d.wind_speed_10m_max[index])} km/h`) +
      statChip(iconUv, t("weather.chip.uv"), `${Math.round(d.uv_index_max[index])}`) +
      statChip(iconSun, t("weather.chip.sun"), `${sunrise} – ${sunset}`);
  }
}

function paintWeatherNow(root, data, label) {
  const tzShort = paintTimezoneNote(root, data, label);
  const placeEl = widgetEl(root, "weatherPlaceName");
  if (placeEl) placeEl.textContent = label;
  const cur = weatherCodeInfo(data.current.weather_code);
  const tempEl = widgetEl(root, "weatherTempNow");
  if (tempEl) tempEl.textContent = `${Math.round(data.current.temperature_2m)}°`;
  const condEl = widgetEl(root, "weatherConditionText");
  if (condEl) condEl.textContent = cur.text;
  const iconEl = widgetEl(root, "weatherIcon");
  if (iconEl) iconEl.innerHTML = weatherIcons[cur.icon];
  const hi = Math.round(data.daily.temperature_2m_max[0]);
  const lo = Math.round(data.daily.temperature_2m_min[0]);
  const pop = data.daily.precipitation_probability_max[0];
  const rangeEl = widgetEl(root, "weatherRange");
  if (rangeEl) rangeEl.textContent = t("weather.range", { lo, hi, pop: pop ?? 0 });
  const forecastEl = widgetEl(root, "weatherForecast");
  if (forecastEl) {
    forecastEl.innerHTML = "";
    data.daily.time.forEach((dateStr, i) => {
      const d = new Date(dateStr + "T00:00:00");
      const info = weatherCodeInfo(data.daily.weather_code[i]);
      const isToday = i === 0;
      const dayEl = document.createElement("div");
      dayEl.className = "day" + (isToday ? " today" : "");
      dayEl.title = `${isToday ? t("common.todayCap") : weekdayShort(d)} · ${info.text} · ${Math.round(data.daily.temperature_2m_max[i])}° / ${Math.round(data.daily.temperature_2m_min[i])}°`;
      dayEl.innerHTML = `
        <div class="day-label">${isToday ? t("common.todayCap") : weekdayShort(d)}</div>
        <svg class="day-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:20px;height:20px;">${weatherIcons[info.icon]}</svg>
        <div class="day-high">${Math.round(data.daily.temperature_2m_max[i])}°</div>
        <div class="day-low">${Math.round(data.daily.temperature_2m_min[i])}°</div>
      `;
      dayEl.addEventListener("click", () => paintWeatherDayDetail(root, data, i, tzShort));
      forecastEl.appendChild(dayEl);
    });
  }
  paintWeatherDayDetail(root, data, 0, tzShort);
  const note = widgetEl(root, "weatherSourceNote");
  if (note) note.textContent = t("weather.source");
}

async function loadWeatherIntoPanel(panel, lat, lon, label) {
  const loading = widgetEl(panel, "weatherLoading");
  if (loading) loading.textContent = t("weather.loadingFor", { place: label });
  try {
    const data = await fetchData(weatherForecastUrl(lat, lon), { source: "Wetter" });
    if (!data.current || !(data.daily?.time?.length > 1)) throw dataError("Wetter", "unvollständige Wetterdaten");
    splitOffYesterday(data);
    panel._compareWeather = { lat, lon, label, data };
    paintWeatherNow(panel, data, label);
    if (loading) loading.textContent = "";
    requestAnimationFrame(() => fitAllWidgetGrids());
    return true;
  } catch (err) {
    reportError("Wetter", err);
    if (loading) {
      renderRetry(loading, t("weather.unavailable", { place: label, reason: describeError(err) }), () =>
        loadWeatherIntoPanel(panel, lat, lon, label),
      );
    }
    return false;
  }
}

async function searchWeatherIntoPanel(panel, query) {
  const loading = widgetEl(panel, "weatherLoading");
  if (!query.trim()) return;
  if (loading) loading.textContent = t("search.searching", { query: query.trim() });
  try {
    const data = await fetchData(geocodeUrl(query), { source: "Ortssuche" });
    const hit = data.results?.[0];
    if (!hit) {
      if (loading) loading.textContent = t("search.notFound", { query: query.trim() });
      return;
    }
    const label = [hit.name, hit.country].filter(Boolean).join(", ");
    return loadWeatherIntoPanel(panel, hit.latitude, hit.longitude, label);
  } catch (err) {
    reportError("Ortssuche", err);
    if (loading) {
      renderRetry(loading, t("search.failed", { reason: describeError(err) }) + ".", () =>
        searchWeatherIntoPanel(panel, query),
      );
    }
  }
}

function bindCompareWeather(panel) {
  const stopHours = bindHourStrip(panel);
  const form = widgetEl(panel, "weatherSearchForm");
  const input = widgetEl(panel, "weatherSearchInput");
  const onSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    searchWeatherIntoPanel(panel, input?.value || "");
  };
  form?.addEventListener("submit", onSubmit);
  const coords = currentWeatherCoords || DEFAULT_PLACE;
  loadWeatherIntoPanel(panel, coords.lat, coords.lon, coords.label);
  const onRefresh = () => {
    const saved = panel._compareWeather;
    if (saved) loadWeatherIntoPanel(panel, saved.lat, saved.lon, saved.label);
  };
  document.addEventListener("dashboard-refresh", onRefresh);
  return () => {
    stopHours();
    form?.removeEventListener("submit", onSubmit);
    document.removeEventListener("dashboard-refresh", onRefresh);
  };
}

function paintBerlinStations(root, selectedId, onSelect) {
  const list = widgetEl(root, "waterBerlinList");
  if (!list) return;
  const berlin = waterStations.filter((s) => s.longname.startsWith("BERLIN"));
  if (!berlin.length) {
    list.innerHTML = `<div class="chart-empty">${t("water.noBerlin")}</div>`;
    return;
  }
  list.replaceChildren(
    ...berlin.map((s) => {
      const m = waterLevelOf(s);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "water-item" + (s.uuid === selectedId ? " selected" : "");
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
      btn.addEventListener("click", () => onSelect(s.uuid));
      return btn;
    }),
  );
}

function fillWaterStationList(root) {
  const datalist = widgetEl(root, "waterStationList");
  if (!datalist) return;
  datalist.replaceChildren(
    ...waterStations.map((s) => {
      const opt = document.createElement("option");
      opt.value = pegelLabel(s);
      return opt;
    }),
  );
}

async function loadWaterIntoPanel(panel, id) {
  const chartEl = widgetEl(panel, "waterChart");
  try {
    const [station, series, measurements] = await Promise.all([
      fetchPegel(`/stations/${id}.json`),
      fetchPegel(`/stations/${id}/W.json?includeCharacteristicValues=true&includeCurrentMeasurement=true`),
      fetchPegel(`/stations/${id}/W/measurements.json?start=P7D`),
    ]);
    const name = pegelName(station.longname);
    const chars = Object.fromEntries((series.characteristicValues || []).map((c) => [c.shortname, c.value]));
    panel._compareWaterId = id;
    const title = widgetEl(panel, "waterChartTitle");
    const sub = widgetEl(panel, "waterChartSub");
    if (title) title.textContent = t("water.chartTitle", { name });
    if (sub) sub.textContent = t("water.chartSub", { name });
    if (chartEl) renderWaterChart(chartEl, measurements, chars, `waterFill--${panel.id}`);
    paintBerlinStations(panel, id, (next) => loadWaterIntoPanel(panel, next));
    return true;
  } catch (err) {
    reportError("Pegel", err);
    if (chartEl) {
      renderRetry(chartEl, t("water.unavailable", { reason: describeError(err) }), () => loadWaterIntoPanel(panel, id), "chart-empty");
    }
    return false;
  }
}

function bindCompareWater(panel) {
  const form = widgetEl(panel, "waterSearchForm");
  const input = widgetEl(panel, "waterSearchInput");
  const onSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const q = (input?.value || "").trim().toLowerCase();
    if (!q) return;
    const match =
      waterStations.find((s) => pegelLabel(s).toLowerCase() === q) ||
      waterStations.find((s) => s.longname.toLowerCase().includes(q)) ||
      waterStations.find((s) => pegelLabel(s).toLowerCase().includes(q));
    if (!match) {
      showToast(t(waterStations.length ? "water.notFound" : "water.listLoading"));
      return;
    }
    if (input) input.value = "";
    loadWaterIntoPanel(panel, match.uuid);
  };
  form?.addEventListener("submit", onSubmit);
  const syncList = () => {
    fillWaterStationList(panel);
    paintBerlinStations(panel, panel._compareWaterId, (next) => loadWaterIntoPanel(panel, next));
  };
  if (waterStations.length) syncList();
  const startId = panel._compareWaterId || waterStationId;
  loadWaterIntoPanel(panel, startId);
  const onRefresh = () => {
    if (waterStations.length) syncList();
    if (panel._compareWaterId) loadWaterIntoPanel(panel, panel._compareWaterId);
  };
  document.addEventListener("dashboard-refresh", onRefresh);
  return () => {
    form?.removeEventListener("submit", onSubmit);
    document.removeEventListener("dashboard-refresh", onRefresh);
  };
}

function bindIndependentWidget(panel, type) {
  if (type === "weather-now") return bindCompareWeather(panel);
  if (type === "water-chart") return bindCompareWater(panel);
  return () => {};
}

// Jede Seite hat ein eigenes Widget-Raster; die Übersicht ist eines davon
const PAGE_WIDGETS_STORAGE_PREFIX = "dashboard-page-widgets-";
const widgetBoards = new Map();

function sameTypeList(a, b) {
  return Array.isArray(a) && a.length === b.length && a.every((type, i) => type === b[i]);
}

const BOARD_TYPE_EXPAND = {
  "weather-kpis": ["weather-temp", "weather-wind", "weather-humidity", "weather-rain"],
  "fire-kpis": ["fire-yesterday", "fire-total", "fire-avg", "fire-peak", "fire-response"],
  "water-kpis": ["water-level", "water-state", "water-range", "water-time"],
};

const INSTANCE_SEP = "::";

function widgetTypeOf(key) {
  return String(key || "").split(INSTANCE_SEP)[0];
}

function widgetInstanceOf(key) {
  const n = Number(String(key || "").split(INSTANCE_SEP)[1]);
  return Number.isFinite(n) && n >= 2 ? n : 1;
}

function widgetKey(type, n) {
  return n > 1 ? `${type}${INSTANCE_SEP}${n}` : type;
}

function nextInstanceKey(board, type) {
  const used = new Set(board.types.filter((key) => widgetTypeOf(key) === type).map(widgetInstanceOf));
  let n = 1;
  while (used.has(n)) n += 1;
  return widgetKey(type, n);
}

function boardPanelId(board, key) {
  const type = widgetTypeOf(key);
  const n = widgetInstanceOf(key);
  return n > 1 ? `${board.prefix}-${type}--i${n}` : `${board.prefix}-${type}`;
}

function widgetCount(board, type) {
  return board.types.filter((key) => widgetTypeOf(key) === type).length;
}

function knownBoardType(key) {
  const type = widgetTypeOf(key);
  return Boolean(OVERVIEW_WIDGETS[type] || BOARD_TYPE_EXPAND[type]);
}

function expandBoardTypes(types) {
  const out = [];
  (Array.isArray(types) ? types : []).forEach((key) => {
    const type = widgetTypeOf(key);
    const n = widgetInstanceOf(key);
    (BOARD_TYPE_EXPAND[type] || [type]).forEach((part) => {
      if (!OVERVIEW_WIDGETS[part]) return;
      const expanded = widgetKey(part, n);
      if (!out.includes(expanded)) out.push(expanded);
    });
  });
  return out;
}

function loadBoardTypes(board, defaults) {
  try {
    const raw = localStorage.getItem(board.storageKey);
    if (raw) {
      const parsed = JSON.parse(raw).filter(knownBoardType);
      if (
        board.storageKey === OVERVIEW_STORAGE_KEY &&
        (parsed.length === 0 || OVERVIEW_DEFAULT_LEGACY.some((legacy) => sameTypeList(parsed, legacy)))
      ) {
        return [...defaults];
      }
      return expandBoardTypes(parsed);
    }
  } catch (err) {}
  return [...defaults];
}

function saveBoardTypes(board) {
  storageSet(board.storageKey, JSON.stringify(board.types));
}

function createWidgetBoard(page, grid, { prefix, storageKey, defaults = [], emptyEl = null }) {
  const board = { page, grid, prefix, storageKey, defaults: [...defaults], emptyEl, cleanups: new Map() };
  board.types = loadBoardTypes(board, board.defaults);
  widgetBoards.set(page.id, board);
  return board;
}

// Ein Spiegel-Widget der eigenen Seite würde nur doppelt anzeigen, was dort schon steht
function boardOffersWidget(board, type, def) {
  if (def.compare) return true;
  const sources = [def.source, ...(def.mirror || []), ...(def.hideOn || [])].filter(Boolean);
  return !sources.some((sel) => {
    const el = document.querySelector(sel);
    return el && board.page.contains(el);
  });
}

function widgetApi(board) {
  return {
    t,
    setupToggle,
    loadLayoutSizes,
    applySavedSize,
    onRemove: (key) => removeBoardWidget(board, key),
    bindIndependent: (panel, type) => bindIndependentWidget(panel, type),
  };
}

function shouldMountIndependent(board, key, def) {
  if (!def.source || !def.compare) return false;
  if (widgetInstanceOf(key) > 1) return true;
  const src = document.querySelector(def.source);
  return Boolean(src && board.page.contains(src));
}

function mountBoardWidget(board, key) {
  const type = widgetTypeOf(key);
  const def = OVERVIEW_WIDGETS[type];
  const options = { key, panelId: boardPanelId(board, key), independent: shouldMountIndependent(board, key, def) };
  let cleanup = null;
  try {
    if (def.source) {
      cleanup = DashboardWidgets.mountClonedSource(board, type, def, widgetApi(board), options);
    } else {
      const panel = DashboardWidgets.createShell(board, type, def, widgetApi(board), options);
      const body = panel.querySelector(".ov-body");
      cleanup = def.mirror
        ? DashboardWidgets.mountFragmentMirror(body, def.mirror, options.panelId, mirrorMembers)
        : def.mount(body);
    }
  } catch (err) {
    console.error(`[Dashboard] Widget "${type}" konnte nicht gestartet werden:`, err);
    const panel = document.getElementById(options.panelId);
    const body = panel?.querySelector(".ov-body") || panel;
    if (body) renderRetry(body, t("widget.failed"), null, "chart-empty");
  }
  board.cleanups.set(key, typeof cleanup === "function" ? cleanup : null);
}

function addBoardWidget(board, catalogType) {
  const type = widgetTypeOf(catalogType);
  if (!OVERVIEW_WIDGETS[type]) return;
  const key = nextInstanceKey(board, type);
  board.types.push(key);
  saveBoardTypes(board);
  mountBoardWidget(board, key);
  const panel = document.getElementById(boardPanelId(board, key));
  const dest = pickerInsert;
  if (panel && dest && dest === board.grid) {
    const slot = dest.querySelector(":scope > .widget-slot");
    if (slot) slot.before(panel);
  }
  afterBoardChange(board);
  saveLayoutOrder(board.grid);
}

function unmountBoardWidget(board, key) {
  const cleanup = board.cleanups.get(key);
  if (cleanup) cleanup();
  board.cleanups.delete(key);
  const id = boardPanelId(board, key);
  document.getElementById(id)?.remove();
  storeCollapsed(id, false);
  saveLayoutSize(id, null);
  saveWidgetPlace(id, null);
}

function removeBoardWidget(board, key) {
  board.types = board.types.filter((item) => item !== key);
  saveBoardTypes(board);
  unmountBoardWidget(board, key);
  afterBoardChange(board);
  saveLayoutOrder(board.grid);
}

function restoreBoardDefaults(board) {
  [...board.types].forEach((type) => unmountBoardWidget(board, type));
  board.types = [...board.defaults];
  saveBoardTypes(board);
  board.types.forEach((type) => mountBoardWidget(board, type));
  afterBoardChange(board);
  saveLayoutOrder(board.grid);
}

function afterBoardChange(board) {
  if (board.emptyEl) {
    board.emptyEl.hidden = board.types.length > 0;
    board.grid.hidden = board.types.length === 0;
  } else {
    board.grid.hidden = false;
  }
  refreshLayoutHandles();
  fitWidgetGrid(board.grid);
  if (board.page.classList.contains("active")) keepTilesInView(board.page);
  if (pickerOverlay.classList.contains("show") && pickerBoard === board) renderWidgetPicker();
}

// Zeilen, in denen alles eingeklappt ist, bekommen nur ihre Titelhöhe
function fitWidgetGrid(grid) {
  if (!grid || !grid.offsetParent) return;
  const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
  const width = grid.clientWidth;
  const items = layoutItems(grid);
  const slots = [...grid.querySelectorAll(":scope > .widget-slot")];
  const slot = slots.shift() || null;
  slots.forEach((el) => el.remove());

  // Mobil scrollt die Seite: feste Kachelhöhe, breite Widgets über die ganze Breite
  if (MOBILE_SCROLL_QUERY.matches) {
    if (slot) slot.remove();
    const mobileCols = width >= 2 * OVERVIEW_MIN_COL_TIGHT + gap ? 2 : 1;
    const mobileRows = packOverviewRows(items, mobileCols, 2);
    grid._layoutRows = mobileRows;
    grid.classList.remove("ov-overfull");
    grid.style.display = "";
    grid.style.gridTemplateColumns = `repeat(${mobileCols}, minmax(0, 1fr))`;
    grid.style.justifyContent = "";
    mobileRows.forEach((row) =>
      row.forEach(({ el, span }) => {
        el.style.gridColumn = span > 1 ? `span ${span}` : "";
        el.style.gridRow = "";
      }),
    );
    grid.style.gridTemplateRows = mobileRows
      .map((row) => (isOpenRow(row) ? "max-content" : "auto"))
      .join(" ");
    return;
  }

  grid.classList.remove("ov-overfull");
  grid.style.display = "flex";
  grid.style.flexWrap = "wrap";
  grid.style.justifyContent = "flex-start";
  grid.style.alignContent = "start";
  grid.style.alignItems = "start";
  grid.style.gridTemplateColumns = "";
  grid.style.gridTemplateRows = "";
  items.forEach((el) => {
    el.style.gridColumn = "";
    el.style.gridRow = "";
  });
  const page = grid.closest(".page");
  if (page) {
    const next = slot || makeWidgetSlot(page);
    grid.appendChild(next);
  }
}
function isOpenRow(row) {
  return row.some(({ el }) => !el.classList.contains("collapsed"));
}
function fitAllWidgetGrids() {
  document.querySelectorAll(".ov-widget .widget-slot, .ov-body .widget-slot").forEach((el) => el.remove());
  widgetBoards.forEach((board) => {
    fitWidgetGrid(board.grid);
    if (board.page.classList.contains("active")) keepTilesInView(board.page);
  });
}

// Verteilt die Kacheln zeilenweise. Freie Spalten bleiben frei (Platzhalter),
// statt die vorhandenen Widgets zu strecken.
function packOverviewRows(items, cols, minColsForWide = 3) {
  const rows = [];
  let row = [];
  let used = 0;
  const closeRow = () => {
    if (!row.length) return;
    rows.push(row);
    row = [];
    used = 0;
  };
  items.forEach((el) => {
    const frac = Number(el.dataset.colFrac) || 0;
    const custom = frac ? Math.max(1, Math.round(frac * cols)) : 0;
    const span = Math.min(
      cols,
      custom ||
        (el.classList.contains("ov-full") ? cols : 0) ||
        (el.classList.contains("ov-wide") && cols >= minColsForWide ? 2 : 1),
    );
    if (used + span > cols) closeRow();
    row.push({ el, span, fixed: custom > 0 });
    used += span;
  });
  closeRow();
  return rows;
}

function makeWidgetSlot(page) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "widget-slot";
  btn.setAttribute("data-layout-fixed", "");
  btn.setAttribute("data-i18n-attr", "aria-label=layout.addSlot");
  btn.setAttribute("aria-label", t("layout.addSlot"));
  btn.innerHTML = `<span class="widget-slot-plus" aria-hidden="true">+</span><span class="widget-slot-label" data-i18n="layout.addSlot">${t("layout.addSlot")}</span>`;
  btn.addEventListener("click", () => {
    const board = widgetBoards.get(page.id);
    if (board) openWidgetPicker(board, btn.parentElement);
  });
  return btn;
}

// ---- Widget-Auswahl: jedes Klicken fügt eine weitere Kachel hinzu ----
const pickerOverlay = document.getElementById("widgetPickerOverlay");
const pickerBody = document.getElementById("widgetPickerBody");
let pickerBoard = null;
let pickerInsert = null;

function renderWidgetPicker() {
  const offered = Object.entries(OVERVIEW_WIDGETS).filter(([type, d]) => boardOffersWidget(pickerBoard, type, d));
  const groups = [...new Set(offered.map(([, d]) => d.group))];
  pickerBody.innerHTML = groups
    .map(
      (group) => `<div class="widget-picker-group">
      <div class="widget-picker-group-title">${t(`groups.${group}`)}</div>
      <div class="widget-picker-grid">
        ${offered
          .filter(([, d]) => d.group === group)
          .map(([type, d]) => {
            const count = widgetCount(pickerBoard, type);
            return `<button type="button" class="widget-option${count ? " added" : ""}" data-widget="${type}">
              <span class="widget-option-icon">${d.icon}</span>
              <span class="widget-option-text">
                <span class="widget-option-title">${t(`widget.${type}.title`)}</span>
                <span class="widget-option-desc">${t(`widget.${type}.desc`)}</span>
              </span>
              <span class="widget-option-state" aria-hidden="true">+</span>
              ${count ? `<span class="widget-option-count">${count}</span>` : ""}
            </button>`;
          })
          .join("")}
      </div>
    </div>`,
    )
    .join("");
}
function openWidgetPicker(board, insertContainer) {
  pickerBoard = board;
  pickerInsert = insertContainer && insertContainer.classList.contains("overview-grid") ? insertContainer : board.grid;
  renderWidgetPicker();
  pickerOverlay.classList.add("show");
  pickerBody.querySelector(".widget-option")?.focus();
}
function closeWidgetPicker() {
  pickerOverlay.classList.remove("show");
  pickerInsert = null;
}
pickerBody.addEventListener("click", (e) => {
  const option = e.target.closest(".widget-option");
  if (!option) return;
  const type = option.dataset.widget;
  addBoardWidget(pickerBoard, type);
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
  if (legacy && OVERVIEW_WIDGETS[legacy] && !overviewBoard.types.some((key) => widgetTypeOf(key) === legacy))
    overviewBoard.types.push(legacy);
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
    const container = roamContainers(board.page).find(
      (c) => c !== board.grid && layoutContainerKey(c) === places[panel.id],
    );
    if (!container) return;
    container.appendChild(panel);
    if (sizes[panel.id]) applySavedSize(panel, sizes[panel.id]);
    touched.add(container);
  });
  touched.forEach(applySavedLayoutOrder);
}

widgetBoards.forEach((board) => {
  saveBoardTypes(board);
  board.types.forEach((type) => mountBoardWidget(board, type));
  applySavedLayoutOrder(board.grid);
  if (board !== overviewBoard) placeRoamingWidgets(board);
  if (board.emptyEl) {
    board.emptyEl.hidden = board.types.length > 0;
    board.grid.hidden = board.types.length === 0;
  } else {
    board.grid.hidden = false;
  }
  new ResizeObserver(() => fitWidgetGrid(board.grid)).observe(board.grid);
});
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
  if (board) restoreBoardDefaults(board);
  resetLayoutOrderAndSizes(page);
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
  const title = page.querySelector(".overview-title")?.textContent.trim() || t("reset.thisPage");
  document.getElementById("resetConfirmText").textContent = t(
    page === overviewBoard.page ? "reset.textOverview" : "reset.textPage",
    { title },
  );
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
  showToast(t(page === overviewBoard.page ? "reset.doneOverview" : "reset.donePage"));
});
document.getElementById("resetConfirmCancel").addEventListener("click", closeResetConfirm);
document.getElementById("resetConfirmClose").addEventListener("click", closeResetConfirm);
resetOverlay.addEventListener("click", (e) => {
  if (e.target === resetOverlay) closeResetConfirm();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && resetOverlay.classList.contains("show")) closeResetConfirm();
});
