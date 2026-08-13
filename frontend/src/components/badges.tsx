import type { Priority } from "../lib/types";
import { priorityColor } from "../lib/format";
import { useT } from "../lib/i18n";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const c = priorityColor(priority);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: c.fg, background: c.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.dot }} />
      {priority}
    </span>
  );
}

export function ScoreBadge({ score, priority }: { score: number; priority: Priority }) {
  const c = priorityColor(priority);
  return (
    <span
      className="tnum inline-flex min-w-[2.75rem] items-center justify-center rounded-lg px-2 py-1 text-sm font-bold"
      style={{ color: c.fg, background: c.bg }}
    >
      {score}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  NEW: "#5E8FC5",
  RESEARCHING: "#7c6cd6",
  READY_TO_CONTACT: "#315f9c",
  CONTACTED: "#2b8fb3",
  FOLLOW_UP: "#b8791b",
  MEETING: "#8a5cd1",
  OPPORTUNITY: "#1f8a54",
  QUOTED: "#1f8a54",
  NEGOTIATION: "#1f7a6b",
  WON: "#137a3e",
  LOST: "#b04747",
  NO_FIT: "#8a94a1",
};

export function StatusBadge({ status }: { status: string }) {
  const { status: statusLabel } = useT();
  const tone = STATUS_TONE[status] ?? "#647383";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ color: tone, background: `${tone}18` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {statusLabel(status)}
    </span>
  );
}
