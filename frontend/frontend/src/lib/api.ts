import type {
  DashboardData,
  HistoryEntry,
  Industry,
  Location,
  MapPoint,
  Note,
  Prospect,
  SearchEvent,
  SearchRun,
  StartSearchBody,
} from "./types";

// Keep production requests same-origin so mobile browsers do not treat the
// signed session cookie as a third-party cookie. Vercel proxies /api to Render.
// Development may still opt into an explicit API URL when needed.
const API_ROOT = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")
  : "";
const BASE = `${API_ROOT}/api`;

export const apiRoot = API_ROOT;

let onUnauthorized: (() => void) | null = null;
/** Register a handler invoked when a data endpoint returns 401 (expired session). */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send/receive the signed session cookie
    ...init,
  });
  if (res.status === 401 && !path.startsWith("/auth/")) {
    onUnauthorized?.();
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export interface ProspectQuery {
  search?: string;
  province?: string;
  city?: string;
  industry?: string;
  priority?: string;
  status?: string;
  min_score?: number;
  has_phone?: boolean;
  has_website?: boolean;
  fleet_signal?: boolean;
  sort?: string;
  order?: string;
  limit?: number;
  offset?: number;
}

function qs(params: Record<string, unknown> | ProspectQuery): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  dashboard: () => req<DashboardData>("/dashboard"),
  industries: (activeOnly = false) =>
    req<Industry[]>(`/industries${qs({ active_only: activeOnly })}`),
  toggleIndustry: (key: string, active: boolean) =>
    req<Industry>(`/industries/${key}/active`, {
      method: "POST",
      body: JSON.stringify({ active }),
    }),
  locations: (activeOnly = false) =>
    req<Location[]>(`/locations${qs({ active_only: activeOnly })}`),
  addLocation: (body: Partial<Location> & { name: string }) =>
    req<Location>("/locations", { method: "POST", body: JSON.stringify(body) }),

  prospects: (query: ProspectQuery = {}) =>
    req<{ total: number; items: Prospect[] }>(`/prospects${qs(query)}`),
  prospect: (id: number) => req<Prospect>(`/prospects/${id}`),
  mapPoints: () => req<MapPoint[]>("/prospects/map"),
  statuses: () => req<string[]>("/prospects/statuses"),
  patchProspect: (id: number, patch: Partial<Prospect>) =>
    req<Prospect>(`/prospects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  changeStatus: (id: number, status: string, note?: string) =>
    req<Prospect>(`/prospects/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    }),
  notes: (id: number) => req<Note[]>(`/prospects/${id}/notes`),
  addNote: (id: number, body: string, author?: string) =>
    req<Note>(`/prospects/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ body, author }),
    }),
  history: (id: number) => req<HistoryEntry[]>(`/prospects/${id}/history`),
  exportCsvUrl: (query: ProspectQuery = {}) => `${BASE}/prospects/export.csv${qs(query)}`,

  startSearch: (body: StartSearchBody) =>
    req<{ run_id: number; status: string }>("/search/start", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  stopSearch: (runId: number) =>
    req<{ run_id: number; stopping: boolean }>(`/search/runs/${runId}/stop`, {
      method: "POST",
    }),
  runs: () => req<SearchRun[]>("/search/runs"),
  run: (id: number) => req<SearchRun>(`/search/runs/${id}`),
  runEvents: (id: number, afterId = 0) =>
    req<SearchEvent[]>(`/search/runs/${id}/events${qs({ after_id: afterId })}`),
  streamUrl: (id: number) => `${BASE}/search/runs/${id}/stream`,

  settings: () => req<{ engine: Record<string, number>; scoring_rules: Record<string, number> }>("/settings"),
  updateSetting: (key: string, value: Record<string, number>) =>
    req(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),

  // Access gate
  authSession: () => req<{ authenticated: boolean }>("/auth/session"),
  login: (code: string) =>
    req<{ authenticated: boolean }>("/auth/login", { method: "POST", body: JSON.stringify({ code }) }),
  logout: () => req<{ authenticated: boolean }>("/auth/logout", { method: "POST" }),
  health: () => req<{ status: string; service?: string }>("/health"),
};
