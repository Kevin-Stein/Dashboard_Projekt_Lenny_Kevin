const { test, expect } = require("@playwright/test");
const { openWithLang, switchLanguage, addOverviewWidget, openPage } = require("./helpers");

const PAGES = [
  { target: "overviewPage", de: "Übersicht", en: "Overview" },
  { target: "weatherPage", de: "Wetter", en: "Weather" },
  { target: "waterPage", de: "Wasserpegel", en: "Water levels" },
  { target: "firePage", de: "Feuerwehr", en: "Fire brigade" },
  { target: "disasterPage", de: "Organisation", en: "Organisation" },
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

  test("zeigt ein Warn-Banner mit konfigurierbarem Lauftext", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await expect(page.locator("#warnBanner")).toBeHidden();
    await expect(page.locator("#sidebarNav .nav-item").nth(2)).toHaveText("Wasserpegel");
    await openPage(page, "disasterPage");
    await expect(page.locator("#disasterPage .overview-title")).toHaveText("Organisation");
    await expect(page.locator("#bannerConfigPanel > .panel-title")).toHaveText("Warn-Banner");
    const tileBox = await page.locator("#bannerConfigPanel").boundingBox();
    const inputBox = await page.locator("#bannerConfigInput").boundingBox();
    expect(tileBox.width).toBeGreaterThan(inputBox.width - 8);
    expect(tileBox.height).toBeLessThan(inputBox.height + 160);
    expect(tileBox.height).toBeLessThan(260);
    await page.locator("#bannerConfigInput").fill("Übung: Lagezentrum besetzt");
    await expect(page.locator("#warnBanner")).toBeVisible();
    await expect(page.locator("#warnBanner .warn-banner-tag")).toHaveCount(2);
    await expect(page.locator("#warnBanner .warn-banner-tag").first()).toHaveText("ACHTUNG");
    await expect(page.locator("#warnBanner .warn-banner-tag").last()).toHaveText("ACHTUNG");
    await expect(page.locator("#disasterPage .overview-bar #warnBanner")).toBeVisible();
    await expect(page.locator("#warnBanner .warn-banner-copy").first()).toHaveText("Übung: Lagezentrum besetzt");
    await expect(page.locator("#warnBanner .warn-banner-run")).toHaveCSS("animation-name", /warn-banner-scroll/);
    await openPage(page, "overviewPage");
    await expect(page.locator("#overviewPage .overview-bar #warnBanner")).toBeVisible();
    await expect(page.locator("#overviewPage [data-i18n='page.sub']")).toHaveCount(0);
    await page.locator("#bannerConfigInput").evaluate((el) => {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator("#warnBanner")).toBeHidden();
  });

  test("lädt die Kacheln und bestätigt Aktualisieren danach", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.locator("#refreshBtn").click();
    await expect(page.locator("#refreshBtn")).toHaveClass(/is-loading/);
    await expect(page.locator("#overviewPage.page.active .panel").first()).toHaveClass(/is-refreshing/);
    await expect(page.locator("#refreshProgress")).toHaveCount(0);
    await expect(page.locator("#refreshBtn")).toHaveClass(/is-done/, { timeout: 800 });
    await expect(page.locator("#refreshDone")).toHaveText("aktualisiert");
    await expect(page.locator("#overviewPage .panel").first()).not.toHaveClass(/is-refreshing/);
    await expect(page.locator("#refreshBtn")).not.toHaveClass(/is-done/, { timeout: 800 });
    await expect(page.locator("#refreshBtnFace")).toBeVisible();
    await expect(page.locator("#refreshBtn")).toBeEnabled();
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
    await expect(overlay.locator('.widget-option[data-widget="weather-now"] .widget-option-state')).toHaveText("+");
    await expect(overlay.locator('.widget-option[data-widget="weather-now"] .widget-option-count')).toHaveText("1");
    await page.locator("#widgetPickerClose").click();
    await expect(overlay).not.toHaveClass(/show/);

    await switchLanguage(page, "en");
    await page.locator('#overviewPage [data-widget-action="add"]').click();
    await expect(overlay).toHaveClass(/show/);
    await expect(overlay.locator(".panel-title")).toHaveText("Add widget");
    await expect(overlay.getByText("Calendar & organisation")).toBeVisible();
    await expect(overlay.getByText("Current weather")).toBeVisible();
  });

  test("bindet dasselbe Widget mehrfach zum Vergleich ein", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await addOverviewWidget(page, "weather-now");
    await expect(page.locator("#ov-weather-now--i2")).toBeVisible();
    await page.locator("#ov-weather-now--i2 .weather-search input").fill("Lissabon");
    await page.locator("#ov-weather-now--i2 .weather-search button").click();
    await expect(page.locator("#ov-weather-now--i2 [id^='weatherPlaceName']")).toHaveText(/Lissabon/);
    await expect(page.locator("#weatherPlaceName")).toHaveText("Berlin");

    await addOverviewWidget(page, "water-chart");
    await expect(page.locator("#ov-water-chart--i2")).toBeVisible();
    await page.locator("#ov-water-chart--i2 .water-search input").fill("Dresden");
    await page.locator("#ov-water-chart--i2 .water-search button").click();
    await expect(page.locator("#ov-water-chart--i2 [id^='waterChartTitle']")).toContainText("Dresden");
    await expect(page.locator("#waterChartTitle")).not.toContainText("Dresden");
  });

  test("öffnet Gegen Langeweile mit Spielkacheln", async ({ page }) => {
    await openWithLang(page, "/", "de");
    const boredom = page.locator("#boredomLink");
    const docs = page.locator("#docsLink");
    await expect(boredom).toHaveText("Gegen Langeweile");
    const boredomBox = await boredom.boundingBox();
    const docsBox = await docs.boundingBox();
    expect(boredomBox.y).toBeLessThan(docsBox.y);
    await boredom.click();
    await expect(page.locator("#boredomPage")).toHaveClass(/active/);
    await expect(page.locator("#boredomLink")).toHaveClass(/active/);
    await expect(page.locator("#boredomPicker")).toBeVisible();
    await expect(page.locator('#boredomPicker [data-game="boredomKlondike"]')).toContainText("Klondike Solitaire");
    await expect(page.locator('#boredomPicker [data-game="boredomTictactoe"]')).toContainText("Tic Tac Toe");
    await expect(page.locator("#boredomKlondike")).toBeHidden();
    await page.locator('#boredomPicker [data-game="boredomKlondike"]').click();
    await expect(page.locator("#boredomPicker")).toBeHidden();
    await expect(page.locator("#boredomGame")).toBeVisible();
    await expect(page.locator("#boredomGame")).toHaveAttribute("src", /solitaire-online\.com\/embed\/klondike/);
    await page.locator("#boredomBack").click();
    await expect(page.locator("#boredomPicker")).toBeVisible();
    await page.locator('#boredomPicker [data-game="boredomTictactoe"]').click();
    await expect(page.locator("#boredomTictactoe")).toBeVisible();
    await expect(page.locator("#JFWebsiteWidget-01a1079cec1870008d80ca784681b127ad71")).toBeVisible();
    await switchLanguage(page, "en");
    await expect(page.locator("#boredomLink")).toHaveText("Against boredom");
    await expect(page.locator("#boredomBack")).toHaveText("← Games");
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
    const dialogBox = await overlay.locator(".changelog-dialog").boundingBox();
    expect(dialogBox.width).toBeGreaterThan(900);
    expect(dialogBox.width).toBeLessThanOrEqual(1120);
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
    await expect(grid.locator("#ov-fire-chart .bar-col")).not.toHaveCount(0);
    await expect(grid.locator("#ov-water-chart .water-chart")).toBeVisible();

    await expect(grid.locator("#ov-water-chart .water-item")).not.toHaveCount(0);
    await page.locator("#ov-water-chart .water-search input").fill("Dresden");
    await page.locator("#ov-water-chart .water-search button").click();
    await expect(page.locator("#waterChartTitle")).toContainText("Dresden");
  });

  test("setzt die Übersicht auf die Standard-Widgets zurück", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await addOverviewWidget(page, "notes");
    await expect(page.locator("#overviewGrid .ov-widget")).toHaveCount(4);
    await page.locator('#overviewPage [data-widget-action="arrange"]').click();
    await expect(page.locator("body")).toHaveClass(/layout-editing/);
    await page.locator('#overviewPage [data-widget-action="reset"]').click();
    await expect(page.locator("#resetConfirmOverlay")).toHaveClass(/show/);
    await expect(page.locator("#resetConfirmText")).toContainText("Standard-Widgets");
    await page.locator("#resetConfirmOk").click();
    await expect(page.locator("#overviewGrid .ov-widget")).toHaveCount(3);
    await expect(page.locator("#ov-weather-now")).toBeVisible();
    await expect(page.locator("#ov-fire-chart")).toBeVisible();
    await expect(page.locator("#ov-water-chart")).toBeVisible();
    await expect(page.locator("#ov-notes")).toHaveCount(0);
    await expect(page.locator("#overviewEmpty")).toBeHidden();
  });

  test("skaliert Widgets in Breite und Höhe", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.locator('#overviewPage [data-widget-action="arrange"]').click();
    await expect(page.locator("body")).toHaveClass(/layout-editing/);

    async function grow(selector, { checkHeight = true } = {}) {
      const tile = page.locator(selector).first();
      await expect(tile).toBeVisible();
      const before = await tile.boundingBox();
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const r = el.getBoundingClientRect();
        el.style.setProperty("--layout-w", `${Math.round(r.width + 80)}px`);
        el.style.setProperty("--layout-h", `${Math.round(r.height + 60)}px`);
        el.dataset.layoutW = "";
        el.dataset.layoutH = "";
      }, selector);
      const after = await tile.boundingBox();
      expect(after.width, selector).toBeGreaterThan(before.width + 40);
      if (checkHeight) expect(after.height, selector).toBeGreaterThan(before.height + 30);
    }

    await addOverviewWidget(page, "notes");
    await grow("#ov-notes", { checkHeight: false });
    await grow("#ov-weather-now", { checkHeight: false });

    await openPage(page, "disasterPage");
    await grow("#disasterWarnPanel");
    await openPage(page, "weatherPage");
    await grow("#weatherTempCard");
    await openPage(page, "firePage");
    await grow("#fireChartPanel");
    await grow("#fireTotalCard");
    await openPage(page, "waterPage");
    const waterPlot = page.locator("#waterPage #waterChart");
    const plotBefore = await waterPlot.boundingBox();
    await grow("#waterChartPanel");
    const plotAfter = await waterPlot.boundingBox();
    const panelAfter = await page.locator("#waterChartPanel").boundingBox();
    expect(panelAfter.width).toBeGreaterThan(plotBefore.width + 40);
    expect(plotAfter.height).toBeGreaterThan(plotBefore.height + 20);
  });

  test("lässt nach Zurücksetzen der Wetterseite die Breite ändern", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.setViewportSize({ width: 1400, height: 900 });
    await openPage(page, "weatherPage");
    await page.locator('#weatherPage [data-widget-action="arrange"]').click();
    await expect(page.locator("body")).toHaveClass(/layout-editing/);
    await page.locator('#weatherPage [data-widget-action="reset"]').click();
    await expect(page.locator("#resetConfirmOverlay")).toHaveClass(/show/);
    await page.locator("#resetConfirmOk").click();
    await expect(page.locator("#resetConfirmOverlay")).not.toHaveClass(/show/);
    const tile = page.locator("#weatherPanel");
    await expect(tile).toBeVisible();
    const before = await tile.boundingBox();
    await page.evaluate(() => {
      const el = document.getElementById("weatherPanel");
      const r = el.getBoundingClientRect();
      el.style.setProperty("--layout-w", `${Math.round(r.width + 80)}px`);
      el.dataset.layoutW = "";
    });
    const after = await tile.boundingBox();
    expect(after.width).toBeGreaterThan(before.width + 40);
  });

  test("packt kleine Kacheln in den Raum neben großen Widgets", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.setViewportSize({ width: 1400, height: 900 });
    await openPage(page, "weatherPage");
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    const weather = await page.locator("#weatherPage #weatherPanel").boundingBox();
    const temp = await page.locator("#weatherTempCard").boundingBox();
    const radar = await page.locator("#radarPanel").boundingBox();
    const overlapWeather = Math.min(temp.y + temp.height, weather.y + weather.height) - Math.max(temp.y, weather.y);
    const overlapRadar = Math.min(temp.y + temp.height, radar.y + radar.height) - Math.max(temp.y, radar.y);
    expect(overlapWeather > 40 || overlapRadar > 40).toBeTruthy();
  });

  test("zeigt Kennzahlen als einzelne Widgets mit Überschrift", async ({ page }) => {
    await openWithLang(page, "/", "de");

    await openPage(page, "weatherPage");
    await expect(page.locator("#weatherKpiRow")).toHaveCount(0);
    await expect(page.locator("#weatherTempCard > .panel-title")).toHaveText("Temperatur");
    await expect(page.locator("#weatherWindCard > .panel-title")).toHaveText("Wind");
    await expect(page.locator("#weatherHumidityCard > .panel-title")).toHaveText("Luftfeuchte");
    await expect(page.locator("#weatherRainCard > .panel-title")).toHaveText("Regenchance heute");

    await openPage(page, "firePage");
    await expect(page.locator("#fireStats")).toHaveCount(0);
    await expect(page.locator("#fireYesterdayCard > .panel-title")).toHaveText("Brände vom Vortag");
    await expect(page.locator("#fireTotalCard > .panel-title")).toHaveText("Brandeinsätze (7 Tage)");
    await expect(page.locator("#fireAvgCard > .panel-title")).toHaveText("Ø pro Tag");
    await expect(page.locator("#firePeakCard > .panel-title")).toHaveText("Spitzentag");
    await expect(page.locator("#fireResponseCard > .panel-title")).toHaveText("Eintreffzeit 1. Löschfahrzeug");

    await openPage(page, "waterPage");
    await expect(page.locator("#waterStats")).toHaveCount(0);
    await expect(page.locator("#waterLevelCard > .panel-title")).toHaveText("Wasserstand");
    await expect(page.locator("#waterStateCard > .panel-title")).toHaveText("Einordnung");
    await expect(page.locator("#waterRangeCard > .panel-title")).toHaveText("Spanne 7 Tage");
    await expect(page.locator("#waterTimeCard > .panel-title")).toHaveText("Letzte Messung");

    await openPage(page, "overviewPage");
    await addOverviewWidget(page, "weather-temp");
    await expect(page.locator("#ov-weather-temp > .panel-title")).toHaveText("Temperatur");
    await expect(page.locator("#ov-weather-temp .stat-value")).toBeVisible();
  });

  test("hält Notizen und Radar kompakt", async ({ page }) => {
    await openWithLang(page, "/", "de");
    const pageBox = await page.locator(".main-content").boundingBox();
    const ovWeather = await page.locator("#ov-weather-now").boundingBox();
    const water = await page.locator("#ov-water-chart").boundingBox();
    expect(water.width).toBeGreaterThan(500);
    expect(water.width).toBeLessThan(pageBox.width * 0.95);

    await addOverviewWidget(page, "notes");
    const notesBox = await page.locator("#ov-notes").boundingBox();
    expect(notesBox.width).toBeLessThan(pageBox.width * 0.5);

    await openPage(page, "weatherPage");
    const weatherPanel = await page.locator("#weatherPage #weatherPanel").boundingBox();
    expect(Math.abs(ovWeather.width - weatherPanel.width)).toBeLessThan(320);
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
    expect(radar.y + radar.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 24);
    expect(weather.y + weather.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 24);
    expect(radar.x).toBeGreaterThanOrEqual(pageBox.x - 3);
    expect(bars.x + bars.width).toBeLessThanOrEqual(forecast.x + forecast.width + 2);
    expect(forecast.width).toBeGreaterThanOrEqual(250);
    const overlapX = Math.min(radar.x + radar.width, forecast.x + forecast.width) - Math.max(radar.x, forecast.x);
    const overlapY = Math.min(radar.y + radar.height, forecast.y + forecast.height) - Math.max(radar.y, forecast.y);
    expect(overlapX <= 0 || overlapY <= 0).toBeTruthy();
    const map = await page.locator("#radarPanel .map-wrap").boundingBox();
    expect(map.height).toBeGreaterThanOrEqual(240);
    expect(map.width).toBeGreaterThanOrEqual(210);
    expect(weather.x).toBeLessThanOrEqual(radar.x + 3);
  });

  test("holt Kacheln zurück in den Sichtbereich", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "weatherPage");
    await page.evaluate(() => {
      const el = document.getElementById("weatherPanel");
      el.style.setProperty("--layout-w", "2400px");
      el.dataset.layoutW = "";
      window.dispatchEvent(new Event("resize"));
    });
    await expect.poll(async () => {
      return page.locator("#weatherPanel").evaluate((el) => el.getBoundingClientRect().width);
    }).toBeLessThan(1400);
    const pageBox = await page.locator("#weatherPage").boundingBox();
    const radar = await page.locator("#radarPanel").boundingBox();
    expect(radar.y + radar.height).toBeLessThanOrEqual(pageBox.y + pageBox.height + 24);
    expect(radar.x).toBeGreaterThanOrEqual(pageBox.x - 3);
  });

  test("lässt den Widget-Platzhalter schmal", async ({ page }) => {
    await openWithLang(page, "/", "de");
    const ovSlot = page.locator("#overviewPage .widget-slot").first();
    await expect(ovSlot).toBeVisible();
    const ovBox = await ovSlot.boundingBox();
    expect(ovBox.width).toBeLessThan(240);

    await openPage(page, "disasterPage");
    const pageBox = await page.locator(".main-content").boundingBox();
    const slot = page.locator("#disasterPage > .overview-grid > .widget-slot");
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
    const comboBox = await page.locator("#waterPage #waterChartPanel").boundingBox();
    const berlinInside = await page.locator("#waterPage #waterChartPanel .water-combo-berlin").evaluate((el) => {
      const combo = el.closest(".water-combo");
      const c = combo.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const list = el.querySelector(".water-list");
      const listMax = list ? getComputedStyle(list).maxHeight : "";
      const listOverflow = list ? getComputedStyle(list).overflowY : "";
      return {
        right: b.right <= c.right + 2,
        bottom: b.bottom <= c.bottom + 2,
        listScrolls: listOverflow === "auto" || listOverflow === "scroll" || (listMax && listMax !== "none"),
      };
    });
    expect(berlinInside.right).toBeTruthy();
    expect(berlinInside.bottom || berlinInside.listScrolls).toBeTruthy();
    const sideBySide = await page.locator("#waterPage #waterChartPanel").evaluate((combo) => {
      const plot = combo.querySelector(".water-chart");
      const berlin = combo.querySelector(".water-combo-berlin");
      const p = plot.getBoundingClientRect();
      const b = berlin.getBoundingClientRect();
      return b.left >= p.right - 8;
    });
    expect(sideBySide).toBeTruthy();
    const pegelBtns = page.locator("#waterBerlinList .water-item");
    await expect(pegelBtns).not.toHaveCount(0);
    const fit = await pegelBtns.evaluateAll((els) => {
      const listW = els[0].parentElement.getBoundingClientRect().width;
      return els.map((el) => {
        const name = el.querySelector(".water-item-name");
        const r = el.getBoundingClientRect();
        return {
          fullWidth: Math.abs(r.width - listW) < 2,
          truncated: name.scrollWidth > name.clientWidth + 1,
        };
      });
    });
    expect(fit.every((row) => row.fullWidth && !row.truncated)).toBeTruthy();
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

  test("nutzt kompakte Schrift bis Full HD und große Schrift darüber", async ({ page }) => {
    const bodySize = () => page.locator("body").evaluate((el) => getComputedStyle(el).fontSize);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await openWithLang(page, "/", "de");
    expect(await bodySize()).toBe("15px");

    await page.setViewportSize({ width: 1921, height: 1080 });
    expect(await bodySize()).toBe("23px");

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await bodySize()).toBe("15px");
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
    const cardSize = await page.locator(".docs-card").first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(cardSize).toBe("12px");
    await page.setViewportSize({ width: 1921, height: 1080 });
    expect(await page.locator(".docs-card").first().evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");

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
