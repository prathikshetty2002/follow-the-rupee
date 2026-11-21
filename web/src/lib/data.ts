import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Contractor, GeoCollection, NextRupeeFile, OpenIssuePointProps, RoadFeatureProps, Validation, Ward, WardFeatureProps } from "./types";

// Server-only: reads the pipeline's JSON from public/data. Cached, so pages prerender at build time;
// rebuild (or restart dev) after the pipeline rewrites the files.
async function read<T>(name: string): Promise<T> {
  "use cache";
  const file = path.join(process.cwd(), "public", "data", name.includes(".") ? name : `${name}.json`);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export const getWards = () => read<Ward[]>("wards");
export const getContractors = () => read<Contractor[]>("contractors"); // only for contractor names in the suggestions
export const getNextRupee = () => read<NextRupeeFile>("next_rupee"); // the ranked plan, weights, presets and backtests
export const getValidation = () => read<Validation>("validation");
export const getWardGeo = () => read<GeoCollection<WardFeatureProps>>("geo/wards.geojson");
export const getRoadGeo = () => read<GeoCollection<RoadFeatureProps>>("geo/roads.geojson");
export const getOpenIssuePoints = () => read<GeoCollection<OpenIssuePointProps>>("geo/open_issues.geojson");
