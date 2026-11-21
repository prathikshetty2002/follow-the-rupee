/**
 * Camera maths for the ward map: which part of the drawing is on screen.
 * Pure functions, so they can be tested on their own.
 *
 * A view is a rectangle in drawing units that fills the whole stage. Panels sit on top of the stage, so the part of the
 * stage left free for the map is described separately, and the map layer is shifted on screen to sit in it.
 */

export type View = { x: number; y: number; w: number; h: number };
export type Box = readonly [number, number, number, number]; // x0, y0, x1, y1
export type Size = { w: number; h: number };

/** Drawing units per screen pixel. */
export const scaleOf = (v: View, stage: Size) => v.w / stage.w;

/**
 * The view that shows `box` centred, large enough to fit the free area. `spread` leaves room for the box to be turned
 * and tipped (the 3D view), by fitting its diagonal instead of its sides.
 */
export function fitView(box: Box, stage: Size, free: Size, spread = false, minScale = 0): View {
  const bw = box[2] - box[0];
  const bh = box[3] - box[1];
  const d = Math.hypot(bw, bh) * 0.92;
  const s = Math.max(Math.max(bw / free.w, bh / free.h, spread ? d / Math.max(free.w, free.h) : 0) * 1.15, minScale); // 15% breathing room
  const w = s * stage.w;
  const h = s * stage.h;
  return { x: (box[0] + box[2]) / 2 - w / 2, y: (box[1] + box[3]) / 2 - h / 2, w, h };
}

/** Zoom by `factor` (above 1 zooms in) keeping the point at (fx, fy), as shares of the stage, where it is. Scale stays within limits. */
export function zoomView(v: View, factor: number, limits: { minW: number; maxW: number }, fx = 0.5, fy = 0.5): View {
  const w = Math.min(Math.max(v.w / factor, limits.minW), limits.maxW);
  const k = w / v.w;
  const h = v.h * k;
  return { x: v.x + fx * (v.w - w), y: v.y + fy * (v.h - h), w, h };
}

export const lerpView = (a: View, b: View, t: number): View => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t });

/** Starts fast and settles gently. */
export const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A movement on screen (pixels) as a movement across the flat map, when the map is turned by `bearing` degrees
 * and tipped back by `pitch` degrees (CSS: rotateX(pitch) rotateZ(bearing)). Both 0 gives the movement back unchanged.
 */
export function screenToPlane(dx: number, dy: number, bearing: number, pitch: number): [number, number] {
  const y = dy / Math.max(Math.cos((pitch * Math.PI) / 180), 0.2);
  const a = (-bearing * Math.PI) / 180;
  return [dx * Math.cos(a) - y * Math.sin(a), dx * Math.sin(a) + y * Math.cos(a)];
}
