import numpy as np
import pandas as pd
import pytest

from pipeline import config
from pipeline.budget import greedy_fill, knapsack
from pipeline.index import FACTORS, score_issues
from pipeline.issues import classify_category


def _one_issue(**factor_values):
    roads = pd.DataFrame({"ward_code": ["A"]}, index=pd.Index(["RD1"], name="road_id"))
    factors = pd.DataFrame({k: [v] for k, v in factor_values.items() if k != "severity"}, index=roads.index)
    issues = pd.DataFrame({"issue_id": ["I1"], "ward_code": ["A"], "road_id": ["RD1"], "work_type": ["Pothole"], "upvotes": [0]})
    severity = pd.Series({"Pothole": factor_values.get("severity", 0.6) * 5})
    return score_issues(issues, factors, roads, severity)


BASE = dict(severity=0.5, flood=0.5, history=0.5, traffic=0.5, accidents=0.5, facilities=0.5)


def test_weights_sum_to_one():
    assert sum(config.WEIGHTS.values()) == pytest.approx(1.0)
    assert set(config.WEIGHTS) == set(FACTORS)


@pytest.mark.parametrize("factor", FACTORS)
def test_raising_any_factor_never_lowers_score(factor):
    low = _one_issue(**BASE).score[0]
    high = _one_issue(**{**BASE, factor: 0.9}).score[0]
    assert high > low


def test_scores_stay_in_unit_range():
    assert 0 <= _one_issue(**{k: 0.0 for k in BASE}).score[0] <= _one_issue(**{k: 1.0 for k in BASE}).score[0] <= 1 + config.UPVOTE_TIEBREAK


@pytest.mark.parametrize(
    "description,photo,reported,expected",
    [
        ("Citizen informs open or broken manhole at Oshiwara, near market on Link Road.", None, "Other", "Open or broken manhole"),
        ("Ghatkopar East में पानी भर गया है", "Road under brown water up to car wheel arches", "Other", "Waterlogging"),
        ("petrol pump ke paas gutter ka dhakkan khula hai, paani mein dikh nahi raha", None, "Waterlogging", "Open or broken manhole"),
        ("Part of LBS Marg has sunk near BEST depot. Pipeline leaking below?", None, "Road related", "Road cave-in"),
        ("something is wrong", None, "Other", None),
    ],
)
def test_category_resolution(description, photo, reported, expected):
    assert classify_category(description, photo, reported)[0] == expected


def test_fills_never_exceed_budget_and_optimum_beats_greedy():
    issues = pd.DataFrame({"score": [0.9, 0.5, 0.5, 0.4], "cost_to_bmc_inr": [100.0, 60.0, 60.0, 0.0]})
    funded = greedy_fill(issues, 120.0)
    assert issues.cost_to_bmc_inr[funded].sum() <= 120.0
    assert funded.tolist() == [True, False, False, True]  # priority order: the top issue takes the money
    best, picked = knapsack(issues, 120.0)
    assert issues.cost_to_bmc_inr[picked].sum() <= 120.0
    assert best >= issues.score[funded].sum()
    assert best == pytest.approx(1.4)  # two cheaper issues plus the free one beat the single expensive one


def test_zero_budget_still_funds_free_dlp_work():
    issues = pd.DataFrame({"score": [0.9, 0.4], "cost_to_bmc_inr": [100.0, 0.0]})
    assert greedy_fill(issues, 0.0).tolist() == [False, True]
