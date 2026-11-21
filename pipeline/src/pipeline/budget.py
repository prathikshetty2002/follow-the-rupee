"""Method choice, contractor tiers and the per-ward budget fill for the ranked open issues."""

import numpy as np
import pandas as pd
from scipy.optimize import Bounds, LinearConstraint, milp

from pipeline import config

MIN_JOBS_FOR_METHOD = 30
GOOD_TIER_MAX, POOR_TIER_MIN = 0.75, 1.2  # contractor re-open rate relative to the city average


def with_cost_ratio(work_orders: pd.DataFrame, rate_card: pd.DataFrame) -> pd.DataFrame:
    wo = work_orders.merge(rate_card, on="repair_method", how="left")
    per_sqm = wo.unit == "per sqm"
    wo["expected_cost"] = np.where(per_sqm, wo.area_sqm * wo.standard_rate_inr, wo.standard_rate_inr)
    wo["cost_ratio"] = wo.cost_inr / wo.expected_cost
    wo["reopened"] = (wo.reopened_within_30d == "Y").astype(int)
    return wo


def method_table(wo: pd.DataFrame) -> pd.DataFrame:
    """Re-open rate and typical cost per (work type, method). Cost excludes over-billed jobs."""
    clean = wo[wo.cost_ratio <= config.OVERBILL_RATIO]
    t = wo.groupby(["work_type", "repair_method"]).agg(jobs=("reopened", "size"), reopen_rate=("reopened", "mean"))
    t["est_cost_inr"] = clean.groupby(["work_type", "repair_method"]).cost_inr.mean().round(-2)
    t["cost_per_durable_fix_inr"] = (t.est_cost_inr / (1 - t.reopen_rate)).round(-2)
    return t.reset_index()


def best_methods(table: pd.DataFrame) -> pd.DataFrame:
    """Per work type, the method with the lowest re-open rate (ties go to the cheaper one)."""
    ok = table[table.jobs >= MIN_JOBS_FOR_METHOD]
    return ok.sort_values(["work_type", "reopen_rate", "est_cost_inr"]).groupby("work_type").head(1).set_index("work_type")


def contractor_table(wo: pd.DataFrame) -> pd.DataFrame:
    overall = wo.reopened.mean()
    t = wo.groupby(["contractor_id", "contractor_name"]).agg(jobs=("reopened", "size"), reopen_rate=("reopened", "mean")).reset_index()
    z = 1.96
    n, p = t.jobs, t.reopen_rate
    centre = (p + z**2 / (2 * n)) / (1 + z**2 / n)
    half = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / (1 + z**2 / n)
    t["reopen_ci_low"], t["reopen_ci_high"] = (centre - half).round(3), (centre + half).round(3)
    t["vs_city"] = (p / overall).round(2)
    t["tier"] = np.where(t.vs_city <= GOOD_TIER_MAX, "good", np.where(t.vs_city >= POOR_TIER_MIN, "poor", "middle"))
    return t.sort_values("reopen_rate").reset_index(drop=True)


def attach_methods(scored: pd.DataFrame, roads: pd.DataFrame, best: pd.DataFrame, contractors: pd.DataFrame) -> pd.DataFrame:
    out = scored.copy()
    out["recommended_method"] = out.work_type.map(best.repair_method)
    out["method_reopen_rate"] = out.work_type.map(best.reopen_rate)
    out["method_cost_inr"] = out.work_type.map(best.est_cost_inr)
    out["dlp"] = out.road_id.map(roads.under_dlp).eq("Y")
    # A defect-liability repair is the original contractor's job at no cost to BMC.
    out["cost_to_bmc_inr"] = np.where(out.dlp, 0.0, out.method_cost_inr)
    top = contractors[contractors.tier == "good"].contractor_id.tolist() or contractors.contractor_id.head(3).tolist()
    out["recommended_contractors"] = [["original DLP contractor"] if d else top for d in out.dlp]
    best_multiplier = contractors.vs_city.min()
    out["expected_reopen_rate"] = (out.method_reopen_rate * np.where(out.dlp, 1.0, best_multiplier)).clip(0, 1).round(3)
    return out


def greedy_fill(issues: pd.DataFrame, budget: float) -> pd.Series:
    """Fund issues in priority order while the money lasts; skip ones that no longer fit."""
    funded, left = [], budget
    for cost in issues.sort_values("score", ascending=False).cost_to_bmc_inr:
        take = cost <= left
        funded.append(take)
        left -= cost if take else 0
    order = issues.sort_values("score", ascending=False).index
    return pd.Series(funded, index=order).reindex(issues.index)


def knapsack(issues: pd.DataFrame, budget: float) -> tuple[float, pd.Series]:
    """Exact 0/1 knapsack on priority score: the most total priority the budget can buy.

    Differs from the priority-order fill because it will take several cheap issues over one
    expensive top-ranked one. Returns (best total score, selected flag per issue).
    """
    if issues.empty:
        return 0.0, pd.Series(dtype=bool)
    cost, value = issues.cost_to_bmc_inr.to_numpy(float), issues.score.to_numpy(float)
    res = milp(
        c=-value,
        constraints=LinearConstraint(cost[None, :], ub=max(budget, 0.0)),
        integrality=np.ones(len(value)),
        bounds=Bounds(0, 1),
    )
    if not res.success:
        return float("nan"), pd.Series(False, index=issues.index)
    return float(-res.fun), pd.Series(res.x > 0.5, index=issues.index)


def fill_budgets(issues: pd.DataFrame, remaining: pd.Series) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Per-ward greedy fill plus the exact-optimum check. `remaining` is budget minus season spend, floored at 0."""
    out = issues.copy()
    out["funded"] = False
    out["funded_max_value"] = False
    rows = []
    for ward, g in out.groupby("ward_code"):
        budget = float(max(remaining.get(ward, 0.0), 0.0))
        out.loc[g.index, "funded"] = greedy_fill(g, budget)
        out.loc[g.index, "cumulative_cost_inr"] = g.sort_values("score", ascending=False).cost_to_bmc_inr.cumsum().reindex(g.index)
        greedy = g.score[out.loc[g.index, "funded"]].sum()
        best, picked = knapsack(g, budget)
        out.loc[g.index, "funded_max_value"] = picked
        rows.append(
            {
                "ward_code": ward,
                "remaining_budget_inr": budget,
                "open_issues": len(g),
                "funded_issues": int(out.loc[g.index, "funded"].sum()),
                "need_inr": float(g.cost_to_bmc_inr.sum()),
                "spend_planned_inr": float(g.cost_to_bmc_inr[out.loc[g.index, "funded"]].sum()),
                "greedy_value": round(greedy, 4),
                "optimal_value": round(best, 4),
                "max_value_funded_issues": int(picked.sum()),
                "greedy_vs_optimal": round(greedy / best, 4) if best else 1.0,
            }
        )
    return out, pd.DataFrame(rows).set_index("ward_code")
