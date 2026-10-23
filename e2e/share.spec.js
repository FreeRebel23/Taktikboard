import { test, expect } from "@playwright/test";
import { card, collectErrors } from "./helpers.js";
import { readFileSync } from "node:fs";

test("Teilen: Link öffnet die Spielerinnen-Ansicht; Spielerin übernimmt den Zug", async ({ page, context }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await card(page, "Pick & Roll – Show oder Switch").getByRole("button", { name: "Teilen" }).click();
  const link = page.getByLabel("Link zum Spielzug");
  await expect(link).toHaveValue(/#p=1\.[\w-]+&v=player$/);
  const url = await link.inputValue();

  const p2 = await context.newPage();
  const noErrors2 = collectErrors(p2);
  await p2.goto(url);
  await expect(p2.getByText("Geteilter Spielzug")).toBeVisible();
  await expect(p2.getByText("Wähle deine Position")).toBeVisible();
  await p2.getByTitle("In meine Spielzüge übernehmen").click();
  await expect(p2.getByText("In deinen Spielzügen gespeichert")).toBeVisible();
  await p2.getByTitle("Zur Übersicht").click();
  await expect(p2.getByRole("heading", { name: "Pick & Roll – Show oder Switch" })).toHaveCount(2); // Beispiel + eigene Kopie
  noErrors(); noErrors2();
});

test("Kaputter Link: verständliche Meldung statt Absturz", async ({ page }) => {
  await page.goto("/#p=1.kaputt");
  await expect(page.getByRole("alert")).toContainText("Der Link konnte nicht geöffnet werden");
});

test("Import einer Spielzug-Datei und Sicherung herunterladen", async ({ page }, info) => {
  const file = info.outputPath("pickroll.taktik.json");
  const { pickRoll } = await import("../src/play/plays/pickRoll.js");
  (await import("node:fs")).writeFileSync(file, JSON.stringify({ ...pickRoll, id: "my_import1", name: "Importierter Zug" }));
  await page.goto("/");
  await page.setInputFiles('input[type=file]', file);
  await expect(page.getByText(/1 Spielzug importiert/)).toBeVisible();
  await expect(card(page, "Importierter Zug")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sicherung herunterladen" }).click();
  const d = await download;
  const data = JSON.parse(readFileSync(await d.path(), "utf8"));
  expect(data.format).toBe("taktikboard-backup");
  expect(data.plays.map((p) => p.name)).toContain("Importierter Zug");
});

test("QR-Code: App-Adresse und Hinweis, dass localhost nicht teilbar ist", async ({ page }) => {
  const noErrors = collectErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "App teilen" }).click();
  await expect(page.getByRole("img", { name: "QR-Code der App-Adresse" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("localhost");
  await page.getByRole("button", { name: "Schließen" }).click();

  await card(page, "Press Break – Full Court").getByRole("button", { name: "Teilen" }).click();
  await expect(page.getByRole("dialog", { name: "Spielzug teilen" }).getByRole("alert")).toContainText("localhost");
  await page.getByTitle("QR-Code zeigen").click();
  // Großer Spielzug → ehrlicher Hinweis statt unlesbarem QR-Code
  await expect(page.getByText(/zu groß/).or(page.getByRole("img", { name: /QR-Code für/ }))).toBeVisible();
  noErrors();
});
