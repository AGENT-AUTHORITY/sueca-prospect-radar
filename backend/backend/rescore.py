"""Re-score all existing prospects with the current Volvo scoring engine.

- Backfills `osm_tags` from the cached territory scan (matched by OSM id).
- Recomputes score, priority, data confidence, signals, breakdown and Volvo
  application for every prospect.
- Prints an old-vs-new diagnostic table.

Usage:  python rescore.py
"""
from __future__ import annotations

from database.db import SessionLocal
from database.init_db import init_db
from models.orm import OsmCache, Prospect
from scoring.scorer import evaluate


def _cache_index(db) -> dict:
    index: dict[tuple, dict] = {}
    for row in db.query(OsmCache).all():
        for el in row.elements or []:
            key = (el.get("osm_type"), el.get("osm_id"))
            if key[0] and key[1] is not None:
                index[key] = el.get("tags") or {}
    return index


def rescore() -> None:
    init_db()  # ensure migrated columns exist
    with SessionLocal() as db:
        cache = _cache_index(db)
        prospects = db.query(Prospect).all()
        print(f"Re-scoring {len(prospects)} prospects...\n")
        print(f"{'Company':30s} {'Industry':14s} {'Old':>4s} {'New':>4s} {'Prio':7s} {'Volvo':4s}  Signals")
        print("-" * 110)

        changed = 0
        for p in prospects:
            tags = p.osm_tags or cache.get((p.osm_type, p.osm_id))
            if tags is None:
                tags = _tags_from_fields(p)
            if p.osm_tags is None:
                p.osm_tags = tags

            contacts = {
                "website": p.website, "phone": p.phone,
                "email": p.email, "linkedin_url": p.linkedin_url,
            }
            ev = evaluate(
                industry_key=p.industry, name=p.company_name,
                description=p.description, tags=tags, contacts=contacts,
                has_coords=p.latitude is not None,
            )
            old = p.score
            p.score = ev.score
            p.priority = ev.priority
            p.data_confidence = ev.data_confidence
            p.score_breakdown = ev.breakdown
            p.signals = ev.signals
            p.fleet_signal = ev.fleet_signal
            p.volvo_family = ev.volvo_family
            p.potential_truck_application = ev.volvo_label
            p.truck_application_notes = ev.volvo_reason
            p.commercial_reason = ev.volvo_reason
            if ev.industry_fit_label:
                p.subindustry = ev.industry_fit_label
            if old != ev.score:
                changed += 1

            pos = [b["reason"] for b in ev.breakdown if b["points"] > 0][:2]
            neg = [b["reason"] for b in ev.breakdown if b["points"] < 0][:1]
            sig = " | ".join(pos + [f"(−){n}" for n in neg])
            print(f"{p.company_name[:30]:30s} {(p.industry or '-'):14s} "
                  f"{old:>4d} {ev.score:>4d} {ev.priority:7s} {ev.volvo_family or '-':4s}  {sig[:52]}")

        db.commit()
        _summary(db)
        print(f"\n{changed}/{len(prospects)} prospects changed score.")


def _tags_from_fields(p: Prospect) -> dict:
    tags: dict = {}
    if p.industry == "combustible":
        tags["amenity"] = "fuel"
    if p.description:
        tags["description"] = p.description
    return tags


def _summary(db) -> None:
    from collections import Counter
    prospects = db.query(Prospect).all()
    prio = Counter(p.priority for p in prospects)
    volvo = Counter(p.volvo_family for p in prospects if p.volvo_family)
    print("\n--- SUMMARY ---")
    print("Priority:", dict(prio))
    print("Volvo fit:", dict(volvo))


if __name__ == "__main__":
    rescore()
