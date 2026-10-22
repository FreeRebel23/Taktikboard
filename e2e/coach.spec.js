import { test, expect } from "@playwright/test";
import { seek, openFromHome, caption, collectErrors } from "./helpers.js";

test("Startbildschirm zeigt Beispiele und leere eigene Liste", async ({ page }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Press Break – Full Court" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pick & Roll – Show oder Switch" })).toBeVisible();
  await expect(page.getByText("Noch keine eigenen Spielzüge")).toBeVisible();
  noErrors();
});

test("Trainer: Schritt, Varianten, Scrubbing, Analyse", async ({ page }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await openFromHome(page, "Press Break – Full Court");
  await expect(caption(page)).toContainText("Beat 1/6");
  await page.getByTitle("Nächster Beat").click();
  await expect(page.getByTitle("Abspielen")).toBeVisible({ timeout: 6000 }); // stoppt am Beat-Ende
  await expect(caption(page)).toContainText("Beat 1/6");

  await page.getByRole("button", { name: /B · X3 bleibt in der Mitte/ }).click();
  await seek(page, 5.0);
  await expect(caption(page)).toContainText("Trap – X3 bleibt Mitte");
  await page.getByRole("button", { name: /A · X3 stellt den Rückpass zu/ }).click();
  await seek(page, 5.0);
  await expect(caption(page)).toContainText("Beat 3/6 · Trap");

  await seek(page, 10.5);
  await page.getByTitle("Abspielen").click();
  await expect(caption(page)).toContainText("Beat 6/6", { timeout: 6000 });
  await expect(page.getByText(/ÜBERWUNDEN/).first()).toBeVisible();

  await page.getByTitle("Analyse-Ebenen").click();
  await expect(page.getByText("Keine Vorhersage des echten Spiels", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Passfenster", exact: true }).click();
  await expect(page.locator("[aria-label=Passfenster]")).toBeVisible();
  noErrors();
});
