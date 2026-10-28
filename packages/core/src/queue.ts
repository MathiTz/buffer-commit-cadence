// "draft" = needs review. Matches the dot styles in the design: solid scheduled, faded sent,
// hollow ring needs review, red ring failed.
export type PostStatus = "scheduled" | "sent" | "draft" | "error";

export type Tag = "educate" | "promote" | "shipped" | "personal";
export type ChannelId = "x" | "linkedin" | "bluesky";

export interface TagInfo { name: string; color: string; target: number }
export interface Channel { id: ChannelId; name: string; handle: string; badge: string; charLimit: number }
export interface Day { name: string; date: number; full: string }

export interface Post {
  id: string;
  day: number; // index into the week's days
  channel: ChannelId;
  tag: Tag;
  time: string; // "HH:mm"
  full: string; // paragraphs separated by a blank line (a thread has one per post)
  status: PostStatus;
  kind: string;
}

export interface Idea { id: string; title: string; tag: Tag }
export interface GapDef { id: string; title: string; why: string; canFill: boolean; canSpread: boolean }

export const TAGS: Record<Tag, TagInfo> = {
  educate: { name: "Educate", color: "#5B8DEF", target: 40 },
  promote: { name: "Promote", color: "#E8903A", target: 25 },
  shipped: { name: "Shipped", color: "#3DA66B", target: 20 },
  personal: { name: "Personal", color: "#9A7BE0", target: 15 },
};
export const TAG_ORDER: Tag[] = ["educate", "promote", "shipped", "personal"];

export const STATUS_LABEL: Record<PostStatus, string> = {
  scheduled: "Scheduled",
  sent: "Sent",
  draft: "Needs review",
  error: "Failed",
};

/** Text shown in the table: the first paragraph of the post. */
export const summary = (full: string) => full.split("\n\n")[0] ?? full;

/** Longest paragraph, which is what a channel's character limit applies to. */
export const longestParagraph = (full: string) => Math.max(...full.split("\n\n").map((l) => l.length));

export interface BalanceRow { tag: Tag; name: string; color: string; pct: number; target: number; diff: number }

/** Share of posts per tag against the target mix. Off target means more than 10 points away. */
export function tagBalance(posts: Pick<Post, "tag">[]): BalanceRow[] {
  const total = posts.length;
  return TAG_ORDER.map((tag) => {
    const n = posts.filter((p) => p.tag === tag).length;
    const pct = total ? Math.round((n / total) * 100) : 0;
    const { name, color, target } = TAGS[tag];
    return { tag, name, color, pct, target, diff: pct - target };
  });
}

export const isOffTarget = (row: BalanceRow) => Math.abs(row.diff) > 10;
