import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Radar,
  Building2,
  Map,
  KanbanSquare,
  History,
  Settings,
  Truck,
} from "lucide-react";
import { BrandHeader } from "./BrandHeader";
import { useT } from "../lib/i18n";

const NAV = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/prospecting", key: "nav.prospecting", icon: Radar },
  { to: "/prospects", key: "nav.prospects", icon: Building2 },
  { to: "/territory", key: "nav.territory", icon: Map },
  { to: "/pipeline", key: "nav.pipeline", icon: KanbanSquare },
  { to: "/runs", key: "nav.searchRuns", icon: History },
];

export function Sidebar() {
  const { t } = useT();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[var(--color-sueca-deep)] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <BrandHeader />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ to, key, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="block">
            {({ isActive }) => (
              <div
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-[#a9c3e0] hover:bg-white/6 hover:text-white"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-[#6fa3dd]" />
                )}
                <Icon size={18} strokeWidth={2} />
                {t(key)}
              </div>
            )}
          </NavLink>
        ))}

        <div className="my-3 border-t border-white/10" />

        <NavLink to="/settings" className="block">
          {({ isActive }) => (
            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-white/12 text-white" : "text-[#a9c3e0] hover:bg-white/6 hover:text-white"
              }`}
            >
              <Settings size={18} />
              {t("nav.settings")}
            </div>
          )}
        </NavLink>
      </nav>

      {/* Reserved for authorized Sueca / Volvo branding */}
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5 text-[#7ba0cf]">
          <Truck size={16} />
          <div className="leading-tight">
            <div className="text-[11px] font-semibold text-[#a9c3e0]">Sueca Vehículos Pesados</div>
            <div className="text-[10px] text-[#5f83ac]">Volvo Trucks · v1.0</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
