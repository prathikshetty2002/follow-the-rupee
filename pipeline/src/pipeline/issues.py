"""Turn raw complaints into clean, de-duplicated open issues.

Open issue = a complaint BMC has not turned into a work order (status Open or In Progress),
merged with repeat complaints about the same road and category within a window.
"""

import re

import numpy as np
import pandas as pd

from pipeline import config
from pipeline.data import load
from pipeline.geo import add_midpoints, haversine_m, nearest_road

WORK_TYPES = [
    "Pothole",
    "Waterlogging",
    "Choked drain / nullah overflow",
    "Open or broken manhole",
    "Broken paver blocks",
    "Road cave-in",
]

# Each photo description appears under exactly one work type in the linked data.
PHOTO_TO_TYPE = {
    "Close-up of a crater filled with muddy water, broken asphalt edges": "Pothole",
    "Wide shot of road with several potholes, auto rickshaw swerving": "Pothole",
    "People wading through knee-deep water near shops": "Waterlogging",
    "Road under brown water up to car wheel arches": "Waterlogging",
    "Garbage blocking storm drain grate, dirty water pooling": "Choked drain / nullah overflow",
    "Nullah water overflowing onto road": "Choked drain / nullah overflow",
    "Cracked manhole cover sunk below road level": "Open or broken manhole",
    "Uncovered manhole with a stick and plastic bag as warning": "Open or broken manhole",
    "Loose paver blocks with standing water": "Broken paver blocks",
    "Uprooted paver blocks on footpath": "Broken paver blocks",
    "Collapsed road section with barricade tape": "Road cave-in",
    "Large sinkhole on road edge with exposed pipe": "Road cave-in",
}

# Helpline and portal text states the category before "at <place>".
TEMPLATE_RE = re.compile(
    r"\b(pothole|waterlogging|choked drain / nullah overflow|open or broken manhole|broken paver blocks|road cave-in)\s+at\b",
    re.I,
)
# Free text in English, Hinglish, Hindi and Marathi. Order matters: first match wins, water last.
KEYWORD_RULES = [
    (re.compile(r"paver|tiles", re.I), "Broken paver blocks"),
    (re.compile(r"manhole|dhakkan|ढक्कन|झाकण|मैनहोल", re.I), "Open or broken manhole"),
    (re.compile(r"has sunk|sinkhole|cave-?in|caved|collapsed|dhas|धंस|खचल", re.I), "Road cave-in"),
    (re.compile(r"nullah|culvert|choked|garbage|नाला|नाल्या", re.I), "Choked drain / nullah overflow"),
    (re.compile(r"pothole|crater|gadda|gaddha|khadda|गड्ढ|खड्ड", re.I), "Pothole"),
    (re.compile(r"waterlog|flood|paani|pani|पानी|पाणी|water", re.I), "Waterlogging"),
]


def classify_category(description, photo_description, reported) -> tuple[str | None, str]:
    """(work type or None, source). Reported category is wrong or vague for about 17% of complaints."""
    text = description if isinstance(description, str) else ""
    m = TEMPLATE_RE.search(text)
    if m:
        return next(t for t in WORK_TYPES if t.lower() == m.group(1).lower()), "template"
    if photo_description in PHOTO_TO_TYPE:
        return PHOTO_TO_TYPE[photo_description], "photo"
    for pattern, work_type in KEYWORD_RULES:
        if pattern.search(text):
            return work_type, "keyword"
    if reported in WORK_TYPES:
        return reported, "reported"
    return None, "unresolved"


def _locality_index(localities: pd.DataFrame) -> dict:
    index = {}
    for _, r in localities.iterrows():
        names = [r.locality] + (str(r.aliases).split(";") if pd.notna(r.aliases) else [])
        for name in names:
            index[name.strip().lower()] = (r.ward_code, r.lat, r.lon, r.locality)
    return index


def prepare_complaints() -> pd.DataFrame:
    """All complaints with a filled ward, a resolved category and an estimated road."""
    c = load("complaints")
    roads = add_midpoints(load("roads"))
    loc = _locality_index(load("localities"))
    c = c.copy()

    key = c.locality_text.fillna("").str.lower().str.strip()
    c["ward_fill"] = c.ward_code.fillna(key.map(lambda k: loc.get(k, (None,))[0]))
    c["loc_lat"] = key.map(lambda k: loc.get(k, (None, np.nan, np.nan))[1])
    c["loc_lon"] = key.map(lambda k: loc.get(k, (None, np.nan, np.nan))[2])
    c["locality"] = [loc[k][3] if k in loc else t for k, t in zip(key, c.locality_text)]  # canonical name when known

    cat = [classify_category(d, p, r) for d, p, r in zip(c.description, c.photo_description, c.category_reported)]
    c["category"] = [x[0] for x in cat]
    c["category_source"] = [x[1] for x in cat]

    c["road_est"], c["road_src"] = None, "none"
    gps = c.lat.notna()
    if gps.any():
        rid, dist = nearest_road(c.lat[gps].values, c.lon[gps].values, roads)
        ok = dist < config.GPS_MATCH_MAX_M
        idx = c.index[gps][ok]
        c.loc[idx, "road_est"], c.loc[idx, "road_src"] = rid[ok], "gps"

    names = sorted(roads.road_name.unique(), key=len, reverse=True)
    for i in c.index[c.road_est.isna()]:
        r = c.loc[i]
        desc = (r.description if isinstance(r.description, str) else "").lower()
        name = next((n for n in names if n.lower() in desc), None)
        if name:
            cand = roads[(roads.road_name == name) & (roads.ward_code == r.ward_fill)]
            cand = cand if len(cand) else roads[roads.road_name == name]
            if len(cand):
                pick = cand.iloc[0] if np.isnan(r.loc_lat) else cand.iloc[np.argmin(haversine_m(r.loc_lat, r.loc_lon, cand.mid_lat.values, cand.mid_lon.values))]
                c.loc[i, ["road_est", "road_src"]] = [pick.road_id, "name"]
                continue
        if not np.isnan(r.loc_lat):
            cand = roads[roads.ward_code == r.ward_fill]
            if len(cand):
                pick = cand.iloc[np.argmin(haversine_m(r.loc_lat, r.loc_lon, cand.mid_lat.values, cand.mid_lon.values))]
                c.loc[i, ["road_est", "road_src"]] = [pick.road_id, "locality"]
    c["ward_fill"] = c.ward_fill.fillna(c.road_est.map(roads.set_index("road_id").ward_code))
    return c


def open_issues(
    complaints: pd.DataFrame | None = None, statuses: tuple[str, ...] = config.OPEN_STATUSES, prefix: str = "OI", drop_no_ward: bool = True
) -> pd.DataFrame:
    """One row per de-duplicated issue among complaints with these statuses, with the complaint IDs behind it."""
    c = prepare_complaints() if complaints is None else complaints
    op = c[c.status.isin(statuses)].copy()
    no_ward = int(op.ward_fill.isna().sum())
    if drop_no_ward:
        op = op[op.ward_fill.notna()]  # cannot be budgeted without a ward
    else:
        op["ward_fill"] = op.ward_fill.fillna("?")
    op["work_type"] = op.category.fillna(config.DEFAULT_WORK_TYPE)
    place = op.road_est.fillna(op.ward_fill.fillna("?") + "|" + op.locality_text.fillna(""))
    op["key"] = place + "|" + op.work_type
    op = op.sort_values("received_at")
    new_issue = op.groupby("key").received_at.diff().dt.days.fillna(np.inf) > config.DEDUP_WINDOW_DAYS
    op["episode"] = new_issue.groupby(op.key).cumsum()
    op["group"] = op.key + "#" + op.episode.astype(int).astype(str)

    g = op.groupby("group", sort=False)
    issues = g.agg(
        ward_code=("ward_fill", "first"),
        locality=("locality_text", "first"),
        road_id=("road_est", "first"),
        road_source=("road_src", "first"),
        work_type=("work_type", "first"),
        category_resolved=("category", lambda s: s.notna().any()),
        n_complaints=("complaint_id", "size"),
        upvotes=("upvotes", "sum"),
        status=("status", lambda s: s.mode().iloc[0]),
        canonical_locality=("locality", "first"),
        lat=("lat", "mean"),
        lon=("lon", "mean"),
        loc_lat=("loc_lat", "mean"),
        loc_lon=("loc_lon", "mean"),
        channels=("channel", lambda s: sorted(set(s))),
        languages=("language", lambda s: sorted(set(s))),
        first_reported_at=("received_at", "min"),
        last_reported_at=("received_at", "max"),
        complaint_ids=("complaint_id", list),
    ).reset_index(drop=True)
    issues = issues.sort_values("first_reported_at").reset_index(drop=True)
    issues.insert(0, "issue_id", [f"{prefix}-{i + 1:04d}" for i in range(len(issues))])
    issues.attrs["complaints_without_ward"] = no_ward
    return issues
