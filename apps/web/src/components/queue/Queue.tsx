"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { draftPosts, pickSlot, tagBalance, zonedParts, zonedToUtc, type GapDef, type Idea, type Post, type PublishMode, type QueueData, type Release } from "@cadence/core";
import { approvePost, loadReleases, saveIdea, undoPost } from "@/app/queue/actions";
import { Calendar } from "./Calendar";
import { BalanceModal, EventModal, GapsModal, GithubModal, IdeaModal } from "./Modals";
import { IconBars, IconInfo, IconNext, IconPrev } from "./icons";
import { PostsTable } from "./PostsTable";
import { Sidebar } from "./Sidebar";
import { btn, btnPrimary, iconBtn } from "./style";

type Modal = { type: "event"; id: string } | { type: "gaps" } | { type: "balance" } | { type: "idea" } | { type: "github" } | null;
type Review = "approved" | "skipped";
type Toast = { text: string; undoId?: string };

const TOAST_MS = 60_000; // the undo window
const DEFAULT_REPO = "MathiTz/buffer-commit-cadence";

const chip = "flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium text-[#2B2A28]";
const noun = (n: number) => (n === 1 ? "post" : "posts");

function NavLink({ href, label, children, className }: { href?: string; label?: string; children: React.ReactNode; className: string }) {
  if (!href) return <button type="button" disabled aria-label={label} className={`${className} opacity-40`}>{children}</button>;
  return <Link href={href} aria-label={label} className={`${className} inline-flex items-center justify-center`}>{children}</Link>;
}

export function Queue({ data }: { data: QueueData }) {
  const { days, live } = data;
  const router = useRouter();
  const [day, setDay] = useState(data.selectedDay);
  const [scope, setScope] = useState<"day" | "week">("day");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<Modal>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState<Post[]>([]);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Sample drafts: skipped ones leave the list, approved ones become scheduled, edits replace the text.
  const drafts = [...data.drafts, ...extra]
    .filter((d) => reviews[d.id] !== "skipped")
    .map((d) => ({ ...d, full: edits[d.id] ?? d.full, status: reviews[d.id] === "approved" ? ("scheduled" as const) : d.status }));
  const allPosts = [...data.posts, ...drafts];
  const posts = allPosts.filter((p) => !hidden[p.channel]);
  const channels = data.channels.filter((c) => !hidden[c.id]);
  const pending = allPosts.filter((p) => p.status === "draft").length;
  const gaps = data.gaps.filter((g) => !dismissed[g.id]);

  let list: Post[];
  if (reviewOnly) list = posts.filter((p) => p.status === "draft");
  else if (scope === "day") list = posts.filter((p) => p.day === day);
  else list = posts;
  list = [...list].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));

  const dayCount = posts.filter((p) => p.day === day).length;
  const tableTitle = reviewOnly
    ? `Needs review · ${list.length} ${noun(list.length)}`
    : scope === "day"
      ? `${days[day]!.full} · ${dayCount} ${noun(dayCount)}`
      : `Whole week · ${posts.length} ${noun(posts.length)}`;

  // Real Buffer posts open read-only; only drafts created in this page can be approved.
  const isReviewable = (p: Post) => !live || !!p.local;
  const showToast = (t: Toast, ms = TOAST_MS) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };
  const close = () => { setModal(null); setActionError(null); };
  const pickDay = (d: number) => { setDay(d); setReviewOnly(false); };
  const review = (id: string, outcome: Review) => { setReviews((r) => ({ ...r, [id]: outcome })); close(); };
  const useIdea = (idea: Idea, gap: GapDef) => {
    // An idea becomes a draft for the gap's first open slot. Nothing reaches Buffer until it is approved.
    const slot = gap.slots?.[0];
    if (!slot) return;
    setExtra((e) => [...e, { id: `local-${Date.now()}`, day: slot.day, channel: slot.channel, tag: idea.tag, tagIds: idea.tagIds, time: slot.time, status: "draft", kind: "From your Ideas", full: idea.text ?? idea.title, local: true }]);
    setDay(slot.day); setScope("day"); setReviewOnly(false); setIdeasOpen(false); close();
  };
  const fillLabel = (g: GapDef) => {
    const slot = g.slots?.[0];
    return slot ? `Use for ${days[slot.day]!.name} ${slot.time}` : "Use this idea";
  };

  const approve = async (post: Post, mode: PublishMode) => {
    if (!live) return review(post.id, "approved");
    setBusy(true);
    setActionError(null);
    const r = await approvePost({
      channelId: post.channel, service: data.channels.find((c) => c.id === post.channel)?.service ?? "", text: post.full, mode, tagIds: post.tagIds,
      dueAt: zonedToUtc(days[post.day]!.iso, post.time, data.timezone),
    });
    setBusy(false);
    if (!r.ok) return setActionError(r.message);
    setExtra((e) => e.filter((x) => x.id !== post.id));
    close();
    // A post that is already live can't be unpublished from here, so only the others offer Undo.
    if (mode === "now") showToast({ text: "Posted." });
    else showToast({ text: mode === "draft" ? "Saved as a draft in Buffer." : "Added to your Buffer queue.", undoId: r.value.id });
    router.refresh();
  };
  // One draft per channel from a release, each in the channel's next open slot (or 10:00). They still need approval.
  const draftFromRelease = (release: Release, repo: string) => {
    const now = zonedParts(new Date(), data.timezone);
    const openSlots = gaps.flatMap((g) => g.slots ?? []);
    const usable = data.channels.filter((c) => !c.paused);
    const made: Post[] = draftPosts(release, repo.split("/")[1] ?? repo, usable).map((d, i) => {
      const slot = pickSlot({ days, now, openSlots, channelId: d.channel.id, offsetMinutes: i * 15, fallbackDay: day });
      return { id: `gh-${Date.now()}-${i}`, day: slot.day, channel: d.channel.id, tag: "shipped", time: slot.time, status: "draft", kind: `From GitHub: ${release.tag}`, full: d.full, local: true };
    });
    if (!made.length) return;
    setExtra((e) => [...e, ...made]);
    setReviewOnly(true);
    close();
    showToast({ text: `${made.length} draft${made.length === 1 ? "" : "s"} from ${release.tag} ready to review.` }, 8000);
  };
  const saveNewIdea = async (title: string, text: string) => {
    if (!data.organizationId) return setActionError("No Buffer organization found.");
    setBusy(true);
    setActionError(null);
    const r = await saveIdea({ organizationId: data.organizationId, title, text });
    setBusy(false);
    if (!r.ok) return setActionError(r.message);
    close();
    showToast({ text: "Idea saved in Buffer." }, 6000);
    router.refresh();
  };
  const draftToIdea = async (post: Post) => {
    if (!data.organizationId) return setActionError("No Buffer organization found.");
    setBusy(true);
    setActionError(null);
    const r = await saveIdea({ organizationId: data.organizationId, title: "", text: post.full });
    setBusy(false);
    if (!r.ok) return setActionError(r.message);
    setExtra((e) => e.filter((x) => x.id !== post.id));
    close();
    showToast({ text: "Saved to your Buffer Ideas." }, 6000);
    router.refresh();
  };
  const undo = async () => {
    if (!toast?.undoId) return;
    setBusy(true);
    const r = await undoPost(toast.undoId);
    setBusy(false);
    showToast({ text: r.ok ? "Removed from Buffer." : `Couldn't undo: ${r.message}` }, 6000);
    if (r.ok) router.refresh();
  };

  const open = modal?.type === "event" ? allPosts.find((p) => p.id === modal.id) : undefined;
  const openChannel = open && data.channels.find((c) => c.id === open.channel);

  return (
    <div className="flex min-h-screen flex-wrap bg-white text-[13px] text-[#2B2A28] tabular-nums">
      <Sidebar
        open={sideOpen}
        onToggle={() => setSideOpen((o) => !o)}
        channels={data.channels}
        hidden={hidden}
        onToggleChannel={(id) => setHidden((h) => ({ ...h, [id]: !h[id] }))}
        posts={allPosts}
        visiblePosts={posts}
        usage={data.usage}
        live={live}
      />

      <main className="min-w-0 px-7 pb-10" style={{ flex: "999 1 680px" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EBEAE8] py-4">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h1 className="m-0 text-lg font-semibold">Queue</h1>
            <span className="text-[#6B6965]">
              {data.weekLabel} · {posts.length} {noun(posts.length)}{pending ? ` · ${pending} to review` : ""}
            </span>
            {!live && <span className="rounded-full bg-[#EDECE9] px-2 py-0.5 text-[11px] font-medium text-[#6B6965]">Sample data</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <NavLink href={data.nav.prev} label="Previous week" className={iconBtn}><IconPrev /></NavLink>
            <NavLink href={data.nav.today} className={btn}>Today</NavLink>
            <NavLink href={data.nav.next} label="Next week" className={iconBtn}><IconNext /></NavLink>
            {live && <button type="button" onClick={() => { setActionError(null); setModal({ type: "idea" }); }} className={`${btn} ml-1.5`}>New idea</button>}
            <button type="button" onClick={() => setModal({ type: "github" })} className={`${btn} ${live ? "" : "ml-1.5"}`}>From GitHub</button>
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
              <IconInfo />{gaps.length} {gaps.length === 1 ? "gap" : "gaps"}
            </button>
            <button type="button" onClick={() => setModal({ type: "balance" })} className={`${chip} border-[#DEDDDA] bg-white`}>
              <IconBars />Balance
            </button>
          </div>

          {live && data.channels.length === 0 && (
            <p className="m-0 rounded-[10px] border border-dashed border-[#CBC9C5] p-4 text-[#6B6965]">
              No channels are connected to this Buffer account yet. Connect one in Buffer, or{" "}
              <a href="/queue?sample=1" className="underline">view sample data</a>.
            </p>
          )}

          <Calendar days={days} openSlots={gaps.flatMap((g) => g.slots ?? [])} channels={channels} posts={posts} selectedDay={reviewOnly ? null : day} onPickDay={pickDay} />
          {data.hasMore && <p className="m-0 -mt-3 text-xs text-[#6B6965]">This week has more posts than were loaded. Showing the first {data.posts.length}.</p>}

          <PostsTable
            days={days}
            isReviewable={isReviewable}
            title={tableTitle}
            posts={list}
            channels={data.channels}
            scope={scope}
            reviewOnly={reviewOnly}
            onScope={(s) => { setScope(s); setReviewOnly(false); }}
            onOpen={(id) => { setActionError(null); setModal({ type: "event", id }); }}
            onSeeGaps={() => setModal({ type: "gaps" })}
          />
        </div>
      </main>

      {open && openChannel && (
        <EventModal
          post={open}
          day={days[open.day]!}
          readOnly={!isReviewable(open)}
          needsConfirm={live}
          busy={busy}
          error={actionError}
          channel={openChannel}
          text={open.full}
          onEdit={(t) => setEdits((e) => ({ ...e, [open.id]: t }))}
          onApprove={(mode) => approve(open, mode)}
          onSaveIdea={live && open.local ? () => draftToIdea(open) : undefined}
          onSkip={() => review(open.id, "skipped")}
          onClose={close}
        />
      )}
      {modal?.type === "gaps" && (
        <GapsModal
          canSpread={!live}
          gaps={gaps}
          ideas={data.ideas}
          ideasOpen={ideasOpen}
          fillLabel={fillLabel}
          onToggleIdeas={() => setIdeasOpen((o) => !o)}
          onDismiss={(id) => setDismissed((d) => ({ ...d, [id]: true }))}
          onUseIdea={useIdea}
          onClose={close}
        />
      )}
      {modal?.type === "github" && <GithubModal defaultRepo={DEFAULT_REPO} load={loadReleases} onDraft={draftFromRelease} onClose={close} />}
      {modal?.type === "idea" && <IdeaModal busy={busy} error={actionError} onSave={saveNewIdea} onClose={close} />}
      {modal?.type === "balance" && <BalanceModal rows={tagBalance(posts)} onClose={close} />}
      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-[#2B2A28] px-4 py-2.5 text-[13px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          {toast.text}
          {toast.undoId && <button type="button" onClick={undo} disabled={busy} className="font-semibold text-[#A8E5A0] disabled:opacity-50">Undo</button>}
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="text-[#A8A6A1]">×</button>
        </div>
      )}
    </div>
  );
}
