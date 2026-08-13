"""SQLAlchemy ORM models — the full schema.

Every dashboard metric is derived from these tables. There are no hardcoded
counts anywhere in the app.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --- Pipeline / status vocabulary ------------------------------------------
PIPELINE_STATUSES = [
    "NEW",
    "RESEARCHING",
    "READY_TO_CONTACT",
    "CONTACTED",
    "FOLLOW_UP",
    "MEETING",
    "OPPORTUNITY",
    "QUOTED",
    "NEGOTIATION",
    "WON",
    "LOST",
    "NO_FIT",
]


class Prospect(Base):
    __tablename__ = "prospects"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identity / dedup keys
    company_name: Mapped[str] = mapped_column(String(400))
    normalized_name: Mapped[str] = mapped_column(String(400), index=True)
    osm_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # OSM node/way IDs now exceed 2^31 — needs 64-bit (BIGINT on Postgres;
    # SQLite INTEGER is already 64-bit).
    osm_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    website_domain: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)

    # Classification
    industry: Mapped[str | None] = mapped_column(String(80), nullable=True)
    subindustry: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Location
    address: Mapped[str | None] = mapped_column(String(400), nullable=True)
    city: Mapped[str | None] = mapped_column(String(160), nullable=True)
    province: Mapped[str | None] = mapped_column(String(160), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Contact
    phone: Mapped[str | None] = mapped_column(String(120), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    website: Mapped[str | None] = mapped_column(String(400), nullable=True)
    google_maps_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(400), nullable=True)

    # Provenance
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    search_query: Mapped[str | None] = mapped_column(String(400), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Commercial layer
    priority: Mapped[str] = mapped_column(String(20), default="LOW")
    score: Mapped[int] = mapped_column(Integer, default=0)
    data_confidence: Mapped[int] = mapped_column(Integer, default=0)
    score_breakdown: Mapped[list | None] = mapped_column(JSON, nullable=True)
    signals: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    osm_tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="NEW", index=True)
    assigned_to: Mapped[str | None] = mapped_column(String(160), nullable=True)
    next_action: Mapped[str | None] = mapped_column(String(400), nullable=True)
    next_action_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_role: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Fleet / Volvo intelligence
    fleet_signal: Mapped[bool] = mapped_column(Boolean, default=False)
    fleet_size_estimate: Mapped[str | None] = mapped_column(String(80), nullable=True)
    fleet_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    potential_truck_application: Mapped[str | None] = mapped_column(String(200), nullable=True)
    volvo_family: Mapped[str | None] = mapped_column(String(20), nullable=True)
    truck_application_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    commercial_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    sources: Mapped[list["ProspectSource"]] = relationship(
        back_populates="prospect", cascade="all, delete-orphan"
    )
    notes: Mapped[list["ProspectNote"]] = relationship(
        back_populates="prospect", cascade="all, delete-orphan"
    )
    history: Mapped[list["ProspectHistory"]] = relationship(
        back_populates="prospect", cascade="all, delete-orphan"
    )


class ProspectSource(Base):
    __tablename__ = "prospect_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    prospect_id: Mapped[int] = mapped_column(ForeignKey("prospects.id", ondelete="CASCADE"))
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    search_query: Mapped[str | None] = mapped_column(String(400), nullable=True)
    run_id: Mapped[int | None] = mapped_column(ForeignKey("search_runs.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    prospect: Mapped[Prospect] = relationship(back_populates="sources")


class ProspectNote(Base):
    __tablename__ = "prospect_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    prospect_id: Mapped[int] = mapped_column(ForeignKey("prospects.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    author: Mapped[str | None] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    prospect: Mapped[Prospect] = relationship(back_populates="notes")


class ProspectHistory(Base):
    __tablename__ = "prospect_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    prospect_id: Mapped[int] = mapped_column(ForeignKey("prospects.id", ondelete="CASCADE"))
    action: Mapped[str] = mapped_column(String(80))
    old_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    prospect: Mapped[Prospect] = relationship(back_populates="history")


class SearchRun(Base):
    __tablename__ = "search_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    territory: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    radius: Mapped[int | None] = mapped_column(Integer, nullable=True)
    industries: Mapped[list | None] = mapped_column(JSON, nullable=True)
    max_results: Mapped[int | None] = mapped_column(Integer, nullable=True)
    queries_generated: Mapped[int] = mapped_column(Integer, default=0)
    queries_completed: Mapped[int] = mapped_column(Integer, default=0)
    companies_found: Mapped[int] = mapped_column(Integer, default=0)
    new_companies: Mapped[int] = mapped_column(Integer, default=0)
    duplicates: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)

    queries: Mapped[list["SearchQuery"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )
    events: Mapped[list["SearchEvent"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class SearchQuery(Base):
    __tablename__ = "search_queries"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("search_runs.id", ondelete="CASCADE"))
    query_text: Mapped[str] = mapped_column(String(400))
    industry: Mapped[str | None] = mapped_column(String(80), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="queued")
    results_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    run: Mapped[SearchRun] = relationship(back_populates="queries")


class SearchEvent(Base):
    __tablename__ = "search_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("search_runs.id", ondelete="CASCADE"))
    ts: Mapped[datetime] = mapped_column(DateTime, default=_now)
    type: Mapped[str] = mapped_column(String(60))
    level: Mapped[str] = mapped_column(String(20), default="info")
    message: Mapped[str] = mapped_column(String(600))
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    prospect_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    run: Mapped[SearchRun] = relationship(back_populates="events")


class Industry(Base):
    __tablename__ = "industries"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(80), unique=True)
    label: Mapped[str] = mapped_column(String(200))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    base_weight: Mapped[int] = mapped_column(Integer, default=0)
    osm_selectors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    province: Mapped[str | None] = mapped_column(String(160), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), default="Argentina")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("name", "province", name="uq_location_name_prov"),)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class OsmCache(Base):
    """Cached raw OSM territory scan.

    We scan a territory once (a slow public-Overpass call) and reuse the pool
    for every prospecting pass — real data, fetched once, then classified
    instantly. Keyed by location + rounded radius.
    """
    __tablename__ = "osm_cache"

    id: Mapped[int] = mapped_column(primary_key=True)
    location_name: Mapped[str] = mapped_column(String(200), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    radius: Mapped[int] = mapped_column(Integer)
    element_count: Mapped[int] = mapped_column(Integer, default=0)
    elements: Mapped[list | None] = mapped_column(JSON, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    __table_args__ = (
        UniqueConstraint("location_name", "radius", name="uq_cache_loc_radius"),
    )
