import { useEffect, useState } from "react";
import {
  X, Phone, MessageCircle, Globe, MapPin, Link2, Truck, Plus,
  FileText, TrendingUp, Route, Boxes, Factory, CalendarClock, Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import type { HistoryEntry, Note, Prospect, ScoreReason } from "../lib/types";
import { timeAgo } from "../lib/format";
import { useT } from "../lib/i18n";
import { PriorityBadge } from "./badges";
import { ScoreRing } from "./ScoreRing";

const PIPELINE_STATUSES = [
  "NEW", "RESEARCHING", "READY_TO_CONTACT", "CONTACTED", "FOLLOW_UP",
  "MEETING", "OPPORTUNITY", "QUOTED", "NEGOTIATION", "WON", "LOST", "NO_FIT",
];

const CATEGORY_META: Record<string, { tKey: string; color: string }> = {
  industry_fit: { tKey: "profile.catIndustryFit", color: "#315f9c" },
  heavy_truck: { tKey: "profile.catHeavyTruck", color: "#173e73" },
  fleet: { tKey: "profile.catFleet", color: "#b8791b" },
  operation: { tKey: "profile.catOperation", color: "#2b8fb3" },
  company: { tKey: "profile.catCompany", color: "#647383" },
  negative: { tKey: "profile.catNegative", color: "#b04747" },
};

const SIGNAL_GROUPS: { icon: typeof Truck; keys: [string, string][] }[] = [
  {
    icon: Truck, keys: [
      ["truck_signal", "profile.sigTruck"], ["industrial_site", "profile.sigIndustrial"],
      ["cold_chain", "profile.sigCold"], ["severe_duty", "profile.sigSevere"],
    ],
  },
  {
    icon: Boxes, keys: [
      ["fleet_own", "profile.sigOwnFleet"], ["semitrailers", "profile.sigSemi"],
      ["tractors", "profile.sigTractor"], ["fleet_units", "profile.sigUnits"],
    ],
  },
  {
    icon: Route, keys: [
      ["long_distance", "profile.sigLong"], ["international", "profile.sigIntl"],
      ["interprovincial", "profile.sigInterprov"], ["national", "profile.sigNational"],
      ["regional_distribution", "profile.sigRegional"], ["multi_branch", "profile.sigMulti"],
      ["always_on", "profile.sigAlways"],
    ],
  },
];

function digits(s: string | null): string {
  return (s ?? "").replace(/\D/g, "");
}

function ActionButton({
  href, icon: Icon, label, tone = "default", onClick,
}: {
  href?: string; icon: typeof Phone; label: string;
  tone?: "default" | "green"; onClick?: () => void;
}) {
  const enabled = !!href || !!onClick;
  const base = "flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors";
  const cls = !enabled
    ? "cursor-not-allowed border-[var(--color-line)] bg-[var(--color-canvas)] text-[var(--color-lo)]"
    : tone === "green"
      ? "border-transparent bg-[var(--color-hi)] text-white hover:brightness-110"
      : "border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:border-[var(--color-sueca-blue)] hover:text-[var(--color-sueca-blue)]";
  const content = <><Icon size={16} />{label}</>;
  if (href && enabled)
    return <a href={href} target="_blank" rel="noreferrer" className={`${base} ${cls}`}>{content}</a>;
  return <button disabled={!enabled} onClick={onClick} className={`${base} ${cls}`}>{content}</button>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  const { t } = useT();
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-[var(--color-ink-soft)]">{label}</span>
      <span className="text-right text-[var(--color-ink)]">
        {value || <em className="not-italic text-[var(--color-lo)]">{t("common.notAvailable")}</em>}
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <h4 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
      <Icon size={13} className="text-[var(--color-sueca-blue)]" />
      {children}
    </h4>
  );
}

export function ProspectDrawer({
  prospectId, onClose, onChanged,
}: {
  prospectId: number | null; onClose: () => void; onChanged?: () => void;
}) {
  const [p, setP] = useState<Prospect | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const { t, industry, status: statusLabel, volvoDesc } = useT();

  const load = () => {
    if (prospectId == null) return;
    api.prospect(prospectId).then(setP);
    api.notes(prospectId).then(setNotes);
    api.history(prospectId).then(setHistory);
  };

  useEffect(() => {
    setP(null); setNotes([]); setHistory([]); load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId]);

  if (prospectId == null) return null;

  const changeStatus = async (status: string) => {
    if (!p) return;
    setBusy(true);
    await api.changeStatus(p.id, status, "Updated from profile");
    setBusy(false);
    load();
    onChanged?.();
  };

  const scheduleFollowUp = async () => {
    if (!p) return;
    const date = new Date(Date.now() + 3 * 864e5).toISOString();
    await api.patchProspect(p.id, { next_action: "Follow-up call", next_action_date: date });
    await api.changeStatus(p.id, "FOLLOW_UP", "Follow-up scheduled (+3 days)");
    load();
    onChanged?.();
  };

  const addNote = async () => {
    if (!p || !noteText.trim()) return;
    await api.addNote(p.id, noteText.trim(), "Sales");
    setNoteText("");
    load();
  };

  const wa = digits(p?.whatsapp ?? p?.phone ?? null);
  const grouped = groupBreakdown(p?.score_breakdown ?? []);
  const family = p?.volvo_family ?? "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[var(--color-sueca-deep)]/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-fade-up relative flex h-full w-full max-w-[31rem] flex-col overflow-hidden bg-[var(--color-surface)] shadow-2xl">
        {!p ? (
          <div className="grid flex-1 place-items-center text-sm text-[var(--color-ink-soft)]">{t("common.loading")}</div>
        ) : (
          <>
            <div className="relative bg-[var(--color-sueca-deep)] px-6 pb-5 pt-6 text-white">
              <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
                <X size={18} />
              </button>
              <div className="pr-8">
                <h2 className="text-xl font-bold leading-tight">{p.company_name}</h2>
                <p className="mt-1 text-sm text-[#9cc0ea]">
                  {industry(p.industry)}{p.subindustry ? ` · ${p.subindustry}` : ""} · {p.city ?? "—"}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Commercial potential + data confidence */}
              <div className="flex items-center gap-5 rounded-xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-4">
                <ScoreRing score={p.score} priority={p.priority} size={104} />
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">
                      {t("profile.commercialPotential")}
                    </span>
                    <PriorityBadge priority={p.priority} />
                  </div>
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">{t("profile.dataConfidence")}</span>
                      <span className="tnum font-bold text-[var(--color-ink)]">{p.data_confidence}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
                      <div className="h-full rounded-full bg-[var(--color-sueca-blue)]"
                        style={{ width: `${p.data_confidence}%`, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)" }} />
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-ink-soft)]">
                      {t("profile.dataConfidenceHint")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Potential Volvo application */}
              {family && (
                <div className="flex items-center gap-4 rounded-xl border border-[var(--color-sueca-light)]/40 bg-[var(--color-sueca-mist)] p-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[var(--color-sueca-deep)] text-white">
                    <Truck size={18} />
                    <span className="mt-0.5 text-sm font-extrabold leading-none">{family}</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-sueca-blue)]">
                      {t("profile.potentialVolvo")}
                    </div>
                    <div className="text-base font-bold text-[var(--color-sueca-deep)]">Volvo {family}</div>
                    <div className="text-xs text-[var(--color-ink-soft)]">{volvoDesc(family)}</div>
                  </div>
                </div>
              )}

              {/* Commercial intelligence */}
              <div>
                <SectionTitle icon={TrendingUp}>{t("profile.commercialIntelligence")}</SectionTitle>
                {p.commercial_reason && (
                  <p className="mb-3 rounded-lg border border-[var(--color-line)] bg-white p-3 text-sm leading-relaxed text-[var(--color-ink)]">
                    {p.truck_application_notes || p.commercial_reason}
                  </p>
                )}

                {/* Signal chips */}
                <div className="mb-3 space-y-2">
                  {SIGNAL_GROUPS.map((g, gi) => {
                    const active = g.keys.filter(([k]) => p.signals?.[k]);
                    if (active.length === 0) return null;
                    const Icon = g.icon;
                    return (
                      <div key={gi} className="flex items-start gap-2">
                        <Icon size={14} className="mt-1 shrink-0 text-[var(--color-sueca-blue)]" />
                        <div className="flex flex-wrap gap-1.5">
                          {active.map(([k, labelKey]) => (
                            <span key={k} className="rounded-full bg-[var(--color-sueca-mist)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-sueca-dark)]">
                              {t(labelKey)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Score explanation grouped */}
                <div className="rounded-lg border border-[var(--color-line)] p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
                    {t("profile.whyScore")}
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(grouped).map(([cat, reasons]) => {
                      const meta = CATEGORY_META[cat] ?? { tKey: cat, color: "#647383" };
                      return (
                        <div key={cat}>
                          <div className="mb-1 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                            <span className="text-[11px] font-semibold text-[var(--color-ink)]">{t(meta.tKey)}</span>
                          </div>
                          {reasons.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 pl-3.5 text-xs">
                              <span className="tnum w-8 shrink-0 font-semibold"
                                style={{ color: r.points < 0 ? "#b04747" : "var(--color-hi)" }}>
                                {r.points > 0 ? `+${r.points}` : r.points}
                              </span>
                              <span className="text-[var(--color-ink-soft)]">{r.reason}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Contact data */}
              <div>
                <SectionTitle icon={Phone}>{t("profile.contactData")}</SectionTitle>
                <div className="grid grid-cols-5 gap-2">
                  <ActionButton href={p.phone ? `tel:${p.phone}` : undefined} icon={Phone} label={t("profile.call")} />
                  <ActionButton href={wa ? `https://wa.me/${wa}` : undefined} icon={MessageCircle} label="WhatsApp" tone="green" />
                  <ActionButton href={p.website ?? undefined} icon={Globe} label={t("profile.website")} />
                  <ActionButton href={p.google_maps_url ?? undefined} icon={MapPin} label={t("profile.map")} />
                  <ActionButton href={p.linkedin_url ?? undefined} icon={Link2} label="LinkedIn" />
                </div>
                <div className="mt-3 divide-y divide-[var(--color-line)] rounded-lg border border-[var(--color-line)] px-3">
                  <InfoRow label={t("profile.address")} value={p.address} />
                  <InfoRow label={t("profile.phone")} value={p.phone} />
                  <InfoRow label={t("profile.whatsapp")} value={p.whatsapp} />
                  <InfoRow label={t("profile.email")} value={p.email} />
                  <InfoRow label={t("profile.website")} value={p.website ? (
                    <a className="text-[var(--color-sueca-blue)] hover:underline" href={p.website} target="_blank" rel="noreferrer">
                      {p.website_domain ?? p.website}
                    </a>
                  ) : null} />
                  <InfoRow label={t("profile.source")} value={p.source_url ? (
                    <a className="text-[var(--color-sueca-blue)] hover:underline" href={p.source_url} target="_blank" rel="noreferrer">
                      {p.source ?? "OpenStreetMap"}
                    </a>
                  ) : p.source} />
                </div>
              </div>

              {/* Sales action */}
              <div>
                <SectionTitle icon={Factory}>{t("profile.salesAction")}</SectionTitle>
                <div className="space-y-3 rounded-lg border border-[var(--color-line)] p-3.5">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-[var(--color-ink-soft)]">{t("profile.pipelineStatus")}</span>
                    <select value={p.status} disabled={busy} onChange={(e) => changeStatus(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink)] outline-none focus:border-[var(--color-sueca-blue)]">
                      {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </select>
                  </label>
                  {p.next_action && (
                    <div className="flex items-center gap-2 rounded-md bg-[var(--color-canvas)] px-3 py-2 text-xs text-[var(--color-ink)]">
                      <CalendarClock size={14} className="text-[var(--color-mid)]" />
                      {p.next_action}
                      {p.next_action_date && <span className="text-[var(--color-ink-soft)]">· {new Date(p.next_action_date).toLocaleDateString()}</span>}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => changeStatus("READY_TO_CONTACT")} disabled={busy}
                      className="flex-1 rounded-lg bg-[var(--color-sueca-blue)] py-2 text-sm font-semibold text-white hover:bg-[var(--color-sueca-dark)] disabled:opacity-60">
                      {t("profile.addToPipeline")}
                    </button>
                    <button onClick={scheduleFollowUp} disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] hover:border-[var(--color-sueca-blue)] hover:text-[var(--color-sueca-blue)]">
                      <CalendarClock size={15} /> {t("profile.followUp")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <SectionTitle icon={FileText}>{t("profile.notesActivity")}</SectionTitle>
                <div className="flex gap-2">
                  <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder={t("profile.addNotePlaceholder")}
                    className="flex-1 rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-sueca-blue)]" />
                  <button onClick={addNote} className="rounded-lg bg-[var(--color-sueca-blue)] px-3 text-white hover:bg-[var(--color-sueca-dark)]">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-2.5 text-sm">
                      <p className="text-[var(--color-ink)]">{n.body}</p>
                      <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">{n.author ?? "—"} · {timeAgo(n.created_at)}</p>
                    </div>
                  ))}
                  {history.map((h) => (
                    <div key={`h${h.id}`} className="flex items-center gap-2 px-1 text-[11px] text-[var(--color-ink-soft)]">
                      <span className="h-1 w-1 rounded-full bg-[var(--color-lo)]" />
                      {h.action === "status_change" ? `${t("profile.pipelineStatus")} → ${statusLabel(h.new_status)}` : h.action}
                      <span>· {timeAgo(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3.5">
              <button onClick={() => changeStatus("READY_TO_CONTACT")} disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-sueca-blue)] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-sueca-dark)] disabled:opacity-60">
                <Sparkles size={16} /> {t("profile.readyToContact")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function groupBreakdown(breakdown: ScoreReason[]): Record<string, ScoreReason[]> {
  const order = ["industry_fit", "heavy_truck", "fleet", "operation", "company", "negative"];
  const g: Record<string, ScoreReason[]> = {};
  for (const r of breakdown) {
    const cat = r.category ?? "company";
    (g[cat] ??= []).push(r);
  }
  const ordered: Record<string, ScoreReason[]> = {};
  for (const c of order) if (g[c]) ordered[c] = g[c];
  for (const c of Object.keys(g)) if (!ordered[c]) ordered[c] = g[c];
  return ordered;
}
