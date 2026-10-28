// Throwaway spike: Buffer OAuth 2.0 Authorization Code + PKCE, end to end.
// No dependencies. Tokens live in memory only and are never printed.
//
//   Put BUFFER_CLIENT_ID (and BUFFER_CLIENT_SECRET for a confidential client) in ./.env, then:
//   node server.mjs
//   open https://localhost:3443   (accept the self-signed certificate warning)

import https from "node:https";
import fs from "node:fs";
import crypto from "node:crypto";
import { parseEnv } from "node:util";


// Load ./.env next to this file. Values in .env win over anything already exported in the
// shell, so a stale `export BUFFER_CLIENT_ID=...` can't shadow it. Never printed in full.
delete process.env.BUFFER_SCOPES; // only .env (or the default) may set scopes
const envPath = new URL(".env", import.meta.url);
if (fs.existsSync(envPath)) {
  const parsed = parseEnv(fs.readFileSync(envPath, "utf8"));
  Object.assign(process.env, parsed);
  console.log(".env loaded, keys:", Object.keys(parsed).join(", ") || "(none)");
} else {
  console.log("No .env found next to server.mjs, using the shell environment only.");
}

const PORT = Number(process.env.PORT || 3443);
const CLIENT_ID = process.env.BUFFER_CLIENT_ID;
const CLIENT_SECRET = process.env.BUFFER_CLIENT_SECRET; // leave unset for a public client
const REDIRECT_URI = `https://localhost:${PORT}/callback`;
const SCOPES = process.env.BUFFER_SCOPES || "account:read posts:read ideas:read offline_access";
const AUTH_URL = "https://auth.buffer.com/auth";
const TOKEN_URL = "https://auth.buffer.com/token";
const API_URL = "https://api.buffer.com";

console.log("client_id starts with:", CLIENT_ID ? CLIENT_ID.slice(0, 4) : "(missing)", "| client secret set:", Boolean(CLIENT_SECRET), "| scopes:", SCOPES);

if (!CLIENT_ID) {
  console.error("Set BUFFER_CLIENT_ID (Buffer Settings > API > App Clients).");
  process.exit(1);
}

const b64url = (buf) => buf.toString("base64url");
const pending = new Map(); // state -> code_verifier
let tokens = null; // { access_token, refresh_token, expires_at }
let refreshing = null; // single-flight lock: refresh tokens are single-use

async function tokenRequest(params) {
  const body = new URLSearchParams({ client_id: CLIENT_ID, ...params });
  if (CLIENT_SECRET) body.set("client_secret", CLIENT_SECRET);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`token endpoint ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

function store(json) {
  tokens = {
    access_token: json.access_token,
    refresh_token: json.refresh_token ?? tokens?.refresh_token ?? null,
    expires_at: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  // Log shape only, never values.
  console.log("token response keys:", Object.keys(json).join(", "), "| expires_in:", json.expires_in, "| scope:", json.scope);
}

// Refresh tokens rotate: reusing an old one revokes the grant, so serialize refreshes.
function refresh() {
  if (!tokens?.refresh_token) throw new Error("no refresh token (was offline_access granted?)");
  refreshing ??= tokenRequest({ grant_type: "refresh_token", refresh_token: tokens.refresh_token })
    .then(store)
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function accessToken() {
  if (!tokens) throw new Error("not signed in");
  if (Date.now() > tokens.expires_at - 60_000) await refresh();
  return tokens.access_token;
}

async function gql(query, variables) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify({ query, variables }),
  });
  console.log("api status:", res.status, "| ratelimit:", res.headers.get("ratelimit"));
  return res.json();
}

const page = (body) => `<!doctype html><meta charset="utf-8"><body style="font:15px system-ui;max-width:640px;margin:40px auto"><pre>${body}</pre>`;

const server = https.createServer(
  { key: fs.readFileSync("localhost-key.pem"), cert: fs.readFileSync("localhost.pem") },
  async (req, res) => {
    const url = new URL(req.url, `https://localhost:${PORT}`);
    const send = (code, body) => { res.writeHead(code, { "Content-Type": "text/html" }); res.end(page(body)); };
    try {
      if (url.pathname === "/") {
        return send(200, tokens
          ? 'Signed in.\n<a href="/me">/me</a> (read-only API call)\n<a href="/refresh">/refresh</a> (rotate tokens)'
          : 'Not signed in.\n<a href="/login">Sign in with Buffer</a>');
      }
      if (url.pathname === "/login") {
        const verifier = b64url(crypto.randomBytes(32));
        const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
        const state = b64url(crypto.randomBytes(16));
        pending.set(state, verifier);
        // Encode with %20 (not +) for scope spaces; add prompt=consent as in the docs' example.
        const params = {
          client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: "code",
          scope: SCOPES, state, code_challenge: challenge, code_challenge_method: "S256", prompt: "consent",
        };
        const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%3A/g, ":")}`).join("&");
        const auth = AUTH_URL + "?" + query;
        console.log("authorize url:", auth.replace(CLIENT_ID, CLIENT_ID.slice(0, 4) + "..."));
        res.writeHead(302, { Location: auth });
        return res.end();
      }
      if (url.pathname === "/callback") {
        const state = url.searchParams.get("state");
        const verifier = pending.get(state);
        if (!verifier) return send(400, "Unknown or reused state.");
        pending.delete(state);
        if (url.searchParams.get("error")) return send(400, "Authorization error: " + url.searchParams.get("error"));
        store(await tokenRequest({
          grant_type: "authorization_code", code: url.searchParams.get("code"),
          redirect_uri: REDIRECT_URI, code_verifier: verifier,
        }));
        res.writeHead(302, { Location: "/" });
        return res.end();
      }
      if (url.pathname === "/me") {
        const out = {};
        out.account = await gql("query { account { timezone organizations { id name } } }");
        const org = out.account?.data?.account?.organizations?.[0]?.id;
        if (org) {
          out.channels = await gql(
            "query($o: OrganizationId!) { channels(input:{organizationId:$o}) { id service timezone isQueuePaused postingSchedule { day times } } }", { o: org });
          out.posts = await gql(
            "query($o: OrganizationId!) { posts(first: 3, input:{organizationId:$o, filter:{dueAt:{start:\"2026-10-01T00:00:00Z\", end:\"2026-12-31T00:00:00Z\"}}, sort:[{field:dueAt, direction:asc}]}) { edges { node { id status dueAt channelId tags { id name } } } } }", { o: org });
          out.ideas = await gql(
            "query($o: OrganizationId!) { ideas(first: 2, input:{organizationId:$o}) { edges { node { id content { title tags { id name } } } } } }", { o: org });
        }
        // Print which calls worked, with error codes only.
        for (const [k, v] of Object.entries(out)) console.log("me." + k + ":", v?.errors ? "ERROR " + JSON.stringify(v.errors.map((e) => e.extensions?.code || e.message)) : "ok");
        return send(200, JSON.stringify(out, null, 2).replace(/</g, "&lt;"));
      }
      if (url.pathname === "/refresh") {
        await refresh();
        return send(200, 'Refreshed (new refresh token stored).\n<a href="/me">/me</a>');
      }
      send(404, "Not found");
    } catch (e) {
      console.error(e.message);
      send(500, "Error: " + e.message);
    }
  },
);

server.listen(PORT, () => console.log(`Spike on ${REDIRECT_URI.replace("/callback", "")} (register ${REDIRECT_URI} as the redirect URI)`));
