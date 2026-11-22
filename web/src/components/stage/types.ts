export type StageIssue = { rank: number; road: string; type: string; costInr: number; funded: boolean };

export type LngLat = [number, number];
/** West, south, east, north in degrees. */
export type Bounds = [number, number, number, number];

export type StageWard = {
  code: string;
  slug: string;
  name: string;
  zone: string;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown }; // GeoJSON, lon/lat
  bounds: Bounds;
  center: LngLat; // where its label sits
  risk: number; // 0-100, the worst ward is 100
  open: number;
  funded: number; // open issues the remaining budget pays for
  needInr: number;
  leftInr: number;
  over: boolean;
  top: StageIssue[]; // the first few issues to fix
};

export type StageData = {
  wards: StageWard[];
  roads: { coords: LngLat[]; ward: string; hot: boolean; name: string }[]; // hot: has open issues
  dots: { at: LngLat; ward: string; rank: number; funded: boolean }[];
};
