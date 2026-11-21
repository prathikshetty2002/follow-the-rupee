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
  summary: string; // one plain-language paragraph (Claude-written, checked)
  next_rupee: NextRupee[];
  // Added by the wards build
  remaining_budget_inr?: number;
  over_budget?: boolean;
  open_issues?: number;
  billing_flagged_inr?: number; // billed amount of work orders with billing flags, each counted once
  billing_flagged_work_orders?: number;
  adjusted?: { sla_expected_rate: number; sla_verdict: Verdict; reopen_expected_rate: number; reopen_verdict: Verdict };
  summary_source?: "claude" | "template";
  narration_hash?: string;
};

export type Contractor = {
  contractor_id: string;
  contractor_name: string;
  wards: string[]; // wards where it did most work
  work_orders: number;
  spend_inr: number;
  sla_met_rate: number; // raw share of jobs finished within their target time
  reopen_rate: number; // raw share of repairs redone within 30 days
  cost_vs_rate_pct: number; // billed vs rate card, spend-weighted, % above (+) or below (-)
  context_adjusted_score: number; // 0-100, judged against what is expected for the same work, wards and weather
  grade: string; // A-E; C means about as expected
  scorecard_text: string; // under 120 words, plain language, no accusations
  improve: string; // one thing to improve
  evidence_work_order_ids: string[]; // up to 10 work orders behind the flags, worst first
  // Added by the scorecard build
  rank?: number; // 1 = best
  scores?: { durability: number; billing: number; speed: number }; // 0-100 each; weights 40 / 30 / 30
  adjusted?: {
    sla_expected_rate: number;
    sla_vs_expected_pp: number; // percentage points more (+) or less (-) on time than expected
    speed_verdict: Verdict;
    reopen_expected_rate: number;
    reopen_vs_expected: number; // 1.0 = as expected, 0.5 = half as many failures
    reopen_rate_ci95: [number, number];
    durability_verdict: Verdict;
  };
  context?: { low_lying_share: number; heavy_rain_window_share: number; pothole_share: number };
  billing?: {
    typical_cost_vs_rate_pct: number; // leaving out jobs billed far above the rate card
    over_billed_jobs: number;
    over_billed_excess_inr: number;
    double_billed_jobs: number;
    double_billed_inr: number;
    paid_on_dlp_roads_jobs: number; // shown, not scored: BMC chose to pay for work on a road under warranty
    paid_on_dlp_roads_inr: number;
  };
  evidence?: Record<"over_billed" | "double_billed" | "reopened" | "sla_missed", string[]>;
  city?: { sla_met_rate: number; reopen_rate: number; cost_vs_rate_pct: number }; // benchmark for comparison
  scorecard_source?: "claude" | "template";
  narration_hash?: string;
};

export type Verdict = "better than expected" | "in line with expectations" | "worse than expected";

export type FlagType = "over_billed" | "double_billed" | "dlp_paid" | "sla_missed" | "reopened";

export type Flag = {
  work_order_id: string;
  ward_code: string;
  road_id: string;
  contractor_id: string;
  flag_type: FlagType;
  severity: "high" | "medium" | "low";
  amount_at_risk_inr: number;
  reason: string; // one plain-language line
  evidence_work_order_ids: string[]; // the work orders behind the flag (for double billing: the duplicate first, then the earlier job)
  // Added by the audit build, all present in the real flags.json
  kind?: "billing" | "performance"; // billing = over_billed, double_billed, dlp_paid; performance = sla_missed, reopened
  contractor_name?: string;
  work_type?: string;
  repair_method?: string;
  cost_inr?: number; // what the work order billed
  details?: Record<string, number | string | boolean>; // the numbers behind the reason, varies by flag_type
};

export type FlagCounts = { count: number; amount_at_risk_inr: number };

export type AuditBlock = {
  work_orders: number;
  flags: number;
  by_type: Partial<Record<FlagType, FlagCounts>>;
  billing_flagged_work_orders: number; // each work order counted once across billing flags
  billing_flagged_cost_inr: number;
  high_severity: number;
};

// audit_summary.json
export type AuditSummary = {
  city: AuditBlock;
  by_ward: (AuditBlock & { ward_code: string })[];
  by_contractor: (AuditBlock & { contractor_id: string; contractor_name: string })[];
  thresholds: { over_billed_ratio: number; double_bill_window_days: number; sla_flag_ratio: number; normal_cost_range_vs_rate_card: [number, number] };
};

export type IssueStatus = "fixed" | "fixed_failed" | "never_fixed" | "not_bmc_scope";

export type Issue = {
  issue_id: string; // every complaint belongs to exactly one issue
  complaint_ids: string[];
  social_post_ids: string[]; // posts matched on place, topic and timing (not every post matches)
  ward_code: string;
  locality: string;
  lat: number | null;
  lon: number | null;
  category: string;
  first_reported_at: string;
  status: IssueStatus; // fixed | fixed_failed (failed within 30 days) | never_fixed (open, no work order) | not_bmc_scope (rejected or forwarded)
  work_order_ids: string[]; // empty unless fixed or fixed_failed
  // Added by the trail build
  trail: string; // one plain-language sentence: complaints -> work order -> contractor -> did it hold
  road_id?: string | null;
  road_name?: string | null;
  n_complaints?: number;
  channels?: string[];
  languages?: string[]; // en, hi-en, mr, hi
  upvotes?: number;
  disposition?: string | null; // BMC's own status for never_fixed / not_bmc_scope, e.g. "Open", "Forwarded to MMRDA/PWD"
  work_order?: {
    work_order_id: string;
    contractor_id: string;
    contractor_name: string;
    repair_method: string;
    cost_inr: number;
    completed_at: string | null;
    days_to_fix: number | null; // from the first complaint
    sla_hours: number;
    sla_met: boolean;
    reopened_within_30d: boolean;
    flags: FlagType[]; // audit flags on this work order
  } | null;
};

// issues_summary.json
export type IssuesSummary = {
  complaints: number;
  issues: number;
  complaints_per_issue: number;
  by_status: Partial<Record<IssueStatus, { issues: number; complaints: number }>>;
  fixed_issues_that_failed_pct: number;
  spend_on_fixed_inr: number;
  spend_on_failed_inr: number;
  median_days_to_fix: number;
  met_target_pct: number;
  road_matched_pct_open: number;
  social_posts: number;
  social_posts_linked: number;
  social_post_kinds: Record<string, number>;
  social_linked_by_kind: Record<string, number>;
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
