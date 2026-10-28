import { cached } from "./cache";
import {
  getAccount, getChannels, getIdeas, getPosts, type BufferPost, type RateLimit,
} from "@cadence/buffer-client";
import {
  addDays, buildDays, dayIndex, findGaps, serviceInfo, tagFromName, weekLabel, weekStart, zonedParts,
  type Channel, type Idea, type Post, type PostStatus, type QueueData,
} from "@cadence/core";

const STATUS: Record<BufferPost["status"], PostStatus> = {
  draft: "draft",
  needs_approval: "draft",
  scheduled: "scheduled",
  sending: "scheduled",
  sent: "sent",
  error: "error",
};

function usageFrom(rate: RateLimit | null): QueueData["usage"] {
  // header looks like "110-in-15min"
  if (!rate) return null;
  const m = rate.limit?.match(/^(\d+)-in-(.+)$/);
  if (!m || rate.remaining == null) return null;
  const limit = Number(m[1]);
  return { used: Math.max(0, limit - rate.remaining), limit, window: m[2]!.replace(/(\d)(min|days?|hours?)/, "$1 $2") };
}

/** Everything that doesn't change from week to week, so moving between weeks costs one API request. */
async function loadBase(token: string) {
  const { account } = await getAccount(token);
  const org = account.organizations[0];
  const timezone = account.timezone || "UTC";
  if (!org) return { orgId: null, timezone, channels: [] as Channel[], ideas: [] as Idea[], rateLimit: null as RateLimit | null };

  const { channels: raw } = await getChannels(token, org.id);
  const channels: Channel[] = raw
    .filter((c) => !c.isDisconnected)
    .map((c) => {
      const info = serviceInfo(c.service);
      return {
        id: c.id, service: c.service, name: info.label, handle: c.displayName || c.name, badge: info.badge,
        charLimit: info.charLimit, schedule: c.postingSchedule, paused: c.isQueuePaused,
      };
    });
  const { ideas: rawIdeas, rateLimit } = await getIdeas(token, org.id);
  const ideas: Idea[] = rawIdeas
    .filter((i) => i.content.title || i.content.text)
    .map((i) => ({ id: i.id, title: i.content.title || i.content.text!, text: i.content.text ?? undefined, tag: tagFromName(i.content.tags.map((t) => t.name)), tagIds: i.content.tags.map((t) => t.id) }));
  return { orgId: org.id, timezone, channels, ideas, rateLimit };
}

const BASE_TTL_MS = 5 * 60_000;

/** One week of the user's real Buffer queue. The first load costs four API requests; later weeks cost one. */
export async function loadQueueData(token: string, sid: string, requestedWeek: string | undefined): Promise<QueueData> {
  const base = await cached(`${sid}:queue-base`, BASE_TTL_MS, () => loadBase(token));
  const { timezone: tz, channels, ideas } = base;
  const now = zonedParts(new Date(), tz);
  const start = weekStart(requestedWeek ?? now.date);
  const days = buildDays(start);
  const todayIdx = days.findIndex((d) => d.iso === now.date);
  const nowWeek = weekStart(now.date);
  const nav = {
    prev: `/queue?week=${addDays(start, -7)}`,
    next: `/queue?week=${addDays(start, 7)}`,
    today: start === nowWeek ? undefined : "/queue",
  };
  const empty: QueueData = {
    live: true, organizationId: base.orgId, timezone: tz, days, weekLabel: weekLabel(days), selectedDay: todayIdx >= 0 ? todayIdx : 0,
    channels, posts: [], drafts: [], ideas, gaps: [], usage: usageFrom(base.rateLimit), hasMore: false, nav,
  };
  if (!base.orgId) return empty;

  // Query a day wider than the week on each side, then bucket by the account's local date.
  const { posts: rawPosts, hasMore, rateLimit } = await getPosts(token, base.orgId, `${addDays(start, -1)}T00:00:00Z`, `${addDays(start, 8)}T00:00:00Z`);

  const posts: Post[] = [];
  for (const p of rawPosts) {
    if (!p.dueAt) continue;
    const local = zonedParts(p.dueAt, tz);
    const di = days.findIndex((d) => d.iso === local.date);
    if (di < 0 || !channels.some((c) => c.id === p.channelId)) continue;
    posts.push({
      id: p.id, day: di, channel: p.channelId, tag: tagFromName(p.tags.map((t) => t.name)), time: local.time,
      full: p.text, status: STATUS[p.status] ?? "scheduled", kind: "",
    });
  }

  return { ...empty, posts, gaps: findGaps({ days, channels, posts, now }), usage: usageFrom(rateLimit) ?? empty.usage, hasMore };
}
