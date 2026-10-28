"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  HASHTAG_SNIPPETS, STATUS_LABEL, TAGS, hasBufferMention, isOffTarget, longestParagraph,
  type BalanceRow, type Channel, type Day, type GapDef, type Idea, type Post, type Release,
} from "@cadence/core";
import { ChannelBadge, IconClose } from "./icons";
import { btn, btnPrimary, iconBtn, PILL } from "./style";

function Overlay({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(30,28,25,0.42)] px-4 pb-4 pt-[7vh]"
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.22)]">{children}</div>
    </div>
  );
}

function Header({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EBEAE8] px-[18px] py-3.5">
      <div className="flex items-center gap-2.5 text-[15px] font-semibold">{children}</div>
      <button type="button" onClick={onClose} aria-label="Close" className={iconBtn}><IconClose /></button>
    </div>
  );
}

interface EventProps {
  post: Post;
  day: Day;
  readOnly: boolean;
  needsConfirm: boolean; // approving creates a real Buffer post, so ask first
  busy: boolean;
  error: string | null;
  channel: Channel;
  text: string;
  onEdit: (text: string) => void;
  onApprove: (asDraft: boolean) => void;
  onSkip: () => void;
  onClose: () => void;
}

export function EventModal({ post, day, readOnly, needsConfirm, busy, error, channel, text, onEdit, onApprove, onSkip, onClose }: EventProps) {
  const draft = post.status === "draft" && !readOnly;
  const [confirming, setConfirming] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const [asDraft, setAsDraft] = useState(false);
  const pill = PILL[post.status];
  const paragraphs = text.split("\n\n");
  const longest = longestParagraph(text);
  // Insert at the cursor (or replace the selection), then put the cursor after the snippet.
  const insert = (snippet: string) => {
    const el = area.current;
    const [from, to] = el ? [el.selectionStart, el.selectionEnd] : [text.length, text.length];
    const lead = from > 0 && !/\s$/.test(text.slice(0, from)) ? " " : "";
    onEdit(text.slice(0, from) + lead + snippet + text.slice(to));
    const caret = from + lead.length + snippet.length;
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(caret, caret); });
  };
  const blocked = !text.trim() || longest > channel.charLimit;

  return (
    <Overlay label="Post details" onClose={onClose}>
      <Header onClose={onClose}>
        <ChannelBadge channel={channel} size={24} />
        {channel.name}
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: pill.bg, color: pill.fg }}>{STATUS_LABEL[post.status]}</span>
      </Header>
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[#6B6965]">
          <span>{day.full} at {post.time}</span>
          <span className="flex items-center gap-1.5">
            <span className="block size-2 rounded-full" style={{ background: TAGS[post.tag].color }} />{TAGS[post.tag].name}
          </span>
          {post.kind && <span>{post.kind}</span>}
        </div>
        {draft ? (
          <>
            <textarea
              ref={area}
              aria-label="Edit post text"
              rows={8}
              value={text}
              onChange={(e) => onEdit(e.target.value)}
              className="w-full resize-y rounded-lg border border-[#CBC9C5] p-2.5 text-sm leading-normal text-[#2B2A28]"
            />
            <div className="text-xs" style={{ color: longest > channel.charLimit ? "#B3261E" : "#6B6965" }}>
              {longest} of {channel.charLimit}{paragraphs.length > 1 ? " per post" : ""}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[#6B6965]">Insert</span>
              {[...HASHTAG_SNIPPETS, ...(channel.service === "linkedin" ? ["@Buffer"] : [])].map((snippet) => (
                <button key={snippet} type="button" onClick={() => insert(snippet)} className="rounded-full border border-[#DEDDDA] bg-white px-2.5 py-0.5 text-xs font-medium hover:bg-[#FAFAF9]">{snippet}</button>
              ))}
            </div>
            {channel.service === "linkedin" && hasBufferMention(text) && (
              <div className="text-xs text-[#1E6B33]">@Buffer will be tagged as a mention of Buffer&apos;s LinkedIn page.</div>
            )}
            <div className="text-xs text-[#6B6965]">
              {post.kind.startsWith("From your Ideas") ? "From your Buffer Ideas." : post.kind.startsWith("From GitHub") ? "Drafted from your GitHub release notes." : "Drafted from your release notes."} Nothing is added to Buffer until you approve.
            </div>
          </>
        ) : (
          <p className="m-0 whitespace-pre-line text-sm leading-normal">{text}</p>
        )}
        {readOnly && post.status === "draft" && (
          <div className="text-xs text-[#6B6965]">This draft lives in Buffer. Review it there.</div>
        )}
        {confirming && (
          <div className="rounded-lg border border-[#8ED48F] bg-[#F1FAEF] p-3 text-sm">
            <div className="font-medium">{asDraft ? "This saves a draft in Buffer." : "This adds a post to your Buffer queue."}</div>
            <div className="mt-1 text-[#6B6965]">{channel.name} · {day.full} at {post.time}</div>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} />
              Save as a draft in Buffer instead of scheduling
            </label>
          </div>
        )}
        {error && <div className="text-xs text-[#B3261E]">{error}</div>}
        {post.status === "error" && (
          <div className="text-xs text-[#B3261E]">Buffer couldn&apos;t publish this post. Check the channel connection, then try again.</div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#EBEAE8] bg-[#FAFAF9] px-[18px] py-3">
        {draft ? (
          <>
            {confirming ? (
              <>
                <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={`${btn} h-auto px-3.5 py-[7px]`}>Back</button>
                <button type="button" onClick={() => onApprove(asDraft)} disabled={busy || blocked} className={`${btnPrimary} px-4 py-[7px] text-[13px] disabled:opacity-50`}>
                  {busy ? "Adding…" : asDraft ? "Save draft" : "Add to queue"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={onSkip} className={`${btn} h-auto px-3.5 py-[7px]`}>Skip and remove</button>
                <button type="button" onClick={() => (needsConfirm ? setConfirming(true) : onApprove(false))} disabled={blocked} className={`${btnPrimary} px-4 py-[7px] text-[13px] disabled:opacity-50`}>Approve</button>
              </>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={`${btn} h-auto px-3.5 py-[7px]`}>Close</button>
            <a href="https://publish.buffer.com" target="_blank" rel="noreferrer" className={`${btnPrimary} px-4 py-[7px] text-[13px]`}>Open in Buffer</a>
          </>
        )}
      </div>
    </Overlay>
  );
}

interface GapsProps {
  canSpread: boolean;
  gaps: GapDef[];
  ideas: Idea[];
  ideasOpen: boolean;
  fillLabel: (gap: GapDef) => string;
  onToggleIdeas: () => void;
  onDismiss: (id: string) => void;
  onUseIdea: (idea: Idea, gap: GapDef) => void;
  onClose: () => void;
}

export function GapsModal({ canSpread, gaps, ideas, ideasOpen, fillLabel, onToggleIdeas, onDismiss, onUseIdea, onClose }: GapsProps) {
  return (
    <Overlay label="Gaps" onClose={onClose}>
      <Header onClose={onClose}>
        <span>Gaps this week <span className="font-normal text-[#6B6965]">{gaps.length}</span></span>
      </Header>
      <div className="flex flex-col gap-3 px-[18px] py-3.5">
        <div className="text-xs leading-normal text-[#6B6965]">
          Gaps come from your queue slots, your daily limits and your target mix. They&apos;re suggestions, so dismiss any you don&apos;t want.
        </div>
        {gaps.map((g) => (
          <div key={g.id} className="rounded-[10px] border border-[#EBEAE8] p-3">
            <div className="font-medium">{g.title}</div>
            <div className="mb-2.5 mt-0.5 text-[#6B6965]">{g.why}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.canFill && (
                <button type="button" onClick={onToggleIdeas} aria-expanded={ideasOpen} className={`${btnPrimary} px-3 py-[5px] text-xs`}>Fill from ideas</button>
              )}
              {canSpread && g.canSpread && <button type="button" className={`${btnPrimary} px-3 py-[5px] text-xs`}>Spread across the week</button>}
              <button type="button" onClick={() => onDismiss(g.id)} className={`${btn} h-auto px-3 py-[5px] text-xs`}>Dismiss</button>
            </div>
            {g.canFill && ideasOpen && (
              <div className="mt-2.5 rounded-lg border border-[#EBEAE8]">
                {ideas.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2.5 border-b border-[#F1F0EE] px-2.5 py-2 last:border-b-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block size-2 shrink-0 rounded-full" style={{ background: TAGS[i.tag].color }} />{i.title}
                    </span>
                    <button type="button" onClick={() => onUseIdea(i, g)} className={`${btn} h-auto whitespace-nowrap px-2.5 py-1 text-xs font-semibold`}>{fillLabel(g)}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {gaps.length === 0 && <div className="text-[#6B6965]">No gaps left. Your week looks full.</div>}
      </div>
    </Overlay>
  );
}

export function BalanceModal({ rows, onClose }: { rows: BalanceRow[]; onClose: () => void }) {
  return (
    <Overlay label="Content balance" onClose={onClose}>
      <Header onClose={onClose}>Content balance</Header>
      <div className="flex flex-col gap-3.5 px-[18px] py-4">
        <div className="text-xs text-[#6B6965]">Share of this week&apos;s posts against your target. The dark tick is the target.</div>
        {rows.map((b) => (
          <div key={b.tag}>
            <div className="mb-[5px] flex justify-between">
              <span className="font-medium">{b.name}</span>
              <span className="text-xs" style={{ color: isOffTarget(b) ? "#A4510B" : "#6B6965" }}>
                {b.pct}% of {b.target}% · {b.diff > 0 ? "over" : b.diff < 0 ? "under" : "on target"}
              </span>
            </div>
            <div className="relative h-1.5 rounded-[3px] bg-[#EDECE9]">
              <div className="h-1.5 rounded-[3px]" style={{ width: `${b.pct}%`, background: b.color }} />
              <div className="absolute -top-[3px] h-3 w-0.5 bg-[#2B2A28]" style={{ left: `${b.target}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Overlay>
  );
}

interface IdeaProps {
  busy: boolean;
  error: string | null;
  onSave: (title: string, text: string) => void;
  onClose: () => void;
}

export function IdeaModal({ busy, error, onSave, onClose }: IdeaProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const field = "w-full rounded-lg border border-[#CBC9C5] p-2.5 text-sm text-[#2B2A28]";

  return (
    <Overlay label="New idea" onClose={onClose}>
      <Header onClose={onClose}>New idea</Header>
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[#6B6965]">
          Title (optional)
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-[#6B6965]">
          Idea
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className={`${field} resize-y leading-normal`} />
        </label>
        <div className="text-xs text-[#6B6965]">Saved to your Buffer Ideas. Nothing is scheduled or published until you fill a gap with it and approve.</div>
        {error && <div className="text-xs text-[#B3261E]">{error}</div>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#EBEAE8] bg-[#FAFAF9] px-[18px] py-3">
        <button type="button" onClick={onClose} disabled={busy} className={`${btn} h-auto px-3.5 py-[7px]`}>Cancel</button>
        <button type="button" onClick={() => onSave(title, text)} disabled={busy || !text.trim()} className={`${btnPrimary} px-4 py-[7px] text-[13px] disabled:opacity-50`}>
          {busy ? "Saving…" : "Save idea"}
        </button>
      </div>
    </Overlay>
  );
}

interface GithubProps {
  defaultRepo: string;
  load: (repo: string) => Promise<{ ok: true; value: { repo: string; releases: Release[] } } | { ok: false; message: string }>;
  onDraft: (release: Release, repo: string) => void;
  onClose: () => void;
}

const REPO_KEY = "cadence.githubRepo";

// The part of a release title after the tag, without the date a changelog heading repeats.
const subtitle = (r: Release) => {
  const rest = r.title.replace(r.tag, "").replace(/^[\s:(–-]+|[)\s]+$/g, "");
  return rest === r.date ? "" : rest;
};

export function GithubModal({ defaultRepo, load, onDraft, onClose }: GithubProps) {
  const [repo, setRepo] = useState(() => {
    try { return localStorage.getItem(REPO_KEY) || defaultRepo; } catch { return defaultRepo; }
  });
  const [releases, setReleases] = useState<Release[] | null>(null);
  const [loaded, setLoaded] = useState(repo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const find = async (name: string) => {
    setLoading(true);
    setError(null);
    const r = await load(name);
    setLoading(false);
    if (!r.ok) { setReleases(null); return setError(r.message); }
    setReleases(r.value.releases);
    setLoaded(r.value.repo);
    try { localStorage.setItem(REPO_KEY, r.value.repo); } catch { /* remembering the repo is optional */ }
  };
  useEffect(() => { void find(repo); /* once, on open */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Overlay label="From GitHub" onClose={onClose}>
      <Header onClose={onClose}>From GitHub</Header>
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <form onSubmit={(e) => { e.preventDefault(); void find(repo); }} className="flex gap-2">
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            aria-label="GitHub repository"
            placeholder="owner/name"
            className="min-w-0 flex-1 rounded-lg border border-[#CBC9C5] p-2 text-sm"
          />
          <button type="submit" disabled={loading || !repo.trim()} className={`${btn} h-auto px-3 py-1.5 disabled:opacity-50`}>{loading ? "Looking…" : "Find releases"}</button>
        </form>
        <div className="text-xs leading-normal text-[#6B6965]">
          Reads your public releases, or CHANGELOG.md if there are none. No GitHub sign-in. Each release becomes one draft per channel for you to review.
        </div>
        {error && <div className="text-xs text-[#B3261E]">{error}</div>}
        {releases && releases.length > 0 && (
          <div className="rounded-lg border border-[#EBEAE8]">
            {releases.map((r) => (
              <div key={r.tag} className="flex items-center justify-between gap-3 border-b border-[#F1F0EE] px-3 py-2.5 last:border-b-0">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.tag}{subtitle(r) && <span className="font-normal text-[#6B6965]"> · {subtitle(r)}</span>}</div>
                  <div className="text-xs text-[#6B6965]">{r.source === "release" ? "GitHub release" : "CHANGELOG.md"}{r.date ? ` · ${r.date}` : ""}</div>
                </div>
                <button type="button" onClick={() => onDraft(r, loaded)} className={`${btnPrimary} shrink-0 px-3 py-1.5 text-xs`}>Draft posts</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}
