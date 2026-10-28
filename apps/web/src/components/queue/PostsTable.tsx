import { STATUS_LABEL, TAGS, summary, type Channel, type Day, type Post } from "@cadence/core";
import { ChannelBadge } from "./icons";
import { btnPrimary, STATUS_COLOR } from "./style";

interface Props {
  days: Day[];
  isReviewable: (post: Post) => boolean; // false: the post lives in Buffer, so the action is "Open"
  title: string;
  posts: Post[];
  channels: Channel[];
  scope: "day" | "week";
  reviewOnly: boolean;
  onScope: (scope: "day" | "week") => void;
  onOpen: (id: string) => void;
  onSeeGaps: () => void;
}

const COLS = "grid grid-cols-[60px_52px_104px_96px_minmax(0,1fr)_96px_84px] gap-3 px-3.5";

export function PostsTable({ days, isReviewable, title, posts, channels, scope, reviewOnly, onScope, onOpen, onSeeGaps }: Props) {
  const channelOf = (p: Post) => channels.find((c) => c.id === p.channel)!;
  const seg = (active: boolean) => `border-0 px-3 py-[5px] text-xs font-medium text-[#2B2A28] ${active ? "bg-[#EDECE9]" : "bg-white"}`;

  return (
    <section aria-label="Posts for the selected day">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-semibold">{title}</h2>
        <div role="group" aria-label="Table range" className="flex overflow-hidden rounded-md border border-[#DEDDDA]">
          <button type="button" aria-pressed={scope === "day" && !reviewOnly} onClick={() => onScope("day")} className={seg(scope === "day" && !reviewOnly)}>
            Selected day
          </button>
          <button type="button" aria-pressed={scope === "week" && !reviewOnly} onClick={() => onScope("week")} className={`${seg(scope === "week" && !reviewOnly)} border-l border-[#DEDDDA]`}>
            Whole week
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-[#EBEAE8]">
        <div role="table" aria-label="Posts" className="min-w-[780px]">
          <div role="row" className={`${COLS} border-b border-[#EBEAE8] bg-[#FAFAF9] py-2 text-xs font-medium text-[#6B6965]`}>
            {["Day", "Time", "Channel", "Tag", "Post", "Status", ""].map((h, i) => (
              <div key={i} role="columnheader">{h}</div>
            ))}
          </div>

          {posts.map((p) => {
            const ch = channelOf(p);
            const draft = p.status === "draft" && isReviewable(p);
            return (
              <div key={p.id} role="row" className={`${COLS} h-10 items-center border-b border-[#F1F0EE] last:border-b-0`}>
                <div role="cell" className="text-[#6B6965]">{days[p.day]!.name} {days[p.day]!.date}</div>
                <div role="cell">{p.time}</div>
                <div role="cell" className="flex items-center gap-2"><ChannelBadge channel={ch} />{ch.name}</div>
                <div role="cell" className="flex items-center gap-1.5">
                  <span className="block size-2 rounded-full" style={{ background: TAGS[p.tag].color }} />{TAGS[p.tag].name}
                </div>
                <div role="cell" className="min-w-0 truncate">{summary(p.full)}</div>
                <div role="cell" className="font-medium" style={{ color: STATUS_COLOR[p.status] }}>{STATUS_LABEL[p.status]}</div>
                <div role="cell">
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    aria-label={`${draft ? "Review" : "Open"} ${ch.name} post at ${p.time}`}
                    className={`px-2.5 py-1 text-xs ${draft ? btnPrimary : "rounded-md border border-[#DEDDDA] bg-white font-semibold text-[#2B2A28] hover:bg-[#FAFAF9]"}`}
                  >
                    {draft ? "Review" : "Open"}
                  </button>
                </div>
              </div>
            );
          })}

          {posts.length === 0 && (
            <div className="flex flex-wrap items-center gap-3 px-3.5 py-5 text-[#6B6965]">
              Nothing here. Pick another day, or see what could fill it.
              <button type="button" onClick={onSeeGaps} className={`px-2.5 py-1 text-xs ${btnPrimary}`}>See gaps</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
