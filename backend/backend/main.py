"""SUECA PROSPECT RADAR — FastAPI application entrypoint.

Run:  uvicorn main:app --reload --port 8000
The DB is created and seeded on startup, so a fresh clone works immediately.
"""
from __future__ import annotations

import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

import config
from api import (
    routes_auth,
    routes_dashboard,
    routes_prospects,
    routes_search,
    routes_taxonomy,
)
from api.auth_dep import require_auth
from database.init_db import init_db

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Sueca Prospect Radar API", version="1.0.0")

# Signed session cookie powers the single-user access gate. Added before CORS
# so CORS stays the outermost middleware (handles preflight first).
app.add_middleware(
    SessionMiddleware,
    secret_key=config.SESSION_SECRET,
    same_site=config.SESSION_SAME_SITE,
    https_only=config.SESSION_HTTPS_ONLY,
    max_age=config.SESSION_MAX_AGE,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    """Open endpoint so the frontend can show real backend status pre-login."""
    return {"status": "ok", "service": "sueca-prospect-radar"}


# Open: login / logout / session.
app.include_router(routes_auth.router)

# Private: everything else requires a valid session.
_guard = [Depends(require_auth)]
app.include_router(routes_dashboard.router, dependencies=_guard)
app.include_router(routes_prospects.router, dependencies=_guard)
app.include_router(routes_search.router, dependencies=_guard)
app.include_router(routes_taxonomy.router, dependencies=_guard)
