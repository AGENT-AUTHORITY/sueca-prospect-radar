"""Data access for prospects, notes, history, and dashboard metrics.

Business logic lives in services/scoring; this layer only talks to the DB.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from models.orm import Prospect, ProspectHistory, ProspectNote, ProspectSource
from utils import haversine_m

WON_STATUSES = {"WON"}
CONTACTED_STATUSES = {
    "CONTACTED", "FOLLOW_UP", "MEETING", "OPPORTUNITY",
    "QUOTED", "NEGOTIATION", "WON", "LOST",
}
OPPORTUNITY_STATUSES = {"OPPORTUNITY", "QUOTED", "NEGOTIATION"}
MEETING_STATUSES = {"MEETING"}


class ProspectRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- lookups used by dedup ---------------------------------------------
    def find_by_osm(self, osm_type: str | None, osm_id: int | None) -> Prospect | None:
        if not osm_type or osm_id is None:
            return None
        return self.db.scalar(
            select(Prospect).where(
                Prospect.osm_type == osm_type, Prospect.osm_id == osm_id
            )
        )

    def find_by_domain(self, domain: str | None) -> Prospect | None:
        if not domain:
            return None
        return self.db.scalar(select(Prospect).where(Prospect.website_domain == domain))

    def find_by_normalized_name(self, normalized: str) -> list[Prospect]:
        if not normalized:
            return []
        return list(
            self.db.scalars(
                select(Prospect).where(Prospect.normalized_name == normalized)
            )
        )

    def find_near(self, lat: float, lon: float, meters: float) -> list[Prospect]:
        """Coarse bbox prefilter, then exact haversine — fine at town scale."""
        deg = meters / 111_000.0
        rows = self.db.scalars(
            select(Prospect).where(
                Prospect.latitude.is_not(None),
                Prospect.latitude.between(lat - deg, lat + deg),
                Prospect.longitude.between(lon - deg, lon + deg),
            )
        )
        return [
            p for p in rows
            if haversine_m(lat, lon, p.latitude, p.longitude) <= meters
        ]

    # --- writes ------------------------------------------------------------
    def add(self, prospect: Prospect) -> Prospect:
        self.db.add(prospect)
        self.db.flush()
        return prospect

    def add_source(self, prospect_id: int, source: str | None, source_url: str | None,
                   search_query: str | None, run_id: int | None) -> None:
        self.db.add(ProspectSource(
            prospect_id=prospect_id, source=source, source_url=source_url,
            search_query=search_query, run_id=run_id,
        ))

    def add_history(self, prospect_id: int, action: str, old_status: str | None,
                    new_status: str | None, note: str | None = None) -> ProspectHistory:
        h = ProspectHistory(
            prospect_id=prospect_id, action=action,
            old_status=old_status, new_status=new_status, note=note,
        )
        self.db.add(h)
        self.db.flush()
        return h

    def add_note(self, prospect_id: int, body: str, author: str | None) -> ProspectNote:
        n = ProspectNote(prospect_id=prospect_id, body=body, author=author)
        self.db.add(n)
        self.db.flush()
        return n

    # --- reads -------------------------------------------------------------
    def get(self, prospect_id: int) -> Prospect | None:
        return self.db.get(Prospect, prospect_id)

    def list_notes(self, prospect_id: int) -> list[ProspectNote]:
        return list(self.db.scalars(
            select(ProspectNote).where(ProspectNote.prospect_id == prospect_id)
            .order_by(ProspectNote.created_at.desc())
        ))

    def list_history(self, prospect_id: int) -> list[ProspectHistory]:
        return list(self.db.scalars(
            select(ProspectHistory).where(ProspectHistory.prospect_id == prospect_id)
            .order_by(ProspectHistory.created_at.desc())
        ))

    def query(self, *, search: str | None = None, province: str | None = None,
              city: str | None = None, industry: str | None = None,
              priority: str | None = None, status: str | None = None,
              min_score: int | None = None, has_phone: bool | None = None,
              has_website: bool | None = None, fleet_signal: bool | None = None,
              sort: str = "score", order: str = "desc",
              limit: int = 50, offset: int = 0) -> tuple[list[Prospect], int]:
        stmt = select(Prospect)
        if search:
            like = f"%{search.lower()}%"
            stmt = stmt.where(or_(
                func.lower(Prospect.company_name).like(like),
                func.lower(Prospect.city).like(like),
                func.lower(Prospect.industry).like(like),
            ))
        if province:
            stmt = stmt.where(Prospect.province == province)
        if city:
            stmt = stmt.where(Prospect.city == city)
        if industry:
            stmt = stmt.where(Prospect.industry == industry)
        if priority:
            stmt = stmt.where(Prospect.priority == priority)
        if status:
            stmt = stmt.where(Prospect.status == status)
        if min_score is not None:
            stmt = stmt.where(Prospect.score >= min_score)
        if has_phone:
            stmt = stmt.where(Prospect.phone.is_not(None), Prospect.phone != "")
        if has_website:
            stmt = stmt.where(Prospect.website.is_not(None), Prospect.website != "")
        if fleet_signal:
            stmt = stmt.where(Prospect.fleet_signal.is_(True))

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        sort_col = {
            "score": Prospect.score,
            "company_name": Prospect.company_name,
            "created_at": Prospect.created_at,
            "updated_at": Prospect.updated_at,
            "city": Prospect.city,
        }.get(sort, Prospect.score)
        sort_col = sort_col.desc() if order == "desc" else sort_col.asc()
        stmt = stmt.order_by(sort_col).limit(limit).offset(offset)
        return list(self.db.scalars(stmt)), total

    def all_with_coords(self) -> list[Prospect]:
        return list(self.db.scalars(
            select(Prospect).where(
                Prospect.latitude.is_not(None), Prospect.longitude.is_not(None)
            )
        ))

    def set_status(self, prospect: Prospect, new_status: str, note: str | None) -> None:
        old = prospect.status
        prospect.status = new_status
        prospect.updated_at = datetime.now(timezone.utc)
        self.add_history(prospect.id, "status_change", old, new_status, note)

    # --- dashboard metrics (always computed from the DB) -------------------
    def metrics(self) -> dict:
        db = self.db
        total = db.scalar(select(func.count(Prospect.id))) or 0
        high = db.scalar(
            select(func.count(Prospect.id)).where(Prospect.priority == "HIGH")
        ) or 0

        def count_status(statuses: set[str]) -> int:
            return db.scalar(
                select(func.count(Prospect.id)).where(Prospect.status.in_(statuses))
            ) or 0

        by_industry = dict(db.execute(
            select(Prospect.industry, func.count(Prospect.id)).group_by(Prospect.industry)
        ).all())
        by_status = dict(db.execute(
            select(Prospect.status, func.count(Prospect.id)).group_by(Prospect.status)
        ).all())
        by_volvo = dict(db.execute(
            select(Prospect.volvo_family, func.count(Prospect.id))
            .where(Prospect.volvo_family.is_not(None))
            .group_by(Prospect.volvo_family)
        ).all())
        avg_score = db.scalar(select(func.avg(Prospect.score))) or 0

        return {
            "prospects_found": total,
            "high_priority": high,
            "contacted": count_status(CONTACTED_STATUSES),
            "meetings": count_status(MEETING_STATUSES),
            "opportunities": count_status(OPPORTUNITY_STATUSES),
            "won": count_status(WON_STATUSES),
            "avg_score": round(float(avg_score), 1),
            "by_industry": {k: v for k, v in by_industry.items() if k},
            "by_status": {k: v for k, v in by_status.items() if k},
            "by_volvo": {k: v for k, v in by_volvo.items() if k},
        }
