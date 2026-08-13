import type { Priority } from "./types";

export const INDUSTRY_LABELS: Record<string, string> = {
  transporte_cargas: "Transporte de cargas",
  agro: "Agronegocios",
  construccion: "Construcción",
  distribucion: "Distribución",
  industria: "Industria pesada",
  canteras: "Canteras / áridos",
  combustible: "Combustible",
  forestal_residuos: "Forestal / residuos",
};

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  RESEARCHING: "Researching",
  READY_TO_CONTACT: "Ready to contact",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow up",
  MEETING: "Meeting",
  OPPORTUNITY: "Opportunity",
  QUOTED: "Quoted",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  NO_FIT: "No fit",
};

export function industryLabel(key: string | null): string {
  if (!key) return "—";
  return INDUSTRY_LABELS[key] ?? key;
}

export function statusLabel(key: string | null): string {
  if (!key) return "—";
  return STATUS_LABELS[key] ?? key;
}

export function priorityColor(p: Priority): { fg: string; bg: string; dot: string } {
  switch (p) {
    case "HIGH":
      return { fg: "var(--color-hi)", bg: "var(--color-hi-soft)", dot: "var(--color-hi)" };
    case "MEDIUM":
      return { fg: "var(--color-mid)", bg: "var(--color-mid-soft)", dot: "var(--color-mid)" };
    default:
      return { fg: "var(--color-lo)", bg: "var(--color-lo-soft)", dot: "var(--color-lo)" };
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function clockTime(iso: string): string {
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z");
  return d.toLocaleTimeString("en-GB", { hour12: false });
}
