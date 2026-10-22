import { expect } from "@playwright/test";

/** Zeitleiste auf t Sekunden setzen (wie Scrubbing per Finger) */
export async function seek(page, t) {
  await page.locator('input[aria-label="Zeitleiste"]').evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, t);
}

/** Karte auf dem Startbildschirm finden */
export const card = (page, name) => page.locator("article").filter({ has: page.getByRole("heading", { name }) });

/** Beispiel/Spielzug öffnen */
export async function openFromHome(page, name, button = "Ansehen") {
  await card(page, name).getByRole("button", { name: button, exact: true }).click();
}

/** Figur auf dem Spielfeld antippen (Rückennummer) */
export async function tapFigure(page, label) {
  const box = await page.locator(`svg text:text-is("${label}")`).first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 3);
}

/** Punkt im Spielfeld antippen (relativ zur SVG-Fläche, 0..1) */
export async function tapCourt(page, fx, fy) {
  const box = await page.locator("svg").first().boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

export const caption = (page) => page.locator("p[aria-live=polite] strong");

/** Seite ohne JS-Fehler? */
export function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}
