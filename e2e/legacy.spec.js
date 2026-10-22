import { test, expect } from "@playwright/test";
import { collectErrors } from "./helpers.js";

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
