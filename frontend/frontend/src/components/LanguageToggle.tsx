import { useT, type Lang } from "../lib/i18n";

export function LanguageToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { lang, setLang } = useT();
  const options: Lang[] = ["es", "en"];
  const dark = tone === "dark";

  return (
    <div
      className={`inline-flex overflow-hidden rounded-xl border p-1 text-xs font-semibold ${
        dark
          ? "border-white/25 bg-white/[0.06] text-[#9eb4ce]"
          : "border-[var(--color-line)] bg-[var(--color-canvas)] text-[var(--color-ink-soft)]"
      }`}
      aria-label={lang === "es" ? "Seleccionar idioma" : "Select language"}
    >
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`min-h-11 rounded-lg px-3 py-1 uppercase transition-colors md:min-h-8 ${
            lang === l
              ? dark
                ? "bg-[#24476e] text-white shadow-sm"
                : "bg-[var(--color-sueca-blue)] text-white shadow-sm"
              : dark
                ? "hover:bg-white/[0.06] hover:text-white"
                : "hover:text-[var(--color-ink)]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
