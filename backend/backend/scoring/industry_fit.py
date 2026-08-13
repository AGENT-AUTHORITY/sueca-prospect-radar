"""INDUSTRY FIT — how structurally truck-dependent the activity is.

Answers "how likely is this KIND of business to need heavy trucks?" and refines
the coarse OSM classification into a commercial subcategory (e.g. a fuel
*station* vs a fuel *transporter*). Points are the A-component of the score
(0–30). Refinement is keyword/tag driven and transparent.
"""
from __future__ import annotations

import re


def _has(text: str, *words: str) -> bool:
    return any(re.search(r"\b" + re.escape(w) + r"\b", text) for w in words)


def refine_industry_fit(industry_key: str | None, text: str, tags: dict) -> dict:
    """Return {points, label, subcategory}. `text` is lowercase name+desc+tags."""
    is_fuel_station = tags.get("amenity") == "fuel"
    is_gnc = "gnc" in text or tags.get("fuel:cng") == "yes"

    if industry_key == "transporte_cargas":
        return _fit(30, "Transporte de cargas", "transporte_cargas")

    if industry_key == "combustible":
        transport = _has(text, "cisterna", "cisternas", "granel", "transporte", "logistica",
                         "logística", "distribuidora", "flota") and not is_fuel_station
        if transport:
            return _fit(30, "Transporte / logística de combustible", "fuel_transport")
        if is_gnc:
            return _fit(6, "Estación de GNC (retail)", "gnc_retail")
        return _fit(6, "Estación de servicio (retail)", "fuel_retail")

    if industry_key == "canteras":
        if _has(text, "mineria", "minería", "minera", "mina"):
            return _fit(30, "Minería", "mineria")
        return _fit(28, "Canteras / áridos", "canteras")

    if industry_key == "construccion":
        if _has(text, "vial", "vialidad", "pavimento", "asfalto"):
            return _fit(30, "Empresa vial", "vial")
        if _has(text, "hormigon", "hormigón", "hormigonera", "cemento", "cementera"):
            return _fit(28, "Hormigón / cemento", "hormigon")
        if _has(text, "cantera", "arido", "aridos", "áridos", "movimiento de suelo", "excavacion",
                "excavación", "retroexcavadora", "suelos"):
            return _fit(28, "Áridos / movimiento de suelo", "aridos")
        if _has(text, "corralon", "corralón"):
            return _fit(22, "Corralón de materiales", "corralon")
        if _has(text, "easy", "sodimac", "pinturer", "ferreteria", "ferretería", "bazar"):
            return _fit(8, "Comercio de materiales (retail)", "hardware_retail")
        return _fit(24, "Construcción pesada", "construccion")

    if industry_key == "agro":
        if _has(text, "acopio", "silo", "silos", "cereal", "cereales", "cerealera", "granos"):
            return _fit(25, "Acopio de cereales", "acopio")
        if _has(text, "transporte"):
            return _fit(30, "Transporte de cereales", "transporte_cereales")
        return _fit(18, "Agronegocios", "agro")

    if industry_key == "distribucion":
        if _has(text, "centro de distribucion", "centro de distribución", "logistica", "logística"):
            return _fit(20, "Centro de distribución", "cd")
        if _has(text, "mayorista", "mayoristas"):
            return _fit(15, "Mayorista", "mayorista")
        return _fit(18, "Distribución", "distribucion")

    if industry_key == "industria":
        if tags.get("industrial") == "slaughterhouse" or _has(text, "frigorif", "frigorí"):
            return _fit(30, "Frigorífico / cadena de frío", "frigorifico")
        if _has(text, "molino", "cementera", "siderurg", "acero", "metalurg", "metalúrg",
                "cerámica", "ceramica", "quimica", "química", "planta", "fabrica", "fábrica",
                "procesadora", "curtiembre", "papelera"):
            return _fit(26, "Planta industrial pesada", "planta")
        return _fit(24, "Industria pesada", "industria")

    if industry_key == "forestal_residuos":
        if _has(text, "forestal", "madera", "aserradero"):
            return _fit(28, "Forestal", "forestal")
        if _has(text, "mineria", "minería"):
            return _fit(30, "Minería", "mineria")
        return _fit(20, "Residuos / reciclaje", "residuos")

    return _fit(10, "Actividad general", "generic")


def _fit(points: int, label: str, subcategory: str) -> dict:
    return {"points": points, "label": label, "subcategory": subcategory}
