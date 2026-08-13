"""Create all tables and seed reference data (idempotent).

Run directly:  python -m database.init_db
Also called on FastAPI startup so a fresh clone works with zero manual steps.
"""
from __future__ import annotations

from sqlalchemy import inspect, select, text

from database.db import Base, SessionLocal, engine
from database.seed_data import DEFAULT_SETTINGS, INDUSTRIES, LOCATIONS
from models.orm import Industry, Location, Setting

# Columns added after the first release; added in-place so existing prospect
# data (and the OSM cache) survive an upgrade.
_PROSPECT_MIGRATIONS = {
    "data_confidence": "INTEGER DEFAULT 0",
    "signals": "JSON",
    "osm_tags": "JSON",
    "volvo_family": "VARCHAR(20)",
}


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_prospect_columns()
    with SessionLocal() as db:
        _seed_industries(db)
        _seed_locations(db)
        _seed_settings(db)
        db.commit()


def _migrate_prospect_columns() -> None:
    inspector = inspect(engine)
    if "prospects" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("prospects")}
    with engine.begin() as conn:
        for col, ddl in _PROSPECT_MIGRATIONS.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE prospects ADD COLUMN {col} {ddl}"))


def _seed_industries(db) -> None:
    for row in INDUSTRIES:
        existing = db.scalar(select(Industry).where(Industry.key == row["key"]))
        if existing:
            # Keep selectors/keywords in sync with code, preserve `active`.
            existing.label = row["label"]
            existing.base_weight = row["base_weight"]
            existing.osm_selectors = row["osm_selectors"]
            existing.keywords = row["keywords"]
        else:
            db.add(Industry(active=True, **row))


def _seed_locations(db) -> None:
    for row in LOCATIONS:
        existing = db.scalar(
            select(Location).where(
                Location.name == row["name"], Location.province == row["province"]
            )
        )
        if not existing:
            db.add(Location(active=True, country="Argentina", **row))


def _seed_settings(db) -> None:
    for key, value in DEFAULT_SETTINGS.items():
        existing = db.get(Setting, key)
        if not existing:
            db.add(Setting(key=key, value=value))


if __name__ == "__main__":
    init_db()
    print("Database initialized and seeded.")
