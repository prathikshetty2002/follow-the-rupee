"""Every tunable number for the next-rupee index lives here.

The weights are a stated judgement, not a fitted model: the dataset analysis
(research_notes/Next rupee model selection/dataset_analysis.md) shows the
likelihood terms (flood, history) are backtest-validated, while the impact terms
(traffic, accidents, facilities) are value judgements the brief asks for.
"""

import pandas as pd

WEIGHTS = {
    "severity": 0.30,
    "flood": 0.25,
    "history": 0.15,
    "traffic": 0.10,
    "accidents": 0.10,
    "facilities": 0.10,
}
LIKELIHOOD = ("flood", "history")
IMPACT = ("traffic", "accidents", "facilities")

# Inside each factor
FLOOD_DISTANCE_SCALE_M = 500  # hotspot nearness = exp(-d / scale)
FLOOD_TIDE_BUMP = 1.2  # nearness multiplier when the nearest hotspot is tide-sensitive
FLOOD_MIX = {"hotspot": 0.5, "low_lying": 0.5}
HISTORY_MIX = {"complaints": 0.7, "reopens": 0.3}
TRAFFIC_MIX = {"congestion": 0.5, "peak_vehicles": 0.3, "bus_route": 0.2}
FATAL_ACCIDENT_WEIGHT = 2  # a fatal road-defect accident counts as 1 + this
FACILITY_WEIGHTS = {"emergency_hospital": 2, "school": 1}
UPVOTE_TIEBREAK = 0.02  # added on top of the 0-1 score so identical roads order by public concern

# Open-issue extraction
OPEN_STATUSES = ("Open", "In Progress")
DEDUP_WINDOW_DAYS = 14
GPS_MATCH_MAX_M = 400
ROAD_DEFECT_CAUSES = ("Pothole", "Waterlogged road", "Uneven road / open chamber")

# Severity comes from the SLA band the work type is normally given: 24 h = 5 ... 168 h = 1
SLA_SEVERITY_MAX_H, SLA_SEVERITY_MIN_H = 24, 168
DEFAULT_WORK_TYPE = "Pothole"  # for complaints whose category cannot be resolved

# Backtest windows
BACKTEST_CUTOFF = pd.Timestamp("2025-08-01")
BACKTEST_END = pd.Timestamp("2025-10-01")
TOP_K_WARD = 3
BOOTSTRAP_REPS = 1000
WEIGHT_PERTURBATIONS = 1000
RANDOM_SEED = 7
