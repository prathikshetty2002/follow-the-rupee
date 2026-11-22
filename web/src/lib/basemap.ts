import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

/**
 * The real map of Mumbai under the wards: OpenStreetMap data as vector tiles from OpenFreeMap (free, no key),
 * drawn in the site's light Mumbai dawn palette. Quiet on purpose: land, sea, parks, roads, rail, buildings and a few
 * place names, so the wards on top are what you read first.
 */

export const TILES = "https://tiles.openfreemap.org/planet";
export const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
/** MapLibre runs its tile worker from this file (copied from node_modules/maplibre-gl/dist; update it with the package). */
export const WORKER_URL = "/vendor/maplibre-gl-worker-6.16.0.mjs";

export const INK = {
  land: "#F4EFE7",
  sea: "#CFE3EC",
  seaText: "#5F8C9E",
  park: "#E4EADA",
  road: "#FFFFFF",
  roadMajor: "#FFFCF6",
  rail: "#CBC1B3",
  building: "#E9E0D2",
  building3d: "#EADFCE",
  place: "#7D776C",
  wardLow: "#DCEBF1",
  wardHigh: "#1B6682",
  edge: "#FFFFFF",
  accent: "#CC5A08",
  accentInk: "#A8470A",
  glow: "#F28A24",
  ink: "#1E1D1B",
};

const name: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];

export function basemapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: { omt: { type: "vector", url: TILES } },
    layers: [
      { id: "land", type: "background", paint: { "background-color": INK.land } },
      { id: "landcover", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]], paint: { "fill-color": INK.park, "fill-opacity": 0.6 } },
      { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": INK.park, "fill-opacity": 0.8 } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": INK.sea } },
      { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", minzoom: 11, paint: { "line-color": INK.sea, "line-width": 1.2 } },
      {
        id: "roads-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary", "secondary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": INK.road, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.6, 16, 5] },
      },
      {
        id: "roads-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": INK.roadMajor, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.8, 13, 2.5, 16, 8] },
      },
      {
        id: "rail",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 10,
        filter: ["==", ["get", "class"], "rail"],
        paint: { "line-color": INK.rail, "line-width": 1.2, "line-dasharray": [3, 2] },
      },
      { id: "buildings", type: "fill", source: "omt", "source-layer": "building", minzoom: 13, paint: { "fill-color": INK.building, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.9] } },
      {
        id: "buildings-3d",
        type: "fill-extrusion",
        source: "omt",
        "source-layer": "building",
        minzoom: 13,
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": INK.building3d,
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 9],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.9,
        },
      },
      {
        id: "sea-names",
        type: "symbol",
        source: "omt",
        "source-layer": "water_name",
        layout: { "text-field": name, "text-font": ["Noto Sans Italic"], "text-size": 14, "text-letter-spacing": 0.2 },
        paint: { "text-color": INK.seaText },
      },
      {
        id: "places",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 12.5,
        filter: ["in", ["get", "class"], ["literal", ["suburb", "quarter", "neighbourhood"]]],
        layout: { "text-field": name, "text-font": ["Noto Sans Regular"], "text-size": 11, "text-transform": "uppercase", "text-letter-spacing": 0.12, "text-max-width": 8 },
        paint: { "text-color": INK.place, "text-halo-color": INK.land, "text-halo-width": 1.2 },
      },
    ],
  };
}
