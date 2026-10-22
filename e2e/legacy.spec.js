import { test, expect } from "@playwright/test";
import { collectErrors } from "./helpers.js";
import { readFileSync } from "node:fs";

test("Freies Board: Drag, Legacy-Preset, REC/Replay, Übernahme als Spielzug", async ({ page }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Freies Board" }).click();
  await page.getByRole("button", { name: "Ganzfeld" }).click();
  const tok = page.locator('svg g[style*="grab"] text:text-is("3")').first();
  const bb = await tok.boundingBox();
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 40, { steps: 6 }); await page.mouse.up();
  const bb2 = await tok.boundingBox();
  expect(Math.abs(bb2.x - bb.x - 60)).toBeLessThan(9);
  expect(Math.abs(bb2.y - bb.y - 40)).toBeLessThan(10);

  await page.getByRole("button", { name: "Halbfeld" }).click();
  await page.getByRole("button", { name: "Pick & Roll – Mitte" }).click();
  await page.getByRole("button", { name: "▶ Abspielen" }).click();
  await expect(page.getByRole("button", { name: "❚❚ Pause" })).toBeVisible();
  await page.getByRole("button", { name: "REC", exact: true }).click();
  await page.getByRole("button", { name: "■ Stop" }).click();
  await expect(page.getByRole("button", { name: "▶ Replay" })).toBeVisible();

  await page.getByRole("button", { name: /als neuen Spielzug übernehmen/ }).click();
  await expect(page.getByLabel("Name des Spielzugs")).toBeVisible();
  noErrors();
});

async function record(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Freies Board" }).click();
  await page.getByRole("button", { name: "Pick & Roll – Mitte" }).click();
  await page.getByRole("button", { name: "▶ Abspielen" }).click();
  await page.getByRole("button", { name: "REC", exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "■ Stop" }).click();
  await page.getByRole("button", { name: "✓ Speichern" }).click();
  await page.getByPlaceholder(/Name der Sequenz/).fill("Testaufnahme");
  await page.getByRole("button", { name: "Sichern" }).click();
}

test("REC-Aufnahme: Speichern wird bestätigt und landet in der Sicherung", async ({ page }) => {
  await record(page);
  await expect(page.getByRole("status").filter({ hasText: "„Testaufnahme“ gespeichert." })).toBeVisible();
  await page.getByRole("button", { name: /Zu den Spielzügen/ }).click();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Sicherung herunterladen" }).click()]);
  const backup = JSON.parse(readFileSync(await dl.path(), "utf8"));
  expect(backup.sequences.map((s) => s.name)).toEqual(["Testaufnahme"]);
});

test("REC-Aufnahme: Speicher voll → Fehlermeldung, Aufnahme bleibt erhalten", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "taktikboard.sequences.v1") { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
      return orig.call(this, k, v);
    };
  });
  await record(page);
  await expect(page.getByRole("alert")).toContainText("Nicht gespeichert: Der Speicher des Browsers ist voll");
  await expect(page.getByText(/gespeichert\.$/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sichern" })).toBeVisible();     // erneuter Versuch möglich
  await expect(page.getByRole("button", { name: "▶ Replay" })).toBeVisible();     // Aufnahme noch da
});
