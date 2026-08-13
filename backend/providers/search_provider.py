"""Company discovery via the OpenStreetMap Overpass API (free, public, no key).

Returns REAL businesses (name, phone, website, address, coordinates) around a
point. No scraping of protected sites, no CAPTCHA/anti-bot evasion — this is
the public OSM dataset queried through its documented API.

Selectors are structured dicts (see database/seed_data.py) so the exact same
definition builds the query here and classifies the result in the classifier.
"""
from __future__ import annotations

import logging

import httpx

from config import (
    OVERPASS_FALLBACK_URLS,
    OVERPASS_TIMEOUT_SECONDS,
    OVERPASS_URL,
    USER_AGENT,
)
from providers.base import ProviderError, RawElement

logger = logging.getLogger("providers.search")


def selector_to_fragment(sel: dict) -> str:
    k = sel["k"]
    if "v" in sel:
        base = f'["{k}"="{sel["v"]}"]'
    elif "regex" in sel:
        base = f'["{k}"~"{sel["regex"]}"]'
    else:
        base = f'["{k}"]'
    if sel.get("named"):
        base += '["name"]'
    return base


def build_overpass_query(lat: float, lon: float, radius_m: int,
                         selectors: list[dict], limit: int) -> str:
    parts = []
    for sel in selectors:
        frag = selector_to_fragment(sel)
        parts.append(f"  nwr(around:{radius_m},{lat},{lon}){frag};")
    body = "\n".join(parts)
    timeout = int(OVERPASS_TIMEOUT_SECONDS)
    return f"[out:json][timeout:{timeout}];\n(\n{body}\n);\nout center tags {limit};"


class OverpassSearchProvider:
    name = "openstreetmap"

    def __init__(self, endpoint: str = OVERPASS_URL,
                 fallbacks: list[str] | None = None, user_agent: str = USER_AGENT):
        self.endpoints = [endpoint, *(fallbacks if fallbacks is not None else OVERPASS_FALLBACK_URLS)]
        self.user_agent = user_agent

    def discover(self, lat: float, lon: float, radius_m: int,
                 selectors: list[dict], limit: int = 200) -> list[RawElement]:
        query = build_overpass_query(lat, lon, radius_m, selectors, limit)
        headers = {"User-Agent": self.user_agent}
        last_error: Exception | None = None

        for endpoint in self.endpoints:
            try:
                with httpx.Client(timeout=OVERPASS_TIMEOUT_SECONDS) as client:
                    resp = client.post(endpoint, data={"data": query}, headers=headers)
                if resp.status_code == 429:
                    raise ProviderError("rate limited (429)")
                if resp.status_code in (406, 503, 504):
                    raise ProviderError(f"unavailable ({resp.status_code})")
                resp.raise_for_status()
                return self._parse(resp.json().get("elements", []))
            except (httpx.HTTPError, ProviderError, ValueError) as exc:
                last_error = exc
                logger.warning("Overpass endpoint %s failed: %s", endpoint, exc)
                continue

        raise ProviderError(f"Search provider unavailable: {last_error}")

    @staticmethod
    def _parse(elements: list[dict]) -> list[RawElement]:
        results: list[RawElement] = []
        for el in elements:
            tags = el.get("tags") or {}
            name = tags.get("name")
            if not name:
                continue
            if "center" in el:
                lat, lon = el["center"].get("lat"), el["center"].get("lon")
            else:
                lat, lon = el.get("lat"), el.get("lon")
            osm_type, osm_id = el.get("type"), el.get("id")
            results.append(RawElement(
                name=name.strip(),
                osm_type=osm_type,
                osm_id=osm_id,
                latitude=lat,
                longitude=lon,
                tags=tags,
                source="openstreetmap",
                source_url=(
                    f"https://www.openstreetmap.org/{osm_type}/{osm_id}"
                    if osm_type and osm_id else None
                ),
            ))
        return results
