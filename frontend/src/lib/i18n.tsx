import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

type Dict = Record<string, unknown>;

const ES: Dict = {
  nav: {
    dashboard: "Panel", prospecting: "Prospección", prospects: "Prospectos",
    territory: "Territorio", pipeline: "Pipeline", searchRuns: "Búsquedas", settings: "Configuración",
  },
  header: {
    dashboard: "Panel", prospecting: "Prospección", prospects: "Prospectos",
    territory: "Inteligencia territorial", pipeline: "Pipeline", searchRuns: "Historial de búsquedas",
    settings: "Configuración", fallback: "Prospect Radar",
    systemOnline: "SISTEMA EN LÍNEA", systemOffline: "SIN CONEXIÓN", systemConnecting: "CONECTANDO",
    newProspecting: "Nueva prospección",
  },
  auth: {
    title: "Acceso privado", subtitle: "Ingresá tu código de acceso para continuar",
    placeholder: "Código de acceso", enter: "Ingresar", connecting: "Conectando…",
    checking: "Verificando acceso…", error: "Código de acceso incorrecto", logout: "Salir",
  },
  brand: { company: "Sueca Vehículos Pesados", tagline: "Commercial Intelligence" },
  common: {
    all: "Todas", viewAll: "Ver todo", open: "Abrir", loading: "Cargando…",
    notAvailable: "No disponible", noData: "Sin datos aún", of: "de", page: "Página",
    prev: "Anterior", next: "Siguiente", save: "Guardar", add: "Agregar",
  },
  metrics: {
    prospectsFound: "Prospectos", highPriority: "Alta prioridad", contacted: "Contactados",
    meetings: "Reuniones", opportunities: "Oportunidades", won: "Ganados",
  },
  dashboard: {
    territoryMap: "Mapa del territorio", fullTerritory: "Territorio completo",
    topVolvoFit: "Top aplicación Volvo", byIndustry: "Prospectos por industria",
    recentRuns: "Búsquedas recientes", noRuns: "Aún no hay búsquedas.",
    startProspecting: "Iniciar prospección →", recentProspects: "Prospectos recientes",
    noProspects: "Aún no hay prospectos.", runFirst: "Ejecutá tu primera búsqueda →",
    company: "Empresa", industry: "Industria", city: "Ciudad", score: "Score", status: "Estado",
    longHaul: "Larga distancia", regional: "Regional / distribución", severe: "Severo / construcción",
  },
  prospecting: {
    searchParameters: "Parámetros de búsqueda", location: "Localidad", radius: "Radio",
    maxResults: "Máx. resultados", industries: "Industrias",
    rescan: "Volver a escanear OpenStreetMap (más lento, datos frescos)",
    start: "INICIAR PROSPECCIÓN", stop: "DETENER BÚSQUEDA",
    selectIndustry: "Seleccioná al menos una industria.",
    detected: "Detectadas", newProspects: "Nuevos prospectos", high: "Alta prioridad", duplicates: "Duplicados",
    scanningTerritory: "Escaneando territorio", query: "Consulta",
    liveTitle: "Inteligencia comercial en vivo", scanning: "ESCANEANDO", idle: "EN ESPERA",
    connecting: "Conectando con el motor de prospección…",
    startHint: "Iniciá una prospección para ver el motor detectar, enriquecer y puntuar empresas reales en tiempo real.",
    highDetected: "Prospecto de alta prioridad detectado", potential: "potencial",
    liveMap: "Mapa del territorio en vivo", viewProspect: "Ver prospecto",
  },
  prospects: {
    searchPlaceholder: "Buscar empresa, ciudad, industria…", allIndustries: "Todas las industrias",
    allPriorities: "Todas las prioridades", allStatuses: "Todos los estados", exportCsv: "Exportar CSV",
    minScore: "Score mínimo", hasPhone: "Con teléfono", hasWebsite: "Con web", fleetSignal: "Señal de flota",
    prospects: "prospectos", company: "Empresa", industry: "Industria", city: "Ciudad", score: "Score",
    volvoFit: "Aplicación Volvo", contact: "Contacto", status: "Estado", lastActivity: "Última actividad",
    noMatch: "Ningún prospecto coincide con estos filtros.", fleetTag: "señal de flota",
  },
  territory: {
    detected: "Detectados", highPriority: "Alta prioridad", contacted: "Contactados",
    opportunities: "Oportunidades", filters: "Filtros", industry: "Industria", priority: "Prioridad",
    locality: "Localidad", shownOnMap: "en el mapa",
  },
  pipeline: {
    hint: "Arrastrá prospectos entre etapas. Cada cambio se guarda con su historial. Clic en una tarjeta para abrir su perfil.",
    dropHere: "Soltar aquí",
  },
  runs: {
    title: "Búsquedas", territory: "Territorio", industries: "Industrias", queries: "Consultas",
    found: "Encontradas", new: "Nuevas", dupes: "Dupes", duration: "Duración", status: "Estado",
    noRuns: "Aún no hay búsquedas.", noEvents: "Sin eventos registrados.",
  },
  settings: {
    engine: "Motor de prospección", defaultRadius: "Radio por defecto (m)", resultLimit: "Límite de resultados",
    requestDelay: "Demora entre solicitudes (s)", maxConcurrency: "Concurrencia máxima",
    scoringRules: "Reglas de scoring (puntos)",
    scoringHint: "Puntos sumados cuando se detecta una señal. El peso base por industria se define por industria abajo.",
    activeIndustries: "Industrias activas", baseWeight: "Peso base", territoryLocations: "Localidades del territorio",
    addLocality: "Agregar una localidad (ej. Lobos)…", needsGeocode: "(requiere geocodificación)",
    saved: "guardado", engineSaved: "Configuración del motor guardada", scoringSaved: "Reglas de scoring guardadas",
    locationAdded: "Localidad agregada",
  },
  profile: {
    commercialPotential: "Potencial comercial", dataConfidence: "Confianza de datos",
    dataConfidenceHint: "El potencial y la confianza son independientes — un buen prospecto puede tener una ficha pública pobre.",
    potentialVolvo: "Aplicación Volvo potencial",
    commercialIntelligence: "Inteligencia comercial — por qué importa este prospecto",
    whyScore: "Por qué este score", contactData: "Datos de contacto",
    address: "Dirección", phone: "Teléfono", whatsapp: "WhatsApp", email: "Email", website: "Web", source: "Fuente",
    salesAction: "Acción comercial", pipelineStatus: "Estado del pipeline",
    addToPipeline: "Agregar al pipeline", followUp: "Seguimiento",
    notesActivity: "Notas y actividad", addNotePlaceholder: "Agregar una nota…",
    readyToContact: "Agregar al pipeline · Listo para contactar",
    call: "Llamar", map: "Mapa",
    catIndustryFit: "Fit de industria", catHeavyTruck: "Señales de camión pesado",
    catFleet: "Señales de flota", catOperation: "Señales de operación",
    catCompany: "Señales de empresa", catNegative: "Señales negativas",
    sigTruck: "Actividad de camión pesado", sigIndustrial: "Sitio industrial",
    sigCold: "Cadena de frío / refrigerado", sigSevere: "Servicio severo / fuera de ruta",
    sigOwnFleet: "Flota propia", sigSemi: "Semirremolques", sigTractor: "Tractores", sigUnits: "Unidades de flota",
    sigLong: "Larga distancia", sigIntl: "Internacional", sigInterprov: "Interprovincial",
    sigNational: "Nacional", sigRegional: "Distribución regional", sigMulti: "Múltiples sucursales", sigAlways: "Operación 24/7",
  },
  volvoDesc: {
    FH: "Larga distancia / transporte de línea", FM: "Distribución regional y transporte pesado versátil",
    FMX: "Servicio severo / fuera de ruta: construcción, cantera, áridos",
  },
  industries: {
    transporte_cargas: "Transporte de cargas", agro: "Agronegocios", construccion: "Construcción",
    distribucion: "Distribución", industria: "Industria pesada", canteras: "Canteras / áridos",
    combustible: "Combustible", forestal_residuos: "Forestal / residuos",
  },
  statuses: {
    NEW: "Nuevo", RESEARCHING: "En investigación", READY_TO_CONTACT: "Listo para contactar",
    CONTACTED: "Contactado", FOLLOW_UP: "Seguimiento", MEETING: "Reunión", OPPORTUNITY: "Oportunidad",
    QUOTED: "Cotizado", NEGOTIATION: "Negociación", WON: "Ganado", LOST: "Perdido", NO_FIT: "No aplica",
  },
};

const EN: Dict = {
  nav: {
    dashboard: "Dashboard", prospecting: "Prospecting", prospects: "Prospects",
    territory: "Territory", pipeline: "Pipeline", searchRuns: "Search Runs", settings: "Settings",
  },
  header: {
    dashboard: "Dashboard", prospecting: "Prospecting", prospects: "Prospects",
    territory: "Territory Intelligence", pipeline: "Pipeline", searchRuns: "Search Runs",
    settings: "Settings", fallback: "Prospect Radar",
    systemOnline: "SYSTEM ONLINE", systemOffline: "SYSTEM OFFLINE", systemConnecting: "CONNECTING",
    newProspecting: "New prospecting",
  },
  auth: {
    title: "Private access", subtitle: "Enter your access code to continue",
    placeholder: "Access code", enter: "Enter", connecting: "Connecting…",
    checking: "Verifying access…", error: "Incorrect access code", logout: "Log out",
  },
  brand: { company: "Sueca Vehículos Pesados", tagline: "Commercial Intelligence" },
  common: {
    all: "All", viewAll: "View all", open: "Open", loading: "Loading…",
    notAvailable: "Not available", noData: "No data yet", of: "of", page: "Page",
    prev: "Prev", next: "Next", save: "Save", add: "Add",
  },
  metrics: {
    prospectsFound: "Prospects found", highPriority: "High priority", contacted: "Contacted",
    meetings: "Meetings", opportunities: "Opportunities", won: "Won",
  },
  dashboard: {
    territoryMap: "Territory map", fullTerritory: "Full territory",
    topVolvoFit: "Top Volvo fit", byIndustry: "Prospects by industry",
    recentRuns: "Recent runs", noRuns: "No runs yet.",
    startProspecting: "Start prospecting →", recentProspects: "Recent prospects",
    noProspects: "No prospects yet.", runFirst: "Run your first search →",
    company: "Company", industry: "Industry", city: "City", score: "Score", status: "Status",
    longHaul: "Long-haul", regional: "Regional / distribution", severe: "Severe / construction",
  },
  prospecting: {
    searchParameters: "Search parameters", location: "Location", radius: "Radius",
    maxResults: "Max results", industries: "Industries",
    rescan: "Re-scan OpenStreetMap (slower, fresh data)",
    start: "START PROSPECTING", stop: "STOP SEARCH",
    selectIndustry: "Select at least one industry.",
    detected: "Detected", newProspects: "New prospects", high: "High priority", duplicates: "Duplicates",
    scanningTerritory: "Scanning territory", query: "Query",
    liveTitle: "Live Commercial Intelligence", scanning: "SCANNING", idle: "IDLE",
    connecting: "Connecting to the prospecting engine…",
    startHint: "Start a prospecting run to watch the engine detect, enrich and score real companies in real time.",
    highDetected: "High priority prospect detected", potential: "potential",
    liveMap: "Live territory map", viewProspect: "View prospect",
  },
  prospects: {
    searchPlaceholder: "Search company, city, industry…", allIndustries: "All industries",
    allPriorities: "All priorities", allStatuses: "All statuses", exportCsv: "Export CSV",
    minScore: "Min score", hasPhone: "Has phone", hasWebsite: "Has website", fleetSignal: "Fleet signal",
    prospects: "prospects", company: "Company", industry: "Industry", city: "City", score: "Score",
    volvoFit: "Volvo fit", contact: "Contact", status: "Status", lastActivity: "Last activity",
    noMatch: "No prospects match these filters.", fleetTag: "fleet signal",
  },
  territory: {
    detected: "Detected", highPriority: "High priority", contacted: "Contacted",
    opportunities: "Opportunities", filters: "Filters", industry: "Industry", priority: "Priority",
    locality: "Locality", shownOnMap: "shown on map",
  },
  pipeline: {
    hint: "Drag prospects across stages. Every move is persisted with history. Click a card to open its profile.",
    dropHere: "Drop here",
  },
  runs: {
    title: "Search runs", territory: "Territory", industries: "Industries", queries: "Queries",
    found: "Found", new: "New", dupes: "Dupes", duration: "Duration", status: "Status",
    noRuns: "No search runs yet.", noEvents: "No events recorded.",
  },
  settings: {
    engine: "Prospecting engine", defaultRadius: "Default radius (m)", resultLimit: "Result limit",
    requestDelay: "Request delay (s)", maxConcurrency: "Max concurrency",
    scoringRules: "Scoring rules (points)",
    scoringHint: "Points added when a signal is detected. Industry base weight is set per industry below.",
    activeIndustries: "Active industries", baseWeight: "Base weight", territoryLocations: "Territory locations",
    addLocality: "Add a locality (e.g. Lobos)…", needsGeocode: "(needs geocode)",
    saved: "saved", engineSaved: "Engine settings saved", scoringSaved: "Scoring rules saved",
    locationAdded: "Location added",
  },
  profile: {
    commercialPotential: "Commercial potential", dataConfidence: "Data confidence",
    dataConfidenceHint: "Potential and confidence are independent — a strong prospect can have a thin public profile.",
    potentialVolvo: "Potential Volvo application",
    commercialIntelligence: "Commercial intelligence — why this prospect matters",
    whyScore: "Why this score", contactData: "Contact data",
    address: "Address", phone: "Phone", whatsapp: "WhatsApp", email: "Email", website: "Website", source: "Source",
    salesAction: "Sales action", pipelineStatus: "Pipeline status",
    addToPipeline: "Add to pipeline", followUp: "Follow-up",
    notesActivity: "Notes & activity", addNotePlaceholder: "Add a note…",
    readyToContact: "Add to pipeline · Ready to contact",
    call: "Call", map: "Map",
    catIndustryFit: "Industry fit", catHeavyTruck: "Heavy-truck signals",
    catFleet: "Fleet signals", catOperation: "Operation signals",
    catCompany: "Company signals", catNegative: "Negative signals",
    sigTruck: "Heavy-truck activity", sigIndustrial: "Industrial-scale site",
    sigCold: "Cold-chain / refrigerated", sigSevere: "Severe / off-road duty",
    sigOwnFleet: "Own fleet", sigSemi: "Semitrailers", sigTractor: "Tractors", sigUnits: "Fleet units",
    sigLong: "Long distance", sigIntl: "International", sigInterprov: "Interprovincial",
    sigNational: "National", sigRegional: "Regional distribution", sigMulti: "Multiple branches", sigAlways: "24/7 operation",
  },
  volvoDesc: {
    FH: "Long-haul / long-distance road transport", FM: "Regional distribution & versatile heavy transport",
    FMX: "Severe / off-road duty: construction, quarry, aggregates",
  },
  industries: {
    transporte_cargas: "Freight transport", agro: "Agribusiness", construccion: "Construction",
    distribucion: "Distribution", industria: "Heavy industry", canteras: "Quarries / aggregates",
    combustible: "Fuel", forestal_residuos: "Forestry / waste",
  },
  statuses: {
    NEW: "New", RESEARCHING: "Researching", READY_TO_CONTACT: "Ready to contact",
    CONTACTED: "Contacted", FOLLOW_UP: "Follow up", MEETING: "Meeting", OPPORTUNITY: "Opportunity",
    QUOTED: "Quoted", NEGOTIATION: "Negotiation", WON: "Won", LOST: "Lost", NO_FIT: "No fit",
  },
};

const TABLE: Record<Lang, Dict> = { es: ES, en: EN };

function lookup(dict: Dict, path: string): string | undefined {
  const val = path.split(".").reduce<unknown>((o, k) => (o as Dict)?.[k], dict);
  return typeof val === "string" ? val : undefined;
}

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
  industry: (key: string | null) => string;
  status: (key: string | null) => string;
  volvoDesc: (family: string | null) => string;
}

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("sueca_lang") : null;
    return saved === "en" ? "en" : "es";
  });

  useEffect(() => {
    localStorage.setItem("sueca_lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(() => {
    const dict = TABLE[lang];
    const t = (path: string) => lookup(dict, path) ?? lookup(ES, path) ?? path;
    return {
      lang, setLang, t,
      industry: (key) => (key ? t(`industries.${key}`) : "—"),
      status: (key) => (key ? t(`statuses.${key}`) : "—"),
      volvoDesc: (family) => (family ? t(`volvoDesc.${family}`) : ""),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useT must be used within LanguageProvider");
  return ctx;
}
