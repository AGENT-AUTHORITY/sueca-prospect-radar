"""Migrate SUECA PROSPECT RADAR data from SQLite to PostgreSQL / Supabase.

Reads every table from a SQLite database (the live DB or a backup, read-only)
and copies it into the Postgres database named by ``DATABASE_URL``, preserving
primary keys, foreign-key relationships and timestamps. It is idempotent —
re-running upserts by primary key instead of creating duplicates.

Usage
-----
    # Point the backend at Postgres first (backend/.env):
    #   DATABASE_URL=postgresql+psycopg://postgres.<ref>:<pw>@...pooler.supabase.com:5432/postgres

    python scripts/migrate_sqlite_to_postgres.py            # live DB -> Postgres
    python scripts/migrate_sqlite_to_postgres.py --source backups/<file>.db
    python scripts/migrate_sqlite_to_postgres.py --dry-run  # read source only, no target

The source database is NEVER modified.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))  # so `config`, `database`, `models` import

from sqlalchemy import create_engine, func, select, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

import config  # noqa: E402
from database.db import Base, engine as target_engine  # noqa: E402
from models.orm import (  # noqa: E402
    Industry,
    Location,
    OsmCache,
    Prospect,
    ProspectHistory,
    ProspectNote,
    ProspectSource,
    SearchEvent,
    SearchQuery,
    SearchRun,
    Setting,
)

# FK-safe insertion order: parents before children.
MIGRATION_ORDER = [
    Industry,
    Location,
    Setting,
    OsmCache,
    SearchRun,
    SearchQuery,
    SearchEvent,
    Prospect,
    ProspectSource,
    ProspectNote,
    ProspectHistory,
]

DEFAULT_SOURCE = BACKEND / "data" / "sueca.db"


def _row_to_dict(obj, model) -> dict:
    """Plain column values only — no relationship access (source may be closed)."""
    return {c.name: getattr(obj, c.name) for c in model.__table__.columns}


def _count(session: Session, model) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def _reset_sequences(target: Session) -> None:
    """After inserting explicit ``id`` values, advance Postgres sequences."""
    for model in MIGRATION_ORDER:
        pk = list(model.__table__.primary_key.columns)
        if len(pk) == 1 and pk[0].name == "id":
            table = model.__table__.name
            target.execute(
                text(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                    f"GREATEST(COALESCE(MAX(id), 0), 1), MAX(id) IS NOT NULL) "
                    f"FROM {table}"
                )
            )


def migrate(source_path: Path, dry_run: bool) -> int:
    if not source_path.exists():
        print(f"ERROR: source DB not found: {source_path}", file=sys.stderr)
        return 1

    source_engine = create_engine(
        f"sqlite:///{source_path}", connect_args={"check_same_thread": False}
    )

    print("=" * 66)
    print("SUECA PROSPECT RADAR — SQLite -> PostgreSQL migration")
    print("=" * 66)
    print(f"Source : {source_path}")
    print(f"Target : {config.DATABASE_URL.split('@')[-1] if '@' in config.DATABASE_URL else config.DATABASE_URL}")
    print(f"Mode   : {'DRY RUN (read only)' if dry_run else 'MIGRATE'}")
    print("-" * 66)

    if not dry_run and not config.DATABASE_URL.startswith("postgresql"):
        print(
            "REFUSING: DATABASE_URL is not Postgres. Set it to your Supabase "
            "connection string before migrating (see backend/.env.example).",
            file=sys.stderr,
        )
        return 2

    # Read every table's rows up-front so the source session can close cleanly.
    extracted: dict[str, list[dict]] = {}
    source_counts: dict[str, int] = {}
    with Session(source_engine) as src:
        for model in MIGRATION_ORDER:
            rows = src.execute(select(model)).scalars().all()
            extracted[model.__tablename__] = [_row_to_dict(r, model) for r in rows]
            source_counts[model.__tablename__] = len(rows)

    for name, n in source_counts.items():
        print(f"  read {name:<20} {n:>7,}")

    if dry_run:
        print("-" * 66)
        print("Dry run OK — nothing written. Re-run without --dry-run to migrate.")
        return 0

    # Full reload: drop + recreate so the Postgres schema matches the ORM
    # models exactly (e.g. BigInteger osm_id). This tool loads FROM SQLite; it
    # is a one-time/initial loader, not something to run against a live prod DB.
    Base.metadata.drop_all(bind=target_engine)
    Base.metadata.create_all(bind=target_engine)

    migrated: dict[str, int] = {}
    with Session(target_engine) as tgt:
        # One executemany per table — fast over a high-latency link, unlike the
        # thousands of round trips a row-by-row merge would need.
        for model in MIGRATION_ORDER:
            rows = extracted[model.__tablename__]
            if rows:
                tgt.execute(model.__table__.insert(), rows)
            migrated[model.__tablename__] = len(rows)
        _reset_sequences(tgt)
        tgt.commit()

    # ---- Validation: compare source vs target counts -----------------------
    print("-" * 66)
    print("Validation (source -> target):")
    ok = True
    with Session(target_engine) as tgt:
        for model in MIGRATION_ORDER:
            name = model.__tablename__
            s = source_counts[name]
            t = _count(tgt, model)
            flag = "OK " if s == t else "MISMATCH"
            if s != t:
                ok = False
            print(f"  {flag} {name:<20} {s:>7,} -> {t:>7,}")

    print("=" * 66)
    print("Summary:")
    print(f"  Prospects migrated : {migrated.get('prospects', 0)}")
    print(f"  Sources migrated   : {migrated.get('prospect_sources', 0)}")
    print(f"  Notes migrated     : {migrated.get('prospect_notes', 0)}")
    print(f"  History migrated   : {migrated.get('prospect_history', 0)}")
    print(f"  Search runs        : {migrated.get('search_runs', 0)}")
    print(f"  Search events      : {migrated.get('search_events', 0)}")
    print(f"  Validation         : {'PASS' if ok else 'FAIL'}")
    print("=" * 66)
    return 0 if ok else 3


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate SQLite -> Postgres/Supabase")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE,
                        help="path to source SQLite DB (default: live backend/data/sueca.db)")
    parser.add_argument("--dry-run", action="store_true",
                        help="read source and report counts without writing to Postgres")
    args = parser.parse_args()
    return migrate(args.source.resolve(), args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
