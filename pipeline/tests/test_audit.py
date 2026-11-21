import numpy as np
import pandas as pd
import pytest

from pipeline import config
from pipeline.audit import _inr, double_billed, dlp_paid, over_billed, reopened, sla_missed


def wo(**over):
    base = dict(
        work_order_id="WO1", ward_code="A", road_id="RD1", contractor_id="CT01", contractor_name="C1", work_type="Pothole",
        repair_method="Cold mix patch", cost_inr=10000.0, expected_cost=10000.0, cost_ratio=1.0, unit="per sqm",
        linked_complaint_ids="C1", assigned_at=pd.Timestamp("2025-07-01"), under_dlp="N", last_resurfaced=pd.Timestamp("2023-01-01"),
        sla_met="Y", sla_hours=48, sla_ratio=0.5, response_h=24.0, heavy_rain_days=0, reopened=0,
    )
    return {**base, **over}


def frame(*rows):
    return pd.DataFrame(list(rows))


def test_indian_rupee_format():
    assert _inr(116079) == "₹1,16,079" and _inr(1234567) == "₹12,34,567" and _inr(950) == "₹950"


def test_over_billing_uses_the_clean_gap():
    d = frame(wo(work_order_id="ok", cost_ratio=1.3), wo(work_order_id="edge", cost_ratio=1.39), wo(work_order_id="bad", cost_ratio=1.5, cost_inr=15000.0), wo(work_order_id="huge", cost_ratio=2.5, cost_inr=25000.0))
    f = over_billed(d)
    assert set(f.work_order_id) == {"bad", "huge"}
    assert f.set_index("work_order_id").severity.to_dict() == {"bad": "medium", "huge": "high"}
    assert f.set_index("work_order_id").amount_at_risk_inr["bad"] == 15000 - 13000  # only the part above 1.3x the rate card


def test_double_billing_needs_no_complaint_and_a_recent_twin():
    earlier = wo(work_order_id="A", assigned_at=pd.Timestamp("2025-07-01"))
    dup = wo(work_order_id="B", linked_complaint_ids=None, assigned_at=pd.Timestamp("2025-07-04"))
    other_contractor = wo(work_order_id="C", linked_complaint_ids=None, contractor_id="CT02", assigned_at=pd.Timestamp("2025-07-04"), road_id="RD2")
    same_road_later = wo(work_order_id="D", road_id="RD2", assigned_at=pd.Timestamp("2025-07-06"))
    too_far = wo(work_order_id="E", linked_complaint_ids=None, assigned_at=pd.Timestamp("2025-07-30"), road_id="RD3")
    far_twin = wo(work_order_id="F", assigned_at=pd.Timestamp("2025-07-01"), road_id="RD3")
    other_twin = wo(work_order_id="G", road_id="RD2", assigned_at=pd.Timestamp("2025-07-02"))
    f = double_billed(frame(earlier, dup, other_contractor, other_twin, same_road_later, too_far, far_twin))
    assert set(f.work_order_id) == {"B", "C"}
    by = f.set_index("work_order_id")
    assert by.severity["B"] == "high" and by.severity["C"] == "medium"  # same contractor and method vs different contractor
    assert by.evidence_work_order_ids["B"] == ["B", "A"]


def test_linked_repeat_jobs_are_not_double_billing():
    d = frame(wo(work_order_id="A"), wo(work_order_id="B", assigned_at=pd.Timestamp("2025-07-03")))
    assert double_billed(d).empty


def test_dlp_flags_all_but_rates_drainage_low():
    d = frame(wo(work_order_id="P", under_dlp="Y"), wo(work_order_id="W", under_dlp="Y", work_type="Waterlogging"), wo(work_order_id="N"))
    f = dlp_paid(d).set_index("work_order_id")
    assert set(f.index) == {"P", "W"} and f.severity["P"] == "high" and f.severity["W"] == "low"
    assert "confirm the defect" in f.reason["W"]


def test_sla_needs_a_clear_miss_and_rain_eases_it():
    d = frame(
        wo(work_order_id="near", sla_met="N", sla_ratio=1.5),
        wo(work_order_id="clear", sla_met="N", sla_ratio=3.5),
        wo(work_order_id="rain", sla_met="N", sla_ratio=3.5, heavy_rain_days=2),
        wo(work_order_id="met", sla_met="Y", sla_ratio=3.5),
        wo(work_order_id="noclock", sla_met="N", sla_ratio=np.nan),
    )
    f = sla_missed(d).set_index("work_order_id")
    assert set(f.index) == {"clear", "rain"}
    assert f.severity["clear"] == "medium" and f.severity["rain"] == "low"
    assert "Heavy rain" in f.reason["rain"]


def test_reopened_severity_and_fair_context():
    d = frame(
        wo(work_order_id="a", reopened=1),
        wo(work_order_id="b", reopened=1, road_id="RD2"),
        wo(work_order_id="c", reopened=1, road_id="RD2"),
        wo(work_order_id="d", reopened=1, road_id="RD3", under_dlp="Y"),
        wo(work_order_id="ok", reopened=0),
    )
    f = reopened(d, pd.Series({"CT01": 0.1}), 0.24).set_index("work_order_id")
    assert set(f.index) == {"a", "b", "c", "d"}
    assert f.severity.to_dict() == {"a": "low", "b": "medium", "c": "medium", "d": "high"}
    assert "city average 24%" in f.reason["a"]
