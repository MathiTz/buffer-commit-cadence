import postgres from "postgres";
import type { TokenSet, TokenStore } from "@cadence/buffer-client";
import { seal, unseal } from "./crypto";
import { sessionSecret } from "./env";

// Production store. Each user's tokens (refresh token included) are one AES-GCM sealed value, so a
// leaked database dump holds nothing usable without SESSION_SECRET.
const STALE = "60 days";

type G = { __cadenceSql?: postgres.Sql; __cadenceReady?: Promise<unknown> };

export function pgTokenStore(url: string): TokenStore {
  const g = globalThis as unknown as G;
  // prepare: false keeps this working behind a transaction pooler (Neon's pooled endpoint).
  const sql = (g.__cadenceSql ??= postgres(url, { max: 5, idle_timeout: 20, prepare: false }));
  const ready = () =>
    (g.__cadenceReady ??= sql`
      create table if not exists cadence_sessions (
        sid text primary key,
        tokens text not null,
        updated_at timestamptz not null default now()
      )`);

  return {
    async get(key) {
      await ready();
      const [row] = await sql<{ tokens: string }[]>`select tokens from cadence_sessions where sid = ${key}`;
      return row ? unseal<TokenSet>(sessionSecret(), row.tokens) : null;
    },
    async set(key, tokens) {
      await ready();
      const sealed = seal(sessionSecret(), tokens);
      await sql`
        insert into cadence_sessions (sid, tokens) values (${key}, ${sealed})
        on conflict (sid) do update set tokens = excluded.tokens, updated_at = now()`;
      await sql`delete from cadence_sessions where updated_at < now() - ${STALE}::interval`;
    },
    async delete(key) {
      await ready();
      await sql`delete from cadence_sessions where sid = ${key}`;
    },
    async lock(key, fn) {
      await ready();
      // A transaction-scoped advisory lock: released on commit or rollback, even if the instance dies.
      return (await sql.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${key}))`;
        return fn();
      })) as Awaited<ReturnType<typeof fn>>;
    },
  };
}
