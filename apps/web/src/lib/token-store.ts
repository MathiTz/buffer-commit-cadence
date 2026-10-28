import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { memoryTokenStore, type TokenSet, type TokenStore } from "@cadence/buffer-client";
import { seal, unseal } from "./crypto";
import { sessionSecret } from "./env";

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

// Serverless hosts have no durable disk, so memory is only a placeholder there until the DB store lands.
export const createTokenStore = (): TokenStore => (process.env.VERCEL ? memoryTokenStore() : fileTokenStore());
