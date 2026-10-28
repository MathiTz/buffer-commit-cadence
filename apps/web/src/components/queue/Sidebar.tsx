import type { QueueData } from "@cadence/core";
import { CadenceMark, IconSidebar } from "./icons";
import { clearSnapshots } from "@/lib/snapshot-cache";
import { iconBtn } from "./style";

interface Props {
  open: boolean;
  onToggle: () => void;
  usage: QueueData["usage"];
  live: boolean;
}

export function Sidebar({ open, onToggle, usage, live }: Props) {

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
            <form action="/api/auth/logout" method="post" onSubmit={(e) => {
              // Wipe the saved views first, then let the sign-out post go through.
              e.preventDefault();
              const form = e.currentTarget;
              void clearSnapshots().finally(() => form.submit());
            }}><button className="hover:underline">Sign out</button></form>
          </div>
        )}
      </div>
    </aside>
  );
}
