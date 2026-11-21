"""Load the hackathon CSVs and write outputs for the web app."""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "web" / "public" / "data"

DATE_COLUMNS = {
    "complaints": ["received_at", "resolved_at"],
    "work_orders": ["assigned_at", "work_started_at", "completed_at"],
    "social_posts": ["posted_at"],
    "accidents": ["occurred_at"],
    "rainfall_daily": ["date"],
    "tides": ["date"],
    "roads": ["last_resurfaced"],
}


def load(name: str) -> pd.DataFrame:
    """load("work_orders") -> DataFrame of data/work_orders.csv with dates parsed."""
    return pd.read_csv(DATA_DIR / f"{name}.csv", parse_dates=DATE_COLUMNS.get(name, []))


def write_json(name: str, obj, compact: bool = False) -> Path:
    """Write web/public/data/<name>.json (schema in shared/schema.md). A name with an extension (geo/wards.geojson) is used as given.

    compact=True drops the indentation: about 40% smaller, used for the large files."""
    path = OUT_DIR / (name if Path(name).suffix else f"{name}.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    kwargs = {"separators": (",", ":")} if compact else {"indent": 2}
    path.write_text(json.dumps(obj, ensure_ascii=False, default=str, **kwargs))
    return path
