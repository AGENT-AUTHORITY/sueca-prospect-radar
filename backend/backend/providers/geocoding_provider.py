"""Geocoding via OpenStreetMap Nominatim (free, public, no key).

Only used when a location has no stored coordinates. Respects the OSM usage
policy: descriptive User-Agent, single serialized request, low volume.
"""
from __future__ import annotations

import logging

import httpx

from config import HTTP_TIMEOUT_SECONDS, NOMINATIM_URL, USER_AGENT
from providers.base import ProviderError

logger = logging.getLogger("providers.geocoding")


class NominatimGeocoder:
    def __init__(self, base_url: str = NOMINATIM_URL, user_agent: str = USER_AGENT):
        self.base_url = base_url.rstrip("/")
        self.user_agent = user_agent

    def geocode(self, query: str, country: str = "Argentina") -> dict | None:
        """Return {lat, lon, display_name} for a place, or None if not found."""
        params = {
            "q": f"{query}, {country}",
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
        }
        headers = {"User-Agent": self.user_agent}
        try:
            with httpx.Client(timeout=HTTP_TIMEOUT_SECONDS) as client:
                resp = client.get(f"{self.base_url}/search", params=params, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as exc:
            logger.error("Nominatim geocode failed for %r: %s", query, exc)
            raise ProviderError(f"Geocoding failed: {exc}") from exc

        if not data:
            return None
        top = data[0]
        return {
            "lat": float(top["lat"]),
            "lon": float(top["lon"]),
            "display_name": top.get("display_name", query),
        }
