"""The prospecting engine: orchestrates a search run end to end.

SEARCH → DISCOVER (Overpass) → CLASSIFY → DEDUP → SCORE → VOLVO APP → SAVE,
emitting a real event at every real step. Runs in a background thread with its
own DB session. STOP is checked cooperatively between queries and companies.

Nothing here is faked: every emitted line corresponds to something that
actually happened, and every saved prospect is a real OSM business.
"""
from __future__ import annotations

import logging
import threading
import time

from config import DEFAULT_RESULT_LIMIT, LOGS_DIR
from database.db import SessionLocal
from database.seed_data import DEFAULT_SETTINGS
from models.orm import Prospect
from providers.base import ProviderError, RawElement
from providers.maps_provider import google_maps_url
from providers.search_provider import OverpassSearchProvider
from providers.website_provider import extract_address, extract_contacts
from repositories.cache_repository import CacheRepository
from repositories.prospect_repository import ProspectRepository
from repositories.search_repository import SearchRepository
from repositories.taxonomy_repository import TaxonomyRepository
from scoring.scorer import evaluate
from services import run_control, territory_service
from services.classifier import classify
from services.dedup_service import DedupService
from services.query_generator import generate_queries
from utils import normalize_name

logger = logging.getLogger("prospecting")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    _fh = logging.FileHandler(LOGS_DIR / "prospecting.log", encoding="utf-8")
    _fh.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
    logger.addHandler(_fh)

REVEAL_DELAY_SECONDS = 0.35
MICRO_DELAY_SECONDS = 0.05


def launch(*, run_id: int, lat: float, lon: float, radius: int,
           industry_keys: list[str], max_results: int, location_name: str,
           refresh: bool = False) -> None:
    """Register the run and start the worker thread."""
    run_control.register(run_id)
    thread = threading.Thread(
        target=execute_run,
        kwargs=dict(run_id=run_id, lat=lat, lon=lon, radius=radius,
                    industry_keys=industry_keys, max_results=max_results,
                    location_name=location_name, refresh=refresh),
        daemon=True,
        name=f"prospecting-run-{run_id}",
    )
    thread.start()


def execute_run(*, run_id: int, lat: float, lon: float, radius: int,
                industry_keys: list[str], max_results: int,
                location_name: str, refresh: bool = False) -> None:
    db = SessionLocal()
    srepo = SearchRepository(db)
    prepo = ProspectRepository(db)
    trepo = TaxonomyRepository(db)
    crepo = CacheRepository(db)
    dedup = DedupService(prepo)
    provider = OverpassSearchProvider()

    engine_cfg = trepo.get_setting("engine", DEFAULT_SETTINGS["engine"]) or {}
    scoring_rules = trepo.get_setting("scoring_rules", DEFAULT_SETTINGS["scoring_rules"]) or {}
    max_results = max_results or int(engine_cfg.get("result_limit", DEFAULT_RESULT_LIMIT))

    industries = trepo.get_industries_by_keys(industry_keys)
    industry_by_key = {i.key: i for i in industries}
    run = srepo.get_run(run_id)

    seen_osm: set[tuple] = set()
    total = new = dups = errs = 0

    def emit(type_: str, message: str, level: str = "info",
             payload: dict | None = None, prospect_id: int | None = None) -> None:
        srepo.add_event(run_id, type_, message, level, payload, prospect_id)
        db.commit()
        logger.info("run=%s %s | %s", run_id, type_, message)

    try:
        emit("SEARCH_STARTED",
             f"Prospecting {len(industries)} industry group(s) around {location_name}...",
             payload={"location": location_name, "radius": radius})

        # --- One-time (cached) territory scan against real OSM data ---------
        try:
            pool, from_cache = territory_service.get_or_fetch_pool(
                crepo, location_name=location_name, lat=lat, lon=lon,
                radius=radius, refresh=refresh, provider=provider,
                on_cache_hit=lambda n: emit(
                    "TERRITORY_LOADED", f"Territory ready — {n} businesses mapped in zone.",
                    payload={"count": n, "cached": True}),
                on_scan_start=lambda: emit(
                    "TERRITORY_SCAN", f"Scanning {location_name} territory on OpenStreetMap...",
                    payload={"radius": radius}),
                on_scan_done=lambda n: emit(
                    "TERRITORY_SCAN", f"Territory scan complete — {n} businesses mapped.",
                    payload={"count": n, "cached": False}),
            )
            db.commit()
        except ProviderError as exc:
            errs += 1
            run.errors = errs
            srepo.finish_run(run, "error")
            emit("ERROR", f"Territory data unavailable: {exc}", level="error")
            db.commit()
            return

        queries = generate_queries(location_name, industries)
        run.queries_generated = len(queries)
        db.commit()

        for gq in queries:
            if run_control.should_stop(run_id) or total >= max_results:
                break
            sq = srepo.add_query(run_id, gq.query_text, gq.industry_key, location_name)
            db.commit()
            emit("QUERY_STARTED", f"Analyzing {gq.industry_label.lower()}...",
                 payload={"query": gq.query_text, "industry": gq.industry_key})
            time.sleep(MICRO_DELAY_SECONDS * 4)

            q_kept = 0
            for raw in pool:
                if run_control.should_stop(run_id) or total >= max_results:
                    break
                osm_key = (raw.osm_type, raw.osm_id)
                if osm_key in seen_osm:
                    continue

                industry_key, _conf = classify(raw, industries)
                if industry_key != gq.industry_key:
                    continue  # handled by its own industry pass
                seen_osm.add(osm_key)

                total += 1
                q_kept += 1
                emit("COMPANY_FOUND", f"{raw.name} detected",
                     payload={"name": raw.name})
                time.sleep(MICRO_DELAY_SECONDS)

                candidate = _build_prospect(raw, industry_by_key.get(industry_key),
                                            gq.query_text)

                existing = dedup.find_existing(candidate)
                if existing:
                    dups += 1
                    prepo.add_source(existing.id, candidate.source, candidate.source_url,
                                     gq.query_text, run_id)
                    emit("COMPANY_DUPLICATE", f"{raw.name} already tracked",
                         payload={"name": raw.name}, prospect_id=existing.id)
                    db.commit()
                    time.sleep(REVEAL_DELAY_SECONDS)
                    continue

                new += _enrich_score_save(
                    db, prepo, emit, candidate, raw,
                    industry_by_key.get(industry_key), scoring_rules, run_id, gq.query_text,
                )
                time.sleep(REVEAL_DELAY_SECONDS)

            srepo.finish_query(sq, "completed", q_kept)
            run.queries_completed += 1
            run.companies_found = total
            run.new_companies = new
            run.duplicates = dups
            run.errors = errs
            db.commit()

        stopped = run_control.should_stop(run_id)
        run.companies_found, run.new_companies = total, new
        run.duplicates, run.errors = dups, errs
        if stopped:
            srepo.finish_run(run, "stopped")
            emit("SEARCH_STOPPED", "Search stopped by user.",
                 payload={"new": new, "duplicates": dups})
        else:
            srepo.finish_run(run, "completed")
            emit("SEARCH_FINISHED",
                 f"Search complete — {new} new prospect(s), {dups} duplicate(s).",
                 payload={"new": new, "duplicates": dups, "errors": errs})
        db.commit()
    except Exception as exc:  # noqa: BLE001 - top-level worker guard
        logger.exception("run=%s crashed", run_id)
        try:
            run.errors = errs + 1
            srepo.finish_run(run, "error")
            emit("ERROR", f"Search failed: {exc}", level="error")
            db.commit()
        except Exception:
            db.rollback()
    finally:
        run_control.finish(run_id)
        db.close()


def _build_prospect(raw: RawElement, industry, query_text: str) -> Prospect:
    contacts = extract_contacts(raw.tags)
    address = extract_address(raw.tags)
    operator = (raw.tags.get("operator") or "").strip()
    brand = raw.tags.get("brand")

    # For fuel stations the `operator` is the real business entity (the actual
    # fleet/logistics prospect) behind a branded forecourt — prefer it as the
    # company name so distinct operators are not collapsed into one brand.
    company_name = raw.name
    description = raw.tags.get("description") or None
    if raw.tags.get("amenity") == "fuel" and operator and operator.lower() != raw.name.lower():
        company_name = operator
        description = description or (f"{brand} service station" if brand else raw.name)

    return Prospect(
        company_name=company_name,
        normalized_name=normalize_name(company_name),
        osm_type=raw.osm_type,
        osm_id=raw.osm_id,
        industry=industry.key if industry else None,
        subindustry=raw.tags.get("industrial") or raw.tags.get("shop")
        or raw.tags.get("craft") or raw.tags.get("office") or brand,
        description=description,
        address=address["address"],
        city=address["city"] or None,
        province=address["province"],
        country=address["country"] or "Argentina",
        latitude=raw.latitude,
        longitude=raw.longitude,
        phone=contacts["phone"],
        whatsapp=contacts["whatsapp"],
        email=contacts["email"],
        website=contacts["website"],
        website_domain=contacts["website_domain"],
        google_maps_url=google_maps_url(raw.latitude, raw.longitude, raw.name),
        linkedin_url=contacts["linkedin_url"],
        instagram_url=contacts["instagram_url"],
        facebook_url=contacts["facebook_url"],
        source=raw.source,
        source_url=raw.source_url,
        search_query=query_text,
        osm_tags=raw.tags,
        status="NEW",
    )


def _enrich_score_save(db, prepo, emit, candidate: Prospect, raw: RawElement,
                       industry, scoring_rules: dict, run_id: int,
                       query_text: str) -> int:
    emit("ENRICHMENT_STARTED", "Collecting public business data...",
         payload={"name": candidate.company_name})
    time.sleep(MICRO_DELAY_SECONDS)

    if candidate.website:
        emit("WEBSITE_FOUND", "Website detected", payload={"website": candidate.website})
        time.sleep(MICRO_DELAY_SECONDS)
    if candidate.phone:
        emit("PHONE_FOUND", "Phone number detected", payload={"phone": candidate.phone})
        time.sleep(MICRO_DELAY_SECONDS)

    contacts = {
        "website": candidate.website, "phone": candidate.phone,
        "email": candidate.email, "linkedin_url": candidate.linkedin_url,
    }
    ev = evaluate(
        industry_key=industry.key if industry else None,
        name=candidate.company_name, description=candidate.description,
        tags=raw.tags, contacts=contacts, has_coords=candidate.latitude is not None,
    )

    if ev.signals.get("truck_signal"):
        kws = ", ".join(ev.signals.get("truck_keywords", [])[:3])
        emit("TRUCK_SIGNAL_FOUND", f"Heavy-truck signal detected ({kws})",
             payload={"keywords": ev.signals.get("truck_keywords")})
        time.sleep(MICRO_DELAY_SECONDS)
    if ev.fleet_signal:
        emit("FLEET_SIGNAL_FOUND", "Fleet signal detected",
             payload={"name": candidate.company_name})
        time.sleep(MICRO_DELAY_SECONDS)
    if ev.components.get("operation", 0) > 0:
        emit("OPERATION_SIGNAL_FOUND", "Operation signals detected",
             payload={"operation_score": ev.components["operation"]})
        time.sleep(MICRO_DELAY_SECONDS)

    candidate.score = ev.score
    candidate.priority = ev.priority
    candidate.score_breakdown = ev.breakdown
    candidate.data_confidence = ev.data_confidence
    candidate.signals = ev.signals
    candidate.fleet_signal = ev.fleet_signal
    if ev.subcategory:
        candidate.subindustry = ev.industry_fit_label

    emit("SCORE_CALCULATED",
         f"{ev.score} / 100 — {ev.priority} PRIORITY",
         payload={"score": ev.score, "priority": ev.priority,
                  "data_confidence": ev.data_confidence})
    time.sleep(MICRO_DELAY_SECONDS)

    candidate.volvo_family = ev.volvo_family
    candidate.potential_truck_application = ev.volvo_label
    candidate.truck_application_notes = ev.volvo_reason
    candidate.commercial_reason = ev.volvo_reason
    emit("VOLVO_APPLICATION_CALCULATED",
         f"Potential Volvo application: {ev.volvo_family}",
         payload={"family": ev.volvo_family, "label": ev.volvo_label})
    time.sleep(MICRO_DELAY_SECONDS)

    prepo.add(candidate)
    prepo.add_source(candidate.id, candidate.source, candidate.source_url,
                     query_text, run_id)
    prepo.add_history(candidate.id, "created", None, "NEW", "Discovered via prospecting")
    db.commit()

    emit("COMPANY_SAVED", f"Prospect added — {candidate.company_name}",
         payload={
             "name": candidate.company_name,
             "score": candidate.score, "priority": candidate.priority,
             "industry": candidate.industry, "city": candidate.city,
             "volvo_family": candidate.volvo_family,
             "lat": candidate.latitude, "lon": candidate.longitude,
         },
         prospect_id=candidate.id)
    return 1
