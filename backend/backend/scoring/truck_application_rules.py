"""Map business activity + signals to a POTENTIAL Volvo family (FH / FM / FMX).

Conservative and clearly hypothetical: family + short natural reason built from
the actual signals detected. No power/axle/gearbox specs, never a "definitive
recommendation" — this is a commercial hint to refine against real catalogue.
"""
from __future__ import annotations

_FAMILIES = {
    "FH": ("Volvo FH", "Long-haul / long-distance road transport"),
    "FM": ("Volvo FM", "Regional distribution and versatile heavy transport"),
    "FMX": ("Volvo FMX", "Severe / off-road duty: construction, quarry, aggregates"),
}

_FMX_SUBCATS = {"vial", "aridos", "hormigon", "canteras", "mineria"}
_FH_SUBCATS = {"transporte_cargas", "fuel_transport", "transporte_cereales"}


def potential_application(industry_key: str | None, signals: dict,
                          subcategory: str) -> dict:
    long_haul = signals.get("long_distance") or signals.get("international") \
        or signals.get("interprovincial") or signals.get("national")

    if subcategory in _FMX_SUBCATS or signals.get("severe_duty"):
        family = "FMX"
        reason = _fmx_reason(subcategory, signals)
    elif subcategory in _FH_SUBCATS or (industry_key == "transporte_cargas"):
        family = "FH"
        reason = _fh_reason(subcategory, signals)
    elif long_haul and industry_key in ("distribucion", "combustible", "industria"):
        family = "FH"
        reason = _fh_reason(subcategory, signals)
    elif signals.get("cold_chain"):
        family = "FH"
        reason = ("Operación con cadena de frío y distribución refrigerada. "
                  "Potencial candidata para tractores de línea (FH) en transporte de larga distancia.")
    else:
        family = "FM"
        reason = _fm_reason(subcategory, signals)

    label, desc = _FAMILIES[family]
    return {"family": family, "family_label": label, "reason": reason}


def _fh_reason(subcat: str, s: dict) -> str:
    bits = []
    if s.get("fleet_own") or s.get("tractors"):
        bits.append("señales de flota propia")
    if s.get("long_distance") or s.get("international") or s.get("interprovincial"):
        bits.append("operación de larga distancia")
    if subcat == "fuel_transport":
        bits.append("transporte de combustible en cisterna")
    if subcat == "transporte_cereales":
        bits.append("transporte de cereales a granel")
    context = " y ".join(bits) if bits else "actividad de transporte de cargas"
    return (f"Empresa con {context}. Potencial candidata para renovación o "
            "ampliación de tractores de línea (FH).")


def _fm_reason(subcat: str, s: dict) -> str:
    if s.get("cold_chain"):
        return ("Operación industrial con logística propia y distribución de mercadería. "
                "Posible aplicación regional / multipropósito (FM).")
    if subcat in ("acopio", "cd", "distribucion", "mayorista"):
        return ("Actividad de acopio / distribución con movimiento frecuente de mercadería. "
                "Posible aplicación regional (FM).")
    return ("Operación industrial / de distribución con movimiento regular de cargas. "
            "Posible aplicación regional / multipropósito (FM).")


def _fmx_reason(subcat: str, s: dict) -> str:
    if subcat == "vial":
        return ("Empresa vial con obra pesada y movimiento de materiales. "
                "Aplicación potencial severa / fuera de ruta (FMX).")
    if subcat in ("aridos", "canteras", "mineria"):
        return ("Extracción / movimiento de áridos con exigencia fuera de ruta. "
                "Aplicación potencial severa (FMX).")
    if subcat == "hormigon":
        return ("Producción y transporte de hormigón / áridos. "
                "Aplicación potencial severa / construcción (FMX).")
    return ("Actividad vinculada a construcción pesada y movimiento de materiales. "
            "Aplicación potencial severa (FMX).")
