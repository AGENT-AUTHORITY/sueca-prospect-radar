import type { Priority } from "../lib/types";
import { priorityColor } from "../lib/format";

export function ScoreRing({
  score,
  priority,
  size = 116,
}: {
  score: number;
  priority: Priority;
  size?: number;
}) {
  const c = priorityColor(priority);
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={c.fg}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="tnum text-3xl font-bold" style={{ color: c.fg }}>
          {score}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-soft)]">
          / 100
        </span>
      </div>
    </div>
  );
}
