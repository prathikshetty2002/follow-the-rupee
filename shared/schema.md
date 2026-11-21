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
  "next_rupee": [                       // ranked recommendations, best first
    {
      "rank": 1,
      "road_id": "RD0058",
      "road_name": "Dr Ambedkar Road",
      "recommended_method": "Mastic asphalt",
      "est_cost_inr": 240000,
      "reasons": ["Ambulance route to KEM Hospital", "Floods above 60 mm/day", "3 pothole accidents"]
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
