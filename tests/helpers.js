const { expect } = require("@playwright/test");

function fakeWeather() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const hourly = { time: [], temperature_2m: [], weather_code: [], precipitation_probability: [], surface_pressure: [], relative_humidity_2m: [], wind_speed_10m: [] };
  days.forEach((day) => {
    for (let h = 0; h < 24; h++) {
      hourly.time.push(`${day}T${String(h).padStart(2, "0")}:00`);
      hourly.temperature_2m.push(10 + h / 3);
      hourly.weather_code.push(3);
      hourly.precipitation_probability.push(20);
      hourly.surface_pressure.push(1013);
      hourly.relative_humidity_2m.push(55);
      hourly.wind_speed_10m.push(8);
    }
  });
  const today = days[1];
  return {
    utc_offset_seconds: 7200,
    current: {
      time: `${today}T12:00`,
      temperature_2m: 15,
      weather_code: 3,
      relative_humidity_2m: 56,
      apparent_temperature: 14,
      surface_pressure: 1013,
      wind_speed_10m: 10,
    },
    hourly,
    daily: {
      time: days,
      weather_code: days.map(() => 3),
      temperature_2m_max: days.map((_, i) => 16 + i),
      temperature_2m_min: days.map(() => 8),
      precipitation_probability_max: days.map(() => 25),
      wind_speed_10m_max: days.map(() => 18),
      uv_index_max: days.map(() => 3),
      sunrise: days.map((d) => `${d}T06:30`),
      sunset: days.map((d) => `${d}T18:30`),
    },
  };
}

const WATER_STATIONS = [
  {
    uuid: "47d3e815-c556-4e1b-93de-9fe07329fb00",
    longname: "BERLIN-KOEPENICK",
    water: { longname: "SPREE" },
    timeseries: [{ shortname: "W", currentMeasurement: { value: 120, timestamp: "2026-09-25T12:00:00Z", stateMnwMhw: "normal" } }],
  },
  {
    uuid: "dresden-elba",
    longname: "DRESDEN",
    water: { longname: "ELBE" },
    timeseries: [{ shortname: "W", currentMeasurement: { value: 210, timestamp: "2026-09-25T12:00:00Z", stateMnwMhw: "high" } }],
  },
];

function stationByUrl(url) {
  const match = WATER_STATIONS.find((s) => url.includes(s.uuid));
  return match || WATER_STATIONS[0];
}

async function stubDashboardApis(page) {
  await page.route("**/geocoding-api.open-meteo.com/**", async (route) => {
    const name = new URL(route.request().url()).searchParams.get("name") || "";
    if (!name || name.length > 80 || /xyzzy|keinort/i.test(name)) return route.fulfill({ json: { results: [] } });
    return route.fulfill({
      json: { results: [{ name, country: "Deutschland", latitude: 53.55, longitude: 9.99, admin1: name }] },
    });
  });
  await page.route("**/api.open-meteo.com/**", (route) => route.fulfill({ json: fakeWeather() }));
  await page.route("**/api.rainviewer.com/**", (route) =>
    route.fulfill({
      json: { host: "https://tilecache.rainviewer.com", radar: { past: [{ time: 1720000000, path: "/v2/radar/1720000000" }] } },
    }),
  );
  await page.route("**/api/warnings*", (route) =>
    route.fulfill({
      json: [
        { i18nTitle: { de: "Sturm in Berlin", en: "Storm in Berlin" }, type: "Alert", severity: "Severe", startDate: "2026-09-25T08:00:00Z" },
        { i18nTitle: { de: "Hochwasser Dresden", en: "Flood Dresden" }, type: "Update", severity: "Moderate", startDate: "2026-09-25T09:00:00Z" },
      ],
    }),
  );
  await page.route("**/pegelonline.wsv.de/**", async (route) => {
    const url = route.request().url();
    if (url.includes("stations.json")) return route.fulfill({ json: WATER_STATIONS });
    if (url.includes("/measurements.json")) {
      return route.fulfill({ json: [{ timestamp: "2026-09-25T12:00:00Z", value: 120 }] });
    }
    if (url.includes("/W.json")) {
      return route.fulfill({
        json: {
          currentMeasurement: { value: 120, timestamp: "2026-09-25T12:00:00Z", stateMnwMhw: "normal" },
          characteristicValues: [{ shortname: "MW", value: 100 }],
        },
      });
    }
    return route.fulfill({ json: stationByUrl(url) });
  });
  await page.route("**/BF-Open-Data/**", (route) =>
    route.fulfill({
      body:
        "mission_created_date,mission_count_fire,mission_count_technical_rescue,mission_count_all,response_time_fire_time_to_first_pump_median\n" +
        Array.from({ length: 14 }, (_, i) => `2026-09-${String(i + 10).padStart(2, "0")},${10 + i},3,${20 + i},90`).join("\n"),
    }),
  );
}

async function openWithLang(page, path, lang) {
  await stubDashboardApis(page);
  await page.addInitScript((code) => {
    if (!sessionStorage.getItem("pw-lang-seeded")) {
      localStorage.setItem("dashboard-lang", code);
      sessionStorage.setItem("pw-lang-seeded", "1");
    }
  }, lang);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#langSelect")).toHaveValue(lang);
}

async function switchLanguage(page, lang) {
  const loaded = page.waitForEvent("load");
  await page.selectOption("#langSelect", lang);
  await loaded;
  await expect(page.locator("#langSelect")).toHaveValue(lang);
  await expect(page.locator("html")).toHaveAttribute("lang", lang);
}

async function openPage(page, target) {
  await page.locator(`#sidebarNav .nav-item[data-target="${target}"]`).click();
  await expect(page.locator(`#${target}`)).toHaveClass(/active/);
}

async function addPageWidget(page, pageId, type) {
  const prefix = pageId === "overviewPage" ? "ov" : pageId;
  await page.locator(`#${pageId} [data-widget-action="add"]`).click();
  await expect(page.locator("#widgetPickerOverlay")).toHaveClass(/show/);
  await page.locator(`#widgetPickerBody .widget-option[data-widget="${type}"]`).click();
  await page.locator("#widgetPickerClose").click();
  await expect(page.locator("#widgetPickerOverlay")).not.toHaveClass(/show/);
  await expect(page.locator(`#${prefix}-${type}`)).toBeVisible();
  return page.locator(`#${prefix}-${type}`);
}

async function addOverviewWidget(page, type) {
  return addPageWidget(page, "overviewPage", type);
}

module.exports = { openWithLang, switchLanguage, openPage, addOverviewWidget, addPageWidget, stubDashboardApis };
