# Deploying Cadence to Cloudflare

Cadence runs as one Cloudflare Worker (Next.js through the OpenNext adapter). Sign-in tokens live in a D1
database, sealed with `SESSION_SECRET`. Nothing else is stored server-side.

## One-time setup

1. `pnpm --filter web exec wrangler login`
2. `pnpm --filter web deploy` creates the Worker and the `cadence` D1 database and prints the Worker URL
   (`https://cadence.<your-subdomain>.workers.dev`). The first visit will fail until the secrets below exist.
3. Put the URL in `apps/web/wrangler.jsonc` as `"vars": { "APP_URL": "https://cadence.<your-subdomain>.workers.dev" }`.
4. Add `<APP_URL>/callback` as another redirect URI on the Cadence client in Buffer.
5. Set the secrets (each command prompts for the value, so nothing lands in your shell history):
   - `pnpm --filter web exec wrangler secret put BUFFER_CLIENT_ID`
   - `pnpm --filter web exec wrangler secret put BUFFER_CLIENT_SECRET`
   - `openssl rand -base64 32 | pnpm --filter web exec wrangler secret put SESSION_SECRET`
6. `pnpm --filter web deploy` again.

## Local checks

- `pnpm dev` keeps the sealed local file store.
- `CF_DEV=1 pnpm dev` runs `next dev` against local Cloudflare bindings (D1).
- `pnpm --filter web preview` runs the real Worker build locally. Copy `apps/web/.dev.vars.example` to
  `.dev.vars` first.
