"""Search runs: start, stop, history, and the live SSE event stream."""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from config import DEFAULT_RADIUS_METERS, DEFAULT_RESULT_LIMIT, MAX_RESULTS_PER_RUN
from database.db import SessionLocal, get_session
from database.seed_data import DEFAULT_SETTINGS
from models.schemas import SearchEventOut, SearchRunOut, StartSearchIn
from providers.base import ProviderError
from providers.geocoding_provider import NominatimGeocoder
from repositories.search_repository import SearchRepository
from repositories.taxonomy_repository import TaxonomyRepository
from services import prospecting_service, run_control

router = APIRouter(prefix="/api/search", tags=["search"])

_TERMINAL = {"completed", "stopped", "error"}


@router.post("/start")
def start_search(body: StartSearchIn, db: Session = Depends(get_session)) -> dict:
    if run_control.has_active():
        raise HTTPException(409, "A search is already running. Stop it before starting another.")
    if not body.industries:
        raise HTTPException(422, "Select at least one industry.")

    trepo = TaxonomyRepository(db)
    industries = trepo.get_industries_by_keys(body.industries)
    if not industries:
        raise HTTPException(422, "None of the selected industries exist.")

    lat, lon = body.latitude, body.longitude
    if lat is None or lon is None:
        loc = trepo.get_location_by_name(body.location)
        if loc and loc.latitude is not None:
            lat, lon = loc.latitude, loc.longitude
        else:
            try:
                geo = NominatimGeocoder().geocode(body.location)
            except ProviderError as exc:
                raise HTTPException(502, str(exc)) from exc
            if not geo:
                raise HTTPException(422, f"Could not locate '{body.location}'.")
            lat, lon = geo["lat"], geo["lon"]
            if not loc:
                trepo.add_location(body.location, "Buenos Aires", "Argentina", lat, lon)
                db.commit()

    engine_cfg = trepo.get_setting("engine", DEFAULT_SETTINGS["engine"]) or {}
    radius = body.radius or int(engine_cfg.get("radius_meters", DEFAULT_RADIUS_METERS))
    max_results = body.max_results or int(engine_cfg.get("result_limit", DEFAULT_RESULT_LIMIT))
    # Public-demo hard cap so a shared link can't launch an oversized run.
    max_results = min(max_results, MAX_RESULTS_PER_RUN)

    srepo = SearchRepository(db)
    run = srepo.create_run(
        territory=body.territory, location=body.location, radius=radius,
        industries=body.industries, max_results=max_results,
    )
    db.commit()
    run_id = run.id

    prospecting_service.launch(
        run_id=run_id, lat=lat, lon=lon, radius=radius,
        industry_keys=[i.key for i in industries], max_results=max_results,
        location_name=body.location, refresh=body.refresh,
    )
    return {"run_id": run_id, "location": body.location, "radius": radius,
            "industries": [i.key for i in industries], "status": "processing"}


@router.post("/runs/{run_id}/stop")
def stop_search(run_id: int) -> dict:
    stopped = run_control.request_stop(run_id)
    if not stopped:
        raise HTTPException(404, "No active run with that id.")
    return {"run_id": run_id, "stopping": True}


@router.get("/runs", response_model=list[SearchRunOut])
def list_runs(db: Session = Depends(get_session)) -> list[SearchRunOut]:
    srepo = SearchRepository(db)
    return [SearchRunOut.model_validate(r) for r in srepo.list_runs(limit=100)]


@router.get("/runs/{run_id}", response_model=SearchRunOut)
def get_run(run_id: int, db: Session = Depends(get_session)) -> SearchRunOut:
    srepo = SearchRepository(db)
    run = srepo.get_run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return SearchRunOut.model_validate(run)


@router.get("/runs/{run_id}/events", response_model=list[SearchEventOut])
def run_events(run_id: int, after_id: int = 0,
               db: Session = Depends(get_session)) -> list[SearchEventOut]:
    srepo = SearchRepository(db)
    if not srepo.get_run(run_id):
        raise HTTPException(404, "Run not found")
    return [SearchEventOut.model_validate(e) for e in srepo.list_events(run_id, after_id)]


@router.get("/runs/{run_id}/stream")
async def stream_events(run_id: int, after_id: int = 0) -> EventSourceResponse:
    """Live Commercial Intelligence feed via Server-Sent Events.

    Polls the DB (source of truth) so every streamed line is a persisted,
    real event — nothing is invented in the transport layer.
    """
    with SessionLocal() as check:
        if not SearchRepository(check).get_run(run_id):
            raise HTTPException(404, "Run not found")

    async def event_generator():
        last_id = after_id
        idle_polls = 0
        while True:
            with SessionLocal() as db:
                srepo = SearchRepository(db)
                events = srepo.list_events(run_id, last_id)
                run = srepo.get_run(run_id)
                status = run.status if run else "error"
            for ev in events:
                last_id = ev.id
                yield {
                    "event": ev.type,
                    "id": str(ev.id),
                    "data": json.dumps(SearchEventOut.model_validate(ev).model_dump(mode="json")),
                }
            if status in _TERMINAL and not events:
                idle_polls += 1
                if idle_polls >= 2:  # give late events a chance to flush
                    yield {"event": "STREAM_END", "data": json.dumps({"status": status})}
                    break
            else:
                idle_polls = 0
            await asyncio.sleep(0.6)

    return EventSourceResponse(event_generator())
