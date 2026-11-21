"""Fair contractor scorecards: each result is compared with what the city typically gets for the same mix of work.

Speed, durability and billing are scored against expectations built from the work type, repair method, road surface,
ward flood-proneness and heavy-rain windows, so a contractor is not marked down for getting hard jobs or a wet month.
Volume is never penalised. Payments on roads under defect liability are BMC's process, so they are shown, not scored.
"""

import json

import numpy as np
import pandas as pd

from pipeline import config
from pipeline.audit import _inr, build_flags
from pipeline.data import OUT_DIR, load, write_json
from pipeline.narrate import SCORECARD_SYSTEM, Writer, narrate

SLA_FACTORS = ["work_type", "rain_window", "low_lying"]
REOPEN_FACTORS = ["repair_method", "surface", "low_lying"]
EVIDENCE_PER_METRIC = {"over_billed": 3, "double_billed": 2, "reopened": 3, "sla_missed": 2}


def inr_short(x: float) -> str:
    """₹1.41 crore / ₹14.1 lakh: easier for a citizen to read than digit groups."""
    if x <= 0:
        return "₹0"
    if x >= 1e7:
        return f"₹{x / 1e7:.2f} crore"
    return f"₹{x / 1e5:.1f} lakh"


def expected_rate(df: pd.DataFrame, outcome: str, factors: list[str]) -> pd.Series:
    """Per-row expected outcome rate: the city rate scaled by each context factor, calibrated to the city total."""
    base = df[outcome].mean()
    mult = pd.Series(1.0, index=df.index)
    for f in factors:
        mult *= df.groupby(f)[outcome].transform("mean") / base
    exp = (base * mult).clip(upper=0.999)
    return (exp * df[outcome].sum() / exp.sum()).clip(upper=0.999)


def wilson(k: float, n: float, z: float = 1.96) -> tuple[float, float]:
    p = k / n
    centre = (p + z**2 / (2 * n)) / (1 + z**2 / n)
    half = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / (1 + z**2 / n)
    return centre - half, centre + half


def verdict(z: float, better_is_negative: bool) -> str:
    if abs(z) < config.CLEAR_DIFFERENCE_Z:
        return "in line with expectations"
    return "better than expected" if (z < 0) == better_is_negative else "worse than expected"


def grade(score: float) -> str:
    return next((g for g, cut in config.GRADE_CUTS if score >= cut), "E")


def prepare(d: pd.DataFrame) -> pd.DataFrame:
    """Add the context columns and the two expectations to the audit's enriched work orders."""
    roads = load("roads").set_index("road_id")
    wards = load("wards").set_index("ward_code")
    d = d.copy()
    d["surface"] = d.road_id.map(roads.surface)
    d["low_lying"] = (d.ward_code.map(wards.low_lying_index) >= config.LOW_LYING_CUT).map({True: "low-lying", False: "other"})
    d["rain_window"] = (d.heavy_rain_days > 0).map({True: "heavy rain", False: "dry"})
    d["sla_miss"] = (d.sla_met == "N").astype(int)
    d["sla_miss_exp"] = expected_rate(d, "sla_miss", SLA_FACTORS)
    d["reopen_exp"] = expected_rate(d, "reopened", REOPEN_FACTORS)
    return d


def _evidence(flags: pd.DataFrame, contractor: str) -> dict[str, list[str]]:
    f = flags[flags.contractor_id == contractor]
    out = {}
    for flag_type, n in EVIDENCE_PER_METRIC.items():
        g = f[f.flag_type == flag_type]
        if flag_type == "sla_missed":
            g = g[g.details.apply(lambda x: x["heavy_rain_days"] == 0)]  # only misses not explained by rain
            g = g.assign(_k=g.details.apply(lambda x: x["sla_ratio"])).sort_values("_k", ascending=False)
        else:
            g = g.sort_values("amount_at_risk_inr", ascending=False)
        out[flag_type] = g.work_order_id.head(n).tolist()
    return out


def score_contractors(d: pd.DataFrame, flags: pd.DataFrame, names: pd.DataFrame) -> list[dict]:
    d = prepare(d)
    city = {
        "sla_met_rate": round(1 - d.sla_miss.mean(), 3),
        "reopen_rate": round(d.reopened.mean(), 3),
        "cost_vs_rate_pct": round((d.cost_inr.sum() / d.expected_cost.sum() - 1) * 100, 1),
    }
    rows = []
    for cid, g in d.groupby("contractor_id"):
        n = len(g)
        # speed: on-time rate against the rate expected for this mix of work, wet windows and wards
        miss_obs, miss_exp = g.sla_miss.sum(), g.sla_miss_exp.sum()
        z_speed = (miss_obs - miss_exp) / np.sqrt((g.sla_miss_exp * (1 - g.sla_miss_exp)).sum())
        sla_vs_exp_pp = (miss_exp - miss_obs) / n * 100  # positive = more on time than expected
        # durability: re-open rate against the rate expected for these methods, surfaces and wards
        re_obs, re_exp = g.reopened.sum(), g.reopen_exp.sum()
        ratio = re_obs / re_exp
        lo, hi = wilson(re_obs, n)
        z_dur = (re_obs - re_exp) / np.sqrt((g.reopen_exp * (1 - g.reopen_exp)).sum())
        # cost and billing integrity
        cf = flags[flags.contractor_id == cid]
        over, dbl = cf[cf.flag_type == "over_billed"], cf[cf.flag_type == "double_billed"]
        dlp = cf[cf.flag_type == "dlp_paid"]
        billing_rate = (len(over) + len(dbl)) / n * 100
        clean = g[g.cost_ratio <= config.OVERBILL_RATIO]

        scores = {
            "durability": float(np.clip(100 * (config.DURABILITY_RATIO_WORST - ratio) / (config.DURABILITY_RATIO_WORST - config.DURABILITY_RATIO_BEST), 0, 100)),
            "billing": float(np.clip(100 - config.BILLING_POINTS_PER_PCT * billing_rate, 0, 100)),
            "speed": float(np.clip(50 + config.SPEED_POINTS_PER_PP * sla_vs_exp_pp, 0, 100)),
        }
        overall = sum(config.SCORE_WEIGHTS[k] * v for k, v in scores.items())
        top_wards = g.ward_code.value_counts().head(5).index.tolist()
        evidence = _evidence(flags, cid)
        flat = list(dict.fromkeys(i for ids in evidence.values() for i in ids))[:10]
        rows.append(
            {
                "contractor_id": cid,
                "contractor_name": names[cid],
                "wards": top_wards,
                "work_orders": n,
                "spend_inr": int(g.cost_inr.sum()),
                "sla_met_rate": round(1 - miss_obs / n, 3),
                "reopen_rate": round(re_obs / n, 3),
                "cost_vs_rate_pct": round((g.cost_inr.sum() / g.expected_cost.sum() - 1) * 100, 1),
                "context_adjusted_score": round(overall),
                "grade": grade(overall),
                "evidence_work_order_ids": flat,
                "scores": {k: round(v) for k, v in scores.items()},
                "adjusted": {
                    "sla_expected_rate": round(1 - miss_exp / n, 3),
                    "sla_vs_expected_pp": round(sla_vs_exp_pp, 1),
                    "speed_verdict": verdict(z_speed, better_is_negative=True),
                    "reopen_expected_rate": round(re_exp / n, 3),
                    "reopen_vs_expected": round(ratio, 2),
                    "reopen_rate_ci95": [round(lo, 3), round(hi, 3)],
                    "durability_verdict": verdict(z_dur, better_is_negative=True),
                },
                "context": {
                    "low_lying_share": round((g.low_lying == "low-lying").mean(), 2),
                    "heavy_rain_window_share": round((g.rain_window == "heavy rain").mean(), 2),
                    "pothole_share": round((g.work_type == "Pothole").mean(), 2),
                },
                "billing": {
                    "typical_cost_vs_rate_pct": round((clean.cost_inr.sum() / clean.expected_cost.sum() - 1) * 100, 1),
                    "over_billed_jobs": len(over),
                    "over_billed_excess_inr": int(over.amount_at_risk_inr.sum()),
                    "double_billed_jobs": len(dbl),
                    "double_billed_inr": int(dbl.amount_at_risk_inr.sum()),
                    "paid_on_dlp_roads_jobs": len(dlp),
                    "paid_on_dlp_roads_inr": int(dlp.amount_at_risk_inr.sum()),
                },
                "evidence": evidence,
                "city": city,
            }
        )
    rows.sort(key=lambda r: -r["context_adjusted_score"])
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


def improve_line(card: dict) -> str:
    """One thing to improve: the weakest area that is actually below par; says so plainly when none is."""
    a, b = card["adjusted"], card["billing"]
    flagged = b["over_billed_jobs"] + b["double_billed_jobs"]
    below_par = {}
    if a["reopen_vs_expected"] > 1:
        below_par["durability"] = card["scores"]["durability"]
    if a["sla_vs_expected_pp"] < 0:
        below_par["speed"] = card["scores"]["speed"]
    if flagged:
        below_par["billing"] = card["scores"]["billing"]
    if not below_par:
        return "Keep it up; no area stands out as needing improvement this season."
    k = min(below_par, key=below_par.get)
    if k == "durability":
        return f"Cut repairs that fail within 30 days: {card['reopen_rate']:.0%} were redone, against about {a['reopen_expected_rate']:.0%} expected for the same methods and roads."
    if k == "billing":
        return f"Keep bills within the rate card: {flagged} job(s) were billed far above it or look like repeats, and are listed for review."
    return f"Finish jobs faster: {card['sla_met_rate']:.0%} met their target time, against about {a['sla_expected_rate']:.0%} expected for this mix of work."


def facts_for_narration(card: dict) -> dict:
    """Plain facts for the writer, already formatted. Claude may use these numbers and no others."""
    a, b = card["adjusted"], card["billing"]
    cost = card["cost_vs_rate_pct"]
    return {
        "contractor": card["contractor_name"].replace(" (synthetic)", ""),
        "jobs": card["work_orders"],
        "total_billed": inr_short(card["spend_inr"]),
        "main_wards": ", ".join(card["wards"][:3]),
        "on_time_pct": f"{card['sla_met_rate']:.0%}",
        "expected_on_time_pct": f"{a['sla_expected_rate']:.0%}",
        "speed_verdict": a["speed_verdict"],
        "redone_within_30_days_pct": f"{card['reopen_rate']:.0%}",
        "expected_redone_pct": f"{a['reopen_expected_rate']:.0%}",
        "durability_verdict": a["durability_verdict"],
        "average_bill_vs_rate_card": f"{abs(cost):.1f}% {'above' if cost >= 0 else 'below'}",
        "jobs_billed_far_above_rate_card": b["over_billed_jobs"],
        "possible_repeat_bills": b["double_billed_jobs"],
        "grade": card["grade"],
        "city_on_time_pct": f"{card['city']['sla_met_rate']:.0%}",
        "city_redone_pct": f"{card['city']['reopen_rate']:.0%}",
        "one_thing_to_improve": card["improve"],
    }


def template_text(facts: dict) -> str:
    """Deterministic scorecard used when Claude is unavailable. Under 120 words, no accusations."""
    far = facts["jobs_billed_far_above_rate_card"] + facts["possible_repeat_bills"]
    bills = (
        f"{far} job(s) were billed far above it or look like repeats and are listed for review."
        if far
        else "no jobs stood out as billed far above it."
    )
    return (
        f"{facts['contractor']} did {facts['jobs']} monsoon road jobs worth {facts['total_billed']}, mainly in {facts['main_wards']}. "
        f"Speed: {facts['on_time_pct']} met their target time; for this mix of work about {facts['expected_on_time_pct']} is expected, so this is {facts['speed_verdict']}. "
        f"Lasting repairs: {facts['redone_within_30_days_pct']} had to be redone within 30 days, against about {facts['expected_redone_pct']} expected, which is {facts['durability_verdict']}. "
        f"Cost: bills averaged {facts['average_bill_vs_rate_card']} the standard rate card; {bills} "
        f"Overall grade: {facts['grade']}. To improve: {facts['one_thing_to_improve']}"
    )


def build_scorecards() -> tuple[list[dict], dict]:
    flags, d = build_flags()
    names = load("contractors").set_index("contractor_id").contractor_name
    cards = score_contractors(d, flags, names)
    for c in cards:
        c["improve"] = improve_line(c)
    return cards, {"flags": len(flags), "work_orders": len(d)}


def write(cards: list[dict], writer: Writer) -> dict:
    """Add the scorecard text (Claude when available, else the template) and write contractors.json."""
    path = OUT_DIR / "contractors.json"
    prior = {}
    if path.exists():
        prior = {c["contractor_id"]: {"hash": c.get("narration_hash"), "text": c.get("scorecard_text"), "source": c.get("scorecard_source")} for c in json.loads(path.read_text())}
    sources = {}
    for c in cards:
        text, source, h = narrate(c["contractor_id"], (f := facts_for_narration(c)), SCORECARD_SYSTEM, template_text, writer, prior, must_name=f["contractor"])
        c["scorecard_text"], c["scorecard_source"], c["narration_hash"] = text, source, h
        sources[source] = sources.get(source, 0) + 1
    first = ["contractor_id", "contractor_name", "wards", "work_orders", "spend_inr", "sla_met_rate", "reopen_rate", "cost_vs_rate_pct", "context_adjusted_score", "grade", "scorecard_text", "improve", "evidence_work_order_ids"]
    write_json("contractors", [{**{k: c[k] for k in first}, **{k: v for k, v in c.items() if k not in first}} for c in cards])
    return sources
