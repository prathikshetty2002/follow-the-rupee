"""Validate the index without labels: score on June-July, check it against August-September.

Roads that the index ranks high should be the ones that went on to generate the most work orders,
complaints, re-opens and spend. Also measures how stable the top picks are under weight changes.
"""

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from pipeline import config
from pipeline.data import load
from pipeline.index import road_factors, road_score, score_issues
from pipeline.roads import complaint_roads, road_table

OUTCOMES = {"work_orders": "wo", "complaints": "cmp", "reopens": "re", "spend": "spend"}


def _outcomes(roads: pd.DataFrame, complaints: pd.DataFrame) -> pd.DataFrame:
    wo = load("work_orders")
    cx = complaint_roads(complaints)
    cut, end = config.BACKTEST_CUTOFF, config.BACKTEST_END
    w = wo[(wo.assigned_at >= cut) & (wo.assigned_at < end)]
    c = cx[(cx.received_at >= cut) & (cx.received_at < end)]
    out = pd.DataFrame(index=roads.index)
    out["wo"] = roads.index.map(w.groupby("road_id").size()).fillna(0)
    out["cmp"] = roads.index.map(c.groupby("road").size()).fillna(0)
    out["re"] = roads.index.map(w[w.reopened_within_30d == "Y"].groupby("road_id").size()).fillna(0)
    out["spend"] = roads.index.map(w.groupby("road_id").cost_inr.sum()).fillna(0)
    return out


def _rank_corr(score: pd.Series, outcome: pd.Series, ward: pd.Series) -> tuple[float, float]:
    city = spearmanr(score, outcome).correlation
    per_ward = [
        spearmanr(score[ward == w], outcome[ward == w]).correlation
        for w in ward.unique()
        if (ward == w).sum() >= 5 and outcome[ward == w].nunique() > 1
    ]
    return city, float(np.nanmean(per_ward))


def _precision_at_k(score: pd.Series, outcome: pd.Series, ward: pd.Series, k: int = config.TOP_K_WARD) -> float:
    hits = []
    for w in ward.unique():
        s, o = score[ward == w], outcome[ward == w]
        if len(s) < 2 * k:
            continue
        top_pred = set(s.nlargest(k).index)
        top_true = set(o.sort_values(ascending=False, kind="stable").head(k).index)
        hits.append(len(top_pred & top_true) / k)
    return float(np.mean(hits))


def _bootstrap_ci(score: pd.Series, outcome: pd.Series, rng: np.random.Generator) -> tuple[float, float]:
    n = len(score)
    reps = []
    for _ in range(config.BOOTSTRAP_REPS):
        idx = rng.integers(0, n, n)
        reps.append(spearmanr(score.iloc[idx], outcome.iloc[idx]).correlation)
    lo, hi = np.nanpercentile(reps, [2.5, 97.5])
    return float(lo), float(hi)


def run_backtest(complaints: pd.DataFrame) -> dict:
    """Index built from data before the cut-off vs what happened after it."""
    rng = np.random.default_rng(config.RANDOM_SEED)
    roads = road_table(complaints, as_of=config.BACKTEST_CUTOFF)
    factors = road_factors(roads)
    outcomes = _outcomes(roads, complaints)
    ward = roads.ward_code

    z = lambda s: (s - s.mean()) / s.std()
    static = z(np.exp(-roads.hs_dist_m / config.FLOOD_DISTANCE_SCALE_M)) + z(roads.low_lying_index) + z(roads.congestion_index_0_10)
    static += z(roads.acc_defect) + z(roads.n_emerg_hosp + roads.n_school) + z(roads.bus)
    candidates = {
        "index (flood + history + impact terms)": road_score(factors),
        "index likelihood only (flood + history)": road_score(factors, use=("flood", "history")),
        "baseline: past work-order count": roads.n_wo,
        "baseline: past complaint count": roads.n_complaints,
        "baseline: equal-weight static factors": static,
    }
    rows = []
    for name, score in candidates.items():
        row = {"score": name}
        for label, col in OUTCOMES.items():
            city, in_ward = _rank_corr(score, outcomes[col], ward)
            row[f"{label}_city"], row[f"{label}_in_ward"] = round(city, 3), round(in_ward, 3)
        row["precision_at_3_work_orders"] = round(_precision_at_k(score, outcomes.wo, ward), 3)
        lo, hi = _bootstrap_ci(score, outcomes.wo, rng)
        row["work_orders_city_ci95"] = [round(lo, 3), round(hi, 3)]
        rows.append(row)

    return {
        "train": f"before {config.BACKTEST_CUTOFF.date()}",
        "test": f"{config.BACKTEST_CUTOFF.date()} to {(config.BACKTEST_END - pd.Timedelta(days=1)).date()}",
        "roads": len(roads),
        "random_precision_at_3": round(config.TOP_K_WARD / roads.groupby("ward_code").size().median(), 3),
        "results": rows,
    }


def weight_stability(issues: pd.DataFrame, factors: pd.DataFrame, roads: pd.DataFrame, severity: pd.Series) -> tuple[pd.Series, float]:
    """Re-score with every weight scaled by U(0.5, 1.5).

    Returns each issue's share of draws in which it stayed in its ward's top 3, and the mean
    Jaccard overlap between the perturbed and base top-3 sets.
    """
    rng = np.random.default_rng(config.RANDOM_SEED)
    base = pd.Series(config.WEIGHTS)
    base_scored = score_issues(issues, factors, roads, severity)
    base_top = {w: set(g.nsmallest(config.TOP_K_WARD, "rank_in_ward").issue_id) for w, g in base_scored.groupby("ward_code")}
    hits = pd.Series(0.0, index=base_scored.issue_id)
    overlap = []
    for _ in range(config.WEIGHT_PERTURBATIONS):
        w = base * rng.uniform(0.5, 1.5, len(base))
        s = score_issues(issues, factors, roads, severity, (w / w.sum()).to_dict())
        for ward, g in s.groupby("ward_code"):
            top = set(g.nsmallest(config.TOP_K_WARD, "rank_in_ward").issue_id)
            hits[list(top)] += 1
            overlap.append(len(top & base_top[ward]) / len(top | base_top[ward]))
    return hits / config.WEIGHT_PERTURBATIONS, float(np.mean(overlap))
