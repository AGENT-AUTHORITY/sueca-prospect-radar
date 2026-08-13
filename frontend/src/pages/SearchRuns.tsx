import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { api } from "../lib/api";
import type { SearchEvent, SearchRun } from "../lib/types";
import { clockTime, timeAgo } from "../lib/format";
import { useT } from "../lib/i18n";

function duration(run: SearchRun): string {
  if (!run.finished_at) return "—";
  const a = new Date(run.started_at + "Z").getTime();
  const b = new Date(run.finished_at + "Z").getTime();
  const s = Math.max(0, Math.round((b - a) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

const STATUS_TONE: Record<string, string> = {
  completed: "#1f8a54",
  processing: "#315f9c",
  stopped: "#b04747",
  error: "#b04747",
  queued: "#8a94a1",
};

export function SearchRuns() {
  const [runs, setRuns] = useState<SearchRun[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [events, setEvents] = useState<SearchEvent[]>([]);

  useEffect(() => { api.runs().then(setRuns); }, []);

  const { t, industry: industryLabel } = useT();

  const toggle = (id: number) => {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    api.runEvents(id).then(setEvents);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-5 py-3.5">
        <History size={16} className="text-[var(--color-sueca-blue)]" />
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">{t("runs.title")}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
              <th className="px-5 py-3 font-semibold" />
              <th className="px-3 py-3 font-semibold">{t("runs.territory")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.industries")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.queries")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.found")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.new")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.dupes")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.duration")}</th>
              <th className="px-3 py-3 font-semibold">{t("runs.status")}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <>
                <tr
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className="cursor-pointer border-b border-[var(--color-line)] transition-colors hover:bg-[var(--color-canvas)]"
                >
                  <td className="px-5 py-3 text-[var(--color-ink-soft)]">
                    {open === r.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-[var(--color-ink)]">{r.location}</div>
                    <div className="text-[11px] text-[var(--color-ink-soft)]">{timeAgo(r.started_at)}</div>
                  </td>
                  <td className="px-3 py-3 text-[var(--color-ink-soft)]">
                    {(r.industries ?? []).map(industryLabel).join(", ")}
                  </td>
                  <td className="tnum px-3 py-3 text-[var(--color-ink-soft)]">{r.queries_completed}/{r.queries_generated}</td>
                  <td className="tnum px-3 py-3 text-[var(--color-ink)]">{r.companies_found}</td>
                  <td className="tnum px-3 py-3 font-semibold text-[var(--color-hi)]">+{r.new_companies}</td>
                  <td className="tnum px-3 py-3 text-[var(--color-ink-soft)]">{r.duplicates}</td>
                  <td className="tnum px-3 py-3 text-[var(--color-ink-soft)]">{duration(r)}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
                      style={{ color: STATUS_TONE[r.status], background: `${STATUS_TONE[r.status]}18` }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-canvas)]">
                    <td colSpan={9} className="px-5 py-4">
                      <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-[var(--color-line)] bg-white p-3">
                        {events.map((e) => (
                          <div key={e.id} className="flex items-start gap-2.5 text-[13px]">
                            <span className="tnum font-mono text-[10.5px] text-[var(--color-ink-soft)]">{clockTime(e.ts)}</span>
                            <span className={e.level === "error" ? "text-[#b04747]" : "text-[var(--color-ink)]"}>{e.message}</span>
                          </div>
                        ))}
                        {events.length === 0 && <p className="text-xs text-[var(--color-ink-soft)]">{t("runs.noEvents")}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {runs.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-[var(--color-ink-soft)]">{t("runs.noRuns")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
