"""Run the whole next-rupee build and write the JSON the web app reads (contract: shared/schema.md)."""

import json
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

from pipeline import config
from pipeline.backtest import run_backtest, weight_stability
from pipeline.budget import attach_methods, best_methods, contractor_table, fill_budgets, method_table, with_cost_ratio
from pipeline.data import load, write_json
from pipeline.index import FACTORS, road_factors, score_issues, severity_by_type
from pipeline.issues import open_issues, prepare_complaints
from pipeline.roads import road_table

REASON_FACTORS = 3  # how many of the biggest contributing factors get a plain-language reason


def _reason(factor: str, issue: pd.Series, road: pd.Series | None) -> str:
    if factor == "severity":
        return f"{issue.work_type} is a severity {issue.severity_1to5:.1f}/5 problem (BMC normally allows ~{_sla(issue.severity_1to5)} h to fix it)"
    if road is None:
        return {"flood": "Flood-prone ward", "history": "Repeat problem area", "traffic": "Busy road area", "accidents": "Accident-prone area", "facilities": "Near hospitals or schools"}[factor]
    if factor == "flood":
        near = f"{int(round(road.hs_dist_m, -1))} m from {road.hs_name} flood hotspot (floods above {int(road.hs_threshold_mm)} mm/day{', tide-sensitive' if road.hs_tide else ''})"
        return f"{near}; ward low-lying index {road.low_lying_index:.2f}" if road.hs_dist_m < 1000 else f"Low-lying ward (index {road.low_lying_index:.2f})"
    if factor == "history":
        return f"{int(road.n_complaints)} complaints and {int(road.n_reopens)} failed repairs already logged on this road"
    if factor == "traffic":
        return f"Congestion {road.congestion_index_0_10:.1f}/10, {int(road.peak_hour_vehicles):,} vehicles in the peak hour{', BEST bus route' if road.bus else ''}"
    if factor == "accidents":
        fatal = f" ({int(road.acc_defect_fatal)} fatal)" if road.acc_defect_fatal else ""
        return f"{int(road.acc_defect)} accidents caused by road defects on this road{fatal}"
    hospitals = road.hospital_names or None
    if hospitals:
        return f"Ambulance access road for {hospitals}"
    return f"Access road for {int(road.n_school)} municipal school(s)"


def _sla(severity: float) -> int:
    return int(round(config.SLA_SEVERITY_MAX_H + (5 - severity) / 4 * (config.SLA_SEVERITY_MIN_H - config.SLA_SEVERITY_MAX_H)))


def _reasons(issue: pd.Series, roads: pd.DataFrame) -> list[str]:
    road = roads.loc[issue.road_id] if issue.road_id in roads.index else None
    ranked = sorted(FACTORS, key=lambda f: issue[f"contrib_{f}"], reverse=True)
    reasons = [_reason(f, issue, road) for f in ranked[:REASON_FACTORS] if issue[f"contrib_{f}"] > 0.01]
    if issue.dlp:
        reasons.append("Road is under its defect liability period: the original contractor should repair it at no cost to BMC")
    return reasons


def _record(issue: pd.Series, roads: pd.DataFrame) -> dict:
    road_name = roads.road_name.get(issue.road_id) if issue.road_id in roads.index else None
    return {
        "rank": int(issue.rank_in_ward),
        "issue_id": issue.issue_id,
        "road_id": issue.road_id if isinstance(issue.road_id, str) else None,
        "road_name": road_name if isinstance(road_name, str) else issue.locality,
        "locality": issue.locality,
        "work_type": issue.work_type,
        "recommended_method": issue.recommended_method,
        "est_cost_inr": int(issue.method_cost_inr),
        "cost_to_bmc_inr": int(issue.cost_to_bmc_inr),
        "priority_score": round(float(issue.score) * 100, 1),
        "factors": {f: round(float(issue[f"contrib_{f}"]) * 100, 1) for f in FACTORS},
        "funded": bool(issue.funded),
        "funded_max_value": bool(issue.funded_max_value),
        "cumulative_cost_inr": int(issue.cumulative_cost_inr),
        "dlp": bool(issue.dlp),
        "recommended_contractors": issue.recommended_contractors,
        "expected_reopen_rate": float(issue.expected_reopen_rate),
        "n_complaints": int(issue.n_complaints),
        "complaint_ids": issue.complaint_ids,
        "road_match": issue.road_source,
        "reasons": _reasons(issue, roads),
    }


def build() -> dict:
    wards = load("wards").set_index("ward_code")
    wo = with_cost_ratio(load("work_orders"), load("rate_card"))
    complaints = prepare_complaints()
    issues = open_issues(complaints)
    roads = road_table(complaints)
    factors = road_factors(roads)
    severity = severity_by_type(wo)

    methods = method_table(wo)
    best = best_methods(methods)
    contractors = contractor_table(wo)

    scored = score_issues(issues, factors, roads, severity)
    scored = attach_methods(scored, roads, best, contractors)
    remaining = wards.monsoon_repair_budget_inr_2025 - wo.groupby("ward_code").cost_inr.sum()
    planned, ward_plan = fill_budgets(scored, remaining)

    stability, jaccard = weight_stability(issues, factors, roads, severity)
    planned["p_top3_under_weight_changes"] = planned.issue_id.map(stability)
    backtest = run_backtest(complaints)

    ward_plan["budget_inr"] = wards.monsoon_repair_budget_inr_2025
    ward_plan["spend_inr"] = wo.groupby("ward_code").cost_inr.sum()
    ward_plan["need_score_sum"] = planned.groupby("ward_code").score.sum()
    ward_plan["risk_score"] = (100 * ward_plan.need_score_sum / ward_plan.need_score_sum.max()).round().astype(int)
    ward_plan["over_budget"] = ward_plan.spend_inr > ward_plan.budget_inr
    dlp_free = planned[planned.dlp].groupby("ward_code").size()
    ward_plan["dlp_issues"] = dlp_free.reindex(ward_plan.index).fillna(0).astype(int)

    per_ward = {}
    for ward, g in planned.groupby("ward_code"):
        info = ward_plan.loc[ward]
        per_ward[ward] = {
            "ward_code": ward,
            "ward_name": wards.ward_name[ward],
            "budget_inr": int(info.budget_inr),
            "spend_inr": int(info.spend_inr),
            "remaining_budget_inr": int(info.remaining_budget_inr),
            "over_budget": bool(info.over_budget),
            "banner": (
                "Season spend already exceeds the budget: reallocate funds or recover payments on roads still under defect liability."
                if info.over_budget
                else None
            ),
            "open_issues": int(info.open_issues),
            "funded_issues": int(info.funded_issues),
            "max_value_funded_issues": int(info.max_value_funded_issues),
            "need_inr": int(info.need_inr),
            "spend_planned_inr": int(info.spend_planned_inr),
            "greedy_vs_optimal": float(info.greedy_vs_optimal),
            "risk_score": int(info.risk_score),
            "issues": [_record(r, roads) for _, r in g.sort_values("rank_in_ward").iterrows()],
        }

    road_level = (
        planned.dropna(subset=["road_id"])
        .groupby("road_id")
        .agg(ward_code=("ward_code", "first"), open_issues=("issue_id", "size"), priority_score=("score", "sum"), work_types=("work_type", lambda s: sorted(set(s))))
        .reset_index()
    )
    road_level["road_name"] = road_level.road_id.map(roads.road_name)
    road_level["priority_score"] = (road_level.priority_score * 100).round(1)
    road_level["rank_in_ward"] = road_level.groupby("ward_code").priority_score.rank(ascending=False, method="first").astype(int)
    road_level = road_level.sort_values(["ward_code", "rank_in_ward"])

    return {
        "issues": planned,
        "wards": per_ward,
        "roads": road_level,
        "methods": methods,
        "contractors": contractors,
        "backtest": backtest,
        "stability": {"mean_top3_jaccard": round(jaccard, 3), "perturbations": config.WEIGHT_PERTURBATIONS, "weight_scale": [0.5, 1.5]},
        "severity": severity.round(2).to_dict(),
        "weights": config.WEIGHTS,
    }


def write(result: dict) -> None:
    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(timespec="seconds")
    write_json(
        "next_rupee",
        {
            "generated_at": now,
            "weights": result["weights"],
            "severity_by_work_type": result["severity"],
            "wards": list(result["wards"].values()),
            "roads": json.loads(result["roads"].to_json(orient="records")),
            "methods": json.loads(result["methods"].to_json(orient="records")),
            "contractor_tiers": json.loads(result["contractors"].to_json(orient="records")),
            "weight_stability": result["stability"],
        },
        compact=True,
    )
    write_json("validation", {"generated_at": now, **result["backtest"]})
