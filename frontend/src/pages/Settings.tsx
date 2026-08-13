import { useEffect, useState } from "react";
import { Save, Plus, Check } from "lucide-react";
import { api } from "../lib/api";
import type { Industry, Location } from "../lib/types";
import { useT } from "../lib/i18n";

export function SettingsPage() {
  const { t, industry: industryLabel } = useT();
  const [engine, setEngine] = useState<Record<string, number>>({});
  const [scoring, setScoring] = useState<Record<string, number>>({});
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [newLoc, setNewLoc] = useState("");

  const load = () => {
    api.settings().then((s) => { setEngine(s.engine); setScoring(s.scoring_rules); });
    api.industries().then(setIndustries);
    api.locations().then(setLocations);
  };
  useEffect(load, []);

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(null), 2000); };

  const saveEngine = async () => { await api.updateSetting("engine", engine); flash(t("settings.engineSaved")); };
  const saveScoring = async () => { await api.updateSetting("scoring_rules", scoring); flash(t("settings.scoringSaved")); };
  const toggleInd = async (key: string, active: boolean) => {
    await api.toggleIndustry(key, active);
    setIndustries((prev) => prev.map((i) => (i.key === key ? { ...i, active } : i)));
  };
  const addLoc = async () => {
    if (!newLoc.trim()) return;
    await api.addLocation({ name: newLoc.trim() });
    setNewLoc("");
    api.locations().then(setLocations);
    flash(t("settings.locationAdded"));
  };

  const ENGINE_FIELDS: { key: string; label: string; step: number }[] = [
    { key: "radius_meters", label: t("settings.defaultRadius"), step: 1000 },
    { key: "result_limit", label: t("settings.resultLimit"), step: 5 },
    { key: "request_delay_seconds", label: t("settings.requestDelay"), step: 0.1 },
    { key: "max_concurrency", label: t("settings.maxConcurrency"), step: 1 },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {saved && (
        <div className="fixed right-8 top-20 z-50 flex items-center gap-2 rounded-lg bg-[var(--color-hi)] px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          <Check size={16} /> {saved}
        </div>
      )}

      <Panel title={t("settings.engine")} onSave={saveEngine}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ENGINE_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">{f.label}</span>
              <input
                type="number" step={f.step} value={engine[f.key] ?? 0}
                onChange={(e) => setEngine({ ...engine, [f.key]: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sueca-blue)]"
              />
            </label>
          ))}
        </div>
      </Panel>

      <Panel title={t("settings.scoringRules")} onSave={saveScoring}>
        <p className="mb-3 text-xs text-[var(--color-ink-soft)]">{t("settings.scoringHint")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Object.entries(scoring).map(([k, v]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">{k.replace(/_/g, " ")}</span>
              <input
                type="number" value={v}
                onChange={(e) => setScoring({ ...scoring, [k]: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sueca-blue)]"
              />
            </label>
          ))}
        </div>
      </Panel>

      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">{t("settings.activeIndustries")}</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {industries.map((ind) => (
            <label key={ind.key} className="flex items-center justify-between rounded-lg border border-[var(--color-line)] px-3 py-2.5">
              <div>
                <div className="text-sm font-medium text-[var(--color-ink)]">{industryLabel(ind.key)}</div>
                <div className="text-[11px] text-[var(--color-ink-soft)]">{t("settings.baseWeight")} {ind.base_weight}</div>
              </div>
              <input type="checkbox" checked={ind.active} onChange={(e) => toggleInd(ind.key, e.target.checked)}
                className="h-4 w-4 accent-[var(--color-sueca-blue)]" />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">{t("settings.territoryLocations")}</h2>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newLoc} onChange={(e) => setNewLoc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addLoc()}
            placeholder={t("settings.addLocality")}
            className="flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sueca-blue)]"
          />
          <button onClick={addLoc} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-sueca-blue)] px-4 text-sm font-medium text-white hover:bg-[var(--color-sueca-dark)]">
            <Plus size={15} /> {t("common.add")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {locations.map((l) => (
            <span key={l.id} className="rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-1 text-xs text-[var(--color-ink)]">
              {l.name}{l.latitude ? "" : ` ${t("settings.needsGeocode")}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, onSave, children }: { title: string; onSave: () => void; children: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">{title}</h2>
        <button onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-sueca-blue)] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-sueca-dark)]">
          <Save size={14} /> {t("common.save")}
        </button>
      </div>
      {children}
    </div>
  );
}
