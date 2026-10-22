import { test, expect } from "@playwright/test";
import { openFromHome, collectErrors } from "./helpers.js";

test("Spielerin: Position wählen, Aufgabe, Read, Lösung erst nach der Wahl, andere Variante", async ({ page }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await openFromHome(page, "Press Break – Full Court", "Als Spielerin");
  await expect(page.getByText("Wähle deine Position")).toBeVisible();
  await page.getByTitle("Ich bin 5").click();
  await expect(page.getByText("Deine Aufgabe")).toBeVisible();
  await expect(page.locator('svg text:text-is("DU")')).toHaveCount(1);

  const weiter = page.getByRole("button", { name: /Weiter/ });
  await weiter.click();
  await expect(weiter).toHaveText(/Weiter/, { timeout: 6000 });
  await weiter.click();
  await expect(page.getByText("Wohin geht X3?")).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("Lösung:")).toHaveCount(0);
  await page.getByRole("button", { name: /X3 stellt den Rückpass zu/ }).click();
  await expect(page.getByText("Lösung:")).toBeVisible();
  await expect(page.locator('svg text:has-text("ACHTE AUF")')).toHaveCount(1);

  await weiter.click();
  await expect(page.locator('svg text:text-is("ZIEL")')).toHaveCount(1, { timeout: 6000 });
  await page.getByTitle("Alles abspielen").click();
  await expect(page.getByRole("button", { name: "Andere Variante ansehen" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Andere Variante ansehen" }).click();
  await expect(page.getByText("Wohin geht X3?")).toBeVisible();
  noErrors();
});
