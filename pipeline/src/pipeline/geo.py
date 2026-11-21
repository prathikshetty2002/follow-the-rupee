import numpy as np
import pandas as pd

EARTH_RADIUS_M = 6_371_000


def haversine_m(lat1, lon1, lat2, lon2):
    """Great-circle distance in metres; broadcasts like numpy."""
    p = np.pi / 180
    a = np.sin((lat2 - lat1) * p / 2) ** 2 + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * EARTH_RADIUS_M * np.arcsin(np.sqrt(a))


def add_midpoints(roads: pd.DataFrame) -> pd.DataFrame:
    roads = roads.copy()
    roads["mid_lat"] = (roads.start_lat + roads.end_lat) / 2
    roads["mid_lon"] = (roads.start_lon + roads.end_lon) / 2
    return roads


def nearest_road(lat, lon, roads: pd.DataFrame, samples: int = 11):
    """Nearest road segment for each point, measuring to `samples` points along every segment.

    Returns (road_ids, distances in metres), one entry per input point.
    """
    lat, lon = np.asarray(lat, float)[:, None], np.asarray(lon, float)[:, None]
    ts = np.linspace(0, 1, samples)
    best = np.full((lat.shape[0], len(roads)), np.inf)
    for t in ts:
        seg_lat = (roads.start_lat.values * (1 - t) + roads.end_lat.values * t)[None]
        seg_lon = (roads.start_lon.values * (1 - t) + roads.end_lon.values * t)[None]
        best = np.minimum(best, haversine_m(lat, lon, seg_lat, seg_lon))
    return roads.road_id.values[best.argmin(1)], best.min(1)
