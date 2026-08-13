"""Clear prospects, pipeline history and search runs for a fresh demo.

Keeps the cached OSM territory scan, industries, locations and settings — so a
re-run streams instantly from cache without re-hitting OpenStreetMap.

Usage:  python reset_prospects.py
"""
from sqlalchemy import delete

from database.db import SessionLocal
from models.orm import (
    Prospect,
    ProspectHistory,
    ProspectNote,
    ProspectSource,
    SearchEvent,
    SearchQuery,
    SearchRun,
)


def reset() -> None:
    with SessionLocal() as db:
        for model in (ProspectHistory, ProspectNote, ProspectSource, SearchEvent,
                      SearchQuery, Prospect, SearchRun):
            db.execute(delete(model))
        db.commit()
    print("Prospects, notes, history and search runs cleared. Cache kept.")


if __name__ == "__main__":
    reset()
