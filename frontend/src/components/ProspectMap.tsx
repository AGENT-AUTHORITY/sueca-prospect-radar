import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import type { MapPoint, Priority } from "../lib/types";
import { useT } from "../lib/i18n";

interface PopupLabels {
  industry: (key: string | null) => string;
  view: string;
  add: string;
}

const COLORS: Record<Priority, string> = {
  HIGH: "#173e73", // Sueca deep blue, solid
  MEDIUM: "#5e8fc5", // Sueca medium blue
  LOW: "#93a3b5", // blue-grey
};
const SIZES: Record<Priority, number> = { HIGH: 22, MEDIUM: 16, LOW: 12 };

function pinIcon(priority: Priority, isNew: boolean): L.DivIcon {
  const color = COLORS[priority];
  const size = SIZES[priority];
  const halo = priority === "HIGH" ? `<span class="pin-halo"></span>` : "";
  const newCls = isNew ? "pin-new" : "";
  return L.divIcon({
    className: "",
    html: `<div class="pin-wrap ${newCls}" style="width:${size}px;height:${size}px">
      ${halo}
      <span class="pin-dot ${isNew ? "marker-pop" : ""}" style="width:${size}px;height:${size}px;background:${color}"></span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function buildPopup(
  p: MapPoint,
  labels: PopupLabels,
  onSelect?: (id: number) => void,
  onAddToPipeline?: (id: number) => void,
): HTMLElement {
  const c = COLORS[p.priority];
  const el = document.createElement("div");
  el.className = "sueca-popup";
  el.innerHTML = `
    <div class="sp-name">${p.company_name}</div>
    <div class="sp-meta">${labels.industry(p.industry)} · ${p.city ?? "—"}</div>
    <div class="sp-row">
      <span class="sp-score" style="color:${c};background:${c}1f">${p.score}/100 · ${p.priority}</span>
      ${p.volvo_family ? `<span class="sp-volvo">Volvo ${p.volvo_family}</span>` : ""}
    </div>
    <div class="sp-actions">
      <div class="sp-btn primary" data-act="view">${labels.view}</div>
      ${onAddToPipeline ? `<div class="sp-btn" data-act="add">${labels.add}</div>` : ""}
    </div>`;
  el.querySelector('[data-act="view"]')?.addEventListener("click", () => onSelect?.(p.id));
  el.querySelector('[data-act="add"]')?.addEventListener("click", () => onAddToPipeline?.(p.id));
  return el;
}

function MarkersLayer({
  points, onSelect, onAddToPipeline, newIds, labels,
}: {
  points: MapPoint[];
  onSelect?: (id: number) => void;
  onAddToPipeline?: (id: number) => void;
  newIds?: Set<number>;
  labels: PopupLabels;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const group = (L as typeof L & { markerClusterGroup: (o?: object) => L.MarkerClusterGroup })
      .markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 46,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster: { getChildCount: () => number }) =>
          L.divIcon({
            html: `<div>${cluster.getChildCount()}</div>`,
            className: "sueca-cluster",
            iconSize: L.point(38, 38),
          }),
      });
    groupRef.current = group;
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.clearLayers();
    const valid = points.filter((p) => p.lat != null && p.lon != null);
    for (const p of valid) {
      const marker = L.marker([p.lat, p.lon], {
        icon: pinIcon(p.priority, newIds?.has(p.id) ?? false),
      });
      marker.bindPopup(() => buildPopup(p, labels, onSelect, onAddToPipeline), { closeButton: true, minWidth: 220 });
      group.addLayer(marker);
    }
    if (valid.length) {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lon] as [number, number]));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 14, animate: true });
    }
  }, [points, newIds, onSelect, onAddToPipeline, labels, map]);

  return null;
}

export function ProspectMap({
  points, onSelect, onAddToPipeline, newIds,
  center = [-35.0553, -58.7589], zoom = 11, className = "",
}: {
  points: MapPoint[];
  onSelect?: (id: number) => void;
  onAddToPipeline?: (id: number) => void;
  newIds?: Set<number>;
  center?: [number, number];
  zoom?: number;
  className?: string;
}) {
  const { t, industry } = useT();
  const labels: PopupLabels = { industry, view: t("prospecting.viewProspect") || "View prospect", add: t("profile.addToPipeline") };
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--color-line)] ${className}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }} zoomControl={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MarkersLayer points={points} onSelect={onSelect} onAddToPipeline={onAddToPipeline} newIds={newIds} labels={labels} />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)]/92 px-3 py-2 text-[11px] shadow-sm backdrop-blur">
        {(["HIGH", "MEDIUM", "LOW"] as Priority[]).map((p) => (
          <span key={p} className="flex items-center gap-1.5 font-medium text-[var(--color-ink-soft)]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[p] }} />
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
