import assert from "node:assert/strict";
import test from "node:test";
import { easeOut, fitView, lerpView, zoomView } from "../src/lib/view.ts";

const none = { right: 0, bottom: 0 };

test("fitView contains the box and keeps the screen's shape", () => {
  const box = [100, 200, 300, 600];
  const v = fitView(box, 1.6, none);
  assert.ok(Math.abs(v.w / v.h - 1.6) < 1e-9);
  assert.ok(v.x <= box[0] && v.x + v.w >= box[2] && v.y <= box[1] && v.y + v.h >= box[3]);
});

test("fitView keeps the box inside the free part when panels cover the right and bottom", () => {
  const box = [0, 0, 100, 100];
  const inset = { right: 0.4, bottom: 0.3, top: 0.1 };
  const v = fitView(box, 1.5, inset);
  assert.ok(v.x <= box[0] + 1e-9 && v.x + (1 - inset.right) * v.w >= box[2] - 1e-9);
  assert.ok(v.y + inset.top * v.h <= box[1] + 1e-9 && v.y + (1 - inset.bottom) * v.h >= box[3] - 1e-9);
  // centred in the free region
  const cx = v.x + ((1 - inset.right) * v.w) / 2;
  assert.ok(Math.abs(cx - 50) < 1e-9);
});

test("fitView never zooms in past the minimum height", () => {
  assert.equal(fitView([0, 0, 1, 1], 1, none, 50).h, 50);
});

test("zoomView keeps the centre of the free region fixed and respects limits", () => {
  const inset = { right: 0.3, bottom: 0.2, top: 0.1 };
  const v = { x: 10, y: 20, w: 160, h: 100 };
  const z = zoomView(v, 2, inset, { minH: 10, maxH: 1000 });
  const centre = (a) => [a.x + ((1 - inset.right) * a.w) / 2, a.y + ((1 - inset.bottom + inset.top) * a.h) / 2];
  assert.deepEqual(centre(z).map((n) => Math.round(n * 1e6)), centre(v).map((n) => Math.round(n * 1e6)));
  assert.equal(z.h, 50);
  assert.equal(zoomView(v, 1000, inset, { minH: 40, maxH: 1000 }).h, 40);
  assert.equal(zoomView(v, 0.0001, inset, { minH: 40, maxH: 300 }).h, 300);
});

test("lerpView and easeOut hit their ends", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 10, y: 20, w: 30, h: 50 };
  assert.deepEqual(lerpView(a, b, 0), a);
  assert.deepEqual(lerpView(a, b, 1), b);
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
});
