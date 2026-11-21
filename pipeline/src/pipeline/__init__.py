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


def main() -> None:
    parser = argparse.ArgumentParser(prog="pipeline")
    parser.add_argument("command", nargs="?", default="summary", choices=["summary", "next-rupee"])
    {"summary": summary, "next-rupee": next_rupee}[parser.parse_args().command]()
