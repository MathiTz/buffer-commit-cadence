// Tiny per-process TTL cache with in-flight de-duplication. Keeps page reloads from spending
// Buffer API requests (the app never polls; a snapshot is reused for `ttlMs`).
type Entry = { at: number; value: Promise<unknown> };

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const g = globalThis as unknown as { __cadenceCache?: Map<string, Entry> };
  const map = (g.__cadenceCache ??= new Map());
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load().catch((e) => {
    map.delete(key); // never cache failures
    throw e;
  });
  map.set(key, { at: Date.now(), value });
  return value;
}
