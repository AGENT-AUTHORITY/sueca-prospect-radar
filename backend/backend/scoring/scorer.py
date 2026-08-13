"""Modular, explainable Volvo commercial scorer.

Score (0–100) = INDUSTRY FIT + HEAVY-TRUCK + FLEET + OPERATION + COMPANY
                 − NEGATIVE SIGNALS.

Data confidence is tracked SEPARATELY (a great prospect with a thin public
profile is still a great prospect). Every point carries a human reason and a
category, so the UI can render exactly why the score is what it is.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from config import PRIORITY_HIGH_MIN, PRIORITY_MEDIUM_MIN
from scoring.industry_fit import refine_industry_fit
from scoring.signals import detect_signals
from scoring.truck_application_rules import potential_application

HEAVY_FLEET_SECTORS = {"transporte_cargas", "distribucion", "canteras", "agro"}


@dataclass
class Evaluation:
    score: int
    priority: str
    data_confidence: int
    breakdown: list[dict] = field(default_factory=list)
    components: dict = field(default_factory=dict)
    signals: dict = field(default_factory=dict)
    subcategory: str = ""
    industry_fit_label: str = ""
    volvo_family: str | None = None
    volvo_label: str | None = None
    volvo_reason: str | None = None
    fleet_signal: bool = False


def priority_for(score: int) -> str:
    if score >= PRIORITY_HIGH_MIN:
        return "HIGH"
    if score >= PRIORITY_MEDIUM_MIN:
        return "MEDIUM"
    return "LOW"


def _text(name: str, description: str | None, tags: dict) -> str:
    parts = [name or "", description or "", str(tags.get("operator") or "")]
    for v in tags.values():
        if isinstance(v, str):
            parts.append(v)
    return " ".join(parts).lower()


def evaluate(*, industry_key: str | None, name: str, description: str | None,
             tags: dict, contacts: dict, has_coords: bool) -> Evaluation:
    text = _text(name, description, tags)
    sig = detect_signals(name, description, tags, industry_key, contacts)
    fit = refine_industry_fit(industry_key, text, tags)

    breakdown: list[dict] = []

    def add(points: int, reason: str, category: str) -> None:
        if points:
            breakdown.append({"points": points, "reason": reason, "category": category})

    # A — INDUSTRY FIT (0–30)
    industry_fit = fit["points"]
    add(industry_fit, fit["label"], "industry_fit")

    # B — HEAVY-TRUCK SIGNALS (0–30)
    heavy = 0
    if sig["truck_signal"]:
        heavy += 18
        kws = ", ".join(sig["truck_keywords"][:3])
        add(18, f"Heavy-truck activity signal ({kws})", "heavy_truck")
        if len(sig["truck_keywords"]) >= 2:
            heavy += 6
            add(6, "Multiple heavy-truck indicators", "heavy_truck")
    if sig["industrial_site"]:
        heavy += 15
        add(15, "Confirmed industrial-scale site", "heavy_truck")
    if sig["cold_chain"]:
        heavy += 14
        add(14, "Cold-chain / refrigerated freight", "heavy_truck")
    heavy = min(heavy, 30)

    # C — FLEET SIGNALS (0–25)
    fleet = 0
    if sig["fleet_own"]:
        fleet += 20
        add(20, "Own-fleet signal", "fleet")
    if sig["semitrailers"]:
        fleet += 10
        add(10, "Semitrailers mentioned", "fleet")
    if sig["tractors"]:
        fleet += 10
        add(10, "Tractor units mentioned", "fleet")
    if sig["fleet_units"]:
        fleet += 8
        add(8, "Fleet units referenced", "fleet")
    if fleet == 0 and (sig["industrial_site"] or industry_key in HEAVY_FLEET_SECTORS):
        fleet += 12
        add(12, "Fleet operation implied by activity", "fleet")
    fleet = min(fleet, 25)

    # D — OPERATION SIGNALS (0–25)
    operation = 0
    if sig["international"] or sig["long_distance"]:
        operation += 15
        add(15, "Long-distance / international operation", "operation")
    if sig["interprovincial"] or sig["national"]:
        operation += 12
        add(12, "Interprovincial / national reach", "operation")
    if sig["cold_chain"]:
        operation += 8
        add(8, "Refrigerated distribution", "operation")
    if sig["regional_distribution"]:
        operation += 8
        add(8, "Regional distribution", "operation")
    if sig["multi_branch"]:
        operation += 8
        add(8, "Multiple branches / plants", "operation")
    if sig["industrial_site"]:
        operation += 10
        add(10, "Heavy industrial activity", "operation")
    if sig["severe_duty"]:
        operation += 10
        add(10, "Severe-duty / off-road operation", "operation")
    if sig["always_on"]:
        operation += 5
        add(5, "24/7 operation", "operation")
    operation = min(operation, 25)

    # E — COMPANY SIGNALS (0–10) — confidence/contactability, not the driver
    company = 0
    if sig["has_website"]:
        company += 3
        add(3, "Corporate website", "company")
    if sig["has_phone"]:
        company += 2
        add(2, "Direct phone", "company")
    if sig["has_linkedin"]:
        company += 2
        add(2, "LinkedIn presence", "company")
    if sig["has_email"]:
        company += 1
        add(1, "Public email", "company")
    if sig["has_website"] and sig["has_phone"]:
        company += 2
        add(2, "Consistent corporate presence", "company")
    company = min(company, 10)

    # F — NEGATIVE SIGNALS (floor −45)
    negatives = 0
    if sig["gnc"]:
        negatives -= 25
        add(-25, "GNC station — no transport evidence", "negative")
    elif sig["fuel_retail"]:
        negatives -= 20
        add(-20, "Fuel station (retail) — no transport evidence", "negative")
    if sig["retail"]:
        negatives -= 25
        add(-25, "Retail business — not a fleet operator", "negative")
    if sig["professional"]:
        negatives -= 30
        add(-30, "Institution / professional office", "negative")
    if sig["small_workshop"]:
        negatives -= 15
        add(-15, "Small local workshop", "negative")
    if (negatives == 0 and industry_fit <= 10 and not sig["truck_signal"]
            and not sig["industrial_site"]):
        negatives -= 15
        add(-15, "No clear heavy-transport relation", "negative")
    negatives = max(negatives, -45)

    total = max(0, min(100, industry_fit + heavy + fleet + operation + company + negatives))
    components = {
        "industry_fit": industry_fit, "heavy_truck": heavy, "fleet": fleet,
        "operation": operation, "company": company, "negatives": negatives,
    }

    fleet_signal = bool(
        sig["fleet_own"] or sig["semitrailers"] or sig["tractors"] or sig["fleet_units"]
        or ((sig["industrial_site"] or industry_key in HEAVY_FLEET_SECTORS) and total >= PRIORITY_MEDIUM_MIN)
    )

    app = potential_application(industry_key, sig, fit["subcategory"])
    dc = _data_confidence(tags, contacts, has_coords, description)

    return Evaluation(
        score=total,
        priority=priority_for(total),
        data_confidence=dc,
        breakdown=breakdown,
        components=components,
        signals=sig,
        subcategory=fit["subcategory"],
        industry_fit_label=fit["label"],
        volvo_family=app["family"],
        volvo_label=app["family_label"],
        volvo_reason=app["reason"],
        fleet_signal=fleet_signal,
    )


def _data_confidence(tags: dict, contacts: dict, has_coords: bool,
                     description: str | None) -> int:
    dc = 0
    if contacts.get("website"):
        dc += 25
    if contacts.get("phone"):
        dc += 20
    if contacts.get("email"):
        dc += 10
    if contacts.get("linkedin_url"):
        dc += 8
    if tags.get("addr:street") or tags.get("addr:city"):
        dc += 12
    if has_coords:
        dc += 18
    if description:
        dc += 7
    return min(dc, 100)
