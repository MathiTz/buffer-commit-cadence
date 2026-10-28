import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TokenSet, TokenStore } from "@cadence/buffer-client";
import { seal, unseal } from "./crypto";
import { sessionSecret } from "./env";
import { pgTokenStore } from "./pg-token-store";

type Book = Record<string, TokenSet>;

// Local development store: one sealed (AES-GCM) file, so a dev-server restart or hot reload doesn't
// sign you out. Git-ignored. Deployments use a database instead (see PLAN.md).
const FILE = path.join(process.cwd(), ".cadence", "tokens.json");

export function fileTokenStore(): TokenStore {
  let queue: Promise<unknown> = Promise.resolve(); // serialize read-modify-write cycles

  const read = async (): Promise<Book> => {
    try {
      return unseal<Book>(sessionSecret(), await readFile(FILE, "utf8")) ?? {};
    } catch {
      return {};
    }
  };
  const write = async (book: Book) => {
    await mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, seal(sessionSecret(), book), { mode: 0o600 });
    await rename(tmp, FILE);
  };
  const update = (fn: (book: Book) => void) => {
    const run = queue.then(async () => { const book = await read(); fn(book); await write(book); });
    queue = run.catch(() => undefined);
    return run;
  };

  return {
    get: async (key) => (await read())[key] ?? null,
    set: (key, tokens) => update((b) => { b[key] = tokens; }),
    delete: (key) => update((b) => { delete b[key]; }),
  };
}

function choose(): TokenStore {
  if (process.env.DATABASE_URL) return pgTokenStore(process.env.DATABASE_URL);
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Add a Postgres database and its connection string to this project's env vars.");
  return fileTokenStore();
}

/** Postgres when DATABASE_URL is set, the sealed local file otherwise. Chosen on first use, not at import. */
export function createTokenStore(): TokenStore {
  let impl: TokenStore | undefined;
  const store = () => (impl ??= choose());
  return {
    get: (key) => store().get(key),
    set: (key, tokens) => store().set(key, tokens),
    delete: (key) => store().delete(key),
    lock: (key, fn) => (store().lock ? store().lock!(key, fn) : fn()),
  };
}
