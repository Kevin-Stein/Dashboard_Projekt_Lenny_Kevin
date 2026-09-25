const { test, expect } = require("@playwright/test");
const { openWithLang, openPage, addOverviewWidget, addPageWidget } = require("./helpers");

const PAYLOADS = [
  "<script>alert(1)</script>",
  '<img src=x onerror=alert(1)>',
  "<svg onload=alert(1)>",
  '"><img src=x onerror=alert(1)>',
  "</textarea><script>alert(1)</script>",
  "javascript:alert(1)",
  "{{constructor.constructor('alert(1)')()}}",
];

async function watchDialogs(page) {
  const seen = [];
  page.on("dialog", async (dialog) => {
    seen.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });
  return seen;
}

async function assertNotExecuted(page, seen) {
  expect(seen, "Es darf kein alert/prompt/confirm erscheinen").toEqual([]);
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.locator("svg[onload], iframe[src^='javascript']")).toHaveCount(0);
  const injected = await page.evaluate(() =>
    [...document.querySelectorAll("script")].some((s) => /alert\s*\(/.test(s.textContent || "")),
  );
  expect(injected, "Nutzereingabe darf kein Script-Element erzeugen").toBe(false);
}

test.describe("Code-Injection", () => {
  test("Treffpunkt, Notizen und Aufgaben speichern Payloads nur als Text", async ({ page }) => {
    const seen = await watchDialogs(page);
    await openWithLang(page, "/", "de");
    await openPage(page, "disasterPage");

    const meeting = page.locator("#meetingPointInput");
    for (const payload of PAYLOADS) {
      await meeting.fill(payload);
      await expect.poll(() => page.evaluate(() => localStorage.getItem("dashboard-meeting-point"))).toBe(payload);
      await expect(meeting).toHaveValue(payload);
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await openPage(page, "disasterPage");
    await expect(meeting).toHaveValue(PAYLOADS[PAYLOADS.length - 1]);
    await assertNotExecuted(page, seen);

    await openPage(page, "overviewPage");
    await addOverviewWidget(page, "todo");
    const todo = page.locator("#ov-todo");
    await todo.locator("#todoAddInput").fill(PAYLOADS[1]);
    await todo.locator("#todoAddForm").press("Enter");
    await expect(todo.locator(".todo-item span")).toHaveText(PAYLOADS[1]);
    await expect(todo.locator(".todo-item span img")).toHaveCount(0);

    await addOverviewWidget(page, "notes");
    const notes = page.locator("#ov-notes .notes-area");
    await notes.fill(PAYLOADS[4]);
    await expect(page.locator("#ov-notes #notesSaved")).toHaveText("Gespeichert", { timeout: 2000 });
    await expect(notes).toHaveValue(PAYLOADS[4]);
    await expect(page.locator("#ov-notes script")).toHaveCount(0);
    await assertNotExecuted(page, seen);
  });

  test("Kalender und Countdown rendern Payloads nicht als HTML", async ({ page }) => {
    const seen = await watchDialogs(page);
    await openWithLang(page, "/", "de");
    await openPage(page, "disasterPage");

    const cal = await addPageWidget(page, "disasterPage", "calendar");
    await cal.locator(".cal-add").evaluate((form, title) => {
      form.querySelector(".cal-add-input").value = title;
      form.querySelector(".cal-all-day-input").checked = true;
      form.querySelector(".cal-all-day-input").dispatchEvent(new Event("change", { bubbles: true }));
      form.requestSubmit();
    }, PAYLOADS[1]);
    await expect(cal.locator(".event-name")).toHaveText(PAYLOADS[1]);
    await expect(cal.locator(".event-name img")).toHaveCount(0);

    const cd = await addPageWidget(page, "disasterPage", "countdown");
    await cd.locator("#cdTitle").fill(PAYLOADS[0]);
    await cd.locator("#cdDate").fill("2099-12-31");
    await cd.locator("#cdSave").click();
    await expect(cd.locator(".countdown-title")).toHaveText(PAYLOADS[0]);
    await expect(cd.locator(".countdown-title script")).toHaveCount(0);
    await assertNotExecuted(page, seen);
  });

  test("Suchfelder und Warnungsfilter führen Payloads nicht aus", async ({ page }) => {
    const seen = await watchDialogs(page);
    await openWithLang(page, "/", "de");
    const img = PAYLOADS[1];

    await openPage(page, "weatherPage");
    await page.locator("#weatherSearchInput").fill(img);
    await page.locator("#weatherSearchForm").press("Enter");
    await expect(page.locator("#weatherPlaceName")).toContainText(img);
    await expect(page.locator("#weatherPlaceName img")).toHaveCount(0);
    await expect(page.locator("#sidebarPlaceName")).toContainText(img);

    await page.locator("#weatherSearchInput").fill(PAYLOADS[0]);
    await page.locator("#weatherSearchForm").press("Enter");
    await expect(page.locator("#weatherPlaceName")).toContainText(PAYLOADS[0]);
    await expect(page.locator("#weatherPlace script")).toHaveCount(0);

    await openPage(page, "radarPage");
    await page.locator("#radarInput").fill(img);
    await page.locator("#radarForm").press("Enter");
    await expect(page.locator("#toast img, #map script")).toHaveCount(0);

    await openPage(page, "disasterPage");
    await page.locator("#disasterWarnSearchInput").fill(img);
    await page.locator("#disasterWarnSearchForm").press("Enter");
    await expect(page.locator("#disasterWarnList .warn-empty")).toContainText(img);
    await expect(page.locator("#disasterWarnList img")).toHaveCount(0);

    await openPage(page, "waterPage");
    await page.locator("#waterSearchInput").fill(img);
    await page.locator("#waterSearchForm").press("Enter");
    await expect(page.locator("#toast")).toHaveClass(/show/);
    await expect(page.locator("#toast img")).toHaveCount(0);
    await assertNotExecuted(page, seen);
  });
});
