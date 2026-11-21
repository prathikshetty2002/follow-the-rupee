"""The next-rupee file carries everything the planner needs to re-score and explain an issue in the browser."""

import json

import pytest

from pipeline import config
from pipeline.data import OUT_DIR
from pipeline.index import FACTORS

pytestmark = pytest.mark.skipif(not (OUT_DIR / "next_rupee.json").exists(), reason="run `uv run pipeline next-rupee` first")


@pytest.fixture(scope="module")
def plan():
    return json.loads((OUT_DIR / "next_rupee.json").read_text())


def issues(plan):
    return [i for w in plan["wards"] for i in w["issues"]]


def test_scores_can_be_rebuilt_from_raw_factor_values(plan):
    w = plan["weights"]
    for i in issues(plan):
        rebuilt = sum(w[f] * i["factor_values"][f] for f in FACTORS) + i["tiebreak"]
        assert abs(rebuilt - i["priority_score"] / 100) < 0.001, i["issue_id"]
        assert all(0 <= i["factor_values"][f] <= 1 for f in FACTORS)


def test_cost_and_rank_ranges_are_sane(plan):
    for i in issues(plan):
        lo, hi = i["cost_range_inr"]
        assert 0 <= lo <= hi
        assert (lo, hi) == (0, 0) if i["dlp"] else lo <= i["cost_to_bmc_inr"] <= hi * 1.5
        a, b = i["rank_range"]
        assert 1 <= a <= b and a <= i["rank"] <= b, i["issue_id"]
        assert i["confidence"] in {"high", "medium", "low"} and len(i["confidence_notes"]) >= 2


def test_confidence_follows_where_the_road_came_from(plan):
    gps = [i for i in issues(plan) if i["road_match"] == "gps"]
    guess = [i for i in issues(plan) if i["road_match"] not in ("gps", "name")]
    share = lambda xs, level: sum(i["confidence"] == level for i in xs) / len(xs)  # noqa: E731
    assert share(gps, "high") > share(guess, "high")
    assert share(guess, "high") < 0.2


def test_presets_cover_the_default_and_each_is_backtested(plan):
    presets = plan["weight_presets"]
    assert presets[0]["key"] == "balanced" and presets[0]["weights"] == pytest.approx(plan["weights"])
    assert presets[0]["top3_overlap_with_default"] == 1.0
    for p in presets:
        assert sum(p["weights"].values()) == pytest.approx(1.0)
        assert set(p["weights"]) == set(config.WEIGHTS)
        assert -1 <= p["backtest"]["in_ward"] <= 1 and 0 <= p["backtest"]["precision_at_3"] <= 1
