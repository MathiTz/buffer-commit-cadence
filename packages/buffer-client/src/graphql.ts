export const API_URL = "https://api.buffer.com";

export interface RateLimit {
  limit: string | null; // e.g. "3000-in-30days"
  remaining: number | null;
  resetSeconds: number | null;
}

export class BufferApiError extends Error {
  constructor(message: string, public status: number, public errors?: unknown) {
    super(message);
  }
}

// ratelimit: "3000-in-30days"; r=2990; t=2591000
function parseRateLimit(header: string | null): RateLimit {
  if (!header) return { limit: null, remaining: null, resetSeconds: null };
  const limit = header.match(/"([^"]+)"/)?.[1] ?? null;
  const r = header.match(/\br=(\d+)/)?.[1];
  const t = header.match(/\bt=(\d+)/)?.[1];
  return { limit, remaining: r ? Number(r) : null, resetSeconds: t ? Number(t) : null };
}

export async function gql<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data: T; rateLimit: RateLimit }> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const rateLimit = parseRateLimit(res.headers.get("ratelimit"));
  if (res.status === 429) throw new BufferApiError("Buffer rate limit reached", 429);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || json.errors?.length || !json.data) {
    throw new BufferApiError(json.errors?.[0]?.message ?? `Buffer API ${res.status}`, res.status, json.errors);
  }
  return { data: json.data, rateLimit };
}
