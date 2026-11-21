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


def weight_stability(issues: pd.DataFrame, factors: pd.DataFrame, roads: pd.DataFrame, severity: pd.Series) -> tuple[pd.DataFrame, float]:
    """Re-score with every weight scaled by U(0.5, 1.5).

    Returns each issue's rank range within its ward (5th to 95th percentile across the draws) and the mean
    Jaccard overlap between the perturbed and base top-3 sets.
    """
    rng = np.random.default_rng(config.RANDOM_SEED)
    base = pd.Series(config.WEIGHTS)
    base_scored = score_issues(issues, factors, roads, severity)
    column = {iid: j for j, iid in enumerate(base_scored.issue_id)}
    base_top = {w: set(g.nsmallest(config.TOP_K_WARD, "rank_in_ward").issue_id) for w, g in base_scored.groupby("ward_code")}
    ranks = np.zeros((config.WEIGHT_PERTURBATIONS, len(base_scored)))
    overlap = []
    for d in range(config.WEIGHT_PERTURBATIONS):
        w = base * rng.uniform(0.5, 1.5, len(base))
        s = score_issues(issues, factors, roads, severity, (w / w.sum()).to_dict())
        ranks[d, s.issue_id.map(column).to_numpy()] = s.rank_in_ward.to_numpy()
        for ward, g in s.groupby("ward_code"):
            top = set(g.nsmallest(config.TOP_K_WARD, "rank_in_ward").issue_id)
            overlap.append(len(top & base_top[ward]) / len(top | base_top[ward]))
    lo, hi = np.percentile(ranks, config.RANK_RANGE_PCT, axis=0)
    out = pd.DataFrame({"issue_id": base_scored.issue_id, "rank_low": lo.astype(int), "rank_high": np.ceil(hi).astype(int)})
    return out.set_index("issue_id"), float(np.mean(overlap))


def preset_backtests(complaints: pd.DataFrame, issues: pd.DataFrame, factors: pd.DataFrame, roads: pd.DataFrame, severity: pd.Series) -> list[dict]:
    """Backtest every weight preset the planner offers, so a user who changes the weights can see what it costs in accuracy.

    The backtest scores roads on everything except severity (it has no complaint category before the fact), so it measures the
    flood, past-trouble, traffic, accident and facility parts; severity is a stated judgement.
    """
    roads_b = road_table(complaints, as_of=config.BACKTEST_CUTOFF)
    factors_b = road_factors(roads_b)
    outcomes = _outcomes(roads_b, complaints)
    ward = roads_b.ward_code
    base = score_issues(issues, factors, roads, severity, config.WEIGHTS)
    top = lambda s: {w: set(g.nsmallest(config.TOP_K_WARD, "rank_in_ward").issue_id) for w, g in s.groupby("ward_code")}  # noqa: E731
    base_top = top(base)
    out = []
    for key, preset in config.WEIGHT_PRESETS.items():
        w = preset["weights"]
        use = tuple(k for k in ("flood", "history", "traffic", "accidents", "facilities") if w[k] > 0)
        rs = road_score(factors_b, w, use=use)
        city, in_ward = _rank_corr(rs, outcomes.wo, ward)
        t = top(score_issues(issues, factors, roads, severity, w))
        out.append(
            {
                "key": key,
                "label": preset["label"],
                "note": preset["note"],
                "weights": {k: float(v) for k, v in w.items()},
                "backtest": {"city": round(city, 3), "in_ward": round(in_ward, 3), "precision_at_3": round(_precision_at_k(rs, outcomes.wo, ward), 3)},
                "top3_overlap_with_default": round(float(np.mean([len(t[k] & base_top[k]) / len(t[k] | base_top[k]) for k in base_top])), 2),
            }
        )
    return out
