const { defineConfig } = require("@playwright/test");

const PORT = process.env.PW_PORT || "3125";
const baseURL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["./tests/markdown-reporter.js"]],
  use: {
    baseURL,
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node dev-server.js",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
    env: { PORT },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
