"""Dashboard-ready views of the pipeline outputs: work-order lookup, per-ward bundles, map layers, complaint lookup, manifest.

Reads the JSON the other steps wrote, so run `pipeline all` (or audit, next-rupee, scorecards, trail, wards) first.
Nothing is recomputed here except joins and slices, so every number matches the file it came from.
"""

import json
from datetime import datetime, timedelta, timezone

import pandas as pd

from pipeline.budget import with_cost_ratio
from pipeline.data import DATA_DIR, OUT_DIR, load, write_json

SEASON = "Jun–Sep 2025"


def slug(code: str) -> str:
    """F/S -> F-S: safe in a URL and a file name."""
    return code.replace("/", "-")


def _read(name: str):
    return json.loads((OUT_DIR / f"{name}.json").read_text())


def _iso(ts) -> str | None:
    return None if pd.isna(ts) else ts.isoformat(timespec="minutes")


def work_orders(flags: list[dict], issues: list[dict]) -> list[dict]:
    """Every work order with what a page needs to show it as evidence: road, contractor, cost against the rate card, flags, complaints, issue."""
    wo = with_cost_ratio(load("work_orders"), load("rate_card"))
    roads = load("roads").set_index("road_id")
    flag_types: dict[str, list[str]] = {}
    for f in flags:
        flag_types.setdefault(f["work_order_id"], []).append(f["flag_type"])
    issue_of = {w: i["issue_id"] for i in issues for w in i["work_order_ids"]}
    out = []
    for r in wo.itertuples():
        out.append(
            {
                "work_order_id": r.work_order_id,
                "ward_code": r.ward_code,
                "road_id": r.road_id,
                "road_name": roads.road_name.get(r.road_id),
                "under_dlp": bool(roads.under_dlp.get(r.road_id) == "Y"),
                "work_type": r.work_type,
                "repair_method": r.repair_method,
                "contractor_id": r.contractor_id,
                "contractor_name": r.contractor_name,
                "assigned_at": _iso(r.assigned_at),
                "work_started_at": _iso(r.work_started_at),
                "completed_at": _iso(r.completed_at),
                "area_sqm": None if pd.isna(r.area_sqm) else float(r.area_sqm),
                "cost_inr": int(r.cost_inr),
                "expected_cost_inr": int(round(r.expected_cost)),
                "cost_ratio": round(float(r.cost_ratio), 2),
                "sla_hours": int(r.sla_hours),
                "sla_met": r.sla_met == "Y",
                "reopened_within_30d": r.reopened_within_30d == "Y",
                "engineer_remark": r.engineer_remark if isinstance(r.engineer_remark, str) else None,
                "complaint_ids": r.linked_complaint_ids.split("|") if isinstance(r.linked_complaint_ids, str) else [],
                "issue_id": issue_of.get(r.work_order_id),
                "flags": sorted(set(flag_types.get(r.work_order_id, []))),
            }
        )
    return out


def ward_bundles(wards: list[dict], plan: list[dict], flags: list[dict], issues: list[dict], audit: list[dict], contractors: list[dict], wos: list[dict]) -> dict[str, dict]:
    """One file per ward with everything its page needs, so no page has to load the 4 MB city-wide files."""
    plans = {p["ward_code"]: p for p in plan}
    audits = {a["ward_code"]: a for a in audit}
    grade = {c["contractor_id"]: c["grade"] for c in contractors}
    plan_item = {i["issue_id"]: i for p in plan for i in p["issues"]}
    out = {}
    for w in wards:
        code = w["ward_code"]
        ward_wos = pd.DataFrame([x for x in wos if x["ward_code"] == code])
        by_c = ward_wos.groupby(["contractor_id", "contractor_name"]).agg(jobs=("work_order_id", "size"), spend_inr=("cost_inr", "sum"), reopen_rate=("reopened_within_30d", "mean")).reset_index()
        ward_issues = []
        for i in issues:
            if i["ward_code"] != code:
                continue
            ward_issues.append({**i, "plan": plan_item.get(i["plan_issue_id"]) and {k: plan_item[i["plan_issue_id"]][k] for k in ("rank", "priority_score", "funded", "dlp", "recommended_method", "est_cost_inr", "reasons")}})
        out[slug(code)] = {
            "ward": w,
            "plan": plans[code],
            "audit": audits[code],
            "flags": [f for f in flags if f["ward_code"] == code],
            "issues": ward_issues,
            "contractors": [
                {"contractor_id": r.contractor_id, "contractor_name": r.contractor_name, "jobs": int(r.jobs), "spend_inr": int(r.spend_inr), "reopen_rate": round(float(r.reopen_rate), 3), "grade": grade[r.contractor_id]}
                for r in by_c.sort_values("spend_inr", ascending=False).itertuples()
            ],
        }
    return out


def ward_geojson(wards: list[dict]) -> dict:
    geo = json.loads((DATA_DIR / "wards.geojson").read_text())
    by = {w["ward_code"]: w for w in wards}
    for f in geo["features"]:
        w = by[f["properties"]["ward_code"]]
        f["properties"].update(
            slug=slug(w["ward_code"]),
            risk_score=w["risk_score"],
            budget_inr=w["budget_inr"],
            spend_inr=w["spend_inr"],
            budget_used_pct=round(100 * w["spend_inr"] / w["budget_inr"], 1),
            over_budget=w["over_budget"],
            open_issues=w["open_issues"],
            reopen_rate=w["reopen_rate"],
            sla_met_rate=w["sla_met_rate"],
            low_lying_index=w["low_lying_index"],
            billing_flagged_inr=w["billing_flagged_inr"],
        )
    return geo


def road_geojson(roads_rank: list[dict]) -> dict:
    geo = json.loads((DATA_DIR / "roads.geojson").read_text())
    by = {r["road_id"]: r for r in roads_rank}
    for f in geo["features"]:
        r = by.get(f["properties"]["road_id"])
        f["properties"].update(open_issues=r["open_issues"] if r else 0, priority_score=r["priority_score"] if r else 0, rank_in_ward=r["rank_in_ward"] if r else None)
    return geo


def open_issue_points(plan: list[dict], issues: list[dict]) -> dict:
    """The ranked open issues as map points (GPS of the complaints, else the locality centre)."""
    where = {i["plan_issue_id"]: i for i in issues if i["plan_issue_id"]}
    feats = []
    for w in plan:
        for it in w["issues"]:
            t = where.get(it["issue_id"])
            if not t or t["lat"] is None:
                continue
            feats.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [t["lon"], t["lat"]]},
                    "properties": {
                        "issue_id": t["issue_id"], "plan_issue_id": it["issue_id"], "ward_code": w["ward_code"], "category": it["work_type"],
                        "road_name": it["road_name"], "priority_score": it["priority_score"], "rank": it["rank"], "funded": it["funded"], "dlp": it["dlp"],
                        "recommended_method": it["recommended_method"], "est_cost_inr": it["est_cost_inr"],
                    },
                }
            )
    return {"type": "FeatureCollection", "features": feats}


def write_all() -> dict:
    wards, plan = _read("wards"), _read("next_rupee")["wards"]
    flags, issues = _read("flags"), _read("issues")
    contractors = _read("contractors")
    audit = _read("audit_summary")["by_ward"]
    roads_rank = _read("next_rupee")["roads"]

    wos = work_orders(flags, issues)
    write_json("work_orders", wos, compact=True)
    bundles = ward_bundles(wards, plan, flags, issues, audit, contractors, wos)
    for s, b in bundles.items():
        write_json(f"by_ward/{s}", b, compact=True)
    write_json("geo/wards.geojson", ward_geojson(wards), compact=True)
    write_json("geo/roads.geojson", road_geojson(roads_rank), compact=True)
    points = open_issue_points(plan, issues)
    write_json("geo/open_issues.geojson", points, compact=True)
    write_json("complaint_to_issue", {c: i["issue_id"] for i in issues for c in i["complaint_ids"]}, compact=True)

    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat(timespec="seconds")
    sources = {
        "contractors": _count([c.get("scorecard_source") for c in contractors]),
        "wards": _count([w.get("summary_source") for w in wards]),
    }
    write_json("meta", {"generated_at": now, "stub": False, "season": SEASON, "text_sources": sources, "counts": {
        "wards": len(wards), "contractors": len(contractors), "work_orders": len(wos), "flags": len(flags), "issues": len(issues),
        "complaints": sum(i["n_complaints"] for i in issues), "open_issues_ranked": sum(len(p["issues"]) for p in plan), "map_points": len(points["features"]),
    }})
    write_json("manifest", manifest(now, wards))
    return {"work_orders": len(wos), "bundles": len(bundles), "map_points": len(points["features"]), "text_sources": sources}


def _count(values: list) -> dict:
    out: dict = {}
    for v in values:
        out[v] = out.get(v, 0) + 1
    return out


FILES = {
    "meta.json": "Run info: when generated, season, row counts, whether Claude or a template wrote the text.",
    "wards.json": "24 wards: budget, spend, re-open and on-time rates, summary, top-10 next rupee. Read this for the city view.",
    "contractors.json": "8 contractor scorecards, best first.",
    "flags.json": "Audit flags with evidence work-order ids. Large: prefer by_ward/*.json for a ward page.",
    "audit_summary.json": "Flag totals for the city, each ward and each contractor.",
    "next_rupee.json": "Full ranked plan for every ward with factor breakdowns, methods and contractor tiers. Large.",
    "validation.json": "Backtest of the ranking: for a methods slide.",
    "issues.json": "3,529 issues: every complaint in one issue, with its work order and a trail sentence. Large: prefer by_ward/*.json.",
    "issues_summary.json": "Totals for the trail: status counts, failed-fix money, social post coverage.",
    "work_orders.json": "All 2,499 work orders. Look up evidence_work_order_ids and work_order_ids here.",
    "complaint_to_issue.json": "complaint id -> issue id, for a 'what happened to my complaint?' search.",
    "by_ward/<slug>.json": "One file per ward (slug F-S for F/S): ward record, plan, audit, flags, issues, contractors. Best for a ward page.",
    "geo/wards.geojson": "Ward polygons with risk, budget used and re-open rate as properties: ready for a choropleth.",
    "geo/roads.geojson": "Road lines with open issue count and priority score.",
    "geo/open_issues.geojson": "Ranked open issues as points with priority, method and cost.",
}


def manifest(now: str, wards: list[dict]) -> dict:
    sizes = {}
    for path in sorted([*OUT_DIR.rglob("*.json"), *OUT_DIR.rglob("*.geojson")]):
        sizes[str(path.relative_to(OUT_DIR))] = path.stat().st_size
    return {
        "generated_at": now,
        "note": "All files are real pipeline output. Server-side: read with web/src/lib/data.ts. Do not edit by hand; rerun `uv run pipeline all`.",
        "files": [{"path": k, "bytes": v} for k, v in sizes.items() if not k.startswith("by_ward/") and k != "manifest.json"],
        "descriptions": FILES,
        "wards": [{"ward_code": w["ward_code"], "slug": slug(w["ward_code"]), "ward_name": w["ward_name"], "bundle": f"by_ward/{slug(w['ward_code'])}.json", "bytes": sizes.get(f"by_ward/{slug(w['ward_code'])}.json")} for w in wards],
    }
