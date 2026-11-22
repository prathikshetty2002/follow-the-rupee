import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { boundsOf, labelPoint, outerRings, round } from "../src/lib/geo.ts";

const square = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];
// A "C" shape whose centroid falls in the gap
const cShape = [[0, 0], [6, 0], [6, 1], [1, 1], [1, 5], [6, 5], [6, 6], [0, 6], [0, 0]];

test("round keeps 5 decimals at any depth", () => {
  assert.deepEqual(round([[72.8123456, 18.9876549]]), [[72.81235, 18.98765]]);
});

test("outerRings and boundsOf read Polygon and MultiPolygon", () => {
  assert.deepEqual(outerRings({ type: "Polygon", coordinates: [square] }), [square]);
  assert.equal(outerRings({ type: "MultiPolygon", coordinates: [[square], [cShape]] }).length, 2);
  assert.deepEqual(boundsOf([square, cShape]), [0, 0, 6, 6]);
});

test("labelPoint is the centroid of a simple shape and stays inside an awkward one", () => {
  assert.deepEqual(labelPoint([square]).map((n) => Math.round(n * 1e9) / 1e9), [2, 2]);
  const [x, y] = labelPoint([cShape]);
  assert.ok(x >= 0 && x <= 1 && y > 0 && y < 6, `label ${x},${y} should sit on the C's spine`);
});

test("every real ward gets a label point inside its bounds", () => {
  const geo = JSON.parse(readFileSync(new URL("../public/data/geo/wards.geojson", import.meta.url), "utf8"));
  assert.equal(geo.features.length, 24);
  for (const f of geo.features) {
    const rings = outerRings(f.geometry);
    const [w, s, e, n] = boundsOf(rings);
    const [x, y] = labelPoint(rings);
    assert.ok(x >= w && x <= e && y >= s && y <= n, f.properties.ward_code);
  }
});
