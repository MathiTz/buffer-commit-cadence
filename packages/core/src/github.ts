import type { Channel, Day, GapSlot } from "./queue";

export interface Release {
  tag: string;
  title: string;
  date: string | null; // YYYY-MM-DD
  url: string;
  body: string; // markdown
  source: "release" | "changelog";
}

const SECTION_SKIP = /known limits?|breaking|internal|chore|dependenc/i;

/** Split a CHANGELOG.md into releases: one per "## v1.2.3 (2026-01-02)" heading. "Unreleased" is skipped. */
export function parseChangelog(md: string, pageUrl: string): Release[] {
  return md
    .split(/^##\s+/m)
    .slice(1)
    .map((block) => {
      const [heading = "", ...rest] = block.split("\n");
      return { heading: heading.trim(), body: rest.join("\n").trim() };
    })
    .filter((s) => !/unreleased/i.test(s.heading))
    .map((s) => ({
      tag: s.heading.match(/v?\d+\.\d+(?:\.\d+)?[\w.+-]*/)?.[0] ?? s.heading.split(/\s/)[0] ?? "release",
      title: s.heading,
      date: s.heading.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
      url: pageUrl,
      body: s.body,
      source: "changelog" as const,
    }));
}

const plain = (s: string) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();

/** Bullet points worth posting: everything under Added/Changed/Fixed, not "Known limits". */
export function highlights(body: string): string[] {
  const out: string[] = [];
  let skipping = false;
  for (const line of body.split("\n")) {
    const heading = line.match(/^#{2,4}\s+(.*)/);
    if (heading) { skipping = SECTION_SKIP.test(heading[1]!); continue; }
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    if (bullet && !skipping) out.push(plain(bullet[1]!));
  }
  return out.filter(Boolean);
}

/** First sentence, shortened to `max`: at a natural break (" (", ", ") if there is one, else at a word with "…". */
function clip(text: string, max: number): string {
  const first = text.split(/(?<=[.!?])\s/)[0]!.replace(/[.]$/, "");
  if (first.length <= max) return first;
  const head = first.slice(0, max);
  const balanced = (t: string) => (t.match(/\(/g)?.length ?? 0) === (t.match(/\)/g)?.length ?? 0);
  const breaks = [head.lastIndexOf(" ("), head.lastIndexOf(", ")].filter((i) => i >= 25 && balanced(head.slice(0, i))).sort((x, y) => y - x);
  if (breaks.length) return head.slice(0, breaks[0]);
  const space = head.slice(0, max - 1).lastIndexOf(" ");
  return head.slice(0, space > 20 ? space : max - 1) + "…";
}

const sentence = (s: string) => (s.endsWith("…") ? s : `${s}.`);

export interface ReleaseDraft { channel: Channel; full: string }

/** One draft per channel from a release. Deterministic templates, sized to each channel's limit. */
export function draftPosts(release: Release, project: string, channels: Channel[]): ReleaseDraft[] {
  const items = highlights(release.body);
  const head = `${project} ${release.tag}`;
  return channels.map((channel) => {
    const long = channel.charLimit >= 1000;
    let full: string;
    if (long) {
      const list = items.slice(0, 5).map((i) => `• ${clip(i, 160)}`).join("\n");
      full = `${head} is out.${list ? `\n\n${list}` : ""}\n\n${release.url}`;
    } else {
      const link = ` ${release.url}`;
      let text = `${head} is out.`;
      for (const i of items.slice(0, 3)) {
        const next = `${text} ${sentence(clip(i, 90))}`;
        if (next.length + link.length > channel.charLimit) break;
        text = next;
      }
      full = text + link;
    }
    return { channel, full: full.length > channel.charLimit ? full.slice(0, channel.charLimit - 1) + "…" : full };
  });
}

export interface PlaceInput {
  days: Day[];
  now: { date: string; time: string }; // in the account's zone
  openSlots: GapSlot[];
  channelId: string;
  offsetMinutes?: number; // spreads several drafts on the same default time
  fallbackDay: number;
}

/** Earliest future slot for a channel: its open queue slot if one exists, else 10:00 on the first future day. */
export function pickSlot({ days, now, openSlots, channelId, offsetMinutes = 0, fallbackDay }: PlaceInput): { day: number; time: string } {
  const fallbackTime = `10:${String(offsetMinutes).padStart(2, "0")}`;
  const future = (di: number, time: string) => days[di]!.iso > now.date || (days[di]!.iso === now.date && time > now.time);
  // An open queue slot beats the default time: that is the gap the draft is meant to fill.
  const open = openSlots
    .filter((s) => s.channel === channelId && future(s.day, s.time))
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))[0];
  if (open) return { day: open.day, time: open.time };
  const day = days.findIndex((_, di) => future(di, fallbackTime));
  return { day: day >= 0 ? day : fallbackDay, time: fallbackTime };
}
