"""Map link helpers."""
from __future__ import annotations


def google_maps_url(lat: float | None, lon: float | None, name: str | None) -> str | None:
    if lat is None or lon is None:
        if name:
            return f"https://www.google.com/maps/search/?api=1&query={name}"
        return None
    return f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
