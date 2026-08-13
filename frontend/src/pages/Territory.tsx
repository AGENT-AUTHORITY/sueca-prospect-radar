import { useEffect, useMemo, useState } from "react";
import { Building2, Star, PhoneCall, Handshake } from "lucide-react";
import { api } from "../lib/api";
import type { DashboardData, Industry, MapPoint } from "../lib/types";
import { ProspectMap } from "../components/ProspectMap";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { useT } from "../lib/i18n";

export function Territory() {
  const { t, industry: industryLabel } = useT();
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [industry, setIndustry] = useState("");
  const [priority, setPriority] = useState("");
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    api.mapPoints().then(setPoints);
    api.industries().then(setIndustries);
    api.dashboard().then(setData);
  }, []);

  const cities = useMemo(
    () => [...new Set(points.map((p) => p.city).filter(Boolean))] as string[],
    [points],
  );

  const filtered = useMemo(
    () =>
      points.filter(
        (p) =>
          (!industry || p.industry === industry) &&
          (!priority || p.priority === priority) &&
          (!city || p.city === city),
      ),
    [points, industry, priority, city],
  );

  const m = data?.metrics;
  const stats = [
    { label: t("territory.detected"), value: m?.prospects_found ?? 0, icon: Building2, color: "#315f9c" },
    { label: t("territory.highPriority"), value: m?.high_priority ?? 0, icon: Star, color: "#1f8a54" },
    { label: t("territory.contacted"), value: m?.contacted ?? 0, icon: PhoneCall, color: "#2b8fb3" },
    { label: t("territory.opportunities"), value: m?.opportunities ?? 0, icon: Handshake, color: "#b8791b" },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-card)]">
              <s.icon size={16} style={{ color: s.color }} />
              <div className="tnum mt-1.5 text-2xl font-bold text-[var(--color-ink)]">{s.value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-soft)]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">{t("territory.filters")}</h3>
          <div className="space-y-3">
            <Field label={t("territory.industry")}>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="filter-select">
                <option value="">{t("common.all")}</option>
                {industries.map((i) => <option key={i.key} value={i.key}>{industryLabel(i.key)}</option>)}
              </select>
            </Field>
            <Field label={t("territory.priority")}>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="filter-select">
                <option value="">{t("common.all")}</option>
                {["HIGH", "MEDIUM", "LOW"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label={t("territory.locality")}>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="filter-select">
                <option value="">{t("common.all")}</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 rounded-lg bg-[var(--color-canvas)] px-3 py-2 text-center">
            <span className="tnum text-lg font-bold text-[var(--color-ink)]">{filtered.length}</span>
            <span className="ml-1.5 text-xs text-[var(--color-ink-soft)]">{t("territory.shownOnMap")}</span>
          </div>
        </div>
      </div>

      <div>
        <ProspectMap
          points={filtered}
          onSelect={setSelected}
          onAddToPipeline={async (id) => {
            await api.changeStatus(id, "READY_TO_CONTACT", "Added from territory map").catch(() => {});
            api.mapPoints().then(setPoints);
          }}
          className="h-[calc(100vh-11rem)] min-h-[520px]"
        />
      </div>

      {selected != null && (
        <ProspectDrawer prospectId={selected} onClose={() => setSelected(null)} onChanged={() => api.mapPoints().then(setPoints)} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  );
}
