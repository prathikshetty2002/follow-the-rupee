import argparse

from pipeline.data import load


def summary() -> None:
    wo = load("work_orders")
    wards = load("wards")
    print(f"{len(wo)} work orders, ₹{wo.cost_inr.sum():,.0f} billed across {wo.ward_code.nunique()} wards")
    print(f"Total ward budget: ₹{wards.monsoon_repair_budget_inr_2025.sum():,.0f}")
    print(wo.groupby("contractor_name")["cost_inr"].sum().sort_values(ascending=False).to_string())


def next_rupee() -> None:
    import pandas as pd

    from pipeline.nextrupee import build, write

    result = build()
    write(result)
    issues = result["issues"]
    print(f"{len(issues)} open issues from {issues.n_complaints.sum()} open complaints, {issues.road_id.notna().sum()} mapped to a road")
    plan = pd.DataFrame(result["wards"]).T[["open_issues", "funded_issues", "need_inr", "remaining_budget_inr", "over_budget", "risk_score"]]
    print(plan.sort_values("risk_score", ascending=False).to_string())
    print("Backtest (Aug-Sep work orders), Spearman city / in-ward:")
    for r in result["backtest"]["results"]:
        print(f"  {r['score']:<45} {r['work_orders_city']:.3f} / {r['work_orders_in_ward']:.3f}   precision@3 {r['precision_at_3_work_orders']:.2f}")
    print(f"Top-3 stability under ±50% weight changes: Jaccard {result['stability']['mean_top3_jaccard']}")
    print("Wrote web/public/data/{next_rupee,validation,wards}.json")


def audit() -> None:
    from pipeline.audit import build_flags, summarise, write

    flags, d = build_flags()
    summary = summarise(flags, d)
    write(flags, summary)
    city = summary["city"]
    print(f"{city['flags']} flags on {flags.work_order_id.nunique()} of {city['work_orders']} work orders")
    for kind, g in flags.groupby("kind"):
        print(f"\n{kind}:")
        for t, h in g.groupby("flag_type"):
            sev = h.severity.value_counts().reindex(["high", "medium", "low"], fill_value=0).to_dict()
            print(f"  {t:<14} {len(h):>4}  ₹{h.amount_at_risk_inr.sum():>12,}  {sev}")
    print(f"\nBilling-flagged work orders (each counted once): {city['billing_flagged_work_orders']}, ₹{city['billing_flagged_cost_inr']:,} billed")
    print("Wrote web/public/data/{flags,audit_summary}.json")


def scorecards() -> None:
    import sys

    from pipeline.narrate import Writer
    from pipeline.scorecard import build_scorecards, write

    writer = Writer(use_claude="--no-claude" not in sys.argv)
    cards, _ = build_scorecards()
    sources = write(cards, writer)
    print(f"{'rank':<5}{'id':<6}{'grade':<6}{'score':<6}{'durability':<11}{'billing':<8}{'speed':<6}")
    for c in cards:
        s = c["scores"]
        print(f"{c['rank']:<5}{c['contractor_id']:<6}{c['grade']:<6}{c['context_adjusted_score']:<6}{s['durability']:<11}{s['billing']:<8}{s['speed']:<6}")
    print(f"\nText source: {sources}" + (f"  (Claude not used: {writer.disabled_reason})" if not writer.active else ""))
    print("Wrote web/public/data/contractors.json")


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("--no-claude", action="store_true", help="scorecards: use the template text, never call the API")
    parser.add_argument("command", nargs="?", default="summary", choices=["summary", "next-rupee", "audit", "scorecards"])
    {"summary": summary, "next-rupee": next_rupee, "audit": audit, "scorecards": scorecards}[parser.parse_args().command]()
