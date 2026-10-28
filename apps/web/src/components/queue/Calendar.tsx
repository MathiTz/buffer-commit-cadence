import { TAGS, type Channel, type Day, type GapSlot, type Post } from "@cadence/core";
import { ChannelBadge } from "./icons";
import { dotStyle } from "./style";

interface Props {
  days: Day[];
  openSlots: GapSlot[]; // queue slots with no post: the only cells marked as gaps
  channels: Channel[]; // visible channels only
  posts: Post[]; // posts of visible channels
  selectedDay: number | null; // null while the table shows "needs review"
  onPickDay: (day: number) => void;
}

const GRID = "grid grid-cols-[160px_repeat(7,minmax(0,1fr))]";
const MAX_DOTS = 6;

const plural = (n: number) => (n === 1 ? "1 post" : `${n} posts`);

export function Calendar(props: Props) {
  const { days } = props;
  // One grid per week; indices stay relative to the whole range.
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => w * 7);
  return (
    <section aria-label="Calendar">
      <div className="flex flex-col gap-3">
        {weeks.map((offset) => <WeekGrid key={offset} {...props} days={days.slice(offset, offset + 7)} offset={offset} />)}
      </div>
      <Legend />
    </section>
  );
}

function WeekGrid({ days, offset, openSlots, channels, posts, selectedDay, onPickDay }: Props & { offset: number }) {
  return (
      <div className="overflow-x-auto">
        <div className="min-w-[660px] overflow-hidden rounded-[10px] border border-[#EBEAE8]">
          <div className={`${GRID} border-b border-[#EBEAE8] bg-[#FAFAF9]`}>
            <div />
            {days.map((d, wi) => {
              const i = offset + wi;
              const n = posts.filter((p) => p.day === i).length;
              const selected = i === selectedDay;
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => onPickDay(i)}
                  aria-pressed={selected}
                  aria-label={`${d.full}, ${plural(n)}`}
                  className="border-0 border-l border-[#EBEAE8] px-0.5 py-[9px] text-center text-[#2B2A28]"
                  style={{ background: selected ? "#F1FAEF" : "#FAFAF9", boxShadow: `inset 0 -2px 0 ${selected ? "#2F8F4E" : "transparent"}` }}
                >
                  <div className="text-[11px] font-medium text-[#6B6965]">{d.name}</div>
                  <div className="text-base font-semibold leading-[1.3]">{d.date}</div>
                  <div className="text-[11px] text-[#6B6965]">{plural(n)}</div>
                </button>
              );
            })}
          </div>

          {channels.map((ch) => (
            <div key={ch.id} className={`${GRID} border-b border-[#EBEAE8] last:border-b-0`}>
              <div title={`${ch.name} · ${ch.handle}`} className="flex min-w-0 items-center gap-2.5 px-3">
                <ChannelBadge channel={ch} size={26} />
                <span className="flex min-w-0 flex-col leading-[1.35]">
                  <span className="truncate font-medium">{ch.name}</span>
                  <span className="truncate text-[11px] text-[#6B6965]">{ch.handle}</span>
                </span>
              </div>
              {days.map((d, wi) => {
                const di = offset + wi;
                const here = posts.filter((p) => p.day === di && p.channel === ch.id);
                const open = openSlots.filter((s) => s.day === di && s.channel === ch.id);
                return (
                  <button
                    key={d.name}
                    type="button"
                    onClick={() => onPickDay(di)}
                    aria-label={`${d.full}, ${ch.name}: ${plural(here.length)}${open.length ? `, open queue slot at ${open.map((s) => s.time).join(", ")}` : ""}`}
                    className="flex min-h-[58px] flex-wrap content-center justify-center gap-[5px] border-0 border-l border-[#EBEAE8] px-[5px] py-2 text-[11px] text-[#8A8782]"
                    style={{ background: di === selectedDay ? "#F1FAEF" : "#FFFFFF" }}
                  >
                    {here.slice(0, MAX_DOTS).map((p) => (
                      <span key={p.id} className="box-border block size-[11px] rounded-full border-2" style={dotStyle(TAGS[p.tag].color, p.status)} />
                    ))}
                    {here.length > MAX_DOTS && <span className="font-semibold text-[#2B2A28]">+{here.length - MAX_DOTS}</span>}
                    {open.map((s) => (
                      <span key={s.time} title={`Open queue slot at ${s.time}`} className="box-border block size-[11px] rounded-full border-2 border-dashed border-[#9A9791]" />
                    ))}
                    {here.length === 0 && open.length > 0 && <span className="w-full text-center">open {open[0]!.time}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
  );
}

function Legend() {
  return (
      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-[#6B6965]">
        {(
          [
            ["Scheduled", "scheduled"],
            ["Sent", "sent"],
            ["Needs review", "draft"],
            ["Failed", "error"],
          ] as const
        ).map(([label, status]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="box-border block size-[11px] rounded-full border-2" style={dotStyle("#6B6965", status)} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="box-border block size-[11px] rounded-full border-2 border-dashed border-[#9A9791]" />
          Open queue slot
        </span>
        <span className="ml-auto">Dot colour is the tag. One dot is one post.</span>
      </div>
  );
}
