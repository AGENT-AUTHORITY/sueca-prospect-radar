"""Deduplication across searches and time.

A company found by different queries (or on different days) must NOT create a
second prospect. We compare on several axes, not just the name:
  1. OSM identity (type + id) — exact same map feature
  2. Website domain
  3. Normalized name + geographic proximity / shared phone
  4. Very close coordinates + name containment
"""
from __future__ import annotations

import re

from models.orm import Prospect
from repositories.prospect_repository import ProspectRepository
from utils import haversine_m

_SAME_NAME_RADIUS_M = 2500.0
_TIGHT_RADIUS_M = 150.0


def _digits(phone: str | None) -> str:
    return re.sub(r"\D", "", phone or "")[-8:]  # last 8 digits, ignore country/area noise


class DedupService:
    def __init__(self, repo: ProspectRepository):
        self.repo = repo

    def find_existing(self, candidate: Prospect) -> Prospect | None:
        # 1. Same OSM feature
        hit = self.repo.find_by_osm(candidate.osm_type, candidate.osm_id)
        if hit:
            return hit

        # 2. Same website domain
        hit = self.repo.find_by_domain(candidate.website_domain)
        if hit:
            return hit

        cand_digits = _digits(candidate.phone)

        # 3. Same normalized name, and plausibly the same place
        for other in self.repo.find_by_normalized_name(candidate.normalized_name):
            if candidate.latitude and other.latitude and other.longitude:
                if haversine_m(candidate.latitude, candidate.longitude,
                               other.latitude, other.longitude) <= _SAME_NAME_RADIUS_M:
                    return other
            if cand_digits and cand_digits == _digits(other.phone):
                return other
            if candidate.city and candidate.city == other.city:
                return other
            # Same normalized name within a small local territory is strong.
            return other

        # 4. Nearly identical location + name containment
        if candidate.latitude and candidate.longitude:
            for other in self.repo.find_near(
                candidate.latitude, candidate.longitude, _TIGHT_RADIUS_M
            ):
                a, b = candidate.normalized_name, other.normalized_name
                if a and b and (a in b or b in a):
                    return other
        return None
