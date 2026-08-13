"""Data access for search runs, queries, and events."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from models.orm import SearchEvent, SearchQuery, SearchRun


class SearchRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_run(self, *, territory: str | None, location: str, radius: int,
                   industries: list[str], max_results: int) -> SearchRun:
        run = SearchRun(
            territory=territory, location=location, radius=radius,
            industries=industries, max_results=max_results, status="processing",
        )
        self.db.add(run)
        self.db.flush()
        return run

    def get_run(self, run_id: int) -> SearchRun | None:
        return self.db.get(SearchRun, run_id)

    def list_runs(self, limit: int = 50) -> list[SearchRun]:
        return list(self.db.scalars(
            select(SearchRun).order_by(SearchRun.started_at.desc()).limit(limit)
        ))

    def add_query(self, run_id: int, query_text: str, industry: str,
                  location: str) -> SearchQuery:
        q = SearchQuery(
            run_id=run_id, query_text=query_text, industry=industry,
            location=location, status="queued",
        )
        self.db.add(q)
        self.db.flush()
        return q

    def finish_query(self, query: SearchQuery, status: str, results_count: int) -> None:
        query.status = status
        query.results_count = results_count
        query.finished_at = datetime.now(timezone.utc)

    def add_event(self, run_id: int, type_: str, message: str, level: str = "info",
                  payload: dict | None = None, prospect_id: int | None = None) -> SearchEvent:
        ev = SearchEvent(
            run_id=run_id, type=type_, message=message, level=level,
            payload=payload, prospect_id=prospect_id,
        )
        self.db.add(ev)
        self.db.flush()
        return ev

    def list_events(self, run_id: int, after_id: int = 0) -> list[SearchEvent]:
        return list(self.db.scalars(
            select(SearchEvent)
            .where(SearchEvent.run_id == run_id, SearchEvent.id > after_id)
            .order_by(SearchEvent.id.asc())
        ))

    def finish_run(self, run: SearchRun, status: str) -> None:
        run.status = status
        run.finished_at = datetime.now(timezone.utc)
