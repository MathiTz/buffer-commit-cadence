import { TAGS, TAG_ORDER, type Channel, type GapSlot, type Post } from "@cadence/core";
import { ChannelBadge } from "./icons";

interface Props {
  channels: Channel[];
  hidden: Record<string, boolean>;
  onToggle: (id: string) => void;
  posts: Post[]; // the loaded week, all channels
  openSlots: GapSlot[];
}

/** One card per channel: its share of the week by tag, and whether it is shown in the calendar. */
export function ChannelCards({ channels, hidden, onToggle, posts, openSlots }: Props) {
  if (!channels.length) return null;
  return (
    <section aria-label="Channels">
      <div className="mb-2 text-xs font-medium text-[#6B6965]">Channels this week. Click one to show or hide it.</div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {channels.map((ch) => {
          const mine = posts.filter((p) => p.channel === ch.id);
          const open = openSlots.filter((s) => s.channel === ch.id).length;
          const mix = TAG_ORDER.map((tag) => ({ tag, n: mine.filter((p) => p.tag === tag).length })).filter((m) => m.n > 0);
          const on = !hidden[ch.id];
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onToggle(ch.id)}
              aria-pressed={on}
              className="rounded-[10px] border border-[#EBEAE8] bg-white p-3 text-left"
              style={{ opacity: on ? 1 : 0.5 }}
            >
              <div className="flex items-center gap-2.5">
                <ChannelBadge channel={ch} size={26} />
                <span className="flex min-w-0 flex-col leading-[1.35]">
                  <span className="truncate font-medium">{ch.name}</span>
                  <span className="truncate text-[11px] text-[#6B6965]">{ch.handle}</span>
                </span>
                <span className="ml-auto text-right text-xs text-[#6B6965]">
                  {mine.length} {mine.length === 1 ? "post" : "posts"}
                  {open > 0 && <><br />{open} open</>}
                </span>
              </div>
              <div className="my-2 flex h-1.5 overflow-hidden rounded-[3px] bg-[#EDECE9]" aria-hidden="true">
                {mix.map((m) => <span key={m.tag} style={{ width: `${(m.n / mine.length) * 100}%`, background: TAGS[m.tag].color }} />)}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#6B6965]">
                {mix.length === 0 && <span>No posts this week</span>}
                {mix.map((m) => (
                  <span key={m.tag} className="flex items-center gap-1.5">
                    <span className="block size-2 rounded-full" style={{ background: TAGS[m.tag].color }} />{TAGS[m.tag].name} {m.n}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
