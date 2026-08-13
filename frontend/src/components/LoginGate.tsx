import { useState, type FormEvent, type ReactNode } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { BrandMark } from "./BrandHeader";
import { LanguageToggle } from "./LanguageToggle";

const SCREEN_BG =
  "radial-gradient(1200px 620px at 50% -12%, #16386b 0%, #0b1f3c 46%, #081627 100%)";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ background: SCREEN_BG }}
    >
      <div className="absolute right-5 top-5">
        <LanguageToggle />
      </div>
      {children}
    </div>
  );
}

function Wordmark() {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <BrandMark size={54} />
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-xl font-extrabold tracking-tight text-white">SUECA</span>
        <span className="text-xl font-semibold tracking-tight text-[#9cc0ea]">PROSPECT RADAR</span>
      </div>
      <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-[#6f97cb]">
        Commercial Intelligence
      </div>
    </div>
  );
}

export function LoginGate() {
  const { login } = useAuth();
  const { t } = useT();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await login(value);
    } catch {
      setError(t("auth.error"));
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="w-full max-w-sm">
        <Wordmark />
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur"
        >
          <label htmlFor="access-code" className="mb-1 block text-sm font-semibold text-white">
            {t("auth.title")}
          </label>
          <p className="mb-4 text-xs text-[#9fb6d6]">{t("auth.subtitle")}</p>
          <input
            id="access-code"
            type="password"
            autoFocus
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("auth.placeholder")}
            className="w-full rounded-lg border border-white/15 bg-[#0a1a30] px-4 py-3 text-center text-lg tracking-[0.3em] text-white placeholder:tracking-normal placeholder:text-[#5b78a0] focus:border-[#3f74b6] focus:outline-none"
          />
          {error && <p className="mt-3 text-center text-sm text-[#ff9d9d]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2f6fbf] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3f7fce] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={16} />
            {busy ? t("auth.connecting") : t("auth.enter")}
          </button>
        </form>
      </div>
    </Shell>
  );
}

function SplashText() {
  const { t } = useT();
  return <>{t("auth.checking")}</>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "authed") return <>{children}</>;
  if (status === "anon") return <LoginGate />;
  return (
    <Shell>
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark size={48} />
        <div className="flex items-center gap-2 text-sm text-[#9fb6d6]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#5e8fc5]" />
          <SplashText />
        </div>
      </div>
    </Shell>
  );
}
