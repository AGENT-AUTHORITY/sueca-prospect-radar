"""Data access for the cached OSM territory scans."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.orm import OsmCache


class CacheRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, location_name: str, radius: int) -> OsmCache | None:
        return self.db.scalar(
            select(OsmCache).where(
                OsmCache.location_name == location_name, OsmCache.radius == radius
            )
        )

    def upsert(self, location_name: str, lat: float, lon: float, radius: int,
               elements: list[dict]) -> OsmCache:
        row = self.get(location_name, radius)
        if row:
            row.latitude, row.longitude = lat, lon
            row.elements = elements
            row.element_count = len(elements)
            row.fetched_at = datetime.now(timezone.utc)
        else:
            row = OsmCache(
                location_name=location_name, latitude=lat, longitude=lon,
                radius=radius, elements=elements, element_count=len(elements),
            )
            self.db.add(row)
        self.db.flush()
        return row
