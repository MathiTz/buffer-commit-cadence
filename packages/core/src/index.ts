// Pure product logic (gap rules, tag balance, drafting helpers). No I/O, no Buffer calls.

export type PostStatus = "draft" | "error" | "needs_approval" | "scheduled" | "sending" | "sent";

export type Tag = "educate" | "promote" | "shipped" | "personal";

export const TAG_LABELS: Record<Tag, string> = {
  educate: "Educate",
  promote: "Promote",
  shipped: "Shipped",
  personal: "Personal",
};
