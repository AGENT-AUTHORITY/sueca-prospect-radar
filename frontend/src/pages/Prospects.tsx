import { useEffect, useMemo, useState } from "react";
import { Search, Download, Phone, Globe, Truck, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { api, type ProspectQuery } from "../lib/api";
import type { Industry, Prospect } from "../lib/types";
import { ScoreBadge, StatusBadge } from "../components/badges";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { timeAgo } from "../lib/format";
import { useT } from "../lib/i18n";

const PAGE = 20;
const STATUSES = [
  "NEW", "RESEARCHING", "READY_TO_CONTACT", "CONTACTED", "FOLLOW_UP",
  "MEETING", "OPPORTUNITY", "QUOTED", "NEGOTIATION", "WON", "LOST", "NO_FIT",
];

export function Prospects() {
  const { t, industry: industryLabel, status: statusLabel } = useT();
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [items, setItems] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [fleet, setFleet] = useState(false);
  const [sort, setSort] = useState("score");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    api.industries().then(setIndustries);
  }, []);

  const query: ProspectQuery = useMemo(
    () => ({
      search: search || undefined,
      industry: industry || undefined,
      priority: priority || undefined,
      status: status || undefined,
      min_score: minScore || undefined,
      has_phone: hasPhone || undefined,
      has_website: hasWebsite || undefined,
      fleet_signal: fleet || undefined,
      sort,
      order,
    }),
    [search, industry, priority, status, minScore, hasPhone, hasWebsite, fleet, sort, order],
  );

  const load = () => {
    api.prospects({ ...query, limit: PAGE, offset: page * PAGE }).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  };
  useEffect(load, [query, page]);
  useEffect(() => setPage(0), [query]);

  const toggleSort = (col: string) => {
    if (sort === col) setOrder((o) => (o === "desc" ? "asc" : "desc"));
    else {
      setSort(col);
      setOrder("desc");
    }
  };

  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[16rem] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-soft)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("prospects.searchPlaceholder")}
              className="w-full rounded-lg border border-[var(--color-line)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-sueca-blue)]"
            />
          </div>
          <Select value={industry} onChange={setIndustry} placeholder={t("prospects.allIndustries")}>
            {industries.map((i) => <option key={i.key} value={i.key}>{industryLabel(i.key)}</option>)}
          </Select>
          <Select value={priority} onChange={setPriority} placeholder={t("prospects.allPriorities")}>
            {["HIGH", "MEDIUM", "LOW"].map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={status} onChange={setStatus} placeholder={t("prospects.allStatuses")}>
            {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </Select>
          <a
            href={api.exportCsvUrl(query)}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-sueca-blue)] hover:text-[var(--color-sueca-blue)]"
          >
            <Download size={15} /> {t("prospects.exportCsv")}
          </a>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--color-ink-soft)]">
          <label className="flex items-center gap-2">
            {t("prospects.minScore")}
            <input type="range" min={0} max={100} step={5} value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))} className="accent-[var(--color-sueca-blue)]" />
            <span className="tnum w-6 font-semibold text-[var(--color-ink)]">{minScore}</span>
          </label>
          <Check label={t("prospects.hasPhone")} checked={hasPhone} onChange={setHasPhone} />
          <Check label={t("prospects.hasWebsite")} checked={hasWebsite} onChange={setHasWebsite} />
          <Check label={t("prospects.fleetSignal")} checked={fleet} onChange={setFleet} />
          <span className="ml-auto tnum font-medium text-[var(--color-ink)]">{total} {t("prospects.prospects")}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-left text-[11px] uppercase tracking-wider text-[var(--color-ink-soft)]">
                <Th onClick={() => toggleSort("company_name")}>{t("prospects.company")}</Th>
                <th className="px-3 py-3 font-semibold">{t("prospects.industry")}</th>
                <th className="px-3 py-3 font-semibold">{t("prospects.city")}</th>
                <Th onClick={() => toggleSort("score")}>{t("prospects.score")}</Th>
                <th className="px-3 py-3 font-semibold">{t("prospects.volvoFit")}</th>
                <th className="px-3 py-3 font-semibold">{t("prospects.contact")}</th>
                <th className="px-3 py-3 font-semibold">{t("prospects.status")}</th>
                <Th onClick={() => toggleSort("updated_at")}>{t("prospects.lastActivity")}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className="cursor-pointer border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-canvas)]"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--color-ink)]">{p.company_name}</div>
                    {p.fleet_signal && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-[var(--color-mid)]">
                        <Truck size={11} /> {t("prospects.fleetTag")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--color-ink-soft)]">{industryLabel(p.industry)}</td>
                  <td className="px-3 py-3 text-[var(--color-ink-soft)]">{p.city ?? "—"}</td>
                  <td className="px-3 py-3"><ScoreBadge score={p.score} priority={p.priority} /></td>
                  <td className="px-3 py-3">
                    {p.volvo_family ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-sueca-mist)] px-2 py-0.5 text-xs font-bold text-[var(--color-sueca-dark)]">
                        <Truck size={12} /> {p.volvo_family}
                      </span>
                    ) : <span className="text-[var(--color-lo)]">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5 text-[var(--color-ink-soft)]">
                      <Phone size={14} className={p.phone ? "text-[var(--color-hi)]" : "opacity-30"} />
                      <Globe size={14} className={p.website ? "text-[var(--color-sueca-blue)]" : "opacity-30"} />
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-3 text-[var(--color-ink-soft)]">{timeAgo(p.updated_at)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-[var(--color-ink-soft)]">
                    {t("prospects.noMatch")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3 text-sm">
            <span className="text-[var(--color-ink-soft)]">{t("common.page")} {page + 1} {t("common.of")} {pages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 disabled:opacity-40 hover:border-[var(--color-sueca-blue)]"
              >
                <ChevronLeft size={15} /> {t("common.prev")}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={page >= pages - 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 disabled:opacity-40 hover:border-[var(--color-sueca-blue)]"
              >
                {t("common.next")} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected != null && (
        <ProspectDrawer prospectId={selected} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th onClick={onClick} className="cursor-pointer select-none px-4 py-3 font-semibold hover:text-[var(--color-sueca-blue)]">
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown size={11} /></span>
    </th>
  );
}

function Select({
  value, onChange, placeholder, children,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-sueca-blue)]"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[var(--color-sueca-blue)]" />
      {label}
    </label>
  );
}
