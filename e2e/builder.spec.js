import { test, expect } from "@playwright/test";
import { tapFigure, tapCourt, card, collectErrors } from "./helpers.js";

async function newFromTemplate(page, name, template = "Horns") {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Neuer Spielzug" }).click();
  await page.getByLabel("Name des neuen Spielzugs").fill(name);
  await page.getByRole("button", { name: new RegExp(template) }).first().click();
  await expect(page.getByLabel("Name des Spielzugs")).toHaveValue(name);
}

async function addCutAndPass(page) {
  await page.getByTitle("Beat 1").click();
  await tapFigure(page, "2");
  await page.getByRole("button", { name: "Cut", exact: true }).click();
  await tapCourt(page, 0.6, 0.25);
  await tapFigure(page, "1");
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  await tapFigure(page, "2");
  await expect(page.getByText("Aktionen in diesem Beat (2)")).toBeVisible();
}

test("Trainer erstellt Spielzug aus Vorlage, speichert bestätigt, er überlebt Neuladen", async ({ page }) => {
  const noErrors = collectErrors(page);
  await newFromTemplate(page, "Backdoor 2");
  await addCutAndPass(page);
  await expect(page.getByText("● Nicht gespeichert")).toBeVisible();
  await page.getByTitle("Spielzug speichern").click();
  await expect(page.getByRole("status").filter({ hasText: "Gespeichert" })).toBeVisible();
  await page.getByTitle("Bearbeiten beenden").click();
  await page.getByTitle("Zur Übersicht").click();
  await expect(card(page, "Backdoor 2")).toBeVisible();
  await page.reload();
  await expect(card(page, "Backdoor 2")).toBeVisible();
  // Als Spielerin ansehen
  await card(page, "Backdoor 2").getByRole("button", { name: "Als Spielerin" }).click();
  await page.getByTitle("Ich bin 2").click();
  await expect(page.getByText("Deine Aufgabe")).toBeVisible();
  noErrors();
});

test("Rückgängig/Wiederholen und Ziel auf dem Feld verschieben", async ({ page }) => {
  await newFromTemplate(page, "Undo-Test");
  await addCutAndPass(page);
  await page.getByTitle("Rückgängig").click();
  await expect(page.getByText("Aktionen in diesem Beat (1)")).toBeVisible();
  await page.getByTitle("Wiederholen").click();
  await expect(page.getByText("Aktionen in diesem Beat (2)")).toBeVisible();
  const row = page.getByText(/^2: Cut →/);
  const before = await row.textContent();
  // Ziel-Griff ziehen: der Cut endete bei (0.6, 0.25) der SVG-Fläche
  const box = await page.locator("svg").first().boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2, { steps: 8 });
  await page.mouse.up();
  await expect(row).not.toHaveText(before);
});

test("Verlassen mit ungespeicherten Änderungen fragt nach – Verwerfen löscht nichts Gespeichertes", async ({ page }) => {
  await newFromTemplate(page, "Guard-Test");
  await addCutAndPass(page);
  await page.getByTitle("Spielzug speichern").click();
  await page.getByTitle("Beat hinzufügen").click();
  await page.getByTitle("Bearbeiten beenden").click();
  await expect(page.getByRole("dialog", { name: "Ungespeicherte Änderungen" })).toBeVisible();
  await page.getByRole("button", { name: "Weiter bearbeiten" }).click();
  await expect(page.getByLabel("Name des Spielzugs")).toBeVisible();
  await page.getByTitle("Bearbeiten beenden").click();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await page.getByTitle("Zur Übersicht").click();
  await expect(card(page, "Guard-Test")).toBeVisible();
});

test("Automatischer Entwurf überlebt das Neuladen und lässt sich wiederherstellen", async ({ page }) => {
  await newFromTemplate(page, "Entwurf-Test");
  await addCutAndPass(page);
  await expect(page.getByText(/Entwurf automatisch gesichert/)).toBeVisible();
  page.on("dialog", (d) => d.accept()); // Browser-Warnung beim Neuladen
  await page.reload();
  await expect(page.getByText("Ungesicherte Entwürfe")).toBeVisible();
  await page.getByRole("button", { name: "Weiter bearbeiten" }).click();
  await page.getByTitle("Beat 1").click();
  await expect(page.getByText("Aktionen in diesem Beat (2)")).toBeVisible();
  await page.getByTitle("Spielzug speichern").click();
  await expect(page.getByRole("status").filter({ hasText: "Gespeichert" })).toBeVisible();
});

test("Fehlgeschlagenes Speichern wird nie als Erfolg angezeigt (Speicher voll)", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "taktikboard.plays.v1") { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
      return orig.call(this, k, v);
    };
  });
  await newFromTemplate(page, "Voll-Test");
  await addCutAndPass(page);
  await page.getByTitle("Spielzug speichern").click();
  await expect(page.getByRole("alert").filter({ hasText: "Nicht gespeichert." })).toBeVisible();
  await expect(page.getByText(/Speicher des Browsers ist voll/)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "✓ Gespeichert" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Als Datei sichern" })).toBeVisible();
  // Verlassen fragt weiterhin nach (nicht gespeichert)
  await page.getByTitle("Bearbeiten beenden").click();
  await expect(page.getByRole("dialog", { name: "Ungespeicherte Änderungen" })).toBeVisible();
});

test("Eingebautes Beispiel bearbeiten legt eine Kopie an, Original bleibt", async ({ page }) => {
  await page.goto("/");
  await card(page, "Pick & Roll – Show oder Switch").getByRole("button", { name: "Kopie bearbeiten" }).click();
  await expect(page.getByText(/eigene Kopie/)).toBeVisible();
  await page.getByTitle("Spielzug speichern").click();
  await expect(page.getByRole("status").filter({ hasText: "Gespeichert" })).toBeVisible();
  await page.getByTitle("Bearbeiten beenden").click();
  await page.getByTitle("Zur Übersicht").click();
  await expect(card(page, "Pick & Roll – Show oder Switch (Kopie)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pick & Roll – Show oder Switch", exact: true })).toBeVisible();
});

test("Neuen, nie gespeicherten Spielzug verwerfen führt zurück zur Übersicht, ohne Reste", async ({ page }) => {
  const noErrors = collectErrors(page);
  await newFromTemplate(page, "Wegwerf-Zug");
  await addCutAndPass(page);
  await page.getByTitle("Bearbeiten beenden").click();
  await page.getByRole("button", { name: "Verwerfen" }).click();
  await expect(page.getByRole("button", { name: "+ Neuer Spielzug" })).toBeVisible();
  await expect(card(page, "Wegwerf-Zug")).toHaveCount(0);
  await expect(page.getByText("Ungesicherte Entwürfe")).toHaveCount(0);
  noErrors();
});

test("Letzte Änderung geht auch bei sofortigem Neuladen nicht verloren", async ({ page }) => {
  await newFromTemplate(page, "Sofort-Test");
  await addCutAndPass(page);
  page.on("dialog", (d) => d.accept());
  await page.reload();                       // ohne auf die automatische Sicherung zu warten
  await page.getByRole("button", { name: "Weiter bearbeiten" }).click();
  await page.getByTitle("Beat 1").click();
  await expect(page.getByText("Aktionen in diesem Beat (2)")).toBeVisible();
});
