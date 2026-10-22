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

test("Datenschutz: die App lädt nichts von fremden Servern", async ({ page }) => {
  const external = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) external.push(r.url()); });
  await page.goto("/");
  await page.locator("article").filter({ hasText: "Press Break" }).first().getByRole("button", { name: "Als Spielerin" }).click();
  await page.getByTitle("Ich bin 5").click();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.waitForTimeout(500);
  expect(external).toEqual([]);
});
