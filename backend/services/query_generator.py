"""Generate INDUSTRY × LOCATION queries for a run.

Each generated query carries a human display string (for the live feed and
search history) plus the concrete OSM selectors that will actually be executed
(industry-specific selectors + the shared business net).
"""
from __future__ import annotations

from dataclasses import dataclass

from database.seed_data import BUSINESS_NET_SELECTORS
from models.orm import Industry


@dataclass
class GeneratedQuery:
    industry_key: str
    industry_label: str
    query_text: str
    selectors: list[dict]


def generate_queries(location_name: str, industries: list[Industry]) -> list[GeneratedQuery]:
    queries: list[GeneratedQuery] = []
    for ind in industries:
        short = ind.label.split(" y ")[0].split(",")[0].strip().lower()
        queries.append(GeneratedQuery(
            industry_key=ind.key,
            industry_label=ind.label,
            query_text=f"{short} en {location_name}",
            selectors=list(ind.osm_selectors or []) + BUSINESS_NET_SELECTORS,
        ))
    return queries
