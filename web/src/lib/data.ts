import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuditSummary, Contractor, Flag, Issue, Meta, NextRupeeFile, Validation, Ward } from "./types";

// Server-only: reads the pipeline's JSON from public/data. Cached, so pages prerender at build time;
// rebuild (or restart dev) after the pipeline rewrites the files.
async function read<T>(name: string): Promise<T> {
  "use cache";
  const file = path.join(process.cwd(), "public", "data", `${name}.json`);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

export const getMeta = () => read<Meta>("meta");
export const getWards = () => read<Ward[]>("wards");
export const getContractors = () => read<Contractor[]>("contractors");
export const getFlags = () => read<Flag[]>("flags");
export const getIssues = () => read<Issue[]>("issues");
export const getNextRupee = () => read<NextRupeeFile>("next_rupee");
export const getValidation = () => read<Validation>("validation");
export const getAuditSummary = () => read<AuditSummary>("audit_summary");
