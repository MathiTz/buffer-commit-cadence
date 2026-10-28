import { redirect } from "next/navigation";
import { getAccount, getChannels } from "@cadence/buffer-client";
import { accessToken } from "@/lib/session";

export default async function QueuePage() {
  const token = await accessToken();
  if (!token) redirect("/");

  const { account } = await getAccount(token);
  const org = account.organizations[0];
  const { channels, rateLimit } = org ? await getChannels(token, org.id) : { channels: [], rateLimit: null };

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
