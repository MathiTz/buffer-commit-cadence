import { cookies } from "next/headers";
import { getFreshTokens, randomString } from "@cadence/buffer-client";
import { seal, unseal } from "./crypto";
import { oauthConfig, sessionSecret } from "./env";
import { createTokenStore } from "./token-store";

const SESSION_COOKIE = "cadence_session";
const OAUTH_COOKIE = "cadence_oauth";

// TODO: swap for the Postgres store (refresh token encrypted at rest) before deploying.
export const tokenStore = createTokenStore();

const base = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

export async function setOAuthState(state: string, verifier: string) {
  (await cookies()).set(OAUTH_COOKIE, seal(sessionSecret(), { state, verifier }), { ...base, maxAge: 600 });
}

export async function takeOAuthState(): Promise<{ state: string; verifier: string } | null> {
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete(OAUTH_COOKIE);
  return raw ? unseal(sessionSecret(), raw) : null;
}

export async function startSession(): Promise<string> {
  const sid = randomString(24);
  (await cookies()).set(SESSION_COOKIE, seal(sessionSecret(), { sid }), { ...base, maxAge: 60 * 60 * 24 * 30 });
  return sid;
}

export async function currentSid(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return raw ? (unseal<{ sid: string }>(sessionSecret(), raw)?.sid ?? null) : null;
}

export async function endSession() {
  const sid = await currentSid();
  if (sid) await tokenStore.delete(sid);
  (await cookies()).delete(SESSION_COOKIE);
}

// A cookie alone isn't a session: its tokens must still be in the store (the dev memory store
// is wiped on restart). Without this check, a stale cookie ping-pongs between / and /queue.
export async function isSignedIn(): Promise<boolean> {
  const sid = await currentSid();
  return Boolean(sid && (await tokenStore.get(sid)));
}

// Returns a valid access token for the signed-in user (refreshing if needed), or null.
export async function accessToken(): Promise<string | null> {
  const sid = await currentSid();
  if (!sid) return null;
  try {
    return (await getFreshTokens(oauthConfig(), tokenStore, sid)).accessToken;
  } catch {
    return null;
  }
}
