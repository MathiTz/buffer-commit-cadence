import type { CSSProperties } from "react";
import type { PostStatus } from "@cadence/core";

// Status colours for text and pills. Colour is never the only signal: the label is always shown.
export const STATUS_COLOR: Record<PostStatus, string> = {
  scheduled: "#2B2A28",
  sent: "#6B6965",
  draft: "#8F4A0A",
  error: "#B3261E",
};

export const PILL: Record<PostStatus, { bg: string; fg: string }> = {
  scheduled: { bg: "#E3F5E1", fg: "#1E6B33" },
  sent: { bg: "#EDECE9", fg: "#6B6965" },
  draft: { bg: "#FCEBD9", fg: "#8F4A0A" },
  error: { bg: "#FBE4E1", fg: "#B3261E" },
};

// Dot style encodes status: solid scheduled, faded sent, hollow ring needs review, red ring failed.
export function dotStyle(color: string, status: PostStatus): CSSProperties {
  if (status === "draft") return { background: "#FFFFFF", borderColor: color };
  if (status === "sent") return { background: color, borderColor: color, opacity: 0.4 };
  if (status === "error") return { background: color, borderColor: "#D14343" };
  return { background: color, borderColor: color };
}

export const btn =
  "h-7 rounded-md border border-[#DEDDDA] bg-white px-3 text-[13px] font-medium text-[#2B2A28] hover:bg-[#FAFAF9]";
export const btnPrimary =
  "rounded-md border border-[#8ED48F] bg-[#A8E5A0] font-semibold text-[#14391C] hover:bg-[#8ED48F]";
export const iconBtn =
  "flex size-7 items-center justify-center rounded-md border border-[#DEDDDA] bg-white p-0 hover:bg-[#FAFAF9]";
