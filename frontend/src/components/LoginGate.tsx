import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import roadHero from "../assets/login/volvo-road-hero.webp";
import { BrandMark } from "./BrandHeader";
import { LanguageToggle } from "./LanguageToggle";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="login-splash">
      {children}
    </div>
  );
}

function Wordmark({ tagline }: { tagline: string }) {
  return (
    <header className="login-wordmark">
      <div className="login-wordmark-title">
        <span className="login-wordmark-sueca">SUECA</span>
        <span className="login-wordmark-radar">PROSPECT RADAR</span>
      </div>
      <div className="login-wordmark-tagline">
        {tagline}
      </div>
      <span className="login-wordmark-rule" aria-hidden="true" />
    </header>
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
    <div className="login-screen">
      <section className="login-visual" aria-label={t("auth.heroAlt")}>
        <img
          src={roadHero}
          alt=""
          className="login-visual-image"
          decoding="async"
          fetchPriority="high"
        />
      </section>

      <main className="login-access">
        <div className="login-language">
          <LanguageToggle tone="dark" />
        </div>

        <div className="login-content">
          <Wordmark tagline={t("brand.tagline")} />

          <form onSubmit={onSubmit} className="login-form" aria-busy={busy}>
            <div className="login-form-heading">
              <h1>{t("auth.title")}</h1>
              <p>{t("auth.subtitle")}</p>
            </div>

            <label htmlFor="access-code" className="login-label">
              {t("auth.placeholder")}
            </label>
            <input
              id="access-code"
              type="password"
              autoFocus
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="login-input"
              aria-describedby={error ? "access-error" : undefined}
              aria-invalid={Boolean(error)}
            />

            <div className="login-message-slot" aria-live="polite">
              {error ? <p id="access-error" className="login-error">{error}</p> : null}
            </div>

            <button type="submit" disabled={busy || !code.trim()} className="login-submit">
              {busy ? (
                <LoaderCircle size={19} className="animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight size={19} aria-hidden="true" />
              )}
              <span>{busy ? t("auth.connecting") : t("auth.enter")}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
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
