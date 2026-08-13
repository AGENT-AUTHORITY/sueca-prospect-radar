import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Star, PhoneCall, Handshake, Trophy, CalendarClock, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import type { DashboardData, MapPoint, Prospect } from "../lib/types";
import { MetricCard } from "../components/MetricCard";
import { ProspectMap } from "../components/ProspectMap";
import { ScoreBadge, StatusBadge } from "../components/badges";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { timeAgo } from "../lib/format";
import { useT } from "../lib/i18n";

export function Dashboard() {
  const { t, industry } = useT();
  const [data, setData] = useState<DashboardData | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [recent, setRecent] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const load = () => {
    api.dashboard().then(setData);
    api.mapPoints().then(setPoints);
    api.prospects({ sort: "created_at", order: "desc", limit: 8 }).then((r) => setRecent(r.items));
  };
  useEffect(load, []);

  const m = data?.metrics;
  const cards = [
    { label: t("metrics.prospectsFound"), value: m?.prospects_found ?? 0, icon: <Building2 size={18} />, accent: "#315f9c" },
    { label: t("metrics.highPriority"), value: m?.high_priority ?? 0, icon: <Star size={18} />, accent: "#1f8a54" },
    { label: t("metrics.contacted"), value: m?.contacted ?? 0, icon: <PhoneCall size={18} />, accent: "#2b8fb3" },
    { label: t("metrics.meetings"), value: m?.meetings ?? 0, icon: <CalendarClock size={18} />, accent: "#8a5cd1" },
    { label: t("metrics.opportunities"), value: m?.opportunities ?? 0, icon: <Handshake size={18} />, accent: "#b8791b" },
    { label: t("metrics.won"), value: m?.won ?? 0, icon: <Trophy size={18} />, accent: "#137a3e" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
              {t("dashboard.territoryMap")}
            </h2>
            <Link to="/territory" className="flex items-center gap-1 text-xs font-medium text-[var(--color-sueca-blue)] hover:underline">
              {t("dashboard.fullTerritory")} <ArrowRight size={13} />
            </Link>
          </div>
          <ProspectMap
            points={points}
            onSelect={setSelected}
            onAddToPipeline={async (id) => {
              await api.changeStatus(id, "READY_TO_CONTACT", "Added from dashboard map").catch(() => {});
              load();
            }}
            className="h-[360px] sm:h-[420px]"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
              {t("dashboard.topVolvoFit")}
            </h2>
            <VolvoFit byVolvo={m?.by_volvo ?? {}} />
          </div>

          <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
              {t("dashboard.byIndustry")}
            </h2>
            <IndustryBars byIndustry={m?.by_industry ?? {}} />
          </div>

          <div className="flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                {t("dashboard.recentRuns")}
              </h2>
              <Link to="/runs" className="text-xs font-medium text-[var(--color-sueca-blue)] hover:underline">
                {t("common.all")}
              </Link>
            </div>
            <div className="space-y-2">
              {(data?.recent_runs ?? []).length === 0 && (
                <p className="text-sm text-[var(--color-ink-soft)]">{t("dashboard.noRuns")}</p>
              )}
              {(data?.recent_runs ?? []).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-[var(--color-ink)]">{r.location}</div>
                    <div className="text-[11px] text-[var(--color-ink-soft)]">{timeAgo(r.started_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="tnum font-semibold text-[var(--color-hi)]">+{r.new_companies}</div>
                    <div className="text-[11px] text-[var(--color-ink-soft)]">{r.status}</div>
                  </div>
                </div>
              ))}
              <Link
                to="/prospecting"
                className="mt-1 block rounded-lg bg-[var(--color-sueca-mist)] py-2 text-center text-sm font-semibold text-[var(--color-sueca-dark)] hover:bg-[#dfeaf6]"
              >
                {t("dashboard.startProspecting")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent prospects */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            {t("dashboard.recentProspects")}
          </h2>
          <Link to="/prospects" className="flex items-center gap-1 text-xs font-medium text-[var(--color-sueca-blue)] hover:underline">
            {t("common.viewAll")} <ArrowRight size={13} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
                <th className="px-5 py-2.5 font-semibold">{t("dashboard.company")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("dashboard.industry")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("dashboard.city")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("dashboard.score")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("dashboard.status")}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="cursor-pointer border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-canvas)]"
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">{p.company_name}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-soft)]">{industry(p.industry)}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-soft)]">{p.city ?? "—"}</td>
                  <td className="px-3 py-3"><ScoreBadge score={p.score} priority={p.priority} /></td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[var(--color-ink-soft)]">
                    {t("dashboard.noProspects")}{" "}
                    <Link to="/prospecting" className="font-medium text-[var(--color-sueca-blue)] hover:underline">{t("dashboard.runFirst")}</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected != null && (
        <ProspectDrawer prospectId={selected} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}

function VolvoFit({ byVolvo }: { byVolvo: Record<string, number> }) {
  const { t } = useT();
  const families = [
    { key: "FH", desc: t("dashboard.longHaul") },
    { key: "FM", desc: t("dashboard.regional") },
    { key: "FMX", desc: t("dashboard.severe") },
  ];
  const total = Object.values(byVolvo).reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="text-sm text-[var(--color-ink-soft)]">{t("common.noData")}</p>;
  return (
    <div className="grid grid-cols-3 gap-3">
      {families.map((f) => (
        <div key={f.key} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-3 text-center">
          <div className="grid place-items-center">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-sueca-deep)] text-xs font-extrabold text-white">
              {f.key}
            </span>
          </div>
          <div className="tnum mt-2 text-xl font-bold text-[var(--color-ink)]">{byVolvo[f.key] ?? 0}</div>
          <div className="text-[10px] leading-tight text-[var(--color-ink-soft)]">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

function IndustryBars({ byIndustry }: { byIndustry: Record<string, number> }) {
  const { t, industry } = useT();
  const entries = Object.entries(byIndustry).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-[var(--color-ink-soft)]">{t("common.noData")}</p>;
  return (
    <div className="space-y-2.5">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-[var(--color-ink)]">{industry(k)}</span>
            <span className="tnum font-semibold text-[var(--color-ink-soft)]">{v}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-canvas)]">
            <div
              className="h-full rounded-full bg-[var(--color-sueca-blue)]"
              style={{ width: `${(v / max) * 100}%`, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
