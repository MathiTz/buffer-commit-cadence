import { redirect } from "next/navigation";
import { BufferApiError } from "@cadence/buffer-client";
import { isIsoDate, sampleQueueData } from "@cadence/core";
import { Queue } from "@/components/queue/Queue";
import { cached } from "@/lib/cache";
import { loadQueueData } from "@/lib/queue-data";
import { accessToken, currentSid, isSignedIn } from "@/lib/session";

const SNAPSHOT_TTL_MS = 60_000; // a snapshot is reused for a minute: reloads never re-spend API requests

function Problem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-2 text-xl font-semibold">{title}</h1>
      <p className="mb-4 text-sm text-[color:var(--muted)]">{children}</p>
      <div className="flex gap-4 text-sm">
        <a href="/queue" className="underline">Try again</a>
        <a href="/queue?sample=1" className="underline">View sample data</a>
      </div>
    </main>
  );
}

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ week?: string; sample?: string }> }) {
  if (!(await isSignedIn())) redirect("/");
  const { week, sample } = await searchParams;
  if (sample) return <Queue key="sample" data={sampleQueueData()} />;

  const sid = await currentSid();
  const token = await accessToken();
  if (!sid || !token) redirect("/");

  const requested = isIsoDate(week) ? week : undefined;
  try {
    const data = await cached(`${sid}:queue:${requested ?? "now"}`, SNAPSHOT_TTL_MS, () => loadQueueData(token, requested));
    return <Queue key={data.days[0]!.iso} data={data} />;
  } catch (e) {
    if (e instanceof BufferApiError && e.status === 429) {
      return <Problem title="Buffer's request limit is reached">It resets within 15 minutes. Reload then.</Problem>;
    }
    console.error("queue load failed:", e instanceof Error ? e.message : e);
    return <Problem title="Couldn't load your Buffer queue">{e instanceof Error ? e.message : "Unknown error."}</Problem>;
  }
}
