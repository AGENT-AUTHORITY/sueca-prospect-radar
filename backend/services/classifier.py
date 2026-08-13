"""Classify a raw OSM business into one of the selected industries.

Uses the same structured selectors that built the Overpass query plus the
industry's Spanish keyword list. Deterministic and transparent — an element
with zero signal for any selected industry is dropped (precision over recall),
so the demo surfaces real, on-target companies instead of random POIs.
"""
from __future__ import annotations

import re

from models.orm import Industry
from providers.base import RawElement


def _text_of(raw: RawElement) -> str:
    parts = [raw.name]
    for value in raw.tags.values():
        if isinstance(value, str):
            parts.append(value)
    return " ".join(parts).lower()


def element_matches_selectors(tags: dict, selectors: list[dict] | None) -> bool:
    for sel in selectors or []:
        k = sel["k"]
        val = tags.get(k)
        if val is None:
            continue
        if "v" in sel:
            if val == sel["v"]:
                return True
        elif "regex" in sel:
            if re.search(sel["regex"], val):
                return True
        else:
            return True
    return False


def _keyword_hits(text: str, keywords: list[str] | None) -> int:
    hits = 0
    for kw in keywords or []:
        if re.search(r"\b" + re.escape(kw.lower()) + r"\b", text):
            hits += 1
    return hits


def classify(raw: RawElement, industries: list[Industry]) -> tuple[str | None, int]:
    """Return (industry_key, confidence). None when nothing matches."""
    text = _text_of(raw)
    best_key: str | None = None
    best_conf = 0
    for ind in industries:
        hits = _keyword_hits(text, ind.keywords)
        precise = element_matches_selectors(raw.tags, ind.osm_selectors)
        conf = hits * 2 + (5 if precise else 0)
        if conf > best_conf:
            best_conf = conf
            best_key = ind.key
    return (best_key, best_conf) if best_conf > 0 else (None, 0)
