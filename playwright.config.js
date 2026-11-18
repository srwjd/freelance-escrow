import { defineConfig } from "@playwright/test";
export default defineConfig({
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port 5173",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: false,
      },
  testDir: "./tests",
  testMatch: "*.spec.js",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 12000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "docs/evidence/ui-results.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    headless: true,
    launchOptions: {
      executablePath: process.env.BROWSER_EXECUTABLE_PATH || (process.env.CI ? undefined : "/usr/bin/chromium"),
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
