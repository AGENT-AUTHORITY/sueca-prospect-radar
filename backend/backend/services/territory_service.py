"""Scan a territory once from OpenStreetMap, then reuse the cached pool.

The public Overpass API is slow for wide area queries, so we pay that cost
once per territory and cache the real result. Prospecting classifies from the
cache instantly — the data is real OSM data, just not re-fetched on every run
(exactly what the spec asks: don't repeat the same search without need).
"""
from __future__ import annotations

from collections.abc import Callable

from database.seed_data import TERRITORY_SCAN_SELECTORS
from providers.base import ProviderError, RawElement
from providers.search_provider import OverpassSearchProvider
from repositories.cache_repository import CacheRepository


def _to_dict(el: RawElement) -> dict:
    return {
        "name": el.name, "osm_type": el.osm_type, "osm_id": el.osm_id,
        "latitude": el.latitude, "longitude": el.longitude,
        "tags": el.tags, "source": el.source, "source_url": el.source_url,
    }


def _from_dict(d: dict) -> RawElement:
    return RawElement(
        name=d["name"], osm_type=d.get("osm_type"), osm_id=d.get("osm_id"),
        latitude=d.get("latitude"), longitude=d.get("longitude"),
        tags=d.get("tags") or {}, source=d.get("source", "openstreetmap"),
        source_url=d.get("source_url"),
    )


def get_or_fetch_pool(
    cache_repo: CacheRepository, *, location_name: str, lat: float, lon: float,
    radius: int, refresh: bool = False,
    provider: OverpassSearchProvider | None = None,
    on_cache_hit: Callable[[int], None] | None = None,
    on_scan_start: Callable[[], None] | None = None,
    on_scan_done: Callable[[int], None] | None = None,
) -> tuple[list[RawElement], bool]:
    """Return (pool, from_cache). Raises ProviderError only on a live-fetch miss."""
    if not refresh:
        cached = cache_repo.get(location_name, radius)
        if cached and cached.elements:
            if on_cache_hit:
                on_cache_hit(cached.element_count)
            return [_from_dict(d) for d in cached.elements], True

    if on_scan_start:
        on_scan_start()
    provider = provider or OverpassSearchProvider()
    try:
        elements = provider.discover(lat, lon, radius, TERRITORY_SCAN_SELECTORS, limit=250)
    except ProviderError:
        # Fall back to any stale cache before giving up.
        cached = cache_repo.get(location_name, radius)
        if cached and cached.elements:
            if on_cache_hit:
                on_cache_hit(cached.element_count)
            return [_from_dict(d) for d in cached.elements], True
        raise

    cache_repo.upsert(location_name, lat, lon, radius, [_to_dict(e) for e in elements])
    if on_scan_done:
        on_scan_done(len(elements))
    return elements, False
