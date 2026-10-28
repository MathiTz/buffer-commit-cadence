# Buffer OAuth + PKCE spike (throwaway)

Proves the sign-in flow end to end before the contest build starts on Oct 28. Lives under `spikes/` in the monorepo; throwaway, not shipped or imported by apps or packages.

Flow: `/login` → auth.buffer.com (PKCE S256 + state) → `/callback` → token exchange → read-only `account` query → `/refresh` to test single-use refresh rotation.

## Run

1. Register an App Client at https://publish.buffer.com/settings/api (App Clients tab).
   Redirect URI: `https://localhost:3443/callback` (Buffer requires HTTPS even on localhost, exact match).
   Scopes: `account:read posts:read ideas:read` (the spike also asks for `offline_access`).
2. Make a local certificate:
   ```bash
   cd ~/Documents/projects/buffer-commit/spikes/oauth-pkce && ./gen-cert.sh
   ```
3. Put the credentials in `.env` next to `server.mjs` (git-ignored; values here override shell exports):
   ```
   BUFFER_CLIENT_ID=...
   BUFFER_CLIENT_SECRET=...   # only for a confidential client
   # BUFFER_SCOPES=account:read posts:read ideas:read offline_access
   ```
   Then start it:
   ```bash
   node server.mjs
   ```
4. Open https://localhost:3443, accept the self-signed certificate warning, click Sign in, approve, then try `/me` and `/refresh`.

## What to find out (write the answers into PLAN.md)

- Does the token endpoint accept form-encoded bodies and `client_id` in the body (public client)?
- Is `refresh_token` returned, and what does `expires_in` say?
- Does `/refresh` return a new refresh token, and does reusing the old one fail (do NOT test with a token you care about)?
- Do OAuth tokens read `posts` and `ideas`, not only `account`? (Add queries to `/me`.)
- Is there an app review/approval step, or can any Buffer user authorize the app?
- Which scopes appear on the consent screen?

Tokens stay in memory and are never printed, only response key names, `expires_in`, `scope` and the rate-limit header.
