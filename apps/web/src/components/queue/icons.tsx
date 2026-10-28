import type { ChannelId } from "@cadence/core";

// Brand glyphs (single-path, 24px grid), drawn white on the channel's badge colour.
const GLYPHS: Record<ChannelId, string> = {
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z",
  bluesky:
    "M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z",
};

export function ChannelBadge({ id, badge, size = 18 }: { id: ChannelId; badge: string; size?: number }) {
  const glyph = Math.round(size * 0.6);
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size > 20 ? 7 : 5, background: badge }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
        <path d={GLYPHS[id]} />
      </svg>
    </span>
  );
}

export function CadenceMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect width="26" height="26" rx="7" fill="#2B2A28" />
      <circle cx="6.5" cy="13" r="2.6" fill="#A8E5A0" />
      <circle cx="13" cy="13" r="2.6" fill="#A8E5A0" />
      <circle cx="19.5" cy="13" r="2.1" fill="none" stroke="#A8E5A0" strokeWidth="1.6" />
    </svg>
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconSidebar = () => (<svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>);
export const IconPrev = () => (<svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>);
export const IconNext = () => (<svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>);
export const IconClose = () => (<svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconInfo = () => (<svg width="14" height="14" viewBox="0 0 24 24" {...stroke} className="text-[#6B6965]" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>);
export const IconBars = () => (<svg width="14" height="14" viewBox="0 0 24 24" {...stroke} className="text-[#6B6965]" aria-hidden="true"><path d="M5 20V10" /><path d="M12 20V4" /><path d="M19 20v-7" /></svg>);
