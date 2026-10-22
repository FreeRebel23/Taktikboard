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
  await page.getByRole("button", { name: "Oder eine Variante direkt ansehen" }).click();
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

test("Read-Training: Verteidigung ansehen, entscheiden, Rückmeldung, Lösung läuft weiter", async ({ page }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await openFromHome(page, "Press Break – Full Court", "Als Spielerin");
  await expect(page.getByText("Tippe deine Nummer an.")).toBeVisible();
  await page.getByTitle("Ich bin 5").click();
  const weiter = page.getByRole("button", { name: /Weiter|läuft/ });
  await expect(weiter).toBeInViewport();                       // Steuerung bleibt am Handy sichtbar
  await page.getByTitle("Alles abspielen").click();             // stoppt am Read
  await page.getByRole("button", { name: "▶ Verteidigung ansehen und entscheiden" }).click({ timeout: 15000 });
  await expect(page.getByText("Schau genau auf")).toBeVisible();
  await expect(page.locator('svg text:text-is("ZIEL")')).toHaveCount(0);   // nichts verraten
  await expect(page.getByText("Was machst du jetzt?")).toBeVisible({ timeout: 6000 });
  await page.getByRole("button", { name: /^A · / }).click();
  await expect(page.getByRole("status").filter({ hasText: /Richtig gelesen|Nicht ganz/ })).toBeVisible();
  await expect(page.getByText(/^Lösung: /)).toBeVisible();
  await page.getByRole("button", { name: "▶ Lösung ansehen" }).click();
  await expect(weiter).toHaveText("läuft …");
  await expect(weiter).toHaveText(/Weiter/, { timeout: 6000 });
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("taktikboard.readlog.v1")));
  expect(log).toHaveLength(1);
  expect(typeof log[0].correct).toBe("boolean");

  // Hilfe/Legende, Zeitlupe, Schritt nochmal
  await page.getByTitle("Hilfe und Legende").click();
  await expect(page.getByRole("dialog", { name: "So liest du das Feld" })).toBeVisible();
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.getByTitle("Zeitlupe").click();
  await expect(page.getByTitle("Normale Geschwindigkeit")).toBeVisible();
  await page.getByTitle("Schritt nochmal").click();
  await expect(weiter).toHaveText("läuft …");
  noErrors();
});

test("Read-Training-Protokoll erscheint auf dem Startbildschirm und lässt sich exportieren", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("taktikboard.readlog.v1", JSON.stringify([
    { at: "2026-10-01T10:00:00Z", play: "Press Break", me: "5", read: "X3", shown: "zu", answer: "Lob", correct: true },
    { at: "2026-10-01T10:01:00Z", play: "Press Break", me: "1", read: "X3", shown: "Mitte", answer: "Lob", correct: false },
  ])));
  await page.reload();
  await expect(page.getByText("2 Antworten auf diesem Gerät, davon 1 richtig.")).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Als Tabelle herunterladen" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^read-training-.*\.csv$/);
  await page.getByRole("button", { name: "Zurücksetzen" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Zurücksetzen" }).click();
  await expect(page.getByText("Read-Training")).toHaveCount(0);
});
