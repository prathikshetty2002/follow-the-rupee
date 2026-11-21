import type { WeightPreset } from "@/lib/types";
import type { PlanItem, Weights } from "@/lib/planner";

/** One open issue as the planner shows it: the scoring inputs plus everything needed to explain it. */
export type PlannerIssue = PlanItem & {
  road: string;
  locality: string;
  workType: string;
  method: string;
  reasons: string[];
  contractors: string[];
  expectedFail: number; // 0 to 1
  nComplaints: number;
  complaintIds: string[];
  confidence: "high" | "medium" | "low";
  notes: string[];
  rankRange: [number, number];
  roadMatch: string;
  x: number | null; // position on the ward map, null when the issue has no location
  y: number | null;
};

export type PlannerMap = {
  width: number;
  height: number;
  ward: string; // SVG path
  roads: { id: string; d: string }[]; // roads that have open issues
};

export type PlannerData = {
  ward: { code: string; name: string };
  defaultBudget: number; // the ward's actual remaining budget
  need: number; // cost of fixing everything
  issues: PlannerIssue[];
  weights: Weights; // the weights the pipeline used
  presets: WeightPreset[];
  map: PlannerMap;
};
