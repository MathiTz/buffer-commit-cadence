import { SAMPLE_API_USAGE, TAGS, TAG_ORDER, type Channel, type ChannelId, type Post } from "@cadence/core";
import { CadenceMark, ChannelBadge, IconSidebar } from "./icons";
import { iconBtn } from "./style";

interface Props {
  open: boolean;
  onToggle: () => void;
  channels: Channel[];
  hidden: Partial<Record<ChannelId, boolean>>;
  onToggleChannel: (id: ChannelId) => void;
  posts: Post[]; // all posts, for per-channel counts
  visiblePosts: Post[]; // posts of visible channels, for per-tag counts
}

export function Sidebar({ open, onToggle, channels, hidden, onToggleChannel, posts, visiblePosts }: Props) {
  const { used, limit } = SAMPLE_API_USAGE;
  const justify = open ? "justify-between" : "justify-center";

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
                  <ChannelBadge id={ch.id} badge={ch.badge} />
                  {open && <span>{ch.name}</span>}
                </span>
                {open && <span className="text-[#6B6965]">{n}</span>}
              </button>
            );
          })}
          <button
            type="button"
            aria-label="Connect a channel"
            title="Connect a channel"
            className={`mt-1 flex items-center gap-2 rounded-md border border-dashed border-[#CBC9C5] px-2 py-1.5 text-[13px] text-[#6B6965] ${justify}`}
          >
            +{open && <span>Connect a channel</span>}
          </button>
        </div>
      </div>

      <div>
        {open && <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#6B6965]">Tags</div>}
        <div className="flex flex-col gap-0.5">
          {TAG_ORDER.map((tag) => (
            <div key={tag} title={TAGS[tag].name} className={`flex items-center px-2 py-[5px] ${justify}`}>
              <span className="flex items-center gap-2">
                <span className="block size-2 rounded-full" style={{ background: TAGS[tag].color }} />
                {open && <span>{TAGS[tag].name}</span>}
              </span>
              {open && <span className="text-[#6B6965]">{visiblePosts.filter((p) => p.tag === tag).length}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto px-1.5">
        {open && (
          <div className="mb-1.5 flex justify-between text-xs text-[#6B6965]">
            <span>API requests today</span>
            <span>{used} / {limit}</span>
          </div>
        )}
        <div title={`API requests today: ${used} of ${limit}`} className="h-1 rounded-sm bg-[#EBEAE8]">
          <div className="h-1 rounded-sm bg-[#5DB86F]" style={{ width: `${(used / limit) * 100}%` }} />
        </div>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button className="text-xs text-[#6B6965] hover:underline">{open ? "Sign out" : "Out"}</button>
        </form>
      </div>
    </aside>
  );
}
