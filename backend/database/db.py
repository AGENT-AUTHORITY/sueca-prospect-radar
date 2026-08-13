"""SQLAlchemy engine + session factory.

This is the single seam between the app and the storage engine. Swapping
SQLite for PostgreSQL/Supabase later means changing only DATABASE_URL and the
`connect_args` below — the repositories and services never import this module's
internals, they receive a `Session`.
"""
from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import DATABASE_URL

_is_sqlite = DATABASE_URL.startswith("sqlite")
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

# On Postgres (Supabase pooler) idle connections get recycled server-side, so
# validate them before use and don't keep any single one for too long.
_engine_kwargs: dict = {"connect_args": _connect_args, "future": True}
if not _is_sqlite:
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_recycle"] = 1800

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # noqa: ANN001
        # WAL lets the SSE reader poll events while the worker thread writes.
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_session() -> Iterator[Session]:
    """FastAPI dependency that yields a scoped session and always closes it."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
