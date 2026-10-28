import { useState } from "react";
import { TAGS, TAG_ORDER, addDays, weekStart, weekdayOf, type Channel, type Day, type GapSlot, type Post } from "@cadence/core";
import { dotStyle } from "./style";

interface Props {
  monthOf: string; // any date in the month to show
  today: string; // ISO date in the account's timezone
  loaded: Day[]; // the one week that has data
  openSlots: GapSlot[]; // queue slots with no post, within the loaded week
  channels: Channel[]; // visible channels only
  posts: Post[]; // posts of visible channels, within the loaded week
  selectedIso: string | null; // null while the table shows "needs review"
  onPickDay: (iso: string) => void;
  onOpenPost: (id: string) => void;
  onHoverWeek: (monday: string | null) => void; // a week without data is hovered: lets the page prefetch it
}

const COLS = "grid grid-cols-7";
const MAX_DOTS = 6;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const plural = (n: number) => (n === 1 ? "1 post" : `${n} posts`);
const monthStart = (iso: string) => `${iso.slice(0, 7)}-01`;

interface Tip { x: number; y: number; lines: string[]; body?: string }

export function Calendar({ monthOf, today, loaded, openSlots, channels, posts, selectedIso, onPickDay, onOpenPost, onHoverWeek }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);
  const first = monthStart(monthOf);
  const gridStart = weekStart(first);
  const daysInMonth = new Date(Date.UTC(+first.slice(0, 4), +first.slice(5, 7), 0)).getUTCDate();
  const rows = Math.ceil((weekdayOf(first) + daysInMonth) / 7);
  const month = first.slice(0, 7);
  const loadedMonday = loaded[0]?.iso;
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name ?? "Channel";

  const show = (el: HTMLElement, lines: string[], body?: string) => {
    const box = el.closest("[data-grid]")!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = Math.max(6, Math.min(r.left - box.left - 10, box.width - 246));
    setTip({ x, y: r.top - box.top, lines, body });
  };

  return (
    <section aria-label="Calendar">
      <div data-grid className="relative overflow-hidden rounded-[10px] border border-[#EBEAE8]" onMouseLeave={() => { setTip(null); onHoverWeek(null); }}>
        <div className={`${COLS} border-b border-[#EBEAE8] bg-[#FAFAF9]`}>
          {DAYS.map((d) => <div key={d} className="py-1.5 text-center text-[11px] font-medium text-[#6B6965]">{d}</div>)}
        </div>

        {Array.from({ length: rows }, (_, row) => {
          const monday = addDays(gridStart, row * 7);
          const isLoaded = monday === loadedMonday;
          return (
            <div key={monday} className={`${COLS} border-b border-[#EBEAE8] last:border-b-0`}>
              {Array.from({ length: 7 }, (_, col) => {
                const iso = addDays(monday, col);
                const di = isLoaded ? col : -1;
                const here = di >= 0 ? posts.filter((p) => p.day === di) : [];
                const open = di >= 0 ? openSlots.filter((s) => s.day === di) : [];
                const inMonth = iso.startsWith(month);
                const selected = iso === selectedIso;
                const label = `${new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}`;
                return (
                  <div
                    key={iso}
                    onClick={() => onPickDay(iso)}
                    onMouseEnter={() => { if (!isLoaded) onHoverWeek(monday); }}
                    className={`min-h-[68px] cursor-pointer border-r border-[#EBEAE8] p-1.5 last:border-r-0 ${isLoaded ? "" : "hover:bg-[#FAFAF9]"}`}
                    style={{ background: selected ? "#F1FAEF" : undefined, boxShadow: selected ? "inset 0 -2px 0 #2F8F4E" : undefined }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onPickDay(iso); }}
                      aria-pressed={selected}
                      aria-label={isLoaded ? `${label}, ${plural(here.length)}${open.length ? `, open queue slot at ${open.map((s) => s.time).join(", ")}` : ""}` : `${label}. Load this week`}
                      className={`border-0 bg-transparent p-0 text-xs ${iso === today ? "rounded-full bg-[#2B2A28] px-1.5 font-semibold text-white" : inMonth ? "text-[#2B2A28]" : "text-[#A8A5A0]"}`}
                    >
                      {iso.slice(8) === "01" ? `${new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} 1` : +iso.slice(8)}
                    </button>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {here.slice(0, MAX_DOTS).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenPost(p.id); }}
                          onMouseEnter={(e) => show(e.currentTarget, [`${channelName(p.channel)} · ${p.time} · ${TAGS[p.tag].name}`], p.full)}
                          onFocus={(e) => show(e.currentTarget, [`${channelName(p.channel)} · ${p.time} · ${TAGS[p.tag].name}`], p.full)}
                          onBlur={() => setTip(null)}
                          aria-label={`${channelName(p.channel)} at ${p.time}, ${TAGS[p.tag].name}: ${p.full.slice(0, 80)}`}
                          className="box-border block size-[11px] cursor-pointer rounded-full border-2 p-0"
                          style={dotStyle(TAGS[p.tag].color, p.status)}
                        />
                      ))}
                      {here.length > MAX_DOTS && <span className="text-[11px] font-semibold text-[#2B2A28]">+{here.length - MAX_DOTS}</span>}
                      {open.map((s) => (
                        <span
                          key={`${s.channel}-${s.time}`}
                          onMouseEnter={(e) => show(e.currentTarget, [`Open queue slot · ${channelName(s.channel)} · ${s.time}`], "Click the day to fill it.")}
                          className="box-border block size-[11px] rounded-full border-2 border-dashed border-[#9A9791]"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-[236px] rounded-lg border border-[#DEDDDA] bg-white p-2 text-xs leading-snug text-[#2B2A28]"
            style={{ left: tip.x, top: tip.y, transform: "translateY(calc(-100% - 8px))" }}
          >
            {tip.lines.map((l) => <div key={l} className="text-[#6B6965]">{l}</div>)}
            {tip.body && <div className="mt-1">{tip.body.length > 140 ? `${tip.body.slice(0, 140).trimEnd()}…` : tip.body}</div>}
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B6965]">
        {TAG_ORDER.filter((t) => t !== "untagged").map((t) => (
          <span key={t} className="flex items-center gap-1.5"><span className="block size-2 rounded-full" style={{ background: TAGS[t].color }} />{TAGS[t].name}</span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="box-border block size-[11px] rounded-full border-2 border-dashed border-[#9A9791]" />Open slot
        </span>
        <span className="flex items-center gap-1.5">
          <span className="box-border block size-[11px] rounded-full border-2" style={dotStyle("#6B6965", "draft")} />Needs review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="box-border block size-[11px] rounded-full border-2" style={dotStyle("#6B6965", "sent")} />Sent
        </span>
        <span className="ml-auto">Dots show the selected week. Click another week to load it.</span>
      </div>
    </section>
  );
}
