"""Data access for industries, locations, and settings."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.orm import Industry, Location, Setting


class TaxonomyRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- industries --------------------------------------------------------
    def list_industries(self, active_only: bool = False) -> list[Industry]:
        stmt = select(Industry).order_by(Industry.base_weight.desc())
        if active_only:
            stmt = stmt.where(Industry.active.is_(True))
        return list(self.db.scalars(stmt))

    def get_industries_by_keys(self, keys: list[str]) -> list[Industry]:
        return list(self.db.scalars(select(Industry).where(Industry.key.in_(keys))))

    def set_industry_active(self, key: str, active: bool) -> Industry | None:
        ind = self.db.scalar(select(Industry).where(Industry.key == key))
        if ind:
            ind.active = active
        return ind

    # --- locations ---------------------------------------------------------
    def list_locations(self, active_only: bool = False) -> list[Location]:
        stmt = select(Location).order_by(Location.name.asc())
        if active_only:
            stmt = stmt.where(Location.active.is_(True))
        return list(self.db.scalars(stmt))

    def get_location_by_name(self, name: str) -> Location | None:
        return self.db.scalar(select(Location).where(Location.name == name))

    def add_location(self, name: str, province: str | None, country: str | None,
                     latitude: float | None, longitude: float | None) -> Location:
        loc = Location(
            name=name, province=province, country=country,
            latitude=latitude, longitude=longitude, active=True,
        )
        self.db.add(loc)
        self.db.flush()
        return loc

    # --- settings ----------------------------------------------------------
    def get_setting(self, key: str, default: dict | None = None) -> dict | None:
        s = self.db.get(Setting, key)
        return s.value if s else default

    def set_setting(self, key: str, value: dict) -> None:
        s = self.db.get(Setting, key)
        if s:
            s.value = value
        else:
            self.db.add(Setting(key=key, value=value))
