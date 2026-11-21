import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditSummary, Contractor, Flag, GeoCollection, Issue, IssuesSummary, WorkOrder, NextRupeeFile, OpenIssuePointProps, RoadFeatureProps, Validation, Ward, WardFeatureProps } from "./types";

// Server-only: reads the pipeline's JSON from public/data. Cached, so pages prerender at build time;
// rebuild (or restart dev) after the pipeline rewrites the files.
async function read<T>(name: string): Promise<T> {
  "use cache";
  const file = path.join(process.cwd(), "public", "data", name.includes(".") ? name : `${name}.json`);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export const getWards = () => read<Ward[]>("wards");
export const getContractors = () => read<Contractor[]>("contractors"); 
export const getNextRupee = () => read<NextRupeeFile>("next_rupee"); // the ranked plan, weights, presets and backtests
export const getValidation = () => read<Validation>("validation");
export const getWardGeo = () => read<GeoCollection<WardFeatureProps>>("geo/wards.geojson");
export const getRoadGeo = () => read<GeoCollection<RoadFeatureProps>>("geo/roads.geojson");
export const getOpenIssuePoints = () => read<GeoCollection<OpenIssuePointProps>>("geo/open_issues.geojson");

// Readers for the audit, complaint-trail and contractor pages
export const getFlags = () => read<Flag[]>("flags");
export const getIssues = () => read<Issue[]>("issues");
export const getAuditSummary = () => read<AuditSummary>("audit_summary");
export const getIssuesSummary = () => read<IssuesSummary>("issues_summary");
export const getWorkOrders = () => read<WorkOrder[]>("work_orders");
export const getComplaintLookup = () => read<Record<string, string>>("complaint_to_issue"); // complaint id -> issue id

/** Resolve a list of work order ids (a flag's evidence, an issue's work_order_ids) to their records. */
export async function getWorkOrdersById(ids: string[]): Promise<WorkOrder[]> {
  const all = await getWorkOrders();
  const wanted = new Set(ids);
  return all.filter((w) => wanted.has(w.work_order_id));
}
