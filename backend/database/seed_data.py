"""Seed data: industries (with real OSM selectors + Spanish keywords),
example territory locations, and default operational settings.

Selectors are stored as structured dicts so the SAME definition both builds
the Overpass query AND classifies returned elements:
    {"k": "office", "v": "logistics"}            -> ["office"="logistics"]
    {"k": "shop", "regex": "hardware|trade"}     -> ["shop"~"hardware|trade"]
    {"k": "landuse", "v": "quarry", "named": 1}  -> ["landuse"="quarry"]["name"]
"""
from __future__ import annotations

# One-time territory scan: broad, truck-relevant, tuned to what OSM actually
# maps in these zones. Fetched once per territory and cached, then classified.
TERRITORY_SCAN_SELECTORS: list[dict] = [
    {"k": "amenity", "v": "fuel", "named": 1},
    {"k": "shop", "regex": "trade|car_repair|agrarian|farm|hardware|doityourself|wholesale|car|truck|tyres|building_materials", "named": 1},
    {"k": "office", "named": 1},
    {"k": "craft", "named": 1},
    {"k": "industrial", "named": 1},
    {"k": "landuse", "regex": "industrial|quarry|farmyard", "named": 1},
    {"k": "building", "regex": "industrial|warehouse", "named": 1},
    {"k": "man_made", "regex": "works|silo", "named": 1},
]

# Broad "business net" applied on every query, then keyword-classified.
BUSINESS_NET_SELECTORS: list[dict] = [
    {"k": "office", "named": 1},
    {"k": "industrial", "named": 1},
    {"k": "shop", "regex": "trade|agrarian|hardware|doityourself|car_repair|wholesale|farm", "named": 1},
    {"k": "craft", "named": 1},
    {"k": "building", "regex": "industrial|warehouse", "named": 1},
    {"k": "landuse", "regex": "industrial|farmyard|quarry", "named": 1},
    {"k": "man_made", "regex": "works|silo", "named": 1},
]

INDUSTRIES: list[dict] = [
    {
        "key": "transporte_cargas",
        "label": "Transporte de cargas y logística",
        "base_weight": 48,
        "osm_selectors": [
            {"k": "office", "v": "logistics"},
            {"k": "office", "v": "transport"},
            {"k": "industrial", "v": "transport", "named": 1},
        ],
        "keywords": [
            "transporte", "transportes", "logistica", "logística", "cargas", "carga",
            "flete", "fletes", "encomienda", "encomiendas", "expreso", "courier",
            "distribucion", "distribución", "camion", "camiones", "camión", "flota",
            "mudanza", "mudanzas", "granelero", "bitren", "logistic", "cargo",
        ],
    },
    {
        "key": "agro",
        "label": "Agronegocios y acopio de cereales",
        "base_weight": 42,
        "osm_selectors": [
            {"k": "shop", "v": "agrarian"},
            {"k": "man_made", "v": "silo", "named": 1},
            {"k": "building", "v": "silo", "named": 1},
            {"k": "landuse", "v": "farmyard", "named": 1},
            {"k": "craft", "v": "agricultural_engines"},
        ],
        "keywords": [
            "agro", "agropecuaria", "agropecuario", "acopio", "cereal", "cereales",
            "cerealera", "semilla", "semillas", "agricola", "agrícola", "grano",
            "granos", "campo", "rural", "insumos", "fertilizante", "fertilizantes",
            "silo", "silos", "cosecha", "soja", "maiz", "maíz", "trigo",
        ],
    },
    {
        "key": "construccion",
        "label": "Construcción, corralones y hormigón",
        "base_weight": 40,
        "osm_selectors": [
            {"k": "office", "v": "construction_company"},
            {"k": "shop", "regex": "hardware|doityourself|trade"},
            {"k": "craft", "v": "builder"},
            {"k": "industrial", "v": "concrete", "named": 1},
        ],
        "keywords": [
            "construccion", "construcción", "constructora", "corralon", "corralón",
            "materiales", "hormigon", "hormigón", "hormigonera", "cemento", "arido",
            "áridos", "aridos", "vial", "viales", "pavimento", "obras", "obra",
            "suelos", "excavacion", "excavación", "retroexcavadora", "vialidad",
        ],
    },
    {
        "key": "distribucion",
        "label": "Distribución y mayoristas",
        "base_weight": 40,
        "osm_selectors": [
            {"k": "shop", "v": "wholesale"},
            {"k": "building", "v": "warehouse", "named": 1},
            {"k": "office", "v": "logistics"},
        ],
        "keywords": [
            "distribuidora", "distribuidor", "distribucion", "distribución",
            "mayorista", "mayoristas", "deposito", "depósito", "almacenamiento",
            "abastecimiento", "centro de distribucion", "cd", "logistica",
        ],
    },
    {
        "key": "industria",
        "label": "Industria pesada y alimenticia",
        "base_weight": 40,
        "osm_selectors": [
            {"k": "man_made", "v": "works", "named": 1},
            {"k": "landuse", "v": "industrial", "named": 1},
            {"k": "building", "v": "industrial", "named": 1},
            {"k": "industrial", "named": 1},
        ],
        "keywords": [
            "industria", "industrial", "fabrica", "fábrica", "metalurgica",
            "metalúrgica", "planta", "manufactura", "frigorifico", "frigorífico",
            "alimenticia", "alimentos", "procesadora", "acero", "siderurgica",
            "siderúrgica", "molino", "curtiembre", "quimica", "química",
        ],
    },
    {
        "key": "canteras",
        "label": "Canteras, minería y áridos",
        "base_weight": 44,
        "osm_selectors": [
            {"k": "landuse", "v": "quarry", "named": 1},
            {"k": "industrial", "v": "mine"},
        ],
        "keywords": [
            "cantera", "canteras", "mineria", "minería", "minera", "arido",
            "áridos", "aridos", "piedra", "arena", "extraccion", "extracción",
            "trituradora", "ripio", "cal", "granito",
        ],
    },
    {
        "key": "combustible",
        "label": "Combustible y servicios petroleros",
        "base_weight": 24,
        "osm_selectors": [
            {"k": "amenity", "v": "fuel", "named": 1},
            {"k": "industrial", "v": "oil"},
            {"k": "man_made", "v": "petroleum_well"},
        ],
        "keywords": [
            "combustible", "combustibles", "petrolera", "petroleo", "petróleo",
            "ypf", "axion", "shell", "gas", "glp", "lubricante", "lubricantes",
            "estacion de servicio", "estación de servicio", "cisterna", "granel",
        ],
    },
    {
        "key": "forestal_residuos",
        "label": "Forestal y residuos",
        "base_weight": 34,
        "osm_selectors": [
            {"k": "amenity", "v": "recycling", "named": 1},
            {"k": "landuse", "regex": "landfill|forest", "named": 1},
            {"k": "man_made", "v": "works", "named": 1},
        ],
        "keywords": [
            "forestal", "madera", "aserradero", "residuo", "residuos", "reciclaje",
            "reciclado", "ambiental", "desecho", "desechos", "scrap", "chatarra",
            "metales", "compost",
        ],
    },
]

# Example territory (Buenos Aires). Editable — NOT an official commercial zone.
LOCATIONS: list[dict] = [
    {"name": "Cañuelas", "province": "Buenos Aires", "latitude": -35.0553, "longitude": -58.7589},
    {"name": "Ezeiza", "province": "Buenos Aires", "latitude": -34.8533, "longitude": -58.5236},
    {"name": "Tristán Suárez", "province": "Buenos Aires", "latitude": -34.8667, "longitude": -58.5833},
    {"name": "Lobos", "province": "Buenos Aires", "latitude": -35.1856, "longitude": -59.0956},
    {"name": "San Miguel del Monte", "province": "Buenos Aires", "latitude": -35.4333, "longitude": -58.8000},
    {"name": "Roque Pérez", "province": "Buenos Aires", "latitude": -35.4000, "longitude": -59.3333},
    {"name": "San Vicente", "province": "Buenos Aires", "latitude": -35.0244, "longitude": -58.4222},
]

DEFAULT_SETTINGS: dict[str, dict] = {
    "engine": {
        "request_delay_seconds": 1.2,
        "max_concurrency": 1,
        "result_limit": 60,
        "radius_meters": 8000,
    },
    "scoring_rules": {
        "industrial_site": 20,
        "cold_chain": 14,
        "fleet_signal": 14,
        "long_distance": 12,
        "interprovincial": 10,
        "multi_branch": 6,
        "website": 7,
        "has_phone": 6,
        "growth": 4,
    },
}
