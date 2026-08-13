"""Provider contracts and the raw discovery record.

A `RawElement` is what a discovery provider returns — an unclassified,
unscored real-world business. Classification and scoring happen later so a
provider can be swapped without touching commercial logic.
"""
from __future__ import annotations

from dataclasses import dataclass, field


class ProviderError(Exception):
    """Raised when an external provider fails. Never swallowed silently."""


@dataclass
class RawElement:
    name: str
    osm_type: str | None = None
    osm_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    tags: dict[str, str] = field(default_factory=dict)
    source: str = "openstreetmap"
    source_url: str | None = None
