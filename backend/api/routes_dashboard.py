"""Dashboard + system status. Every number comes from the DB."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_session
from repositories.prospect_repository import ProspectRepository
from repositories.search_repository import SearchRepository
from repositories.taxonomy_repository import TaxonomyRepository
from services import run_control

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_session)) -> dict:
    prepo = ProspectRepository(db)
    srepo = SearchRepository(db)
    trepo = TaxonomyRepository(db)
    metrics = prepo.metrics()
    recent = srepo.list_runs(limit=5)
    active = run_control.active_run_ids()
    locations = trepo.list_locations(active_only=True)
    return {
        "metrics": metrics,
        "system_online": True,
        "active_runs": active,
        "active_territory": f"Zona 1 · {len(locations)} localidades",
        "recent_runs": [
            {
                "id": r.id, "location": r.location, "status": r.status,
                "new_companies": r.new_companies, "companies_found": r.companies_found,
                "started_at": r.started_at.isoformat() if r.started_at else None,
            }
            for r in recent
        ],
    }
