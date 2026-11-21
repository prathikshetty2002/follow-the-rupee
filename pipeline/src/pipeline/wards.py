"""wards.json: where each ward's money went, how it held up, what to fund next, and a plain-language summary.

Numbers come from the work orders, the audit (audit_summary.json) and the next-rupee plan (next_rupee.json), so run
`pipeline audit` and `pipeline next-rupee` first. Claude writes the summary text from those numbers (checked, with a template fallback).
"""

import json

import numpy as np

from pipeline.audit import build_flags
from pipeline.data import OUT_DIR, load, write_json
from pipeline.narrate import Writer, narrate
from pipeline.scorecard import inr_short, prepare, verdict

TOP_PER_WARD = 10
SUMMARY_MAX_WORDS = 130
FLOOD_PRONE = 0.6  # ward low_lying_index at or above this is described as flood-prone

SUMMARY_SYSTEM = (
    "You write one short paragraph for Mumbai citizens and ward corporators about how a ward spent its monsoon road-repair money. "
    "Use only the facts you are given: every number you write must appear in them, and do not add any other claim. "
    "Be fair and neutral: describe what the data shows, compare it with what is expected for the same kinds of work, and mention the ward's flood-proneness as context when it is given. "
    "Never use words such as fraud, cheating, corrupt, illegal or blame; say 'listed for review' for billing items. "
    f"Write 90 to {SUMMARY_MAX_WORDS - 15} words of plain prose with no headings, bullets or markdown. "
    "Cover how much of the budget was used, the money spent on repairs that failed within 30 days, anything listed for review, "
    "and what the ward should fund next and whether its remaining budget covers it."
)


def _read(name: str):
    return json.loads((OUT_DIR / f"{name}.json").read_text())


def base_records() -> list[dict]:
    """Per-ward aggregates straight from the work orders."""
    wards = load("wards").set_index("ward_code")
    wo = load("work_orders")
    wo["reopened"] = (wo.reopened_within_30d == "Y").astype(int)
    out = []
    for code, w in wards.iterrows():
        g = wo[wo.ward_code == code]
        out.append(
            {
                "ward_code": code,
                "ward_name": w.ward_name,
                "budget_inr": int(w.monsoon_repair_budget_inr_2025),
                "spend_inr": int(g.cost_inr.sum()),
                "spend_on_failed_inr": int(g[g.reopened == 1].cost_inr.sum()),
                "work_orders": len(g),
                "sla_met_rate": round((g.sla_met == "Y").mean(), 3),
                "reopen_rate": round(g.reopened.mean(), 3),
                "low_lying_index": float(w.low_lying_index),
                "spend_by_method": [{"repair_method": k, "spend_inr": int(v)} for k, v in g.groupby("repair_method").cost_inr.sum().sort_values(ascending=False).items()],
                "spend_by_contractor": [{"contractor_id": k, "spend_inr": int(v)} for k, v in g.groupby("contractor_id").cost_inr.sum().sort_values(ascending=False).items()],
            }
        )
    return out


def next_rupee_entries(plan: dict) -> list[dict]:
    return [
        {
            "rank": i["rank"],
            "road_id": i["road_id"],
            "road_name": i["road_name"],
            "recommended_method": i["recommended_method"],
            "est_cost_inr": i["est_cost_inr"],
            "reasons": i["reasons"],
            "issue_id": i["issue_id"],
            "work_type": i["work_type"],
            "priority_score": i["priority_score"],
            "funded": i["funded"],
            "dlp": i["dlp"],
        }
        for i in plan["issues"][:TOP_PER_WARD]
    ]


def expectations(d) -> dict:
    """Per ward: the on-time and re-open rates expected for its work types, methods, surfaces and weather, with a verdict on each gap."""
    d = prepare(d)
    out = {}
    for code, g in d.groupby("ward_code"):
        miss_obs, miss_exp = g.sla_miss.sum(), g.sla_miss_exp.sum()
        re_obs, re_exp = g.reopened.sum(), g.reopen_exp.sum()
        out[code] = {
            "sla_expected_rate": round(1 - miss_exp / len(g), 3),
            "sla_verdict": verdict((miss_obs - miss_exp) / np.sqrt((g.sla_miss_exp * (1 - g.sla_miss_exp)).sum()), better_is_negative=True),
            "reopen_expected_rate": round(re_exp / len(g), 3),
            "reopen_verdict": verdict((re_obs - re_exp) / np.sqrt((g.reopen_exp * (1 - g.reopen_exp)).sum()), better_is_negative=True),
        }
    return out


def summary_facts(w: dict, plan: dict, audit: dict, exp: dict, names: dict) -> dict:
    """Plain facts for the writer, already formatted. Claude may use these numbers and no others."""
    top_c = w["spend_by_contractor"][0]
    top_m = w["spend_by_method"][0]
    used = w["spend_inr"] / w["budget_inr"]
    billing = audit["by_type"]
    reviewed = sum(billing.get(t, {}).get("count", 0) for t in ("over_billed", "double_billed"))
    dlp = billing.get("dlp_paid", {"count": 0, "amount_at_risk_inr": 0})
    facts = {
        "ward": f"{w['ward_name']} (ward {w['ward_code']})",
        "budget": inr_short(w["budget_inr"]),
        "spent": inr_short(w["spend_inr"]),
        "budget_used": f"{used:.0%}",
        "budget_position": "over budget" if plan["over_budget"] else "within budget",
        "jobs": w["work_orders"],
        "redone_within_30_days_pct": f"{w['reopen_rate']:.0%}",
        "expected_redone_pct": f"{exp['reopen_expected_rate']:.0%}",
        "durability_verdict": exp["reopen_verdict"],
        "money_on_repairs_that_failed": inr_short(w["spend_on_failed_inr"]),
        "on_time_pct": f"{w['sla_met_rate']:.0%}",
        "expected_on_time_pct": f"{exp['sla_expected_rate']:.0%}",
        "speed_verdict": exp["sla_verdict"],
        "biggest_contractor_by_spend": f"{names[top_c['contractor_id']].replace(' (synthetic)', '')} ({top_c['spend_inr'] / w['spend_inr']:.0%} of spend)",
        "biggest_repair_type_by_spend": f"{top_m['repair_method']} ({top_m['spend_inr'] / w['spend_inr']:.0%} of spend)",
        "jobs_listed_for_billing_review": reviewed,
        "jobs_paid_on_roads_under_warranty": dlp["count"],
        "paid_on_roads_under_warranty": inr_short(dlp["amount_at_risk_inr"]),
        "open_issues": plan["open_issues"],
        "cost_to_fix_open_issues": inr_short(plan["need_inr"]),
        "budget_left": inr_short(plan["remaining_budget_inr"]),
        "open_issues_that_fit_budget_left": plan["funded_issues"],
        "top_priorities": "; ".join(f"{i['road_name']} ({i['work_type'].lower()}, {i['recommended_method'].lower()}, {inr_short(i['est_cost_inr'])})" for i in plan["issues"][:3]),
    }
    if w["low_lying_index"] >= FLOOD_PRONE:
        facts["context"] = f"This is a flood-prone ward (flood index {w['low_lying_index']:.2f}), which makes repairs harder to keep in place."
    if plan["over_budget"]:
        facts["note"] = "Season spend already exceeds the budget, so money would have to be reallocated, or payments recovered on roads under warranty."
    return facts


def template_text(f: dict) -> str:
    review = f"{f['jobs_listed_for_billing_review']} job(s) are listed for billing review" if f["jobs_listed_for_billing_review"] else "no jobs are listed for billing review"
    fit = f"{f['open_issues_that_fit_budget_left']} of {f['open_issues']} open issues fit within the {f['budget_left']} left"
    text = (
        f"{f['ward']} spent {f['spent']} of its {f['budget']} budget ({f['budget_used']}, {f['budget_position']}) on {f['jobs']} repairs. "
        f"{f['redone_within_30_days_pct']} had to be redone within 30 days (about {f['expected_redone_pct']} is expected for the same methods and roads, so this is {f['durability_verdict']}), costing {f['money_on_repairs_that_failed']}; "
        f"{f['on_time_pct']} met their target time (about {f['expected_on_time_pct']} expected for this mix of work, which is {f['speed_verdict']}). {review}. "
    )
    if "context" in f:
        text += f["context"] + " "
    text += f"Next, {f['open_issues']} open issues need about {f['cost_to_fix_open_issues']}; {fit}. Top priorities: {f['top_priorities']}."
    if "note" in f:
        text += " " + f["note"]
    return text


def build_wards(writer: Writer) -> tuple[list[dict], dict]:
    plans = {w["ward_code"]: w for w in _read("next_rupee")["wards"]}
    audits = {w["ward_code"]: w for w in _read("audit_summary")["by_ward"]}
    names = load("contractors").set_index("contractor_id").contractor_name.to_dict()
    exps = expectations(build_flags()[1])

    path = OUT_DIR / "wards.json"
    prior = {}
    if path.exists():
        prior = {w["ward_code"]: {"hash": w.get("narration_hash"), "text": w.get("summary"), "source": w.get("summary_source")} for w in json.loads(path.read_text())}

    records, sources = [], {}
    for w in base_records():
        code = w["ward_code"]
        plan, audit = plans[code], audits[code]
        facts = summary_facts(w, plan, audit, exps[code], names)
        text, source, h = narrate(f"ward-{code.replace('/', '-')}", facts, SUMMARY_SYSTEM, template_text, writer, prior, max_words=SUMMARY_MAX_WORDS)
        sources[source] = sources.get(source, 0) + 1
        records.append(
            {
                **w,
                "risk_score": plan["risk_score"],
                "summary": text,
                "next_rupee": next_rupee_entries(plan),
                "remaining_budget_inr": plan["remaining_budget_inr"],
                "over_budget": plan["over_budget"],
                "open_issues": plan["open_issues"],
                "billing_flagged_inr": audit["billing_flagged_cost_inr"],
                "billing_flagged_work_orders": audit["billing_flagged_work_orders"],
                "adjusted": exps[code],
                "summary_source": source,
                "narration_hash": h,
            }
        )
    return records, sources


def write(records: list[dict]) -> None:
    write_json("wards", records)
