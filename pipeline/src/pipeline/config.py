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

# Audit flags
OVERBILL_RATIO = 1.4  # normal jobs sit within 0.75-1.3x the rate card; the data has a clean gap up to 1.4x
NORMAL_RATIO_MAX = 1.3  # money at risk is the part of the bill above this multiple of the rate card
OVERBILL_HIGH_RATIO = 2.0
DOUBLE_BILL_WINDOW_DAYS = 7  # same road and work type, earlier job, no complaint linked
SLA_FLAG_RATIO = 2.0  # flag a missed SLA only when the fix took at least this many times the target
SLA_MEDIUM_RATIO, SLA_HIGH_RATIO = 3.0, 5.0
HEAVY_RAIN_CATEGORIES = ("Heavy", "Very heavy", "Extremely heavy")
CARRIAGEWAY_WORK = ("Pothole", "Road cave-in", "Broken paver blocks", "Open or broken manhole")  # what a DLP normally covers
STATION_SPLIT_LAT = 19.03  # ward centroids south of this use the Colaba gauge, the rest Santacruz

# Contractor scorecards
SCORE_WEIGHTS = {"durability": 0.40, "billing": 0.30, "speed": 0.30}
DURABILITY_RATIO_BEST, DURABILITY_RATIO_WORST = 0.4, 1.6  # re-open rate / expected rate that scores 100 and 0
SPEED_POINTS_PER_PP = 2.5  # score moves this much per percentage point above or below the expected on-time rate
BILLING_POINTS_PER_PCT = 5  # score drops this much per 1% of jobs flagged over-billed or double-billed
GRADE_CUTS = (("A", 80), ("B", 65), ("C", 50), ("D", 35))  # below the last cut is E
LOW_LYING_CUT = 0.6  # ward low_lying_index at or above this counts as low-lying
CLEAR_DIFFERENCE_Z = 2.0  # a gap smaller than this many standard errors is "in line with expectations"
NARRATION_MODEL = "claude-sonnet-5-5"
SCORECARD_MAX_WORDS = 120
