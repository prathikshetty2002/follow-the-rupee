import assert from "node:assert/strict";
import test from "node:test";
import { easeOut, fitView, lerpView, scaleOf, screenToPlane, zoomView } from "../src/lib/view.ts";

const stage = { w: 1000, h: 600 };

test("fitView keeps the stage's shape and contains the box in the free area", () => {
  const box = [100, 200, 300, 600];
  const free = { w: 700, h: 400 };
  const v = fitView(box, stage, free);
  assert.ok(Math.abs(v.w / v.h - stage.w / stage.h) < 1e-9);
  const s = scaleOf(v, stage);
  assert.ok((box[2] - box[0]) / s <= free.w + 1e-9 && (box[3] - box[1]) / s <= free.h + 1e-9);
  assert.ok(Math.abs(v.x + v.w / 2 - 200) < 1e-9 && Math.abs(v.y + v.h / 2 - 400) < 1e-9);
});

test("fitView in 3D fits the turned, tipped box and never goes below the minimum scale", () => {
  const box = [0, 0, 300, 300];
  const free = { w: 500, h: 500 };
  // tipped back 60 degrees and not turned: half as tall on screen, so a wider-than-tall free area is the limit
  const flat = scaleOf(fitView(box, stage, free, undefined, 0, 1), stage);
  const tipped = scaleOf(fitView(box, stage, free, { bearing: 0, pitch: 60 }, 0, 1), stage);
  assert.ok(Math.abs(flat - 0.6) < 1e-9 && Math.abs(tipped - 0.6) < 1e-9);
  // turned 45 degrees a square is wider on screen, so it needs more room
  assert.ok(scaleOf(fitView(box, stage, free, { bearing: 45, pitch: 0 }, 0, 1), stage) > flat);
  assert.equal(scaleOf(fitView([0, 0, 1, 1], stage, free, undefined, 2), stage), 2);
});

test("zoomView keeps the chosen point still and respects limits", () => {
  const v = { x: 10, y: 20, w: 200, h: 120 };
  const [fx, fy] = [0.25, 0.75];
  const before = [v.x + fx * v.w, v.y + fy * v.h];
  const z = zoomView(v, 2, { minW: 10, maxW: 1000 }, fx, fy);
  assert.equal(z.w, 100);
  assert.ok(Math.abs(z.w / z.h - v.w / v.h) < 1e-9);
  assert.deepEqual([z.x + fx * z.w, z.y + fy * z.h].map((n) => Math.round(n * 1e6)), before.map((n) => Math.round(n * 1e6)));
  assert.equal(zoomView(v, 1000, { minW: 40, maxW: 1000 }).w, 40);
  assert.equal(zoomView(v, 0.0001, { minW: 40, maxW: 300 }).w, 300);
});

test("lerpView and easeOut hit their ends", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 10, y: 20, w: 30, h: 50 };
  assert.deepEqual(lerpView(a, b, 0), a);
  assert.deepEqual(lerpView(a, b, 1), b);
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
});

test("screenToPlane is the identity when flat and unturned, and undoes the tip and turn", () => {
  assert.deepEqual(screenToPlane(5, -3, 0, 0).map((n) => Math.round(n * 1e9) / 1e9), [5, -3]);
  // the map turned a quarter clockwise has its "up" pointing right, so moving right on screen moves up the map
  const [x, y] = screenToPlane(10, 0, 90, 0);
  assert.ok(Math.abs(x) < 1e-9 && Math.abs(y + 10) < 1e-9);
  // tipped back 60 degrees: a vertical screen move covers twice as much map
  const [, py] = screenToPlane(0, 10, 0, 60);
  assert.ok(Math.abs(py - 20) < 1e-9);
});
