# Data contract: pipeline → web

The pipeline (`pipeline/`) writes JSON files to `web/public/data/`. The web app (`web/`) only reads them.
This file is the contract. **Change it only after telling the other person**, and update
`web/src/lib/types.ts` in the same commit.

Until the real pipeline runs, the files hold hand-written stubs (`meta.json` has `"stub": true`).
All money is in rupees (integers). Rates are 0–1 fractions. Dates are ISO strings.

## meta.json
```json
{ "generated_at": "2026-11-21T11:00:00+05:30", "stub": true, "season": "Jun–Sep 2025" }
```

## wards.json: one object per ward (24)
```json
{
  "ward_code": "F/S",
  "ward_name": "Parel, Lalbaug, Sewri",
  "budget_inr": 6500000,
  "spend_inr": 7120000,
  "spend_on_failed_inr": 910000,        // spend on jobs re-opened within 30 days
  "work_orders": 142,
  "sla_met_rate": 0.71,
  "reopen_rate": 0.18,
  "low_lying_index": 0.82,
  "risk_score": 87,                     // 0–100, higher = needs money more urgently
  "spend_by_method": [{ "repair_method": "Cold mix patch", "spend_inr": 2100000 }],
  "spend_by_contractor": [{ "contractor_id": "CT01", "spend_inr": 3000000 }],
  "summary": "Plain-language paragraph written by Claude.",
  "next_rupee": [                       // top 10 open issues, best first (full list in next_rupee.json)
    {
      "rank": 1,
      "road_id": "RD0058",              // null if the issue could not be placed on a road
      "road_name": "Dr Babasaheb Ambedkar Road",
      "recommended_method": "Hot mix patch",
      "est_cost_inr": 16100,
      "reasons": ["Ambulance access road for KEM Hospital", "280 m from Hindmata Junction flood hotspot"],
      "issue_id": "OI-0200", "work_type": "Pothole", "priority_score": 80.5,   // added fields, all optional
      "funded": true,                   // fits in the remaining budget, filled in priority order
      "dlp": false                      // true: road under defect liability, original contractor repairs at no cost
    }
  ]
}
```

## contractors.json: one object per contractor (8), best first (written by `uv run pipeline scorecards`)
Each result is compared with what the city typically gets for the same work, not with other contractors' raw numbers:
- **Speed** vs the on-time rate expected for the work types, heavy-rain windows and low-lying wards the contractor was given.
- **Durability** vs the re-open rate expected for its repair methods, road surfaces and wards.
- **Billing** counts jobs flagged over-billed or double-billed. Payments on roads under defect liability are shown but **not scored** (BMC chose to pay).
- Volume is never penalised. A gap smaller than 2 standard errors is reported as "in line with expectations".
Score = 40% durability + 30% billing + 30% speed (each 0-100). Grade cuts: A 80, B 65, C 50, D 35, else E; **C means about as expected**.
```json
{
  "contractor_id": "CT05",
  "contractor_name": "Deccan Paving Solutions (synthetic)",
  "wards": ["L", "M/E", "F/S"],         // where it did most work
  "work_orders": 287, "spend_inr": 14074782,
  "sla_met_rate": 0.596, "reopen_rate": 0.091, "cost_vs_rate_pct": 3.2,   // raw numbers
  "context_adjusted_score": 89, "grade": "A",
  "scorecard_text": "Under 120 words, plain language, no accusations (written by Claude, or a template if there is no API key).",
  "improve": "One thing to improve.",
  "evidence_work_order_ids": ["WO25-01942"],   // up to 10, worst first; per-metric lists are in `evidence`
  // optional fields added by the scorecard build
  "rank": 1,
  "scores": { "durability": 100, "billing": 84, "speed": 78 },
  "adjusted": { "sla_expected_rate": 0.485, "sla_vs_expected_pp": 11.1, "speed_verdict": "better than expected",
                "reopen_expected_rate": 0.237, "reopen_vs_expected": 0.38, "reopen_rate_ci95": [0.063, 0.129], "durability_verdict": "better than expected" },
  "context": { "low_lying_share": 0.69, "heavy_rain_window_share": 0.56, "pothole_share": 0.49 },
  "billing": { "typical_cost_vs_rate_pct": 3.2, "over_billed_jobs": 4, "over_billed_excess_inr": 0, "double_billed_jobs": 5, "double_billed_inr": 0,
              "paid_on_dlp_roads_jobs": 0, "paid_on_dlp_roads_inr": 0 },
  "evidence": { "over_billed": [], "double_billed": [], "reopened": [], "sla_missed": [] },
  "city": { "sla_met_rate": 0.504, "reopen_rate": 0.244, "cost_vs_rate_pct": 8.6 },   // benchmark to show beside the contractor
  "scorecard_source": "claude",         // claude | template: `template` means no API key was available
  "narration_hash": "..."               // identifies the facts the text was written from; an unchanged hash keeps the committed text
}
```
`scorecard_text` is checked before it is accepted: under 120 words, every number must appear in the supplied facts, no accusatory words.

## flags.json: one object per flag (written by `uv run pipeline audit`)
A work order can carry several flags. Sorted billing first, then by severity and money at risk. Real data (1,746 flags on 1,342 work orders).
```json
{
  "work_order_id": "WO25-01626",
  "ward_code": "F/N",
  "road_id": "RD0123",
  "contractor_id": "CT03",
  "flag_type": "over_billed",           // over_billed | double_billed | dlp_paid | sla_missed | reopened
  "severity": "high",                   // high | medium | low
  "amount_at_risk_inr": 188958,         // 0 for sla_missed
  "reason": "Billed ₹3,31,958 for work the rate card prices at about ₹1,10,000 (3.0× the rate; normal jobs stay within 1.3×).",
  "evidence_work_order_ids": ["WO25-01626"],
  "kind": "billing",                    // billing | performance (added fields below are optional)
  "contractor_name": "...", "work_type": "...", "repair_method": "...", "cost_inr": 331958,
  "details": { "cost_ratio": 3.02, "expected_cost_inr": 110000, "unit": "per job" }   // varies by flag_type
}
```
| flag_type | kind | Rule | Severity |
|---|---|---|---|
| `over_billed` | billing | cost above 1.4× the rate card (normal jobs sit within 0.75–1.3×) | high from 2×, else medium |
| `double_billed` | billing | no complaint linked, and an earlier job on the same road and work type within 7 days | high if same contractor and method, else medium |
| `dlp_paid` | billing | road still under its defect liability period, yet BMC paid | high for carriageway work, low for drainage or pumping (check the DLP covers it) |
| `sla_missed` | performance | fixed at least 2× the SLA target after the first complaint | medium from 3×, high from 5×; one level lower if heavy rain fell in the window |
| `reopened` | performance | repair failed within 30 days | low; medium if it failed repeatedly on that road; high if the road is under DLP |

Billing flags are the high-confidence ones. Performance flags give context; `reason` for `reopened` shows the contractor's rate next to the city average so nobody is blamed for a normal failure rate.
`details` for `double_billed`: `earlier_work_order_id`, `days_after_earlier_job`, `same_contractor`, `same_method`. For `dlp_paid`: `last_resurfaced`, `carriageway_work`. For `sla_missed`: `response_hours`, `sla_hours`, `sla_ratio`, `heavy_rain_days`.

## audit_summary.json: flag totals by city, ward and contractor
Type `AuditSummary`. Each block has `work_orders`, `flags`, `by_type` (count and money per flag type), `billing_flagged_work_orders` and
`billing_flagged_cost_inr` (each work order counted once, so overlapping billing flags are not double counted), and `high_severity`.
`thresholds` lists the rule settings so the UI can show them.

## issues.json: de-duplicated complaints linked to work orders
```json
{
  "issue_id": "ISS-0001",
  "complaint_ids": ["BMC25-000012", "BMC25-000013"],
  "social_post_ids": [],
  "ward_code": "P/S",
  "locality": "Goregaon West",
  "lat": 19.16, "lon": 72.84,
  "category": "Pothole",
  "first_reported_at": "2025-06-01T07:10:00",
  "status": "fixed",                    // fixed | fixed_failed | never_fixed
  "work_order_ids": ["WO25-00004"]
}
```

## next_rupee.json: the full next-rupee plan (written by `uv run pipeline next-rupee`)
Types: `NextRupeeFile` in `web/src/lib/types.ts`. Open issue = Open / In Progress complaint with no work order,
merged with repeat complaints on the same road and category within 14 days (589 issues from 896 complaints).
```json
{
  "weights": { "severity": 0.30, "flood": 0.25, "history": 0.15, "traffic": 0.10, "accidents": 0.10, "facilities": 0.10 },
  "wards": [{
    "ward_code": "F/S", "remaining_budget_inr": 1773849, "over_budget": false,
    "banner": null,                   // set for over-budget wards: reallocate funds or recover payments on DLP roads
    "open_issues": 33, "funded_issues": 33, "need_inr": 1615500, "risk_score": 70,
    "greedy_vs_optimal": 1.0,        // priority-order fill vs the best total-priority fill for the same budget
    "issues": [{                      // ranked best first; every field is documented in types.ts
      "rank": 1, "issue_id": "OI-0200", "road_id": "RD0058", "work_type": "Road cave-in",
      "recommended_method": "Excavation, pipeline repair, PQC patch", "cost_to_bmc_inr": 189000,
      "priority_score": 80.5,         // 0-100
      "factors": { "severity": 30.0, "flood": 17.2, "history": 14.1, "traffic": 8.6, "accidents": 0.0, "facilities": 10.0 },  // points that add up to the score
      "funded": true, "funded_max_value": true, "dlp": false,
      "recommended_contractors": ["CT05", "CT08", "CT01"], "expected_reopen_rate": 0.081,
      "complaint_ids": ["BMC25-002242"], "road_match": "gps",
      "reasons": ["plain-language reasons from the three biggest factors"]
    }]
  }],
  "roads": [{ "road_id": "RD0058", "ward_code": "F/S", "open_issues": 2, "priority_score": 130.1, "rank_in_ward": 1, "work_types": ["Pothole", "Road cave-in"] }],
  "methods": [{ "work_type": "Pothole", "repair_method": "Hot mix patch", "reopen_rate": 0.226, "est_cost_inr": 16100 }],
  "contractor_tiers": [{ "contractor_id": "CT05", "reopen_rate": 0.091, "reopen_ci_low": 0.063, "reopen_ci_high": 0.129, "tier": "good" }],
  "weight_stability": { "mean_top3_jaccard": 0.82 }
}
```
Notes: `risk_score` in wards.json is the ward's summed open-issue priority scaled so the highest ward is 100.
`recommended_contractors` are the good-tier ids; DLP roads say "original DLP contractor". `expected_reopen_rate` is an
estimate (method rate x best contractor's relative rate), not an observed number.

## validation.json: backtest of the index
Built from data before 2025-08-01 and compared with what happened 1 Aug to 30 Sep, per road: Spearman rank correlation
with later work orders, complaints, re-opens and spend (city-wide and mean within ward), precision@3 per ward, and a
bootstrap 95% interval. Includes baselines (past work-order count, past complaint count, equal-weight factors).
