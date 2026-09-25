const { test, expect } = require("@playwright/test");
const { openWithLang, openPage, addOverviewWidget, addPageWidget } = require("./helpers");

test.describe("Eingabefelder", () => {
  test("leeres Absenden ändert Wetter, Radar und Pegel nicht", async ({ page }) => {
    await openWithLang(page, "/", "de");

    await openPage(page, "weatherPage");
    const weatherPlace = await page.locator("#weatherPlaceName").textContent();
    await page.locator("#weatherSearchInput").fill("   ");
    await page.locator("#weatherSearchForm").press("Enter");
    await expect(page.locator("#weatherPlaceName")).toHaveText(weatherPlace);
    await expect(page.locator("#weatherLoading")).toHaveText("");

    await openPage(page, "radarPage");
    await page.locator("#radarInput").fill("");
    await page.locator("#radarForm").press("Enter");
    await expect(page.locator("#toast")).not.toHaveClass(/show/);

    await openPage(page, "waterPage");
    await page.locator("#waterSearchInput").fill("   ");
    await page.locator("#waterSearchForm").press("Enter");
    await expect(page.locator("#toast")).not.toHaveClass(/show/);
  });

  test("Wetter- und Radarsuche finden einen Ort und melden unbekannte Namen", async ({ page }) => {
    await openWithLang(page, "/", "de");

    await openPage(page, "weatherPage");
    await page.locator("#weatherSearchInput").fill("Hamburg");
    await page.locator("#weatherSearchForm").press("Enter");
    await expect(page.locator("#weatherPlaceName")).toHaveText("Hamburg, Deutschland");
    await expect(page.locator("#sidebarPlaceName")).toHaveText("Hamburg, Deutschland");

    await page.locator("#weatherSearchInput").fill("xyzzy");
    await page.locator("#weatherSearchForm").press("Enter");
    await expect(page.locator("#weatherLoading")).toContainText('Kein Ort namens "xyzzy" gefunden');

    await openPage(page, "radarPage");
    await page.locator("#radarInput").fill("Hamburg");
    await page.locator("#radarForm").press("Enter");
    await expect(page.locator("#radarInput")).toHaveValue("Hamburg");

    await page.locator("#radarInput").fill("keinort");
    await page.locator("#radarForm").press("Enter");
    await expect(page.locator("#toast")).toHaveClass(/show/);
    await expect(page.locator("#toast")).toContainText('Kein Ort namens "keinort" gefunden');

    await page.locator('#radarQuick button[data-city="Potsdam"]').click();
    await expect(page.locator("#radarInput")).toHaveValue("Potsdam");
  });

  test("Familien-Treffpunkt speichert Text inklusive Sonderzeichen", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "disasterPage");

    const input = page.locator("#meetingPointInput");
    await input.fill("<script>alert(1)</script> bei Oma");
    await expect(page.locator("#meetingSaved")).toHaveText("Gespeichert", { timeout: 2000 });
    await expect(input).toHaveValue("<script>alert(1)</script> bei Oma");

    page.once("dialog", () => {
      throw new Error("Unerwarteter Dialog – Eingabe darf nicht als Script laufen");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await openPage(page, "disasterPage");
    await expect(page.locator("#meetingPointInput")).toHaveValue("<script>alert(1)</script> bei Oma");
  });

  test("Warnungsfilter und Checkliste reagieren auf Eingaben", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "disasterPage");

    await expect(page.locator("#disasterWarnList .warn-item")).toHaveCount(2);
    await page.locator("#disasterWarnSearchInput").fill("Dresden");
    await page.locator("#disasterWarnSearchForm").press("Enter");
    await expect(page.locator("#disasterWarnList .warn-item")).toHaveCount(1);
    await expect(page.locator("#disasterWarnList .warn-title")).toHaveText("Hochwasser Dresden");

    await page.locator("#disasterWarnSearchInput").fill("xyzzy");
    await page.locator("#disasterWarnSearchForm").press("Enter");
    await expect(page.locator("#disasterWarnList .warn-empty")).toContainText('Keine Warnungen für "xyzzy" gefunden');

    const first = page.locator("#disasterChecklistList .todo-item").first();
    await expect(first).not.toHaveClass(/done/);
    await first.locator("input[type=checkbox]").evaluate((el) => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.locator("#disasterChecklistList .todo-item").first()).toHaveClass(/done/);
  });

  test("Pegel-Suche zeigt bekannten Pegel und weist unbekannte Namen zurück", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "waterPage");

    await expect(page.locator("#waterBerlinList .water-item")).not.toHaveCount(0);
    await page.locator("#waterSearchInput").fill("Dresden");
    await page.locator("#waterSearchForm").press("Enter");
    await expect(page.locator("#waterSearchInput")).toHaveValue("");
    await expect(page.locator("#waterChartTitle")).toContainText("Dresden");

    await page.locator("#waterSearchInput").fill("Atlantis");
    await page.locator("#waterSearchForm").press("Enter");
    await expect(page.locator("#toast")).toHaveClass(/show/);
    await expect(page.locator("#toast")).toContainText("Kein Pegel mit diesem Namen gefunden");
  });

  test("Aufgaben, Notizen, Kalender und Countdown nehmen Eingaben an", async ({ page }) => {
    await openWithLang(page, "/", "de");

    await addOverviewWidget(page, "todo");
    const todo = page.locator("#ov-todo");
    await todo.locator("#todoAddInput").fill("   ");
    await todo.locator("#todoAddForm").press("Enter");
    await expect(todo.locator(".todo-empty")).toBeVisible();
    await todo.locator("#todoAddInput").fill("Batterien kaufen");
    await todo.locator("#todoAddForm").press("Enter");
    await expect(todo.locator(".todo-item span")).toHaveText("Batterien kaufen");
    await expect(todo.locator("#todoAddInput")).toHaveValue("");
    await todo.locator(".todo-item input[type=checkbox]").check();
    await expect(todo.locator(".todo-item")).toHaveClass(/done/);
    await todo.locator(".todo-item button").click();
    await expect(todo.locator(".todo-empty")).toBeVisible();

    await addOverviewWidget(page, "notes");
    const notes = page.locator("#ov-notes .notes-area");
    await notes.fill("Notiz mit Umlauten: Straße, Größe");
    await expect(page.locator("#ov-notes #notesSaved")).toHaveText("Gespeichert", { timeout: 2000 });

    await openPage(page, "disasterPage");
    const cal = await addPageWidget(page, "disasterPage", "calendar");
    await cal.locator(".cal-add").evaluate((form) => {
      form.querySelector(".cal-add-input").value = "Probealarm";
      form.querySelector(".cal-all-day-input").checked = true;
      form.querySelector(".cal-all-day-input").dispatchEvent(new Event("change", { bubbles: true }));
      form.requestSubmit();
    });
    await expect(cal.locator(".event-name")).toHaveText("Probealarm");

    const cd = await addPageWidget(page, "disasterPage", "countdown");
    await cd.locator("#cdTitle").fill("Übungsende");
    await cd.locator("#cdDate").fill("2099-12-31");
    await cd.locator("#cdSave").click();
    await expect(cd.locator(".countdown-title")).toHaveText("Übungsende");
    await expect(cd.locator("#cdNumber")).not.toHaveText("–");
  });

  test("Radar-Anbieter und Auto-Aktualisierung lassen sich umschalten", async ({ page }) => {
    await openWithLang(page, "/", "de");
    await openPage(page, "radarPage");
    await page.locator("#radarProvider").selectOption("openweather");
    await expect(page.locator("#radarProvider")).toHaveValue("openweather");
    await expect(page.locator("#radarPlayback")).toBeHidden();

    await page.locator("#autoRefreshToggle").click();
    await expect(page.locator("#autoRefreshLabel")).toContainText("AUS");
  });
});
