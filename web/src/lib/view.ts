/**
 * Camera maths for the ward map: which part of the drawing is on screen.
 * Pure functions, so they can be tested on their own.
 *
 * A view is a rectangle in drawing units. "Inset" is the share of the screen covered by panels (right and bottom),
 * so a ward is centred in the part of the map that stays visible.
 */

export type View = { x: number; y: number; w: number; h: number };
export type Box = readonly [number, number, number, number]; // x0, y0, x1, y1
export type Inset = { right: number; bottom: number; top?: number };

/** The view that shows `box` centred in the free part of a screen with this width / height ratio. */
export function fitView(box: Box, aspect: number, inset: Inset, minHeight = 0): View {
  const top = inset.top ?? 0;
  const freeW = 1 - inset.right;
  const freeH = 1 - inset.bottom - top;
  const bw = box[2] - box[0];
  const bh = box[3] - box[1];
  const h = Math.max(bh / freeH, bw / (freeW * aspect), minHeight);
  const w = h * aspect;
  return { x: (box[0] + box[2]) / 2 - (freeW * w) / 2, y: (box[1] + box[3]) / 2 - top * h - (freeH * h) / 2, w, h };
}

/** Zoom by `factor` (above 1 zooms in) around the centre of the free part of the screen, within the limits. */
export function zoomView(v: View, factor: number, inset: Inset, limits: { minH: number; maxH: number }): View {
  const h = Math.min(Math.max(v.h / factor, limits.minH), limits.maxH);
  const k = h / v.h;
  const top = inset.top ?? 0;
  const freeH = 1 - inset.bottom - top;
  const cx = v.x + ((1 - inset.right) * v.w) / 2;
  const cy = v.y + (top + freeH / 2) * v.h;
  const w = v.w * k;
  return { x: cx - ((1 - inset.right) * w) / 2, y: cy - (top + freeH / 2) * h, w, h };
}

export const lerpView = (a: View, b: View, t: number): View => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });

/** Starts fast and settles gently. */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
