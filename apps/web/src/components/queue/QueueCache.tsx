"use client";

import { useEffect, useState } from "react";
import type { QueueData } from "@cadence/core";
import { readSnapshot, writeSnapshot } from "@/lib/snapshot-cache";
import { Queue } from "./Queue";

/** Shown while the server loads: the last saved view, read-only, or a plain placeholder on a first visit. */
export function CachedFallback({ cacheKey }: { cacheKey: string }) {
  const [state, setState] = useState<QueueData | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    readSnapshot(cacheKey).then((d) => live && setState(d));
    return () => { live = false; };
  }, [cacheKey]);

  if (!state) {
    return <main aria-busy="true" className="grid min-h-screen place-items-center text-sm text-[#6B6965]">{state === null ? "Loading your queue…" : null}</main>;
  }
  return (
    <div aria-busy="true">
      <div role="status" className="bg-[#FAFAF9] px-4 py-1.5 text-center text-xs text-[#6B6965]">Showing your last saved view. Refreshing…</div>
      <div inert>
        <Queue data={state} />
      </div>
    </div>
  );
}

/** Saves the fresh view for the next visit. Renders nothing. */
export function SnapshotSaver({ cacheKey, data }: { cacheKey: string; data: QueueData }) {
  useEffect(() => {
    void writeSnapshot(cacheKey, data);
  }, [cacheKey, data]);
  return null;
}
