const { test, expect } = require("@playwright/test");
const { openWithLang, openPage, addOverviewWidget } = require("./helpers");

const NAV = ["overviewPage", "weatherPage", "radarPage", "disasterPage", "firePage", "waterPage"];

test.describe("Belastung", () => {
  test.describe.configure({ timeout: 60_000 });

  test("hält schnelles Umschalten aller Seiten aus", async ({ page }) => {
    await openWithLang(page, "/", "de");
    for (let round = 0; round < 8; round++) {
      for (const target of NAV) {
        await page.locator(`#sidebarNav .nav-item[data-target="${target}"]`).click();
      }
    }
    await expect(page.locator("#waterPage")).toHaveClass(/active/);
    await expect(page.locator("#langSelect")).toBeVisible();
    await expect(page.locator(".page.active .overview-title")).toBeVisible();
  });

  test("hält schnelles Umschalten von Theme, Menü und Widget-Auswahl aus", async ({ page }) => {
    await openWithLang(page, "/", "de");
    for (let i = 0; i < 20; i++) await page.locator("#themeToggle").click();
    await expect(page.locator("#themeToggle")).toBeVisible();

    for (let i = 0; i < 15; i++) {
      await page.locator('#overviewPage [data-widget-action="add"]').click();
      await expect(page.locator("#widgetPickerOverlay")).toHaveClass(/show/);
      await page.locator("#widgetPickerClose").click();
      await expect(page.locator("#widgetPickerOverlay")).not.toHaveClass(/show/);
    }

    for (let i = 0; i < 12; i++) {
      await page.locator('#overviewPage [data-widget-action="arrange"]').click();
    }
    await expect(page.locator('#overviewPage [data-widget-action="arrange"]')).toBeVisible();
  });

  test("leere Formulare und lange Texte bringen die Oberfläche nicht zum Absturz", async ({ page }) => {
    await openWithLang(page, "/", "de");
    const huge = `${"A".repeat(4000)} <img src=x onerror=alert(1)> äöüß`;

    await openPage(page, "weatherPage");
    for (let i = 0; i < 8; i++) await page.locator("#weatherSearchForm").press("Enter");
    await page.locator("#weatherSearchInput").fill(huge);
    await page.locator("#weatherSearchForm").press("Enter");
    await expect(page.locator("#weatherLoading")).toContainText("Kein Ort namens");

    await openPage(page, "radarPage");
    for (let i = 0; i < 8; i++) await page.locator("#radarForm").press("Enter");
    await page.locator("#radarInput").fill(huge);
    await page.locator("#radarForm").press("Enter");

    await openPage(page, "disasterPage");
    await page.locator("#disasterWarnSearchInput").fill(huge);
    for (let i = 0; i < 8; i++) await page.locator("#disasterWarnSearchForm").press("Enter");
    await expect(page.locator("#disasterWarnList .warn-empty")).toBeVisible();
    await page.locator("#meetingPointInput").fill(huge);
    await expect(page.locator("#meetingSaved")).toHaveText("Gespeichert", { timeout: 2000 });

    await openPage(page, "waterPage");
    for (let i = 0; i < 8; i++) await page.locator("#waterSearchForm").press("Enter");
    await page.locator("#waterSearchInput").fill(huge);
    await page.locator("#waterSearchForm").press("Enter");
    await expect(page.locator("#toast")).toHaveClass(/show/);

    await expect(page.locator("#langSelect")).toBeVisible();
  });

  test("hält viele Aufgaben und schnelles Hinzufügen/Entfernen von Widgets aus", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await addOverviewWidget(page, "todo");
    const todo = page.locator("#ov-todo");
    for (let i = 1; i <= 40; i++) {
      await todo.locator("#todoAddInput").fill(`Aufgabe ${i}`);
      await todo.locator("#todoAddForm").press("Enter");
    }
    await expect(todo.locator(".todo-item")).toHaveCount(40);
    for (let i = 0; i < 10; i++) await todo.locator(".todo-item button").first().click();
    await expect(todo.locator(".todo-item")).toHaveCount(30);

    const extras = ["notes", "calendar", "countdown", "clock", "radar"];
    for (const type of extras) await addOverviewWidget(page, type);
    for (const type of extras) {
      await page.locator(`#ov-${type} .ov-remove`).click({ force: true });
      await expect(page.locator(`#ov-${type}`)).toHaveCount(0);
    }
    await expect(page.locator("#ov-todo")).toBeVisible();
  });

  test("hält wiederholtes Aktualisieren und Sprachwechsel aus", async ({ page }) => {
    await openWithLang(page, "/", "de");
    for (let i = 0; i < 8; i++) {
      await page.locator("#refreshBtn").click();
      await page.locator("#autoRefreshToggle").click();
    }
    await expect(page.locator("#refreshBtn")).toBeVisible();

    await switchLangLoop(page, 4);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator("#overviewPage .overview-title")).toHaveText("Meine Übersicht");
  });
});

async function switchLangLoop(page, times) {
  const { switchLanguage } = require("./helpers");
  for (let i = 0; i < times; i++) {
    await switchLanguage(page, i % 2 === 0 ? "en" : "de");
  }
}
