"""Consistent SQLite backup + audit for SUECA PROSPECT RADAR.

Produces, under ``backups/``:
  * ``sueca_radar_pre_supabase_<TIMESTAMP>.db``  — a single, WAL-checkpointed,
    consistent copy of the live database (via the SQLite online-backup API, so
    it is safe even if the app is running).
  * ``prospects_backup_<TIMESTAMP>.csv``          — a flat CSV of the prospects
    table for eyeballing / spreadsheet import.

It also prints a row-count audit of every table — the source of truth we will
later compare Postgres against.

Run:  python scripts/backup_db.py
"""
from __future__ import annotations

import csv
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "backend" / "data" / "sueca.db"
BACKUP_DIR = ROOT / "backups"


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def table_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    return [r[0] for r in rows]


def audit_counts(conn: sqlite3.Connection) -> dict[str, int]:
    counts: dict[str, int] = {}
    for name in table_names(conn):
        counts[name] = conn.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
    return counts


def make_backup(ts: str) -> Path:
    BACKUP_DIR.mkdir(exist_ok=True)
    dest = BACKUP_DIR / f"sueca_radar_pre_supabase_{ts}.db"

    src = sqlite3.connect(DB_PATH)
    try:
        # Fold the WAL into the main db so the copy is fully self-contained.
        src.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        dst = sqlite3.connect(dest)
        try:
            src.backup(dst)  # online backup API — consistent snapshot
        finally:
            dst.close()
    finally:
        src.close()
    return dest


def export_prospects_csv(ts: str) -> tuple[Path, int]:
    dest = BACKUP_DIR / f"prospects_backup_{ts}.csv"
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM prospects ORDER BY id").fetchall()
        if not rows:
            dest.write_text("", encoding="utf-8")
            return dest, 0
        with dest.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            writer.writerow(rows[0].keys())
            for r in rows:
                writer.writerow([r[k] for k in r.keys()])
        return dest, len(rows)
    finally:
        conn.close()


def main() -> int:
    if not DB_PATH.exists():
        print(f"ERROR: database not found at {DB_PATH}", file=sys.stderr)
        return 1

    ts = _timestamp()
    size_kb = DB_PATH.stat().st_size / 1024

    conn = sqlite3.connect(DB_PATH)
    try:
        counts = audit_counts(conn)
    finally:
        conn.close()

    backup_path = make_backup(ts)
    csv_path, csv_rows = export_prospects_csv(ts)

    print("=" * 60)
    print("SUECA PROSPECT RADAR — BACKUP + AUDIT")
    print("=" * 60)
    print(f"Source DB : {DB_PATH}  ({size_kb:,.0f} KB live)")
    print(f"Backup    : {backup_path}  ({backup_path.stat().st_size / 1024:,.0f} KB)")
    print(f"CSV       : {csv_path}  ({csv_rows} prospects)")
    print("-" * 60)
    print("Row counts (source of truth for post-migration validation):")
    for name, n in counts.items():
        print(f"  {name:<20} {n:>8,}")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
