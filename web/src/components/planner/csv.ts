import type { Fill, Scored } from "@/lib/planner";
import type { PlannerIssue } from "./types";

const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** The plan as a spreadsheet: every open issue in risk order, with whether this plan pays for it. */
export function planCsv(ward: string, items: Scored<PlannerIssue>[], fill: Fill): string {
  const head = ["rank", "status", "issue_id", "work_type", "road", "locality", "method", "cost_inr", "cost_low_inr", "cost_high_inr", "risk_score_out_of_100", "confidence", "complaint_ids"];
  const rows = items.map((i) => {
    const status = !fill.funded.has(i.id) ? "not covered" : i.dlp ? "free: under warranty" : fill.fromLeftover.has(i.id) ? "covered from leftover" : "covered";
    return [i.rank, status, i.id, i.workType, i.road, i.locality, i.method, Math.round(i.cost), Math.round(i.costLow), Math.round(i.costHigh), (i.score * 100).toFixed(1), i.confidence, i.complaintIds.join(" ")].map(q).join(",");
  });
  return [`# Next Rupee Planner, ward ${ward}. Synthetic data.`, head.join(","), ...rows].join("\n");
}

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
