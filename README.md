# SUECA PROSPECT RADAR — Commercial Intelligence

Herramienta local de prospección comercial B2B para detectar, clasificar,
puntuar y gestionar empresas con potencial de compra de camiones (nuevos y
usados) dentro de un territorio.

Construida como software interno para **Sueca Vehículos Pesados**. Paleta e
identidad son provisionales (no oficiales) y están centralizadas para
reemplazarse fácilmente.

> **Datos reales, sin mocks.** Las empresas provienen de OpenStreetMap
> (API pública Overpass) y se geocodifican con Nominatim. No hay estadísticas
> inventadas: cada métrica se calcula desde la base de datos y cada evento del
> feed en vivo corresponde a algo que realmente ocurrió.

---

## Arquitectura

```
sueca-prospect-radar/
├── backend/            FastAPI + SQLAlchemy + SQLite
│   ├── main.py             app + routers, crea/seedea la DB al iniciar
│   ├── config.py           configuración central (endpoints, timeouts, umbrales)
│   ├── api/                routers HTTP + stream SSE
│   ├── models/             ORM (todas las tablas) + esquemas Pydantic
│   ├── repositories/       capa de acceso a datos (fácil de migrar a Postgres)
│   ├── providers/          Overpass (búsqueda) · Nominatim (geocoding) · maps · website
│   ├── services/           motor de prospección, dedup, clasificación, caché de territorio
│   ├── scoring/            scoring transparente + reglas de aplicación Volvo
│   └── database/           engine, seed, init
└── frontend/           React + Vite + TypeScript + Tailwind v4 + Leaflet
    └── src/
        ├── components/     Sidebar, Layout, mapa, feed en vivo, drawer de perfil…
        ├── pages/          Dashboard, Prospecting, Prospects, Territory, Pipeline, Runs, Settings
        └── lib/            cliente API, tipos, formato
```

### El motor de datos (importante)

La API pública de Overpass es lenta para consultas de área amplia. Por eso el
sistema hace **un escaneo del territorio una sola vez** (una consulta real a
OSM) y **cachea** el resultado. Cada corrida de prospección clasifica ese pool
al instante — datos reales, obtenidos una vez y reutilizados. Esto es
exactamente lo que pide el brief: *"evitar ejecutar repetidamente la misma
búsqueda sin necesidad"*, y hace que la demo sea rápida y confiable.

El flujo de una corrida:

```
SEARCH → (territory scan / cache) → CLASSIFY → DEDUP → SCORE → VOLVO APP → SAVE
```

---

## Requisitos

- **Python 3.11+** (probado con 3.13)
- **Node 18+** (probado con Node 22)

---

## Instalación y arranque

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # opcional: no se requieren secretos

python -m database.init_db    # crea y seedea la base (idempotente)
uvicorn main:app --reload --port 8000
```

La API queda en `http://localhost:8000` (docs en `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

El dev server proxya `/api` al backend (puerto 8000), así que no hay CORS que
configurar en desarrollo.

---

## Cómo correr una prospección

1. Abrir **Prospecting**.
2. Elegir una **localidad** (ej. Cañuelas), **radio** e **industrias**.
3. **START PROSPECTING** → el feed *Live Commercial Intelligence* muestra en
   vivo cómo el motor detecta, enriquece y puntúa empresas reales; los markers
   aparecen en el mapa y los contadores suben.
4. Cuando se detecta una **HIGH PRIORITY**, se abre el banner → click para ver
   el perfil (score explicado, señales, aplicación Volvo potencial).
5. **Add to pipeline** y gestionar el estado en el tablero Kanban.

### Pre-cargar un territorio (recomendado antes de una demo)

El primer escaneo de un territorio consulta OSM en vivo (~1–2 min). Para que la
demo sea instantánea, pre-cargá la caché:

```bash
cd backend
python _prewarm.py "Cañuelas"          # o varias: python _prewarm.py "Cañuelas" "Lobos"
```

### Reiniciar a estado de demo limpio

```bash
cd backend
python reset_prospects.py               # borra prospectos/runs, conserva la caché OSM
```

---

## Scoring (transparente y configurable)

El score (0–100) es **aditivo y explicable** — nunca un número mágico. Se
compone de:

- **Peso base por industria** (dependencia estructural de camiones del sector).
- **Señales reales** detectadas en los datos públicos: sitio industrial
  confirmado, cadena de frío / refrigerado, señal de flota, larga distancia,
  alcance interprovincial, web/teléfono, sucursales.

Prioridad: **80–100 HIGH · 60–79 MEDIUM · 0–59 LOW**. Los pesos son editables
en **Settings**. Cada prospecto muestra el desglose completo del porqué.

La **aplicación Volvo potencial** (FH / FM / FMX) es una hipótesis comercial
configurable (`scoring/truck_application_rules.py`), nunca una recomendación
definitiva ni especificaciones técnicas.

---

## Providers

| Provider | Fuente | Uso |
|---|---|---|
| `search_provider` | OpenStreetMap **Overpass** (público, sin API key) | descubrimiento de empresas |
| `geocoding_provider` | OpenStreetMap **Nominatim** | geocodificar localidades nuevas |
| `maps_provider` | — | links a Google Maps |
| `website_provider` | tags OSM | extracción de contacto/web (sin scraping) |

Cada provider es reemplazable detrás de una interfaz. No se implementa ninguna
evasión de CAPTCHA/antibot: sólo se consultan APIs públicas documentadas con un
User-Agent descriptivo y respetando delays.

> Nota de red: algunos entornos con inspección TLS (antivirus/proxy) rompen la
> verificación de certificados. El backend usa el almacén de certificados del
> sistema operativo vía `truststore`. Además, si la instancia principal de
> Overpass no responde, se prueban mirrors configurables
> (`OVERPASS_URL` / `OVERPASS_FALLBACK_URLS`).

---

## Limitaciones (honestas)

- La cobertura de OSM en zonas rurales argentinas está sesgada a comercios muy
  mapeados (estaciones de servicio, sitios industriales, supermercados). Las
  empresas de transporte puras suelen no estar tageadas; el motor prioriza por
  relevancia real y descarta ruido.
- Overpass público puede estar lento/saturado; por eso el escaneo se cachea.
- El scoring es un modelo inicial configurable, pensado para refinarse con
  catálogo/producto comercial real.

---

## Persistencia de datos

Los datos se guardan de verdad, no en el navegador ni con mocks: viven en una
base **SQLite real** en `backend/data/sueca.db`. Sobreviven a reinicios del
backend y del equipo. Es el modo por defecto y no requiere configuración.

### Migrar a Supabase / PostgreSQL (opcional, nube)

Supabase agrega persistencia en la nube (multi-dispositivo, backups, acceso
remoto). La capa de repositorios aísla todo el acceso a datos, así que el cambio
es de configuración:

1. En Supabase: crear un proyecto y copiar la cadena de conexión del
   **Session pooler** (Project Settings → Database).
2. En `backend/requirements.txt`, descomentar `psycopg[binary]` e instalarlo:
   `pip install "psycopg[binary]"`.
3. En `.env`, setear:
   `DATABASE_URL=postgresql+psycopg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
4. `python -m database.init_db` (crea las tablas en Supabase) y, si querés migrar
   los prospectos actuales, exportá a CSV desde la app e importá, o copiá el
   contenido con una migración puntual.

Los servicios y routers no dependen del motor de base de datos.

## Idiomas (ES / EN)

La interfaz es bilingüe (español por defecto, inglés disponible). El selector
**ES / EN** está arriba a la derecha; la preferencia se recuerda por navegador.
Los nombres reales de empresas, direcciones y teléfonos no se traducen (son
datos reales); sí se traduce toda la interfaz, industrias, estados y etiquetas.

---

## Utilidades

| Script | Qué hace |
|---|---|
| `python -m database.init_db` | crea y seedea la base (idempotente) |
| `python _prewarm.py "<Localidad>"` | pre-carga la caché OSM de un territorio |
| `python reset_prospects.py` | limpia prospectos/runs para una demo, conserva la caché |
