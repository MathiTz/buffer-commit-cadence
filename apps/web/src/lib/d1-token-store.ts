import type { TokenSet, TokenStore } from "@cadence/buffer-client";
import { seal, unseal } from "./crypto";
import { sessionSecret } from "./env";

// Cloudflare store. Same shape as the Postgres one: each user's tokens (refresh token included) are one
// AES-GCM sealed value, so a leaked database holds nothing usable without SESSION_SECRET. D1 has no advisory
// locks, so the refresh lock is a short lease row that a second request has to wait out.
const STALE_MS = 60 * 24 * 60 * 60 * 1000;
const LEASE_MS = 15_000;
const WAIT_MS = 12_000;

// The slice of the D1 binding this store uses (the full types live in @cloudflare/workers-types).
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface D1Like { prepare(sql: string): D1Statement }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function d1TokenStore(db: D1Like): TokenStore {
  let ready: Promise<unknown> | undefined;
  const init = () =>
    (ready ??= Promise.all([
      db.prepare("create table if not exists cadence_sessions (sid text primary key, tokens text not null, updated_at integer not null)").run(),
      db.prepare("create table if not exists cadence_locks (sid text primary key, owner text not null, expires_at integer not null)").run(),
    ]).catch((e) => { ready = undefined; throw e; }));

  return {
    async get(key) {
      await init();
      const row = await db.prepare("select tokens from cadence_sessions where sid = ?").bind(key).first<{ tokens: string }>();
      return row ? unseal<TokenSet>(sessionSecret(), row.tokens) : null;
    },
    async set(key, tokens) {
      await init();
      const now = Date.now();
      await db
        .prepare("insert into cadence_sessions (sid, tokens, updated_at) values (?, ?, ?) on conflict (sid) do update set tokens = excluded.tokens, updated_at = excluded.updated_at")
        .bind(key, seal(sessionSecret(), tokens), now)
        .run();
      await db.prepare("delete from cadence_sessions where updated_at < ?").bind(now - STALE_MS).run();
    },
    async delete(key) {
      await init();
      await db.prepare("delete from cadence_sessions where sid = ?").bind(key).run();
      await db.prepare("delete from cadence_locks where sid = ?").bind(key).run();
    },
    async lock(key, fn) {
      await init();
      const owner = crypto.randomUUID();
      const deadline = Date.now() + WAIT_MS;
      // Take the lease if nobody holds it, or if the holder's lease has run out (an instance that died).
      for (;;) {
        const now = Date.now();
        const r = await db
          .prepare("insert into cadence_locks (sid, owner, expires_at) values (?, ?, ?) on conflict (sid) do update set owner = excluded.owner, expires_at = excluded.expires_at where cadence_locks.expires_at < ?")
          .bind(key, owner, now + LEASE_MS, now)
          .run();
        if (r.meta.changes > 0) break;
        if (now > deadline) throw new Error("Timed out waiting for another request to finish refreshing the sign-in.");
        await sleep(150);
      }
      try {
        return await fn();
      } finally {
        await db.prepare("delete from cadence_locks where sid = ? and owner = ?").bind(key, owner).run();
      }
    },
  };
}
