import { useT, type Lang } from "../lib/i18n";

export function LanguageToggle() {
  const { lang, setLang } = useT();
  const options: Lang[] = ["es", "en"];
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)] p-0.5 text-xs font-semibold">
      {options.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-md px-2.5 py-1 uppercase transition-colors ${
            lang === l
              ? "bg-[var(--color-sueca-blue)] text-white shadow-sm"
              : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
