"""Prospect list, profile, notes, status changes, map data, and CSV export."""
from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.db import get_session
from models.orm import PIPELINE_STATUSES
from models.schemas import (
    HistoryOut,
    NoteIn,
    NoteOut,
    ProspectOut,
    ProspectPatch,
    StatusChangeIn,
)
from repositories.prospect_repository import ProspectRepository

router = APIRouter(prefix="/api/prospects", tags=["prospects"])


@router.get("")
def list_prospects(
    db: Session = Depends(get_session),
    search: str | None = None,
    province: str | None = None,
    city: str | None = None,
    industry: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    min_score: int | None = None,
    has_phone: bool | None = None,
    has_website: bool | None = None,
    fleet_signal: bool | None = None,
    sort: str = "score",
    order: str = "desc",
    limit: int = Query(50, le=500),
    offset: int = 0,
) -> dict:
    repo = ProspectRepository(db)
    items, total = repo.query(
        search=search, province=province, city=city, industry=industry,
        priority=priority, status=status, min_score=min_score,
        has_phone=has_phone, has_website=has_website, fleet_signal=fleet_signal,
        sort=sort, order=order, limit=limit, offset=offset,
    )
    return {
        "total": total,
        "items": [ProspectOut.model_validate(p).model_dump(mode="json") for p in items],
    }


@router.get("/map")
def map_points(db: Session = Depends(get_session)) -> list[dict]:
    repo = ProspectRepository(db)
    return [
        {
            "id": p.id, "company_name": p.company_name, "industry": p.industry,
            "city": p.city, "score": p.score, "priority": p.priority,
            "status": p.status, "volvo_family": p.volvo_family,
            "lat": p.latitude, "lon": p.longitude,
        }
        for p in repo.all_with_coords()
    ]


@router.get("/statuses")
def statuses() -> list[str]:
    return PIPELINE_STATUSES


@router.get("/export.csv")
def export_csv(
    db: Session = Depends(get_session),
    search: str | None = None, province: str | None = None, city: str | None = None,
    industry: str | None = None, priority: str | None = None, status: str | None = None,
    min_score: int | None = None, has_phone: bool | None = None,
    has_website: bool | None = None, fleet_signal: bool | None = None,
) -> StreamingResponse:
    repo = ProspectRepository(db)
    items, _ = repo.query(
        search=search, province=province, city=city, industry=industry,
        priority=priority, status=status, min_score=min_score, has_phone=has_phone,
        has_website=has_website, fleet_signal=fleet_signal, limit=5000, offset=0,
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "company", "industry", "city", "province", "phone", "email", "website",
        "linkedin", "score", "priority", "status", "potential_volvo", "notes",
    ])
    for p in items:
        writer.writerow([
            p.company_name, p.industry or "", p.city or "", p.province or "",
            p.phone or "", p.email or "", p.website or "", p.linkedin_url or "",
            p.score, p.priority, p.status, p.potential_truck_application or "",
            (p.commercial_reason or "").replace("\n", " "),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sueca_prospects.csv"},
    )


@router.get("/{prospect_id}", response_model=ProspectOut)
def get_prospect(prospect_id: int, db: Session = Depends(get_session)) -> ProspectOut:
    repo = ProspectRepository(db)
    p = repo.get(prospect_id)
    if not p:
        raise HTTPException(404, "Prospect not found")
    return ProspectOut.model_validate(p)


@router.patch("/{prospect_id}", response_model=ProspectOut)
def update_prospect(prospect_id: int, patch: ProspectPatch,
                    db: Session = Depends(get_session)) -> ProspectOut:
    repo = ProspectRepository(db)
    p = repo.get(prospect_id)
    if not p:
        raise HTTPException(404, "Prospect not found")
    data = patch.model_dump(exclude_unset=True)
    if "status" in data and data["status"] and data["status"] != p.status:
        repo.set_status(p, data.pop("status"), "Manual update")
    for field, value in data.items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return ProspectOut.model_validate(p)


@router.post("/{prospect_id}/status", response_model=ProspectOut)
def change_status(prospect_id: int, body: StatusChangeIn,
                  db: Session = Depends(get_session)) -> ProspectOut:
    if body.status not in PIPELINE_STATUSES:
        raise HTTPException(422, f"Invalid status: {body.status}")
    repo = ProspectRepository(db)
    p = repo.get(prospect_id)
    if not p:
        raise HTTPException(404, "Prospect not found")
    repo.set_status(p, body.status, body.note)
    db.commit()
    db.refresh(p)
    return ProspectOut.model_validate(p)


@router.get("/{prospect_id}/notes", response_model=list[NoteOut])
def list_notes(prospect_id: int, db: Session = Depends(get_session)) -> list[NoteOut]:
    repo = ProspectRepository(db)
    if not repo.get(prospect_id):
        raise HTTPException(404, "Prospect not found")
    return [NoteOut.model_validate(n) for n in repo.list_notes(prospect_id)]


@router.post("/{prospect_id}/notes", response_model=NoteOut)
def add_note(prospect_id: int, body: NoteIn,
             db: Session = Depends(get_session)) -> NoteOut:
    repo = ProspectRepository(db)
    if not repo.get(prospect_id):
        raise HTTPException(404, "Prospect not found")
    note = repo.add_note(prospect_id, body.body, body.author)
    db.commit()
    db.refresh(note)
    return NoteOut.model_validate(note)


@router.get("/{prospect_id}/history", response_model=list[HistoryOut])
def list_history(prospect_id: int, db: Session = Depends(get_session)) -> list[HistoryOut]:
    repo = ProspectRepository(db)
    if not repo.get(prospect_id):
        raise HTTPException(404, "Prospect not found")
    return [HistoryOut.model_validate(h) for h in repo.list_history(prospect_id)]
