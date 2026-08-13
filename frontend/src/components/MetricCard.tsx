import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]">
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ background: accent ?? "var(--color-sueca-blue)" }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
            {label}
          </p>
          <p className="tnum mt-2 text-3xl font-bold leading-none text-[var(--color-ink)]">{value}</p>
          {hint && <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">{hint}</p>}
        </div>
        {icon && (
          <div
            className="grid h-10 w-10 place-items-center rounded-lg"
            style={{ background: `${accent ?? "var(--color-sueca-blue)"}14`, color: accent ?? "var(--color-sueca-blue)" }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
