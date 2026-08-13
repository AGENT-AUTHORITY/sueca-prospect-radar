import { useEffect, useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { api } from "../lib/api";
import type { Prospect } from "../lib/types";
import { ScoreBadge } from "../components/badges";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { useT } from "../lib/i18n";

const COLUMNS: { key: string; tone: string }[] = [
  { key: "NEW", tone: "#5E8FC5" },
  { key: "RESEARCHING", tone: "#7c6cd6" },
  { key: "READY_TO_CONTACT", tone: "#315f9c" },
  { key: "CONTACTED", tone: "#2b8fb3" },
  { key: "FOLLOW_UP", tone: "#b8791b" },
  { key: "MEETING", tone: "#8a5cd1" },
  { key: "OPPORTUNITY", tone: "#1f8a54" },
  { key: "QUOTED", tone: "#1f8a54" },
  { key: "NEGOTIATION", tone: "#1f7a6b" },
  { key: "WON", tone: "#137a3e" },
  { key: "LOST", tone: "#b04747" },
  { key: "NO_FIT", tone: "#8a94a1" },
];

export function Pipeline() {
  const { t } = useT();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = () => api.prospects({ limit: 300, sort: "score", order: "desc" }).then((r) => setProspects(r.items));
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g: Record<string, Prospect[]> = {};
    for (const col of COLUMNS) g[col.key] = [];
    for (const p of prospects) (g[p.status] ??= []).push(p);
    return g;
  }, [prospects]);

  const active = prospects.find((p) => p.id === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(Number(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = Number(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    const p = prospects.find((x) => x.id === id);
    if (!p || !target || p.status === target) return;
    setProspects((prev) => prev.map((x) => (x.id === id ? { ...x, status: target } : x)));
    try {
      await api.changeStatus(id, target, "Moved on pipeline");
    } catch {
      load();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-ink-soft)]">{t("pipeline.hint")}</p>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <Column key={col.key} col={col} items={grouped[col.key] ?? []} onOpen={setSelected} />
          ))}
        </div>
        <DragOverlay>
          {active && <Card p={active} dragging />}
        </DragOverlay>
      </DndContext>

      {selected != null && (
        <ProspectDrawer prospectId={selected} onClose={() => setSelected(null)} onChanged={load} />
      )}
    </div>
  );
}

function Column({
  col, items, onOpen,
}: {
  col: { key: string; tone: string }; items: Prospect[]; onOpen: (id: number) => void;
}) {
  const { status } = useT();
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.tone }} />
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]">{status(col.key)}</span>
        </div>
        <span className="tnum rounded-full bg-[var(--color-canvas)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-ink-soft)]">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-xl border p-2 transition-colors ${
          isOver ? "border-[var(--color-sueca-blue)] bg-[var(--color-sueca-mist)]" : "border-[var(--color-line)] bg-[var(--color-canvas)]/60"
        }`}
        style={{ minHeight: "60vh" }}
      >
        {items.map((p) => <DraggableCard key={p.id} p={p} onOpen={onOpen} />)}
        {items.length === 0 && (
          <div className="grid h-20 place-items-center text-[11px] text-[var(--color-lo)]"><DropHint /></div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ p, onOpen }: { p: Prospect; onOpen: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(p.id)}
      className={isDragging ? "opacity-30" : ""}
    >
      <Card p={p} />
    </div>
  );
}

function DropHint() {
  const { t } = useT();
  return <>{t("pipeline.dropHere")}</>;
}

function Card({ p, dragging }: { p: Prospect; dragging?: boolean }) {
  const { industry } = useT();
  return (
    <div
      className={`cursor-grab rounded-lg border border-[var(--color-line)] bg-white p-3 shadow-sm active:cursor-grabbing ${
        dragging ? "shadow-[var(--shadow-pop)] rotate-1" : "hover:border-[var(--color-sueca-light)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-tight text-[var(--color-ink)]">{p.company_name}</span>
        <ScoreBadge score={p.score} priority={p.priority} />
      </div>
      <div className="mt-1.5 text-[11px] text-[var(--color-ink-soft)]">
        {industry(p.industry)} · {p.city ?? "—"}
      </div>
    </div>
  );
}
