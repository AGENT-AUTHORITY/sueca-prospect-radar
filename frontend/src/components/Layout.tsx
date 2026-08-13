import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Radar, MapPin, LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { LanguageToggle } from "./LanguageToggle";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import { useAuth } from "../lib/auth";

const TITLE_KEYS: Record<string, string> = {
  "/": "header.dashboard",
  "/prospecting": "header.prospecting",
  "/prospects": "header.prospects",
  "/territory": "header.territory",
  "/pipeline": "header.pipeline",
  "/runs": "header.searchRuns",
  "/settings": "header.settings",
};

type BackendStatus = "connecting" | "online" | "offline";
const STATUS_META: Record<BackendStatus, { key: string; color: string }> = {
  online: { key: "header.systemOnline", color: "#1f8a54" },
  connecting: { key: "header.systemConnecting", color: "#b8791b" },
  offline: { key: "header.systemOffline", color: "#b04747" },
};

export function Layout() {
  const { pathname } = useLocation();
  const { t } = useT();
  const { logout } = useAuth();
  const [territory, setTerritory] = useState<string>("");
  const [status, setStatus] = useState<BackendStatus>("connecting");

  useEffect(() => {
    api.dashboard().then((d) => setTerritory(d.active_territory)).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    const check = () =>
      api.health()
        .then(() => { if (alive) setStatus("online"); })
        .catch(() => { if (alive) setStatus("offline"); });
    check();
    const id = setInterval(check, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const title = t(TITLE_KEYS[pathname] ?? "header.fallback");
  const st = STATUS_META[status];

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)]/85 px-8 backdrop-blur">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
            {territory && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-1 text-xs text-[var(--color-ink-soft)] md:inline-flex">
                <MapPin size={13} className="text-[var(--color-sueca-blue)]" />
                <span className="max-w-[22rem] truncate">{territory}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <span
              className="hidden items-center gap-2 text-xs font-semibold sm:inline-flex"
              style={{ color: st.color }}
            >
              <span
                className={`h-2 w-2 rounded-full ${status === "online" ? "pulse-dot" : ""}`}
                style={{ background: st.color }}
              />
              {t(st.key)}
            </span>
            <Link
              to="/prospecting"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-sueca-blue)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-sueca-dark)]"
            >
              <Radar size={16} /> {t("header.newProspecting")}
            </Link>
            <button
              type="button"
              onClick={() => { logout(); }}
              title={t("auth.logout")}
              aria-label={t("auth.logout")}
              className="inline-flex items-center justify-center rounded-lg border border-[var(--color-line)] p-2 text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
