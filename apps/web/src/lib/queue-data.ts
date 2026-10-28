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

function usageFrom(rate: RateLimit): QueueData["usage"] {
  // header looks like "110-in-15min"
  const m = rate.limit?.match(/^(\d+)-in-(.+)$/);
  if (!m || rate.remaining == null) return null;
  const limit = Number(m[1]);
  return { used: Math.max(0, limit - rate.remaining), limit, window: m[2]!.replace(/(\d)(min|days?|hours?)/, "$1 $2") };
}

/** One week of the user's real Buffer queue. Costs four API requests (account, channels, posts, ideas). */
export async function loadQueueData(token: string, requestedWeek: string | undefined): Promise<QueueData> {
  const { account } = await getAccount(token);
  const org = account.organizations[0];
  const tz = account.timezone || "UTC";
  const now = zonedParts(new Date(), tz);
  const start = weekStart(requestedWeek ?? now.date);
  const days = buildDays(start);

  const empty: QueueData = {
    live: true, organizationId: org?.id ?? null, timezone: tz, days, weekLabel: weekLabel(days), selectedDay: 0, channels: [], posts: [], drafts: [], ideas: [],
    gaps: [], usage: null, hasMore: false, nav: {},
  };
  if (!org) return empty;

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

  // Query a day wider than the week on each side, then bucket by the account's local date.
  const range = [`${addDays(start, -1)}T00:00:00Z`, `${addDays(start, 8)}T00:00:00Z`] as const;
  const { posts: rawPosts, hasMore, rateLimit } = await getPosts(token, org.id, range[0], range[1]);
  const { ideas: rawIdeas, rateLimit: lastRate } = await getIdeas(token, org.id);

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

  const ideas: Idea[] = rawIdeas
    .filter((i) => i.content.title || i.content.text)
    .map((i) => ({ id: i.id, title: i.content.title || i.content.text!, text: i.content.text ?? undefined, tag: tagFromName(i.content.tags.map((t) => t.name)), tagIds: i.content.tags.map((t) => t.id) }));

  const todayIdx = days.findIndex((d) => d.iso === now.date);
  const nowWeek = weekStart(now.date);
  return {
    live: true, organizationId: org.id, timezone: tz, days, weekLabel: weekLabel(days),
    selectedDay: todayIdx >= 0 ? todayIdx : 0,
    channels, posts, drafts: [], ideas,
    gaps: findGaps({ days, channels, posts, now }),
    usage: usageFrom(lastRate) ?? usageFrom(rateLimit),
    hasMore,
    nav: {
      prev: `/queue?week=${addDays(start, -7)}`,
      next: `/queue?week=${addDays(start, 7)}`,
      today: start === nowWeek ? undefined : "/queue",
    },
  };
}
