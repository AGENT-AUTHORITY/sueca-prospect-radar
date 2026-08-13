"""Contact/website extraction from OSM tags.

Pure tag parsing — no network calls, no scraping. Missing fields stay None so
the UI shows "Not available" rather than inventing data.
"""
from __future__ import annotations

from utils import root_domain

_PHONE_KEYS = ["phone", "contact:phone", "contact:mobile", "phone:mobile", "mobile"]
_EMAIL_KEYS = ["email", "contact:email"]
_WEBSITE_KEYS = ["website", "contact:website", "url", "contact:url"]


def _first(tags: dict, keys: list[str]) -> str | None:
    for k in keys:
        val = tags.get(k)
        if val:
            return val.strip()
    return None


def normalize_website(url: str | None) -> tuple[str | None, str | None]:
    """Return (full_url, domain). Adds https:// when missing."""
    if not url:
        return None, None
    full = url.strip()
    if not full.startswith(("http://", "https://")):
        full = "https://" + full
    return full, root_domain(full)


def extract_contacts(tags: dict) -> dict:
    website, domain = normalize_website(_first(tags, _WEBSITE_KEYS))
    fb = tags.get("contact:facebook") or tags.get("facebook")
    ig = tags.get("contact:instagram") or tags.get("instagram")
    ln = tags.get("contact:linkedin") or tags.get("linkedin")
    wa = tags.get("contact:whatsapp") or tags.get("whatsapp")
    return {
        "phone": _first(tags, _PHONE_KEYS),
        "email": _first(tags, _EMAIL_KEYS),
        "website": website,
        "website_domain": domain,
        "whatsapp": wa.strip() if wa else None,
        "facebook_url": fb.strip() if fb else None,
        "instagram_url": ig.strip() if ig else None,
        "linkedin_url": ln.strip() if ln else None,
    }


def extract_address(tags: dict) -> dict:
    street = tags.get("addr:street")
    number = tags.get("addr:housenumber")
    line = " ".join(p for p in [street, number] if p) or None
    return {
        "address": line,
        "city": tags.get("addr:city") or tags.get("addr:town")
        or tags.get("addr:place") or tags.get("addr:suburb"),
        "province": tags.get("addr:province") or tags.get("addr:state"),
        "country": tags.get("addr:country"),
    }
