import argparse

from pipeline.data import load


def cmd_summary() -> None:
    wo = load("work_orders")
    wards = load("wards")
    print(f"{len(wo)} work orders, ₹{wo.cost_inr.sum():,.0f} billed across {wo.ward_code.nunique()} wards")
    print(f"Total ward budget: ₹{wards.monsoon_repair_budget_inr_2025.sum():,.0f}")
    print(wo.groupby("contractor_name")["cost_inr"].sum().sort_values(ascending=False).to_string())


def cmd_next_rupee() -> None:
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
    print("Wrote web/public/data/{next_rupee,validation}.json (run `pipeline wards` and `pipeline export` to refresh the files built from them)")


def cmd_audit() -> None:
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


def cmd_scorecards() -> None:
    from pipeline.narrate import Writer
    from pipeline.scorecard import build_scorecards, write

    writer = Writer(use_claude=not _args().no_claude)
    cards, _ = build_scorecards()
    sources = write(cards, writer)
    print(f"{'rank':<5}{'id':<6}{'grade':<6}{'score':<6}{'durability':<11}{'billing':<8}{'speed':<6}")
    for c in cards:
        s = c["scores"]
        print(f"{c['rank']:<5}{c['contractor_id']:<6}{c['grade']:<6}{c['context_adjusted_score']:<6}{s['durability']:<11}{s['billing']:<8}{s['speed']:<6}")
    print(f"\nText source: {sources}" + (f"  (Claude not used: {writer.disabled_reason})" if not writer.active else ""))
    print("Wrote web/public/data/contractors.json")


def cmd_trail() -> None:
    from pipeline.trail import build_trail, write

    iss, summary = build_trail()
    write(iss, summary)
    print(f"{summary['complaints']} complaints -> {summary['issues']} issues ({summary['complaints_per_issue']} complaints each)")
    for status, v in summary["by_status"].items():
        print(f"  {status:<14} {v['issues']:>5} issues, {v['complaints']:>5} complaints")
    print(f"Fixed issues that failed within 30 days: {summary['fixed_issues_that_failed_pct']:.1%}, ₹{summary['spend_on_failed_inr']:,} of ₹{summary['spend_on_fixed_inr']:,}")
    print(f"Social posts linked: {summary['social_posts_linked']} of {summary['social_posts']}  {summary['social_linked_by_kind']}")
    print("Wrote web/public/data/{issues,issues_summary}.json")


def cmd_export() -> None:
    from pipeline.export import write_all

    r = write_all()
    print(f"{r['work_orders']} work orders, {r['bundles']} ward bundles, {r['map_points']} map points. Text written by: {r['text_sources']}")
    print("Wrote work_orders, by_ward/*, geo/*, complaint_to_issue, meta, manifest in web/public/data/")


def cmd_wards() -> None:
    from pipeline.narrate import Writer
    from pipeline.wards import build_wards, write

    writer = Writer(use_claude=not _args().no_claude)
    records, sources = build_wards(writer)
    write(records)
    print(f"{len(records)} wards. Summary text source: {sources}" + (f"  (Claude not used: {writer.disabled_reason})" if not writer.active else ""))
    print("Wrote web/public/data/wards.json")


def cmd_run_all() -> None:
    """Rebuild every output in dependency order."""
    for step in (cmd_audit, cmd_next_rupee, cmd_scorecards, cmd_trail, cmd_wards, cmd_export):
        print(f"\n=== {step.__name__} ===")
        step()


def _args():
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("--no-claude", action="store_true", help="use template text, never call the API")
    parser.add_argument("command", nargs="?", default="summary", choices=["summary", "next-rupee", "audit", "scorecards", "trail", "wards", "export", "all"])
    return parser.parse_args()


def main() -> None:
    steps = {"summary": cmd_summary, "next-rupee": cmd_next_rupee, "audit": cmd_audit, "scorecards": cmd_scorecards, "trail": cmd_trail, "wards": cmd_wards, "export": cmd_export, "all": cmd_run_all}
    steps[_args().command]()
