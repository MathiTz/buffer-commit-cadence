"use client";

import { useState } from "react";
import {
  CHANNELS, DAYS, SAMPLE_DEFAULT_DAY, SAMPLE_DRAFTS, SAMPLE_GAPS, SAMPLE_IDEAS, SAMPLE_POSTS, SAMPLE_WEEK_LABEL,
  tagBalance, type ChannelId, type Idea, type Post,
} from "@cadence/core";
import { Calendar } from "./Calendar";
import { BalanceModal, EventModal, GapsModal } from "./Modals";
import { IconBars, IconInfo, IconNext, IconPrev } from "./icons";
import { PostsTable } from "./PostsTable";
import { Sidebar } from "./Sidebar";
import { btn, btnPrimary, iconBtn } from "./style";

type Modal = { type: "event"; id: string } | { type: "gaps" } | { type: "balance" } | null;
type Review = "approved" | "skipped";

const chip = "flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium text-[#2B2A28]";

export function Queue() {
  const [day, setDay] = useState(SAMPLE_DEFAULT_DAY);
  const [scope, setScope] = useState<"day" | "week">("day");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [hidden, setHidden] = useState<Partial<Record<ChannelId, boolean>>>({});
  const [modal, setModal] = useState<Modal>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState<Post[]>([]);
  const [ideasOpen, setIdeasOpen] = useState(false);

  // Drafts: skipped ones leave the list, approved ones become scheduled, edits replace the text.
  const drafts = [...SAMPLE_DRAFTS, ...extra]
    .filter((d) => reviews[d.id] !== "skipped")
    .map((d) => ({
      ...d,
      full: edits[d.id] ?? d.full,
      status: reviews[d.id] === "approved" ? ("scheduled" as const) : d.status,
    }));
  const allPosts = [...SAMPLE_POSTS, ...drafts];
  const posts = allPosts.filter((p) => !hidden[p.channel]);
  const channels = CHANNELS.filter((c) => !hidden[c.id]);
  const pending = allPosts.filter((p) => p.status === "draft").length;
  const gaps = SAMPLE_GAPS.filter((g) => !dismissed[g.id]);

  let list: Post[];
  if (reviewOnly) list = posts.filter((p) => p.status === "draft");
  else if (scope === "day") list = posts.filter((p) => p.day === day);
  else list = posts;
  list = [...list].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

  const dayCount = posts.filter((p) => p.day === day).length;
  const noun = (n: number) => (n === 1 ? "post" : "posts");
  const tableTitle = reviewOnly
    ? `Needs review · ${list.length} ${noun(list.length)}`
    : scope === "day"
      ? `${DAYS[day]!.full} · ${dayCount} ${noun(dayCount)}`
      : `Whole week · ${posts.length} posts`;

  const close = () => setModal(null);
  const pickDay = (d: number) => { setDay(d); setReviewOnly(false); };
  const review = (id: string, outcome: Review) => { setReviews((r) => ({ ...r, [id]: outcome })); close(); };
  const useIdea = (idea: Idea) => {
    // An idea becomes a draft for the open LinkedIn slot, so it still goes through review.
    setExtra((e) => [...e, { id: `e${e.length + 1}`, day: 1, channel: "linkedin", tag: idea.tag, time: "17:12", status: "draft", kind: "From your Ideas", full: idea.title }]);
    setDay(1); setScope("day"); setReviewOnly(false); setIdeasOpen(false); close();
  };

  const open = modal?.type === "event" ? allPosts.find((p) => p.id === modal.id) : undefined;

  return (
    <div className="flex min-h-screen flex-wrap bg-white text-[13px] text-[#2B2A28] tabular-nums">
      <Sidebar
        open={sideOpen}
        onToggle={() => setSideOpen((o) => !o)}
        channels={CHANNELS}
        hidden={hidden}
        onToggleChannel={(id) => setHidden((h) => ({ ...h, [id]: !h[id] }))}
        posts={allPosts}
        visiblePosts={posts}
      />

      <main className="min-w-0 px-7 pb-10" style={{ flex: "999 1 680px" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EBEAE8] py-4">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="m-0 text-lg font-semibold">Queue</h1>
            <span className="text-[#6B6965]">
              {SAMPLE_WEEK_LABEL} · {posts.length} posts{pending ? ` · ${pending} to review` : ""}
            </span>
            <span className="rounded-full bg-[#EDECE9] px-2 py-0.5 text-[11px] font-medium text-[#6B6965]">Sample data</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" aria-label="Previous week" className={iconBtn}><IconPrev /></button>
            <button type="button" className={btn}>Today</button>
            <button type="button" aria-label="Next week" className={iconBtn}><IconNext /></button>
            <button type="button" className={`${btn} ml-1.5`}>From GitHub</button>
            <button type="button" className={`${btnPrimary} h-7 px-3 text-[13px]`}>New post</button>
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReviewOnly((r) => !r)}
              aria-pressed={reviewOnly}
              className={chip}
              style={{ borderColor: reviewOnly ? "#E8903A" : "#DEDDDA", background: reviewOnly ? "#FCEBD9" : "#FFFFFF" }}
            >
              <span className="box-border block size-2.5 rounded-full border-2 border-[#E8903A] bg-white" />
              {pending} to review
            </button>
            <button type="button" onClick={() => setModal({ type: "gaps" })} className={`${chip} border-[#DEDDDA] bg-white`}>
              <IconInfo />{gaps.length} gaps
            </button>
            <button type="button" onClick={() => setModal({ type: "balance" })} className={`${chip} border-[#DEDDDA] bg-white`}>
              <IconBars />Balance
            </button>
          </div>

          <Calendar channels={channels} posts={posts} selectedDay={reviewOnly ? null : day} onPickDay={pickDay} />

          <PostsTable
            title={tableTitle}
            posts={list}
            channels={CHANNELS}
            scope={scope}
            reviewOnly={reviewOnly}
            onScope={(s) => { setScope(s); setReviewOnly(false); }}
            onOpen={(id) => setModal({ type: "event", id })}
            onSeeGaps={() => setModal({ type: "gaps" })}
          />
        </div>
      </main>

      {open && (
        <EventModal
          post={open}
          channel={CHANNELS.find((c) => c.id === open.channel)!}
          text={open.full}
          onEdit={(t) => setEdits((e) => ({ ...e, [open.id]: t }))}
          onApprove={() => review(open.id, "approved")}
          onSkip={() => review(open.id, "skipped")}
          onClose={close}
        />
      )}
      {modal?.type === "gaps" && (
        <GapsModal
          gaps={gaps}
          ideas={SAMPLE_IDEAS}
          ideasOpen={ideasOpen}
          fillLabel="Use for Tue 17:12"
          onToggleIdeas={() => setIdeasOpen((o) => !o)}
          onDismiss={(id) => setDismissed((d) => ({ ...d, [id]: true }))}
          onUseIdea={useIdea}
          onClose={close}
        />
      )}
      {modal?.type === "balance" && <BalanceModal rows={tagBalance(posts)} onClose={close} />}
    </div>
  );
}

