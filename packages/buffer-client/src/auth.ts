// Buffer OAuth 2.0 Authorization Code + PKCE (S256). Works with Web Crypto, so it runs on Node and edge.

export const AUTH_URL = "https://auth.buffer.com/auth";
export const TOKEN_URL = "https://auth.buffer.com/token";

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string; // confidential clients send it in the body
  redirectUri: string;
  scopes: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
  scope?: string;
}

const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export function randomString(byteLength = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export async function createAuthorization(cfg: OAuthConfig) {
  const verifier = randomString(32);
  const state = randomString(16);
  const params: Record<string, string> = {
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scopes,
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "consent",
  };
  // %20 for scope spaces (not "+"), colons left readable: this is the form the spike proved.
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%3A/g, ":")}`)
    .join("&");
  return { url: `${AUTH_URL}?${query}`, state, verifier };
}

export class TokenError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Buffer token endpoint ${status}: ${JSON.stringify(body)}`);
  }
}

async function tokenRequest(cfg: OAuthConfig, params: Record<string, string>): Promise<TokenSet> {
  const body = new URLSearchParams({ client_id: cfg.clientId, ...params });
  if (cfg.clientSecret) body.set("client_secret", cfg.clientSecret);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  if (!res.ok) throw new TokenError(res.status, json);
  return {
    accessToken: String(json.access_token),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
    expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000,
    scope: typeof json.scope === "string" ? json.scope : undefined,
  };
}

export function exchangeCode(cfg: OAuthConfig, code: string, verifier: string) {
  return tokenRequest(cfg, {
    grant_type: "authorization_code",
    code,
    redirect_uri: cfg.redirectUri,
    code_verifier: verifier,
  });
}

export function refreshTokens(cfg: OAuthConfig, refreshToken: string) {
  return tokenRequest(cfg, { grant_type: "refresh_token", refresh_token: refreshToken });
}
