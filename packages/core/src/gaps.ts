import type { Channel, Day, GapDef, GapSlot, Post } from "./queue";
import { dayIndex } from "./week";

const CROWDED_AT = 6; // posts in one day

const listJoin = (items: string[]) =>
  items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export interface GapInput {
  days: Day[];
  channels: Channel[];
  posts: Post[];
  now: { date: string; time: string }; // in the account's time zone; slots before it aren't gaps
}

/**
 * Deterministic gap rules (no AI):
 *  - open queue slots: a posting-schedule slot with no post at that time on that channel
 *  - crowded day: a day with six or more posts
 */
export function findGaps({ days, channels, posts, now }: GapInput): GapDef[] {
  const gaps: GapDef[] = [];

  for (const ch of channels) {
    if (ch.paused) continue;
    const open: string[] = [];
    const slots: GapSlot[] = [];
    days.forEach((d, di) => {
      if (d.iso < now.date) return;
      for (const slot of ch.schedule) {
        if (dayIndex(slot.day) !== di) continue;
        for (const raw of slot.times) {
          const time = raw.slice(0, 5);
          if (d.iso === now.date && time <= now.time) continue;
          if (!posts.some((p) => p.channel === ch.id && p.day === di && p.time === time)) { open.push(`${d.name} ${time}`); slots.push({ channel: ch.id, day: di, time }); }
        }
      }
    });
    if (open.length) {
      gaps.push({
        id: `slots-${ch.id}`,
        title: `${ch.name} has ${open.length} open queue ${open.length === 1 ? "slot" : "slots"}`,
        why: `${listJoin(open)} ${open.length === 1 ? "has" : "have"} no post.`,
        canFill: true,
        canSpread: false,
        slots,
      });
    }
  }

  const counts = days.map((_, di) => posts.filter((p) => p.day === di).length);
  const max = Math.max(...counts);
  if (max >= CROWDED_AT) {
    const di = counts.indexOf(max);
    const name = days[di]!.full.split(",")[0]!;
    gaps.push({ id: `crowded-${days[di]!.iso}`, title: `${name} is crowded`, why: `${name} has ${max} posts, the most of any day.`, canFill: false, canSpread: true });
  }
  return gaps;
}
