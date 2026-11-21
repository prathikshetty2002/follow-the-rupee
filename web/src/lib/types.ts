// Mirrors shared/schema.md. Change both together.

export type Meta = { generated_at: string; stub: boolean; season: string };

export type NextRupee = {
  rank: number;
  road_id: string | null; // null when an issue could not be mapped to a road segment
  road_name: string;
  recommended_method: string;
  est_cost_inr: number;
  reasons: string[];
  // Added by the next-rupee build (wards.json carries the top 10 per ward; next_rupee.json has all)
  issue_id?: string;
  work_type?: string;
  priority_score?: number; // 0-100
  funded?: boolean; // fits in the ward's remaining budget, filling in priority order
  dlp?: boolean; // road is under defect liability: original contractor repairs at no cost to BMC
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
  context?: string[]; // plain-language context checked before flagging, e.g. "heavy-rain week"
};

export type IssueReport = {
  report_id: string;
  channel: string; // e.g. "MyBMC app", "WhatsApp", "1916 helpline"
  language: string; // e.g. "Marathi", "Hinglish"
  text: string; // original text as received
  read_as: string; // one-line plain-language reading of it
  reported_at: string;
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
  reports?: IssueReport[]; // raw reports merged into this issue, for the complaint trail screen
};

// next_rupee.json: full issue-level output of the index

export type NextRupeeIssue = Required<Pick<NextRupee, "rank" | "issue_id" | "work_type" | "recommended_method" | "est_cost_inr" | "reasons" | "dlp" | "funded">> & {
  road_id: string | null;
  road_name: string;
  locality: string;
  cost_to_bmc_inr: number; // 0 when dlp
  priority_score: number;
  factors: Record<"severity" | "flood" | "history" | "traffic" | "accidents" | "facilities", number>; // points of the 0-100 score
  funded_max_value: boolean; // funded by the exact "most total priority per budget" solve instead
  cumulative_cost_inr: number; // running cost down the ranked list, if everything above it were funded
  recommended_contractors: string[]; // contractor ids, or "original DLP contractor"
  expected_reopen_rate: number;
  n_complaints: number;
  complaint_ids: string[];
  road_match: "gps" | "name" | "locality" | "none";
};

export type NextRupeeWard = {
  ward_code: string;
  ward_name: string;
  budget_inr: number;
  spend_inr: number;
  remaining_budget_inr: number; // budget minus season spend, floored at 0
  over_budget: boolean;
  banner: string | null;
  open_issues: number;
  funded_issues: number;
  max_value_funded_issues: number;
  need_inr: number;
  spend_planned_inr: number;
  greedy_vs_optimal: number; // priority-order fill's total score / the best possible for the same budget
  risk_score: number; // 0-100
  issues: NextRupeeIssue[]; // ranked, best first
};

export type NextRupeeFile = {
  generated_at: string;
  weights: Record<string, number>;
  severity_by_work_type: Record<string, number>;
  wards: NextRupeeWard[];
  roads: { road_id: string; ward_code: string; road_name: string; open_issues: number; priority_score: number; work_types: string[]; rank_in_ward: number }[];
  methods: { work_type: string; repair_method: string; jobs: number; reopen_rate: number; est_cost_inr: number; cost_per_durable_fix_inr: number }[];
  contractor_tiers: { contractor_id: string; contractor_name: string; jobs: number; reopen_rate: number; reopen_ci_low: number; reopen_ci_high: number; vs_city: number; tier: "good" | "middle" | "poor" }[];
  weight_stability: { mean_top3_jaccard: number; perturbations: number; weight_scale: [number, number] };
};

// validation.json: backtest of the index (built on June-July data, checked on August-September)

export type Validation = {
  generated_at: string;
  train: string;
  test: string;
  roads: number;
  random_precision_at_3: number;
  results: {
    score: string;
    work_orders_city: number;
    work_orders_in_ward: number;
    complaints_city: number;
    complaints_in_ward: number;
    reopens_city: number;
    reopens_in_ward: number;
    spend_city: number;
    spend_in_ward: number;
    precision_at_3_work_orders: number;
    work_orders_city_ci95: [number, number];
  }[];
};
