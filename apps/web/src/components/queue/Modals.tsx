"use client";

import { useEffect, type ReactNode } from "react";
import {
  DAYS, STATUS_LABEL, TAGS, isOffTarget, longestParagraph,
  type BalanceRow, type Channel, type GapDef, type Idea, type Post,
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
  channel: Channel;
  text: string;
  onEdit: (text: string) => void;
  onApprove: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function EventModal({ post, channel, text, onEdit, onApprove, onSkip, onClose }: EventProps) {
  const draft = post.status === "draft";
  const pill = PILL[post.status];
  const paragraphs = text.split("\n\n");
  const longest = longestParagraph(text);

  return (
    <Overlay label="Post details" onClose={onClose}>
      <Header onClose={onClose}>
        <ChannelBadge id={channel.id} badge={channel.badge} size={24} />
        {channel.name}
        <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: pill.bg, color: pill.fg }}>{STATUS_LABEL[post.status]}</span>
      </Header>
      <div className="flex flex-col gap-3 px-[18px] py-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[#6B6965]">
          <span>{DAYS[post.day]!.full} at {post.time}</span>
          <span className="flex items-center gap-1.5">
            <span className="block size-2 rounded-full" style={{ background: TAGS[post.tag].color }} />{TAGS[post.tag].name}
          </span>
          {post.kind && <span>{post.kind}</span>}
        </div>
        {draft ? (
          <>
            <textarea
              aria-label="Edit post text"
              rows={8}
              value={text}
              onChange={(e) => onEdit(e.target.value)}
              className="w-full resize-y rounded-lg border border-[#CBC9C5] p-2.5 text-sm leading-normal text-[#2B2A28]"
            />
            <div className="text-xs" style={{ color: longest > channel.charLimit ? "#B3261E" : "#6B6965" }}>
              {longest} of {channel.charLimit}{paragraphs.length > 1 ? " per post" : ""}
            </div>
            <div className="text-xs text-[#6B6965]">Drafted by AI from your release notes. Nothing is added to Buffer until you approve.</div>
          </>
        ) : (
          <p className="m-0 whitespace-pre-line text-sm leading-normal">{text}</p>
        )}
        {post.status === "error" && (
          <div className="text-xs text-[#B3261E]">Buffer couldn&apos;t publish this post. Check the channel connection, then try again.</div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#EBEAE8] bg-[#FAFAF9] px-[18px] py-3">
        {draft ? (
          <>
            <button type="button" onClick={onSkip} className={`${btn} h-auto px-3.5 py-[7px]`}>Skip and remove</button>
            <button type="button" onClick={onApprove} className={`${btnPrimary} px-4 py-[7px] text-[13px]`}>Approve</button>
          </>
        ) : (
          <>
            <button type="button" onClick={onClose} className={`${btn} h-auto px-3.5 py-[7px]`}>Close</button>
            <button type="button" className={`${btnPrimary} px-4 py-[7px] text-[13px]`}>Open in Buffer</button>
          </>
        )}
      </div>
    </Overlay>
  );
}

interface GapsProps {
  gaps: GapDef[];
  ideas: Idea[];
  ideasOpen: boolean;
  fillLabel: string;
  onToggleIdeas: () => void;
  onDismiss: (id: string) => void;
  onUseIdea: (idea: Idea) => void;
  onClose: () => void;
}

export function GapsModal({ gaps, ideas, ideasOpen, fillLabel, onToggleIdeas, onDismiss, onUseIdea, onClose }: GapsProps) {
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
              {g.canSpread && <button type="button" className={`${btnPrimary} px-3 py-[5px] text-xs`}>Spread across the week</button>}
              <button type="button" onClick={() => onDismiss(g.id)} className={`${btn} h-auto px-3 py-[5px] text-xs`}>Dismiss</button>
            </div>
            {g.canFill && ideasOpen && (
              <div className="mt-2.5 rounded-lg border border-[#EBEAE8]">
                {ideas.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-2.5 border-b border-[#F1F0EE] px-2.5 py-2 last:border-b-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block size-2 shrink-0 rounded-full" style={{ background: TAGS[i.tag].color }} />{i.title}
                    </span>
                    <button type="button" onClick={() => onUseIdea(i)} className={`${btn} h-auto whitespace-nowrap px-2.5 py-1 text-xs font-semibold`}>{fillLabel}</button>
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
