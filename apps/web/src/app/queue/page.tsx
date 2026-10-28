import { redirect } from "next/navigation";
import { BufferApiError, getAccount, getChannels } from "@cadence/buffer-client";
import { cached } from "@/lib/cache";
import { accessToken, currentSid } from "@/lib/session";

const SNAPSHOT_TTL_MS = 60_000;

async function loadOverview(token: string) {
  const { account } = await getAccount(token);
  const org = account.organizations[0];
  const { channels, rateLimit } = org ? await getChannels(token, org.id) : { channels: [], rateLimit: null };
  return { org, channels, rateLimit };
}

export default async function QueuePage() {
  const sid = await currentSid();
  const token = await accessToken();
  if (!sid || !token) redirect("/");

  let overview;
  try {
    overview = await cached(`${sid}:overview`, SNAPSHOT_TTL_MS, () => loadOverview(token));
  } catch (e) {
    if (e instanceof BufferApiError && e.status === 429) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="mb-2 text-xl font-semibold">Queue</h1>
          <p className="text-sm text-[color:var(--muted)]">
            You&apos;ve reached Buffer&apos;s request limit for now. It resets within 15 minutes, then reload this page.
          </p>
        </main>
      );
    }
    throw e;
  }
  const { org, channels, rateLimit } = overview;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Queue</h1>
        <form action="/api/auth/logout" method="post">
          <button className="text-sm text-[color:var(--muted)] hover:underline">Sign out</button>
        </form>
      </header>
      <p className="mb-4 text-sm text-[color:var(--muted)]">
        {org?.name ?? "No organization"} · {channels.length} channel{channels.length === 1 ? "" : "s"}
        {rateLimit?.remaining != null && ` · ${rateLimit.remaining} API requests left (${rateLimit.limit})`}
      </p>
      <ul className="divide-y divide-[color:var(--hairline)] rounded-lg border border-[color:var(--hairline)]">
        {channels.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium capitalize">{c.service}</span>
            <span className="text-[color:var(--muted)]">
              {c.postingSchedule.reduce((n, s) => n + s.times.length, 0)} slots/week
              {c.isQueuePaused && " · paused"}
              {c.isDisconnected && " · disconnected"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
