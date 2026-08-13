"""Pydantic schemas for API request/response bodies."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScoreReason(BaseModel):
    points: int
    reason: str
    category: str | None = None


class ProspectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    normalized_name: str
    industry: str | None = None
    subindustry: str | None = None
    description: str | None = None
    address: str | None = None
    city: str | None = None
    province: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    website: str | None = None
    website_domain: str | None = None
    google_maps_url: str | None = None
    linkedin_url: str | None = None
    instagram_url: str | None = None
    facebook_url: str | None = None
    source: str | None = None
    source_url: str | None = None
    search_query: str | None = None
    priority: str
    score: int
    data_confidence: int = 0
    score_breakdown: list[ScoreReason] | None = None
    signals: dict | None = None
    status: str
    assigned_to: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    fleet_signal: bool
    fleet_size_estimate: str | None = None
    fleet_notes: str | None = None
    potential_truck_application: str | None = None
    volvo_family: str | None = None
    truck_application_notes: str | None = None
    commercial_reason: str | None = None
    next_action: str | None = None
    next_action_date: datetime | None = None
    created_at: datetime
    updated_at: datetime
    last_checked_at: datetime | None = None


class NoteIn(BaseModel):
    body: str
    author: str | None = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    body: str
    author: str | None = None
    created_at: datetime


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    action: str
    old_status: str | None = None
    new_status: str | None = None
    note: str | None = None
    created_at: datetime


class StatusChangeIn(BaseModel):
    status: str
    note: str | None = None


class ProspectPatch(BaseModel):
    status: str | None = None
    assigned_to: str | None = None
    contact_name: str | None = None
    contact_role: str | None = None
    next_action: str | None = None
    next_action_date: datetime | None = None
    fleet_size_estimate: str | None = None
    fleet_notes: str | None = None


class StartSearchIn(BaseModel):
    location: str
    territory: str | None = None
    radius: int | None = None
    industries: list[str]
    max_results: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    refresh: bool = False  # force a fresh OSM scan instead of using the cache


class SearchRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    started_at: datetime
    finished_at: datetime | None = None
    territory: str | None = None
    location: str | None = None
    radius: int | None = None
    industries: list | None = None
    max_results: int | None = None
    queries_generated: int
    queries_completed: int
    companies_found: int
    new_companies: int
    duplicates: int
    errors: int
    status: str


class SearchEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    run_id: int
    ts: datetime
    type: str
    level: str
    message: str
    payload: dict | None = None
    prospect_id: int | None = None


class IndustryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    label: str
    active: bool
    base_weight: int


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    province: str | None = None
    country: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    active: bool


class LocationIn(BaseModel):
    name: str
    province: str | None = "Buenos Aires"
    country: str | None = "Argentina"
    latitude: float | None = None
    longitude: float | None = None
