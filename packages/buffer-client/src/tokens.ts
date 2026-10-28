import { refreshTokens, type OAuthConfig, type TokenSet } from "./auth";

// Where a user's tokens live between requests. Dev uses memory; production uses Postgres
// (refresh token encrypted at rest). Keyed by our own session id.
export interface TokenStore {
  get(key: string): Promise<TokenSet | null>;
  set(key: string, tokens: TokenSet): Promise<void>;
  delete(key: string): Promise<void>;
}

// Refresh tokens are single-use and rotate: reusing an old one revokes the whole grant.
// Serialize refreshes per user so two concurrent requests never both spend the same token.
const inflight = new Map<string, Promise<TokenSet>>();
const SKEW_MS = 60_000;

export async function getFreshTokens(cfg: OAuthConfig, store: TokenStore, key: string): Promise<TokenSet> {
  const current = await store.get(key);
  if (!current) throw new Error("not signed in");
  if (current.expiresAt - SKEW_MS > Date.now()) return current;
  if (!current.refreshToken) throw new Error("access token expired and no refresh token (offline_access missing)");

  let pending = inflight.get(key);
  if (!pending) {
    pending = refreshTokens(cfg, current.refreshToken)
      .then(async (next) => {
        const merged = { ...next, refreshToken: next.refreshToken ?? current.refreshToken };
        await store.set(key, merged);
        return merged;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

export function memoryTokenStore(): TokenStore {
  const g = globalThis as unknown as { __cadenceTokens?: Map<string, TokenSet> };
  const map = (g.__cadenceTokens ??= new Map());
  return {
    async get(key) { return map.get(key) ?? null; },
    async set(key, tokens) { map.set(key, tokens); },
    async delete(key) { map.delete(key); },
  };
}
