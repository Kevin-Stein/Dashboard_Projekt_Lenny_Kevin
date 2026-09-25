const { test, expect } = require("@playwright/test");
const { openWithLang, switchLanguage } = require("./helpers");

const PAGES = [
  { target: "overviewPage", de: "Übersicht", en: "Overview" },
  { target: "weatherPage", de: "Wetter", en: "Weather" },
  { target: "radarPage", de: "Regenradar", en: "Rain radar" },
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

  test("wechselt den Farbmodus", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    await page.locator("#themeToggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("#themeToggle")).toContainText("Modus: Dunkel");
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
