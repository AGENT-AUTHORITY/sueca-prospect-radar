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

# Sueca commercial territory — Zone 1, transcribed from the territory map
# supplied by the commercial team. Coordinates point to each partido's main
# urban centre (GeoRef Argentina / IGN) so an 8 km scan starts where companies
# are concentrated instead of at a rural geographic centroid.
LOCATIONS: list[dict] = [
    # Existing operating centres
    {"name": "Cañuelas", "province": "Buenos Aires", "latitude": -35.0553, "longitude": -58.7589},
    {"name": "Ezeiza", "province": "Buenos Aires", "latitude": -34.8533, "longitude": -58.5236},
    {"name": "Tristán Suárez", "province": "Buenos Aires", "latitude": -34.8667, "longitude": -58.5833},
    {"name": "Lobos", "province": "Buenos Aires", "latitude": -35.1856, "longitude": -59.0956},
    {"name": "San Miguel del Monte", "province": "Buenos Aires", "latitude": -35.4333, "longitude": -58.8000},
    {"name": "Roque Pérez", "province": "Buenos Aires", "latitude": -35.4000, "longitude": -59.3333},
    {"name": "San Vicente", "province": "Buenos Aires", "latitude": -35.0244, "longitude": -58.4222},

    # Western and central corridor
    {"name": "Pellegrini", "province": "Buenos Aires", "latitude": -36.267799, "longitude": -63.164569},
    {"name": "Salliqueló", "province": "Buenos Aires", "latitude": -36.748449, "longitude": -62.956256},
    {"name": "Tres Lomas", "province": "Buenos Aires", "latitude": -36.459128, "longitude": -62.862454},
    {"name": "Trenque Lauquen", "province": "Buenos Aires", "latitude": -35.973260, "longitude": -62.732636},
    {"name": "Guaminí", "province": "Buenos Aires", "latitude": -37.010848, "longitude": -62.422227},
    {"name": "Pehuajó", "province": "Buenos Aires", "latitude": -35.810792, "longitude": -61.898947},
    {"name": "Daireaux", "province": "Buenos Aires", "latitude": -36.599586, "longitude": -61.747533},
    {"name": "Henderson", "province": "Buenos Aires", "latitude": -36.298134, "longitude": -61.718515},
    {"name": "Carlos Casares", "province": "Buenos Aires", "latitude": -35.622497, "longitude": -61.365452},
    {"name": "Bolívar", "province": "Buenos Aires", "latitude": -36.229873, "longitude": -61.113899},
    {"name": "9 de Julio", "province": "Buenos Aires", "latitude": -35.443990, "longitude": -60.884566},
    {"name": "Olavarría", "province": "Buenos Aires", "latitude": -36.893791, "longitude": -60.323263},
    {"name": "Bragado", "province": "Buenos Aires", "latitude": -35.115555, "longitude": -60.489734},
    {"name": "Chacabuco", "province": "Buenos Aires", "latitude": -34.642035, "longitude": -60.471258},
    {"name": "Alberti", "province": "Buenos Aires", "latitude": -35.031578, "longitude": -60.280297},
    {"name": "25 de Mayo", "province": "Buenos Aires", "latitude": -35.432379, "longitude": -60.171628},
    {"name": "General Alvear", "province": "Buenos Aires", "latitude": -36.021713, "longitude": -60.014562},
    {"name": "Tapalqué", "province": "Buenos Aires", "latitude": -36.356160, "longitude": -60.025139},
    {"name": "Chivilcoy", "province": "Buenos Aires", "latitude": -34.896862, "longitude": -60.019064},
    {"name": "Azul", "province": "Buenos Aires", "latitude": -36.777458, "longitude": -59.863446},
    {"name": "Saladillo", "province": "Buenos Aires", "latitude": -35.638647, "longitude": -59.779376},
    {"name": "Suipacha", "province": "Buenos Aires", "latitude": -34.768691, "longitude": -59.686900},
    {"name": "Mercedes", "province": "Buenos Aires", "latitude": -34.652782, "longitude": -59.424882},
    {"name": "Navarro", "province": "Buenos Aires", "latitude": -34.998647, "longitude": -59.275543},
    {"name": "Luján", "province": "Buenos Aires", "latitude": -34.566310, "longitude": -59.114723},
    {"name": "Las Flores", "province": "Buenos Aires", "latitude": -36.014629, "longitude": -59.092304},
    {"name": "Rauch", "province": "Buenos Aires", "latitude": -36.774507, "longitude": -59.087275},

    # AMBA west, south and Capital Federal
    {"name": "General Rodríguez", "province": "Buenos Aires", "latitude": -34.612104, "longitude": -58.954121},
    {"name": "General Las Heras", "province": "Buenos Aires", "latitude": -34.926900, "longitude": -58.946815},
    {"name": "Marcos Paz", "province": "Buenos Aires", "latitude": -34.780022, "longitude": -58.833525},
    {"name": "Moreno", "province": "Buenos Aires", "latitude": -34.650267, "longitude": -58.789474},
    {"name": "Merlo", "province": "Buenos Aires", "latitude": -34.670363, "longitude": -58.730054},
    {"name": "Ituzaingó", "province": "Buenos Aires", "latitude": -34.657897, "longitude": -58.661012},
    {"name": "Morón", "province": "Buenos Aires", "latitude": -34.648593, "longitude": -58.622101},
    {"name": "Hurlingham", "province": "Buenos Aires", "latitude": -34.590120, "longitude": -58.628153},
    {"name": "Caseros", "province": "Buenos Aires", "latitude": -34.607936, "longitude": -58.563939},
    {"name": "San Justo", "province": "Buenos Aires", "latitude": -34.681142, "longitude": -58.563739},
    {"name": "San Martín", "province": "Buenos Aires", "latitude": -34.572090, "longitude": -58.533754},
    {"name": "Monte Grande", "province": "Buenos Aires", "latitude": -34.816356, "longitude": -58.468264},
    {"name": "Adrogué", "province": "Buenos Aires", "latitude": -34.797373, "longitude": -58.388453},
    {"name": "Guernica", "province": "Buenos Aires", "latitude": -34.917987, "longitude": -58.382157},
    {"name": "Lomas de Zamora", "province": "Buenos Aires", "latitude": -34.757401, "longitude": -58.402692},
    {"name": "Lanús", "province": "Buenos Aires", "latitude": -34.707567, "longitude": -58.391148},
    {"name": "Avellaneda", "province": "Buenos Aires", "latitude": -34.666033, "longitude": -58.349768},
    {"name": "Florencio Varela", "province": "Buenos Aires", "latitude": -34.804371, "longitude": -58.279272},
    {"name": "Quilmes", "province": "Buenos Aires", "latitude": -34.724691, "longitude": -58.261341},
    {"name": "Berazategui", "province": "Buenos Aires", "latitude": -34.771960, "longitude": -58.206419},
    {"name": "Ciudad Autónoma de Buenos Aires", "province": "Ciudad Autónoma de Buenos Aires", "latitude": -34.603700, "longitude": -58.381600},

    # Southern and coastal corridor
    {"name": "General Belgrano", "province": "Buenos Aires", "latitude": -35.765682, "longitude": -58.497205},
    {"name": "Ranchos", "province": "Buenos Aires", "latitude": -35.516406, "longitude": -58.318973},
    {"name": "Brandsen", "province": "Buenos Aires", "latitude": -35.167924, "longitude": -58.237398},
    {"name": "Pila", "province": "Buenos Aires", "latitude": -36.004217, "longitude": -58.141259},
    {"name": "Chascomús", "province": "Buenos Aires", "latitude": -35.577053, "longitude": -58.008462},
    {"name": "La Plata", "province": "Buenos Aires", "latitude": -34.921362, "longitude": -57.954500},
    {"name": "Ensenada", "province": "Buenos Aires", "latitude": -34.857460, "longitude": -57.907717},
    {"name": "Lezama", "province": "Buenos Aires", "latitude": -35.873145, "longitude": -57.897348},
    {"name": "Berisso", "province": "Buenos Aires", "latitude": -34.880725, "longitude": -57.868868},
    {"name": "Castelli", "province": "Buenos Aires", "latitude": -36.090912, "longitude": -57.807559},
    {"name": "Magdalena", "province": "Buenos Aires", "latitude": -35.082657, "longitude": -57.511454},
    {"name": "Verónica", "province": "Buenos Aires", "latitude": -35.387410, "longitude": -57.338172},
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
