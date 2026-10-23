/* End-to-End-Tests (Playwright). Lokal: `npm run e2e` (Chromium).
 * WebKit-Profile (iPhone/iPad, Safari-Engine) laufen, wenn E2E_WEBKIT=1 gesetzt ist –
 * in CI nach `npx playwright install --with-deps webkit`. */
import { defineConfig, devices } from "@playwright/test";

const webkit = !!process.env.E2E_WEBKIT;
const chromeOnly = process.env.E2E_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM_PATH } } : {};

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,                        // Flakes sollen auffallen, nicht verdeckt werden
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    serviceWorkers: "block",          // reproduzierbar; Offline-Test aktiviert ihn gezielt
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], ...chromeOnly } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1180, height: 820 }, hasTouch: true, ...chromeOnly } },
    ...(webkit ? [
      { name: "iphone-webkit", use: { ...devices["iPhone 13"] } },
      { name: "ipad-webkit", use: { ...devices["iPad (gen 7) landscape"] } },
    ] : []),
  ],
});
