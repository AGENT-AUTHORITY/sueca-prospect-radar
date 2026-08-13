"""Central configuration for SUECA PROSPECT RADAR backend.

All tunables live here or in the `settings` DB table — never hardcoded in
route handlers or components. Values here are defaults; the DB `settings`
table can override the operational ones at runtime.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

from dotenv import load_dotenv

# Use the OS trust store (Windows/macOS) so HTTPS works behind AV/proxy TLS
# interception that re-signs certificates with a locally-trusted root CA.
try:
    import truststore

    truststore.inject_into_ssl()
except Exception:  # pragma: no cover - falls back to certifi
    pass

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# --- Storage ---------------------------------------------------------------
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

APP_ENV = os.getenv("APP_ENV", "development")
IS_PRODUCTION = APP_ENV.lower() in {"production", "prod"}


def _normalize_db_url(raw: str) -> str:
    """Coerce Supabase/Heroku-style URLs to the SQLAlchemy 2.x + psycopg 3 form.

    Supabase hands out ``postgresql://...`` (or sometimes ``postgres://...``)
    with no driver. SQLAlchemy 2.x defaults those to psycopg2, which we don't
    install — so we rewrite the scheme to ``postgresql+psycopg://`` (psycopg 3).
    SQLite and already-qualified URLs pass through untouched.
    """
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://"):]
    if raw.startswith("postgresql://"):
        raw = "postgresql+psycopg://" + raw[len("postgresql://"):]
    return raw


DATABASE_URL = _normalize_db_url(
    os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'sueca.db'}")
)

# --- External providers (all free / public OSM data) -----------------------
# The territory scan runs against these in order until one responds. The main
# overpass-api.de instance can be slow/unreachable behind some networks, so we
# try a mirror first; the chain makes the scan resilient regardless of network.
OVERPASS_URL = os.getenv("OVERPASS_URL", "https://maps.mail.ru/osm/tools/overpass/api/interpreter")
OVERPASS_FALLBACK_URLS = [
    u for u in os.getenv(
        "OVERPASS_FALLBACK_URLS",
        "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter",
    ).split(",") if u.strip()
]
NOMINATIM_URL = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org")
# Descriptive per OSM policy, but WITHOUT browser tokens / parentheses — the
# main Overpass instance's WAF returns 406 for "Mozilla"-style User-Agents.
USER_AGENT = os.getenv("USER_AGENT", "SuecaProspectRadar/1.0")

# --- Prospecting engine defaults (overridable via settings table) ----------
DEFAULT_REQUEST_DELAY_SECONDS = float(os.getenv("REQUEST_DELAY_SECONDS", "1.2"))
DEFAULT_MAX_CONCURRENCY = int(os.getenv("MAX_CONCURRENCY", "1"))
DEFAULT_RESULT_LIMIT = int(os.getenv("RESULT_LIMIT", "60"))
DEFAULT_RADIUS_METERS = int(os.getenv("RADIUS_METERS", "8000"))
HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "45"))
# The one-time territory scan is a heavy Overpass area query — give it room.
OVERPASS_TIMEOUT_SECONDS = float(os.getenv("OVERPASS_TIMEOUT_SECONDS", "160"))

# --- CORS ------------------------------------------------------------------
CORS_ORIGINS = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if o.strip()
]

# --- Public-demo safety limits ---------------------------------------------
# A shared demo link means anyone could kick off huge runs; cap them.
MAX_RESULTS_PER_RUN = int(os.getenv("MAX_RESULTS_PER_RUN", "60"))
MAX_ACTIVE_RUNS = int(os.getenv("MAX_ACTIVE_RUNS", "1"))

# --- Scoring thresholds ----------------------------------------------------
PRIORITY_HIGH_MIN = 80
PRIORITY_MEDIUM_MIN = 60

# --- Auth / session (single-user access gate) ------------------------------
# The signed session cookie is issued by Starlette's SessionMiddleware. In
# production the cookie must be cross-site (frontend and backend on different
# hosts) and HTTPS-only, so SameSite=None + Secure.
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-insecure-session-secret-change-in-prod")
SESSION_SAME_SITE = "none" if IS_PRODUCTION else "lax"
SESSION_HTTPS_ONLY = IS_PRODUCTION
SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE", str(60 * 60 * 24 * 7)))  # 7 days

# The access code is never stored in plaintext in code or the frontend. We keep
# only its SHA-256 hash and compare in constant time. Provide it as
# ACCESS_CODE_HASH (preferred) or ACCESS_CODE (hashed here at startup).
_access_code_plain = os.getenv("ACCESS_CODE", "")
ACCESS_CODE_HASH = os.getenv("ACCESS_CODE_HASH", "").strip().lower()
if not ACCESS_CODE_HASH and _access_code_plain:
    ACCESS_CODE_HASH = hashlib.sha256(_access_code_plain.encode("utf-8")).hexdigest()
if not ACCESS_CODE_HASH and not IS_PRODUCTION:
    # Local-dev convenience only (code: "sueca"). Production MUST set a real one.
    ACCESS_CODE_HASH = hashlib.sha256(b"sueca").hexdigest()
