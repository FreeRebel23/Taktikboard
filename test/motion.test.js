import { test } from "node:test";
import assert from "node:assert/strict";
import { PROFILES, trapezoid } from "../src/play/easing.js";
import { buildPath, pointOnPath } from "../src/play/path.js";

test("Profile starten bei 0, enden bei 1 und sind monoton", () => {
  for (const [name, f] of Object.entries(PROFILES)) {
    assert.equal(f(0), 0, name);
    assert.ok(Math.abs(f(1) - 1) < 1e-9, name);
    let prev = 0;
    for (let u = 0.01; u <= 1; u += 0.01) {
      const s = f(u);
      assert.ok(s >= prev - 1e-9, `${name} monoton bei ${u}`);
      prev = s;
    }
  }
});

test("Trapezprofil ist stetig an den Übergängen", () => {
  const a = 0.2, d = 0.3;
  for (const k of [a, 1 - d]) assert.ok(Math.abs(trapezoid(k - 1e-7, a, d) - trapezoid(k + 1e-7, a, d)) < 1e-5);
});

test("Spielerinnen beschleunigen und bremsen, der Ball fliegt nahezu gleichförmig", () => {
  const startSpeed = (f) => f(0.02) / 0.02;
  const endSpeed = (f) => (1 - f(0.98)) / 0.02;
  assert.ok(startSpeed(PROFILES.move) < 0.3 && endSpeed(PROFILES.move) < 0.3);
  assert.ok(startSpeed(PROFILES.pass) > 1 && endSpeed(PROFILES.pass) > 0.7);
  // Sprint ist nach 20 % der Zeit deutlich weiter als eine normale Bewegung
  assert.ok(PROFILES.sprint(0.2) > PROFILES.move(0.2) * 1.5);
});

test("Pfad ist nach Bogenlänge parametrisiert", () => {
  const p = buildPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }], false);
  assert.equal(p.length, 40);
  assert.deepEqual(pointOnPath(p, 0.25), { x: 10, y: 0 });
  assert.deepEqual(pointOnPath(p, 1), { x: 10, y: 30 });
  const smooth = buildPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }], true);
  const end = pointOnPath(smooth, 1);
  assert.ok(Math.abs(end.x - 10) < 1e-9 && Math.abs(end.y - 30) < 1e-9);
});
