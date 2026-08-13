/**
 * BrandHeader — the SUECA PROSPECT RADAR wordmark.
 * Placeholder mark only (NOT the official Sueca/Volvo logo). Swap the <svg>
 * and text here to drop in authorized branding later.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="9" fill="url(#bm)" />
      <circle cx="20" cy="20" r="12" stroke="#9cc0ea" strokeWidth="1.4" opacity="0.5" />
      <circle cx="20" cy="20" r="7.5" stroke="#c9e0f7" strokeWidth="1.4" opacity="0.7" />
      <circle cx="20" cy="20" r="2.6" fill="#ffffff" />
      <path d="M20 20 L31 12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#3f74b6" />
          <stop offset="1" stopColor="#102c52" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={compact ? 30 : 36} />
      <div className="leading-none">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold tracking-tight text-white">SUECA</span>
          <span className="text-[15px] font-semibold tracking-tight text-[#9cc0ea]">PROSPECT RADAR</span>
        </div>
        <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[#7ba0cf]">
          Commercial Intelligence
        </div>
      </div>
    </div>
  );
}
