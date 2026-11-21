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

## contractors.json: one object per contractor (8)
```json
{
  "contractor_id": "CT01",
  "contractor_name": "Sahyadri Infra Works (synthetic)",
  "wards": ["P/N", "K/E"],
  "work_orders": 310,
  "spend_inr": 1650000,
  "sla_met_rate": 0.82,
  "reopen_rate": 0.12,
  "cost_vs_rate_pct": 8.5,              // avg % above (+) or below (-) the rate card
  "context_adjusted_score": 74,         // 0–100, adjusted for low-lying wards / heavy-rain weeks
  "grade": "B",
  "scorecard_text": "Under 120 words, plain language, no accusations.",
  "improve": "One thing to improve.",
  "evidence_work_order_ids": ["WO25-00004"]
}
```

## flags.json: one object per flagged work order
```json
{
  "work_order_id": "WO25-00004",
  "ward_code": "P/S",
  "road_id": "RD0166",
  "contractor_id": "CT04",
  "flag_type": "over_billed",           // over_billed | double_billed | dlp_paid | sla_missed | reopened
  "severity": "high",                   // high | medium | low
  "amount_at_risk_inr": 64000,
  "reason": "One line: billed ₹1,16,079 vs ~₹52,000 expected at the rate card.",
  "evidence_work_order_ids": ["WO25-00004"]
}
```

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
