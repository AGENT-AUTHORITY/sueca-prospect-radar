import { useEffect, useRef, useState } from "react";
import {
  Radar, Search, Building2, Copy, Database, Globe, Phone, MapPin,
  Truck, Gauge, CheckCircle2, Flag, AlertTriangle, Layers, Boxes, Route,
} from "lucide-react";
import { api } from "../lib/api";
import type { SearchEvent } from "../lib/types";
import { clockTime } from "../lib/format";
import { useT } from "../lib/i18n";

const EVENT_TYPES = [
  "SEARCH_STARTED", "TERRITORY_SCAN", "TERRITORY_LOADED", "QUERY_STARTED",
  "COMPANY_FOUND", "COMPANY_DUPLICATE", "ENRICHMENT_STARTED", "COMPANY_ENRICHING",
  "WEBSITE_FOUND", "PHONE_FOUND", "GEOCODING_COMPLETED", "TRUCK_SIGNAL_FOUND",
  "FLEET_SIGNAL_FOUND", "FLEET_SIGNAL", "OPERATION_SIGNAL_FOUND", "SCORE_CALCULATED",
  "VOLVO_APPLICATION_CALCULATED", "COMPANY_SAVED", "SEARCH_FINISHED",
  "SEARCH_STOPPED", "ERROR",
];

const META: Record<string, { icon: typeof Radar; color: string }> = {
  SEARCH_STARTED: { icon: Radar, color: "#315f9c" },
  TERRITORY_SCAN: { icon: Layers, color: "#315f9c" },
  TERRITORY_LOADED: { icon: Layers, color: "#2b8fb3" },
  QUERY_STARTED: { icon: Search, color: "#5e8fc5" },
  COMPANY_FOUND: { icon: Building2, color: "#173e73" },
  COMPANY_DUPLICATE: { icon: Copy, color: "#8a94a1" },
  ENRICHMENT_STARTED: { icon: Database, color: "#647383" },
  COMPANY_ENRICHING: { icon: Database, color: "#647383" },
  WEBSITE_FOUND: { icon: Globe, color: "#2b8fb3" },
  PHONE_FOUND: { icon: Phone, color: "#2b8fb3" },
  GEOCODING_COMPLETED: { icon: MapPin, color: "#2b8fb3" },
  TRUCK_SIGNAL_FOUND: { icon: Truck, color: "#173e73" },
  FLEET_SIGNAL_FOUND: { icon: Boxes, color: "#b8791b" },
  FLEET_SIGNAL: { icon: Boxes, color: "#b8791b" },
  OPERATION_SIGNAL_FOUND: { icon: Route, color: "#5e8fc5" },
  SCORE_CALCULATED: { icon: Gauge, color: "#315f9c" },
  VOLVO_APPLICATION_CALCULATED: { icon: Truck, color: "#173e73" },
  COMPANY_SAVED: { icon: CheckCircle2, color: "#1f8a54" },
  SEARCH_FINISHED: { icon: Flag, color: "#1f8a54" },
  SEARCH_STOPPED: { icon: Flag, color: "#b04747" },
  ERROR: { icon: AlertTriangle, color: "#b04747" },
};

export function LiveFeed({
  runId,
  onEvent,
  onDone,
}: {
  runId: number | null;
  onEvent?: (e: SearchEvent) => void;
  onDone?: () => void;
}) {
  const { t } = useT();
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (runId == null) return;
    setEvents([]);

    let stopped = false;
    let lastId = 0;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let gotAny = false;
    const seen = new Set<number>();

    const push = (data: SearchEvent) => {
      if (seen.has(data.id)) return;
      seen.add(data.id);
      lastId = Math.max(lastId, data.id);
      setEvents((prev) => [...prev, data].slice(-250));
      onEvent?.(data);
    };

    // Bulletproof fallback (works through any proxy that buffers SSE).
    const poll = async () => {
      if (stopped) return;
      try {
        (await api.runEvents(runId, lastId)).forEach(push);
        const run = await api.run(runId);
        if (["completed", "stopped", "error"].includes(run.status)) {
          (await api.runEvents(runId, lastId)).forEach(push);
          stopped = true;
          onDone?.();
          return;
        }
      } catch {
        /* keep trying */
      }
      pollTimer = setTimeout(poll, 600);
    };

    // Primary transport: Server-Sent Events.
    let es: EventSource | null = null;
    try {
      es = new EventSource(api.streamUrl(runId));
      const handle = (ev: MessageEvent) => {
        gotAny = true;
        push(JSON.parse(ev.data) as SearchEvent);
      };
      EVENT_TYPES.forEach((t) => es!.addEventListener(t, handle as EventListener));
      es.addEventListener("STREAM_END", () => {
        stopped = true;
        es?.close();
        onDone?.();
      });
      es.onerror = () => {
        es?.close();
        if (!stopped) poll();
      };
    } catch {
      poll();
    }

    // If SSE yields nothing quickly (proxy buffering), switch to polling.
    const watchdog = setTimeout(() => {
      if (!gotAny && !stopped) {
        es?.close();
        poll();
      }
    }, 3500);

    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
      clearTimeout(watchdog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-sueca-deep)] px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Radar size={15} className={runId != null ? "animate-spin-slow" : ""} />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">
            {t("prospecting.liveTitle")}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#9cc0ea]">
          <span className={`h-1.5 w-1.5 rounded-full ${runId != null ? "pulse-dot bg-[#4ade80]" : "bg-[#5f83ac]"}`} />
          {runId != null ? t("prospecting.scanning") : t("prospecting.idle")}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2.5">
        {events.length === 0 && (
          <div className="flex h-full min-h-[8rem] items-center justify-center px-6 text-center text-xs text-[var(--color-ink-soft)]">
            {runId != null ? t("prospecting.connecting") : t("prospecting.startHint")}
          </div>
        )}
        {events.map((e) => {
          const meta = META[e.type] ?? { icon: Database, color: "#647383" };
          const Icon = meta.icon;
          const isSaved = e.type === "COMPANY_SAVED";
          const priority = (e.payload?.priority as string) ?? "";
          const volvo = (e.payload?.volvo_family as string) ?? "";
          const isHigh = isSaved && priority === "HIGH";
          return (
            <div
              key={e.id}
              className={`animate-row-in flex items-start gap-2.5 rounded-md px-2 py-1.5 ${
                isHigh ? "bg-[var(--color-hi-soft)]" : ""
              }`}
            >
              <span className="tnum mt-0.5 shrink-0 font-mono text-[10.5px] leading-5 text-[var(--color-ink-soft)]">
                {clockTime(e.ts)}
              </span>
              <Icon size={14} className="mt-0.5 shrink-0" style={{ color: meta.color }} />
              <span
                className={`text-[13px] leading-5 ${
                  isHigh ? "font-semibold text-[var(--color-hi)]" : "text-[var(--color-ink)]"
                }`}
              >
                {e.message}
                {isSaved && priority && (
                  <span
                    className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      color: isHigh ? "#137a3e" : "#647383",
                      background: isHigh ? "#c9ecd6" : "#eef1f4",
                    }}
                  >
                    {priority}
                  </span>
                )}
                {isSaved && volvo && (
                  <span className="ml-1.5 rounded bg-[var(--color-sueca-mist)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--color-sueca-dark)]">
                    {volvo}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
