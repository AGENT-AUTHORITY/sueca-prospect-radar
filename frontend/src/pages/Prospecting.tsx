import { useEffect, useMemo, useState } from "react";
import { Play, Square, MapPin, Sparkles, ChevronRight, RefreshCw, Radar, Truck } from "lucide-react";
import { api } from "../lib/api";
import type { Industry, Location, MapPoint, Priority, SearchEvent } from "../lib/types";
import { LiveFeed } from "../components/LiveFeed";
import { ProspectMap } from "../components/ProspectMap";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { useT } from "../lib/i18n";

interface HighHit {
  id: number;
  name: string;
  score: number;
  volvo: string | null;
}

interface Counters {
  found: number;
  saved: number;
  high: number;
  duplicates: number;
}
const ZERO: Counters = { found: 0, saved: 0, high: 0, duplicates: 0 };

export function Prospecting() {
  const { t, industry: industryLabel } = useT();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [location, setLocation] = useState("Cañuelas");
  const [radius, setRadius] = useState(8000);
  const [maxResults, setMaxResults] = useState(30);
  const [refresh, setRefresh] = useState(false);
  const [selectedInd, setSelectedInd] = useState<Set<string>>(new Set(["industria", "combustible"]));

  const [runId, setRunId] = useState<number | null>(null);
  const [counters, setCounters] = useState<Counters>(ZERO);
  const [livePoints, setLivePoints] = useState<MapPoint[]>([]);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [highBanner, setHighBanner] = useState<HighHit | null>(null);
  const [queriesDone, setQueriesDone] = useState(0);
  const [currentQuery, setCurrentQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.industries().then(setIndustries);
    api.locations(true).then(setLocations);
  }, []);

  const toggleInd = (key: string) => {
    setSelectedInd((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const start = async () => {
    if (selectedInd.size === 0) {
      setError(t("prospecting.selectIndustry"));
      return;
    }
    setError(null);
    setCounters(ZERO);
    setLivePoints([]);
    setNewIds(new Set());
    setHighBanner(null);
    setQueriesDone(0);
    setCurrentQuery("");
    try {
      const res = await api.startSearch({
        location,
        territory: "Territorio comercial",
        radius,
        max_results: maxResults,
        industries: [...selectedInd],
        refresh,
      });
      setRunId(res.run_id);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const stop = async () => {
    if (runId != null) await api.stopSearch(runId).catch(() => {});
  };

  const onEvent = (e: SearchEvent) => {
    if (e.type === "QUERY_STARTED") {
      setQueriesDone((n) => n + 1);
      setCurrentQuery((e.payload?.industry as string) ?? "");
    }
    if (e.type === "COMPANY_FOUND") setCounters((c) => ({ ...c, found: c.found + 1 }));
    if (e.type === "COMPANY_DUPLICATE") setCounters((c) => ({ ...c, duplicates: c.duplicates + 1 }));
    if (e.type === "ERROR") setError(e.message);
    if (e.type === "COMPANY_SAVED" && e.payload) {
      const p = e.payload as Record<string, unknown>;
      const priority = (p.priority as Priority) ?? "LOW";
      const volvo = (p.volvo_family as string) ?? null;
      setCounters((c) => ({
        ...c,
        saved: c.saved + 1,
        high: c.high + (priority === "HIGH" ? 1 : 0),
      }));
      if (e.prospect_id != null && p.lat != null && p.lon != null) {
        const point: MapPoint = {
          id: e.prospect_id,
          company_name: (p.name as string) ?? "Prospect",
          industry: (p.industry as string) ?? null,
          city: (p.city as string) ?? null,
          score: (p.score as number) ?? 0,
          priority,
          status: "NEW",
          volvo_family: volvo,
          lat: p.lat as number,
          lon: p.lon as number,
        };
        setLivePoints((prev) => [...prev, point]);
        setNewIds((prev) => new Set(prev).add(point.id));
      }
      if (priority === "HIGH" && e.prospect_id != null) {
        setHighBanner({
          id: e.prospect_id, name: (p.name as string) ?? "Prospect",
          score: (p.score as number) ?? 0, volvo,
        });
      }
    }
  };

  const onDone = () => {
    setRunId(null);
    setCurrentQuery("");
  };

  const addToPipeline = async (id: number) => {
    await api.changeStatus(id, "READY_TO_CONTACT", "Added from prospecting map").catch(() => {});
  };

  const running = runId != null;
  const centerLoc = useMemo(
    () => locations.find((l) => l.name === location),
    [locations, location],
  );

  return (
    <div className="space-y-6">
      {/* Scanning status header */}
      {running && (
        <div className="animate-fade-up overflow-hidden rounded-xl border border-[var(--color-sueca-light)]/40 bg-gradient-to-r from-[var(--color-sueca-deep)] to-[var(--color-sueca-dark)] px-5 py-4 text-white shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Radar size={20} className="animate-spin-slow text-[#9cc0ea]" />
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#9cc0ea]">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#4ade80]" /> {t("prospecting.scanningTerritory")}
                </div>
                <div className="text-base font-semibold">
                  {location}
                  {currentQuery && (
                    <span className="ml-2 text-sm font-normal text-[#9cc0ea]">
                      · {industryLabel(currentQuery)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-3 text-center sm:flex sm:w-auto sm:items-center sm:gap-6">
              <ScanStat label={t("prospecting.query")} value={`${Math.min(queriesDone, selectedInd.size)}/${selectedInd.size}`} />
              <ScanStat label={t("prospecting.detected")} value={counters.found} />
              <ScanStat label={t("prospecting.newProspects")} value={counters.saved} accent="#4ade80" />
              <ScanStat label={t("prospecting.high")} value={counters.high} accent="#4ade80" />
              <ScanStat label={t("prospecting.duplicates")} value={counters.duplicates} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* Config panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
              <MapPin size={15} className="text-[var(--color-sueca-blue)]" /> {t("prospecting.searchParameters")}
            </h2>

            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">{t("prospecting.location")}</label>
            <div className="mb-4 flex gap-2">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={running}
                className="flex-1 rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-sueca-blue)]"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
                {!locations.some((l) => l.name === location) && <option value={location}>{location}</option>}
              </select>
            </div>

            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">
              {t("prospecting.radius")} · <span className="tnum font-semibold text-[var(--color-ink)]">{(radius / 1000).toFixed(0)} km</span>
            </label>
            <input
              type="range" min={3000} max={20000} step={1000} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              disabled={running}
              className="mb-4 w-full accent-[var(--color-sueca-blue)]"
            />

            <label className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">
              {t("prospecting.maxResults")} · <span className="tnum font-semibold text-[var(--color-ink)]">{maxResults}</span>
            </label>
            <input
              type="range" min={5} max={60} step={5} value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              disabled={running}
              className="mb-4 w-full accent-[var(--color-sueca-blue)]"
            />

            <label className="mb-2 block text-xs font-medium text-[var(--color-ink-soft)]">{t("prospecting.industries")}</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {industries.map((ind) => {
                const on = selectedInd.has(ind.key);
                return (
                  <button
                    key={ind.key}
                    onClick={() => !running && toggleInd(ind.key)}
                    disabled={running}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? "border-[var(--color-sueca-blue)] bg-[var(--color-sueca-blue)] text-white"
                        : "border-[var(--color-line)] bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-sueca-light)]"
                    }`}
                  >
                    {industryLabel(ind.key)}
                  </button>
                );
              })}
            </div>

            <label className="mb-4 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
              <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} disabled={running}
                className="accent-[var(--color-sueca-blue)]" />
              <RefreshCw size={12} /> {t("prospecting.rescan")}
            </label>

            {error && (
              <div className="mb-3 rounded-lg border border-[#f0c9c9] bg-[#fbeeee] px-3 py-2 text-xs text-[#b04747]">
                {error}
              </div>
            )}

            {!running ? (
              <button
                onClick={start}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-sueca-blue)] py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--color-sueca-dark)]"
              >
                <Play size={17} /> {t("prospecting.start")}
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#b04747] py-3 text-sm font-bold text-white transition-colors hover:brightness-110"
              >
                <Square size={16} /> {t("prospecting.stop")}
              </button>
            )}
          </div>

          {/* Live counters */}
          <div className="grid grid-cols-2 gap-3">
            <Counter label={t("prospecting.detected")} value={counters.found} />
            <Counter label={t("prospecting.newProspects")} value={counters.saved} accent="#1f8a54" />
            <Counter label={t("prospecting.high")} value={counters.high} accent="#1f8a54" />
            <Counter label={t("prospecting.duplicates")} value={counters.duplicates} accent="#8a94a1" />
          </div>
        </div>

        {/* Live feed */}
        <div className="h-[460px] sm:h-[560px]">
          <LiveFeed runId={runId} onEvent={onEvent} onDone={onDone} />
        </div>
      </div>

      {/* High priority prospect detected — elegant event card */}
      {highBanner && (
        <button
          onClick={() => setSelected(highBanner.id)}
          className="animate-fade-up flex w-full flex-wrap items-center gap-3 rounded-xl border border-[var(--color-sueca-light)]/50 bg-gradient-to-r from-[var(--color-sueca-deep)] to-[var(--color-sueca-dark)] px-4 py-4 text-left text-white shadow-[var(--shadow-pop)] sm:flex-nowrap sm:gap-4 sm:px-5"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/12">
            <Sparkles size={22} className="text-[#9cc0ea]" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9cc0ea]">
              {t("prospecting.highDetected")}
            </div>
            <div className="text-lg font-bold leading-tight">{highBanner.name}</div>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <div className="text-right">
              <div className="tnum text-2xl font-bold text-white">{highBanner.score}</div>
              <div className="text-[10px] uppercase tracking-wide text-[#9cc0ea]">/ 100</div>
            </div>
            {highBanner.volvo && (
              <div className="rounded-lg bg-white/12 px-3 py-2 text-center">
                <div className="flex items-center gap-1 text-sm font-bold">
                  <Truck size={14} /> {highBanner.volvo}
                </div>
                <div className="text-[9px] uppercase tracking-wide text-[#9cc0ea]">{t("prospecting.potential")}</div>
              </div>
            )}
            <ChevronRight size={20} className="text-[#9cc0ea]" />
          </div>
        </button>
      )}

      {/* Live map */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
          {t("prospecting.liveMap")}
        </h2>
        <ProspectMap
          points={livePoints}
          onSelect={setSelected}
          onAddToPipeline={addToPipeline}
          newIds={newIds}
          center={centerLoc?.latitude ? [centerLoc.latitude, centerLoc.longitude!] : undefined}
          className="h-[340px] sm:h-[380px]"
        />
      </div>

      {selected != null && (
        <ProspectDrawer prospectId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ScanStat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div>
      <div className="tnum text-xl font-bold" style={{ color: accent ?? "#fff" }}>{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-[#9cc0ea]">{label}</div>
    </div>
  );
}

function Counter({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-card)]">
      <div className="tnum text-2xl font-bold" style={{ color: accent ?? "var(--color-ink)" }}>
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">{label}</div>
    </div>
  );
}
