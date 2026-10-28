// "draft" = needs review. Matches the dot styles in the design: solid scheduled, faded sent,
// hollow ring needs review, red ring failed.
export type PostStatus = "scheduled" | "sent" | "draft" | "error";

export type Tag = "educate" | "promote" | "shipped" | "personal" | "untagged";

export interface TagInfo { name: string; color: string; target: number }
export interface PostingSlot { day: string; times: string[] }
export interface Channel {
  id: string; // Buffer channel id (sample data uses the service name)
  service: string; // Buffer service key: twitter, linkedin, bluesky, ...
  name: string; // service label, e.g. "LinkedIn"
  handle: string;
  badge: string;
  charLimit: number;
  schedule: PostingSlot[]; // Buffer posting schedule: the queue's weekly slots
  paused: boolean;
}
export interface Day { name: string; date: number; full: string; iso: string }

export interface Post {
  id: string;
  day: number; // index into the week's days
  channel: string; // Channel.id
  tag: Tag;
  time: string; // "HH:mm"
  full: string; // paragraphs separated by a blank line (a thread has one per post)
  status: PostStatus;
  kind: string;
}

export interface Idea { id: string; title: string; tag: Tag }
export interface GapDef { id: string; title: string; why: string; canFill: boolean; canSpread: boolean }

export interface QueueData {
  live: boolean; // false = sample data
  days: Day[];
  weekLabel: string;
  selectedDay: number;
  channels: Channel[];
  posts: Post[];
  drafts: Post[]; // sample only: drafts that can be approved or skipped locally
  ideas: Idea[];
  gaps: GapDef[];
  usage: { used: number; limit: number; window: string } | null;
  hasMore: boolean; // more posts than were loaded
  nav: { prev?: string; next?: string; today?: string };
}

export const TAGS: Record<Tag, TagInfo> = {
  educate: { name: "Educate", color: "#5B8DEF", target: 40 },
  promote: { name: "Promote", color: "#E8903A", target: 25 },
  shipped: { name: "Shipped", color: "#3DA66B", target: 20 },
  personal: { name: "Personal", color: "#9A7BE0", target: 15 },
  untagged: { name: "Untagged", color: "#9A9791", target: 0 },
};
export const TAG_ORDER: Tag[] = ["educate", "promote", "shipped", "personal", "untagged"];

/** Map a Buffer tag name onto one of our tags; anything else is untagged. */
export function tagFromName(names: string[]): Tag {
  for (const n of names) {
    const key = n.trim().toLowerCase();
    if (key in TAGS && key !== "untagged") return key as Tag;
  }
  return "untagged";
}

export const STATUS_LABEL: Record<PostStatus, string> = {
  scheduled: "Scheduled",
  sent: "Sent",
  draft: "Needs review",
  error: "Failed",
};

export interface ServiceInfo { label: string; icon: "x" | "linkedin" | "bluesky" | null; badge: string; charLimit: number }
const SERVICES: Record<string, ServiceInfo> = {
  twitter: { label: "X", icon: "x", badge: "#12161C", charLimit: 280 },
  x: { label: "X", icon: "x", badge: "#12161C", charLimit: 280 },
  linkedin: { label: "LinkedIn", icon: "linkedin", badge: "#0A66C2", charLimit: 3000 },
  bluesky: { label: "Bluesky", icon: "bluesky", badge: "#1185FE", charLimit: 300 },
  mastodon: { label: "Mastodon", icon: null, badge: "#6364FF", charLimit: 500 },
  threads: { label: "Threads", icon: null, badge: "#2B2A28", charLimit: 500 },
  instagram: { label: "Instagram", icon: null, badge: "#D6249F", charLimit: 2200 },
  facebook: { label: "Facebook", icon: null, badge: "#1877F2", charLimit: 5000 },
};

export function serviceInfo(service: string): ServiceInfo {
  const key = service.toLowerCase();
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return SERVICES[key] ?? { label, icon: null, badge: "#6B6965", charLimit: 3000 };
}

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
  }).filter((r) => r.tag !== "untagged" || r.pct > 0);
}

export const isOffTarget = (row: BalanceRow) => Math.abs(row.diff) > 10;
