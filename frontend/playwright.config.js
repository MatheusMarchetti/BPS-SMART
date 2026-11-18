import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: process.env.npm_lifecycle_event === "test:e2e:build" ? "npm run build && npm run preview" : "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    env: { BROWSER: "none" },
    timeout: 60_000,
  },
});
