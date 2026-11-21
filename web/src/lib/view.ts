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
 * The view that shows `box` centred, large enough to fit the free area. `turn` is the 3D view: the box is turned by `bearing`
 * degrees and tipped back by `pitch` degrees, so its size on screen is that of its turned corners, squashed by the tip.
 */
export function fitView(box: Box, stage: Size, free: Size, turn?: { bearing: number; pitch: number }, minScale = 0, pad = 1.15): View {
  let bw = box[2] - box[0];
  let bh = box[3] - box[1];
  if (turn) {
    const a = (turn.bearing * Math.PI) / 180;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const xs = [-bw / 2, bw / 2];
    const ys = [-bh / 2, bh / 2];
    const turned = xs.flatMap((x) => ys.map((y) => [x * c - y * s, x * s + y * c]));
    bw = Math.max(...turned.map((p) => p[0])) - Math.min(...turned.map((p) => p[0]));
    bh = (Math.max(...turned.map((p) => p[1])) - Math.min(...turned.map((p) => p[1]))) * Math.cos((turn.pitch * Math.PI) / 180);
  }
  const k = Math.max(bw / free.w, bh / free.h) * pad;
  const sc = Math.max(k, minScale);
  const w = sc * stage.w;
  const h = sc * stage.h;
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
