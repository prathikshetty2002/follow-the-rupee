from datetime import datetime, timezone, timedelta

from pipeline.data import load, write_json

wo = load("work_orders")
wards = load("wards")
roads = load("roads").set_index("road_id")
rate = load("rate_card").set_index("repair_method")
ct = load("contractors")
cx = load("complaints")

write_json("meta", {"generated_at": datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(timespec="seconds"),
                    "stub": True, "season": "Jun–Sep 2025"})

out = []
for _, w in wards.iterrows():
    g = wo[wo.ward_code == w.ward_code]
    top_roads = g.groupby("road_id").size().sort_values(ascending=False).head(3).index
    out.append({
        "ward_code": w.ward_code, "ward_name": w.ward_name,
        "budget_inr": int(w.monsoon_repair_budget_inr_2025), "spend_inr": int(g.cost_inr.sum()),
        "spend_on_failed_inr": int(g[g.reopened_within_30d == "Y"].cost_inr.sum()),
        "work_orders": len(g), "sla_met_rate": round((g.sla_met == "Y").mean(), 2),
        "reopen_rate": round((g.reopened_within_30d == "Y").mean(), 2),
        "low_lying_index": float(w.low_lying_index), "risk_score": int(round(w.low_lying_index * 100)),
        "spend_by_method": [{"repair_method": k, "spend_inr": int(v)} for k, v in g.groupby("repair_method").cost_inr.sum().sort_values(ascending=False).items()],
        "spend_by_contractor": [{"contractor_id": k, "spend_inr": int(v)} for k, v in g.groupby("contractor_id").cost_inr.sum().sort_values(ascending=False).items()],
        "summary": f"[STUB] {w.ward_name}: placeholder summary. Claude will write this.",
        "next_rupee": [{"rank": i + 1, "road_id": r, "road_name": roads.loc[r, "road_name"], "recommended_method": "Mastic asphalt",
                        "est_cost_inr": 150000, "reasons": ["[STUB] reason"]} for i, r in enumerate(top_roads)],
    })
write_json("wards", out)

out = []
for _, c in ct.iterrows():
    g = wo[wo.contractor_id == c.contractor_id]
    out.append({
        "contractor_id": c.contractor_id, "contractor_name": c.contractor_name,
        "wards": [s.strip() for s in c.active_wards.split(";")], "work_orders": len(g), "spend_inr": int(g.cost_inr.sum()),
        "sla_met_rate": round((g.sla_met == "Y").mean(), 2), "reopen_rate": round((g.reopened_within_30d == "Y").mean(), 2),
        "cost_vs_rate_pct": 0.0, "context_adjusted_score": 70, "grade": "B",
        "scorecard_text": "[STUB] Plain-language scorecard goes here.", "improve": "[STUB]",
        "evidence_work_order_ids": g.work_order_id.head(3).tolist(),
    })
write_json("contractors", out)

flags = []
for _, r in wo[wo.reopened_within_30d == "Y"].head(15).iterrows():
    flags.append({"work_order_id": r.work_order_id, "ward_code": r.ward_code, "road_id": r.road_id, "contractor_id": r.contractor_id,
                  "flag_type": "reopened", "severity": "medium", "amount_at_risk_inr": int(r.cost_inr),
                  "reason": "[STUB] Fix failed within 30 days.", "evidence_work_order_ids": [r.work_order_id]})
write_json("flags", flags)

issues = []
for i, (_, r) in enumerate(wo[wo.linked_complaint_ids.notna()].head(20).iterrows()):
    ids = r.linked_complaint_ids.split("|")
    first = cx[cx.complaint_id.isin(ids)].sort_values("received_at").iloc[0]
    issues.append({"issue_id": f"ISS-{i + 1:04d}", "complaint_ids": ids, "social_post_ids": [], "ward_code": r.ward_code,
                   "locality": first.locality_text, "lat": None if first.isna().lat else float(first.lat),
                   "lon": None if first.isna().lon else float(first.lon), "category": r.work_type,
                   "first_reported_at": first.received_at.isoformat(),
                   "status": "fixed_failed" if r.reopened_within_30d == "Y" else "fixed", "work_order_ids": [r.work_order_id]})
write_json("issues", issues)
print("stubs written")
