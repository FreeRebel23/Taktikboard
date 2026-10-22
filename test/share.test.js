import { test } from "node:test";
import assert from "node:assert/strict";
import { encodePlay, decodePlay, playFromHash, looksLikePlay, playToJson, fileNameFor } from "../src/store/share.js";
import { PLAYS, validatePlayTree } from "../src/play/index.js";

test("Link-Kodierung: kodieren → dekodieren ergibt denselben, gültigen Spielzug", async () => {
  for (const play of PLAYS) {
    const code = await encodePlay(play);
    assert.ok(code.startsWith("1."));
    assert.ok(/^[\w.-]+$/.test(code), "URL-sicher");
    const back = await decodePlay(code);
    assert.equal(JSON.stringify(back), playToJson(play));
    assert.deepEqual(validatePlayTree(back).errors, []);
  }
});

test("Hash mit p= und v=player wird gelesen; ohne p= → null", async () => {
  const code = await encodePlay(PLAYS[1]);
  const back = await playFromHash(`#p=${code}&v=player`);
  assert.equal(back.id, PLAYS[1].id);
  assert.equal(await playFromHash("#foo"), null);
});

test("unbrauchbare Daten werden erkannt", async () => {
  assert.equal(looksLikePlay({ foo: 1 }), false);
  assert.equal(looksLikePlay(PLAYS[0]), true);
  await assert.rejects(decodePlay("9.abc"), /Unbekanntes Link-Format/);
});

test("Dateiname ist sprechend", () => {
  assert.equal(fileNameFor({ name: "Press Break – Full Court" }), "press-break-full-court.taktik.json");
});

test("publicAddressProblem: nur HTTPS mit öffentlicher Adresse ist ok", async () => {
  const { publicAddressProblem } = await import("../src/store/share.js");
  assert.equal(publicAddressProblem({ protocol: "https:", hostname: "freerebel23.github.io" }), null);
  assert.match(publicAddressProblem({ protocol: "http:", hostname: "localhost" }), /localhost/);
  assert.match(publicAddressProblem({ protocol: "http:", hostname: "192.168.1.20" }), /lokalen Netz/);
  assert.match(publicAddressProblem({ protocol: "http:", hostname: "example.org" }), /HTTPS/);
  assert.match(publicAddressProblem({ protocol: "file:", hostname: "" }), /lokale Datei/);
});
