"""Integrity checks on the committed JSON in web/public/data: the guarantees the dashboard relies on."""

import json

import pytest

from pipeline.data import OUT_DIR

pytestmark = pytest.mark.skipif(not (OUT_DIR / "manifest.json").exists(), reason="run `uv run pipeline all` first")


def read(name):
    return json.loads((OUT_DIR / name).read_text())


@pytest.fixture(scope="module")
def data():
    return {n: read(f"{n}.json") for n in ("flags", "issues", "work_orders", "complaint_to_issue", "next_rupee", "wards", "contractors", "meta")}


def test_data_is_marked_real(data):
    assert data["meta"]["stub"] is False and data["meta"]["counts"]["work_orders"] == 2499


def test_every_flag_evidence_id_resolves_to_a_work_order(data):
    ids = {w["work_order_id"] for w in data["work_orders"]}
    assert len(ids) == 2499
    for f in data["flags"]:
        assert set(f["evidence_work_order_ids"]) <= ids
    for c in data["contractors"]:
        assert set(c["evidence_work_order_ids"]) <= ids


def test_every_complaint_is_in_exactly_one_issue(data):
    seen = [c for i in data["issues"] for c in i["complaint_ids"]]
    assert len(seen) == len(set(seen)) == 6501 == len(data["complaint_to_issue"])
    issue_ids = {i["issue_id"] for i in data["issues"]}
    assert set(data["complaint_to_issue"].values()) <= issue_ids


def test_trail_issues_join_to_the_ranked_plan(data):
    plan = {i["issue_id"]: i for w in data["next_rupee"]["wards"] for i in w["issues"]}
    never = [i for i in data["issues"] if i["status"] == "never_fixed"]
    assert len(never) == len(plan) == 589
    for i in never:
        assert set(i["complaint_ids"]) == set(plan[i["plan_issue_id"]]["complaint_ids"])
    assert all(i["plan_issue_id"] is None for i in data["issues"] if i["status"] != "never_fixed")


def test_work_orders_point_back_to_their_issue(data):
    by_issue = {i["issue_id"]: i for i in data["issues"]}
    linked = [w for w in data["work_orders"] if w["issue_id"]]
    assert len(linked) == 2454  # the other 45 work orders have no complaint
    for w in linked[:200]:
        assert w["work_order_id"] in by_issue[w["issue_id"]]["work_order_ids"]


def test_ward_bundles_add_up_to_the_city_files(data):
    bundles = [read(f"by_ward/{w['ward_code'].replace('/', '-')}.json") for w in data["wards"]]
    assert len(bundles) == 24
    assert sum(len(b["flags"]) for b in bundles) == len(data["flags"])
    assert sum(len(b["issues"]) for b in bundles) == len(data["issues"]) - sum(1 for i in data["issues"] if i["ward_code"] not in {w["ward_code"] for w in data["wards"]})
    for b in bundles:
        assert all(i["plan"] for i in b["issues"] if i["status"] == "never_fixed")


def test_map_layers_are_complete():
    wards, roads, points = read("geo/wards.geojson"), read("geo/roads.geojson"), read("geo/open_issues.geojson")
    assert len(wards["features"]) == 24 and len(roads["features"]) == 291
    assert all("risk_score" in f["properties"] for f in wards["features"])
    assert 570 <= len(points["features"]) <= 589
    assert all(-90 <= f["geometry"]["coordinates"][1] <= 90 for f in points["features"])


def test_text_is_present_everywhere(data):
    assert all(c["scorecard_text"] for c in data["contractors"]) and all(w["summary"] for w in data["wards"])
