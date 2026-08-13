import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Radar, MapPin, LogOut, Menu } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

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
    <div className="min-h-screen overflow-x-hidden bg-[var(--color-canvas)]">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-col lg:ml-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)]/90 px-3 py-2 backdrop-blur sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.openMenu") || "Abrir menú"}
              aria-expanded={menuOpen}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] lg:hidden"
            >
              <Menu size={21} />
            </button>
            <h1 className="truncate text-base font-semibold text-[var(--color-ink)] sm:text-lg">{title}</h1>
            {territory && (
              <span className="hidden items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-1 text-xs text-[var(--color-ink-soft)] xl:inline-flex">
                <MapPin size={13} className="text-[var(--color-sueca-blue)]" />
                <span className="max-w-[22rem] truncate">{territory}</span>
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:gap-4">
            <div className="hidden sm:block">
              <LanguageToggle />
            </div>
            <span
              className="hidden items-center gap-2 text-xs font-semibold xl:inline-flex"
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
              title={t("header.newProspecting")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--color-sueca-blue)] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-sueca-dark)] sm:px-3.5"
            >
              <Radar size={17} /> <span className="hidden md:inline">{t("header.newProspecting")}</span>
            </Link>
            <button
              type="button"
              onClick={() => { logout(); }}
              title={t("auth.logout")}
              aria-label={t("auth.logout")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)]"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
