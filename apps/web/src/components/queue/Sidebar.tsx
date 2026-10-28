import { TAGS, TAG_ORDER, type Channel, type Post, type QueueData } from "@cadence/core";
import { CadenceMark, ChannelBadge, IconSidebar } from "./icons";
import { iconBtn } from "./style";

interface Props {
  open: boolean;
  onToggle: () => void;
  channels: Channel[];
  hidden: Record<string, boolean>;
  onToggleChannel: (id: string) => void;
  posts: Post[]; // all posts, for per-channel counts
  visiblePosts: Post[]; // posts of visible channels, for per-tag counts
  usage: QueueData["usage"];
  live: boolean;
}

export function Sidebar({ open, onToggle, channels, hidden, onToggleChannel, posts, visiblePosts, usage, live }: Props) {
  const justify = open ? "justify-between" : "justify-center";
  const tags = TAG_ORDER.map((tag) => ({ tag, n: visiblePosts.filter((p) => p.tag === tag).length })).filter((t) => t.tag !== "untagged" || t.n > 0);

  return (
    <aside
      className="flex min-w-0 max-w-full flex-col gap-[22px] border-r border-[#EBEAE8] bg-[#FAFAF9] py-4"
      style={{ flex: open ? "1 1 220px" : "0 0 60px", padding: open ? "16px 12px" : "16px 10px" }}
    >
      <div className={`flex items-center justify-between gap-2.5 px-1 ${open ? "flex-row" : "flex-col"}`}>
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <CadenceMark />
          {open && <span>Cadence</span>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={open}
          className={iconBtn}
        >
          <IconSidebar />
        </button>
      </div>

      <div>
        {open && <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#6B6965]">Channels</div>}
        <div className="flex flex-col gap-0.5">
          {channels.map((ch) => {
            const on = !hidden[ch.id];
            const n = posts.filter((p) => p.channel === ch.id).length;
            const aria = `${ch.name}, ${n} posts`;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onToggleChannel(ch.id)}
                aria-pressed={on}
                aria-label={aria}
                title={aria}
                className={`flex items-center rounded-md px-2 py-1.5 text-left text-[13px] ${justify} ${on ? "bg-[#EDECE9]" : "bg-transparent"}`}
              >
                <span className="flex items-center gap-2" style={{ opacity: on ? 1 : 0.45 }}>
                  <ChannelBadge channel={ch} />
                  {open && <span>{ch.name}</span>}
                </span>
                {open && <span className="text-[#6B6965]">{n}</span>}
              </button>
            );
          })}
          <a
            href="https://publish.buffer.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Connect a channel in Buffer"
            title="Connect a channel in Buffer"
            className={`mt-1 flex items-center gap-2 rounded-md border border-dashed border-[#CBC9C5] px-2 py-1.5 text-[13px] text-[#6B6965] ${justify}`}
          >
            +{open && <span>Connect a channel</span>}
          </a>
        </div>
      </div>

      <div>
        {open && <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#6B6965]">Tags</div>}
        <div className="flex flex-col gap-0.5">
          {tags.map(({ tag, n }) => (
            <div key={tag} title={TAGS[tag].name} className={`flex items-center px-2 py-[5px] ${justify}`}>
              <span className="flex items-center gap-2">
                <span className="block size-2 rounded-full" style={{ background: TAGS[tag].color }} />
                {open && <span>{TAGS[tag].name}</span>}
              </span>
              {open && <span className="text-[#6B6965]">{n}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto px-1.5">
        {usage && (
          <>
            {open && (
              <div className="mb-1.5 flex justify-between text-xs text-[#6B6965]">
                <span>API requests, {usage.window}</span>
                <span>{usage.used} / {usage.limit}</span>
              </div>
            )}
            <div title={`API requests ${usage.window}: ${usage.used} of ${usage.limit}`} className="h-1 rounded-sm bg-[#EBEAE8]">
              <div className="h-1 rounded-sm bg-[#5DB86F]" style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
            </div>
          </>
        )}
        {open && (
          <div className="mt-3 flex items-center justify-between text-xs text-[#6B6965]">
            <a href={live ? "/queue?sample=1" : "/queue"} className="hover:underline">{live ? "View sample data" : "Use my Buffer data"}</a>
            <form action="/api/auth/logout" method="post"><button className="hover:underline">Sign out</button></form>
          </div>
        )}
      </div>
    </aside>
  );
}
