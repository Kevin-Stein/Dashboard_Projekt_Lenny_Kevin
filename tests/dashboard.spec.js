const { test, expect } = require("@playwright/test");
const { openWithLang, switchLanguage, addOverviewWidget, openPage } = require("./helpers");

const PAGES = [
  { target: "overviewPage", de: "Übersicht", en: "Overview" },
  { target: "weatherPage", de: "Wetter", en: "Weather" },
  { target: "disasterPage", de: "Katastrophenschutz", en: "Civil protection" },
  { target: "firePage", de: "Feuerwehr", en: "Fire brigade" },
  { target: "waterPage", de: "Wasserpegel", en: "Water levels" },
];

test.describe("Dashboard", () => {
  test("zeigt den Sprachwechsler neben dem Farbmodus", async ({ page }) => {
    await openWithLang(page, "/", "de");

    const row = page.locator(".sidebar-footer .sidebar-row");
    await expect(row.locator("#themeToggle")).toBeVisible();
    await expect(row.locator("#langSelect")).toBeVisible();
    await expect(page.locator("#langSelect option")).toHaveText(["Deutsch", "English"]);
  });

  test("startet auf Deutsch und wechselt auf Englisch", async ({ page }) => {
    await openWithLang(page, "/", "de");

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page).toHaveTitle("Katastrophenschutz – Wir helfen Berlin");
    await expect(page.locator("#overviewPage .overview-title")).toHaveText("Meine Übersicht");
    await expect(page.locator("#sidebarNav .nav-item")).toHaveText(PAGES.map((p) => new RegExp(p.de)));

    await switchLanguage(page, "en");
    await expect(page).toHaveTitle("Civil Protection – Helping Berlin");
    await expect(page.locator("#overviewPage .overview-title")).toHaveText("My overview");
    await expect(page.locator("#langSelect")).toHaveValue("en");
    await expect(page.locator("#sidebarNav .nav-item")).toHaveText(PAGES.map((p) => new RegExp(p.en)));
  });

  test("wechselt alle Seiten in der Navigation", async ({ page }) => {
    await openWithLang(page, "/", "de");

    for (const item of PAGES) {
      await page.locator(`#sidebarNav .nav-item[data-target="${item.target}"]`).click();
      await expect(page.locator(`#${item.target}`)).toHaveClass(/active/);
      await expect(page.locator(`#sidebarNav .nav-item[data-target="${item.target}"]`)).toHaveClass(/active/);
    }
  });

  test("öffnet den Widget-Katalog auf Deutsch und Englisch", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.locator('#overviewPage [data-widget-action="add"]').click();

    const overlay = page.locator("#widgetPickerOverlay");
    await expect(overlay).toHaveClass(/show/);
    await expect(overlay.locator(".panel-title")).toHaveText("Widget hinzufügen");
    await expect(overlay.getByText("Kalender & Organisation")).toBeVisible();
    await expect(overlay.getByText("Aktuelles Wetter")).toBeVisible();
    await page.locator("#widgetPickerClose").click();
    await expect(overlay).not.toHaveClass(/show/);

    await switchLanguage(page, "en");
    await page.locator('#overviewPage [data-widget-action="add"]').click();
    await expect(overlay).toHaveClass(/show/);
    await expect(overlay.locator(".panel-title")).toHaveText("Add widget");
    await expect(overlay.getByText("Calendar & organisation")).toBeVisible();
    await expect(overlay.getByText("Current weather")).toBeVisible();
  });

  test("öffnet das Versions-Changelog als Popup", async ({ page }) => {
    await openWithLang(page, "/", "de");

    const docs = page.locator("#docsLink");
    const versionBtn = page.locator("#versionLink");
    await expect(versionBtn).toBeVisible();
    await expect(versionBtn).toHaveText(/Version\s+2\.0\.0/);
    await expect(versionBtn.locator("#versionNumber")).toHaveText("2.0.0");
    await expect(page.locator("#sidebarNav .nav-item", { hasText: "Version" })).toHaveCount(0);
    const docsBox = await docs.boundingBox();
    const versionBox = await versionBtn.boundingBox();
    expect(versionBox.y).toBeGreaterThan(docsBox.y);

    await versionBtn.click();
    const overlay = page.locator("#changelogOverlay");
    await expect(overlay).toHaveClass(/show/);
    await expect(overlay.locator("#changelogTitle")).toHaveText("Version 2.0.0");
    await expect(overlay.locator("#changelogLead")).toHaveText(/nach dem 28\. September 2026/);
    await expect(overlay.getByText("Hinzugefügt")).toBeVisible();
    await expect(overlay.getByText("Familien-Treffpunkt")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(overlay).not.toHaveClass(/show/);

    await switchLanguage(page, "en");
    await expect(page.locator("#versionLink")).toHaveText(/Version\s+2\.0\.0/);
    await page.locator("#versionLink").click();
    await expect(overlay).toHaveClass(/show/);
    await expect(overlay.locator("#changelogTitle")).toHaveText("Version 2.0.0");
    await expect(overlay.locator("#changelogLead")).toHaveText(/after 28 September 2026/);
    await expect(overlay.getByText("Family meeting point")).toBeVisible();
    await overlay.locator("#changelogClose").click();
    await expect(overlay).not.toHaveClass(/show/);
  });

  test("zeigt die Standard-Widgets der Übersicht", async ({ page }) => {
    await openWithLang(page, "/", "de");
    const grid = page.locator("#overviewGrid");
    await expect(grid.locator(".ov-widget")).toHaveCount(3);
    await expect(grid.locator("#ov-weather-now")).toBeVisible();
    await expect(grid.locator("#ov-fire-chart")).toBeVisible();
    await expect(grid.locator("#ov-water-chart")).toBeVisible();
    await expect(grid.locator("#ov-water-berlin")).toHaveCount(0);
    await expect(grid.locator("#ov-weather-now > .panel-title")).toHaveText("Aktuelles Wetter");
    await expect(page.locator("#weatherPanel > .panel-title")).toHaveText("Aktuelles Wetter");
    const [ovPad, srcPad] = await Promise.all([
      page.locator("#ov-weather-now").evaluate((el) => getComputedStyle(el).padding),
      page.locator("#weatherPanel").evaluate((el) => getComputedStyle(el).padding),
    ]);
    expect(ovPad).toBe(srcPad);
    const weatherOverflow = await page.locator("#ov-weather-now").evaluate((el) => getComputedStyle(el).overflow);
    expect(weatherOverflow).toBe("hidden");
    const firstRow = await page.evaluate(() => {
      const widgets = [...document.querySelectorAll("#overviewGrid > .ov-widget")].map((el) => {
        const r = el.getBoundingClientRect();
        return { id: el.id, x: r.x, y: r.y };
      });
      const top = Math.min(...widgets.map((w) => w.y));
      return widgets.filter((w) => w.y <= top + 24).sort((a, b) => a.x - b.x);
    });
    expect(firstRow[0].id).toBe("ov-weather-now");
    await expect(grid.locator("#ov-fire-chart > .panel-title")).toHaveText("Brandeinsätze pro Tag");
    await expect(grid.locator("#ov-water-chart > .panel-title")).toContainText("Pegelverlauf");
    await expect(grid.locator("#ov-water-chart .water-combo-grid")).toBeVisible();
    await expect(grid.locator("#ov-water-chart .water-list")).toBeVisible();
    await expect(grid.locator("#ov-weather-now .weather-search")).toBeVisible();
    await expect(grid.locator("#ov-weather-now .forecast")).toBeVisible();
    await expect(grid.locator("#ov-weather-now .day-detail.show")).toBeVisible();
    await expect(grid.locator("#ov-fire-chart .bar-chart")).toBeVisible();
    await expect(grid.locator("#ov-water-chart .water-chart")).toBeVisible();

    await expect(grid.locator("#ov-water-chart .water-item")).not.toHaveCount(0);
    await page.locator("#ov-water-chart .water-search input").fill("Dresden");
    await page.locator("#ov-water-chart .water-search button").click();
    await expect(page.locator("#waterChartTitle")).toContainText("Dresden");
  });

  test("hält Notizen und Radar kompakt", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await addOverviewWidget(page, "notes");
    const pageBox = await page.locator("#overviewPage").boundingBox();
    const notesBox = await page.locator("#ov-notes").boundingBox();
    expect(notesBox.width).toBeLessThan(pageBox.width * 0.5);

    const ovWeather = await page.locator("#ov-weather-now").boundingBox();
    const water = await page.locator("#ov-water-chart").boundingBox();
    expect(water.width).toBeGreaterThan(500);
    expect(water.width).toBeLessThan(pageBox.width * 0.7);
    const waterPlot = await page.locator("#ov-water-chart .water-chart").boundingBox();
    expect(waterPlot.width).toBeGreaterThan(260);

    await openPage(page, "weatherPage");
    const weatherPanel = await page.locator("#weatherPage #weatherPanel").boundingBox();
    expect(Math.abs(ovWeather.width - weatherPanel.width)).toBeLessThan(220);
    const weatherBox = await page.locator("#weatherPage").boundingBox();
    const radarBox = await page.locator("#radarPanel").boundingBox();
    expect(radarBox.width).toBeLessThan(weatherBox.width * 0.65);
  });

  test("packt Wetter, Vorhersage und Radar ohne Lücke", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "weatherPage");
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    const pageBox = await page.locator("#weatherPage").boundingBox();
    const weather = await page.locator("#weatherPage #weatherPanel").boundingBox();
    const radar = await page.locator("#radarPanel").boundingBox();
    const forecast = await page.locator("#weatherForecastPanel").boundingBox();
    const bars = await page.locator("#weatherForecastPanel .bar-chart").boundingBox();
    expect(radar.y + radar.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 3);
    expect(weather.y + weather.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 3);
    expect(radar.x).toBeGreaterThanOrEqual(pageBox.x - 3);
    expect(bars.x + bars.width).toBeLessThanOrEqual(forecast.x + forecast.width + 2);
    expect(forecast.width).toBeGreaterThan(320);
    expect(forecast.width).toBeLessThan(560);
    const overlapX = Math.min(radar.x + radar.width, forecast.x + forecast.width) - Math.max(radar.x, forecast.x);
    const overlapY = Math.min(radar.y + radar.height, forecast.y + forecast.height) - Math.max(radar.y, forecast.y);
    expect(overlapX <= 0 || overlapY <= 0).toBeTruthy();
  });

  test("holt Kacheln zurück in den Sichtbereich", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "weatherPage");
    await page.evaluate(() => {
      const el = document.getElementById("weatherForecastPanel");
      el.style.setProperty("--layout-w", "2400px");
      el.dataset.layoutW = "";
      window.dispatchEvent(new Event("resize"));
    });
    await expect.poll(async () => {
      const pageBox = await page.locator("#weatherPage").boundingBox();
      const tile = await page.locator("#weatherForecastPanel").boundingBox();
      return tile.x + tile.width - (pageBox.x + pageBox.width);
    }).toBeLessThanOrEqual(3);
    const pageBox = await page.locator("#weatherPage").boundingBox();
    const radar = await page.locator("#radarPanel").boundingBox();
    expect(radar.y + radar.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 3);
    expect(radar.x).toBeGreaterThanOrEqual(pageBox.x - 3);
  });

  test("lässt den Widget-Platzhalter schmal", async ({ page }) => {
    await openWithLang(page, "/", "de");
    const ovSlot = page.locator("#overviewPage .widget-slot").first();
    await expect(ovSlot).toBeVisible();
    const ovBox = await ovSlot.boundingBox();
    expect(ovBox.width).toBeLessThan(240);

    await openPage(page, "disasterPage");
    const pageBox = await page.locator("#disasterPage").boundingBox();
    const slot = page.locator("#disasterPage > .disaster-row > .widget-slot");
    await expect(slot).toBeVisible();
    const box = await slot.boundingBox();
    expect(box.width).toBeLessThan(240);
    expect(box.width).toBeLessThan(pageBox.width * 0.35);
  });

  test("zeigt dasselbe Pegel-Widget auf Übersicht und Wasserseite", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await expect(page.locator("#ov-water-chart .water-combo-grid")).toBeVisible();
    await expect(page.locator("#ov-water-chart .water-list")).toBeVisible();
    await openPage(page, "waterPage");
    await expect(page.locator("#waterPage #waterChartPanel.water-combo")).toBeVisible();
    await expect(page.locator("#waterPage .water-combo-grid")).toBeVisible();
    await expect(page.locator("#waterPage #waterBerlinList")).toBeVisible();
  });

  test("wechselt den Farbmodus", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggle")).toHaveClass(/is-dark/);
    await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#themeToggle")).toHaveText("");
    await expect(page.locator("#themeToggle")).toHaveAttribute("title", "Zu Light Mode wechseln");
    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggle")).not.toHaveClass(/is-dark/);
    await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "false");
  });

  test("öffnet das Menü auf dem Smartphone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWithLang(page, "/", "de");

    await expect(page.locator("#sidebarNav")).toBeHidden();
    await page.locator("#menuToggle").click();
    await expect(page.locator(".sidebar")).toHaveClass(/menu-open/);
    await expect(page.locator("#sidebarNav")).toBeVisible();
  });
});

test.describe("Dokumentation", () => {
  test("zeigt die deutsche Doku und wechselt auf Englisch", async ({ page }) => {
    await openWithLang(page, "/docs.html", "de");

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator(".sidebar-title")).toHaveText("Dokumentation");
    await expect(page.locator("#docsNav a[href='#start']")).toHaveText("Erste Schritte");
    await expect(page.locator("#start h2")).toHaveText("Erste Schritte");
    await expect(page.locator("#sprachen h2")).toHaveText("Mehrsprachigkeit");
    await expect(page.locator("#tests h2")).toHaveText("Tests");
    await expect(page.locator("#backToDashboard")).toContainText("Zum Dashboard");

    const row = page.locator(".sidebar-footer .sidebar-row");
    await expect(row.locator("#themeToggle")).toBeVisible();
    await expect(row.locator("#langSelect")).toBeVisible();

    await switchLanguage(page, "en");
    await expect(page).toHaveTitle(/Documentation/);
    await expect(page.locator(".sidebar-title")).toHaveText("Documentation");
    await expect(page.locator("#docsNav a[href='#start']")).toHaveText("Getting started");
    await expect(page.locator("#start h2")).toHaveText("Getting started");
    await expect(page.locator("#sprachen h2")).toHaveText("Internationalisation");
    await expect(page.locator("#tests h2")).toHaveText("Tests");
    await expect(page.locator("#backToDashboard")).toContainText("Back to dashboard");
  });
});
