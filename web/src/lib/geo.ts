/** Small helpers for the ward map's GeoJSON, in plain lon/lat. Pure functions, tested in tests/geo.test.mjs. */

type Ring = number[][];

/** Coordinates rounded to 5 decimals (about 1 m), to keep the page light. */
export function round<T>(c: T): T {
  return (Array.isArray(c) ? c.map(round) : typeof c === "number" ? Math.round(c * 1e5) / 1e5 : c) as T;
}

/** The outer ring of each polygon in a Polygon or MultiPolygon. */
export function outerRings(g: { type: string; coordinates: unknown }): Ring[] {
  if (g.type === "Polygon") return [(g.coordinates as Ring[])[0]];
  if (g.type === "MultiPolygon") return (g.coordinates as Ring[][]).map((p) => p[0]);
  return [];
}

/** West, south, east, north. */
export function boundsOf(rings: Ring[]): [number, number, number, number] {
  const pts = rings.flat();
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

/** Signed area and area-weighted centroid of one ring (planar; fine at city scale). */
function ringCentroid(r: Ring): { a: number; x: number; y: number } {
  let a = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < r.length - 1; i++) {
    const k = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    a += k;
    x += (r[i][0] + r[i + 1][0]) * k;
    y += (r[i][1] + r[i + 1][1]) * k;
  }
  a /= 2;
  return a === 0 ? { a: 0, x: r[0][0], y: r[0][1] } : { a, x: x / (6 * a), y: y / (6 * a) };
}

/** Even-odd test: is the point inside the ring? */
function inside(p: number[], r: Ring): boolean {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if (r[i][1] > p[1] !== r[j][1] > p[1] && p[0] < ((r[j][0] - r[i][0]) * (p[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) hit = !hit;
  }
  return hit;
}

/**
 * Where to put a ward's label: the centroid of its largest polygon, or, when that falls outside an oddly shaped ward,
 * the middle of the widest stretch of the ward along the centroid's latitude.
 */
export function labelPoint(rings: Ring[]): [number, number] {
  const big = rings.map((r) => ({ r, c: ringCentroid(r) })).sort((a, b) => Math.abs(b.c.a) - Math.abs(a.c.a))[0];
  const c: [number, number] = [big.c.x, big.c.y];
  if (inside(c, big.r)) return c;
  const xs: number[] = [];
  const r = big.r;
  for (let i = 0; i < r.length - 1; i++) {
    const [a, b] = [r[i], r[i + 1]];
    if (a[1] > c[1] !== b[1] > c[1]) xs.push(a[0] + ((c[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
  }
  xs.sort((a, b) => a - b);
  let best: [number, number] = c;
  let width = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1] - xs[i] > width) {
      width = xs[i + 1] - xs[i];
      best = [(xs[i] + xs[i + 1]) / 2, c[1]];
    }
  }
  return best;
}
