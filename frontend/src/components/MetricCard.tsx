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
    <div className="group relative min-w-0 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)] sm:p-5">
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ background: accent ?? "var(--color-sueca-blue)" }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--color-ink-soft)] sm:text-[11px] sm:tracking-[0.14em]">
            {label}
          </p>
          <p className="tnum mt-2 text-2xl font-bold leading-none text-[var(--color-ink)] sm:text-3xl">{value}</p>
          {hint && <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">{hint}</p>}
        </div>
        {icon && (
          <div
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg sm:grid"
            style={{ background: `${accent ?? "var(--color-sueca-blue)"}14`, color: accent ?? "var(--color-sueca-blue)" }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
