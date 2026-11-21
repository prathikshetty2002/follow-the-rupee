import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { GeoFeature } from "./types";

const asGeo = (x: unknown) => x as GeoPermissibleObjects;

type Ring = number[][];

/** Signed area in the lon/lat plane: positive when the ring runs counter-clockwise. */
function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return a / 2;
}

/**
 * d3-geo reads clockwise exterior rings as the polygon and counter-clockwise ones as "everything outside it",
 * which fills the whole map. GeoJSON from other tools is usually counter-clockwise, so flip those rings.
 */
function clockwise<P>(f: GeoFeature<P>): GeoFeature<P> {
  const g = f.geometry;
  if (g.type !== "Polygon" && g.type !== "MultiPolygon") return f;
  const flip = (rings: Ring[]) => (ringArea(rings[0]) > 0 ? rings.map((r) => [...r].reverse()) : rings);
  const coordinates = g.type === "Polygon" ? flip(g.coordinates as Ring[]) : (g.coordinates as Ring[][]).map(flip);
  return { ...f, geometry: { ...g, coordinates } };
}

/** Fit a set of features into a width x height box and return SVG paths, centroids and a projector for points. */
export function projectFeatures<P>(input: GeoFeature<P>[], width: number, height: number, pad = 10) {
  const features = input.map(clockwise);
  const projection = geoMercator().fitExtent(
    [
      [pad, pad],
      [width - pad, height - pad],
    ],
    asGeo({ type: "FeatureCollection", features }),
  );
  const path = geoPath(projection);
  return {
    paths: features.map((f) => path(asGeo(f)) ?? ""),
    centroids: features.map((f) => path.centroid(asGeo(f))),
    point: (lon: number, lat: number): [number, number] => projection([lon, lat]) ?? [0, 0],
    path: (f: GeoFeature<unknown>) => path(asGeo(f)) ?? "",
  };
}
