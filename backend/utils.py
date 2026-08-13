"""Pure, dependency-free helpers shared across layers."""
from __future__ import annotations

import math
import re
from urllib.parse import urlparse

_LEGAL_SUFFIXES = re.compile(
    r"\b(s\.?a\.?s?|s\.?r\.?l\.?|s\.?a\.?c\.?i\.?|srl|saci|sca|sh|ltda?|llc|inc|corp|cia|"
    r"cía|hnos|e?\.?i\.?r\.?l|s\.?a\.?)\b",
    re.IGNORECASE,
)
_PUNCT = re.compile(r"[^\w\s]", re.UNICODE)
_MULTISPACE = re.compile(r"\s+")


def normalize_name(name: str | None) -> str:
    """Lowercase, strip legal suffixes and punctuation for dedup comparison."""
    if not name:
        return ""
    text = name.lower().strip()
    text = _LEGAL_SUFFIXES.sub(" ", text)
    text = _PUNCT.sub(" ", text)
    return _MULTISPACE.sub(" ", text).strip()


def root_domain(url: str | None) -> str:
    """Extract bare registrable-ish domain from a URL or host string."""
    if not url:
        return ""
    candidate = url.strip()
    if "//" not in candidate:
        candidate = "http://" + candidate
    try:
        netloc = urlparse(candidate).netloc.lower()
    except Exception:
        return ""
    netloc = netloc.split("@")[-1].split(":")[0]
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters."""
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))
