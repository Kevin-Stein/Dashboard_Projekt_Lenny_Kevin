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
  calendar: {
    id: "calendar",
    label: "Kalender",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    </svg><span>Kalender</span>`,
    target: "calendarPage",
    widgets: ["notes"],
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
    });

    navContainer.appendChild(btn);
  });
}

// ---- Toast-Nachrichten ----
const toast = document.getElementById("toast");
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
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
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {}
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

setupToggle(document.querySelector("section.panel.weather"), document.getElementById("weatherToggle"));
setupToggle(document.querySelector("section.panel.calendar"), document.getElementById("calToggle"));
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
  try {
    localStorage.setItem("dashboard-theme", v);
  } catch (err) {}
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

async function refreshDashboardData() {
  refreshBtn.disabled = true;
  refreshIcon.classList.add("spinning");
  try {
    await Promise.all([
      loadWeatherForPlace(currentWeatherCoords.lat, currentWeatherCoords.lon, currentWeatherCoords.label),
      loadRadar(),
      loadDisasterWarnings(document.getElementById("disasterWarnSearchInput")?.value || ""),
      loadFireData(),
    ]);
    document.dispatchEvent(new Event("dashboard-refresh"));
  } finally {
    refreshIcon.classList.remove("spinning");
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", () => {
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
  try {
    localStorage.setItem("dashboard-auto-refresh", String(v));
  } catch (err) {}
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
    try {
      localStorage.setItem("dashboard-widget-todo", JSON.stringify(items));
    } catch (err) {}
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
      try {
        localStorage.setItem("dashboard-widget-notes", area.value);
        saved.textContent = "Gespeichert";
        setTimeout(() => {
          saved.textContent = "";
        }, 1500);
      } catch (err) {}
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
    try {
      localStorage.setItem("dashboard-widget-countdown", JSON.stringify(data));
    } catch (err) {}
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

  const sources = ["mowas", "katwarn", "biwapp", "dwd", "lhp"];
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
    listEl.innerHTML = "";
    try {
      const results = await Promise.allSettled(
        sources.map((s) => fetch(`https://warnung.bund.de/api31/${s}/mapData.json`).then((r) => r.json())),
      );
      let all = [];
      results.forEach((r) => {
        if (r.status === "fulfilled" && Array.isArray(r.value)) all = all.concat(r.value);
      });

      if (!all.length) {
        loadingEl.textContent = "Warnungen aktuell nicht abrufbar — direkt auf warnung.bund.de nachsehen.";
        return;
      }

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

      loadingEl.textContent = "";
      if (!all.length) {
        listEl.innerHTML = `<div class="warn-empty">Keine Warnungen${filterText ? ' für "' + filterText.trim() + '"' : ""} gefunden.</div>`;
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
      loadingEl.textContent = "Warnungen aktuell nicht abrufbar — direkt auf warnung.bund.de nachsehen.";
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
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checked));
  } catch (err) {}
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

const DISASTER_SOURCES = ["mowas", "katwarn", "biwapp", "dwd", "lhp"];
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
  listEl.innerHTML = "";
  try {
    const results = await Promise.allSettled(
      DISASTER_SOURCES.map((s) => fetch(`https://warnung.bund.de/api31/${s}/mapData.json`).then((r) => r.json())),
    );
    let all = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && Array.isArray(r.value)) all = all.concat(r.value);
    });
    if (!all.length) {
      loadingEl.textContent = "Warnungen aktuell nicht abrufbar — direkt auf warnung.bund.de nachsehen.";
      return;
    }
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
    loadingEl.textContent = "";
    if (!all.length) {
      listEl.innerHTML = `<div class="warn-empty">Keine Warnungen${filterText ? ' für "' + filterText.trim() + '"' : ""} gefunden.</div>`;
      return;
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
  } catch (err) {
    loadingEl.textContent = "Warnungen aktuell nicht abrufbar — direkt auf warnung.bund.de nachsehen.";
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
      try {
        localStorage.setItem("dashboard-meeting-point", input.value);
        saved.textContent = "Gespeichert";
        setTimeout(() => (saved.textContent = "\u00a0"), 1500);
        document.dispatchEvent(new Event("meeting-change"));
      } catch (err) {}
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
function layoutItems(container) {
  return [...container.children].filter((c) => !c.classList.contains("layout-handle") && !c.hasAttribute("data-layout-fixed"));
}

function saveLayoutOrder(container) {
  const order = layoutItems(container).map(layoutItemId).filter(Boolean);
  try {
    localStorage.setItem(LAYOUT_STORAGE_PREFIX + layoutContainerKey(container), JSON.stringify(order));
  } catch (err) {}
}
function applySavedLayoutOrder(container) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_PREFIX + layoutContainerKey(container)) || "null");
  } catch (err) {}
  if (!Array.isArray(saved)) return;
  const items = layoutItems(container);
  const known = saved.map((id) => items.find((el) => layoutItemId(el) === id)).filter(Boolean);
  const rest = items.filter((el) => !known.includes(el));
  [...known, ...rest].forEach((el) => container.appendChild(el));
}

function startLayoutDrag(e, item) {
  if (e.button !== 0) return;
  e.preventDefault();
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

function refreshLayoutHandles() {
  document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((container) => {
    const items = layoutItems(container);
    items.forEach((item) => {
      const existing = [...item.children].find((c) => c.classList.contains("layout-handle"));
      if (items.length < 2) {
        if (existing) existing.remove();
        delete item.dataset.layoutItem;
        return;
      }
      item.dataset.layoutItem = "";
      if (LAYOUT_GROUP_CLASSES.some((c) => item.classList.contains(c))) item.classList.add("layout-group");
      if (existing) return;
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "layout-handle";
      handle.setAttribute("aria-label", "Zum Verschieben ziehen");
      handle.title = "Zum Verschieben ziehen";
      handle.innerHTML = LAYOUT_HANDLE_SVG;
      handle.addEventListener("pointerdown", (e) => startLayoutDrag(e, item));
      item.prepend(handle);
    });
  });
}

function setLayoutEditing(editing) {
  document.body.classList.toggle("layout-editing", editing);
  document.getElementById("layoutEditToggle").setAttribute("aria-pressed", String(editing));
  document.getElementById("layoutEditLabel").textContent = editing ? "✓ Layout fertig" : "✥ Layout anpassen";
  const arrangeBtn = document.getElementById("overviewArrangeBtn");
  arrangeBtn.setAttribute("aria-pressed", String(editing));
  arrangeBtn.textContent = editing ? "✓ Fertig" : "✥ Anordnen";
}

function initLayout() {
  document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((container) => {
    const key = layoutContainerKey(container);
    layoutItems(container).forEach((child, i) => {
      if (!child.id && !child.dataset.layoutId) child.dataset.layoutId = `${key}#${i}`;
    });
    applySavedLayoutOrder(container);
  });
  refreshLayoutHandles();

  document.getElementById("layoutEditToggle").addEventListener("click", () => {
    setLayoutEditing(!document.body.classList.contains("layout-editing"));
  });
  document.getElementById("layoutResetBtn").addEventListener("click", () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(LAYOUT_STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch (err) {}
    location.reload();
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

function setRadarStatus(message, error = false) {
  mapLoading.textContent = message;
  mapLoading.classList.toggle("hidden", !message);
  mapLoading.setAttribute("role", error ? "alert" : "status");
}

async function loadRainViewer() {
  const epoch = ++radarEpoch;
  playback.hidden = false;
  radarDetailNote.textContent =
    "RainViewer: kostenlos bis Radar-Zoom 7. Bei höherem Kartenzoom wird das Radar vergrößert, nicht detaillierter.";
  setRadarStatus("Regendaten werden geladen …");
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) throw new Error("RainViewer HTTP " + res.status);
    const data = await res.json();
    const next = data.radar?.past || [];
    if (!next.length || !data.host?.startsWith("https://")) throw new Error("Keine Radarframes verfügbar");
    if (epoch !== radarEpoch || radarProvider.value !== "rainviewer") return;
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
  } catch (err) {
    if (epoch === radarEpoch) setRadarStatus("Regendaten konnten nicht geladen werden.", true);
  }
}

function loadOpenWeather() {
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
    if (radarProvider.value === "openweather" && !seen)
      setRadarStatus("OpenWeather-Kacheln nicht erreichbar. API-Key und Tarif prüfen.", true);
  });
  openWeatherLayer.addTo(map);
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
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding HTTP " + res.status);
    const data = await res.json();
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
    showToast("Ortssuche gerade nicht erreichbar");
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
      <div class="hour-time">${formatHour(hourly.time[i]).replace(" Uhr", "")}</div>
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
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wetter HTTP " + res.status);
    const data = await res.json();
    if (!data.current || !(data.daily?.time?.length > 1)) throw new Error("Unvollständige Wetterdaten");
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
  } catch (err) {
    weatherLoading.textContent = "Wetterdaten konnten nicht geladen werden.";
    if (!weatherData) renderWeatherNoData();
  }
}

async function searchWeatherPlace(query) {
  if (!query.trim()) return;
  weatherLoading.textContent = `Suche "${query.trim()}" …`;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=de&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Geocoding HTTP " + res.status);
    const data = await res.json();
    const hit = data.results?.[0];
    if (!hit) {
      weatherLoading.textContent = `Kein Ort namens "${query.trim()}" gefunden`;
      return;
    }
    const label = [hit.name, hit.country].filter(Boolean).join(", ");
    loadWeatherForPlace(hit.latitude, hit.longitude, label);
  } catch (err) {
    weatherLoading.textContent = "Ortssuche gerade nicht erreichbar.";
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
  try {
    localStorage.setItem("dashboard-cal-events", JSON.stringify(events));
  } catch (err) {}
  document.dispatchEvent(new Event("calendar-change"));
}

let calEvents = loadCalEvents();
const today = new Date();
let calViewYear = today.getFullYear();
let calViewMonth = today.getMonth();
let calSelectedKey = dateKey(today);

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

function renderCalendar() {
  document.getElementById("calTitle").textContent = `${calMonthNames[calViewMonth]} ${calViewYear}`;
  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  calWeekdayLabels.forEach((wd) => {
    const el = document.createElement("div");
    el.className = "cal-weekday";
    el.textContent = wd;
    grid.appendChild(el);
  });

  const firstOfMonth = new Date(calViewYear, calViewMonth, 1);
  let startOffset = firstOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calViewYear, calViewMonth, 0).getDate();

  const cells = [];
  for (let i = startOffset; i > 0; i--) {
    cells.push({ day: daysInPrevMonth - i + 1, muted: true, month: calViewMonth - 1 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, muted: false, month: calViewMonth });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const nextDay = cells.length - (startOffset + daysInMonth) + 1;
    cells.push({ day: nextDay, muted: true, month: calViewMonth + 1 });
  }

  cells.forEach((cell) => {
    const cellDate = new Date(calViewYear, cell.month, cell.day);
    const key = dateKey(cellDate);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "cal-day" +
      (cell.muted ? " muted" : "") +
      (key === dateKey(today) ? " today" : "") +
      (calEvents[key]?.length ? " has-event" : "");
    btn.textContent = cell.day;
    btn.addEventListener("click", () => {
      calSelectedKey = key;
      if (cell.muted) {
        calViewYear = cellDate.getFullYear();
        calViewMonth = cellDate.getMonth();
      }
      renderCalendar();
      renderCalEvents();
    });
    grid.appendChild(btn);
  });
}

function renderCalEvents() {
  const [y, m, d] = calSelectedKey.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("calSelectedLabel").textContent =
    calSelectedKey === dateKey(today) ? `heute, ${label}` : label;

  const list = document.getElementById("calEvents");
  list.innerHTML = "";
  const items = (calEvents[calSelectedKey] || [])
    .map((item, index) => ({
      index,
      event: typeof item === "string" ? { text: item, allDay: true, time: "" } : item,
    }))
    .sort((a, b) => {
      const aKey = a.event.allDay || !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.event.time || "") ? "" : a.event.time;
      const bKey = b.event.allDay || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.event.time || "") ? "" : b.event.time;
      return aKey.localeCompare(bKey) || a.index - b.index;
    });
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "cal-selected-date";
    empty.style.border = "none";
    empty.style.padding = "0";
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
      calEvents[calSelectedKey].splice(index, 1);
      if (!calEvents[calSelectedKey].length) delete calEvents[calSelectedKey];
      saveCalEvents(calEvents);
      renderCalendar();
      renderCalEvents();
    });
    list.appendChild(row);
  });
}

document.getElementById("calPrev").addEventListener("click", () => {
  calViewMonth--;
  if (calViewMonth < 0) {
    calViewMonth = 11;
    calViewYear--;
  }
  renderCalendar();
});

document.getElementById("calNext").addEventListener("click", () => {
  calViewMonth++;
  if (calViewMonth > 11) {
    calViewMonth = 0;
    calViewYear++;
  }
  renderCalendar();
});

document.getElementById("calToday").addEventListener("click", () => {
  calViewYear = today.getFullYear();
  calViewMonth = today.getMonth();
  calSelectedKey = dateKey(today);
  renderCalendar();
  renderCalEvents();
});

document.getElementById("calAddForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("calAddInput");
  const text = input.value.trim();
  if (!text) return;
  if (!calEvents[calSelectedKey]) calEvents[calSelectedKey] = [];
  const allDay = document.getElementById("calAllDay").checked;
  const time = document.getElementById("calAddTime").value;
  if (!allDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    document.getElementById("calAddTime").reportValidity();
    return;
  }
  calEvents[calSelectedKey].push({ text, allDay, time: allDay ? "" : time });
  saveCalEvents(calEvents);
  input.value = "";
  renderCalendar();
  renderCalEvents();
});

const calAllDay = document.getElementById("calAllDay");
const calAddTime = document.getElementById("calAddTime");
calAllDay.addEventListener("change", () => {
  calAddTime.disabled = calAllDay.checked;
  calAddTime.required = !calAllDay.checked;
});
renderCalendar();
renderCalEvents();

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
  document.getElementById("fireSourceNote").textContent =
    "Daten der Berliner Feuerwehr konnten nicht geladen werden — später erneut versuchen.";
  document.getElementById("fireExportBtn").disabled = true;
}

async function loadFireData() {
  try {
    const res = await fetch(FIRE_DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const days = parseFireCsv(await res.text());
    if (!days.length) throw new Error("Keine Tageswerte in der Datei");
    fireDays = days;
    renderFire(days);
  } catch (err) {
    console.warn("Feuerwehrdaten konnten nicht geladen werden:", err);
    if (!fireDays.length) renderFireNoData();
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
};

// IDs werden umbenannt, damit sie eindeutig bleiben und SVG-Verläufe nicht auf die versteckte Vorlage zeigen
function cloneForMirror(src) {
  const clone = src.cloneNode(true);
  clone.querySelectorAll(".panel-toggle, .layout-handle, .fire-export").forEach((el) => el.remove());
  [clone, ...clone.querySelectorAll("*")].forEach((el) => {
    el.classList.remove("collapsed", "layout-group", "layout-dragging");
    el.removeAttribute("data-layout-id");
    el.removeAttribute("data-layout-item");
    if (el.id) el.id += "--ov";
    ["fill", "stroke", "clip-path", "mask"].forEach((attr) => {
      const value = el.getAttribute(attr);
      if (value && value.includes("url(#")) el.setAttribute(attr, value.replace(/url\(#([^)]+)\)/g, "url(#$1--ov)"));
    });
  });
  clone.hidden = false;
  return clone;
}

function mountMirrorWidget(body, selectors) {
  const sources = selectors.map((s) => document.querySelector(s)).filter(Boolean);
  let queued = false;
  const update = () => {
    queued = false;
    body.replaceChildren(...sources.map(cloneForMirror));
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  });
  sources.forEach((src) =>
    observer.observe(src, { childList: true, subtree: true, characterData: true, attributes: true }),
  );
  update();
  return () => observer.disconnect();
}

function mountRadarWidget(body) {
  renderInto(body, '<div class="ov-map"></div><div class="warn-note ov-map-note">Radar wird geladen …</div>');
  const mapEl = body.querySelector(".ov-map");
  const note = body.querySelector(".ov-map-note");
  const miniMap = L.map(mapEl, { zoomControl: false, attributionControl: false }).setView(
    [currentWeatherCoords.lat, currentWeatherCoords.lon],
    7,
  );
  L.tileLayer(BASE_TILE_URL, { maxZoom: 16 }).addTo(miniMap);
  let layer = null;
  async function load() {
    try {
      const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (!res.ok) throw new Error("RainViewer HTTP " + res.status);
      const data = await res.json();
      const past = data.radar?.past || [];
      if (!past.length || !data.host?.startsWith("https://")) throw new Error("Keine Radarframes");
      const frame = past[past.length - 1];
      if (layer) miniMap.removeLayer(layer);
      layer = L.tileLayer(`${data.host}${frame.path}/512/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.78,
        maxNativeZoom: 7,
        maxZoom: 16,
      }).addTo(miniMap);
      note.textContent = `Radar ${formatFrameTime(frame.time)} Uhr · © RainViewer · Karte © Esri`;
    } catch (err) {
      note.textContent = "Radardaten konnten nicht geladen werden.";
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
      list.innerHTML = '<div class="todo-empty">Heute keine Termine — im Kalender eintragen.</div>';
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

const overviewGrid = document.getElementById("overviewGrid");
const overviewEmpty = document.getElementById("overviewEmpty");
const overviewCleanups = new Map();

function loadOverviewTypes() {
  try {
    const raw = localStorage.getItem(OVERVIEW_STORAGE_KEY);
    if (raw) return JSON.parse(raw).filter((type) => OVERVIEW_WIDGETS[type]);
  } catch (err) {}
  const types = [...OVERVIEW_DEFAULT];
  // Widget der früheren Widget-Seite übernehmen
  try {
    const legacy = localStorage.getItem("dashboard-widget-slot");
    if (legacy && OVERVIEW_WIDGETS[legacy] && !types.includes(legacy)) types.push(legacy);
    localStorage.removeItem("dashboard-widget-slot");
  } catch (err) {}
  return types;
}
let overviewTypes = loadOverviewTypes();

function saveOverviewTypes() {
  try {
    localStorage.setItem(OVERVIEW_STORAGE_KEY, JSON.stringify(overviewTypes));
  } catch (err) {}
}

function mountOverviewWidget(type) {
  const def = OVERVIEW_WIDGETS[type];
  const panel = document.createElement("section");
  panel.className = "panel ov-widget" + (def.wide ? " ov-wide" : "");
  panel.id = "ov-" + type;
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
  panel.querySelector(".ov-remove").addEventListener("click", () => removeOverviewWidget(type));
  overviewGrid.appendChild(panel);

  const body = panel.querySelector(".ov-body");
  const cleanup = def.mirror ? mountMirrorWidget(body, def.mirror) : def.mount(body);
  overviewCleanups.set(type, typeof cleanup === "function" ? cleanup : null);
}

function addOverviewWidget(type) {
  if (!OVERVIEW_WIDGETS[type] || overviewTypes.includes(type)) return;
  overviewTypes.push(type);
  saveOverviewTypes();
  mountOverviewWidget(type);
  saveLayoutOrder(overviewGrid);
  afterOverviewChange();
}

function removeOverviewWidget(type) {
  overviewTypes = overviewTypes.filter((t) => t !== type);
  saveOverviewTypes();
  const cleanup = overviewCleanups.get(type);
  if (cleanup) cleanup();
  overviewCleanups.delete(type);
  document.getElementById("ov-" + type)?.remove();
  storeCollapsed("ov-" + type, false);
  saveLayoutOrder(overviewGrid);
  afterOverviewChange();
}

function afterOverviewChange() {
  overviewGrid.hidden = !overviewTypes.length;
  overviewEmpty.hidden = overviewTypes.length > 0;
  refreshLayoutHandles();
  fitOverviewGrid();
  if (pickerOverlay.classList.contains("show")) renderWidgetPicker();
}

// Zeilen, in denen alles eingeklappt ist, bekommen nur ihre Titelhöhe; alle anderen teilen sich den Rest
function fitOverviewGrid() {
  if (!overviewGrid.offsetParent) return;
  const gap = parseFloat(getComputedStyle(overviewGrid).columnGap) || 0;
  const width = overviewGrid.clientWidth;
  const height = overviewGrid.clientHeight;
  const items = layoutItems(overviewGrid);

  // Mobil scrollt die Seite: feste Kachelhöhe, breite Widgets über die ganze Breite
  if (MOBILE_SCROLL_QUERY.matches) {
    const mobileCols = width >= 2 * OVERVIEW_MIN_COL_TIGHT + gap ? 2 : 1;
    const mobileRows = packOverviewRows(items, mobileCols, 2);
    overviewGrid.classList.remove("ov-overfull");
    overviewGrid.style.gridTemplateColumns = `repeat(${mobileCols}, minmax(0, 1fr))`;
    mobileRows.forEach((row) => row.forEach(({ el, span }) => (el.style.gridColumn = span > 1 ? `span ${span}` : "")));
    overviewGrid.style.gridTemplateRows = mobileRows
      .map((row) => (row.some(({ el }) => !el.classList.contains("collapsed")) ? `${OVERVIEW_MOBILE_ROW}px` : "auto"))
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
  // Nur wenn so viele Widgets gewählt sind, dass nicht einmal die Titel passen, darf die Übersicht scrollen
  const overfull = items.length > 0 && rowHeight(cols) < OVERVIEW_MIN_TILE;
  overviewGrid.classList.toggle("ov-overfull", overfull);
  const openRow = `minmax(${overfull ? OVERVIEW_MIN_TILE : 0}px, 1fr)`;
  overviewGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  rows.forEach((row) => row.forEach(({ el, span }) => (el.style.gridColumn = span > 1 ? `span ${span}` : "")));
  overviewGrid.style.gridTemplateRows = rows
    .map((row) => (row.some(({ el }) => !el.classList.contains("collapsed")) ? openRow : "auto"))
    .join(" ");
}

// Verteilt die Kacheln zeilenweise; passt eine nicht mehr hinein, füllt die letzte Kachel der Zeile die Lücke
function packOverviewRows(items, cols, minColsForWide = 3) {
  const rows = [];
  let row = [];
  let used = 0;
  const closeRow = () => {
    if (!row.length) return;
    row[row.length - 1].span += cols - used;
    rows.push(row);
    row = [];
    used = 0;
  };
  items.forEach((el) => {
    const span = el.classList.contains("ov-wide") && cols >= minColsForWide ? 2 : 1;
    if (used + span > cols) closeRow();
    row.push({ el, span });
    used += span;
  });
  closeRow();
  return rows;
}

// ---- Widget-Auswahl: fügt hinzu oder entfernt wieder ----
const pickerOverlay = document.getElementById("widgetPickerOverlay");
const pickerBody = document.getElementById("widgetPickerBody");

function renderWidgetPicker() {
  const groups = [...new Set(Object.values(OVERVIEW_WIDGETS).map((d) => d.group))];
  pickerBody.innerHTML = groups
    .map(
      (group) => `<div class="widget-picker-group">
      <div class="widget-picker-group-title">${group}</div>
      <div class="widget-picker-grid">
        ${Object.entries(OVERVIEW_WIDGETS)
          .filter(([, d]) => d.group === group)
          .map(([type, d]) => {
            const added = overviewTypes.includes(type);
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
function openWidgetPicker() {
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
  if (overviewTypes.includes(type)) removeOverviewWidget(type);
  else addOverviewWidget(type);
  pickerBody.querySelector(`[data-widget="${type}"]`)?.focus();
});
document.getElementById("widgetPickerClose").addEventListener("click", closeWidgetPicker);
pickerOverlay.addEventListener("click", (e) => {
  if (e.target === pickerOverlay) closeWidgetPicker();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && pickerOverlay.classList.contains("show")) closeWidgetPicker();
});

document.getElementById("overviewAddBtn").addEventListener("click", openWidgetPicker);
overviewEmpty.addEventListener("click", openWidgetPicker);
document.getElementById("overviewArrangeBtn").addEventListener("click", () => {
  setLayoutEditing(!document.body.classList.contains("layout-editing"));
});

saveOverviewTypes();
overviewTypes.forEach(mountOverviewWidget);
applySavedLayoutOrder(overviewGrid);
afterOverviewChange();
new ResizeObserver(fitOverviewGrid).observe(overviewGrid);
document.addEventListener("widget-collapse", fitOverviewGrid);
window.addEventListener("resize", fitOverviewGrid);
