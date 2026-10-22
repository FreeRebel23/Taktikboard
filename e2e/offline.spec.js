import { test, expect } from "@playwright/test";
import { openFromHome } from "./helpers.js";

test.use({ serviceWorkers: "allow" });

test("Offline: nach dem ersten Laden funktioniert die App ohne Netz", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "Service-Worker-Offline-Test nur in Chromium");
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await openFromHome(page, "Pick & Roll – Show oder Switch", "Als Spielerin");
  await page.getByTitle("Ich bin 5").click();
  await expect(page.getByText("Deine Aufgabe")).toBeVisible();
});
