"""Signal detection from a company's public OSM name, description and tags.

Every signal is a real observation (a matched keyword, a tag value, a present
contact field). The scorer turns them into points; nothing here is invented.
"""
from __future__ import annotations

import re

TRUCK_KW = [
    "flota", "camion", "camiones", "camión", "tractor", "tractores", "semirremolque",
    "semirremolques", "acoplado", "acoplados", "cisterna", "cisternas", "volcador",
    "volcadores", "bitren", "granelero", "chasis", "cargas", "carga general", "flete",
    "fletes", "encomiendas", "logistica", "logística", "distribucion", "distribución",
    "transporte", "transportes", "cereales", "granos", "aridos", "áridos", "hormigon",
    "hormigón", "maquinaria pesada", "combustibles", "forestal", "mineria", "minería",
    "rutas", "mudanzas", "interprovincial", "larga distancia",
]
FLEET_OWN_KW = ["flota propia", "flota", "camiones propios", "unidades propias", "parque automotor"]
UNITS_KW = ["unidades"]
SEMI_KW = ["semirremolque", "semirremolques", "acoplado", "acoplados"]
TRACTOR_KW = ["tractor", "tractores"]
LONG_KW = ["larga distancia", "larga"]
INTL_KW = ["internacional", "mercosur", "exportacion", "exportación"]
INTERPROV_KW = ["interprovincial", "provincias"]
NATIONAL_KW = ["nacional", "todo el pais", "todo el país", "todo el país"]
REGIONAL_KW = ["regional", "distribucion", "distribución", "reparto"]
MULTIBRANCH_KW = ["sucursal", "sucursales", "filial", "filiales", "casa central", "plantas"]
ALWAYSON_KW = ["24 horas", "24hs", "24/7", "24 h"]
COLD_KW = ["frigorif", "refriger", "camara fria", "cámara fría", "congel", "cadena de frio", "cadena de frío"]
SEVERE_KW = ["cantera", "canteras", "arido", "aridos", "áridos", "mineria", "minería",
             "movimiento de suelo", "vial", "vialidad", "excavac", "volcador", "demolic"]

RETAIL_SHOPS = {
    "supermarket", "convenience", "bakery", "kiosk", "butcher", "greengrocer", "furniture",
    "gift", "clothes", "shoes", "mobile_phone", "electronics", "hairdresser", "beauty",
    "florist", "jewelry", "optician", "chemist", "cosmetics", "books", "toys", "pet",
    "sports", "deli", "general", "variety_store", "stationery", "doityourself", "hardware",
}
RETAIL_BRANDS = ["easy", "sodimac", "carrefour", "coto", "dia", "walmart", "changomas",
                 "makro", "vea", "disco", "jumbo"]
PROFESSIONAL_OFFICES = {
    "government", "ngo", "lawyer", "accountant", "insurance", "estate_agent",
    "educational_institution", "employment_agency", "financial", "tax_advisor", "notary",
    "it", "coworking", "association", "political_party", "religion", "diplomatic", "advertising_agency",
}
SMALL_CRAFT = {"shoemaker", "tailor", "photographer", "hairdresser", "watchmaker", "jeweller"}


def _has(text: str, keywords: list[str]) -> bool:
    return any(re.search(r"\b" + re.escape(k) + r"\b", text) for k in keywords)


def _matches(text: str, keywords: list[str]) -> list[str]:
    return [k for k in keywords if re.search(r"\b" + re.escape(k) + r"\b", text)]


def _is_industrial_site(tags: dict) -> bool:
    return (
        tags.get("landuse") in ("industrial", "quarry")
        or tags.get("man_made") in ("works", "silo")
        or tags.get("building") in ("industrial", "warehouse")
        or "industrial" in tags
    )


def detect_signals(name: str, description: str | None, tags: dict,
                   industry_key: str | None, contacts: dict) -> dict:
    parts = [name or "", description or "", str(tags.get("operator") or "")]
    for v in tags.values():
        if isinstance(v, str):
            parts.append(v)
    text = " ".join(parts).lower()

    is_fuel_station = tags.get("amenity") == "fuel"
    shop = tags.get("shop")
    office = tags.get("office")
    craft = tags.get("craft")

    transport_context = _has(text, ["transporte", "logistica", "logística", "cisterna",
                                    "cisternas", "flota", "distribuidora", "granel"])
    industrial_site = _is_industrial_site(tags)
    cold_chain = tags.get("industrial") == "slaughterhouse" or _has(text, COLD_KW)

    truck_matches = _matches(text, TRUCK_KW)

    return {
        # heavy-truck
        "truck_signal": bool(truck_matches),
        "truck_keywords": truck_matches[:6],
        # fleet
        "fleet_own": _has(text, FLEET_OWN_KW),
        "fleet_units": _has(text, UNITS_KW),
        "semitrailers": _has(text, SEMI_KW),
        "tractors": _has(text, TRACTOR_KW),
        # operation
        "long_distance": _has(text, LONG_KW),
        "international": _has(text, INTL_KW),
        "interprovincial": _has(text, INTERPROV_KW),
        "national": _has(text, NATIONAL_KW),
        "regional_distribution": _has(text, REGIONAL_KW),
        "multi_branch": _has(text, MULTIBRANCH_KW),
        "always_on": _has(text, ALWAYSON_KW),
        # structural
        "industrial_site": industrial_site,
        "cold_chain": cold_chain,
        "severe_duty": _has(text, SEVERE_KW) or industry_key == "canteras",
        # company / contactability
        "has_website": bool(contacts.get("website")),
        "has_phone": bool(contacts.get("phone")),
        "has_email": bool(contacts.get("email")),
        "has_linkedin": bool(contacts.get("linkedin_url")),
        # negatives
        "fuel_retail": is_fuel_station and not transport_context,
        "gnc": ("gnc" in text or tags.get("fuel:cng") == "yes") and not transport_context,
        "retail": (shop in RETAIL_SHOPS or _has(text, RETAIL_BRANDS))
        and not industrial_site and not transport_context,
        "professional": office in PROFESSIONAL_OFFICES or tags.get("amenity") in ("townhall",),
        "small_workshop": (shop == "car_repair" or craft in SMALL_CRAFT
                           or _has(text, ["gomeria", "gomería", "taller"]))
        and not industrial_site,
    }
