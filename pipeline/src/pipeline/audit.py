"""Audit flags on work orders: billing integrity and performance, each with the work orders behind it.

Billing integrity (high confidence, money at stake): over_billed, double_billed, dlp_paid.
Performance (context, fairness-adjusted): sla_missed, reopened.
"""

import json

import numpy as np
import pandas as pd

from pipeline import config
from pipeline.budget import with_cost_ratio
from pipeline.data import load, write_json

BILLING = ("over_billed", "double_billed", "dlp_paid")
SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
LEVELS = ["low", "medium", "high"]


def _inr(x: float) -> str:
    """Indian digit grouping: 1,16,079."""
    s = f"{int(round(x)):d}"
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return "₹" + ",".join(parts + [tail])


def prepare(wo: pd.DataFrame, roads: pd.DataFrame, complaints: pd.DataFrame, rainfall: pd.DataFrame, wards: pd.DataFrame) -> pd.DataFrame:
    """Work orders with the road facts, first-complaint time, response ratio and heavy-rain days in the window."""
    d = wo.merge(roads[["road_id", "under_dlp", "last_resurfaced", "road_name"]], on="road_id", how="left")
    links = d[["work_order_id", "linked_complaint_ids"]].dropna()
    links = links.assign(complaint_id=links.linked_complaint_ids.str.split("|")).explode("complaint_id")
    first = links.merge(complaints[["complaint_id", "received_at"]], on="complaint_id").groupby("work_order_id").received_at.min()
    d["first_complaint_at"] = d.work_order_id.map(first)
    d["response_h"] = (d.completed_at - d.first_complaint_at).dt.total_seconds() / 3600
    d["sla_ratio"] = d.response_h / d.sla_hours

    station = np.where(wards.set_index("ward_code").centroid_lat < config.STATION_SPLIT_LAT, "Colaba", "Santacruz")
    d["station"] = d.ward_code.map(pd.Series(station, index=wards.ward_code))
    heavy = rainfall[rainfall.imd_category.isin(config.HEAVY_RAIN_CATEGORIES)]
    heavy_days = {s: np.sort(g.date.values) for s, g in heavy.groupby("station")}
    counts = []
    for r in d.itertuples():
        days = heavy_days.get(r.station, np.array([], dtype="datetime64[ns]"))
        if pd.isna(r.first_complaint_at):
            counts.append(0)
            continue
        lo, hi = r.first_complaint_at.normalize().to_datetime64(), r.completed_at.normalize().to_datetime64()
        counts.append(int(np.searchsorted(days, hi, side="right") - np.searchsorted(days, lo, side="left")))
    d["heavy_rain_days"] = counts
    return d


def _flags(d: pd.DataFrame, flag_type: str, severity, amount, reason, evidence, details) -> pd.DataFrame:
    out = d[["work_order_id", "ward_code", "road_id", "contractor_id", "contractor_name", "work_type", "repair_method", "cost_inr"]].copy()
    out["flag_type"] = flag_type
    out["kind"] = "billing" if flag_type in BILLING else "performance"
    out["severity"] = severity
    out["amount_at_risk_inr"] = np.asarray(amount, float).round().astype(int)
    out["reason"] = reason
    out["evidence_work_order_ids"] = evidence
    out["details"] = details
    return out


def over_billed(d: pd.DataFrame) -> pd.DataFrame:
    x = d[d.cost_ratio > config.OVERBILL_RATIO]
    if x.empty:
        return x.iloc[0:0]
    reason = [
        f"Billed {_inr(r.cost_inr)} for work the rate card prices at about {_inr(r.expected_cost)} ({r.cost_ratio:.1f}× the rate; normal jobs stay within {config.NORMAL_RATIO_MAX}×)."
        for r in x.itertuples()
    ]
    return _flags(
        x, "over_billed",
        np.where(x.cost_ratio >= config.OVERBILL_HIGH_RATIO, "high", "medium"),
        x.cost_inr - config.NORMAL_RATIO_MAX * x.expected_cost,
        reason,
        [[i] for i in x.work_order_id],
        [{"cost_ratio": round(r.cost_ratio, 2), "expected_cost_inr": int(round(r.expected_cost)), "unit": r.unit} for r in x.itertuples()],
    )


def double_billed(d: pd.DataFrame) -> pd.DataFrame:
    """A job with no complaint linked, repeating an earlier job on the same road and work type within days."""
    window = pd.Timedelta(days=config.DOUBLE_BILL_WINDOW_DAYS)
    rows = []
    for r in d[d.linked_complaint_ids.isna()].itertuples():
        twins = d[(d.road_id == r.road_id) & (d.work_type == r.work_type) & (d.work_order_id != r.work_order_id) & (d.assigned_at <= r.assigned_at) & (d.assigned_at >= r.assigned_at - window)]
        if twins.empty:
            continue
        near = twins.sort_values("assigned_at").iloc[-1]
        gap = (r.assigned_at - near.assigned_at).total_seconds() / 86400
        same = near.contractor_id == r.contractor_id and near.repair_method == r.repair_method
        who = "the same contractor" if near.contractor_id == r.contractor_id else f"{near.contractor_id}"
        rows.append(
            (
                r.Index,
                "high" if same else "medium",
                f"No complaint is linked, and {who} billed the same work ({r.work_type.lower()}, {r.repair_method.lower()}) on this road {gap:.0f} days earlier ({near.work_order_id}): looks like one job billed twice.",
                [r.work_order_id] + twins.work_order_id.tolist(),
                {"days_after_earlier_job": round(gap, 1), "earlier_work_order_id": near.work_order_id, "same_contractor": bool(near.contractor_id == r.contractor_id), "same_method": bool(near.repair_method == r.repair_method)},
            )
        )
    if not rows:
        return d.iloc[0:0]
    idx, sev, reason, evidence, details = zip(*rows)
    x = d.loc[list(idx)]
    return _flags(x, "double_billed", list(sev), x.cost_inr, list(reason), list(evidence), list(details))


def dlp_paid(d: pd.DataFrame) -> pd.DataFrame:
    """Repair billed to BMC on a road still under its defect liability period."""
    x = d[(d.under_dlp == "Y") & (d.cost_inr > 0)]
    if x.empty:
        return x.iloc[0:0]
    carriageway = x.work_type.isin(config.CARRIAGEWAY_WORK)
    reason = [
        f"Road {r.road_id} was resurfaced on {r.last_resurfaced:%d %b %Y} and is still under its defect liability period, yet BMC paid {_inr(r.cost_inr)} for this repair; the original contractor should do it free."
        + ("" if c else " Drainage or pumping work: confirm the defect is one the DLP covers.")
        for r, c in zip(x.itertuples(), carriageway)
    ]
    return _flags(
        x, "dlp_paid", np.where(carriageway, "high", "low"), x.cost_inr, reason,
        [[i] for i in x.work_order_id],
        [{"last_resurfaced": f"{r.last_resurfaced:%Y-%m-%d}", "carriageway_work": bool(c)} for r, c in zip(x.itertuples(), carriageway)],
    )


def sla_missed(d: pd.DataFrame) -> pd.DataFrame:
    """Only clear misses (at least 2x the target), eased one level when heavy rain fell during the response window."""
    x = d[(d.sla_met == "N") & (d.sla_ratio >= config.SLA_FLAG_RATIO)]
    if x.empty:
        return x.iloc[0:0]
    level = np.where(x.sla_ratio >= config.SLA_HIGH_RATIO, 2, np.where(x.sla_ratio >= config.SLA_MEDIUM_RATIO, 1, 0))
    eased = (x.heavy_rain_days > 0).to_numpy()
    level = np.where(eased, np.maximum(level - 1, 0), level)
    reason = [
        f"Fixed {r.response_h:.0f} h after the first complaint against a {r.sla_hours} h target ({r.sla_ratio:.1f}×)."
        + (f" Heavy rain fell on {r.heavy_rain_days} day(s) of that window, so this is rated one level lower." if r.heavy_rain_days else "")
        for r in x.itertuples()
    ]
    return _flags(
        x, "sla_missed", [LEVELS[i] for i in level], np.zeros(len(x)), reason,
        [[i] for i in x.work_order_id],
        [{"response_hours": round(r.response_h, 1), "sla_hours": int(r.sla_hours), "sla_ratio": round(r.sla_ratio, 2), "heavy_rain_days": int(r.heavy_rain_days)} for r in x.itertuples()],
    )


def reopened(d: pd.DataFrame, contractor_rates: pd.Series, city_rate: float) -> pd.DataFrame:
    """Repair failed within 30 days. Context shown so a contractor is not blamed for a normal city-wide failure rate."""
    x = d[d.reopened == 1]
    repeats = x.groupby(["road_id", "work_type"]).work_order_id.transform("size")
    dlp = (x.under_dlp == "Y").to_numpy()
    severity = np.where(dlp, "high", np.where(repeats >= 2, "medium", "low"))
    reason = [
        f"Repair failed within 30 days, so {_inr(r.cost_inr)} bought no lasting fix ({r.contractor_id} re-opens {contractor_rates[r.contractor_id]:.0%} of its jobs; city average {city_rate:.0%})."
        + (f" It failed {n} times on this road for this work type." if n >= 2 else "")
        + (" The road is under its defect liability period, so this should have been free." if p else "")
        for r, n, p in zip(x.itertuples(), repeats, dlp)
    ]
    return _flags(
        x, "reopened", severity, x.cost_inr, reason,
        [[i] for i in x.work_order_id],
        [{"contractor_reopen_rate": round(float(contractor_rates[r.contractor_id]), 3), "city_reopen_rate": round(float(city_rate), 3), "failures_same_road_and_type": int(n)} for r, n in zip(x.itertuples(), repeats)],
    )


def build_flags() -> tuple[pd.DataFrame, pd.DataFrame]:
    """(flags, enriched work orders). One row per flag; a work order can carry several."""
    wo = with_cost_ratio(load("work_orders"), load("rate_card"))
    d = prepare(wo, load("roads"), load("complaints"), load("rainfall_daily"), load("wards"))
    city_rate = d.reopened.mean()
    rates = d.groupby("contractor_id").reopened.mean()
    flags = pd.concat([over_billed(d), double_billed(d), dlp_paid(d), sla_missed(d), reopened(d, rates, city_rate)], ignore_index=True)
    flags["_sev"] = flags.severity.map(SEVERITY_ORDER)
    flags = flags.sort_values(["kind", "_sev", "amount_at_risk_inr"], ascending=[True, True, False]).drop(columns="_sev").reset_index(drop=True)
    return flags, d


def summarise(flags: pd.DataFrame, d: pd.DataFrame) -> dict:
    """Counts and money by flag type, ward and contractor; billing totals count each work order once."""
    def block(f: pd.DataFrame, jobs: int) -> dict:
        billing = f[f.kind == "billing"]
        unique = billing.drop_duplicates("work_order_id")
        return {
            "work_orders": jobs,
            "flags": len(f),
            "by_type": {t: {"count": int(len(g)), "amount_at_risk_inr": int(g.amount_at_risk_inr.sum())} for t, g in f.groupby("flag_type")},
            "billing_flagged_work_orders": int(unique.work_order_id.nunique()),
            "billing_flagged_cost_inr": int(unique.cost_inr.sum()),
            "high_severity": int((f.severity == "high").sum()),
        }

    out = {"city": block(flags, len(d))}
    out["by_ward"] = [{"ward_code": k, **block(flags[flags.ward_code == k], int((d.ward_code == k).sum()))} for k in sorted(d.ward_code.unique())]
    out["by_contractor"] = [
        {"contractor_id": k, "contractor_name": g.contractor_name.iloc[0], **block(flags[flags.contractor_id == k], len(g))} for k, g in d.groupby("contractor_id")
    ]
    out["thresholds"] = {
        "over_billed_ratio": config.OVERBILL_RATIO,
        "double_bill_window_days": config.DOUBLE_BILL_WINDOW_DAYS,
        "sla_flag_ratio": config.SLA_FLAG_RATIO,
        "normal_cost_range_vs_rate_card": [0.75, config.NORMAL_RATIO_MAX],
    }
    return out


def write(flags: pd.DataFrame, summary: dict) -> None:
    """flags.json (shape in shared/schema.md) and audit_summary.json."""
    cols = [
        "work_order_id", "ward_code", "road_id", "contractor_id", "flag_type", "severity", "amount_at_risk_inr", "reason", "evidence_work_order_ids",
        "kind", "contractor_name", "work_type", "repair_method", "cost_inr", "details",
    ]
    write_json("flags", json.loads(flags[cols].to_json(orient="records")))
    write_json("audit_summary", summary)
