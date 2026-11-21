from pipeline.data import load


def main() -> None:
    wo = load("work_orders")
    wards = load("wards")
    print(f"{len(wo)} work orders, ₹{wo.cost_inr.sum():,.0f} billed across {wo.ward_code.nunique()} wards")
    print(f"Total ward budget: ₹{wards.monsoon_repair_budget_inr_2025.sum():,.0f}")
    print(wo.groupby("contractor_name")["cost_inr"].sum().sort_values(ascending=False).to_string())
