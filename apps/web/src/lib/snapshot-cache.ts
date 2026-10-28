import type { QueueData } from "@cadence/core";

// A browser-side copy of the last queue view, so /queue can paint before the server answers.
// It holds what the page already shows (no tokens), is keyed per signed-in session, and is
// only ever a stand-in: the server's answer replaces it. Every call fails soft.
const DB = "cadence";
const STORE = "queue";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface Entry { savedAt: number; data: QueueData }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function readSnapshot(key: string): Promise<QueueData | null> {
  try {
    const entry = await run<Entry | undefined>("readonly", (s) => s.get(key));
    if (!entry || Date.now() - entry.savedAt > MAX_AGE_MS || !Array.isArray(entry.data?.days)) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function writeSnapshot(key: string, data: QueueData): Promise<void> {
  try {
    await run("readwrite", (s) => s.put({ savedAt: Date.now(), data } satisfies Entry, key));
  } catch {
    /* private window or blocked storage: the cache is optional */
  }
}

/** Removes every saved view. Called on sign-out so nothing outlives the session. */
export async function clearSnapshots(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    /* nothing to clear */
  }
}
