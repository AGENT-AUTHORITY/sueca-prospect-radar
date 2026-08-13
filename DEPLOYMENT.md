# DEPLOYMENT — SUECA PROSPECT RADAR

Production topology (all free tiers):

```
Vercel  ──────────────►  Render  ──────────────►  Supabase
(frontend, static SPA)   (FastAPI + engine + SSE) (PostgreSQL)
```

The prospecting engine runs long OpenStreetMap scans, a background worker and a
live SSE feed, so the backend must be an **always-on web service** (Render),
not a serverless function. The frontend is a static Vite bundle on Vercel and
talks to the backend via `VITE_API_URL`.

---

## 0. Prerequisites

- A private GitHub repository with this project pushed to it.
- A Supabase project (done) — the `DATABASE_URL` Session pooler URI.
- Free accounts: [github.com](https://github.com), [render.com](https://render.com), [vercel.com](https://vercel.com).

## 1. Data (Supabase) — already migrated

Data lives in Supabase PostgreSQL. Local SQLite (`backend/data/sueca.db`) and
`backups/` remain as rollback. To re-run the load from SQLite:

```bash
# set DATABASE_URL in backend/.env, then:
python scripts/migrate_sqlite_to_postgres.py         # drops+recreates, loads, validates
```

## 2. Access code

The gate is single-user. Pick a code and hash it (plaintext never leaves your
machine or the repo):

```bash
python scripts/make_access_hash.py "your access code"
# -> prints the SHA-256 hash to put in ACCESS_CODE_HASH
```

## 3. Backend on Render

The repo ships a Blueprint (`render.yaml`). Either use it (New → Blueprint) or
create a Web Service manually with:

- **Root Directory:** `backend`
- **Build:** `pip install -r requirements.txt`
- **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health check path:** `/api/health`
- **Plan:** Free

Environment variables (Render → Environment):

| Key | Value |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Supabase Session pooler URI |
| `ACCESS_CODE_HASH` | output of `make_access_hash.py` |
| `SESSION_SECRET` | long random string (Render can generate) |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://sueca-prospect-radar.vercel.app` |

Note: the free plan sleeps after ~15 min idle and cold-starts in ~30 s.

## 4. Frontend on Vercel

Import the repo in Vercel with:

- **Root Directory:** `frontend`
- Framework preset: **Vite** (auto). `vercel.json` adds the SPA rewrite so
  client-side routes resolve to `index.html`.
- Environment variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | your Render URL, e.g. `https://sueca-prospect-radar-api.onrender.com` |

Deploy. Then copy the Vercel URL back into the Render `CORS_ORIGINS` var and
redeploy the backend (so the browser's cookies are accepted cross-site).

## 5. Production checks

Open the Vercel URL in an incognito window and verify:

1. The access screen appears; a wrong code is rejected.
2. The correct code logs in → dashboard shows real metrics (107 prospects).
3. Map, Prospects, Profile, Pipeline (status change), Search Runs all load.
4. Start a prospecting run → live events stream → a company is saved.
5. Reload → data persists. Log out → back to the access screen.

## 6. Rollback

- Local dev still runs on SQLite unchanged: unset `DATABASE_URL` (or point it at
  `sqlite:///./data/sueca.db`) and `uvicorn main:app --reload`.
- The pre-migration snapshot is in `backups/sueca_radar_pre_supabase_*.db`.
- Vercel and Render keep previous deploys; roll back from their dashboards.

## Environment variables reference

**Backend** (`backend/.env.example`): `APP_ENV`, `DATABASE_URL`, `SESSION_SECRET`,
`ACCESS_CODE_HASH`, `CORS_ORIGINS`, `MAX_RESULTS_PER_RUN`, `MAX_ACTIVE_RUNS`,
plus OSM provider + engine tunables.

**Frontend** (`frontend/.env.example`): `VITE_API_URL`.

Secrets live only in the host dashboards and local `.env` (gitignored) — never
in the repo.
