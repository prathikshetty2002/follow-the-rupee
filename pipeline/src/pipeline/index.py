"""The next-rupee priority index: weighted sum of 0-1 factors, severity from the complaint category."""

import numpy as np
import pandas as pd

from pipeline import config

FACTORS = ("severity", "flood", "history", "traffic", "accidents", "facilities")


def minmax(s: pd.Series) -> pd.Series:
    lo, hi = s.min(), s.max()
    return (s - lo) / (hi - lo) if hi > lo else s * 0.0


def severity_by_type(work_orders: pd.DataFrame) -> pd.Series:
    """Severity 1-5 per work type from its mean SLA (24 h = 5 ... 168 h = 1), as BMC sets SLA by severity."""
    sla = work_orders.groupby("work_type").sla_hours.mean()
    span = config.SLA_SEVERITY_MIN_H - config.SLA_SEVERITY_MAX_H
    return (5 - 4 * (sla - config.SLA_SEVERITY_MAX_H) / span).clip(1, 5)


def road_factors(roads: pd.DataFrame) -> pd.DataFrame:
    """Per-road 0-1 factors, min-max scaled across the city so a weight means the same everywhere."""
    near = np.exp(-roads.hs_dist_m / config.FLOOD_DISTANCE_SCALE_M)
    near = (near * (1 + (config.FLOOD_TIDE_BUMP - 1) * roads.hs_tide)).clip(upper=1)
    flood = config.FLOOD_MIX["hotspot"] * near + config.FLOOD_MIX["low_lying"] * roads.low_lying_index

    history = config.HISTORY_MIX["complaints"] * np.log1p(roads.n_complaints) + config.HISTORY_MIX["reopens"] * np.log1p(roads.n_reopens)

    t = config.TRAFFIC_MIX
    traffic = t["congestion"] * minmax(roads.congestion_index_0_10) + t["peak_vehicles"] * minmax(roads.peak_hour_vehicles) + t["bus_route"] * roads.bus

    accidents = np.log1p(roads.acc_defect + config.FATAL_ACCIDENT_WEIGHT * roads.acc_defect_fatal)
    w = config.FACILITY_WEIGHTS
    facilities = np.log1p(w["emergency_hospital"] * roads.n_emerg_hosp + w["school"] * roads.n_school)

    return pd.DataFrame(
        {
            "flood": minmax(flood),
            "history": minmax(history),
            "traffic": minmax(traffic),
            "accidents": minmax(accidents),
            "facilities": minmax(facilities),
        },
        index=roads.index,
    )


def road_score(factors: pd.DataFrame, weights: dict = config.WEIGHTS, use=("flood", "history", "traffic", "accidents", "facilities")) -> pd.Series:
    """Category-free road ranking (severity omitted, remaining weights renormalised). Used by the backtest."""
    w = pd.Series({k: weights[k] for k in use})
    return (factors[list(use)] * (w / w.sum())).sum(axis=1)


def score_issues(issues: pd.DataFrame, factors: pd.DataFrame, roads: pd.DataFrame, severity: pd.Series, weights: dict = config.WEIGHTS) -> pd.DataFrame:
    """Score every open issue and rank it within its ward. Issues with no road get their ward's median road."""
    out = issues.copy()
    ward_median = factors.join(roads.ward_code).groupby("ward_code").median()
    for name in factors.columns:
        by_road = out.road_id.map(factors[name])
        out[name] = by_road.fillna(out.ward_code.map(ward_median[name])).fillna(factors[name].median())
    out["severity_1to5"] = out.work_type.map(severity).fillna(severity[config.DEFAULT_WORK_TYPE])
    out["severity"] = out.severity_1to5 / 5

    for name in FACTORS:
        out[f"contrib_{name}"] = weights[name] * out[name]
    base = out[[f"contrib_{n}" for n in FACTORS]].sum(axis=1)
    out["tiebreak"] = config.UPVOTE_TIEBREAK * minmax(out.upvotes)
    out["score"] = base + out.tiebreak
    out["rank_in_ward"] = out.groupby("ward_code").score.rank(ascending=False, method="first").astype(int)
    return out.sort_values(["ward_code", "rank_in_ward"]).reset_index(drop=True)
