// Mirrors shared/schema.md. Change both together.

export type Meta = { generated_at: string; stub: boolean; season: string };

export type NextRupee = {
  rank: number;
  road_id: string;
  road_name: string;
  recommended_method: string;
  est_cost_inr: number;
  reasons: string[];
};

export type Ward = {
  ward_code: string;
  ward_name: string;
  budget_inr: number;
  spend_inr: number;
  spend_on_failed_inr: number;
  work_orders: number;
  sla_met_rate: number;
  reopen_rate: number;
  low_lying_index: number;
  risk_score: number;
  spend_by_method: { repair_method: string; spend_inr: number }[];
  spend_by_contractor: { contractor_id: string; spend_inr: number }[];
  summary: string;
  next_rupee: NextRupee[];
};

export type Contractor = {
  contractor_id: string;
  contractor_name: string;
  wards: string[];
  work_orders: number;
  spend_inr: number;
  sla_met_rate: number;
  reopen_rate: number;
  cost_vs_rate_pct: number;
  context_adjusted_score: number;
  grade: string;
  scorecard_text: string;
  improve: string;
  evidence_work_order_ids: string[];
};

export type FlagType = "over_billed" | "double_billed" | "dlp_paid" | "sla_missed" | "reopened";

export type Flag = {
  work_order_id: string;
  ward_code: string;
  road_id: string;
  contractor_id: string;
  flag_type: FlagType;
  severity: "high" | "medium" | "low";
  amount_at_risk_inr: number;
  reason: string;
  evidence_work_order_ids: string[];
};

export type Issue = {
  issue_id: string;
  complaint_ids: string[];
  social_post_ids: string[];
  ward_code: string;
  locality: string;
  lat: number | null;
  lon: number | null;
  category: string;
  first_reported_at: string;
  status: "fixed" | "fixed_failed" | "never_fixed";
  work_order_ids: string[];
};
