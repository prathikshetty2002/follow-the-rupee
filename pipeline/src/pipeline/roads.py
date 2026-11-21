"""One row per road segment: static risk context plus history up to an optional cut-off date."""

import numpy as np
import pandas as pd

from pipeline import config
from pipeline.data import load
from pipeline.geo import add_midpoints, haversine_m


def complaint_roads(complaints: pd.DataFrame) -> pd.DataFrame:
    """Complaints with a `road` column: the work order's road when linked, else the estimated road."""
    wo = load("work_orders")[["road_id", "linked_complaint_ids"]].dropna()
    links = wo.assign(complaint_id=wo.linked_complaint_ids.str.split("|")).explode("complaint_id")
    c = complaints.merge(links[["complaint_id", "road_id"]], on="complaint_id", how="left")
    c["road"] = c.road_id.fillna(c.road_est)
    return c


def _nearest_hotspot(roads: pd.DataFrame, hotspots: pd.DataFrame):
    pts = (("mid_lat", "mid_lon"), ("start_lat", "start_lon"), ("end_lat", "end_lon"))
    d = np.minimum.reduce(
        [haversine_m(roads[a].values[:, None], roads[b].values[:, None], hotspots.lat.values[None], hotspots.lon.values[None]) for a, b in pts]
    )
    return d.min(1), d.argmin(1)


def road_table(complaints: pd.DataFrame, as_of: pd.Timestamp | None = None) -> pd.DataFrame:
    """Static features always; history (complaints, work orders, accidents) only before `as_of`.

    Re-open counts use only work orders whose 30-day window had closed by `as_of`, so the label
    is never read before it could have been known.
    """
    roads = add_midpoints(load("roads")).set_index("road_id", drop=False)
    wards = load("wards").set_index("ward_code")
    hotspots = load("flood_hotspots")
    facilities = load("facilities")
    wo = load("work_orders")
    acc = load("accidents")
    cx = complaint_roads(complaints)

    roads["low_lying_index"] = roads.ward_code.map(wards.low_lying_index)
    roads["population_est"] = roads.ward_code.map(wards.population_est)
    roads = roads.join(load("traffic").set_index("road_id")[["peak_hour_vehicles", "congestion_index_0_10"]])
    roads["bus"] = (roads.bus_route == "Y").astype(int)

    dist, nearest = _nearest_hotspot(roads, hotspots)
    roads["hs_dist_m"] = dist
    roads["hs_name"] = hotspots.name.values[nearest]
    roads["hs_threshold_mm"] = hotspots.flood_threshold_mm_per_day.values[nearest]
    roads["hs_tide"] = (hotspots.tide_sensitive.values[nearest] == "Y").astype(int)
    roads["hs_years"] = hotspots.years_flagged_last_5.values[nearest]

    hospitals = facilities[(facilities.type == "Hospital") & (facilities.emergency_services == "Y")]
    schools = facilities[facilities.type == "School"]
    roads["n_emerg_hosp"] = roads.index.map(hospitals.groupby("ambulance_entry_road").size()).fillna(0)
    roads["n_school"] = roads.index.map(schools.groupby("ambulance_entry_road").size()).fillna(0)
    roads["hospital_names"] = roads.index.map(hospitals.groupby("ambulance_entry_road").name.agg("; ".join)).fillna("")

    cut = as_of
    wo_h = wo if cut is None else wo[wo.assigned_at < cut]
    closed = wo if cut is None else wo[wo.completed_at + pd.Timedelta(days=30) <= cut]
    cx_h = cx if cut is None else cx[cx.received_at < cut]
    acc_h = acc if cut is None else acc[acc.occurred_at < cut]
    defect = acc_h[acc_h.probable_cause.isin(config.ROAD_DEFECT_CAUSES)]

    def count(df, col):
        return roads.index.map(df.groupby(col).size()).fillna(0)

    roads["n_complaints"] = count(cx_h, "road")
    roads["n_wo"] = count(wo_h, "road_id")
    roads["n_reopens"] = roads.index.map(closed[closed.reopened_within_30d == "Y"].groupby("road_id").size()).fillna(0)
    roads["spend_inr"] = roads.index.map(wo_h.groupby("road_id").cost_inr.sum()).fillna(0)
    roads["acc_defect"] = count(defect, "road_id")
    roads["acc_defect_fatal"] = count(defect[defect.severity == "Fatal"], "road_id")
    return roads
