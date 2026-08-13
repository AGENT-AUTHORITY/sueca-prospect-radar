"""Industries, locations (territory), and settings."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.db import get_session
from database.seed_data import DEFAULT_SETTINGS
from models.schemas import IndustryOut, LocationIn, LocationOut
from repositories.taxonomy_repository import TaxonomyRepository

router = APIRouter(prefix="/api", tags=["taxonomy"])


class ActiveToggle(BaseModel):
    active: bool


class SettingIn(BaseModel):
    value: dict


@router.get("/industries", response_model=list[IndustryOut])
def list_industries(active_only: bool = False,
                    db: Session = Depends(get_session)) -> list[IndustryOut]:
    repo = TaxonomyRepository(db)
    return [IndustryOut.model_validate(i) for i in repo.list_industries(active_only)]


@router.post("/industries/{key}/active", response_model=IndustryOut)
def toggle_industry(key: str, body: ActiveToggle,
                    db: Session = Depends(get_session)) -> IndustryOut:
    repo = TaxonomyRepository(db)
    ind = repo.set_industry_active(key, body.active)
    if not ind:
        raise HTTPException(404, "Industry not found")
    db.commit()
    db.refresh(ind)
    return IndustryOut.model_validate(ind)


@router.get("/locations", response_model=list[LocationOut])
def list_locations(active_only: bool = False,
                   db: Session = Depends(get_session)) -> list[LocationOut]:
    repo = TaxonomyRepository(db)
    return [LocationOut.model_validate(loc) for loc in repo.list_locations(active_only)]


@router.post("/locations", response_model=LocationOut)
def add_location(body: LocationIn, db: Session = Depends(get_session)) -> LocationOut:
    repo = TaxonomyRepository(db)
    existing = repo.get_location_by_name(body.name)
    if existing:
        return LocationOut.model_validate(existing)
    loc = repo.add_location(body.name, body.province, body.country,
                            body.latitude, body.longitude)
    db.commit()
    db.refresh(loc)
    return LocationOut.model_validate(loc)


@router.get("/settings")
def get_settings(db: Session = Depends(get_session)) -> dict:
    repo = TaxonomyRepository(db)
    return {
        "engine": repo.get_setting("engine", DEFAULT_SETTINGS["engine"]),
        "scoring_rules": repo.get_setting("scoring_rules", DEFAULT_SETTINGS["scoring_rules"]),
    }


@router.put("/settings/{key}")
def update_setting(key: str, body: SettingIn,
                   db: Session = Depends(get_session)) -> dict:
    if key not in ("engine", "scoring_rules"):
        raise HTTPException(422, "Unknown settings key")
    repo = TaxonomyRepository(db)
    repo.set_setting(key, body.value)
    db.commit()
    return {"key": key, "value": body.value}
