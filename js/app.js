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
  widgets: {
    id: "widgets",
    label: "Widget",
    alwaysShow: true,
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" /><rect x="13" y="13" width="7.5" height="7.5" rx="1.6" />
    </svg><span>Widget</span>`,
    target: "widgetPage",
  },
};

// Widget-Kategorien Zuordnung
const WIDGET_CATEGORIES = {
  notes: "calendar",
  todo: "widgets",
  clock: "widgets",
  countdown: "widgets",
  warnings: "widgets",
  checklist: "widgets",
  emergencynumbers: "widgets",
};

function updateNavigation() {
  const navContainer = document.getElementById("sidebarNav");
  if (!navContainer) return;

  // Prüfe welche Widgets vorhanden sind
  const widgetSlot = document.getElementById("widgetSlot");
  const hasWidget = widgetSlot && widgetSlot.classList.contains("panel");

  // Hole gespeicherte Widget-Typen
  let activeWidgets = [];
  try {
    const stored = localStorage.getItem("dashboard-widget-slot");
    if (stored) activeWidgets.push(stored);
  } catch (err) {}

  // Navigation neu erstellen
  navContainer.innerHTML = "";

  Object.keys(NAV_CATEGORIES).forEach((key) => {
    const category = NAV_CATEGORIES[key];

    // Wenn Kategorie alwaysShow hat, immer anzeigen
    if (category.alwaysShow) {
      // Kategorie anzeigen (Kalender ist immer sichtbar, auch ohne Notizen)
    } else if (category.widgets && category.widgets.length > 0) {
      // Wenn Kategorie Widgets hat, prüfe ob mindestens eines aktiv ist
      const hasActiveWidget = category.widgets.some((w) => activeWidgets.includes(w));
      if (!hasActiveWidget) return; // Kategorie nicht anzeigen wenn keine Widgets da sind
    } else if (!hasWidget && key === "widgets") {
      // Widget-Slot Kategorie nur wenn Widget vorhanden
      return;
    }

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

// ---- Widget-Auswahl öffnen/schließen ----
document.querySelectorAll(".placeholder").forEach((btn) => {
  btn.addEventListener("click", openWidgetPicker);
});

function setupToggle(panelEl, btnEl) {
  if (!panelEl || !btnEl) return;
  btnEl.setAttribute("aria-expanded", "true");
  btnEl.addEventListener("click", () => {
    const willCollapse = !panelEl.classList.contains("collapsed");
    panelEl.classList.toggle("collapsed");
    btnEl.classList.toggle("rotated");
    btnEl.setAttribute("aria-expanded", String(!willCollapse));
    if (!willCollapse && panelEl.querySelector("#map")) {
      setTimeout(() => {
        if (typeof map !== "undefined" && map) map.invalidateSize();
      }, 200);
    }
  });
}

// Navigation bei Initialisierung aktualisieren
updateNavigation();

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
  themeToggleBtn.innerHTML = eff === "dark" ? moonIconSvg : sunIconSvg;
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
let currentWeatherCoords = { lat: 50.0782, lon: 8.2398, label: "Wiesbaden" };
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
    ]);
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

// ---- Widget Picker ----
const widgetSlot = document.getElementById("widgetSlot");
const pickerOverlay = document.getElementById("widgetPickerOverlay");

function openWidgetPicker() {
  pickerOverlay.classList.add("show");
}
function closeWidgetPicker() {
  pickerOverlay.classList.remove("show");
}
document.getElementById("widgetPickerClose").addEventListener("click", closeWidgetPicker);
pickerOverlay.addEventListener("click", (e) => {
  if (e.target === pickerOverlay) closeWidgetPicker();
});

document.querySelectorAll(".widget-option").forEach((opt) => {
  opt.addEventListener("click", () => {
    addWidget(opt.dataset.widget);
    closeWidgetPicker();
  });
});

function removeWidget() {
  try {
    localStorage.removeItem("dashboard-widget-slot");
  } catch (err) {}
  const fresh = document.createElement("button");
  fresh.className = "placeholder";
  fresh.id = "widgetSlot";
  fresh.dataset.name = "Weiteres";
  fresh.innerHTML = `<span class="plus">+</span><span class="label">Noch ein Platz frei für dein nächstes Widget</span>`;
  fresh.addEventListener("click", openWidgetPicker);
  document.getElementById("widgetSlot").replaceWith(fresh);

  // Navigation aktualisieren
  updateNavigation();
  refreshLayoutHandles();
}

function mountWidget(type, innerHtml) {
  try {
    localStorage.setItem("dashboard-widget-slot", type);
  } catch (err) {}

  // Widget-Titel basierend auf Typ setzen
  const widgetTitles = {
    todo: "Aufgaben",
    notes: "Notizen",
    clock: "Weltzeituhr",
    countdown: "Countdown",
    warnings: "Warnungen",
    checklist: "Notfall-Checkliste",
    emergencynumbers: "Notrufnummern",
  };

  const panel = document.createElement("section");
  panel.className = "panel widget-panel";
  panel.id = "widgetSlot";

  // Widget-Struktur mit Header und Body
  panel.innerHTML = `
    <button type="button" class="widget-remove" aria-label="Widget entfernen">×</button>
    <div class="widget-panel-header">
      <div class="panel-title">${widgetTitles[type] || "Widget"}</div>
    </div>
    <div class="widget-panel-body">
      ${innerHtml}
    </div>
  `;

  document.getElementById("widgetSlot").replaceWith(panel);
  panel.querySelector(".widget-remove").addEventListener("click", removeWidget);

  const header = panel.querySelector(".widget-panel-header");
  if (header) {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "panel-toggle";
    toggleBtn.setAttribute("aria-label", "Widget ein-/ausklappen");
    toggleBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    header.appendChild(toggleBtn);
    setupToggle(panel, toggleBtn);
  }

  return panel;
}

function addWidget(type) {
  if (type === "todo") mountTodoWidget();
  else if (type === "notes") mountNotesWidget();
  else if (type === "clock") mountClockWidget();
  else if (type === "countdown") mountCountdownWidget();
  else if (type === "warnings") mountWarningsWidget();
  else if (type === "checklist") mountChecklistWidget();
  else if (type === "emergencynumbers") mountEmergencyNumbersWidget();

  // Navigation nach Hinzufügen aktualisieren
  updateNavigation();
  refreshLayoutHandles();
}

// ---- To-do Widget ----
function mountTodoWidget() {
  const panel = mountWidget(
    "todo",
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
function mountNotesWidget() {
  const panel = mountWidget(
    "notes",
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
function mountClockWidget() {
  const zones = [
    { city: "Wiesbaden", tz: "Europe/Berlin" },
    { city: "London", tz: "Europe/London" },
    { city: "New York", tz: "America/New_York" },
    { city: "Tokio", tz: "Asia/Tokyo" },
  ];
  const panel = mountWidget(
    "clock",
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
  setInterval(tickClocks, 30000);
}

// ---- Countdown Widget ----
function mountCountdownWidget() {
  const panel = mountWidget(
    "countdown",
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
      const numberEl = document.getElementById("cdNumber");
      const labelEl = document.getElementById("cdLabel");
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
}

// ---- Warnungen Widget ----
function mountWarningsWidget() {
  const panel = mountWidget(
    "warnings",
    `
    <form class="warn-search" id="warnSearchForm">
      <input type="text" id="warnSearchInput" placeholder="Ort filtern, z. B. Wiesbaden …" autocomplete="off">
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
}

// ---- Notfall-Checkliste Widget ----
function mountChecklistWidget() {
  const items = [
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

  const panel = mountWidget(
    "checklist",
    `
    <div class="todo-list" id="checklistList"></div>
    <div class="warn-note">Orientiert an den Empfehlungen des BBK für die private Notfallvorsorge.</div>
  `,
  );

  function loadChecked() {
    try {
      return JSON.parse(localStorage.getItem("dashboard-widget-checklist") || "[]");
    } catch (err) {
      return [];
    }
  }
  function saveChecked(arr) {
    try {
      localStorage.setItem("dashboard-widget-checklist", JSON.stringify(arr));
    } catch (err) {}
  }
  let checked = loadChecked();

  const list = panel.querySelector("#checklistList");
  items.forEach((text, i) => {
    const row = document.createElement("div");
    row.className = "todo-item" + (checked.includes(i) ? " done" : "");
    row.innerHTML = `<input type="checkbox" ${checked.includes(i) ? "checked" : ""}><span></span>`;
    row.querySelector("span").textContent = text;
    row.querySelector("input").addEventListener("change", () => {
      checked = loadChecked();
      if (checked.includes(i)) checked = checked.filter((x) => x !== i);
      else checked.push(i);
      saveChecked(checked);
      row.classList.toggle("done");
    });
    list.appendChild(row);
  });
}

// ---- Notrufnummern Widget ----
function mountEmergencyNumbersWidget() {
  const numbers = [
    { num: "112", label: "Feuerwehr & Rettungsdienst — lebensbedrohliche Notfälle, Brand" },
    { num: "110", label: "Polizei-Notruf" },
    { num: "116 117", label: "Ärztlicher Bereitschaftsdienst — dringend, aber nicht lebensbedrohlich" },
  ];
  mountWidget(
    "emergencynumbers",
    `
    <div class="clock-list">
      ${numbers.map((n) => `<div class="emerg-row"><div class="emerg-num">${n.num}</div><div class="emerg-label">${n.label}</div></div>`).join("")}
    </div>
    <div class="warn-note">Giftnotruf: Die Nummer ist je nach Bundesland unterschiedlich — bei Bedarf regional nachschlagen. In ganz Europa gilt zusätzlich die 112 für alle lebensbedrohlichen Notfälle.</div>
  `,
  );
}

// ---- Katastrophenschutz-Seite ----
const DISASTER_NUMBERS = [
  { num: "112", label: "Feuerwehr & Rettungsdienst — lebensbedrohliche Notfälle, Brand" },
  { num: "110", label: "Polizei-Notruf" },
  { num: "116 117", label: "Ärztlicher Bereitschaftsdienst — dringend, aber nicht lebensbedrohlich" },
  { num: "19222", label: "Feuerwehr-Leitstelle Wiesbaden (Festnetz-Ausweichnummer)" },
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
  if (!list) return;
  let checked = [];
  try {
    checked = JSON.parse(localStorage.getItem("dashboard-widget-checklist") || "[]");
  } catch (err) {}
  function save(arr) {
    try {
      localStorage.setItem("dashboard-widget-checklist", JSON.stringify(arr));
    } catch (err) {}
  }
  list.innerHTML = "";
  DISASTER_CHECKLIST_ITEMS.forEach((text, i) => {
    const row = document.createElement("div");
    row.className = "todo-item" + (checked.includes(i) ? " done" : "");
    row.innerHTML = `<input type="checkbox" ${checked.includes(i) ? "checked" : ""}><span></span>`;
    row.querySelector("span").textContent = text;
    row.querySelector("input").addEventListener("change", () => {
      let cur = [];
      try {
        cur = JSON.parse(localStorage.getItem("dashboard-widget-checklist") || "[]");
      } catch (err) {}
      if (cur.includes(i)) cur = cur.filter((x) => x !== i);
      else cur.push(i);
      save(cur);
      row.classList.toggle("done");
    });
    list.appendChild(row);
  });
}

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

function setupDisasterMeetingPoint() {
  const input = document.getElementById("meetingPointInput");
  const saved = document.getElementById("meetingSaved");
  if (!input) return;
  try {
    input.value = localStorage.getItem("dashboard-meeting-point") || "";
  } catch (err) {}
  let saveTimer;
  input.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem("dashboard-meeting-point", input.value);
        saved.textContent = "Gespeichert";
        setTimeout(() => (saved.textContent = ""), 1500);
      } catch (err) {}
    }, 500);
  });
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
const LAYOUT_GROUP_CLASSES = ["stat-row", "charts-row", "lower-row", "detail-row", "disaster-row", "disaster-side"];
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
  return [...container.children].filter((c) => !c.classList.contains("layout-handle"));
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

function initLayout() {
  document.querySelectorAll(LAYOUT_CONTAINER_SELECTOR).forEach((container) => {
    const key = layoutContainerKey(container);
    layoutItems(container).forEach((child, i) => {
      if (!child.id && !child.dataset.layoutId) child.dataset.layoutId = `${key}#${i}`;
    });
    applySavedLayoutOrder(container);
  });
  refreshLayoutHandles();

  const editBtn = document.getElementById("layoutEditToggle");
  const editLabel = document.getElementById("layoutEditLabel");
  editBtn.addEventListener("click", () => {
    const editing = document.body.classList.toggle("layout-editing");
    editBtn.setAttribute("aria-pressed", String(editing));
    editLabel.textContent = editing ? "✓ Layout fertig" : "✥ Layout anpassen";
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

// Beim Laden: gespeichertes Widget wiederherstellen
(function restoreWidget() {
  let saved = null;
  try {
    saved = localStorage.getItem("dashboard-widget-slot");
  } catch (err) {}
  if (saved) addWidget(saved);
})();

initLayout();

// ---- Live-Regenradar (Leaflet + RainViewer + Open-Meteo Geocoding) ----
const map = L.map("map", {
  zoomControl: true,
  attributionControl: true,
  maxZoom: 16,
}).setView([50.0782, 8.2398], 8);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles: Esri — Esri, HERE, Garmin, FAO, NOAA, USGS",
    maxZoom: 16,
  },
).addTo(map);

// Hinweis: Ersetze 'DEIN_OPENWEATHER_API_KEY' mit deinem echten API-Key von https://openweathermap.org/api
const OPENWEATHER_TEST_KEY = "DEIN_OPENWEATHER_API_KEY";
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
      encodeURIComponent(OPENWEATHER_TEST_KEY),
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
      <div class="bar" style="height:${heightPct.toFixed(0)}%"></div>
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
      <circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--orange)" stroke-width="14"
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
function renderTempWave(hourIdxForDay, hourly) {
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
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style="stop-color:var(--orange);stop-opacity:0.35"/>
          <stop offset="100%" style="stop-color:var(--orange);stop-opacity:0"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#waveFill)" stroke="none"/>
      <path d="${linePath}" fill="none" style="stroke:var(--navy)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
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

  document.getElementById("dayDetail").classList.add("show");

  const dayPop = d.precipitation_probability_max[index] ?? 0;
  const shortLabel = index === 0 ? "heute" : dateLabel;
  renderRainDonut(dayPop, shortLabel);
  renderTempWave(hourIdxForDay, hourly);
  const waveLabelEl = document.getElementById("waveDayLabel");
  if (waveLabelEl) waveLabelEl.textContent = shortLabel + ", stündlich";

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

async function loadWeatherForPlace(lat, lon, label) {
  currentWeatherCoords = { lat, lon, label };
  weatherLoading.textContent = `Lade Wetter für "${label}" …`;
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,surface_pressure,relative_humidity_2m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset` +
      `&timezone=auto&forecast_days=6`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wetter HTTP " + res.status);
    const data = await res.json();
    if (!data.current || !data.daily?.time?.length) throw new Error("Unvollständige Wetterdaten");
    weatherData = data;

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

// Startwetter für Wiesbaden laden
loadWeatherForPlace(50.0782, 8.2398, "Wiesbaden");

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
