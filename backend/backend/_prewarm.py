"""Pre-warm the OSM territory cache for demo locations and preview the pipeline.

Usage: python _prewarm.py [Location1] [Location2] ...
Defaults to Cañuelas. Prints the real classified prospects so we can verify
discovery -> classify -> score end to end.
"""
import sys
import time

from database.db import SessionLocal
from repositories.cache_repository import CacheRepository
from repositories.taxonomy_repository import TaxonomyRepository
from scoring.rules import detect_signals
from scoring.scorer import score_prospect
from services.classifier import classify
from services.territory_service import get_or_fetch_pool

LOCATIONS = sys.argv[1:] or ["Cañuelas"]

db = SessionLocal()
trepo = TaxonomyRepository(db)
crepo = CacheRepository(db)
engine = trepo.get_setting("engine") or {}
radius = int(engine.get("radius_meters", 10000))
rules = trepo.get_setting("scoring_rules") or {}
industries = trepo.list_industries(active_only=False)

for name in LOCATIONS:
    loc = trepo.get_location_by_name(name)
    if not loc or loc.latitude is None:
        print(f"!! {name}: no coordinates, skipping")
        continue
    print(f"\n===== {name} (r={radius}m) =====")
    t = time.time()
    pool, cached = get_or_fetch_pool(
        crepo, location_name=name, lat=loc.latitude, lon=loc.longitude,
        radius=radius, refresh=False,
        on_cache_hit=lambda n: print(f"  cache HIT: {n} elements"),
        on_scan_start=lambda: print("  scanning OSM (one-time, may take ~1-2 min)..."),
        on_scan_done=lambda n: print(f"  scan done: {n} elements"),
    )
    db.commit()
    print(f"  fetched in {time.time()-t:.1f}s (from_cache={cached}), pool={len(pool)}")

    kept = 0
    by_ind = {}
    for raw in pool:
        key, conf = classify(raw, industries)
        if not key:
            continue
        kept += 1
        by_ind[key] = by_ind.get(key, 0) + 1
        ind = next(i for i in industries if i.key == key)
        sig = detect_signals(raw.name, raw.tags.get("description"), raw.tags, key,
                             has_phone=bool(raw.tags.get("phone") or raw.tags.get("contact:phone")),
                             has_website=bool(raw.tags.get("website") or raw.tags.get("contact:website")))
        res = score_prospect(industry_key=key, industry_label=ind.label,
                             base_weight=ind.base_weight, signals=sig, rules=rules)
        if kept <= 20:
            print(f"    [{res.score:3d} {res.priority:6s}] {raw.name[:38]:38s} | {key:18s}")
    print(f"  CLASSIFIED: {kept} real prospects  {by_ind}")

db.close()
